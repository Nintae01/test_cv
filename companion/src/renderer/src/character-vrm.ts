import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm'
import { VRMAnimationLoaderPlugin, createVRMAnimationClip, type VRMAnimation } from '@pixiv/three-vrm-animation'
import type { MToonMaterial } from '@pixiv/three-vrm'
import type { Expression, GestureEvent, MotionEvent } from '@shared/types'
import { SIT_DROP_PX } from '@shared/types'
import type { Character } from './character-types'

/**
 * VRM (0.x or 1.0) character rendered with three.js. VRM models share standard expression
 * names, so her moods map the same way for every model. Everything that moves is
 * procedural here: idle pose, breathing, blinking, head tracking, fidgets, walk cycle and
 * lip sync. The model itself only has to be a humanoid with the standard presets bound.
 */

/** Mood -> preset weights. Anything not listed goes to 0. */
const MOODS: Record<Expression, Partial<Record<string, number>>> = {
  neutral: {},
  happy: { happy: 1 },
  smug: { relaxed: 0.8, happy: 0.25 },
  surprised: { surprised: 1 },
  sleepy: { relaxed: 0.5 },
  annoyed: { angry: 0.8 },
}
/** Extra eyelid droop per mood, on top of blinking. */
const EYELIDS: Partial<Record<Expression, number>> = { sleepy: 0.55, smug: 0.2 }
/** A mood fades back to neutral after this long. */
const MOOD_HOLD_MS = 12_000

const BLINK_EVERY_MS: readonly [number, number] = [2_500, 6_000]
const FIDGET_EVERY_MS: readonly [number, number] = [12_000, 35_000]

const STRIDE_HZ = 2.2
const WALK = { turnRad: 1.15, bob: 0.025, legSwing: 0.55, kneeBend: 0.5, armSwing: 0.35, lean: 0.08 }
const CLIMB_HZ = 1.4
/** Resting pose: arms hanging. */
const ARM_DOWN = 1.22

type Motion = MotionEvent['kind']

interface MotionState {
  kind: Motion
  since: number
  dir: 1 | -1
  /** Landing crouch strength. */
  impact: number
}

type Bone = THREE.Object3D

type RGB = [number, number, number]

/**
 * The "look": lights, per-material shading tweaks and a resting face, all applied at load
 * time without touching the model file. Defaults suit VRoid-style models; a `look.json`
 * next to the model overrides any part of it (same shape as this object).
 */
interface Look {
  lights: {
    key: { color: string; intensity: number; position: RGB }
    fill: { color: string; intensity: number; position: RGB }
    hemisphere: { sky: string; ground: string; intensity: number }
  }
  /** Applied in order to every MToon material whose name contains `match` (case-insensitive). */
  materials: Array<{
    match: string
    /** Names from three-vrm's MToonMaterial; colors as [r, g, b] in 0..1. */
    set?: Partial<{
      shadeColorFactor: RGB
      shadingShiftFactor: number
      shadingToonyFactor: number
      matcapFactor: RGB
      parametricRimColorFactor: RGB
      parametricRimFresnelPowerFactor: number
      parametricRimLiftFactor: number
      rimLightingMixFactor: number
      outlineWidthFactor: number
      outlineColorFactor: RGB
      color: RGB
      emissive: RGB
    }>
    /** Re-bake the base texture through a CSS filter string, e.g. "contrast(1.15) saturate(1.25)". */
    textureFilter?: string
  }>
  /** Expression weights held at all times, under the moods: a friendlier default face. */
  restingFace: Record<string, number>
}

const DEFAULT_LOOK: Look = {
  lights: {
    key: { color: '#fff6ee', intensity: Math.PI * 1.0, position: [0.6, 1.7, 1.5] },
    fill: { color: '#d4e3ff', intensity: Math.PI * 0.32, position: [-1.3, 0.6, 1.0] },
    hemisphere: { sky: '#fdf7f2', ground: '#6a7899', intensity: 0.55 },
  },
  materials: [
    // VRoid exports faces with the shadow pushed almost entirely off (shift 0.7) and a hard
    // terminator, which reads flat. Bring back a soft, warm shadow and a thinner line.
    {
      match: 'Face_00_SKIN',
      set: {
        shadingShiftFactor: 0.44,
        shadingToonyFactor: 0.68,
        shadeColorFactor: [0.9, 0.68, 0.64],
        matcapFactor: [0.3, 0.3, 0.3],
        outlineWidthFactor: 0.0006,
        outlineColorFactor: [0.42, 0.2, 0.22],
      },
    },
    { match: 'Body_00_SKIN', set: { shadingShiftFactor: 0.2, shadingToonyFactor: 0.62, shadeColorFactor: [0.9, 0.68, 0.64] } },
    // Chrome armour: the matcap alone produces big white blobs; tame it so the face wins.
    { match: 'Cuirass', set: { matcapFactor: [0.62, 0.62, 0.62] } },
    { match: 'Cuirass_Matte', set: { matcapFactor: [0.14, 0.14, 0.15] } },
    { match: 'Cuirass_Gold', set: { matcapFactor: [1, 1, 1] } },
    { match: 'Cuirass_Brass', set: { matcapFactor: [0.7, 0.7, 0.7] } },
    // Eyes: more contrast and colour in the iris, brighter sparkle.
    { match: 'EyeIris', textureFilter: 'contrast(1.18) saturate(1.3) brightness(1.03)' },
    { match: 'EyeHighlight', set: { emissive: [0.45, 0.45, 0.45] } },
    // Hair: a cool rim so it separates from dark backgrounds.
    { match: 'HAIR', set: { parametricRimColorFactor: [0.2, 0.26, 0.5], parametricRimFresnelPowerFactor: 5, parametricRimLiftFactor: 0, rimLightingMixFactor: 0.7 } },
  ],
  restingFace: { relaxed: 0.1, browFun: 0.22, mouthFun: 0.1, eyeSpread: 0.15 },
}

/**
 * Authored clips (.vrma) by state, listed in `<model dir>/anim/animations.json`:
 *   { "idle": ["idle_01.vrma", "idle_02.vrma"], "walk": "walk.vrma", "climb": "climb.vrma",
 *     "fall": "fall.vrma", "land": "land.vrma", "sit": "sit_down.vrma", "sitting": "sitting.vrma",
 *     "held": "dangle.vrma", "sword": "draw_sword.vrma" }
 * Keys with several files pick a random variant each time. Any key that is missing falls back
 * to the procedural motion, and the two layers crossfade, so a half-filled manifest is fine.
 * Clips should animate the whole body (arms included) or the missing bones rest in T-pose.
 */
class ClipLayer {
  private readonly mixer: THREE.AnimationMixer
  private readonly clips = new Map<string, THREE.AnimationClip[]>()
  private current: THREE.AnimationAction | null = null
  private currentKey = ''

  constructor(private readonly vrm: VRM) {
    this.mixer = new THREE.AnimationMixer(vrm.scene)
  }

  async load(modelUrl: string): Promise<void> {
    const base = new URL('anim/', new URL(modelUrl, window.location.href))
    let manifest: Record<string, string | string[]> | null = null
    try {
      const res = await fetch(new URL('animations.json', base))
      manifest = res.ok ? ((await res.json()) as Record<string, string | string[]>) : null
    } catch {
      manifest = null
    }
    if (!manifest) return

    const loader = new GLTFLoader()
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser))
    for (const [key, files] of Object.entries(manifest)) {
      for (const file of [files].flat()) {
        try {
          const gltf = await loader.loadAsync(new URL(file, base).toString())
          const animation = (gltf.userData.vrmAnimations as VRMAnimation[] | undefined)?.[0]
          if (!animation) throw new Error('no VRMC_vrm_animation in file')
          const clip = createVRMAnimationClip(animation, this.vrm)
          clip.name = `${key}:${file}`
          this.clips.set(key, [...(this.clips.get(key) ?? []), clip])
        } catch (err) {
          console.warn('[vrm] clip', file, 'failed:', err)
        }
      }
    }
    console.info('[vrm] clips:', [...this.clips].map(([k, v]) => `${k}(${v.length})`).join(' ') || 'none')
  }

  has(key: string): boolean {
    return (this.clips.get(key)?.length ?? 0) > 0
  }

  get key(): string {
    return this.currentKey
  }

  /** Crossfade into a clip for this key. Returns false when there is none. */
  play(key: string, opts: { loop?: boolean; fade?: number; onEnd?: () => void } = {}): boolean {
    const variants = this.clips.get(key)
    if (!variants?.length) return false
    const { loop = true, fade = 0.35, onEnd } = opts
    const clip = variants[Math.floor(Math.random() * variants.length)]
    const action = this.mixer.clipAction(clip)
    if (this.current === action && loop) return true

    this.current?.fadeOut(fade)
    action.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    action.clampWhenFinished = !loop
    action.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play()
    this.current = action
    this.currentKey = key

    if (!loop && onEnd) {
      const handler = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== action) return
        this.mixer.removeEventListener('finished', handler)
        if (this.current === action) onEnd()
      }
      this.mixer.addEventListener('finished', handler)
    }
    return true
  }

  stop(fade = 0.35): void {
    this.current?.fadeOut(fade)
    this.current = null
    this.currentKey = ''
  }

  update(delta: number): void {
    this.mixer.update(delta)
  }
}

export class VrmCharacter implements Character {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock = new THREE.Clock()
  private readonly lookTarget = new THREE.Object3D()

  private readonly lights: THREE.Group
  private look: Look = DEFAULT_LOOK
  private vrm: VRM | null = null
  private placeholder: THREE.Object3D | null = null
  private bones: Partial<Record<VRMHumanBoneName, Bone>> = {}
  private baseY = 0
  private clips: ClipLayer | null = null
  /** 0 = procedural pose, 1 = authored clip; eased on every state change. */
  private clipBlend = 0
  private clipWanted = false
  private readonly clipSnapshot = new Map<Bone, { q: THREE.Quaternion; p: THREE.Vector3 }>()

  private mood: Expression = 'neutral'
  private moodSetAt = 0
  private readonly weights = new Map<string, number>()
  private blinkAt = 0
  private blinkPhase = -1
  private eyelids = 0
  private headYaw = 0
  private headPitch = 0
  private headTargetYaw = 0
  private headTargetPitch = 0
  private fidget: { until: number; tilt: number; shift: number } | null = null
  private fidgetAt = 0
  private motion: MotionState = { kind: 'stand', since: 0, dir: 1, impact: 0 }
  private facing = 0
  private drop = 0
  private sword = 0
  private swordOut = false
  private pxPerMeter = 280
  private mouth = 0
  private analyser: AnalyserNode | null = null
  private analyserBuf: Uint8Array<ArrayBuffer> | null = null
  private screenBox: { x0: number; y0: number; x1: number; y1: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      // Lets the ?debug recorder read the canvas back after a frame; costs a little otherwise.
      preserveDrawingBuffer: window.location.search.includes('debug'),
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight) // also sets the CSS size, so the canvas does not overflow at DPR > 1
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(22, window.innerWidth / window.innerHeight, 0.1, 50)
    this.scene.add(this.lookTarget)

    this.lights = new THREE.Group()
    this.scene.add(this.lights)
    this.applyLights(DEFAULT_LOOK.lights)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight) // also sets the CSS size, so the canvas does not overflow at DPR > 1
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })

    this.renderer.setAnimationLoop(() => this.frame())
  }

  async load(modelUrl: string): Promise<void> {
    try {
      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))
      const gltf = await loader.loadAsync(modelUrl)
      const vrm = gltf.userData.vrm as VRM

      VRMUtils.removeUnnecessaryVertices(gltf.scene)
      VRMUtils.combineSkeletons(gltf.scene)
      if (vrm.meta.metaVersion === '0') VRMUtils.rotateVRM0(vrm) // 0.x models face -Z; make them face us
      vrm.scene.traverse((o) => (o.frustumCulled = false))

      this.vrm = vrm
      this.scene.add(vrm.scene)
      for (const name of BONES) this.bones[name] = vrm.humanoid.getNormalizedBoneNode(name) ?? undefined
      if (vrm.lookAt) {
        vrm.lookAt.target = this.lookTarget
        vrm.lookAt.autoUpdate = true
      }
      this.frameCamera(vrm)
      this.look = await loadLook(modelUrl)
      this.applyLights(this.look.lights)
      this.applyMaterialLook(vrm)
      this.clips = new ClipLayer(vrm)
      await this.clips.load(modelUrl)
      this.chooseClip()
      this.scheduleBlink()
      this.scheduleFidget()
      console.info('[vrm] loaded', (vrm.meta as { name?: string; title?: string }).name ?? (vrm.meta as { title?: string }).title, 'expressions:', this.expressionNames().join(','))
    } catch (err) {
      console.warn('[vrm] could not load model, showing placeholder', err)
      this.drawPlaceholder()
    }
  }

  hitTest(x: number, y: number): boolean {
    const b = this.screenBox
    return !!b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
  }

  setExpression(expression: Expression): void {
    this.mood = expression
    this.moodSetAt = performance.now()
  }

  lookAt(x: number, y: number): void {
    const k = this.motion.kind
    if (k === 'walk' || k === 'climb' || k === 'fall') return
    // Cursor -> a point on the plane z = 1 in front of her face, so the eyes converge on it.
    const ndcX = THREE.MathUtils.clamp((x / window.innerWidth) * 2 - 1, -2.5, 2.5)
    const ndcY = THREE.MathUtils.clamp(-((y / window.innerHeight) * 2 - 1), -2.5, 2.5)
    const p = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera)
    const dir = p.sub(this.camera.position).normalize()
    const t = (1 - this.camera.position.z) / dir.z
    this.lookTarget.position.copy(this.camera.position).addScaledVector(dir, t)
    // The head follows a little, the eyes do the rest.
    this.headTargetYaw = THREE.MathUtils.clamp(ndcX * 0.35, -0.45, 0.45)
    this.headTargetPitch = THREE.MathUtils.clamp(-ndcY * 0.25, -0.3, 0.3)
  }

  onMotion(event: MotionEvent): void {
    const prev = this.motion
    this.motion = {
      kind: event.kind,
      since: performance.now(),
      dir: event.kind === 'walk' ? (event.direction === 'right' ? 1 : -1) : prev.dir,
      impact: event.kind === 'land' ? event.impact : 0,
    }
    if (event.kind === 'walk' || event.kind === 'climb' || event.kind === 'fall') {
      this.headTargetYaw = 0
      this.headTargetPitch = 0
    }
    if (event.kind === 'fall' && prev.kind !== 'held') this.setExpression('surprised')
    if (event.kind === 'land' && event.impact > 0.6) this.setExpression('annoyed')
    if (event.kind === 'sit') this.setExpression('smug')
    this.chooseClip()
  }

  gesture(event: GestureEvent): void {
    if (event.name === 'summon') {
      this.swordOut = event.active
      if (event.active) this.setExpression('annoyed')
      this.chooseClip()
    }
  }

  /** Map the current state (and sword) onto an authored clip, or fall back to the procedural pose. */
  private chooseClip(): void {
    const clips = this.clips
    if (!clips) return
    const idle = () => clips.play('idle', { loop: false, onEnd: idle }) // chain random idle variants
    let played = false
    if (this.swordOut && clips.has('sword')) {
      played = clips.play('sword', { loop: false })
    } else {
      switch (this.motion.kind) {
        case 'stand':
          played = idle()
          break
        case 'walk':
        case 'climb':
        case 'fall':
        case 'held':
          played = clips.play(this.motion.kind)
          break
        case 'land':
          played = clips.play('land', { loop: false, onEnd: idle }) || idle()
          break
        case 'sit':
          played = clips.play('sit', { loop: false, onEnd: () => clips.play('sitting') }) || clips.play('sitting')
          break
      }
    }
    if (!played) clips.stop()
    this.clipWanted = played
  }

  speak(audioUrl: string | undefined, expression: Expression): Promise<void> {
    this.setExpression(expression)
    if (!audioUrl) return Promise.resolve()

    const audio = new Audio(audioUrl)
    const ctx = new AudioContext()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    analyser.connect(ctx.destination)
    this.analyser = analyser
    this.analyserBuf = new Uint8Array(analyser.fftSize)

    return new Promise((resolve) => {
      const done = () => {
        this.analyser = null
        void ctx.close()
        resolve()
      }
      audio.onended = done
      audio.onerror = done
      void audio.play().catch(done)
    })
  }

  playExpressionRaw(name: string): void {
    const manager = this.vrm?.expressionManager
    if (!manager) return
    this.weights.clear()
    this.mood = 'neutral'
    this.moodSetAt = performance.now() + 60_000 // hold while someone is inspecting it
    this.weights.set(name, 1)
  }

  expressionNames(): string[] {
    const manager = this.vrm?.expressionManager
    if (!manager) return []
    return [...Object.keys(manager.presetExpressionMap), ...Object.keys(manager.customExpressionMap)]
  }

  // --- per frame ---------------------------------------------------------------------

  private frame(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1)
    const now = performance.now()
    if (this.vrm) {
      const k = 1 - Math.exp(-delta * 6)
      this.clipBlend += ((this.clipWanted ? 1 : 0) - this.clipBlend) * k

      // Layer 1: the authored clip, sampled into a snapshot.
      this.clipSnapshot.clear()
      if (this.clips && this.clipBlend > 0.001) {
        this.vrm.humanoid.resetNormalizedPose()
        this.clips.update(delta)
        for (const bone of Object.values(this.bones)) {
          if (bone) this.clipSnapshot.set(bone, { q: bone.quaternion.clone(), p: bone.position.clone() })
        }
      }

      // Layer 2: the procedural pose.
      this.vrm.humanoid.resetNormalizedPose()
      this.applyIdle(now)
      this.applyMotion(now, delta)

      // Blend: clips win as they fade in, the procedural pose as they fade out.
      for (const [bone, snap] of this.clipSnapshot) {
        bone.quaternion.slerp(snap.q, this.clipBlend)
        bone.position.lerp(snap.p, this.clipBlend)
      }

      // Additive bits on top of either layer.
      this.applyHead(delta)
      this.applySword(delta)
      this.applyExpressions(now, delta)
      this.vrm.update(delta)
      this.updateScreenBox()
    } else if (this.placeholder) {
      this.placeholder.rotation.y += delta * 0.5
    }
    this.renderer.render(this.scene, this.camera)
  }

  /** Arms down, soft breathing, a slow sway, and the occasional fidget. */
  private applyIdle(now: number): void {
    const t = now / 1000
    const b = this.bones
    const breath = Math.sin(t * 1.1) * 0.5 + 0.5

    rot(b.leftUpperArm, 0, 0, -ARM_DOWN)
    rot(b.rightUpperArm, 0, 0, ARM_DOWN)
    rot(b.leftLowerArm, 0, 0.35, -0.12)
    rot(b.rightLowerArm, 0, -0.35, 0.12)
    rot(b.leftHand, 0, 0, -0.1)
    rot(b.rightHand, 0, 0, 0.1)

    rot(b.chest, breath * 0.03 - 0.01, 0, 0)
    rot(b.spine, Math.sin(t * 0.45) * 0.015, Math.sin(t * 0.3) * 0.02, Math.sin(t * 0.37) * 0.012)

    if (this.fidget && now < this.fidget.until) {
      const k = Math.sin(((now - (this.fidget.until - 2_600)) / 2_600) * Math.PI) // ease in-out over the fidget
      rot(b.head, 0, 0, this.fidget.tilt * k, true)
      rot(b.hips, 0, 0, this.fidget.shift * k, true)
      rot(b.spine, 0, 0, -this.fidget.shift * 0.6 * k, true)
    } else if (this.fidget) {
      this.fidget = null
    }
    if (now >= this.fidgetAt) {
      if (this.motion.kind === 'stand' || this.motion.kind === 'sit') {
        this.fidget = { until: now + 2_600, tilt: (Math.random() - 0.5) * 0.3, shift: (Math.random() - 0.5) * 0.12 }
      }
      this.scheduleFidget()
    }
  }

  private applyHead(delta: number): void {
    const k = 1 - Math.exp(-delta * 6)
    this.headYaw += (this.headTargetYaw - this.headYaw) * k
    this.headPitch += (this.headTargetPitch - this.headPitch) * k
    const w = 1 - this.clipBlend * 0.5 // let an authored clip keep most of its head motion
    rot(this.bones.head, this.headPitch * w, this.headYaw * w, 0, true)
    rot(this.bones.neck, this.headPitch * 0.3 * w, this.headYaw * 0.3 * w, 0, true)
  }

  /**
   * The body for each motion state. Walking turns her toward the travel direction and swings
   * limbs; climbing turns her back to us and reaches hand over hand; falling spreads the
   * arms; landing crouches by impact; sitting drops the hips to the ledge and dangles the legs.
   * Transitions ease over ~300 ms.
   */
  private applyMotion(now: number, delta: number): void {
    if (!this.vrm) return
    const m = this.motion
    const b = this.bones
    const age = now - m.since
    const ease = Math.min(1, age / 300)
    const k = 1 - Math.exp(-delta * 8)

    let targetFacing = 0
    let targetDrop = 0
    const phase = (age / 1000) * Math.PI * 2

    switch (m.kind) {
      case 'walk': {
        targetFacing = m.dir * WALK.turnRad
        const s = Math.sin(phase * STRIDE_HZ)
        rot(b.leftUpperLeg, s * WALK.legSwing * ease, 0, 0)
        rot(b.rightUpperLeg, -s * WALK.legSwing * ease, 0, 0)
        rot(b.leftLowerLeg, Math.max(0, -s) * WALK.kneeBend * ease, 0, 0)
        rot(b.rightLowerLeg, Math.max(0, s) * WALK.kneeBend * ease, 0, 0)
        rot(b.leftUpperArm, -s * WALK.armSwing * ease, 0, -ARM_DOWN)
        rot(b.rightUpperArm, s * WALK.armSwing * ease, 0, ARM_DOWN)
        rot(b.spine, WALK.lean * ease, 0, 0, true)
        this.vrm.scene.position.y = this.baseY + Math.abs(s) * WALK.bob * ease
        break
      }
      case 'climb': {
        // Back to us, face to the window. Both arms overhead and a little toward the wall,
        // reaching hand over hand: one arm stretches higher while the other pulls (elbow bent),
        // knees come up alternately against the wall, body leans in, eyes up.
        targetFacing = Math.PI
        const s = Math.sin(phase * CLIMB_HZ)
        const reachL = 0.5 + 0.5 * s // 1 = left arm fully stretched, 0 = pulling
        const reachR = 1 - reachL
        // Upper arms: z lifts them overhead (±1.57 is straight up), x tips them toward the wall.
        rot(b.leftUpperArm, 0.35 * ease, 0, -ARM_DOWN + (ARM_DOWN + 1.25 + 0.3 * reachL) * ease)
        rot(b.rightUpperArm, 0.35 * ease, 0, ARM_DOWN - (ARM_DOWN + 1.25 + 0.3 * reachR) * ease)
        // Elbows bend toward the wall (about the bone's local Y) more on the pulling arm.
        rot(b.leftLowerArm, 0, -(0.25 + 0.9 * (1 - reachL)) * ease, 0)
        rot(b.rightLowerArm, 0, (0.25 + 0.9 * (1 - reachR)) * ease, 0)
        rot(b.leftHand, 0, 0, 0.3 * ease)
        rot(b.rightHand, 0, 0, -0.3 * ease)
        // Legs: the knee opposite the stretched arm comes up against the wall.
        const kneeL = 0.5 + 0.5 * -s
        const kneeR = 1 - kneeL
        rot(b.leftUpperLeg, -(0.15 + 0.85 * kneeL) * ease, 0, -0.08 * ease)
        rot(b.rightUpperLeg, -(0.15 + 0.85 * kneeR) * ease, 0, 0.08 * ease)
        rot(b.leftLowerLeg, (0.2 + 1.0 * kneeL) * ease, 0, 0)
        rot(b.rightLowerLeg, (0.2 + 1.0 * kneeR) * ease, 0, 0)
        rot(b.spine, -0.18 * ease, 0, 0, true)
        rot(b.head, -0.35 * ease, 0, 0, true)
        this.vrm.scene.position.y = this.baseY + Math.abs(s) * 0.01 * ease
        break
      }
      case 'fall': {
        const flail = Math.sin(phase * 1.5) * 0.15
        rot(b.leftUpperArm, -0.7 * ease, 0, -ARM_DOWN + 0.55 * ease + flail)
        rot(b.rightUpperArm, -0.7 * ease, 0, ARM_DOWN - 0.55 * ease - flail)
        rot(b.leftLowerArm, -0.3 * ease, 0, -0.3 * ease)
        rot(b.rightLowerArm, -0.3 * ease, 0, 0.3 * ease)
        rot(b.leftUpperLeg, -0.35 * ease, 0, -0.1 * ease)
        rot(b.rightUpperLeg, -0.25 * ease, 0, 0.1 * ease)
        rot(b.leftLowerLeg, 0.6 * ease, 0, 0)
        rot(b.rightLowerLeg, 0.45 * ease, 0, 0)
        rot(b.spine, -0.12 * ease, 0, 0, true)
        this.vrm.scene.position.y = this.baseY
        break
      }
      case 'land': {
        // A crouch that pops back up: strongest right after touching down.
        const c = Math.max(0, 1 - age / 450) * (0.35 + 0.65 * m.impact)
        rot(b.leftUpperLeg, -1.0 * c, 0, 0)
        rot(b.rightUpperLeg, -1.0 * c, 0, 0)
        rot(b.leftLowerLeg, 1.5 * c, 0, 0)
        rot(b.rightLowerLeg, 1.5 * c, 0, 0)
        rot(b.spine, 0.45 * c, 0, 0, true)
        rot(b.leftUpperArm, -0.5 * c, 0, -ARM_DOWN + 0.4 * c)
        rot(b.rightUpperArm, -0.5 * c, 0, ARM_DOWN - 0.4 * c)
        targetDrop = 0.28 * c
        this.vrm.scene.position.y = this.baseY
        break
      }
      case 'sit': {
        rot(b.leftUpperLeg, -1.5 * ease, 0, -0.08 * ease)
        rot(b.rightUpperLeg, -1.5 * ease, 0, 0.08 * ease)
        rot(b.leftLowerLeg, 1.35 * ease, 0, 0)
        rot(b.rightLowerLeg, 1.35 * ease, 0, 0)
        rot(b.leftUpperArm, -0.35 * ease, 0, -ARM_DOWN + 0.15 * ease)
        rot(b.rightUpperArm, -0.35 * ease, 0, ARM_DOWN - 0.15 * ease)
        rot(b.leftLowerArm, -0.9 * ease, 0.4 * ease, -0.3 * ease)
        rot(b.rightLowerArm, -0.9 * ease, -0.4 * ease, 0.3 * ease)
        rot(b.spine, 0.12 * ease, 0, 0, true)
        if (!this.clips?.has('sit') && !this.clips?.has('sitting')) targetDrop = SIT_DROP_PX / this.pxPerMeter
        this.vrm.scene.position.y = this.baseY
        break
      }
      case 'held': {
        // Dangling by the scruff: limp arms, feet together.
        rot(b.leftUpperArm, 0.1 * ease, 0, -ARM_DOWN - 0.1 * ease)
        rot(b.rightUpperArm, 0.1 * ease, 0, ARM_DOWN + 0.1 * ease)
        rot(b.leftLowerLeg, 0.25 * ease, 0, 0)
        rot(b.rightLowerLeg, 0.25 * ease, 0, 0)
        this.vrm.scene.position.y = this.baseY
        break
      }
      case 'stand':
      default:
        this.vrm.scene.position.y = this.baseY
    }

    this.facing += (targetFacing - this.facing) * k
    this.vrm.scene.rotation.y = this.facing
    this.drop += (targetDrop - this.drop) * k
    this.vrm.scene.position.y -= this.drop
  }

  /** Draw the sword (the model's "Summon" expression) and hold it up while the gesture is active. */
  private applySword(delta: number): void {
    const manager = this.vrm?.expressionManager
    if (!manager || !manager.getExpression('Summon')) return
    const k = 1 - Math.exp(-delta * 5)
    this.sword += ((this.swordOut ? 1 : 0) - this.sword) * k
    manager.setValue('Summon', this.sword)
    if (this.sword > 0.01 && !this.clips?.has('sword')) {
      // Right arm forward and up, blade raised; a touch of stance in the spine.
      const b = this.bones
      rot(b.rightUpperArm, -1.6 * this.sword, 0.3 * this.sword, 0.5 * this.sword, true)
      rot(b.rightLowerArm, -0.4 * this.sword, 0, 0, true)
      rot(b.spine, 0, -0.25 * this.sword, 0, true)
      rot(b.leftUpperArm, 0, 0, 0.25 * this.sword, true)
    }
  }

  /** Blink timer, mood weights with fade, eyelid droop, lip sync. */
  private applyExpressions(now: number, delta: number): void {
    const manager = this.vrm?.expressionManager
    if (!manager) return

    // Mood fades back to neutral after a while.
    if (this.mood !== 'neutral' && now - this.moodSetAt > MOOD_HOLD_MS) this.mood = 'neutral'
    const target = MOODS[this.mood]
    const k = 1 - Math.exp(-delta * 8)
    for (const name of this.expressionNames()) {
      if (name.startsWith('blink') || VISEMES.has(name) || name === 'Summon') continue
      const want = this.weights.get(name) ?? Math.max(target[name] ?? 0, this.look.restingFace[name] ?? 0)
      const have = manager.getValue(name) ?? 0
      manager.setValue(name, have + (want - have) * k)
    }

    // Blink: a quick close/open, plus a mood-dependent droop.
    if (this.blinkPhase < 0 && now >= this.blinkAt) this.blinkPhase = 0
    let blink = 0
    if (this.blinkPhase >= 0) {
      this.blinkPhase += delta / 0.16
      blink = Math.sin(Math.min(this.blinkPhase, 1) * Math.PI)
      if (this.blinkPhase >= 1) {
        this.blinkPhase = -1
        this.scheduleBlink()
      }
    }
    this.eyelids += ((EYELIDS[this.mood] ?? 0) - this.eyelids) * k
    manager.setValue('blink', this.weights.get('blink') ?? Math.max(blink, this.eyelids))

    // Lip sync from the audio analyser: loudness -> "aa", with a little "ih" for variety.
    let level = 0
    if (this.analyser && this.analyserBuf) {
      this.analyser.getByteTimeDomainData(this.analyserBuf)
      let sum = 0
      for (const v of this.analyserBuf) sum += ((v - 128) / 128) ** 2
      level = Math.min(1, Math.sqrt(sum / this.analyserBuf.length) * 6)
    }
    this.mouth += (level - this.mouth) * (level > this.mouth ? 0.6 : 0.25)
    const lips: Record<string, number> = { aa: this.mouth * 0.85, ih: this.mouth * 0.25 * (Math.sin(now / 90) * 0.5 + 0.5) }
    for (const name of VISEMES) manager.setValue(name, this.weights.get(name) ?? lips[name] ?? 0)
  }

  // --- helpers -----------------------------------------------------------------------

  /**
   * Frame the body from the humanoid bones rather than the mesh bounds: the mesh bounds
   * include props (a sword, a cape) and the T-pose arms, which throw the centre off.
   */
  private frameCamera(vrm: VRM): void {
    vrm.scene.updateMatrixWorld(true)
    const at = (name: VRMHumanBoneName) => {
      const bone = vrm.humanoid.getNormalizedBoneNode(name)
      return bone ? bone.getWorldPosition(new THREE.Vector3()) : null
    }
    const head = at('head') ?? new THREE.Vector3(0, 1.5, 0)
    const hips = at('hips') ?? new THREE.Vector3(0, 0.9, 0)
    const feet = Math.min(at('leftFoot')?.y ?? 0.1, at('rightFoot')?.y ?? 0.1)
    const top = head.y + (head.y - hips.y) * 0.32 // crown of the head is a bit above the head bone
    const bottom = feet - 0.06
    const height = top - bottom
    const centerY = (top + bottom) / 2
    this.baseY = 0
    // Fit the whole body and leave the top ~15% of the window free for the speech bubble;
    // a long lens keeps proportions honest.
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov)
    const distance = (height * 1.3) / 2 / Math.tan(fovRad / 2)
    const aimY = centerY + height * 0.12
    this.camera.position.set(hips.x, aimY, hips.z + distance)
    this.camera.lookAt(hips.x, aimY, hips.z)
    this.lookTarget.position.set(hips.x, head.y, hips.z + 1)
    this.pxPerMeter = window.innerHeight / (height * 1.3)
    console.info('[vrm] framed', { height: height.toFixed(2), hipsX: hips.x.toFixed(2), distance: distance.toFixed(2), pxPerMeter: this.pxPerMeter.toFixed(0) })
  }

  /** Window-space box around the body, from projected bone positions. */
  private updateScreenBox(): void {
    const pts: Bone[] = []
    for (const name of ['head', 'hips', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'leftShoulder', 'rightShoulder'] as const) {
      const bone = this.bones[name]
      if (bone) pts.push(bone)
    }
    if (!pts.length) return
    const v = new THREE.Vector3()
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const bone of pts) {
      bone.getWorldPosition(v).project(this.camera)
      const sx = ((v.x + 1) / 2) * window.innerWidth
      const sy = ((1 - v.y) / 2) * window.innerHeight
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy)
    }
    const pad = window.innerWidth * 0.08
    this.screenBox = { x0: x0 - pad, y0: y0 - pad * 2.2, x1: x1 + pad, y1: y1 + pad * 0.6 }
  }

  private applyLights(l: Look['lights']): void {
    this.lights.clear()
    const key = new THREE.DirectionalLight(new THREE.Color(l.key.color), l.key.intensity)
    key.position.set(...l.key.position)
    const fill = new THREE.DirectionalLight(new THREE.Color(l.fill.color), l.fill.intensity)
    fill.position.set(...l.fill.position)
    const hemi = new THREE.HemisphereLight(new THREE.Color(l.hemisphere.sky), new THREE.Color(l.hemisphere.ground), l.hemisphere.intensity)
    this.lights.add(key, fill, hemi)
  }

  /** Shading tweaks per material name, see DEFAULT_LOOK. */
  private applyMaterialLook(vrm: VRM): void {
    const seen = new Set<THREE.Material>()
    vrm.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      for (const mat of [mesh.material].flat()) {
        if (seen.has(mat) || !(mat as MToonMaterial).isMToonMaterial) continue
        seen.add(mat)
        const m = mat as MToonMaterial
        for (const rule of this.look.materials) {
          if (!m.name.toLowerCase().includes(rule.match.toLowerCase())) continue
          for (const [key, value] of Object.entries(rule.set ?? {})) {
            const target = (m as unknown as Record<string, unknown>)[key]
            if (target instanceof THREE.Color && Array.isArray(value)) target.setRGB(value[0], value[1], value[2])
            else if (typeof value === 'number') (m as unknown as Record<string, number>)[key] = value
          }
          if (rule.textureFilter && m.map) {
            const filtered = filterTexture(m.map, rule.textureFilter)
            if (filtered) {
              m.map = filtered
              if (m.shadeMultiplyTexture) m.shadeMultiplyTexture = filtered
            }
          }
          m.needsUpdate = true
        }
      }
    })
  }

  private scheduleBlink(): void {
    const [min, max] = BLINK_EVERY_MS
    this.blinkAt = performance.now() + min + Math.random() * (max - min)
  }

  private scheduleFidget(): void {
    const [min, max] = FIDGET_EVERY_MS
    this.fidgetAt = performance.now() + min + Math.random() * (max - min)
  }

  private drawPlaceholder(): void {
    const group = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({ color: 0xff7ab6 })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.9, 8, 16), mat)
    body.position.y = 0.8
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffe1ec }))
    head.position.y = 1.55
    group.add(body, head)
    this.scene.add(group)
    this.placeholder = group
    this.camera.position.set(0, 0.9, 5)
    this.camera.lookAt(0, 0.85, 0)
    this.screenBox = { x0: window.innerWidth * 0.3, y0: window.innerHeight * 0.1, x1: window.innerWidth * 0.7, y1: window.innerHeight }
  }
}

const VISEMES = new Set(['aa', 'ih', 'ou', 'ee', 'oh'])

const BONES = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
] as const satisfies readonly VRMHumanBoneName[]

/** Set (or add to) a normalized bone's Euler rotation. Normalized bones rest at identity, so these are world-aligned at rest. */
function rot(bone: Bone | undefined, x: number, y: number, z: number, add = false): void {
  if (!bone) return
  if (add) {
    bone.rotation.x += x
    bone.rotation.y += y
    bone.rotation.z += z
  } else {
    bone.rotation.set(x, y, z)
  }
}


async function loadLook(modelUrl: string): Promise<Look> {
  try {
    const res = await fetch(new URL('look.json', new URL(modelUrl, window.location.href)))
    if (!res.ok) return DEFAULT_LOOK
    const custom = (await res.json()) as Partial<Look>
    return {
      lights: { ...DEFAULT_LOOK.lights, ...(custom.lights ?? {}) },
      materials: custom.materials ?? DEFAULT_LOOK.materials,
      restingFace: custom.restingFace ?? DEFAULT_LOOK.restingFace,
    }
  } catch {
    return DEFAULT_LOOK
  }
}

/** Re-bake a texture's image through a CSS filter (canvas 2D), keeping its sampling settings. */
function filterTexture(source: THREE.Texture, filter: string): THREE.Texture | null {
  const image = source.image as HTMLImageElement | ImageBitmap | HTMLCanvasElement | undefined
  if (!image || !('width' in image) || !image.width) return null
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.filter = filter
  ctx.drawImage(image, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = source.flipY
  tex.colorSpace = source.colorSpace
  tex.wrapS = source.wrapS
  tex.wrapT = source.wrapT
  tex.minFilter = source.minFilter
  tex.magFilter = source.magFilter
  tex.needsUpdate = true
  return tex
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm'
import type { Expression, WalkEvent } from '@shared/types'
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

interface WalkState {
  startedAt: number
  durationMs: number
  dir: 1 | -1
}

type Bone = THREE.Object3D

export class VrmCharacter implements Character {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock = new THREE.Clock()
  private readonly lookTarget = new THREE.Object3D()

  private vrm: VRM | null = null
  private placeholder: THREE.Object3D | null = null
  private bones: Partial<Record<VRMHumanBoneName, Bone>> = {}
  private baseY = 0

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
  private walk: WalkState | null = null
  private facing = 0
  private mouth = 0
  private analyser: AnalyserNode | null = null
  private analyserBuf: Uint8Array<ArrayBuffer> | null = null
  private screenBox: { x0: number; y0: number; x1: number; y1: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight) // also sets the CSS size, so the canvas does not overflow at DPR > 1
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(22, window.innerWidth / window.innerHeight, 0.1, 50)
    this.scene.add(this.lookTarget)

    const key = new THREE.DirectionalLight(0xffffff, Math.PI * 0.9)
    key.position.set(0.6, 1.4, 1.5)
    const fill = new THREE.DirectionalLight(0xbfd4ff, Math.PI * 0.35)
    fill.position.set(-1, 0.6, 0.8)
    this.scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.35))

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
    if (this.walk) return
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

  onWalk(event: WalkEvent): void {
    if (event.phase === 'start') {
      this.walk = { startedAt: performance.now(), durationMs: event.durationMs, dir: event.direction === 'right' ? 1 : -1 }
      this.headTargetYaw = 0
      this.headTargetPitch = 0
      return
    }
    this.walk = null
    if (event.phase === 'arrive') this.setExpression('happy')
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
      this.vrm.humanoid.resetNormalizedPose()
      this.applyIdle(now)
      this.applyHead(delta)
      this.applyWalk(now)
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

    rot(b.leftUpperArm, 0, 0, -1.22)
    rot(b.rightUpperArm, 0, 0, 1.22)
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
      this.fidget = { until: now + 2_600, tilt: (Math.random() - 0.5) * 0.3, shift: (Math.random() - 0.5) * 0.12 }
      this.scheduleFidget()
    }
  }

  private applyHead(delta: number): void {
    const k = 1 - Math.exp(-delta * 6)
    this.headYaw += (this.headTargetYaw - this.headYaw) * k
    this.headPitch += (this.headTargetPitch - this.headPitch) * k
    rot(this.bones.head, this.headPitch, this.headYaw, 0, true)
    rot(this.bones.neck, this.headPitch * 0.3, this.headYaw * 0.3, 0, true)
  }

  /** Turn toward the travel direction, swing legs and arms, bob, lean. Eases in and out. */
  private applyWalk(now: number): void {
    if (!this.vrm) return
    const w = this.walk
    const targetFacing = w ? w.dir * WALK.turnRad : 0
    this.facing += (targetFacing - this.facing) * 0.12
    this.vrm.scene.rotation.y = this.facing

    if (!w) {
      this.vrm.scene.position.y = this.baseY
      return
    }
    const elapsed = now - w.startedAt
    const ease = Math.min(1, elapsed / 300, Math.max(0, (w.durationMs - elapsed) / 300))
    const phase = (elapsed / 1000) * Math.PI * 2 * STRIDE_HZ
    const s = Math.sin(phase)
    const b = this.bones

    rot(b.leftUpperLeg, s * WALK.legSwing * ease, 0, 0)
    rot(b.rightUpperLeg, -s * WALK.legSwing * ease, 0, 0)
    rot(b.leftLowerLeg, Math.max(0, -s) * WALK.kneeBend * ease, 0, 0)
    rot(b.rightLowerLeg, Math.max(0, s) * WALK.kneeBend * ease, 0, 0)
    rot(b.leftUpperArm, -s * WALK.armSwing * ease, 0, -1.22)
    rot(b.rightUpperArm, s * WALK.armSwing * ease, 0, 1.22)
    rot(b.spine, WALK.lean * ease, 0, 0, true)
    this.vrm.scene.position.y = this.baseY + Math.abs(s) * WALK.bob * ease
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
      if (name.startsWith('blink') || VISEMES.has(name)) continue
      const want = this.weights.get(name) ?? target[name] ?? 0
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
    console.info('[vrm] framed', { height: height.toFixed(2), hipsX: hips.x.toFixed(2), distance: distance.toFixed(2) })
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

// Pixi compiles shader uniform code with `new Function` by default, which our Content
// Security Policy forbids. Importing this module swaps in a static implementation.
import '@pixi/unsafe-eval'
import { Application, Graphics, Ticker, type Container } from 'pixi.js'
import type { Expression, GestureEvent, MotionEvent } from '@shared/types'
import type { Character } from './character-types'

type Live2DLib = typeof import('pixi-live2d-display-lipsyncpatch/cubism4')
type Live2DModel = import('pixi-live2d-display-lipsyncpatch/cubism4').Live2DModel

/** The slice of the Cubism core model we poke at directly. */
interface CoreModel {
  setParameterValueById(id: string, value: number, weight?: number): void
}

/** InternalModel is an EventEmitter at runtime; the shipped typings lose that, so we narrow by hand. */
interface UpdateEvents {
  on(event: 'beforeModelUpdate', fn: () => void): unknown
}

/**
 * Maps the brain's expression enum onto the expression names inside a .model3.json
 * ("Expressions" > "Name"). Loaded from an `expressions.json` next to the model, e.g.
 *   { "neutral": "F01", "happy": "F02", "smug": "F05", "surprised": "F08", "sleepy": "F03", "annoyed": "F04" }
 * Missing file or missing keys mean "no expression change" for that mood.
 */
type ExpressionMap = Partial<Record<Expression, string>>

async function loadExpressionMap(modelUrl: string): Promise<ExpressionMap> {
  const url = new URL('expressions.json', new URL(modelUrl, window.location.href)).toString()
  try {
    const res = await fetch(url)
    return res.ok ? ((await res.json()) as ExpressionMap) : {}
  } catch {
    return {}
  }
}

/** If your model has a real walk cycle, name its motion group this and it replaces the procedural one. */
const WALK_MOTION_GROUP = 'Walk'
/** Small reaction on arriving next to a window: first group that exists in the model wins. */
const ARRIVE_MOTION_GROUPS = ['Peek', 'Tap', 'TapBody', 'Flick', 'FlickUp']
/** Random idle gestures so she never stands perfectly still. */
const FIDGET_EVERY_MS: readonly [number, number] = [25_000, 70_000]

/** Procedural walk cycle. Strides per second and how far things swing. */
const STRIDE_HZ = 2.6
const WALK = { bobPx: 10, leanForward: 6, hipSway: 4, headTilt: 3, headTurn: 14 }

/**
 * Cubism Core builds older than 4-r.4 lack Memory.initializeAmountOfMemory, which the
 * framework calls unconditionally at start-up (and then fails for good). Default memory
 * sizing is fine for one model, so a no-op keeps old cores working.
 */
function shimOlderCore(core: unknown): void {
  const c = core as { Memory?: { initializeAmountOfMemory?: (size: number) => void } }
  c.Memory ??= {}
  if (typeof c.Memory.initializeAmountOfMemory !== 'function') {
    c.Memory.initializeAmountOfMemory = () => {}
  }
}

interface WalkState {
  startedAt: number
  durationMs: number
}

/**
 * Live2D (Cubism 4) character with a placeholder fallback so the app runs before you have a
 * model. Idle motions, blinking and breathing come from the model itself; walking, facing,
 * fidgets and cursor tracking are added here.
 */
export class Live2DCharacter implements Character {
  private readonly app: Application
  private lib: Live2DLib | null = null
  private model: Live2DModel | null = null
  private placeholder: Graphics | null = null

  private expressions: ExpressionMap = {}
  private baseY = 0
  private baseScale = 1
  private facing: 1 | -1 = 1
  private walk: WalkState | null = null
  private fidgetTimer: number | undefined

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application({ view: canvas, backgroundAlpha: 0, resizeTo: window, antialias: true })
    Ticker.shared.add(this.onTick)
  }

  async load(modelUrl: string): Promise<void> {
    if (!window.Live2DCubismCore) {
      console.warn('[character] Live2D Cubism Core not found, showing placeholder')
      this.drawPlaceholder()
      return
    }
    shimOlderCore(window.Live2DCubismCore)
    try {
      // Imported lazily so a missing core does not blow up at module-evaluation time.
      this.lib = await import('pixi-live2d-display-lipsyncpatch/cubism4')
      const model = await this.lib.Live2DModel.from(modelUrl, {
        ticker: Ticker.shared,
        autoFocus: false, // we feed the global cursor ourselves (see lookAt)
        autoHitTest: false, // main.ts handles clicks and drags
      })

      this.baseScale = Math.min(window.innerWidth / model.width, window.innerHeight / model.height) * 0.95
      this.baseY = window.innerHeight
      model.scale.set(this.baseScale)
      model.anchor.set(0.5, 1)
      model.x = window.innerWidth / 2
      model.y = this.baseY

      // Fires after motions and physics but before the core updates, so our values win.
      ;(model.internalModel as unknown as UpdateEvents).on('beforeModelUpdate', this.applyWalkPose)

      this.app.stage.addChild(model)
      this.model = model
      this.expressions = await loadExpressionMap(modelUrl)
      this.scheduleFidget()
    } catch (err) {
      console.warn('[character] could not load model, showing placeholder', err)
      this.drawPlaceholder()
    }
  }

  /** Is this window-space point on her? Drives click-through toggling and drag. */
  hitTest(x: number, y: number): boolean {
    const target = this.body()
    return target ? target.getBounds().contains(x, y) : false
  }

  setExpression(expression: Expression): void {
    const name = this.expressions[expression]
    if (this.model && name) void this.model.expression(name)
  }

  /** Play a model expression by its own name. For tuning expressions.json; see ?debug in main.ts. */
  playExpressionRaw(name: string): void {
    if (this.model) void this.model.expression(name)
  }

  /** The expression names this model ships with. */
  expressionNames(): string[] {
    return this.model?.internalModel.motionManager.expressionManager?.definitions.map((d) => d.Name) ?? []
  }

  /** Point her eyes and head at a window-space position. */
  lookAt(x: number, y: number): void {
    if (this.walk) return // while walking she looks where she is going
    this.model?.focus(x, y)
  }

  /** 2D has no legs to speak of: walking and climbing use the walk cycle, everything else stands. */
  onMotion(event: MotionEvent): void {
    if (event.kind === 'walk' || event.kind === 'climb') {
      if (event.kind === 'walk') {
        this.facing = event.direction === 'right' ? 1 : -1
        this.applyFacing()
        // Eyes on the road: far off in the travel direction, slightly above the horizon.
        this.model?.focus(this.facing > 0 ? window.innerWidth * 1.5 : -window.innerWidth * 0.5, window.innerHeight * 0.35, true)
      }
      this.walk = { startedAt: performance.now(), durationMs: 60_000 }
      this.playFirstExisting([WALK_MOTION_GROUP], 'FORCE')
      return
    }

    this.walk = null
    const target = this.body()
    if (target) target.y = this.baseY
    if (event.kind === 'land' || event.kind === 'sit') this.playFirstExisting(ARRIVE_MOTION_GROUPS, 'NORMAL')
  }

  gesture(_event: GestureEvent): void {
    // No sword in 2D. A model with a "Summon" motion group could play it here.
  }

  /** Play audio with lip sync when we have a model, plain playback otherwise. Resolves when done. */
  speak(audioUrl: string | undefined, expression: Expression): Promise<void> {
    if (!audioUrl) return Promise.resolve()

    if (this.model) {
      const model = this.model
      return new Promise((resolve) => {
        model.speak(audioUrl, {
          volume: 1,
          expression: this.expressions[expression],
          resetExpression: true,
          onFinish: () => resolve(),
          onError: (err: unknown) => {
            console.warn('[character] lipsync error', err)
            resolve()
          },
        })
      })
    }

    const audio = new Audio(audioUrl)
    return new Promise((resolve) => {
      audio.onended = () => resolve()
      audio.onerror = () => resolve()
      void audio.play().catch(() => resolve())
    })
  }

  // --- internals -----------------------------------------------------------------------

  private body(): Container | null {
    return this.model ?? this.placeholder
  }

  /** Mirror her horizontally so she faces the way she walks. */
  private applyFacing(): void {
    if (this.model) this.model.scale.x = this.baseScale * this.facing
    else if (this.placeholder) this.placeholder.scale.x = this.facing
  }

  /** Per-frame: the step bounce. Position only; the Cubism parameters are handled below. */
  private onTick = (): void => {
    const target = this.body()
    if (!target || !this.walk) return
    const t = (performance.now() - this.walk.startedAt) / 1000
    const bob = Math.abs(Math.sin(t * Math.PI * STRIDE_HZ)) * WALK.bobPx
    target.y = this.baseY - bob
  }

  /**
   * Per-frame while walking: lean forward, sway the hips, counter-tilt the head, look ahead.
   * Values are in model space, so they stay the same when she is mirrored to walk left.
   */
  private applyWalkPose = (): void => {
    if (!this.model || !this.walk) return
    const core = this.model.internalModel.coreModel as CoreModel
    const t = (performance.now() - this.walk.startedAt) / 1000
    const phase = Math.sin(t * Math.PI * STRIDE_HZ)
    // Ease the pose in and out over the first/last 300ms of the walk.
    const elapsed = performance.now() - this.walk.startedAt
    const w = Math.min(1, elapsed / 300, Math.max(0, (this.walk.durationMs - elapsed) / 300))

    core.setParameterValueById('ParamBodyAngleX', WALK.leanForward * w)
    core.setParameterValueById('ParamBodyAngleZ', phase * WALK.hipSway * w)
    core.setParameterValueById('ParamAngleZ', -phase * WALK.headTilt * w)
    core.setParameterValueById('ParamAngleX', WALK.headTurn * w)
  }

  private playFirstExisting(candidates: string[], priority: 'NORMAL' | 'FORCE'): void {
    if (!this.model || !this.lib) return
    const definitions = this.model.internalModel.motionManager.definitions
    const group = candidates.find((g) => (definitions[g]?.length ?? 0) > 0)
    if (group) void this.model.motion(group, undefined, this.lib.MotionPriority[priority])
  }

  /** Every so often, play a random non-idle motion the model happens to have. */
  private scheduleFidget(): void {
    const [min, max] = FIDGET_EVERY_MS
    this.fidgetTimer = window.setTimeout(() => {
      this.fidget()
      this.scheduleFidget()
    }, min + Math.random() * (max - min))
  }

  private fidget(): void {
    if (!this.model || !this.lib || this.walk) return
    const manager = this.model.internalModel.motionManager
    const groups = Object.keys(manager.definitions).filter((g) => g !== manager.groups.idle && (manager.definitions[g]?.length ?? 0) > 0)
    if (!groups.length) return
    const group = groups[Math.floor(Math.random() * groups.length)]
    void this.model.motion(group, undefined, this.lib.MotionPriority.NORMAL)
  }

  private drawPlaceholder(): void {
    const g = new Graphics()
    const w = window.innerWidth
    const h = window.innerHeight
    // A soft blob with a face. Enough to test hover, drag, bubbles, voice and the walk.
    g.beginFill(0xff7ab6, 0.9).drawEllipse(w / 2, h * 0.72, w * 0.22, h * 0.26).endFill()
    g.beginFill(0xffe1ec).drawCircle(w / 2, h * 0.42, w * 0.18).endFill()
    g.beginFill(0x333333).drawCircle(w / 2 - w * 0.06, h * 0.4, 5).drawCircle(w / 2 + w * 0.06, h * 0.4, 5).endFill()
    g.lineStyle(3, 0x333333).arc(w / 2, h * 0.44, w * 0.05, 0.2 * Math.PI, 0.8 * Math.PI)
    // Pivot on the horizontal centre so scale.x = -1 mirrors in place.
    g.pivot.set(w / 2, 0)
    g.x = w / 2
    this.baseY = 0
    this.app.stage.addChild(g)
    this.placeholder = g
  }
}

import { Application, Graphics, Ticker } from 'pixi.js'
import type { Expression } from '@shared/types'

type Live2DModel = import('pixi-live2d-display-lipsyncpatch/cubism4').Live2DModel

/**
 * Map the brain's expression enum onto the expression names inside your .model3.json
 * (look under "Expressions" > "Name"). Leave null to skip. The defaults below match
 * Live2D's free "Hiyori" sample, which has none, so everything is null until you fill it.
 */
const EXPRESSION_MAP: Record<Expression, string | null> = {
  neutral: null,
  happy: null,
  smug: null,
  surprised: null,
  sleepy: null,
  annoyed: null,
}

/** Live2D model with a placeholder fallback so the app runs before you have a model. */
export class Character {
  private readonly app: Application
  private model: Live2DModel | null = null
  private placeholder: Graphics | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application({ view: canvas, backgroundAlpha: 0, resizeTo: window, antialias: true })
  }

  async load(modelUrl: string): Promise<void> {
    if (!window.Live2DCubismCore) {
      console.warn('[character] Live2D Cubism Core not found, showing placeholder')
      this.drawPlaceholder()
      return
    }
    try {
      // Imported lazily so a missing core does not blow up at module-evaluation time.
      const { Live2DModel } = await import('pixi-live2d-display-lipsyncpatch/cubism4')
      const model = await Live2DModel.from(modelUrl, { ticker: Ticker.shared })

      const scale = Math.min(window.innerWidth / model.width, window.innerHeight / model.height) * 0.95
      model.scale.set(scale)
      model.anchor.set(0.5, 1)
      model.x = window.innerWidth / 2
      model.y = window.innerHeight

      this.app.stage.addChild(model)
      this.model = model
    } catch (err) {
      console.warn('[character] could not load model, showing placeholder', err)
      this.drawPlaceholder()
    }
  }

  /** Is this window-space point on her? Drives click-through toggling and drag. */
  hitTest(x: number, y: number): boolean {
    const target = this.model ?? this.placeholder
    return target ? target.getBounds().contains(x, y) : false
  }

  setExpression(expression: Expression): void {
    const name = EXPRESSION_MAP[expression]
    if (this.model && name) void this.model.expression(name)
  }

  /** Play audio with lip sync when we have a model, plain playback otherwise. Resolves when done. */
  speak(audioUrl: string | undefined, expression: Expression): Promise<void> {
    if (!audioUrl) return Promise.resolve()

    if (this.model) {
      const model = this.model
      return new Promise((resolve) => {
        model.speak(audioUrl, {
          volume: 1,
          expression: EXPRESSION_MAP[expression] ?? undefined,
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

  private drawPlaceholder(): void {
    const g = new Graphics()
    const w = window.innerWidth
    const h = window.innerHeight
    // A soft blob with a face. Enough to test hover, drag, bubbles and voice.
    g.beginFill(0xff7ab6, 0.9).drawEllipse(w / 2, h * 0.72, w * 0.22, h * 0.26).endFill()
    g.beginFill(0xffe1ec).drawCircle(w / 2, h * 0.42, w * 0.18).endFill()
    g.beginFill(0x333333).drawCircle(w / 2 - w * 0.06, h * 0.4, 5).drawCircle(w / 2 + w * 0.06, h * 0.4, 5).endFill()
    g.lineStyle(3, 0x333333).arc(w / 2, h * 0.44, w * 0.05, 0.2 * Math.PI, 0.8 * Math.PI)
    this.app.stage.addChild(g)
    this.placeholder = g
  }
}

import { BrowserWindow, screen } from 'electron'
import type { WalkEvent } from '@shared/types'
import { config } from './config'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Moves the overlay window across the screen at walking pace and tells the renderer about
 * it, so the character can turn, bob and lean while the main process drags the window.
 *
 * "Home" is wherever the user last dropped her. A peek always ends with a walk back home.
 */
export class OverlayMover {
  private home: { x: number; y: number }
  private frame: NodeJS.Timeout | null = null
  private returnTimer: NodeJS.Timeout | null = null
  private cancelCurrent: (() => void) | null = null
  private walking = false

  constructor(private readonly win: BrowserWindow) {
    const [x, y] = win.getPosition()
    this.home = { x, y }
  }

  get isWalking(): boolean {
    return this.walking
  }

  /** The user put her somewhere on purpose. */
  setHomeHere(): void {
    const [x, y] = this.win.getPosition()
    this.home = { x, y }
    this.clearReturn()
  }

  /** The user grabbed her mid-walk: stop and forget about going home. */
  interrupt(): void {
    this.cancelCurrent?.()
    this.clearReturn()
  }

  /** Walk over to (x, y), hang around, then walk back home. Resolves on arrival. */
  async peek(x: number, y: number): Promise<void> {
    await this.walkTo(x, y)
    this.clearReturn()
    this.returnTimer = setTimeout(() => void this.walkTo(this.home.x, this.home.y), config.peekLingerMs)
  }

  walkTo(x: number, y: number): Promise<void> {
    this.cancelCurrent?.()
    const target = this.clampToWorkArea(x, y)
    const [sx, sy] = this.win.getPosition()
    const distance = Math.hypot(target.x - sx, target.y - sy)
    if (distance < 4) return Promise.resolve()

    const durationMs = clamp((distance / config.walkSpeedPxPerSec) * 1000, 600, 3500)
    const direction = target.x < sx ? 'left' : 'right'
    this.send({ phase: 'start', direction, durationMs })
    this.walking = true

    return new Promise<void>((resolve) => {
      const startedAt = Date.now()

      const finish = (arrived: boolean) => {
        if (this.frame) clearInterval(this.frame)
        this.frame = null
        this.cancelCurrent = null
        this.walking = false
        this.send({ phase: arrived ? 'arrive' : 'cancel' })
        resolve()
      }

      this.cancelCurrent = () => finish(false)
      this.frame = setInterval(() => {
        if (this.win.isDestroyed()) return finish(false)
        const t = Math.min(1, (Date.now() - startedAt) / durationMs)
        const e = easeInOut(t)
        this.win.setPosition(Math.round(sx + (target.x - sx) * e), Math.round(sy + (target.y - sy) * e))
        if (t >= 1) finish(true)
      }, 1000 / 60)
    })
  }

  dispose(): void {
    this.interrupt()
  }

  private clampToWorkArea(x: number, y: number): { x: number; y: number } {
    const [w, h] = this.win.getSize()
    const { workArea } = screen.getDisplayMatching({ x, y, width: w, height: h })
    return {
      x: clamp(x, workArea.x, workArea.x + workArea.width - w),
      y: clamp(y, workArea.y, workArea.y + workArea.height - h),
    }
  }

  private clearReturn(): void {
    if (this.returnTimer) clearTimeout(this.returnTimer)
    this.returnTimer = null
  }

  private send(event: WalkEvent): void {
    if (!this.win.isDestroyed()) this.win.webContents.send('walk', event)
  }
}

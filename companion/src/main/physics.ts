import { BrowserWindow, screen } from 'electron'
import type { GestureEvent, MotionEvent, WindowInfo } from '@shared/types'
import { SIT_DROP_PX } from '@shared/types'
import { config } from './config'
import { listWindows } from './senses/windows'

/**
 * The overlay as a small platformer body. Window tops are ledges, the work area bottom is
 * the floor, the work area edges are walls. She walks along ledges, climbs a window's face
 * to reach its top, steps off edges and falls, lands, sits on ledges, rides a window that
 * is dragged under her, and drops when the window she stands on closes or moves away.
 *
 * All coordinates are screen pixels. The overlay's top-left is (x, y); her soles are
 * FEET_OFFSET above the overlay bottom, centred horizontally.
 */

/** Pixels between the overlay bottom and her soles. */
const FEET_OFFSET = 8
/** Half the width of her footprint; a ledge must contain this much of it to support her. */
const FOOT_HALF = 22
const TICK_MS = 1000 / 60
const PLATFORM_REFRESH_TICKS = 6
const MAX_PLAN_STEPS = 10

export interface Platform {
  id: string
  /** Screen y of the ledge. */
  y: number
  x0: number
  x1: number
  windowId?: string
}

interface Target {
  /** Where her feet should end up. */
  x: number
  y: number
}

type State =
  | { kind: 'held' }
  | { kind: 'fall'; vy: number }
  | { kind: 'stand'; platform: Platform }
  | { kind: 'sit'; platform: Platform }
  | { kind: 'walk'; platform: Platform; targetX: number; dropAtEdge: boolean; done: () => void }
  | { kind: 'climb'; to: Platform; done: () => void }

interface Plan {
  target: Target
  sit: boolean
  steps: number
  resolve: () => void
}

export class OverlayPhysics {
  private x: number
  private y: number
  private readonly w: number
  private readonly h: number
  private state: State = { kind: 'fall', vy: 0 }
  private plan: Plan | null = null
  private platforms: Platform[] = []
  private windows = new Map<string, WindowInfo>()
  private ticks = 0
  private timer: NodeJS.Timeout | null = null
  private lastMotion = ''
  private gestures = new Set<GestureEvent['name']>()

  constructor(private readonly win: BrowserWindow) {
    const [x, y] = win.getPosition()
    const [w, h] = win.getSize()
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  start(): void {
    this.stop()
    this.refreshPlatforms()
    this.timer = setInterval(() => this.tick(TICK_MS / 1000), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  // --- what the rest of the app asks of her ------------------------------------------

  /** Her feet, in screen pixels. */
  feet(): { x: number; y: number } {
    return { x: this.x + this.w / 2, y: this.y + this.h - FEET_OFFSET }
  }

  /** The ledge she is standing or sitting on, if any. */
  support(): Platform | null {
    const s = this.state
    return s.kind === 'stand' || s.kind === 'sit' || s.kind === 'walk' ? s.platform : null
  }

  floor(): Platform {
    return this.platforms.find((p) => p.id === 'floor') ?? this.makeFloor()
  }

  /** The widest uncovered stretch of a window's top edge, if she can fit on it. */
  ledgeOf(windowId: string): Platform | null {
    const ledges = this.platforms.filter((p) => p.windowId === windowId)
    return ledges.sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0] ?? null
  }

  /** The user grabbed her. Position updates come through moveTo(). */
  hold(): void {
    this.cancelPlan()
    this.setState({ kind: 'held' })
  }

  moveTo(x: number, y: number): void {
    this.x = x
    this.y = y
    this.apply()
  }

  /** The user let go: gravity takes over from wherever she is, kept on screen. */
  release(): void {
    const wa = this.workArea()
    this.x = clamp(this.x, wa.x, wa.x + wa.width - this.w)
    this.y = clamp(this.y, wa.y, wa.y + wa.height - this.h + FEET_OFFSET)
    this.setState({ kind: 'fall', vy: 0 })
  }

  /** Walk, climb and drop her way to a spot; optionally sit down there. Resolves on arrival or when she gives up. */
  goTo(target: Target, opts: { sit?: boolean } = {}): Promise<void> {
    this.cancelPlan()
    return new Promise<void>((resolve) => {
      this.plan = { target, sit: !!opts.sit, steps: 0, resolve }
      this.continuePlan()
    })
  }

  gesture(name: GestureEvent['name'], active: boolean): void {
    if (active) this.gestures.add(name)
    else this.gestures.delete(name)
    this.send('gesture', { name, active })
  }

  // --- simulation ----------------------------------------------------------------------

  private tick(dt: number): void {
    if (this.win.isDestroyed()) return this.stop()
    if (++this.ticks % PLATFORM_REFRESH_TICKS === 0) this.refreshPlatforms()

    const s = this.state
    switch (s.kind) {
      case 'held':
        return
      case 'fall': {
        const feetBefore = this.feet().y
        s.vy = Math.min(s.vy + config.gravityPxPerSec2 * dt, config.maxFallPxPerSec)
        this.y += s.vy * dt
        const feetAfter = this.feet().y
        const landing = this.landingBetween(feetBefore, feetAfter)
        if (landing) {
          this.standOn(landing)
          this.send('motion', { kind: 'land', impact: Math.min(1, s.vy / config.maxFallPxPerSec) })
          this.lastMotion = 'land'
          this.continuePlan()
        }
        break
      }
      case 'walk': {
        const step = config.walkSpeedPxPerSec * dt
        const feetX = this.feet().x
        const dir = Math.sign(s.targetX - feetX)
        const next = Math.abs(s.targetX - feetX) <= step ? s.targetX : feetX + dir * step
        const lo = s.platform.x0 + FOOT_HALF
        const hi = s.platform.x1 - FOOT_HALF
        if (next < lo || next > hi) {
          // Reached the end of the ledge.
          this.x = clamp(next, lo, hi) - this.w / 2
          if (s.dropAtEdge) {
            this.x = (next < lo ? s.platform.x0 - FOOT_HALF - 2 : s.platform.x1 + FOOT_HALF + 2) - this.w / 2
            this.setState({ kind: 'fall', vy: 0 })
          } else {
            this.setState({ kind: 'stand', platform: s.platform })
          }
          s.done()
          break
        }
        this.x = next - this.w / 2
        if (next === s.targetX) {
          this.setState({ kind: 'stand', platform: s.platform })
          s.done()
        }
        break
      }
      case 'climb': {
        const targetY = s.to.y - this.h + FEET_OFFSET
        this.y = Math.max(targetY, this.y - config.climbSpeedPxPerSec * dt)
        if (this.y <= targetY) {
          this.standOn(s.to)
          s.done()
        }
        break
      }
      case 'stand':
      case 'sit':
        this.keepSupport(s.platform, s.kind)
        break
    }
    this.clampToWalls()
    this.apply()
  }

  /** Lose support when the ledge vanished or slid out from under her; ride it when it moved. */
  private keepSupport(platform: Platform, kind: 'stand' | 'sit'): void {
    const fresh = this.platforms.find((p) => p.id === platform.id)
    if (!fresh) return this.setState({ kind: 'fall', vy: 0 })
    if (fresh.y !== platform.y) {
      this.y += fresh.y - platform.y // ride a window being dragged vertically
      platform.y = fresh.y
    }
    platform.x0 = fresh.x0
    platform.x1 = fresh.x1
    const feetX = this.feet().x
    if (feetX < fresh.x0 - FOOT_HALF || feetX > fresh.x1 + FOOT_HALF) this.setState({ kind: 'fall', vy: 0 })
    else if (kind === 'sit' && (feetX < fresh.x0 + FOOT_HALF || feetX > fresh.x1 - FOOT_HALF)) this.setState({ kind: 'stand', platform })
  }

  private landingBetween(feetBefore: number, feetAfter: number): Platform | null {
    const feetX = this.feet().x
    let best: Platform | null = null
    for (const p of this.platforms) {
      if (feetX < p.x0 - FOOT_HALF || feetX > p.x1 + FOOT_HALF) continue
      if (p.y < feetBefore - 1 || p.y > feetAfter) continue
      if (!best || p.y < best.y) best = p
    }
    return best
  }

  private standOn(platform: Platform): void {
    this.y = platform.y - this.h + FEET_OFFSET
    this.setState({ kind: 'stand', platform })
  }

  private clampToWalls(): void {
    const wa = this.workArea()
    this.x = clamp(this.x, wa.x, wa.x + wa.width - this.w)
    if (this.y < wa.y) this.y = wa.y
  }

  private apply(): void {
    if (this.win.isDestroyed()) return
    const [cx, cy] = this.win.getPosition()
    const nx = Math.round(this.x)
    const ny = Math.round(this.y)
    if (nx !== cx || ny !== cy) this.win.setPosition(nx, ny)
  }

  private setState(next: State): void {
    const prev = this.state
    this.state = next
    const motion = this.motionFor(next, prev)
    if (motion && motion.kind !== this.lastMotion) {
      this.lastMotion = motion.kind
      this.send('motion', motion)
    }
    if (next.kind === 'sit') this.y = next.platform.y - this.h + SIT_DROP_PX
  }

  private motionFor(next: State, prev: State): MotionEvent | null {
    switch (next.kind) {
      case 'held':
        return { kind: 'held' }
      case 'fall':
        return { kind: 'fall' }
      case 'stand':
        return prev.kind === 'sit' ? { kind: 'stand' } : prev.kind === 'fall' ? null : { kind: 'stand' }
      case 'sit':
        return { kind: 'sit' }
      case 'walk':
        return { kind: 'walk', direction: next.targetX < this.feet().x ? 'left' : 'right' }
      case 'climb':
        return { kind: 'climb' }
    }
  }

  // --- navigation ----------------------------------------------------------------------

  private cancelPlan(): void {
    const s = this.state
    if (s.kind === 'walk' || s.kind === 'climb') s.done()
    const plan = this.plan
    this.plan = null
    plan?.resolve()
  }

  private finishPlan(): void {
    const plan = this.plan
    this.plan = null
    plan?.resolve()
  }

  /** One leg of the route at a time; called again after every walk, climb and landing. */
  private continuePlan(): void {
    const plan = this.plan
    if (!plan) return
    const s = this.state
    if (s.kind === 'fall' || s.kind === 'held' || s.kind === 'walk' || s.kind === 'climb') return
    if (++plan.steps > MAX_PLAN_STEPS) return this.finishPlan()

    const here = s.platform
    const { target } = plan
    const feetX = this.feet().x
    const lo = here.x0 + FOOT_HALF
    const hi = here.x1 - FOOT_HALF
    const sameLevel = Math.abs(target.y - here.y) < 4

    if (sameLevel && target.x >= lo && target.x <= hi) {
      // Last leg: walk there, then sit if asked.
      return this.walkTo(here, clamp(target.x, lo, hi), false, () => {
        if (plan.sit) this.setState({ kind: 'sit', platform: here })
        this.finishPlan()
      })
    }

    if (target.y < here.y - 4) {
      // Higher: find the ledge, walk under its uncovered stretch, climb the face.
      const to = this.platforms.find((p) => Math.abs(p.y - target.y) < 4 && target.x >= p.x0 && target.x <= p.x1)
      if (to) {
        const oLo = Math.max(lo, to.x0 + FOOT_HALF)
        const oHi = Math.min(hi, to.x1 - FOOT_HALF)
        if (oLo <= oHi) {
          return this.walkTo(here, clamp(target.x, oLo, oHi), false, () => {
            this.setState({ kind: 'climb', to, done: () => this.continuePlan() })
          })
        }
      }
    }

    // Lower, or not reachable from this ledge: walk to the end nearest the target and step off.
    if (here.id === 'floor') return this.finishPlan() // nowhere to drop to
    const edgeX = target.x < feetX ? lo : hi
    this.walkTo(here, edgeX, true, () => undefined)
  }

  private walkTo(platform: Platform, targetX: number, dropAtEdge: boolean, done: () => void): void {
    if (Math.abs(targetX - this.feet().x) < 1 && !dropAtEdge) return done()
    this.setState({ kind: 'walk', platform, targetX, dropAtEdge, done })
  }

  // --- platforms -----------------------------------------------------------------------

  private workArea(): Electron.Rectangle {
    return screen.getDisplayMatching({ x: Math.round(this.x), y: Math.round(this.y), width: this.w, height: this.h }).workArea
  }

  private makeFloor(): Platform {
    const wa = this.workArea()
    return { id: 'floor', y: wa.y + wa.height, x0: wa.x, x1: wa.x + wa.width }
  }

  /**
   * Window tops become ledges. A ledge is the part of a window's top edge not covered by any
   * window above it in the z-order, and only when the overlay fits above it on screen.
   */
  private refreshPlatforms(): void {
    const wa = this.workArea()
    const windows = listWindows(process.pid)
    this.windows = new Map(windows.map((w) => [w.id, w]))
    const platforms: Platform[] = [this.makeFloor()]
    const minTop = wa.y + this.h - FEET_OFFSET

    for (const w of windows) {
      if (w.y < minTop || w.y > wa.y + wa.height) continue
      let segments: Array<[number, number]> = [[Math.max(w.x, wa.x), Math.min(w.x + w.width, wa.x + wa.width)]]
      for (const above of windows) {
        if (above.z >= w.z) continue
        if (above.y > w.y || above.y + above.height < w.y) continue
        segments = segments.flatMap(([a, b]) => {
          const parts: Array<[number, number]> = []
          if (above.x > a) parts.push([a, Math.min(b, above.x)])
          if (above.x + above.width < b) parts.push([Math.max(a, above.x + above.width), b])
          return parts.filter(([p, q]) => q - p >= config.minLedgePx)
        })
      }
      segments.forEach(([x0, x1], i) => platforms.push({ id: `${w.id}:${i}`, y: w.y, x0, x1, windowId: w.id }))
    }
    this.platforms = platforms
  }

  private send(channel: 'motion' | 'gesture', payload: MotionEvent | GestureEvent): void {
    if (!this.win.isDestroyed()) this.win.webContents.send(channel, payload)
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

import type { Snapshot, SpeakPayload, SystemStats, WindowInfo } from '@shared/types'
import { Anthropic, think } from './brain/client'
import { Memory } from './brain/memory'
import type { Action, Reply } from './brain/schema'
import { config } from './config'
import { minimizeWindow, nudgeWindow, peekTarget } from './hands/windowControl'
import { readSystemStats } from './senses/system'
import { listWindows } from './senses/windows'
import { synthesize } from './voice/tts'

export interface SchedulerHost {
  speak(payload: SpeakPayload): void
  /** Walk the overlay over to (x, y), linger, then wander home. Resolves on arrival. */
  peekAt(x: number, y: number): Promise<void>
  overlaySize(): { width: number; height: number }
}

/**
 * The heartbeat. Every tick: sense -> diff against last tick -> decide whether this is
 * worth a brain call -> act. All the "please don't be annoying" logic lives here, not in
 * the prompt, because a cooldown in code is a cooldown; a cooldown in a prompt is a wish.
 */
export class Scheduler {
  private timer: NodeJS.Timeout | null = null
  private busy = false
  private lastSpokeAt = 0
  private lastEventAt = Date.now()
  private pendingEvents: string[] = []

  private prevWindows = new Map<string, WindowInfo>()
  private prevForeground: string | undefined
  private prevStats: SystemStats | undefined

  constructor(
    private readonly host: SchedulerHost,
    private readonly persona: string,
    private readonly memory: Memory,
  ) {}

  start(): void {
    this.stop()
    this.timer = setInterval(() => void this.tick(), config.tickMs)
    void this.tick()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** The user clicked her: react right away, ignoring the cooldown. */
  poke(): void {
    this.pendingEvents.push('the user poked you')
    this.lastSpokeAt = 0
    void this.tick()
  }

  async snapshot(): Promise<Snapshot> {
    const windows = listWindows(process.pid)
    const stats = await readSystemStats()
    const events = [...this.pendingEvents, ...this.diff(windows, stats)]
    this.pendingEvents = []
    return { at: new Date().toLocaleString(), windows, stats, events }
  }

  private async tick(): Promise<void> {
    if (this.busy) return
    this.busy = true
    try {
      const snap = await this.snapshot()
      if (snap.events.length) this.lastEventAt = Date.now()
      if (!this.shouldThink(snap)) return

      const reply = await think(this.persona, snap, this.memory.recent())
      if (reply) await this.apply(reply, snap)
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) console.warn('[brain] rate limited, skipping tick')
      else if (err instanceof Anthropic.APIError) console.warn(`[brain] api error ${err.status}:`, err.message)
      else console.error('[scheduler]', err)
    } finally {
      this.busy = false
    }
  }

  private shouldThink(snap: Snapshot): boolean {
    const now = Date.now()
    if (now - this.lastSpokeAt < config.minSilenceMs) return false
    if (snap.events.length) return true
    // Nothing happened. Occasionally pipe up anyway so she feels alive.
    return now - this.lastEventAt > config.idleChatterMs && Math.random() < config.idleChatterChance
  }

  private async apply(reply: Reply, snap: Snapshot): Promise<void> {
    for (const action of reply.actions) await this.act(action, snap)

    if (!reply.speak || !reply.line.trim()) return
    this.lastSpokeAt = Date.now()
    this.memory.remember(reply.line)
    const audioDataUrl = await synthesize(reply.line, reply.style)
    this.host.speak({ line: reply.line, style: reply.style, expression: reply.expression, audioDataUrl })
  }

  private async act(action: Action, snap: Snapshot): Promise<void> {
    const target = snap.windows.find((w) => w.id === action.windowId)
    if (action.type === 'none' || !target) return
    // Hard rule, enforced in code as well as in the prompt.
    if (target.foreground && action.type !== 'peek_at_window') return

    switch (action.type) {
      case 'nudge_window':
        await nudgeWindow(target.id, action.dx, action.dy)
        break
      case 'minimize_window':
        minimizeWindow(target.id)
        break
      case 'peek_at_window': {
        const { width, height } = this.host.overlaySize()
        const { x, y } = peekTarget(target, width, height)
        await this.host.peekAt(x, y) // she arrives before she speaks
        break
      }
    }
  }

  /** Turn two consecutive snapshots into a short list of human-readable changes. */
  private diff(windows: WindowInfo[], stats: SystemStats): string[] {
    const events: string[] = []
    const current = new Map(windows.map((w) => [w.id, w]))

    const fg = windows.find((w) => w.foreground)
    const fgKey = fg ? `${fg.process}|${fg.title}` : undefined
    if (fgKey !== this.prevForeground && fg) events.push(`user switched to ${fg.process} ("${fg.title}")`)
    this.prevForeground = fgKey

    for (const [id, w] of current) if (!this.prevWindows.has(id)) events.push(`opened ${w.process} ("${w.title}")`)
    for (const [id, w] of this.prevWindows) if (!current.has(id)) events.push(`closed ${w.process} ("${w.title}")`)
    // First tick: everything is "new". Don't flood her.
    if (this.prevWindows.size === 0) events.length = 0

    const prev = this.prevStats
    if (prev) {
      if (stats.cpuLoadPct >= config.cpuHighPct && prev.cpuLoadPct < config.cpuHighPct) events.push(`CPU load jumped to ${Math.round(stats.cpuLoadPct)}%`)
      const temp = stats.cpuTempC ?? stats.gpuTempC
      const prevTemp = prev.cpuTempC ?? prev.gpuTempC
      if (temp !== undefined && prevTemp !== undefined) {
        if (temp >= config.tempHighC && prevTemp < config.tempHighC) events.push(`temperature reached ${Math.round(temp)}°C`)
        if (temp < config.tempHighC - 10 && prevTemp >= config.tempHighC) events.push('temperature back to normal')
      }
    }

    this.prevWindows = current
    this.prevStats = stats
    return events
  }
}

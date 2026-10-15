import { join } from 'node:path'
import { app } from 'electron'
import { config as loadEnv } from 'dotenv'

// .env next to the project in dev, next to the executable's resources when packaged,
// and the per-user data folder as a last resort.
loadEnv({
  path: [
    join(app.getAppPath(), '.env'),
    join(process.resourcesPath ?? '', '.env'),
    join(app.getPath('userData'), '.env'),
  ],
})

export const config = {
  name: process.env.COMPANION_NAME ?? 'Mika',
  model: process.env.COMPANION_MODEL ?? 'claude-opus-5-5',

  elevenLabsKey: process.env.ELEVENLABS_API_KEY || undefined,
  elevenLabsVoice: process.env.ELEVENLABS_VOICE_ID || undefined,

  lhmUrl: process.env.LHM_URL ?? 'http://localhost:8085',
  live2dModelUrl: process.env.LIVE2D_MODEL_URL ?? '/model/haru-scarlet/Haru.model3.json',

  /** How often senses are sampled. */
  tickMs: 5_000,
  /** Hard floor between two spoken lines. The single biggest "not annoying" knob. */
  minSilenceMs: 45_000,
  /** With nothing happening, she may still say something after this long. */
  idleChatterMs: 6 * 60_000,
  /** Chance per tick (once idleChatterMs has passed) that she pipes up unprompted. */
  idleChatterChance: 0.15,

  cpuHighPct: 85,
  tempHighC: 85,
  /** Clamp for window shoving so she can't throw things off-screen. */
  maxNudgePx: 200,
  /** Clamp for icon shoving, in desktop grid cells. */
  maxIconNudgeCells: 2,

  /** Walking speed of the overlay for peek_at_window. */
  walkSpeedPxPerSec: 380,
  /** How long she lingers by the window she peeked at before wandering back home. */
  peekLingerMs: 25_000,
  /** How often the global cursor position is forwarded so her eyes can follow it. */
  cursorTrackHz: 20,
} as const

export function resourcePath(...parts: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, ...parts)
    : join(app.getAppPath(), ...parts)
}

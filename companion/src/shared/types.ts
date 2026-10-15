// Types that cross the IPC boundary. Keep this file free of Node/Electron imports:
// it is compiled into both the main process and the renderer.

export type Style = 'normal' | 'whisper' | 'tease' | 'excited' | 'sleepy'
export type Expression = 'neutral' | 'happy' | 'smug' | 'surprised' | 'sleepy' | 'annoyed'

export interface WindowInfo {
  /** Win32 HWND as a decimal string. Opaque to the brain, used to target actions. */
  id: string
  title: string
  /** Executable name, e.g. "chrome.exe". */
  process: string
  x: number
  y: number
  width: number
  height: number
  foreground: boolean
  /** Position in the z-order, 0 = topmost. Used to find which window tops are uncovered. */
  z: number
}

export interface SystemStats {
  cpuLoadPct: number
  memUsedPct: number
  cpuTempC?: number
  gpuTempC?: number
  gpuLoadPct?: number
}

/** A desktop icon, in screen coordinates. cellW/cellH is the icon grid spacing. */
export interface IconInfo {
  name: string
  x: number
  y: number
  cellW: number
  cellH: number
}

/** Everything the brain gets to look at on one tick. */
export interface Snapshot {
  at: string
  windows: WindowInfo[]
  icons: IconInfo[]
  /** false when Explorer's "auto arrange" is on and icons snap back, or when we can't reach them. */
  iconsMovable: boolean
  stats: SystemStats
  /** Human-readable things that changed since last tick, e.g. "foreground changed to chrome.exe". */
  events: string[]
}

/** main -> renderer: say this line. */
export interface SpeakPayload {
  line: string
  style: Style
  expression: Expression
  /** data: URL with mp3 audio. Absent when TTS is disabled or failed. */
  audioDataUrl?: string
}

/**
 * main -> renderer: what her body is doing. The main process owns the overlay position and
 * the physics; the renderer owns what she looks like while it happens.
 */
export type MotionEvent =
  | { kind: 'walk'; direction: 'left' | 'right' }
  | { kind: 'stand' }
  | { kind: 'climb' }
  | { kind: 'fall' }
  /** impact 0..1 from the landing speed. */
  | { kind: 'land'; impact: number }
  /** Sitting on a ledge; hips are SIT_DROP_PX above the overlay bottom. */
  | { kind: 'sit' }
  /** Picked up by the user. */
  | { kind: 'held' }

/** Hips-to-overlay-bottom distance while sitting, so legs can dangle over the ledge. */
export const SIT_DROP_PX = 150

/** main -> renderer: a special move, held while active. */
export interface GestureEvent {
  name: 'summon'
  active: boolean
}

export interface RendererConfig {
  name: string
  modelUrl: string
}

/** What the preload script exposes on window.companion. */
export interface CompanionApi {
  getConfig(): Promise<RendererConfig>
  onSpeak(cb: (payload: SpeakPayload) => void): () => void
  onExpression(cb: (expression: Expression) => void): () => void
  onMotion(cb: (event: MotionEvent) => void): () => void
  onGesture(cb: (event: GestureEvent) => void): () => void
  /** Global cursor position in overlay-window coordinates, a few times a second. */
  onCursor(cb: (x: number, y: number) => void): () => void
  /** true = clicks pass through to whatever is behind the overlay. */
  setIgnoreMouse(ignore: boolean): void
  moveWindowBy(dx: number, dy: number): void
  /** The user finished dragging her: wherever she is now is home. */
  dragEnd(): void
  /** The user clicked her. */
  poke(): void
  quit(): void
}

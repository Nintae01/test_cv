import type { Expression, WalkEvent } from '@shared/types'

/**
 * What the rest of the renderer needs from "her", whatever draws her. Two implementations:
 * Live2D (character-live2d.ts) for .model3.json and VRM (character-vrm.ts) for .vrm.
 */
export interface Character {
  load(modelUrl: string): Promise<void>
  /** Is this window-space point on her? Drives click-through toggling and drag. */
  hitTest(x: number, y: number): boolean
  setExpression(expression: Expression): void
  /** Point her eyes (and a bit of head) at a window-space position. */
  lookAt(x: number, y: number): void
  /** React to the overlay window being walked across the screen by the main process. */
  onWalk(event: WalkEvent): void
  /** Play audio with lip sync. Resolves when playback ends. */
  speak(audioUrl: string | undefined, expression: Expression): Promise<void>
  /** Play one of the model's own expressions by name; for tuning from DevTools. */
  playExpressionRaw(name: string): void
  /** The expression names this model ships with. */
  expressionNames(): string[]
}

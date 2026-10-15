import { screen } from 'electron'
import type { WindowInfo } from '@shared/types'
import { config } from '../config'
import { win32, WIN32, type Rect } from '../native/win32'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v))

/** Slide a window by (dx, dy) over ~400ms so it reads as a shove, not a teleport. */
export async function nudgeWindow(id: string, dx: number, dy: number): Promise<void> {
  if (!win32) return
  const hwnd = Number(id)
  const rect: Partial<Rect> = {}
  if (!win32.GetWindowRect(hwnd, rect)) return
  const startX = rect.left ?? 0
  const startY = rect.top ?? 0
  dx = clamp(dx, config.maxNudgePx)
  dy = clamp(dy, config.maxNudgePx)

  const steps = 16
  for (let i = 1; i <= steps; i++) {
    const t = easeOut(i / steps)
    win32.SetWindowPos(
      hwnd,
      0,
      Math.round(startX + dx * t),
      Math.round(startY + dy * t),
      0,
      0,
      WIN32.SWP_NOSIZE | WIN32.SWP_NOZORDER | WIN32.SWP_NOACTIVATE,
    )
    await sleep(25)
  }
}

export function minimizeWindow(id: string): void {
  win32?.ShowWindow(Number(id), WIN32.SW_MINIMIZE)
}

/** How far her feet sink below the target window's top edge when she stands on it. */
const FEET_OVERLAP_PX = 40

/**
 * Where the overlay should stand to "peek" at a window: on its top edge towards the right
 * corner, feet on the title bar. When there is no room above, she leans in from the side
 * instead. The mover clamps the result to the work area, so this only needs to be sensible.
 */
export function peekTarget(target: WindowInfo, overlayW: number, overlayH: number): { x: number; y: number } {
  const { workArea } = screen.getDisplayMatching({ x: target.x, y: target.y, width: target.width, height: target.height })

  let x = target.x + target.width - overlayW * 0.7
  let y = target.y - overlayH + FEET_OVERLAP_PX

  if (y < workArea.y) {
    y = target.y + target.height / 2 - overlayH / 2
    x = target.x + target.width - overlayW * 0.35
    if (x + overlayW > workArea.x + workArea.width) x = target.x - overlayW * 0.65
  }
  return { x: Math.round(x), y: Math.round(y) }
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

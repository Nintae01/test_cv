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

/**
 * "Peek" = she walks over to a window. The overlay is moved next to its top edge;
 * the renderer handles the walking animation. Returns the overlay target or null.
 */
export function peekTarget(target: WindowInfo, overlayW: number, overlayH: number): { x: number; y: number } {
  return {
    x: Math.round(target.x + target.width - overlayW * 0.6),
    y: Math.round(target.y - overlayH * 0.85),
  }
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

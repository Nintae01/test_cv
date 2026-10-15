import { basename } from 'node:path'
import type { WindowInfo } from '@shared/types'
import { koffi, win32, WIN32 } from '../native/win32'

const IGNORED_TITLES = new Set(['Program Manager', 'Windows Input Experience', 'Settings'])

/** Every visible, titled, non-tool, non-cloaked top-level window. Empty on non-Windows. */
export function listWindows(selfPid: number): WindowInfo[] {
  if (!win32) return []
  const api = win32
  const foreground = api.GetForegroundWindow()
  const out: WindowInfo[] = []

  const cb = koffi.register((hwnd: number) => {
    const info = describe(hwnd, foreground, selfPid)
    if (info) out.push(info)
    return true // keep enumerating
  }, koffi.pointer(api.EnumWindowsProc))

  try {
    api.EnumWindows(cb, 0)
  } finally {
    koffi.unregister(cb)
  }
  return out
}

/** True when the foreground window covers the whole work area, i.e. a game or a video. */
export function isForegroundFullscreen(windows: WindowInfo[], screenW: number, screenH: number): boolean {
  const fg = windows.find((w) => w.foreground)
  if (!fg) return false
  return fg.width >= screenW && fg.height >= screenH && fg.process.toLowerCase() !== 'explorer.exe'
}

function describe(hwnd: number, foreground: number, selfPid: number): WindowInfo | null {
  const api = win32!
  if (!api.IsWindowVisible(hwnd) || api.IsIconic(hwnd)) return null
  if (api.GetWindowTextLengthW(hwnd) === 0) return null
  if (api.GetWindowLongPtrW(hwnd, WIN32.GWL_EXSTYLE) & WIN32.WS_EX_TOOLWINDOW) return null

  // UWP leaves invisible "cloaked" ghosts behind; DWM tells us which ones.
  const cloaked: [number] = [0]
  if (api.DwmGetWindowAttribute(hwnd, WIN32.DWMWA_CLOAKED, cloaked, 4) === 0 && cloaked[0] !== 0) return null

  const pid: [number] = [0]
  api.GetWindowThreadProcessId(hwnd, pid)
  if (pid[0] === selfPid) return null // that's us

  const title = readTitle(hwnd)
  if (!title || IGNORED_TITLES.has(title)) return null

  const rect: Partial<Rect> = {}
  if (!api.GetWindowRect(hwnd, rect)) return null
  const { left = 0, top = 0, right = 0, bottom = 0 } = rect

  return {
    id: String(hwnd),
    title,
    process: processName(pid[0]),
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    foreground: hwnd === foreground,
  }
}

type Rect = import('../native/win32').Rect

function readTitle(hwnd: number): string {
  const max = 512
  const buf = Buffer.alloc(max * 2)
  const len = win32!.GetWindowTextW(hwnd, buf, max)
  return buf.toString('utf16le', 0, len * 2).trim()
}

const processNameCache = new Map<number, string>()

function processName(pid: number): string {
  const cached = processNameCache.get(pid)
  if (cached) return cached
  const api = win32!
  const handle = api.OpenProcess(WIN32.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
  if (!handle) return 'unknown'
  try {
    const size: [number] = [1024]
    const buf = Buffer.alloc(size[0] * 2)
    if (!api.QueryFullProcessImageNameW(handle, 0, buf, size)) return 'unknown'
    const name = basename(buf.toString('utf16le', 0, size[0] * 2))
    processNameCache.set(pid, name)
    return name
  } finally {
    api.CloseHandle(handle)
  }
}

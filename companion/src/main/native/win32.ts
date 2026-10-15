/**
 * Thin FFI layer over user32 / kernel32 / dwmapi via koffi. Windows only: on any other
 * platform `win32` is null and every caller degrades to a no-op so the app still runs in dev.
 *
 * HWNDs are passed as intptr_t (plain JS numbers). Win64 guarantees window handles fit in
 * 32 significant bits, so this is safe and saves us from juggling opaque pointers.
 *
 * NOT YET EXERCISED ON A REAL WINDOWS BOX: the signatures follow the koffi docs, but expect
 * to spend an hour here the first time you run it.
 */
import koffi, { type TypeObject } from 'koffi'

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Win32Api {
  // Callback prototype used by EnumWindows.
  EnumWindowsProc: TypeObject
  /** `cb` is the handle returned by koffi.register(). */
  EnumWindows: (cb: bigint, lParam: number) => boolean
  IsWindowVisible: (hwnd: number) => boolean
  IsIconic: (hwnd: number) => boolean
  GetWindowTextLengthW: (hwnd: number) => number
  GetWindowTextW: (hwnd: number, buf: Buffer, max: number) => number
  GetWindowRect: (hwnd: number, out: Partial<Rect>) => boolean
  GetForegroundWindow: () => number
  GetWindowThreadProcessId: (hwnd: number, outPid: [number]) => number
  GetWindowLongPtrW: (hwnd: number, index: number) => number
  SetWindowPos: (hwnd: number, after: number, x: number, y: number, cx: number, cy: number, flags: number) => boolean
  ShowWindow: (hwnd: number, cmd: number) => boolean
  OpenProcess: (access: number, inherit: boolean, pid: number) => number
  QueryFullProcessImageNameW: (h: number, flags: number, buf: Buffer, inoutSize: [number]) => boolean
  CloseHandle: (h: number) => boolean
  DwmGetWindowAttribute: (hwnd: number, attr: number, out: [number], size: number) => number
  // --- used by hands/icons.ts to talk to Explorer's desktop ListView ---
  FindWindowW: (cls: string | null, title: string | null) => number
  FindWindowExW: (parent: number, after: number, cls: string | null, title: string | null) => number
  SendMessageW: (hwnd: number, msg: number, wParam: number, lParam: number) => number | bigint
  VirtualAllocEx: (h: number, addr: number, size: number, type: number, protect: number) => number | bigint
  VirtualFreeEx: (h: number, addr: number, size: number, type: number) => boolean
  ReadProcessMemory: (h: number, addr: number, buf: Buffer, size: number, outRead: [number]) => boolean
  WriteProcessMemory: (h: number, addr: number, buf: Buffer, size: number, outWritten: [number]) => boolean
}

export const WIN32 = {
  GWL_EXSTYLE: -20,
  WS_EX_TOOLWINDOW: 0x80,
  DWMWA_CLOAKED: 14,
  PROCESS_QUERY_LIMITED_INFORMATION: 0x1000,
  SW_MINIMIZE: 6,
  SW_RESTORE: 9,
  SWP_NOSIZE: 0x1,
  SWP_NOZORDER: 0x4,
  SWP_NOACTIVATE: 0x10,
  GWL_STYLE: -16,
  LVS_AUTOARRANGE: 0x0100,
  /** PROCESS_VM_OPERATION | PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_QUERY_INFORMATION */
  PROCESS_VM_ACCESS: 0x8 | 0x10 | 0x20 | 0x400,
  MEM_COMMIT_RESERVE: 0x3000,
  MEM_RELEASE: 0x8000,
  PAGE_READWRITE: 0x4,
} as const

/** koffi hands back 64-bit values as numbers when they fit (user-mode addresses always do). */
export const toNumber = (v: number | bigint): number => Number(v)

function build(): Win32Api {
  const user32 = koffi.load('user32.dll')
  const kernel32 = koffi.load('kernel32.dll')
  const dwmapi = koffi.load('dwmapi.dll')

  koffi.struct('RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' })
  const EnumWindowsProc = koffi.proto('bool __stdcall EnumWindowsProc(intptr_t hwnd, intptr_t lParam)')

  return {
    EnumWindowsProc,
    EnumWindows: user32.func('bool __stdcall EnumWindows(EnumWindowsProc *cb, intptr_t lParam)'),
    IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(intptr_t hwnd)'),
    IsIconic: user32.func('bool __stdcall IsIconic(intptr_t hwnd)'),
    GetWindowTextLengthW: user32.func('int __stdcall GetWindowTextLengthW(intptr_t hwnd)'),
    GetWindowTextW: user32.func('int __stdcall GetWindowTextW(intptr_t hwnd, _Out_ char16_t *buf, int max)'),
    GetWindowRect: user32.func('bool __stdcall GetWindowRect(intptr_t hwnd, _Out_ RECT *rect)'),
    GetForegroundWindow: user32.func('intptr_t __stdcall GetForegroundWindow()'),
    GetWindowThreadProcessId: user32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, _Out_ uint32_t *pid)'),
    GetWindowLongPtrW: user32.func('intptr_t __stdcall GetWindowLongPtrW(intptr_t hwnd, int index)'),
    SetWindowPos: user32.func('bool __stdcall SetWindowPos(intptr_t hwnd, intptr_t after, int x, int y, int cx, int cy, uint32_t flags)'),
    ShowWindow: user32.func('bool __stdcall ShowWindow(intptr_t hwnd, int cmd)'),
    OpenProcess: kernel32.func('intptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
    QueryFullProcessImageNameW: kernel32.func('bool __stdcall QueryFullProcessImageNameW(intptr_t h, uint32_t flags, _Out_ char16_t *buf, _Inout_ uint32_t *size)'),
    CloseHandle: kernel32.func('bool __stdcall CloseHandle(intptr_t h)'),
    DwmGetWindowAttribute: dwmapi.func('int32_t __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32_t attr, _Out_ uint32_t *value, uint32_t size)'),
    FindWindowW: user32.func('intptr_t __stdcall FindWindowW(str16 cls, str16 title)'),
    FindWindowExW: user32.func('intptr_t __stdcall FindWindowExW(intptr_t parent, intptr_t after, str16 cls, str16 title)'),
    SendMessageW: user32.func('intptr_t __stdcall SendMessageW(intptr_t hwnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'),
    VirtualAllocEx: kernel32.func('intptr_t __stdcall VirtualAllocEx(intptr_t h, intptr_t addr, size_t size, uint32_t type, uint32_t protect)'),
    VirtualFreeEx: kernel32.func('bool __stdcall VirtualFreeEx(intptr_t h, intptr_t addr, size_t size, uint32_t type)'),
    ReadProcessMemory: kernel32.func('bool __stdcall ReadProcessMemory(intptr_t h, intptr_t addr, void *buf, size_t size, _Out_ size_t *read)'),
    WriteProcessMemory: kernel32.func('bool __stdcall WriteProcessMemory(intptr_t h, intptr_t addr, const void *buf, size_t size, _Out_ size_t *written)'),
  }
}

export const win32: Win32Api | null = process.platform === 'win32' ? build() : null
export { koffi }

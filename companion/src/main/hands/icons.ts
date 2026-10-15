/**
 * Desktop icon shoving.
 *
 * Explorer draws the desktop with an ordinary ListView control. There is no API for icon
 * positions, so we talk to that control with window messages, the way Explorer itself does:
 *
 *   1. Find it: "Progman" -> "SHELLDLL_DefView" -> "SysListView32". With a wallpaper
 *      slideshow (and on some Win11 builds) the DefView lives under a top-level "WorkerW".
 *   2. LVM_SETITEMPOSITION takes x/y packed into lParam, so it works across processes.
 *   3. LVM_GETITEMPOSITION and LVM_GETITEMTEXT want pointers *inside explorer.exe*, so we
 *      rent a page of memory there (VirtualAllocEx) and copy things in and out.
 *   4. Explorer's "Auto arrange" snaps everything back; "Align to grid" snaps to cells. We
 *      refuse to move anything under auto arrange and always move in whole grid cells.
 *   5. Everything we touch is remembered and put back on quit (and on next start, if the
 *      previous run died before it could).
 *
 * This is the most fragile part of the whole app: it relies on Explorer internals, not an
 * API. Every public function here degrades to a no-op when anything is off.
 *
 * NOT YET EXERCISED ON A REAL WINDOWS BOX.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { toNumber, win32, WIN32, type Rect } from '../native/win32'

export interface DesktopIcon {
  index: number
  name: string
  /** Position in the ListView's own coordinates (what the messages use). */
  x: number
  y: number
  /** Position on screen. */
  screenX: number
  screenY: number
  /** Icon grid spacing. */
  cellW: number
  cellH: number
}

const LVM = {
  GETITEMCOUNT: 0x1004,
  SETITEMPOSITION: 0x100f,
  GETITEMPOSITION: 0x1010,
  GETITEMSPACING: 0x1033,
  GETITEMTEXTW: 0x1073,
} as const
const LVIF_TEXT = 0x1

/**
 * Remote scratch page layout. LVITEMW is 88 bytes on x64 (we write it by hand so there is
 * no struct-packing guesswork); then a POINT; then the text buffer.
 */
const LVITEM_SIZE = 88
const POINT_OFFSET = 96
const TEXT_OFFSET = 128
const TEXT_CHARS = 260
const SCRATCH_SIZE = 4096

const LAYOUT_FILE = 'desktop-icons.json'
type Layout = Record<string, { x: number; y: number }>

let layoutDir: string | null = null
let original: Layout | null = null

// --- public API ------------------------------------------------------------------------

/** Call once at startup. If a previous run left icons moved, this puts them back. */
export function initIconLayout(dir: string): void {
  layoutDir = dir
  const file = join(dir, LAYOUT_FILE)
  if (!existsSync(file)) return
  try {
    original = JSON.parse(readFileSync(file, 'utf8')) as Layout
    restoreIcons()
  } catch {
    original = null
  }
}

/** True when we can reach the desktop ListView and Explorer is not auto-arranging it. */
export function iconsMovable(): boolean {
  const list = findDesktopListView()
  return list !== 0 && !autoArrangeOn(list)
}

/** Every icon on the desktop, with name and position. Empty when unavailable. */
export function listDesktopIcons(): DesktopIcon[] {
  if (!win32 || process.arch === 'ia32') return []
  const list = findDesktopListView()
  if (!list) return []

  const count = toNumber(win32.SendMessageW(list, LVM.GETITEMCOUNT, 0, 0))
  if (count <= 0) return []

  const rect: Partial<Rect> = {}
  win32.GetWindowRect(list, rect)
  const originX = rect.left ?? 0
  const originY = rect.top ?? 0
  const { cellW, cellH } = iconSpacing(list)

  const scratch = RemoteScratch.open(list)
  if (!scratch) return []
  try {
    const icons: DesktopIcon[] = []
    for (let i = 0; i < count; i++) {
      // Position: Explorer writes a POINT into our remote page, we read it back.
      win32.SendMessageW(list, LVM.GETITEMPOSITION, i, scratch.addr + POINT_OFFSET)
      const pt = scratch.read(POINT_OFFSET, 8)
      const x = pt.readInt32LE(0)
      const y = pt.readInt32LE(4)

      // Name: an LVITEMW pointing at a remote text buffer.
      scratch.write(0, buildLvItem(i, scratch.addr + TEXT_OFFSET))
      const len = toNumber(win32.SendMessageW(list, LVM.GETITEMTEXTW, i, scratch.addr))
      const name = len > 0 ? scratch.read(TEXT_OFFSET, Math.min(len, TEXT_CHARS) * 2).toString('utf16le') : `icon ${i}`

      icons.push({ index: i, name, x, y, screenX: originX + x, screenY: originY + y, cellW, cellH })
    }
    return icons
  } finally {
    scratch.close()
  }
}

/** Move one icon by whole grid cells. Remembers the original layout the first time. */
export function nudgeIcon(index: number, dxCells: number, dyCells: number): boolean {
  if (!win32) return false
  const list = findDesktopListView()
  if (!list || autoArrangeOn(list)) return false

  const icons = listDesktopIcons()
  const icon = icons[index]
  if (!icon) return false

  rememberOriginal(icons)
  return setIconPosition(list, index, icon.x + dxCells * icon.cellW, icon.y + dyCells * icon.cellH)
}

/** Put every icon we moved back where it was. Safe to call any time. */
export function restoreIcons(): void {
  if (!original || !win32) return
  const list = findDesktopListView()
  if (list) {
    for (const icon of listDesktopIcons()) {
      const home = original[icon.name]
      if (home && (home.x !== icon.x || home.y !== icon.y)) setIconPosition(list, icon.index, home.x, home.y)
    }
  }
  original = null
  if (layoutDir) {
    try {
      unlinkSync(join(layoutDir, LAYOUT_FILE))
    } catch {
      /* already gone */
    }
  }
}

// --- internals -------------------------------------------------------------------------

function findDesktopListView(): number {
  if (!win32) return 0
  const progman = win32.FindWindowW('Progman', null)
  let defView = progman ? win32.FindWindowExW(progman, 0, 'SHELLDLL_DefView', null) : 0

  if (!defView) {
    // Walk the top-level WorkerW windows until one has the DefView.
    let worker = 0
    while ((worker = win32.FindWindowExW(0, worker, 'WorkerW', null)) !== 0) {
      defView = win32.FindWindowExW(worker, 0, 'SHELLDLL_DefView', null)
      if (defView) break
    }
  }
  return defView ? win32.FindWindowExW(defView, 0, 'SysListView32', null) : 0
}

function autoArrangeOn(list: number): boolean {
  const style = toNumber(win32!.GetWindowLongPtrW(list, WIN32.GWL_STYLE))
  return (style & WIN32.LVS_AUTOARRANGE) !== 0
}

function iconSpacing(list: number): { cellW: number; cellH: number } {
  const packed = toNumber(win32!.SendMessageW(list, LVM.GETITEMSPACING, 0, 0))
  const cellW = packed & 0xffff
  const cellH = (packed >>> 16) & 0xffff
  return { cellW: cellW || 75, cellH: cellH || 75 }
}

function setIconPosition(list: number, index: number, x: number, y: number): boolean {
  // MAKELPARAM(x, y): both as 16-bit values, which covers any sane desktop.
  const lParam = (((y & 0xffff) << 16) | (x & 0xffff)) >>> 0
  return toNumber(win32!.SendMessageW(list, LVM.SETITEMPOSITION, index, lParam)) !== 0
}

/** LVITEMW for LVM_GETITEMTEXT, laid out by hand for x64. */
function buildLvItem(index: number, remoteTextAddr: number): Buffer {
  const b = Buffer.alloc(LVITEM_SIZE)
  b.writeUInt32LE(LVIF_TEXT, 0) // mask
  b.writeInt32LE(index, 4) // iItem
  b.writeInt32LE(0, 8) // iSubItem
  // state (12), stateMask (16), padding (20)
  b.writeBigUInt64LE(BigInt(remoteTextAddr), 24) // pszText
  b.writeInt32LE(TEXT_CHARS, 32) // cchTextMax
  // iImage (36), lParam (40), iIndent (48), iGroupId (52), cColumns (56), pad, puColumns (64), piColFmt (72), iGroup (80)
  return b
}

function rememberOriginal(icons: DesktopIcon[]): void {
  if (original || !layoutDir) return
  original = Object.fromEntries(icons.map((i) => [i.name, { x: i.x, y: i.y }]))
  try {
    writeFileSync(join(layoutDir, LAYOUT_FILE), JSON.stringify(original))
  } catch (err) {
    console.warn('[icons] could not persist original layout', err)
  }
}

/** A page of memory inside explorer.exe that we can hand to ListView messages. */
class RemoteScratch {
  private constructor(
    private readonly process: number,
    readonly addr: number,
  ) {}

  static open(list: number): RemoteScratch | null {
    const api = win32!
    const pid: [number] = [0]
    api.GetWindowThreadProcessId(list, pid)
    const handle = api.OpenProcess(WIN32.PROCESS_VM_ACCESS, false, pid[0])
    if (!handle) return null
    const addr = toNumber(api.VirtualAllocEx(handle, 0, SCRATCH_SIZE, WIN32.MEM_COMMIT_RESERVE, WIN32.PAGE_READWRITE))
    if (!addr) {
      api.CloseHandle(handle)
      return null
    }
    return new RemoteScratch(handle, addr)
  }

  write(offset: number, data: Buffer): void {
    const written: [number] = [0]
    win32!.WriteProcessMemory(this.process, this.addr + offset, data, data.length, written)
  }

  read(offset: number, length: number): Buffer {
    const buf = Buffer.alloc(length)
    const read: [number] = [0]
    win32!.ReadProcessMemory(this.process, this.addr + offset, buf, length, read)
    return buf
  }

  close(): void {
    win32!.VirtualFreeEx(this.process, this.addr, 0, WIN32.MEM_RELEASE)
    win32!.CloseHandle(this.process)
  }
}

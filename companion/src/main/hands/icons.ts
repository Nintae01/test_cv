/**
 * Desktop icon shenanigans. Deliberately a stub.
 *
 * How it works on Windows, when you get to it:
 *   1. FindWindow("Progman") -> child "SHELLDLL_DefView" -> child "SysListView32". When a
 *      wallpaper slideshow is active the DefView lives under a "WorkerW" window instead.
 *   2. Icons are items of that ListView. LVM_GETITEMCOUNT (0x1004) gives the count.
 *   3. LVM_SETITEMPOSITION (0x100F) takes x/y packed into lParam, so it works cross-process.
 *   4. LVM_GETITEMPOSITION (0x1010) needs a POINT* inside explorer.exe: VirtualAllocEx +
 *      ReadProcessMemory. Same dance for LVM_GETITEMTEXT if you want icon names.
 *   5. "Auto arrange" must be off or Explorer snaps everything back.
 *   6. Remember original positions and put them back on exit. People get grumpy otherwise.
 *
 * It is the most fragile part of the whole idea (Explorer internals, not an API), so it is
 * last on the list.
 */
export function moveIcon(_index: number, _x: number, _y: number): void {
  throw new Error('moveIcon: not implemented yet, see comments in hands/icons.ts')
}

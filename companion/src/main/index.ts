import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import type { RendererConfig, SpeakPayload, WindowInfo } from '@shared/types'
import { Memory } from './brain/memory'
import { loadPersona } from './brain/persona'
import { config, resourcePath } from './config'
import { initIconLayout, restoreIcons } from './hands/icons'
import { OverlayPhysics } from './physics'
import { Scheduler } from './scheduler'
import { isForegroundFullscreen, listWindows } from './senses/windows'

const OVERLAY = { width: 420, height: 620 }

let win: BrowserWindow | null = null
let tray: Tray | null = null
let physics: OverlayPhysics | null = null
let scheduler: Scheduler | null = null
let muted = false

function createOverlay(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()
  const overlay = new BrowserWindow({
    ...OVERLAY,
    x: workArea.x + workArea.width - OVERLAY.width,
    y: workArea.y + workArea.height - OVERLAY.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: config.name,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  // Click-through by default; the renderer turns this off while the cursor is over her.
  overlay.setIgnoreMouseEvents(true, { forward: true })

  if (process.env.ELECTRON_RENDERER_URL) overlay.loadURL(process.env.ELECTRON_RENDERER_URL)
  else overlay.loadFile(join(__dirname, '../renderer/index.html'))

  return overlay
}

function createTray(): Tray {
  const icon = nativeImage.createFromPath(resourcePath('resources', 'tray.png'))
  const t = new Tray(icon)
  t.setToolTip(config.name)
  t.setContextMenu(
    Menu.buildFromTemplate([
      { label: config.name, enabled: false },
      { type: 'separator' },
      { label: 'Mute', type: 'checkbox', checked: muted, click: (item) => (muted = item.checked) },
      { label: 'Poke', click: () => scheduler?.poke() },
      { label: 'Put my icons back', click: () => restoreIcons() },
      { label: 'Draw sword (test)', type: 'checkbox', click: (item) => physics?.gesture('summon', item.checked) },
      { label: 'Toggle DevTools', click: () => win?.webContents.toggleDevTools() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  )
  return t
}

function wireIpc(): void {
  ipcMain.handle('get-config', (): RendererConfig => ({ name: config.name, modelUrl: config.live2dModelUrl }))
  ipcMain.on('set-ignore-mouse', (_e, ignore: boolean) => win?.setIgnoreMouseEvents(ignore, { forward: true }))
  ipcMain.on('move-window-by', (_e, dx: number, dy: number) => {
    if (!win || !physics) return
    physics.hold() // the user grabbed her; whatever she was doing can wait
    const [x, y] = win.getPosition()
    physics.moveTo(x + Math.round(dx), y + Math.round(dy))
  })
  ipcMain.on('drag-end', () => physics?.release()) // gravity decides where she ends up
  ipcMain.on('poke', () => scheduler?.poke())
  ipcMain.on('quit', () => app.quit())
}

/** Hide while a fullscreen app has focus (games, videos). Checked every couple of seconds. */
function watchFullscreen(): void {
  setInterval(() => {
    if (!win) return
    const { size } = screen.getPrimaryDisplay()
    const fullscreen = isForegroundFullscreen(listWindows(process.pid), size.width, size.height)
    if (fullscreen && win.isVisible()) win.hide()
    else if (!fullscreen && !win.isVisible()) win.showInactive()
  }, 2_000)
}

/** Forward the global cursor so her eyes follow it anywhere on screen, not just over the overlay. */
function trackCursor(): void {
  setInterval(() => {
    if (!win || !win.isVisible()) return
    const cursor = screen.getCursorScreenPoint()
    const [x, y] = win.getPosition()
    win.webContents.send('cursor', cursor.x - x, cursor.y - y)
  }, 1000 / config.cursorTrackHz)
}

app.whenReady().then(() => {
  wireIpc()
  initIconLayout(app.getPath('userData'))
  win = createOverlay()
  tray = createTray()
  physics = new OverlayPhysics(win)
  physics.start()

  const host = {
    speak(payload: SpeakPayload) {
      if (muted) payload = { ...payload, audioDataUrl: undefined }
      win?.webContents.send('speak', payload)
    },
    async peekWindow(target: WindowInfo) {
      if (!physics) return
      const ledge = physics.ledgeOf(target.id)
      if (ledge) {
        // Sit near the right end of the uncovered stretch, legs over the front of the window.
        const x = Math.max(ledge.x0 + 60, Math.min(ledge.x1 - 70, ledge.x1 - 90))
        await physics.goTo({ x, y: ledge.y }, { sit: true })
      } else {
        const floor = physics.floor()
        await physics.goTo({ x: target.x + target.width / 2, y: floor.y })
      }
      setTimeout(() => void physics?.goTo({ x: homeX, y: physics.floor().y }), config.peekLingerMs)
    },
    standUnder: (x: number) => physics?.goTo({ x, y: physics.floor().y }) ?? Promise.resolve(),
    gesture: (name: 'summon', active: boolean) => physics?.gesture(name, active),
  }
  const homeX = win.getPosition()[0] + OVERLAY.width / 2

  scheduler = new Scheduler(host, loadPersona(), new Memory(app.getPath('userData')))
  scheduler.start()
  watchFullscreen()
  trackCursor()
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  scheduler?.stop()
  restoreIcons()
  physics?.stop()
  tray?.destroy()
})

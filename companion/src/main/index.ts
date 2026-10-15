import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import type { RendererConfig, SpeakPayload } from '@shared/types'
import { Memory } from './brain/memory'
import { loadPersona } from './brain/persona'
import { config, resourcePath } from './config'
import { Scheduler } from './scheduler'
import { isForegroundFullscreen, listWindows } from './senses/windows'

const OVERLAY = { width: 420, height: 620 }

let win: BrowserWindow | null = null
let tray: Tray | null = null
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
    if (!win) return
    const [x, y] = win.getPosition()
    win.setPosition(x + Math.round(dx), y + Math.round(dy))
  })
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

app.whenReady().then(() => {
  wireIpc()
  win = createOverlay()
  tray = createTray()

  const host = {
    speak(payload: SpeakPayload) {
      if (muted) payload = { ...payload, audioDataUrl: undefined }
      win?.webContents.send('speak', payload)
    },
    moveOverlayTo(x: number, y: number) {
      win?.setPosition(x, y, true)
    },
    overlaySize() {
      return OVERLAY
    },
  }

  scheduler = new Scheduler(host, loadPersona(), new Memory(app.getPath('userData')))
  scheduler.start()
  watchFullscreen()
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  scheduler?.stop()
  tray?.destroy()
})

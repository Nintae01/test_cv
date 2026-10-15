import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { CompanionApi, Expression, RendererConfig, SpeakPayload } from '@shared/types'

const api: CompanionApi = {
  getConfig: () => ipcRenderer.invoke('get-config') as Promise<RendererConfig>,

  onSpeak(cb) {
    const handler = (_e: IpcRendererEvent, payload: SpeakPayload) => cb(payload)
    ipcRenderer.on('speak', handler)
    return () => ipcRenderer.off('speak', handler)
  },

  onExpression(cb) {
    const handler = (_e: IpcRendererEvent, expression: Expression) => cb(expression)
    ipcRenderer.on('expression', handler)
    return () => ipcRenderer.off('expression', handler)
  },

  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  moveWindowBy: (dx, dy) => ipcRenderer.send('move-window-by', dx, dy),
  poke: () => ipcRenderer.send('poke'),
  quit: () => ipcRenderer.send('quit'),
}

contextBridge.exposeInMainWorld('companion', api)

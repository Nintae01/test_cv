import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { CompanionApi, Expression, GestureEvent, MotionEvent, RendererConfig, SpeakPayload } from '@shared/types'

function subscribe<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...(args as T))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

const api: CompanionApi = {
  getConfig: () => ipcRenderer.invoke('get-config') as Promise<RendererConfig>,

  onSpeak: (cb) => subscribe<[SpeakPayload]>('speak', cb),
  onExpression: (cb) => subscribe<[Expression]>('expression', cb),
  onMotion: (cb) => subscribe<[MotionEvent]>('motion', cb),
  onGesture: (cb) => subscribe<[GestureEvent]>('gesture', cb),
  onCursor: (cb) => subscribe<[number, number]>('cursor', cb),

  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  moveWindowBy: (dx, dy) => ipcRenderer.send('move-window-by', dx, dy),
  dragEnd: () => ipcRenderer.send('drag-end'),
  poke: () => ipcRenderer.send('poke'),
  quit: () => ipcRenderer.send('quit'),
}

contextBridge.exposeInMainWorld('companion', api)

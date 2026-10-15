import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// `@shared` holds the types that cross the IPC boundary (main <-> renderer).
const alias = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], resolve: { alias } },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias } },
  renderer: { resolve: { alias } },
})

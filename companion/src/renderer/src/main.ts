import { Bubble } from './bubble'
import { Character } from './character'

const api = window.companion

async function boot(): Promise<void> {
  const cfg = await api.getConfig()
  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const character = new Character(canvas)
  const bubble = new Bubble(document.getElementById('bubble')!)

  await character.load(cfg.modelUrl)

  // --- click-through management ------------------------------------------------------
  // The overlay ignores the mouse by default (forward: true still delivers mousemove), so
  // we re-enable input only while the cursor is actually on her.
  let ignoring = true
  document.addEventListener('mousemove', (e) => {
    if (dragging) return
    const over = character.hitTest(e.clientX, e.clientY)
    if (over === ignoring) {
      ignoring = !over
      api.setIgnoreMouse(ignoring)
    }
  })

  // --- drag her around, click = poke ---------------------------------------------------
  let dragging = false
  let moved = false
  let last = { x: 0, y: 0 }
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !character.hitTest(e.clientX, e.clientY)) return
    dragging = true
    moved = false
    last = { x: e.screenX, y: e.screenY }
  })
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const dx = e.screenX - last.x
    const dy = e.screenY - last.y
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true
    last = { x: e.screenX, y: e.screenY }
    api.moveWindowBy(dx, dy)
  })
  window.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    if (moved) api.dragEnd()
    else api.poke()
  })

  // --- being alive ---------------------------------------------------------------------
  api.onCursor((x, y) => character.lookAt(x, y))
  api.onWalk((event) => character.onWalk(event))

  // --- speaking ------------------------------------------------------------------------
  api.onSpeak(async (payload) => {
    character.setExpression(payload.expression)
    bubble.show(payload.line, payload.style)
    await character.speak(payload.audioDataUrl, payload.expression)
  })
  api.onExpression((expression) => character.setExpression(expression))

  // Open the overlay with ?debug (or from the preview harness) to poke at her from DevTools:
  // window.__debug.character.playExpressionRaw('F05'), .expressionNames(), .onWalk({...}) ...
  if (window.location.search.includes('debug')) {
    ;(window as unknown as { __debug: unknown }).__debug = { character, bubble }
  }

  console.info(`[${cfg.name}] ready`)
}

void boot()

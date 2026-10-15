# Companion

An AI-powered Live2D anime character that lives on your Windows desktop. She sees which
windows are open and which one has focus, watches CPU/GPU load and temperatures, comments,
teases, whispers, and occasionally shoves a window around for fun.

**Status: skeleton.** The structure, IPC, brain loop, prompt, and Live2D rendering are in
place and type-check. The Win32 layer has not yet been exercised on a real Windows machine.

## How it works

```
 ┌─ Electron main process ──────────────────────────────────────────────┐
 │                                                                       │
 │  senses/           scheduler.ts            brain/        voice/       │
 │  windows.ts  ──┐   every 5s:               client.ts     tts.ts       │
 │  system.ts   ──┼─► snapshot ─► diff ─►  ─► Claude   ─►  ElevenLabs   │
 │  temps.ts    ──┘   cooldowns, idle chatter  (JSON out)   (mp3)        │
 │                          │                                   │        │
 │                          ▼ actions                           ▼ speak  │
 │                    hands/windowControl.ts        IPC ──────────────┐  │
 └────────────────────────────────────────────────────────────────────┼──┘
                                                                      ▼
 ┌─ Renderer (transparent always-on-top overlay) ───────────────────────┐
 │  character.ts  Live2D model (pixi-live2d-display) + lip sync         │
 │  bubble.ts     speech bubble                                         │
 │  main.ts       hover → click-through toggle, drag, poke              │
 └──────────────────────────────────────────────────────────────────────┘
```

| Piece | Where | Notes |
|---|---|---|
| Overlay window | `src/main/index.ts` | Transparent, frameless, click-through except over her. Hides during fullscreen apps. |
| Window list, foreground, geometry | `src/main/senses/windows.ts`, `native/win32.ts` | user32 via koffi FFI, no compile step. |
| CPU / RAM / GPU | `src/main/senses/system.ts` | systeminformation. |
| Temperatures | `src/main/senses/temps.ts` | Reads LibreHardwareMonitor's JSON endpoint. |
| Heartbeat and anti-annoyance | `src/main/scheduler.ts` | Event diffing, 45 s floor between lines, idle chatter. |
| Brain | `src/main/brain/` | Claude with structured JSON output. Persona in `persona.md`. |
| Memory | `src/main/brain/memory.ts` | Last 60 lines she said, so she doesn't repeat. |
| Shoving / minimising windows | `src/main/hands/windowControl.ts` | Animated SetWindowPos, clamped to 200 px. |
| Desktop icons | `src/main/hands/icons.ts` | Stub with a how-to. Fragile Explorer internals, do last. |
| Voice | `src/main/voice/tts.ts` | ElevenLabs v3, `[whispers]` tags for whisper mode. Optional. |
| Character | `src/renderer/src/character.ts` | Live2D + lip sync, placeholder blob when no model. |

## Setup

Requirements: Windows 10/11, Node 22.

```bash
cd companion
npm install
cp .env.example .env         # then fill in ANTHROPIC_API_KEY (and ElevenLabs if you want voice)
```

1. **Live2D runtime** – download the Cubism SDK for Web from live2d.com and copy
   `Core/live2dcubismcore.min.js` into `src/renderer/public/`. See `src/renderer/public/README.md`.
2. **A model** – drop a `.model3.json` model folder under `src/renderer/public/model/` and point
   `LIVE2D_MODEL_URL` at it. The SDK ships free samples. Then fill `EXPRESSION_MAP` in
   `character.ts` with the expression names your model actually has.
3. **Temps (optional)** – run LibreHardwareMonitor, enable *Options → Remote Web Server*.
   Without it you still get CPU/RAM/GPU load, just no CPU temperature.
4. **Voice (optional)** – set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. Without them
   she talks in speech bubbles only.

```bash
npm run dev          # launches the overlay with hot reload
npm run typecheck
npm run build        # bundles to out/
```

Right-click the pink tray icon for Mute, Poke, DevTools, Quit. Drag her by clicking and
holding. A click without dragging pokes her, which forces an immediate reaction.

## Tuning

Everything that controls how chatty she is lives in `src/main/config.ts`: tick interval,
minimum silence between lines, idle-chatter delay and probability, CPU/temperature
thresholds. Her personality is `persona.md`; the hard output rules she must follow are
appended in `src/main/brain/persona.ts`.

## Costs

One brain call per event (window switch, something opened or closed, temp spike, poke) or
occasional idle chatter, never more than one per 45 s. The persona is sent as a cached
prefix. Expect a few hundred to a couple thousand calls on a heavy desk day.

## Roadmap

- [ ] First run on real Windows: fix whatever koffi signatures need fixing.
- [ ] Walk animation for `peek_at_window` instead of a window teleport.
- [ ] Desktop icon pushing (`hands/icons.ts`).
- [ ] Voice input (local Whisper) so you can talk back.
- [ ] Screenshot-to-vision for deeper awareness, behind an explicit opt-in.
- [ ] Packaging and code signing (electron-builder).

## Why Windows

All the "plays with your desktop" parts are Win32 calls with stable public APIs. On Linux the
same tricks work only under X11; Wayland forbids apps from positioning or moving other
windows at all, and no desktop environment exposes icon positions. Temps are actually
easier on Linux, but that is the only part.

# Companion

An AI-powered Live2D anime character that lives on your Windows desktop. She sees which
windows are open and which one has focus, watches CPU/GPU load and temperatures, comments,
teases, whispers, and occasionally shoves a window around for fun.

**Status: skeleton, animated, rendered.** The structure, IPC, brain loop, prompt, Live2D
rendering, walk cycle, fidgets, eye tracking and desktop-icon shoving are in place and
type-check. The renderer has been exercised headless with the Hiyori sample model (it
draws, speaks in bubbles, mirrors and leans for the walk). The Win32 layer has not yet been
exercised on a real Windows machine.

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
| Walking across the screen | `src/main/mover.ts` | Moves the overlay at walking pace, eased, clamped to the work area. Peeks end with a walk home. |
| Desktop icons | `src/main/hands/icons.ts` | Reads names and positions from Explorer's desktop ListView, knocks an icon a grid cell or two, restores everything on quit (and on next start after a crash). Fragile by nature. |
| Voice | `src/main/voice/tts.ts` | ElevenLabs v3, `[whispers]` tags for whisper mode. Optional. |
| Character | `src/renderer/src/character.ts` | Live2D + lip sync, walk cycle, facing, fidgets, cursor tracking. Placeholder blob when no model. |

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
   `LIVE2D_MODEL_URL` at it. The SDK ships free samples. The default expects the scarlet-haired
   Haru described under *The character* below.
3. **Expressions** – put an `expressions.json` next to the model mapping her moods to the
   model's expression names, e.g. `{ "neutral": "F01", "happy": "F02", ... }`. Missing keys
   simply mean no face change for that mood. Open the overlay with `?debug` and call
   `window.__debug.character.expressionNames()` / `.playExpressionRaw('F05')` from DevTools to
   find out which is which.
4. **Temps (optional)** – run LibreHardwareMonitor, enable *Options → Remote Web Server*.
   Without it you still get CPU/RAM/GPU load, just no CPU temperature.
5. **Voice (optional)** – set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. Without them
   she talks in speech bubbles only.

```bash
npm run dev          # launches the overlay with hot reload
npm run typecheck
npm run build        # bundles to out/
```

Right-click the pink tray icon for Mute, Poke, DevTools, Quit. Drag her by clicking and
holding. A click without dragging pokes her, which forces an immediate reaction.

## The character

Live2D models are illustrated and rigged by hand, so a truly custom look means commissioning
one (nizima, Booth, or an artist directly) or rigging your own in Cubism Editor. What the repo
does instead, for free: it takes the adult sample model **Haru** from the SDK and recolors her
hair with `scripts/recolor-hair.py`, which repaints whole atlas pieces inside given boxes while
keeping the original shading.

```bash
# Haru lives in the Cubism SDK for Web under Samples/Resources/Haru. Copy it to
# src/renderer/public/model/haru/, then:
python3 scripts/recolor-hair.py src/renderer/public/model/haru src/renderer/public/model/haru-scarlet \
  --hue 352 --sat 215 \
  --region texture_00.png:735,25,1155,420 --region texture_00.png:650,400,1210,1060 \
  --region texture_00.png:650,1000,835,1345 --region texture_00.png:1040,1000,1205,1335 \
  --region texture_01.png:1690,1560,2048,2048
```

Then drop this `expressions.json` next to it (verified by rendering each of Haru's eight
expressions):

```json
{ "neutral": "F01", "happy": "F02", "smug": "F08", "surprised": "F06", "sleepy": "F05", "annoyed": "F03" }
```

`--hue` takes any angle, so the same command makes her blonde (45), blue (215) or green (130).
The sample models are free for personal use under Live2D's terms; check them before
redistributing a recolored copy.

### 2D or 3D?

If you want a specific look without hiring an illustrator, a 3D VRM avatar is the easier
road: VRoid Studio (free) lets you build an adult character with any hair colour and outfit in
an afternoon, VRM has standard expression and viseme names so expression mapping disappears,
and walk/gesture animations can be retargeted from stock clips instead of being drawn per
model. The cost is the look: cel-shaded 3D instead of an illustration. The main process and
brain do not care which renderer is used; swapping `character.ts` for a three.js + three-vrm
implementation is the only change.

## How she stays alive

- **From the model itself**: idle motions, breathing, blinking. Any Cubism 4 model has these.
- **Eyes follow your cursor** anywhere on screen. The main process forwards the global cursor
  position; the renderer feeds it to the model's focus controller.
- **Fidgets**: every 25 to 70 seconds she plays a random non-idle motion from whatever groups
  your model has (tap reactions, flicks, and so on).
- **Walking**: when the brain picks `peek_at_window`, the main process slides the overlay to the
  window's top-right corner at a fixed pace. The renderer mirrors her to face the way she is
  going, bobs her with each stride, leans her forward, sways the hips and counter-tilts the head
  by driving the standard Cubism parameters (`ParamBodyAngleX/Z`, `ParamAngleX/Z`) right before
  the core updates, so physics (hair, skirt) still reacts to it. On arrival she plays a small
  reaction motion, lingers, and walks home. Dragging her mid-walk cancels it and sets a new home.
- **Real walk cycle**: if your model has one, name its motion group `Walk` and it plays over the
  procedural pose. The reaction-on-arrival group names are in `character.ts` too.

## Icon shoving, and why it is the fragile bit

Explorer draws the desktop with a plain ListView control and offers no API for icon
positions, so `hands/icons.ts` talks to that control with window messages the way Explorer
itself does. Reading positions and names needs memory *inside explorer.exe*, so the module
rents a page there and copies structures in and out. It refuses to move anything while
"Auto arrange icons" is on, moves in whole grid cells so "Align to grid" stays happy, and
writes the original layout to the user-data folder so it can put every icon back on quit or
on the next start. Any Windows update that changes the desktop control turns all of this
into a no-op rather than a crash. The tray menu has "Put my icons back" for peace of mind.

## Gotchas already handled

- **Pixi and the Content Security Policy.** Pixi builds shader code with `new Function`,
  which the renderer's CSP blocks. `@pixi/unsafe-eval` is imported in `character.ts` to swap
  in a static implementation. Without it nothing draws and the console says so quietly.
- **Older Cubism Core builds** lack `Memory.initializeAmountOfMemory`, which the framework
  calls unconditionally; `character.ts` shims it. The current SDK core needs no shim.
- **Model file names are case-sensitive on the web side.** The SDK sample is
  `Hiyori.model3.json`, capital H.

## Tuning

Everything that controls how chatty she is lives in `src/main/config.ts`: tick interval,
minimum silence between lines, idle-chatter delay and probability, CPU/temperature
thresholds, walking speed, how long she lingers after a peek. The swing amplitudes of the
procedural walk are the `WALK` constant at the top of `src/renderer/src/character.ts`. Her personality is `persona.md`; the hard output rules she must follow are
appended in `src/main/brain/persona.ts`.

## Costs

One brain call per event (window switch, something opened or closed, temp spike, poke) or
occasional idle chatter, never more than one per 45 s. The persona is sent as a cached
prefix. Expect a few hundred to a couple thousand calls on a heavy desk day.

## Roadmap

- [ ] First run on real Windows: fix whatever koffi signatures need fixing.
- [x] Walk animation for `peek_at_window`.
- [x] Desktop icon pushing (`hands/icons.ts`).
- [ ] Voice input (local Whisper) so you can talk back.
- [ ] Screenshot-to-vision for deeper awareness, behind an explicit opt-in.
- [ ] Packaging and code signing (electron-builder).

## Why Windows

All the "plays with your desktop" parts are Win32 calls with stable public APIs. On Linux the
same tricks work only under X11; Wayland forbids apps from positioning or moving other
windows at all, and no desktop environment exposes icon positions. Temps are actually
easier on Linux, but that is the only part.

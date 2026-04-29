# Presentation v11 — Modular

Senior Project · Scene 03 — Behavioral Extraction System, refactored from a single HTML file into a multi-file structure (CSS + JS + JSON).

Visual, interaction, and runtime performance are **identical** to the previous single-file version (`presentation_v11_plan_b/scene3_v11.html`, deleted but preserved in git history). Only the physical file layout has changed, to make the code easier to read and extend.

---

## What this is

An interactive Three.js + MediaPipe visualization:

- 950 character particles arranged into a 3D globe; each particle's glyph live-displays one of 20 hand/face tracking fields (POINTER_X, HEAD_YAW, EYE_OPENNESS, …)
- The globe rotates via mouse drag or hand pinch (thumb + index)
- Six target labels on the globe surface (ATTENTION / REACTION / DWELL / PATTERN / 87 / 42) — hover ≈1.5s to "collect"
- Side HUD panels: scan waveform, behavioral index, signal confidence, collected markers, session metrics
- Web Audio synth: ambient hum + interaction SFX

Entry file: [index.html](index.html)

---

## How to launch

**You must serve this over a local HTTP server** — do not double-click `index.html`. Two reasons:

1. The browser refuses `getUserMedia` (camera) on the `file://` protocol
2. `data/targets.json` is loaded with `fetch()`, which CORS blocks under `file://`

From inside `presentation_v11_modular/` run either:

```bash
# Python 3
python3 -m http.server 8000

# Node (if http-server is installed)
npx http-server -p 8000
```

Then open `http://localhost:8000/` in the browser and grant camera permission.

VSCode users: right-click `index.html` → "Open with Live Server".

---

## File layout

```
presentation_v11_modular/
├── index.html              # skeleton: DOM elements + <link>/<script> wiring
├── css/
│   ├── core.css            # reset, body, #s3 container, canvas, crosshair
│   ├── hud-panels.css      # left #scan-panel + right #right-panel styles
│   └── corners.css         # corner HUD text + camera preview + #hand-dot
├── js/                     # load order = dependency order (see bottom of index.html)
│   ├── config.js           # window.S3 namespace + constants (RADIUS / N / GLYPHS / CAM_FIELDS / LIGHT_DIR)
│   ├── camera-data.js      # CAM_DATA live store (20 tracking fields)
│   ├── scene.js            # Three.js renderer / scene / camera / globe group / viewport
│   ├── texture-pool.js     # makeCharTex / makeWordTex + v11 OPT 1 shared texture pool
│   ├── sphere.js           # 950 particles + 3 orbital rings + 48 equator segments + 2 poles + arc stand
│   ├── audio.js            # ensureAudio + 5 sound effects
│   ├── input.js            # mouse drag handlers + setPointer + S3.input shared state
│   ├── hands.js            # MediaPipe Hands + FaceMesh, writes into CAM_DATA
│   ├── lighting.js         # face/back shading, throttled to every 2nd frame
│   ├── targets.js          # fetches data/targets.json + dwell collection logic
│   ├── hud.js              # scan waveform + 800ms metrics tick
│   └── main.js             # bootstrap (await fetch → schedule hand init → animate) + resize
└── data/
    └── targets.json        # the 6 collectable target definitions (label / color / glow / rgb)
```

---

## Namespace convention

All cross-file shared state lives on the global `window.S3` object — for example `S3.particles`, `S3.input.rotVel`, `S3.CAM_DATA`. Each JS file is wrapped in an IIFE so internal helpers stay private; only things other modules need to read or write get exposed via `S3.foo = bar`.

**Important rule: never reassign these objects, only mutate their fields.**
For instance `S3.input.rotVel.x *= 0.88` is correct; `S3.input.rotVel = {x:0,y:0}` would break references held by other files.

`S3.particles` is populated synchronously by sphere.js. `S3.targetSprites` is filled asynchronously by targets.js after fetching the JSON — main.js's bootstrap `await S3.loadTargets()` resolves before `animate()` is called, so both arrays are ready by the first frame.

---

## The 6 v11 performance optimizations (carried over from the single-file version)

| # | Optimization | Where it lives now |
|---|---|---|
| 1 | **Shared texture pool**: 20 shared CanvasTextures replace 950 per-particle ones; the `lastText` cache skips redraws when the value hasn't changed. ≈ −99% GPU upload | [texture-pool.js](js/texture-pool.js) + the 200ms `setInterval` in [sphere.js](js/sphere.js) |
| 2 | FaceMesh runs every 3rd frame; camera 320×240 → 240×180 | `Camera.onFrame` at the bottom of [hands.js](js/hands.js) |
| 3 | `updateLighting()` runs every other frame | Scheduled in [main.js](js/main.js); function body in [lighting.js](js/lighting.js) |
| 4 | `drawScan()` runs every other frame | Scheduled in [main.js](js/main.js); function body in [hud.js](js/hud.js) |
| 5 | `pixelRatio` cap lowered from 2 → 1.5 | [scene.js](js/scene.js) |
| 6 | Cached the `querySelectorAll` inside the 800ms HUD interval | top of [hud.js](js/hud.js) |

---

## External dependencies (CDN, requires internet)

- Three.js r128
- @mediapipe/hands
- @mediapipe/face_mesh
- @mediapipe/camera_utils

CDN tags are at the bottom of [index.html](index.html), in this order: `camera_utils → hands → three → face_mesh`.

---

## Extending it

- **Add a constant** → put it on `S3.xxx` in [config.js](js/config.js)
- **Add a sound effect** → add a function in [audio.js](js/audio.js), expose it as `S3.playMyThing = ...`
- **Add a globe ornament** → copy one of the `(function(){ ... })()` blocks in [sphere.js](js/sphere.js)
- **Add a HUD readout** → add the element in HTML, update it inside the `setInterval` in [hud.js](js/hud.js)
- **Change the target list** → edit [data/targets.json](data/targets.json) directly, no code changes needed

When adding a new `<script src="js/xxx.js">`, place it after every file it depends on (see the comments at the bottom of index.html).

---

## Difference from the single-file version

The only behavioral difference: on page open, the animation waits for `data/targets.json` to fetch before starting — roughly 50–200ms extra on localhost, basically invisible to the eye. Once running, frame rate is identical to the original.

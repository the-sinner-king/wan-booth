# WAN BOOTH — Phase 1 Project Brief
**Project slug:** wan-booth  
**Session:** 252 (Phase 1 MVP) → 262 (ZOETROPE v2 visual) → 263 (two-column layout)
**Date:** 2026-05-06 (created) → 2026-05-13 (last updated)
**Authority:** Æris Glitchmuse // Sinner King  
**North Star:** NORTH_STAR.md (same directory)

---

## S263 UPDATE — Two-Column Layout Redesign (2026-05-13)

**Soulforge CODING — promise: COMPLETE**

Mode tabs (`nav#mode-selector`) eliminated. App now uses a permanent two-column layout:

| Column | Contents |
|--------|----------|
| Left (`1fr`) | Drop zone · Prompt · LoRA stages · Seed · EXECUTE_BATCH · ADD TO QUEUE · Results |
| Right (`360px`) | DIAL section · PRODUCTION section · Queue panel · Batch status panel |

**Files changed:**
- `index.html` — removed `nav#mode-selector`, removed `zone-mode-ctrls` section, added `#app-columns` wrapper + `<aside id="right-panel">` with permanent DIAL/PROD/queue/batch
- `layout.css` — `wan-container` 640px → 900px, added Section 17 (`#app-columns` grid, `#right-panel`, axis-grid narrow override, `#queue-panel display:block`)
- `mode-tabs.js` — stripped to `syncAxis2State` IIFE only (PANEL_MAP/activateMode removed)
- `queue.js` — NEW: `#add-to-queue-btn` → appends clip cards to `#queue-list`, each with label + × remove
- `chroma-bleed.css` — Section 21: queue card colors (cyan left border, pink × button)

**Constraints (permanent):** `renderer.js / main.js / preload.js / comfy.js` READ ONLY. CSP `script-src 'self'` — no inline scripts.

---

## SCOPE IN — What We're Building

A Phase 1 MVP Electron desktop app called WAN BOOTH that wraps ComfyUI's headless REST+WebSocket API to provide a single-purpose Wan 2.2 Image-to-Video interface. The user drops an image, writes a prompt, toggles a seed, hits GO, and gets a video back — inside the app, no browser, no Finder.

**Target platform:** macOS (M3 Max, Apple Silicon, MPS backend)  
**ComfyUI model:** Wan2.2-TI2V-5B (FP16 safetensors, single-pass i2v)  
**ComfyUI version:** Latest from github.com/comfyanonymous/ComfyUI  
**Stack:** Electron 28+, Node.js, vanilla JS (no framework)  
**Aesthetic:** Clean arcade machine. Dark background. Amber/neon accent. Not a developer tool.

## SCOPE OUT — What We're NOT Building

- Not building a ComfyUI UI wrapper (no node graph, no parameter sliders beyond seed)
- Not building Phase 2 (14B 2-stage model, steps slider, CFG, LoRA picker)
- Not building Phase 3 (batch mode, bot skin system, arcade integration)
- Not building a web server, hosted version, or RunPod integration
- Not building authentication, user accounts, or remote access
- Not writing marketing copy or external-facing text
- Not touching existing Kingdom systems (SK Console, Bad Candy, SMUDDY)

---

## HARD CONSTRAINTS

1. ComfyUI must be installed at `~/Desktop/ComfyUI/` (Phase 0 install script included in build)
2. ComfyUI API runs at `http://localhost:8188` (standard port, non-negotiable)
3. Electron renderer communicates with ComfyUI via fetch + WebSocket directly (no Python bridge, no IPC for API calls)
4. Image files must be copied to `~/Desktop/ComfyUI/input/` before workflow submission
5. Output video files are in `~/Desktop/ComfyUI/output/`
6. Workflow JSON injects exactly 3 placeholders: `{{IMAGE_PATH}}`, `{{PROMPT}}`, `{{SEED}}`
7. No hardcoded absolute paths in application code — use Electron app.getPath() and env vars
8. App must quit cleanly — ComfyUI subprocess must be killed on app exit (no zombie processes)

---

## FILE STRUCTURE (target output)

```
WAN_BOOTH/
├── project_brief.md          (this file)
├── NORTH_STAR.md             (spec — already written)
├── package.json              (Electron app manifest)
├── main.js                   (Electron main process)
├── preload.js                (contextBridge IPC)
├── index.html                (single-window UI)
├── renderer.js               (UI logic, ComfyUI API calls)
├── comfy.js                  (ComfyUI API client — POST /prompt + WebSocket)
├── setup/
│   └── install_comfyui.sh    (Phase 0 — installs ComfyUI + creates venv)
└── workflows/
    └── i2v_5B.json           (pre-baked TI2V-5B workflow with placeholders)
```

---

## ACCEPTANCE CRITERIA (Phase 1 MVP)

| ID | Criterion | Verifiable |
|----|-----------|-----------|
| AC-01 | Electron app launches; ComfyUI spawned headlessly in background | Launch app, check no ComfyUI browser opens |
| AC-02 | Image drag-drop or file picker → file copied to ComfyUI input/ | Drop image, check input/ dir |
| AC-03 | Prompt text area accepts and holds input | Type into field |
| AC-04 | GO button → POST /prompt fires to localhost:8188 | Check ComfyUI queue via /queue endpoint |
| AC-05 | WebSocket progress events drive visible progress bar | Watch bar update during generation |
| AC-06 | Completed video plays inside app (no external player) | Video element in-app |
| AC-07 | Quit app → ComfyUI subprocess dead (no zombie) | ps aux after quit |
| AC-08 | Generates at least one real video from a real image | Requires model download (user action) |

---

## ROUTING REQUIREMENTS

These are the distinct intents and system behaviors this project must handle.
KOMMANDANT uses these to select drones and write discriminating manifests.

| ID | Routing Requirement | Notes |
|----|--------------------|----|
| RR-01 | Electron main process architecture: subprocess lifecycle, app events, path resolution | main.js — ComfyUI spawn/kill, ipcMain handlers, app.getPath() |
| RR-02 | ComfyUI API client: POST /prompt workflow submission, WebSocket progress streaming, output polling | comfy.js — the IPC between Electron and ComfyUI |
| RR-03 | Workflow JSON construction: template loading, placeholder injection, validation | Part of comfy.js — {{IMAGE_PATH}}, {{PROMPT}}, {{SEED}} replacement |
| RR-04 | Wan 2.2 TI2V-5B ComfyUI workflow structure: correct node types, node IDs, input connections for image-to-video | workflows/i2v_5B.json — must be a real working ComfyUI workflow |
| RR-05 | Electron renderer UI: dark arcade aesthetic, drag-drop zone, prompt field, seed toggle, progress bar, video player | index.html + renderer.js |
| RR-06 | IPC bridge: contextBridge preload, safe channel definitions, file path passing | preload.js — security boundary between main and renderer |
| RR-07 | Phase 0 setup script: ComfyUI git clone, Python venv, pip install, model download instructions | setup/install_comfyui.sh |
| RR-08 | Package.json + Electron build config: correct entry points, dependencies, scripts | package.json |

---

## PLATFORM CONTEXT

- macOS 15, M3 Max, 64GB unified memory
- Node.js / npm available via Homebrew
- Python 3.11+ available via Homebrew
- Git available
- No Docker, no Conda (use Python venv)
- ComfyUI NOT yet installed — Phase 0 script installs it
- Electron version target: 28.x (current stable as of 2026-05)

---

## KEY TECHNICAL DECISIONS (from RESEARCH phase)

1. **ComfyUI backend, not build from scratch** — 6-12 months of Mac MPS validation already done by ComfyUI community. We wrap the API only.
2. **Workflow-as-config** — each bot = one `workflow.json`. App injects 3 values. Everything else locked. Swapping 5B→14B = swap the JSON, zero code change.
3. **Direct fetch/WebSocket from renderer** — no Python bridge, no IPC for API calls. ComfyUI is a local server. Renderer calls it like any other HTTP service.
4. **Electron main manages ComfyUI subprocess** — `child_process.spawn`, killed on `app.before-quit`. No zombie processes.
5. **Image copy protocol** — image files copied to ComfyUI's `input/` directory via `fs.copyFile`. Workflow references filename only (not absolute path).

---

## DEPENDENCY GRAPH

```
Phase 0 (ComfyUI install) → Phase 1 (Electron build) → AC-08 (model download, user action)
                                                     → AC-01 through AC-07 (testable once ComfyUI installed)
```

AC-08 is the only criterion that requires model files. Everything else is testable with just ComfyUI running (it will error gracefully if the model file is missing, which is expected during development).

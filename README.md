# ZOETROPE

**Bad Candy Arcade image-to-video generator.**  
Drop an image. Write a motion prompt. Hit GENERATE — or queue a batch overnight.  
Powered by [Wan 2.2](https://huggingface.co/Wan-AI) + [ComfyUI](https://github.com/comfyanonymous/ComfyUI).

---

## ⚡ CITADEL — PRODUCTION HOME (handoff 2026-05-17)

ZOETROPE is now Citadel-owned (Windows / RTX 3090 Ti / D:\COMFYUI_FOR_WAN_BOOTH backend). Mac/Æris built it through S264; Citadel/Cla⌂de owns maintenance from S265 forward. **No more "permanent READ ONLY" constraint** on `renderer.js / main.js / preload.js / comfy.js` — those are now Cla⌂de's working files, edited freely with `S264/S265 Cla⌂de patch (BUG-N)` comments for grep-ability.

**Current state:** `main` fully tested, Phase 4 (batch) is live, 200/200 regression tests pass. First Citadel-side production gen confirmed: `wan_i2v_14b_00127.mp4` in 14:16 wall (below the Phase 2.6 18-min baseline). SageAttention + TeaCache engaged on every generation.

### What's in Phase 4

- **DIAL MODE** — Parameter sweep at a fixed seed. Lock a seed, pick 1–2 axes (LoRA strength, CFG, steps), set a range. The machine generates every combination. Use it to find your settings scientifically before committing to a long batch.
- **PRODUCTION MODE** — Queue 1–30 jobs for overnight runs. Two seed strategies: RANDOM (max variation) or SEQUENTIAL (reproducible — prime stride 1000007 so outputs are far apart in latent space).
- **`[PROMOTE →]` button** — After a DIAL sweep, pick the best job and push its values directly to the main sliders with one click.
- **Preset system** — Save and restore full LoRA+settings configurations.
- **Seed bank** — Save seeds that produced great results for reuse.
- **Chaos slider** — Randomize all parameters at once for exploration.

### What changed since Phase 3

- `renderer.js` — Full batch system: DIAL MODE, PRODUCTION MODE, job queue, cancel, promote
- `main.js` — `wan:getPlatform` IPC (platform-aware workflow routing, no manual edits needed)
- `preload.js` — `getPlatform` bridge + preset/seed bank IPC
- `workflows/i2v_14B_2stage_mac.json` — Mac-only workflow (no KJ Nodes) — **Citadel uses `i2v_14B_2stage.json`, unchanged**
- `test/regression.js` — 200 tests (was 137)

### To run (Citadel)

```powershell
# COMFYUI_DIR points at the shared install with original WAN BOOTH.
# Don't run both apps simultaneously — they'd clash on port 8188.
set COMFYUI_DIR=D:\COMFYUI_FOR_WAN_BOOTH
cd D:\zoetrope\app
npm install            # only if package.json changed
npm start
```

Platform routing is automatic — `main.js` detects Windows and picks `i2v_14B_2stage.json` (full KJ Nodes + TeaCache). Output lands in `D:\COMFYUI_FOR_WAN_BOOTH\output\` (desktop has a `Zoetrope Outputs.lnk` shortcut pointing there).

### ComfyUI path check

ZOETROPE defaults to `%USERPROFILE%\Desktop\ComfyUI`. If ComfyUI is elsewhere:

```powershell
# PowerShell (per-session):
$env:COMFYUI_DIR = "D:\COMFYUI_FOR_ZOETROPE"
npm start

# Or set permanently: System → Advanced → Environment Variables
# Variable name: COMFYUI_DIR
# Variable value: D:\path\to\your\ComfyUI
```

### KJ Nodes check (first run on PC)

KJ Nodes (`PatchSageAttentionKJ`) were installed on the Citadel during Phase 2.6. Before the first batch run, verify the nodes are still working by reading `VERIFY_BEFORE_FIRST_RUN.md` in the repo root. It lists the exact field values in the workflow JSON that need to match your installed KJ Nodes + TeaCache versions. A mismatch causes a ComfyUI node load error.

---

## What it does

ZOETROPE is an Electron desktop app that wraps ComfyUI's headless server and exposes a single-purpose UI for Wan 2.2 image-to-video generation. It runs a 2-stage MoE workflow (high-noise pass → refinement pass) with per-stage LoRA controls and a full batch system.

---

## Stack

| Layer | Tech |
|---|---|
| Shell | Electron 28.3.3 |
| Renderer | Vanilla HTML/CSS/JS (no framework) |
| Backend | ComfyUI headless at `localhost:8188` |
| PC workflow | `workflows/i2v_14B_2stage.json` (KJ Nodes — NVIDIA only) |
| Mac workflow | `workflows/i2v_14B_2stage_mac.json` (no KJ Nodes — auto-selected on Darwin) |
| Models | Wan 2.2 14B i2v + DR34ML4Y / k3nk LoRAs |

---

## Requirements

- **Node.js** 18+ and npm
- **Python** 3.10–3.12 (ComfyUI requirement — NOT 3.13+)
- **ComfyUI** installed locally — app auto-starts it headlessly
- **Wan 2.2 14B models** downloaded to ComfyUI's model directories (see below)
- GPU: NVIDIA CUDA (PC, production) or Apple Silicon MPS (Mac, slow)

---

## Model files required

Place these in `ComfyUI/models/` at the exact subdirectory paths shown:

```
models/
  diffusion_models/
    wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors   (~14 GB)
    wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors    (~14 GB)
  text_encoders/
    umt5_xxl_fp8_e4m3fn_scaled.safetensors             (~6.3 GB)
  vae/
    wan_2.1_vae.safetensors                            (~243 MB)
  loras/
    DR34ML4Y_I2V_14B_HIGH-20250908202326.safetensors
    DR34ML4Y_I2V_14B_LOW-20250908202331.safetensors
    wan22-ultimatedeepthroat-I2V-34epoc-high-k3nk.safetensors
    wan22-ultimatedeepthroat-I2V-16epoc-low-k3nk.safetensors
    sfbehind_v2.1_high_noise.safetensors
    sfbehind_v2.1_low_noise.safetensors
    Wan22_CumV2_Low.safetensors
```

> **⚠️ VAE note:** The 14B workflow uses `wan_2.1_vae.safetensors` (NOT wan2.2_vae). These are architecturally different. Using the wrong VAE produces noise.

---

## Setup — PC (Windows, NVIDIA GPU — production machine)

### 1. Install ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI C:\Users\YourName\Desktop\ComfyUI
cd C:\Users\YourName\Desktop\ComfyUI
pip install -r requirements.txt
```

Or use [ComfyUI Desktop](https://github.com/Comfy-Org/desktop/releases) for a one-click install.

### 2. Install required ComfyUI nodes

```bash
cd C:\Users\YourName\Desktop\ComfyUI\custom_nodes

# Required: video output
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite

# Required: SageAttention + TeaCache optimization (NVIDIA only)
git clone https://github.com/kijai/ComfyUI-KJNodes
cd ComfyUI-KJNodes && pip install -r requirements.txt && cd ..

# Optional: manager for easier installs
git clone https://github.com/ltdrdata/ComfyUI-Manager
```

> **KJ Nodes verification:** After installing, check `VERIFY_BEFORE_FIRST_RUN.md` in the repo root. It lists the exact field values in the workflow JSON that must match your KJ Nodes + TeaCache build. Do this before the first run.

### 3. Download models

Place all files from the **Model files required** section above into the correct subdirectories under `ComfyUI\models\`.

### 4. Clone ZOETROPE

```bash
git clone https://github.com/the-sinner-king/wan-booth C:\Users\YourName\Desktop\ZOETROPE
cd C:\Users\YourName\Desktop\ZOETROPE\app
npm install
```

### 5. Launch

```bash
cd C:\Users\YourName\Desktop\ZOETROPE\app
npm start
```

No manual edits to `main.js` needed. Platform is detected automatically.

---

## Setup — Mac (development / testing only)

```bash
cd app
npm install
npm start
```

ZOETROPE auto-detects Mac (`darwin`) and uses `i2v_14B_2stage_mac.json` — a variant with `PatchSageAttentionKJ` nodes removed (that node requires KJ Nodes + NVIDIA, neither of which exist on Mac). The Mac venv has a Python 3.14 pip breakage — do not attempt `pip install` inside the ComfyUI venv on Mac. Use `uv` for any future installs.

**Mac generation time:** ~2–4 hours per 81-frame video (M3 Max, MPS, 64GB unified memory). Both 14B models cast FP8 → BF16 at load time (~57 GB). Close everything before running.

---

## UI features

### Single-Job Mode

Drop an image → write a prompt → set your LoRA values → hit **GENERATE**.

| Control | What it does |
|---|---|
| DR34ML4Y STR (Stage 1/2) | Strength for DR34ML4Y LoRA per stage |
| K3NK STR (Stage 1/2) | Strength for k3nk LoRA per stage |
| STEPS (Stage 1/2) | Step count per stage (clamped to [1, 100]) |
| CFG (Stage 1/2) | CFG scale per stage |
| RESOLUTION | 832×480 / 480×832 / 624×624 / 1280×720 / 720×1280 |
| FRAME RATE | 8 / 12 / 16 (default) / 24 FPS |
| RUNS | 1–10 sequential repeat runs |
| SEED | Random or fixed |
| CHAOS | Randomize all parameters at once |

Stage 1 runs first (high noise pass), hands off to Stage 2. Total steps = stage1.steps + stage2.steps.

### DIAL MODE

Parameter sweep at a fixed seed. Use it to find good settings before committing to a batch.

1. **Lock a seed** — Roll or type a seed, then lock it. All DIAL jobs share this seed so results differ only by parameter.
2. **Pick axis 1** — Choose a parameter (DR34ML4Y S1 strength, CFG, steps, etc.) and set a min/max/step count.
3. **Pick axis 2 (optional)** — A second parameter to sweep simultaneously (creates a grid: axis1 × axis2 jobs).
4. **Hit RUN DIAL** — Jobs queue sequentially. Batch panel shows live progress.
5. **Hit `[PROMOTE →]`** on the winning job — copies its values to the main sliders instantly.

### PRODUCTION MODE

Overnight batch of independent jobs, each with a different seed.

1. **Set count** — 1–30 jobs.
2. **Seed strategy:**
   - **RANDOM** — Each job gets `Math.random()` seed. Maximum variation. Best for exploration.
   - **SEQUENTIAL** — Each job steps by prime stride 1000007 from a base seed. Reproducible — rerunning with the same base seed gives the same sequence.
3. **Hit RUN PRODUCTION** — Jobs queue sequentially overnight.

### Batch Panel

Appears below the generate button when a batch is running:

| Element | What it shows |
|---|---|
| Mode label | DIAL or PRODUCTION |
| ETA | Estimated time remaining |
| Progress bar | Current job % complete |
| Job list | All jobs with status (pending / running / complete / error) |
| CANCEL | Stops after the current job finishes cleanly |

### Presets

Save the current LoRA + settings configuration as a named preset. Load any saved preset with one click. Stored in `app/presets/`.

### Seed Bank

Save a seed that produced great results. Stored in `app/seeds.json`. Load any saved seed back to the main seed field.

### Export Report

Every completed generation writes `<videoname>_report.txt` alongside the video in `ComfyUI/output/`. Contains: date/time, duration, source image, prompt, seed, all LoRA values, CFG, steps, resolution, FPS, run number.

---

## Workflow files

| File | Platform | Use |
|---|---|---|
| `workflows/i2v_14B_2stage.json` | PC (Windows/CUDA) | Full workflow — KJ Nodes + TeaCache optimization |
| `workflows/i2v_14B_2stage_mac.json` | Mac (Darwin/MPS) | KJ Nodes removed — auto-selected on Mac |
| `workflows/i2v_5B.json` | Both | 5B model scaffold (unused in production) |

Platform selection is automatic via `get14bWorkflow()` in `renderer.js`. No manual switching needed.

---

## Generation speed reference

| Machine | GPU | Backend | Est. time (81 frames, 480p) |
|---|---|---|---|
| Mac M3 Max 64GB | 40-core GPU | MPS | ~2–4 hours |
| PC RTX 3090 Ti 24GB | 10496 CUDA cores | CUDA | ~5–15 min |
| RunPod A100 40GB | — | CUDA | ~2–5 min |

---

## Project structure

```
wan-booth/
  app/
    index.html              # Bad Candy Arcade UI
    main.js                 # Electron main — auto platform detection, no manual edits
    renderer.js             # UI logic — LoRA controls, batch system, DIAL/PROD modes
    preload.js              # IPC bridge — all wan:* handlers
    comfy.js                # ComfyUI API client — workflow injection + WebSocket
    color-tokens.css        # Bad Candy Arcade palette (OKLCH)
    type-tokens.css         # VT323 + Press Start 2P type system
    seeds.json              # Saved seed bank (auto-created)
    presets/                # Saved presets (auto-created)
      index.json
      <slug>.json
    workflows/
      i2v_14B_2stage.json      # PC workflow — full KJ Nodes + TeaCache
      i2v_14B_2stage_mac.json  # Mac workflow — KJ Nodes removed
      i2v_5B.json              # 5B scaffold
  test/
    regression.js           # 200 regression tests — node test/regression.js
  README.md
  NORTH_STAR.md             # Full project specification (architecture, decisions, session log)
  VERIFY_BEFORE_FIRST_RUN.md  # KJ Nodes + TeaCache field verification checklist
  ZOETROPE_ARCHITECTURE.txt  # Source map — all files, all functions, all IPC contracts
```

---

## Development

```bash
# Run with DevTools open
cd app && npm run dev

# Run regression tests (exit 0 = all pass, currently 200/200)
node test/regression.js
```

---

## Troubleshooting

**Blank window / white screen**  
Run `npm run dev` to open DevTools. Check the console for JS errors.

**DISCONNECTED state on launch**  
ComfyUI failed to start or isn't on port 8188. Check `COMFYUI_DIR` env var. Also: `tail -f /tmp/wan_booth_debug.log` (Mac) or open DevTools on PC — ComfyUI output appears there.

**ComfyUI crash / silent failure**  
ComfyUI stdout/stderr are piped to the debug log. On Mac: `tail -f /tmp/wan_booth_debug.log`. On PC: DevTools console (F12).

**400 error on first generate (PC)**  
A workflow node is missing. Open `http://localhost:8188` → check the error in the ComfyUI queue. Most likely cause: KJ Nodes not installed or `PatchSageAttentionKJ` field mismatch. Read `VERIFY_BEFORE_FIRST_RUN.md`.

**Generation queues but never starts**  
Open `http://localhost:8188` and check the ComfyUI queue. Required nodes: `ModelSamplingSD3`, `WanImageToVideo`, `VHS_VideoCombine`. Install ComfyUI-VideoHelperSuite if VHS_VideoCombine is missing.

**Workflow contract violation error on startup**  
The workflow JSON was re-exported and node IDs changed. Restore from git (`git checkout app/workflows/`), or update `WORKFLOW_14B_CONTRACT` in `comfy.js` to match the new IDs.

**LoRA not found error**  
Check `ComfyUI/models/loras/` — filenames are case-sensitive. Exact filenames are in the **Model files required** section above.

**Batch job errors out immediately**  
Check the batch panel for the error message. Most common: ComfyUI isn't running (DISCONNECTED state), or the image path wasn't loaded before starting the batch.

**DIAL sweep produces identical outputs**  
The axis min and max might be equal, or steps is 1. Verify axis config. Also check that the seed is actually locked — unlocked seed means each job gets a random seed, defeating the point of DIAL mode.

**MPS out of memory (Mac)**  
`PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7` is already set. Close everything else. Lower resolution to 624×624. The 14B models need ~57 GB combined.

**First generation very slow (Mac)**  
Expected. 2–4 hours for 480p on M3 Max. PC is the production machine (~5–15 min). Not a bug.

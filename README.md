# WAN BOOTH

**Bad Candy Arcade image-to-video generator.**  
Drop an image. Write a motion prompt. Hit GENERATE.  
Powered by [Wan 2.2](https://huggingface.co/Wan-AI) + [ComfyUI](https://github.com/comfyanonymous/ComfyUI).

---

## ⚡ CITADEL — READ THIS FIRST (PC SYNC BRIEF)

If you're on the Citadel (PC, RTX 3090 Ti) and just pulled this repo, here's the full picture:

**Current state:** `main` branch is production-ready. First real video was confirmed on Citadel (RTX 3090 Ti, CUDA) before these changes. This commit adds the full S259 feature batch + Opus audit fixes.

**What's new in this push:**
- LoRA sliders are now actually wired — stage 1 + stage 2 strengths inject into the workflow for real
- Step clamping to [1, 100] — no more ComfyUI panics on edge values  
- Stage 2 `end_at_step` sentinel (10000) is now preserved — was incorrectly being overwritten
- Resolution dropdown (5 presets, auto-detects portrait/landscape from dropped image)
- FPS dropdown (8 / 12 / 16 / 24)
- Repeat runs dropdown (1–10 sequential runs)
- Export report `.txt` alongside every video
- ComfyUI stdout/stderr now piped to `/tmp/wan_booth_debug.log` — crashes are visible
- `writeReport` security hardened — filename token only, no path traversal
- CSP tightened — `object-src 'none'` + `base-uri 'none'`
- Workflow contract validator — throws loud error if workflow node IDs changed since export
- 137/137 regression tests passing (was 124)

**To sync and run:**

```bash
cd D:\WAN_BOOTH        # or wherever you cloned the repo
git pull

cd app
npm install            # in case package.json changed
```

Then follow the **PC-specific edits to main.js** section below before launching.

---

## What it does

WAN BOOTH is an Electron desktop app that wraps ComfyUI's headless server and exposes a single-purpose UI for Wan 2.2 image-to-video generation. It runs a 2-stage MoE workflow (high-noise pass → refinement pass) with per-stage LoRA controls:

- **Stage 1 — High Detail Pass**: DR34ML4Y + k3nk LoRA strengths, Steps, CFG
- **Stage 2 — Refinement Pass**: same controls, separate values
- **Output Settings**: Resolution preset (5 options, auto-suggested from source image), Frame rate (8/12/16/24 FPS), Repeat runs (1–10)
- Live elapsed timer + ETA estimate during generation
- Drop zone for source image (drag-drop or click-to-pick)
- Seed control (random or fixed)
- Export report `.txt` written alongside every video (all settings, timing, LoRA values)

---

## Stack

| Layer | Tech |
|---|---|
| Shell | Electron 28.3.3 |
| Renderer | Vanilla HTML/CSS/JS (no framework) |
| Backend | ComfyUI headless at `localhost:8188` |
| Active workflow | `workflows/i2v_14B_2stage.json` |
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

Source: Wan-AI models → [HuggingFace Wan-AI/Wan2.2-I2V-14B-720P](https://huggingface.co/Wan-AI)  
LoRAs: CivitAI (search by filename)

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

> **Path matters.** WAN BOOTH defaults to `%USERPROFILE%\Desktop\ComfyUI`. If you install ComfyUI elsewhere, update `main.js` (see step 5).

### 2. Install required ComfyUI nodes

```bash
cd C:\Users\YourName\Desktop\ComfyUI\custom_nodes

# Required: video output
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite

# Optional: manager for easier installs
git clone https://github.com/ltdrdata/ComfyUI-Manager
```

### 3. Download models

Place all files from the **Model files required** section above into the correct subdirectories under `ComfyUI\models\`.

### 4. Clone WAN BOOTH

```bash
git clone https://github.com/the-sinner-king/wan-booth C:\Users\YourName\Desktop\WAN_BOOTH
cd C:\Users\YourName\Desktop\WAN_BOOTH\app
npm install
```

### 5. Set ComfyUI path (if not at Desktop\ComfyUI)

`main.js` auto-detects platform — no manual edits needed. Mac flags (`--bf16-unet`, `PYTORCH_MPS_HIGH_WATERMARK_RATIO`) are applied automatically on Darwin only. Python path is also platform-adaptive (`venv/bin/python` on Mac, `.venv/Scripts/python.exe` on Windows).

If your ComfyUI is NOT at `%USERPROFILE%\Desktop\ComfyUI`, set the `COMFYUI_DIR` environment variable:

```bash
# PowerShell (per-session):
$env:COMFYUI_DIR = "D:\COMFYUI_FOR_WAN_BOOTH"
npm start

# Or set it permanently in System → Environment Variables
# Variable name: COMFYUI_DIR
# Variable value: D:\COMFYUI_FOR_WAN_BOOTH
```

### 6. Launch

```bash
cd C:\Users\YourName\Desktop\WAN_BOOTH\app
npm start
```

---

## Setup — Mac (development / slow machine)

```bash
cd app
npm install
npm start
```

WAN BOOTH auto-starts ComfyUI headlessly on launch. No separate ComfyUI window needed.

**Mac generation time:** ~2–4 hours per 81-frame video (M3 Max, MPS backend, 64GB unified memory).  
Both 14B models are cast from FP8 → BF16 at load time, using ~57 GB of unified memory combined. Close everything else before running.

---

## UI features

### LoRA Stage Cards

Two collapsible cards — Stage 1 (High Detail Pass) and Stage 2 (Refinement Pass). Each has:

| Control | What it does |
|---|---|
| DR34ML4Y STR | Strength for the DR34ML4Y LoRA in this stage |
| K3NK STR | Strength for the k3nk LoRA in this stage |
| STEPS | Step count for this stage (clamped to [1, 100]) |
| CFG | CFG scale for this stage |

Stage 1 runs first (steps 0 → stage1.steps), hands off to Stage 2 (stage1.steps → end).  
Total denoising steps = stage1.steps + stage2.steps.

### Output Settings

| Control | Options |
|---|---|
| RESOLUTION | 832×480 (default), 480×832, 624×624, 1280×720, 720×1280 |
| FRAME RATE | 8 / 12 / 16 (default, native training FPS) / 24 |
| RUNS | 1–10 sequential repeat runs |

Resolution is auto-suggested from dropped image aspect ratio (portrait → 480×832, landscape → 832×480, square → 624×624).

### Export Report

Every completed generation writes `<videoname>_report.txt` alongside the video in `ComfyUI/output/`. Contains: date/time, duration, source image, prompt, seed, all LoRA values, CFG, steps, resolution, FPS, run number.

---

## Workflow files

| File | Model | Use |
|---|---|---|
| `workflows/i2v_14B_2stage.json` | Wan 2.2 14B | 2-stage MoE — production quality |
| `workflows/i2v_5B.json` | Wan 2.2 5B | Faster / lower VRAM — scaffold only |

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
    index.html            # Bad Candy Arcade UI
    main.js               # Electron main — edit comfyDir + remove Mac flags for PC
    renderer.js           # UI logic + LoRA controls + output settings + ETA timer
    preload.js            # IPC bridge
    comfy.js              # ComfyUI API client — workflow injection + WebSocket
    color-tokens.css      # Bad Candy Arcade palette (OKLCH)
    type-tokens.css       # VT323 + Press Start 2P type system
    workflows/
      i2v_14B_2stage.json # Active workflow — 2-stage MoE, dual-LoRA chain
      i2v_5B.json         # 5B scaffold (unused in production)
  test/
    regression.js         # 137 regression tests — run with: node test/regression.js
  README.md
  NORTH_STAR.md           # Full project specification (internal — architecture, decisions, session log)
  WAN_BOOTH_ARCHITECTURE.txt  # Source map — all files, all functions, all IPC contracts
```

---

## Development

```bash
# Run with DevTools open
cd app && npm run dev

# Run regression tests (exit 0 = all pass)
node test/regression.js
```

---

## Troubleshooting

**Blank window / white screen**  
Run `npm run dev` to open DevTools and check the console for JS errors.

**DISCONNECTED state on launch**  
ComfyUI failed to start or isn't on port 8188. Check `main.js` for the correct ComfyUI path. Also try: `tail -f /tmp/wan_booth_debug.log` (Mac) or check the Electron console for ComfyUI stderr output.

**ComfyUI crash / silent failure**  
ComfyUI stdout/stderr are now piped to the debug log. On Mac: `tail -f /tmp/wan_booth_debug.log`. On PC: open DevTools (F12) and check the console — ComfyUI output appears there.

**Generation queues but never starts**  
Open `http://localhost:8188` in a browser and check the ComfyUI queue. Common cause: missing custom node. All required: `ModelSamplingSD3`, `WanImageToVideo`, `VHS_VideoCombine`. Install ComfyUI-VideoHelperSuite if VHS_VideoCombine is missing.

**Workflow contract violation error on startup**  
The workflow JSON was re-exported from ComfyUI and node IDs changed. Either restore `workflows/i2v_14B_2stage.json` from git, or update `WORKFLOW_14B_CONTRACT` in `comfy.js` to match the new node IDs.

**LoRA not found error**  
LoRA filenames must match exactly. Check `ComfyUI/models/loras/` — filenames are case-sensitive. See the exact filenames in the **Model files required** section.

**MPS out of memory (Mac)**  
`PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7` is already set in `main.js`. Close everything else — Gemini CLI, browsers with open tabs, anything using unified memory. Both 14B models need ~57 GB. If still OOMing: lower resolution preset to 624×624.

**First generation very slow (Mac)**  
Expected. Allow 2–4 hours for 480p. PC is the production machine (~5–15 min). This is not a bug.

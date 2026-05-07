# WAN BOOTH

**Bad Candy Arcade image-to-video generator.**  
Drop an image. Write a motion prompt. Hit GENERATE.  
Powered by [Wan 2.2](https://huggingface.co/Wan-AI) + [ComfyUI](https://github.com/comfyanonymous/ComfyUI).

---

## What it does

WAN BOOTH is an Electron desktop app that wraps ComfyUI's headless server and exposes a single-purpose UI for Wan 2.2 image-to-video generation. It runs a 2-stage workflow with per-stage LoRA controls:

- **Stage 1 — High Detail Pass**: DR34ML4Y + k3nk LoRA strengths, Steps, CFG
- **Stage 2 — Refinement Pass**: same controls, separate values
- Live elapsed timer + ETA estimate during generation
- Drop zone for source image
- Seed control (random or fixed)

---

## Stack

| Layer | Tech |
|---|---|
| Shell | Electron 28.3.3 |
| Renderer | Vanilla HTML/CSS/JS (no framework) |
| Backend | ComfyUI headless at `localhost:8188` |
| Workflow | `workflows/i2v_14B_2stage.json` |
| Models | Wan 2.2 14B i2v + DR34ML4Y / k3nk LoRAs |

---

## Requirements

- **Node.js** 18+ and npm
- **Python** 3.10–3.12 (ComfyUI requirement — NOT 3.13+)
- **ComfyUI** installed locally — app auto-starts it headlessly
- **Wan 2.2 14B models** downloaded to ComfyUI's model directories (see below)
- GPU: Apple Silicon MPS (Mac) or NVIDIA CUDA (PC, recommended)

---

## Model files required

Place these in `ComfyUI/models/` at the exact subdirectory paths shown:

```
models/
  diffusion_models/
    wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors   (~9.5 GB)
    wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors    (~9.5 GB)
  text_encoders/
    umt5_xxl_fp8_e4m3fn_scaled.safetensors             (~5 GB)
  vae/
    wan_2.1_vae.safetensors                            (~0.5 GB)
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

## Setup — Mac (development machine)

```bash
cd app
npm install
npm start
```

WAN BOOTH auto-starts ComfyUI headlessly on launch. No separate ComfyUI window needed.

**Mac generation time:** ~2–4 hours per 81-frame video (M3 Max, MPS backend, 64GB unified memory).  
Both 14B models are cast from FP8 → BF16 at load time, using ~57 GB of unified memory combined.

---

## Setup — PC (Windows, NVIDIA GPU — ~5–15 min per video)

### 1. Install ComfyUI

```bash
# Recommended path: D:\COMFYUI_FOR_WAN_BOOTH\
git clone https://github.com/comfyanonymous/ComfyUI D:\COMFYUI_FOR_WAN_BOOTH
cd D:\COMFYUI_FOR_WAN_BOOTH
pip install -r requirements.txt
```

Or use [ComfyUI Desktop](https://github.com/Comfy-Org/desktop/releases) for a one-click install.

### 2. Install required ComfyUI nodes

```bash
cd D:\COMFYUI_FOR_WAN_BOOTH\custom_nodes

# Required: video output
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite

# Optional: manager for easier installs
git clone https://github.com/ltdrdata/ComfyUI-Manager
```

### 3. Download models

Place all files from the **Model files required** section above into `D:\COMFYUI_FOR_WAN_BOOTH\models\`.

### 4. Clone WAN BOOTH

```bash
# Public repo — no auth needed
git clone https://github.com/the-sinner-king/wan-booth D:\WAN_BOOTH
cd D:\WAN_BOOTH\app
npm install
```

### 5. Edit main.js for PC

Open `D:\WAN_BOOTH\app\main.js` and update the ComfyUI path constant:

```js
// Change this line:
const COMFYUI_DIR = path.join(os.homedir(), 'Desktop', 'ComfyUI');

// To this:
const COMFYUI_DIR = 'D:\\COMFYUI_FOR_WAN_BOOTH';
```

Also **remove these two lines** from the ComfyUI spawn options — they are Mac-only:

```js
// REMOVE on PC (Mac MPS flags — not needed on CUDA):
'--bf16-unet'
// and from env:
PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.7'
```

> **Why:** `--bf16-unet` casts FP8 → BF16 at load time to work around MPS's lack of FP8 support. CUDA supports FP8 natively — this flag wastes VRAM on PC and is unnecessary.

### 6. Launch

```bash
cd D:\WAN_BOOTH\app
npm start
```

---

## Workflow files

| File | Model | Use |
|---|---|---|
| `workflows/i2v_14B_2stage.json` | Wan 2.2 14B | 2-stage MoE — best quality |
| `workflows/i2v_5B.json` | Wan 2.2 5B | Faster / lower VRAM |

---

## Generation speed reference

| Machine | GPU | Backend | Est. time (81 frames) |
|---|---|---|---|
| Mac M3 Max 64GB | 40-core GPU | MPS | ~2–4 hours |
| PC RTX 3090 Ti 24GB | 10496 CUDA cores | CUDA | ~5–15 min |
| RunPod A100 40GB | — | CUDA | ~2–5 min |

---

## PC-specific notes

- FP8 models run natively on CUDA — no `--bf16-unet` needed
- ComfyUI loads each 14B expert sequentially (~9.5 GB each), so 24 GB VRAM is sufficient
- Before first run, verify with `nvidia-smi` that nothing else is occupying VRAM
- Use `python main.py --listen 127.0.0.1 --port 8188` to bind to localhost only

---

## Project structure

```
wan-booth/
  app/
    index.html          # Bad Candy Arcade UI
    main.js             # Electron main process — edit COMFYUI_DIR for PC
    renderer.js         # UI logic + WebSocket client + ETA timer
    preload.js          # IPC bridge
    comfy.js            # ComfyUI API client
    color-tokens.css    # Bad Candy Arcade palette (OKLCH)
    type-tokens.css     # VT323 + Press Start 2P type system
    workflows/          # ComfyUI workflow JSON files
  test/
    regression.js       # 87 regression tests
  README.md
  WAN_BOOTH_ARCHITECTURE.txt  # Full source map — all files, all functions
```

---

## Development

```bash
# Run with DevTools open
cd app && npm run dev

# Run regression tests
cd test && node regression.js
```

---

## Troubleshooting

**Blank window / white screen**  
Run `npm run dev` to open DevTools and check the console for JS errors.

**DISCONNECTED state on launch**  
ComfyUI failed to start or isn't on port 8188. Check terminal output. Common cause: Python not found, or ComfyUI path wrong in `main.js`.

**Generation queues but never starts**  
Open ComfyUI at `http://localhost:8188` and check for missing nodes. All 3 required: `ModelSamplingSD3`, `WanImageToVideo`, `VHS_VideoCombine`.

**LoRA not found error**  
LoRA filenames must match exactly. Check `ComfyUI/models/loras/` — filenames are case-sensitive.

**MPS out of memory (Mac)**  
`PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7` is already set in `main.js`. If still OOMing, try lowering resolution in the workflow JSON (`width: 640, height: 360`).

**First generation very slow (Mac)**  
Expected. Both 14B models cast to BF16 use ~57 GB of 64 GB unified memory. Allow 2–4 hours. PC is the production machine (~5–15 min).

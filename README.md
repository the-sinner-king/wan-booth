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
| Models | Wan 2.2 14B i2v + DR34ML4Y / k3nk / sfbehind LoRAs |

---

## Requirements

- **Node.js** 18+ and npm
- **Python** 3.10–3.12 (ComfyUI requirement — NOT 3.13+)
- **ComfyUI** running at `localhost:8188`
- **Wan 2.2 14B i2v model** downloaded to ComfyUI's model directory
- GPU with enough VRAM (Mac: Apple Silicon MPS, PC: NVIDIA CUDA)

---

## Setup — Mac (development machine)

```bash
cd app
npm install
npm start
```

ComfyUI must be running separately before launching WAN BOOTH.  
If ComfyUI isn't running, the app will show `DISCONNECTED` state.

---

## Setup — PC (Windows, NVIDIA GPU — faster generation)

### 1. Install ComfyUI

```bash
# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt
```

Or use [ComfyUI Desktop](https://github.com/Comfy-Org/desktop/releases) for a one-click install.

### 2. Install required ComfyUI nodes

```bash
cd ComfyUI/custom_nodes

# Video output
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite

# (Optional) Manager for easier node installs
git clone https://github.com/ltdrdata/ComfyUI-Manager
```

### 3. Download models

Place files in `ComfyUI/models/`:

```
models/
  wan/                          # Wan 2.2 base models
    Wan2.2_I2V_14B_720P_...     # 14B i2v model
  loras/
    DR34ML4Y_HIGH.safetensors
    DR34ML4Y_LOW.safetensors
    k3nk_HIGH.safetensors
    k3nk_LOW.safetensors
    sfbehind_HIGH.safetensors
    sfbehind_LOW.safetensors
```

### 4. Launch ComfyUI (PC)

```bash
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

The `--listen 0.0.0.0` flag lets WAN BOOTH connect from localhost.

### 5. Install and run WAN BOOTH

```bash
git clone https://github.com/the-sinner-king/wan-booth
cd wan-booth/app
npm install
npm start
```

---

## Workflow files

| File | Model | Use |
|---|---|---|
| `workflows/i2v_14B_2stage.json` | Wan 2.2 14B | 2-stage MoE — best quality |
| `workflows/i2v_5B.json` | Wan 2.2 5B | Faster / lower VRAM |

---

## PC-specific notes

- ComfyUI runs significantly faster on NVIDIA GPU (CUDA) vs Apple Silicon (MPS)
- On Windows, launch ComfyUI from the ComfyUI folder's `run_nvidia_gpu.bat` if using the portable install
- WAN BOOTH connects to `localhost:8188` — ComfyUI must be on the same machine

---

## Project structure

```
wan-booth/
  app/
    index.html          # Main UI
    main.js             # Electron main process
    renderer.js         # UI logic + WebSocket client
    preload.js          # IPC bridge
    comfy.js            # ComfyUI API client
    color-tokens.css    # Bad Candy Arcade palette (OKLCH)
    type-tokens.css     # VT323 + Press Start 2P type system
    workflows/          # ComfyUI workflow JSON files
    setup/              # Install scripts
  test/
    regression.js       # 87 regression tests
  README.md
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
Check that `index.html` loads correctly. Run `npm run dev` to open DevTools and check the console.

**DISCONNECTED state on launch**  
ComfyUI isn't running or isn't on port 8188. Start ComfyUI first.

**Generation queues but never starts**  
Check ComfyUI's console for missing models or nodes. All 3 required nodes must be present: `ModelSamplingSD3`, `WanImageToVideo`, `VHS_VideoCombine`.

**MPS out of memory (Mac)**  
Set `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` in your ComfyUI launch environment.

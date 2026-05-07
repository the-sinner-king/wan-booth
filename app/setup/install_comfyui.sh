#!/bin/bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ██╗    ██╗ █████╗ ███╗   ██╗    ██████╗  ██████╗  ██████╗ ████████╗██╗  ██╗
#  ██║    ██║██╔══██╗████╗  ██║    ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝██║  ██║
#  ██║ █╗ ██║███████║██╔██╗ ██║    ██████╔╝██║   ██║██║   ██║   ██║   ███████║
#  ██║███╗██║██╔══██║██║╚██╗██║    ██╔══██╗██║   ██║██║   ██║   ██║   ██╔══██║
#  ╚███╔███╔╝██║  ██║██║ ╚████║    ██████╔╝╚██████╔╝╚██████╔╝   ██║   ██║  ██║
#   ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═════╝  ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝
#
#  Phase 0: ComfyUI Install — macOS Apple Silicon
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  WAN BOOTH — Phase 0: ComfyUI Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Clone ComfyUI if not already present ──────────────────────────────

if [ -d "$HOME/Desktop/ComfyUI" ]; then
    echo "✓ ComfyUI already installed at $HOME/Desktop/ComfyUI/ — skipping clone"
else
    echo "→ Cloning ComfyUI to $HOME/Desktop/ComfyUI ..."
    git clone https://github.com/comfyanonymous/ComfyUI "$HOME/Desktop/ComfyUI"
    echo "✓ Clone complete"
fi

echo ""

# ── Step 2: Enter ComfyUI directory ──────────────────────────────────────────

cd "$HOME/Desktop/ComfyUI"

# ── Step 3: Create venv if not already present ───────────────────────────────

if [ -d "venv" ]; then
    echo "✓ venv already exists — skipping create"
else
    echo "→ Creating Python virtual environment ..."
    python3 -m venv venv
    echo "✓ venv created"
fi

echo ""

# ── Step 4: Activate venv ────────────────────────────────────────────────────

echo "→ Activating venv ..."
# shellcheck source=/dev/null
source venv/bin/activate
echo "✓ venv active"
echo ""

# ── Step 5: Install requirements ─────────────────────────────────────────────

echo "→ Installing requirements (this may take a few minutes) ..."
pip install -r requirements.txt
echo ""
echo "✓ Requirements installed"
echo ""

# ── Step 6: Install ComfyUI-VideoHelperSuite custom node ─────────────────────
# Required for VHS_VideoCombine node used in the Wan 2.2 workflow.

VHS_DIR="$HOME/Desktop/ComfyUI/custom_nodes/ComfyUI-VideoHelperSuite"

if [ -d "$VHS_DIR" ]; then
    echo "✓ ComfyUI-VideoHelperSuite already installed — skipping"
else
    echo "→ Installing ComfyUI-VideoHelperSuite (required for video output) ..."
    git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite "$VHS_DIR"
    cd "$VHS_DIR"
    pip install -r requirements.txt
    cd "$HOME/Desktop/ComfyUI"
    echo "✓ ComfyUI-VideoHelperSuite installed"
fi

echo ""

# ── Step 7: Model download instructions ──────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEP: Download model files to ComfyUI directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "From: https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B"
echo ""
echo "FILE 1: wan2.2_ti2v_5B_fp16.safetensors"
echo "→ Place in: $HOME/Desktop/ComfyUI/models/diffusion_models/"
echo ""
echo "FILE 2: umt5_xxl_fp8_e4m3fn_scaled.safetensors"
echo "→ Place in: $HOME/Desktop/ComfyUI/models/text_encoders/"
echo ""
echo "FILE 3: wan2.2_vae.safetensors"
echo "→ Place in: $HOME/Desktop/ComfyUI/models/vae/"
echo ""
echo "FILE 4: clip_vision_g.safetensors"
echo "From: https://huggingface.co/laion/CLIP-ViT-bigG-14-laion2B-39B-b160k"
echo "→ Place in: $HOME/Desktop/ComfyUI/models/clip_vision/"
echo ""
echo "These files are ~12GB total. Download manually and place them."
echo "WAN BOOTH will not work without them."
echo ""

# ── Step 8: Smoke test instructions ──────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SMOKE TEST: Verify ComfyUI runs before proceeding"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "When models are downloaded, test ComfyUI directly:"
echo "  cd $HOME/Desktop/ComfyUI"
echo "  source venv/bin/activate"
echo "  python main.py --listen"
echo "Then open http://localhost:8188 to verify."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 0 complete. Awaiting model files."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

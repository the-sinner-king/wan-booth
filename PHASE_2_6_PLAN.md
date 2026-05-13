# WAN BOOTH — PHASE 2.6 OPTIMIZATION PLAN
## RTX 3090 Ti Performance Pass

**Target**: 5-15 min per 81-frame 480p → 2-4 min. No quality loss.  
**Stack confirmed**: RTX 3090 Ti (GA102 CC 8.6), 24GB VRAM, 128GB RAM, PyTorch 2.11.0+cu128, ComfyUI 0.20.1, Python 3.10.11, Windows.

---

## HARDWARE REALITY (why this matters)

Models confirmed on disk:
- `wan2.2_i2v_high_noise_14B_fp8_scaled` — **14 GB**
- `wan2.2_i2v_low_noise_14B_fp8_scaled` — **14 GB**
- `umt5_xxl_fp8_e4m3fn_scaled` — **6.3 GB**
- `wan_2.1_vae` — **243 MB**
- 4× LoRAs active — **~2.4 GB**
- **Total: ~37 GB vs 24 GB VRAM**

FP8 on Ampere (CC 8.6): no native FP8 Tensor Core support. Weights dequantized to FP16 at compute time — every layer, every step, both stages.

Stage 1 alone (14 + 6.3 + 2.4 = 22.7 GB) fits in 24 GB (1.3 GB headroom).  
Both models simultaneously (36.7 GB) do NOT fit. Inter-stage swap is unavoidable at FP8.

`cudaMallocAsync` is already the active allocator — confirmed by ComfyUI diagnostics.

---

## WHAT WE'RE BUILDING

### Part A — main.js code changes (Windows spawn branch)

**Current Windows spawn (line 65-76 main.js):**
```js
const spawnArgs = ['main.py', '--listen', '127.0.0.1'];
if (isMac) spawnArgs.push('--bf16-unet');
comfyProcess = spawn(pythonPath, spawnArgs, {
  cwd: comfyDir,
  env: {
    ...process.env,
    ...(isMac ? { PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.7' } : {}),
  },
  ...
});
```

**Target Windows spawn:**
```js
const spawnArgs = ['main.py', '--listen', '127.0.0.1'];
if (isMac) {
  spawnArgs.push('--bf16-unet');
} else {
  spawnArgs.push('--reserve-vram', '1');
}
comfyProcess = spawn(pythonPath, spawnArgs, {
  cwd: comfyDir,
  env: {
    ...process.env,
    ...(isMac
      ? { PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.7' }
      : { PYTORCH_ALLOC_CONF: 'expandable_segments:True' }
    ),
  },
  ...
});
```

- `--reserve-vram 1`: reclaims the ~0.5-1GB VRAM reserved by default while keeping 1GB safe for the display driver. WAN BOOTH Electron app drives the display on the same 3090 Ti — `--reserve-vram 0` causes TDR crashes (nvlddmkm). `--highvram` removed (RF-07: counterproductive at 37GB > 24GB, bypasses Dynamic VRAM)
- `PYTORCH_ALLOC_CONF expandable_segments:True`: honored by cudaMallocAsync (the active allocator). Reduces fragmentation across sequential runs. `PYTORCH_CUDA_ALLOC_CONF` is deprecated in PyTorch 2.8+; `garbage_collection_threshold` is a no-op under cudaMallocAsync

**AC-23**: Windows spawnArgs contains `--reserve-vram 1` and does NOT contain `--highvram` (RF-07)  
**AC-24**: Windows spawn env contains `PYTORCH_ALLOC_CONF: 'expandable_segments:True'`  
**AC-28**: Regression tests updated — 4 new tests for AC-23/24 (source-text assertions, same pattern as existing spawn tests)

---

### Part B — workflow JSON surgery (i2v_14B_2stage.json)

Current node chain for Stage 1:
```
Node 1 (UNETLoader) → Node 6 (LoraLoader) → Node 7 (LoraLoaderModelOnly) → Node 11 (ModelSamplingSD3) → Node 13 (KSamplerAdvanced)
```

Current node chain for Stage 2:
```
Node 2 (UNETLoader) → Node 18 (LoraLoader) → Node 19 (LoraLoaderModelOnly) → Node 12 (ModelSamplingSD3) → Node 14 (KSamplerAdvanced)
```

**Target: SageAttention BEFORE ModelSamplingSD3, TeaCache AFTER ModelSamplingSD3:**
```
Stage 1: Node 18 (LoraLoader) → Node 20 (PatchSageAttentionKJ) → Node 11 (ModelSamplingSD3) → Node 21 (ApplyTeaCache) → Node 13 (KSamplerAdvanced)
Stage 2: Node 19 (LoraLoaderModelOnly) → Node 22 (PatchSageAttentionKJ) → Node 12 (ModelSamplingSD3) → Node 23 (ApplyTeaCache) → Node 14 (KSamplerAdvanced)
```

⚠️ CORRECTION (verified vs live JSON 2026-05-08): Stage 1's last LoRA node is Node 18 (LoraLoader), NOT Node 7. Node 7 is Stage 2's first LoRA (LoraLoaderModelOnly from UNETLoader 2). Earlier plan drafts incorrectly cited Node 7 for Stage 1 SA wiring.

Wiring changes required:
- Node 20's `model` input: `["18", 0]` (LoraLoader Stage 1 → SA) ← corrected from ["7", 0]
- Node 22's `model` input: `["19", 0]` (LoraLoaderModelOnly Stage 2 → SA)
- Node 11's `model` input: `["18", 0]` → `["20", 0]` (ModelSamplingSD3 now receives SA-patched model) ← corrected from ["7",0]→
- Node 12's `model` input: `["19", 0]` → `["22", 0]` (ModelSamplingSD3 now receives SA-patched model)
- Node 21's `model` input: `["11", 0]` (TeaCache receives ModelSamplingSD3 output)
- Node 23's `model` input: `["12", 0]` (TeaCache receives ModelSamplingSD3 output)
- Node 13's `model` input: `["11", 0]` → `["21", 0]`
- Node 14's `model` input: `["12", 0]` → `["23", 0]`

**Node 20 / 22 spec (KJNodes "Patch Sage Attention"):**
```json
"20": {
  "class_type": "PatchSageAttentionKJ",
  "inputs": {
    "model": ["18", 0],
    "sageattn_type": "sageattn_qk_int8_pv_fp16_cuda"
  }
}
```
⚠️ EXACT node spec must be verified against KJNodes source before writing JSON — class_type name and input keys may differ.

**Node 21 / 23 spec (ComfyUI-TeaCache):**
```json
"21": {
  "class_type": "ApplyTeaCache",
  "inputs": {
    "model": ["11", 0],
    "cache_device": "cuda",
    "retention_mode": true,
    "rel_l1_thresh": 0.30,
    "start_percent": 0.1,
    "max_skip_steps": 2,
    "model_type": "wan2.1_i2v_480p_14B_ret_mode"
  }
}
```
⚠️ EXACT node spec must be verified against TeaCache source — `model_type` key, `cache_device` options, and retention_mode semantics need confirming.

**AC-25**: Workflow contains `PatchSageAttentionKJ` (or correct class_type) nodes wired before both KSamplers  
**AC-26**: Workflow contains `ApplyTeaCache` (or correct class_type) nodes wired before both KSamplers  
**AC-27**: `validateWorkflow14b()` contract in comfy.js updated to include nodes 20-23 (new node IDs must pass class_type check)

---

### Part C — manual steps (not coded, done by operator)

These are one-time setup steps. Not automated. Must be done before running optimized workflow.

| Step | Where | What |
|------|--------|-------|
| MS-01 | NVIDIA Control Panel | CUDA - Sysmem Fallback Policy → **Prefer No Sysmem Fallback** |
| MS-02 | NVIDIA Control Panel | Power management mode → **Prefer Maximum Performance** (python.exe) |
| MS-03 | ComfyUI/custom_nodes | `git clone https://github.com/kijai/ComfyUI-KJNodes` |
| MS-04 | pip | Install SageAttention wheel from woct0rdho sm86 release (Python 3.10, CUDA 12.8 / cu128 build) |
| MS-05 | ComfyUI/custom_nodes | `git clone https://github.com/welltop-cn/ComfyUI-TeaCache` |
| MS-06 | First run | Check video for crosshatch/mesh artifact (driver 591.86 warning — rollback to 572.83 if seen) |

---

### Part D — GGUF Q6_K (DEFERRED — pending quality research)

**Decision pending research**: Switch from FP8 safetensors (14 GB each) to GGUF Q6_K (~11.5 GB each).

**Case for GGUF Q6_K:**
- 18% smaller per model → faster inter-stage PCIe reload
- More VRAM headroom during generation (activations, KV cache)
- On Ampere, FP8 is dequantized to FP16 anyway → GGUF Q6_K quality should be comparable (possibly better — no lossy dequant path)

**Case against / risks:**
- Requires ComfyUI-GGUF custom node
- Node schema change in workflow — `UNETLoader` → `UnetLoaderGGUF` (or whatever the node class is called)
- Workflow wiring changes may break `validateWorkflow14b()` contract
- Quality on Wan 2.2 video generation unconfirmed — research pending
- Both models still can't fit simultaneously (11.5+11.5+6.3 = 29.3 GB > 24 GB)

**Verdict**: Implement as Phase 2.6b only after quality research confirms parity. This plan (Phase 2.6) ships without GGUF.

**Note on GGUF + SageAttention**: They are NOT mutually exclusive. Community uses GGUF Q6_K + SageAttention together routinely — NLM's "lazy-dequant blocks SA benefits" claim was confabulated. Phase 2.6b = GGUF Q6_K + SA + TeaCache together is valid.

---

## BUILD ORDER

1. `main.js` Windows branch changes (AC-23, AC-24) — 15 min, trivial
2. Regression tests for new spawn changes (AC-28) — 20 min
3. Manual operator steps on PC: NVIDIA Control Panel, custom_node installs (MS-01 through MS-05) — 30 min, one-time
4. Workflow JSON surgery (AC-25, AC-26) — requires looking up exact node schemas in KJNodes + TeaCache source first
5. `validateWorkflow14b()` contract update (AC-27)
6. Full regression run — should pass 141+ (137 existing + 4 new)
7. End-to-end generation test: baseline timing first (current build), then optimized
8. Art Gate + driver artifact check (MS-06)

---

## WHAT SUCCESS LOOKS LIKE

**Baseline confirmed 2026-05-08** (wan_i2v_14b_00004.mp4):
- 44 min 06 sec for 51 steps (20+31), 832×480, ~52 sec/step avg
- FP8-on-Ampere compute ceiling — consistent across both stages
- Pipeline end-to-end confirmed clean: image copy → sampling → VAE → H.264 → report → preview

**Phase 2.6 targets:**
- Wall time: ~15-25 min with SageAttention + TeaCache (~1.8-3x speedup)
- Step reduction to 25 total (user-adjustable) brings it to ~10-15 min range
- Quality: no perceptible degradation vs unoptimized run (test SageAttention isolated first — RF-03)
- Regression tests: 141+ passing (137 existing + 4 new for AC-23/24/28)

---

---

## RED FLAGS (Opus audit + quality research — 2026-05-08)

---

### RF-01 — BLOCKING: TeaCache has no native Wan 2.2 model_type key
**Problem**: `model_type: "wan2.1_i2v_480p_14B"` does NOT exist for Wan 2.2. ComfyUI-TeaCache ships only Wan 2.1 keys. Forcing 2.1 coefficients on a 2.2 MoE model = wrong residual prediction distribution → silent quality degradation, motion freeze, or hard skip miscounts.  
**Evidence**: welltop-cn/ComfyUI-TeaCache nodes.py — no `wan2.2_*` keys.  
**Fix**: Use `model_type: "wan2.1_i2v_480p_14B_ret_mode"` (closest match), set `rel_l1_thresh: 0.30` (official ret-mode value from TeaCache README table), `start_percent: 0.1`, `retention_mode: true`. Run side-by-side comparison vs unoptimized before shipping.

---

### RF-02 — HIGH: SageAttention node placement is wrong — must be BEFORE ModelSamplingSD3
**Problem**: Plan's chain is `ModelSamplingSD3 → PatchSageAttentionKJ → TeaCache`. Patching attention AFTER sigma-rescaling can shadow the rescale on cached steps. Community guides are explicit: SageAttention must come BEFORE ModelSamplingSD3.  
**Evidence**: digitalcreativeai.net Wan 2.2 guide — "Patch Sage Attention KJ should be placed before both the High and Low branches of ModelSamplingSD3."  
**Fix**: Correct chain: `LoraLoaders → PatchSageAttentionKJ → ModelSamplingSD3 → TeaCache → KSampler`. In workflow JSON: new SageAttention nodes receive output of Node 7 / Node 19 (LoraLoaderModelOnly), NOT Node 11/12 (ModelSamplingSD3).

---

### RF-03 — HIGH: SageAttention + FP8 safetensors = documented black output failure mode
**Problem**: SageAttention Issue #221 and #277 document Wan + FP8 models producing black output under SageAttention. `sageattn_qk_int8_pv_fp16_cuda` is the "safest" kernel but black-frame reports still occur with FP8-scaled checkpoints.  
**Evidence**: thu-ml/SageAttention Issues #221, #277 (Wan 2.2 blank/static output).  
**Fix**: BEFORE wiring TeaCache, generate one test run with ONLY SageAttention active. If black frames → check KJNodes commit history for the FP8 overflow fix, or fall back to default attention. Do NOT test with both SageAttention + TeaCache simultaneously until SageAttention alone is confirmed clean.

---

### RF-04 — HIGH: `--reserve-vram 0` will crash — Electron app drives the display
**Problem**: WAN BOOTH is an Electron app. The 3090 Ti drives the WAN BOOTH window + desktop compositor (DWM). Setting reserve to 0 tells ComfyUI to consume all 24GB. When DWM hits the WDDM ceiling, NVIDIA driver enters TDR → either kills the generation or BSODs (`nvlddmkm`). Confirmed in ComfyUI Issues #6314, #12047, #12451.  
**Fix**: Use `--reserve-vram 1` (minimum safe value with desktop + Electron on same GPU). If GPU is headless second card, `--reserve-vram 0` is fine.

---

### RF-05 — HIGH: `PYTORCH_CUDA_ALLOC_CONF` deprecated + `gc_threshold` is a no-op under cudaMallocAsync
**Problem**: Two bugs: (1) `PYTORCH_CUDA_ALLOC_CONF` is deprecated in PyTorch 2.8+ — correct name is `PYTORCH_ALLOC_CONF`. (2) `garbage_collection_threshold` is ONLY honored by the `native` backend — silently ignored by `cudaMallocAsync`, which is the user's active allocator. Setting it does nothing, emits a deprecation warning every run.  
**Evidence**: PyTorch CUDA semantics docs; ComfyUI Issue #10386.  
**Fix**: Replace with `PYTORCH_ALLOC_CONF: 'expandable_segments:True'` — this IS honored by cudaMallocAsync and reduces fragmentation in long-running processes. OR skip the env var entirely (cudaMallocAsync is already optimal for this use case).

---

### RF-06 — HIGH: KJNodes PatchSageAttentionKJ has documented TypeError on ComfyUI 0.3.59+ (user is on 0.20.1)
**Problem**: KJNodes Issues #390 and #424 — `attention_sage() got an unexpected keyword argument 'transformer_options'` on ComfyUI 0.3.59+. User is on ComfyUI 0.20.1 which is past this threshold. Node may crash on first use.  
**Evidence**: kijai/ComfyUI-KJNodes Issues #390, #424.  
**Fix**: Before wiring: `git -C ComfyUI-KJNodes log --oneline | head -20` and verify a commit AFTER the #424 fix exists. If issue is unresolved on the installed version, use SpargeAttention (via ComfyUI-Attention-Optimizer) as fallback — reported compatible with Wan 2.2.

---

### RF-07 — MEDIUM: `--highvram` is counterproductive when total models (37GB) exceed VRAM (24GB)
**Problem**: `--highvram` tells ComfyUI to keep models in VRAM. With 37GB > 24GB, there's no way to honor this between stages — ComfyUI falls back to a slower "forced reload" path rather than Dynamic VRAM's intelligent management. Dynamic VRAM (default in ComfyUI 0.20.1) handles this better than `--highvram` + fallback.  
**Evidence**: blog.comfy.org Dynamic VRAM article; ComfyUI Discussion #1043.  
**Fix**: REMOVE `--highvram` from Windows spawnArgs. Let Dynamic VRAM (default) manage inter-stage eviction. Measure baseline first; only add VRAM control flags if profiling reveals >5s stage-swap overhead.

---

### RF-08 — MEDIUM: TeaCache `retention_mode:true` + non-`_ret_mode` model_type is undefined; `rel_l1_thresh` not specified
**Problem**: `retention_mode: true` activates the `_ret_mode` coefficient path. If `model_type` doesn't end in `_ret_mode`, either the flag is silently ignored OR it triggers the ret_mode path on wrong-calibrated coefficients. Both are wrong. Also: `rel_l1_thresh` is not specified in plan — default may be too aggressive (motion stutter reported in TeaCache Issue #112).  
**Evidence**: ComfyUI-TeaCache README; Issue #112.  
**Fix**: Use `model_type: "wan2.1_i2v_480p_14B_ret_mode"` WITH `retention_mode: true`. Explicitly set `rel_l1_thresh: 0.30` (official ret-mode calibration from TeaCache README) and `start_percent: 0.1`. Start `max_skip_steps: 2`, validate before raising.

---

### RF-09 — MEDIUM: Driver 591.86 mesh/crosshatch claim was CONFABULATED — real cause is different
**Problem**: The prior NLM recommendation to rollback driver 591.86 for a Wan 2.2 mesh artifact is WRONG. Quality research confirmed: the mesh artifact IS real (kijai/ComfyUI-WanVideoWrapper #1960, Comfy-Org/ComfyUI #12858) but caused by the `comfy-kitchen` CUDA backend + conv3d memory bug — NOT by driver 591.86. Driver 591.86 was pulled by NVIDIA for gaming bugs (KB5074109 interaction, black screens in specific games) that have no overlap with AI generation.  
**Evidence**: ComfyUI Issues #1960, #12858; PCGamesN reporting on 591.86 gaming pull.  
**Fix**: Do NOT rollback driver based on NLM claim. If you see mesh artifact: check ComfyUI startup log for `working around nvidia conv3d memory bug`. Your stack (standard ComfyUI, no comfy-kitchen) is NOT in the affected path. If 591.86 gaming stability is a concern separately, update to next STUDIO driver when available.

---

### RF-10 — LOW: SageAttention wheel for cu128 + PyTorch 2.11 + Python 3.10 is post4 only — install path matters
**Problem**: `pip install sageattention` will NOT work (no PyPI distribution). Wheel must come from DazzleML or woct0rdho releases. The correct wheel for your stack is SageAttention 2.2.0.post4 (cu128 + torch2.11 + ABI3 — covers Python 3.10). An ABI mismatch (wrong post, wrong CUDA build) will import without error but silently fall back to slow path or crash at runtime.  
**Evidence**: DazzleML supported_wheels.md; woct0rdho/SageAttention releases.  
**Fix**: Use DazzleML installer script from ComfyUI root directory — it auto-selects the correct wheel from the matrix. After install, verify: `python -c "from sageattention import sageattn_qk_int8_pv_fp16_cuda; print('OK')"` — if this runs clean, the CUDA backend is active and you're good.

---

## QUALITY VERDICTS (pre-coding sign-off)

| Optimization | Quality risk | Confidence | Decision |
|---|---|---|---|
| SageAttention (CUDA backend, sm86) | Very low at 37 steps | HIGH | ✅ Safe — but test isolated first (RF-03) |
| TeaCache max_skip_steps=2, thresh=0.30 (ret-mode) | Low per Voltagepark Wan 2.2 testing | MEDIUM-HIGH | ✅ Safe with correct model_type key + thresh (RF-01, RF-08). Quality check: Wan 2.2 spoofs 2.1 ret-mode coefficients — side-by-side comparison required |
| GGUF Q6_K (optional path) | Near-lossless; FP8 dequants to FP16 on Ampere anyway | MEDIUM-HIGH | ✅ Safe to test — no quality concern |
| GGUF Q4_K_M | First level with visible softness | HIGH | ⚠️ Acceptable only if VRAM requires it |
| `--highvram` | N/A | — | ❌ REMOVE from plan (RF-07) |
| `--reserve-vram 0` | Crash risk | HIGH | ❌ Change to `--reserve-vram 1` (RF-04) |

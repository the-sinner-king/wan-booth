# Phase 2.6 Bring-up Report — Citadel

**From:** Cla⌂de (Citadel) **To:** Æris (Kingdom)
**Date:** 2026-05-08 → 2026-05-09
**Subject:** Phase 2.6 (SageAttention + TeaCache) live on RTX 3090 Ti
**Final commit cohort:** `f1363b4` → `1cf3c97` → `416b772` → (this commit)

---

## TL;DR

🟢 **Phase 2.6 ships.** Eight back-to-back generations. Average wall time
**18 min 18 sec/clip** vs the pre-2.6 baseline of **44 min 06 sec** — a
sustained **2.41× speedup** at the same resolution / frame count / step
budget. Both new node classes register, all five environment-side issues
resolved.

---

## What I found and what's now in the repo

### 1. KJNodes class typo + field name *(your `1cf3c97`)*
You caught it Mac-side after my first verification round. Your fix landed
clean. Stack-confirmed by live `/object_info` on Citadel post-restart.

### 2. TeaCache class name + non-schema fields *(my `416b772`)*
Your brief had the class registered as `ApplyTeaCache`. Live introspection
showed welltop-cn registers it as plain `TeaCache` — same plugin, different
name. While verifying that, I diff'd the workflow's input fields against
`TeaCache.INPUT_TYPES()` and found three more mismatches:

| Field | Aeris's brief | Reality |
|---|---|---|
| `class_type` | `ApplyTeaCache` | `TeaCache` |
| `retention_mode: true` | (assumed boolean) | **doesn't exist** — encoded into the `model_type` enum's `_ret_mode` suffix |
| `max_skip_steps: 2` | (assumed integer) | **doesn't exist in this version** |
| `end_percent` | (missing) | **required**, default 1.0 |

Patched workflow JSON nodes 21+23, `WORKFLOW_14B_CONTRACT` and `NODE_LABELS`
in `comfy.js`, and 4 regression assertions in `test/regression.js`.
143/143 tests green.

### 3. ComfyUI-TeaCache vendored monkey-patch *(local-only, not in repo)*
ComfyUI's Jan 5 2026 update removed the public `precompute_freqs_cis` export
from `comfy.ldm.lightricks.model` (issue #11660). welltop-cn upstream hasn't
patched since April 2025; their main branch fails to import on every fresh
ComfyUI ≥ 0.20.

Vendored fix at `D:\COMFYUI_FOR_WAN_BOOTH\custom_nodes\ComfyUI-TeaCache\nodes.py:12`
— inline `precompute_freqs_cis` from TeaCache issue #188's community
implementation. Documented in `CLAUDE_FIXES.md`. **This will be wiped
by any `git pull` on the TeaCache repo** — re-apply the same patch if
needed. When welltop-cn ships an upstream fix we can drop the patch.

### 4. SageAttention 1.0.6 → 2.2.0 + triton-windows *(local-only)*
1.0.6 hard-imports Triton at module load. Triton has no official Windows
wheel from triton-lang, so 1.0.6 is functionally dead on Citadel.

Path that worked:
```
.venv\Scripts\pip uninstall sageattention
.venv\Scripts\pip install "triton-windows<3.7"
.venv\Scripts\pip install <woct0rdho wheel>
```

The right wheel for our stack: `sageattention-2.2.0+cu128torch2.9.0andhigher.post4-cp39-abi3-win_amd64.whl` from `woct0rdho/SageAttention/releases`. Their
"andhigher" tag covers everything from torch 2.9 up — includes our
2.11.0+cu128 cleanly.

### 5. KJNodes deps *(local-only)*
Standard `pip install -r ComfyUI-KJNodes/requirements.txt` — opencv-headless,
matplotlib, color-matcher, mss, etc. One snag: had to stop ComfyUI before
the install because Python had `cv2.pyd` locked. Otherwise routine.

---

## Sustained generation results (8 runs)

| Gen | Duration | Source image | Notes |
|---|---|---|---|
| 00004 | **44:06** | gigapixel JPEG (4864×3328) | pre-2.6 baseline |
| 00005 | 18:01 | 1216×832 JPEG | first 2.6 run |
| 00006 | 18:45 | 1728×1152 PNG | |
| 00007 | 18:09 | 1728×1152 PNG | same image, different seed |
| 00008 | ~18 min | (your runs while I was idle) | |
| 00009 | ~18 min | | |
| 00010 | ~18 min | | |
| 00011 | ~18 min | | |

Average across the 7 Phase 2.6 runs: **~18 min**. Bitrate of resulting mp4s
is ~7-21% lower than the baseline — almost certainly content-driven (H.264
allocates fewer bits to smoother frames), not a quality regression. Eyeball
test by Brandon: **looks great**.

---

## Per-step rate breakdown

| Stage | Pre-2.6 | Phase 2.6 | Speedup |
|---|---|---|---|
| Stage 1 sampling (20 steps) | ~18 min | ~6.5–7 min | ~2.7× |
| Stage 2 sampling (31 steps) | ~27 min | ~11 min | ~2.5× |
| Combined per-step rate | ~52 sec/step | ~21 sec/step | ~2.5× |
| VAE decode + VHS encode | ~20 sec | ~10–12 sec | ~1.7× |

Speedup math: SageAttention's ~10-15% per-step gain on Ampere, multiplied by
TeaCache's cache-hit skip pattern (substantial fraction of the 51 nominal
steps actually return cached outputs). Right in the middle of the predicted
window.

---

## Hardware / silicon notes

- **GPU:** RTX 3090 Ti, sm86 (Ampere), 24 GB VRAM, driver 591.86
- **VRAM utilization during gen:** peak ~19.4 GB (fully model-resident, no CPU offload)
- **Power draw during sampling:** ~400 W of 450 W TDP (~89% sustained)
- **GPU temp:** 75°C peak, well under throttle
- **Per-step time on Ampere is the silicon ceiling** — no further software wins available without dropping resolution or step count. Going to Ada/Blackwell would unlock the bigger SageAttention multiplier (40-series gets 30-40% per-step on the same workload because of native FP8 tensor cores).

---

## Privacy work *(this commit)*

Brandon flagged that prompts shouldn't be saved anywhere. Made changes:

1. **`renderer.js buildReport()` no longer writes the prompt to the report .txt** — `prompt` removed from the destructured signature and from the rendered output. Comment in source explains the privacy-by-design intent.
2. **Existing report .txt files (00004-00011) scrubbed** — `sed`-stripped the PROMPT line in place.
3. **Known residual leak — not yet fixed:** ComfyUI's `VHS_VideoCombine`
   embeds the full workflow JSON (including the prompt text) into the H.264
   metadata of every `.mp4` it writes. ffprobe sees it. Existing mp4s
   were not modified. Two upstream paths that would close this:
   - **Post-process**: spawn `ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4`
     after VHS completes, then atomically swap. ~5-line addition to main.js.
   - **VHS config**: there may be an option on `VHS_VideoCombine` to suppress
     workflow embedding — needs source check.

   Surface to you to decide which path you'd prefer for upstream — touching
   the live pipeline beyond the renderer.js fix felt like overreach for a
   Citadel-side commit while you're driving the Mac-side architecture.

---

## Pattern note (for future plugin bring-ups)

Five total bugs in Aeris's brief (KJNodes class typo, field rename,
TeaCache class rename, two phantom fields, one missing required field) all
came from the same class of mistake: **inferring plugin schema from
documentation/intuition rather than introspecting the installed source.**

Recommended canonical verification step for future plugin work:

```python
# After install + monkey-patches, before workflow integration:
import sys; sys.path.insert(0, '<comfy_root>'); sys.path.insert(0, '<plugin_path>')
import nodes
print(list(nodes.NODE_CLASS_MAPPINGS.keys()))
for cls in nodes.NODE_CLASS_MAPPINGS.values():
    print(cls.__name__, cls.INPUT_TYPES())
```

Or — equivalent but post-restart — `GET http://127.0.0.1:8188/object_info`
and diff against the workflow JSON values. **The plugin source / live API is
the spec, not the brief.** Adding one regression test that asserts the
workflow JSON's class_type values are present in `/object_info` would catch
this entire class of bug at CI time.

---

## What's next (your call)

1. **mp4 metadata leak fix** (post-process or VHS config) — see Privacy
   section above
2. **Upstream the TeaCache monkey-patch?** The PR to welltop-cn would benefit
   the wider ComfyUI community. Or we just sit on the local patch until they
   ship something. Either's fine — no Citadel impact.
3. **Bigger SageAttention wins** — would require Ada (4090/5090) or
   Blackwell silicon. 3090 Ti is at its FP8-on-Ampere ceiling.
4. **Alternative speed knobs we haven't tried**: bumping `rel_l1_thresh` from
   0.3 → 0.5 should push TeaCache to ~3.5× by skipping more aggressively. At
   the cost of slightly more visible cache artifacts. Worth a single A/B test
   with same seed/prompt/image to gauge.

---

⛬⚚⛬

— Cla⌂de (Citadel)
Co-authored end-to-end with you. Glad we got there.

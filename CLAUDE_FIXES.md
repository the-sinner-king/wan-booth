# Claude Fixes — WAN BOOTH

> Running log of bugs found by Citadel-Cla⌂de during PC port + ongoing testing.
> Each entry: what broke, why, the patch, what changed.
> Goal: keep moving while Aeris merges these upstream Mac-side.

---

## 2026-05-08

### BUG #1 — `copyToInput` ignored `COMFYUI_DIR` (image never reached ComfyUI)

**Symptom:** First generation attempt failed at validation:
```
ComfyUI rejected prompt [400]:
"image - Invalid image file: <filename>"
node 5 (LoadImage) — custom_validation_failed
```

**Root cause:** `app/main.js` line 128 had a Mac-default hardcoded path:
```js
const comfyInputDir = path.join(os.homedir(), 'Desktop', 'ComfyUI', 'input');
```

Aeris's platform-adaptive patch (commit `ae411cc`) correctly added a
`COMFYUI_DIR` env-var override to `startComfyUI()`, but missed this
parallel hardcoded path in the `wan:copyToInput` IPC handler.

On Citadel (`COMFYUI_DIR=D:\COMFYUI_FOR_WAN_BOOTH`):
- ComfyUI reads from `D:\COMFYUI_FOR_WAN_BOOTH\input\`
- main.js copied to `C:\Users\brand\Desktop\ComfyUI\input\` (auto-created phantom)
- ComfyUI saw nothing → "Invalid image file"

**Patch:**
```js
// app/main.js line 128
const comfyDir = process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
const comfyInputDir = path.join(comfyDir, 'input');
```

**Files changed:** `app/main.js`

---

### BUG #2 — `writeReport` ignored `COMFYUI_DIR` (export reports went to phantom dir)

**Symptom:** Not yet observed (would have surfaced after first successful gen).
Found via post-fix grep for the same class of bug.

**Root cause:** Same Mac-default hardcoded path, second site —
`app/main.js` line 191 in the `wan:writeReport` IPC handler:
```js
const outputDir = path.join(os.homedir(), 'Desktop', 'ComfyUI', 'output');
```

Aeris's S259 export-report feature would have written `<video>_report.txt`
to `C:\Users\brand\Desktop\ComfyUI\output\` instead of next to the actual
video at `D:\COMFYUI_FOR_WAN_BOOTH\output\`.

**Patch:**
```js
// app/main.js line 191
const comfyDir = process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
const outputDir = path.join(comfyDir, 'output');
```

**Files changed:** `app/main.js`

---

### BUG #3 — Renderer video preview pointed at phantom path

**Symptom:** Not yet observed (would have shown a broken `<video>` after
generation completed).
Found via post-fix grep for the same class of bug.

**Root cause:** `app/renderer.js` line 445 constructed the video preview
URL using a homedir + Mac-default suffix, with no env-var awareness:
```js
const outputPath = homedir + '/Desktop/ComfyUI/output/' + outputFilename;
```

Renderer is sandboxed from `process.env`, so this needed a new IPC bridge.

**Patch:** added a new IPC `wan:getComfyDir` so the renderer can resolve
the same path the main process resolves:

`app/main.js` — new handler:
```js
ipcMain.handle('wan:getComfyDir', async () => {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
});
```

`app/preload.js` — exposed via `window.wan`:
```js
getComfyDir: () => ipcRenderer.invoke('wan:getComfyDir'),
```

`app/renderer.js` — line 445 rewrite:
```js
const comfyDir   = await window.wan.getComfyDir();
const outputPath = comfyDir + '/output/' + outputFilename;
```

**Files changed:** `app/main.js`, `app/preload.js`, `app/renderer.js`

---

### Verification after Bugs #1-3

- `node test/regression.js` → PASS 137/137 (no contract regressions)
- App relaunched, full generation pipeline tested end-to-end
- `D:\COMFYUI_FOR_WAN_BOOTH\input\` receives dropped images
- `D:\COMFYUI_FOR_WAN_BOOTH\output\` receives both video + report .txt
- Video preview in renderer loads from real path

---

### Pattern note for Aeris

All three bugs are the same pattern: hardcoded `os.homedir() + 'Desktop' + 'ComfyUI'`.
Suggest factoring `getComfyDir()` into a single helper in `main.js` — both IPC
handlers (`copyToInput`, `writeReport`, `getComfyDir`) would call it once.
Renderer would only need the IPC bridge. Three call sites collapse to one source
of truth, future bugs of this class become impossible by construction.

```js
// proposed helper at top of main.js
function getComfyDir() {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
}
```

(Left as-is for this round — surgical fixes only. Refactor noted for next pass.)

> **Update 2026-05-08 PM:** Aeris adopted this refactor — `getComfyDir()` helper
> now lives in main.js (commit `f1363b4`) and is reused across the spawn,
> copy, write-report, and IPC sites.

---

## 2026-05-08 PM — Phase 2.6 bring-up (SageAttention + TeaCache)

### BUG #4 — TeaCache class registered as `TeaCache`, not `ApplyTeaCache`

**Symptom:** Phase 2.6 workflow nodes 21+23 fail to dispatch — "node class not found."

**Root cause:** Aeris's brief specified `class_type: "ApplyTeaCache"`, but the
welltop-cn ComfyUI-TeaCache plugin registers the class as plain `TeaCache` in
its NODE_CLASS_MAPPINGS. Confirmed by introspecting the live `/object_info` API
after restart.

The brief also included two fields that don't exist in the schema:
- `retention_mode: true` — no such field. Retention mode is encoded into the
  `model_type` enum value (`*_ret_mode` suffix).
- `max_skip_steps: 2` — no such field.

And was missing one required field:
- `end_percent` — required, default 1.0.

**Patch:** updated workflow JSON nodes 21+23, `WORKFLOW_14B_CONTRACT` and
`NODE_LABELS` in `comfy.js`, and 4 regression assertions in `test/regression.js`.

```jsonc
// nodes 21+23 — final shape
{
  "class_type": "TeaCache",
  "inputs": {
    "model":         [ "11", 0 ],   // or ["12", 0] for node 23
    "cache_device":  "cuda",
    "rel_l1_thresh": 0.3,
    "start_percent": 0.1,
    "end_percent":   1.0,
    "model_type":    "wan2.1_i2v_480p_14B_ret_mode"
  }
}
```

**Files changed:** `app/workflows/i2v_14B_2stage.json`, `app/comfy.js`,
`test/regression.js`. Regression: PASS 143/143.

---

## INSTALL OPS — Phase 2.6 bring-up on Citadel

These are environment-side ops that don't go in the wan-booth repo (they
modify the local ComfyUI install). Documented here so future-Cla⌂de or
Brandon can replay or roll back.

### IO #1 — Custom node clones (D:\COMFYUI_FOR_WAN_BOOTH\custom_nodes\)
```
git clone https://github.com/kijai/ComfyUI-KJNodes
git clone https://github.com/welltop-cn/ComfyUI-TeaCache
```

### IO #2 — TeaCache vendored fix (monkey-patch)

ComfyUI's Jan 5 2026 update (issue #11660) removed the public
`precompute_freqs_cis` export from `comfy.ldm.lightricks.model`. welltop-cn
upstream hasn't shipped a fix since April 2025. Inline community
implementation pasted into nodes.py line 12, replacing the broken import:

```python
def precompute_freqs_cis(coords, dim, out_dtype):
    theta = 1.0 / (10000 ** (torch.arange(0, dim, 2, device=coords.device, dtype=torch.float32) / dim))
    freqs = torch.einsum('... , d -> ... d', coords.flatten(1, -2).to(torch.float32), theta)
    freqs = freqs.view(*coords.shape[:-1], -1)
    return torch.polar(torch.ones_like(freqs), freqs.to(out_dtype))
```

File: `D:\COMFYUI_FOR_WAN_BOOTH\custom_nodes\ComfyUI-TeaCache\nodes.py:12`

When welltop-cn ships a fix, revert by `git pull` on that repo.

### IO #3 — Pip installs into D:\COMFYUI_FOR_WAN_BOOTH\.venv

| Step | Command | Why |
|---|---|---|
| 3.1 | `pip install -r ComfyUI-KJNodes/requirements.txt` | KJNodes deps (opencv-python-headless, matplotlib, color-matcher, mss, etc.) |
| 3.2 | `pip install -r ComfyUI-TeaCache/requirements.txt` | TeaCache deps (diffusers 0.38.0, safetensors 0.7.0 → 0.8.0rc0) |
| 3.3 | `pip uninstall sageattention` | 1.0.6 was DOA — hard-imports Triton at module load |
| 3.4 | `pip install "triton-windows<3.7"` | triton-lang has no Windows wheel; this is the community fork |
| 3.5 | install `sageattention-2.2.0+cu128torch2.9.0andhigher.post4-cp39-abi3-win_amd64.whl` from `woct0rdho/SageAttention/releases` | pre-built CUDA-128 wheel for torch 2.9.0+ (covers our 2.11.0+cu128) |

Pre-install pip freeze snapshot saved to `_temp_preinstall_pip_freeze.txt` for
diff/rollback reference (not committed — `_temp_*` per Vaporize Protocol).

### Notes on RTX 3090 Ti (Ampere / sm86) and SageAttention

The wheel installs and imports cleanly. Speedup will be modest:
- Ampere uses legacy kernels (~10-15% per-step gain)
- Ada Lovelace (sm89+) needed for the bigger 30-40% gains
- Combined with TeaCache's ~2.3× skip multiplier, expect total gen time
  ~12-25 min (vs the 44 min pre-Phase-2.6 baseline)

---

## Pattern note (post-Phase-2.6)

Three of the four bugs we hit (`COMFYUI_DIR` ×3 sites) and (`PathchSageAttentionKJ`
typo, `sage_attention` field rename, `TeaCache` class rename, deleted-fields,
missing-`end_percent`) all came from the same class of mistake: **assumed
plugin/path identifiers without verifying against the live `/object_info`
API or the installed source.**

For future plugin-bringup ops, the canonical verification step should be:

```python
# In the venv, after installing the plugin and any monkey-patches:
import sys; sys.path.insert(0, '<comfy_root>'); sys.path.insert(0, '<plugin_path>')
import nodes
print(nodes.NODE_CLASS_MAPPINGS.keys())             # actual class names
for cls in nodes.NODE_CLASS_MAPPINGS.values():
    print(cls.__name__, cls.INPUT_TYPES())          # actual fields
```

Or, post-restart, query `http://127.0.0.1:8188/object_info` and diff against
the workflow JSON values. Either way: **the plugin source is the spec, not
the brief.**


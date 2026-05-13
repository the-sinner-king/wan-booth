# WAN BOOTH Phase 2.6 — BUILD BRIEF
## KOMMANDANT Mission Package · Session S259

**Project slug**: `wan-booth-phase26`  
**Project directory**: `/Users/brandonmccormick/Desktop/THE_THRONE/AExMUSE/04_📦_PROJECTS/PROJECT_VENUS_FLYTRAP/WAN_BOOTH`  
**BLACKBOARD**: `[project_dir]/BLACKBOARD.json`  
**FLEET_INDEX**: `/Users/brandonmccormick/Desktop/Claude's House/01_⚡_ACTIVE/SOULFORGE_3.5/FLEET_INDEX.md`  
**Authoritative spec**: `[project_dir]/PHASE_2_6_PLAN.md`  
**Session**: S259  

---

## WHAT WE'RE BUILDING

WAN BOOTH is an Electron 28 app wrapping ComfyUI headless at localhost:8188. It drives a 2-stage Wan 2.2 14B i2v video generation pipeline on an RTX 3090 Ti (Ampere GA102, CC 8.6, 24GB VRAM). The Phase 2.6 build makes targeted performance and correctness improvements across three files:

1. **`app/main.js`** — Windows ComfyUI spawn configuration
2. **`app/workflows/i2v_14B_2stage.json`** — Insert SageAttention + TeaCache nodes into workflow
3. **`app/comfy.js`** — Update workflow contract validation for new nodes
4. **`app/test/regression.js`** — Expand regression suite to cover new behaviors

**Baseline**: 44 min for 51 steps at 832×480.  
**Phase 2.6 target**: ~15-25 min with SageAttention + TeaCache (~1.8-3x speedup, Ampere-calibrated).

---

## SCOPE IN

- 6 acceptance criteria: AC-23 through AC-28 (defined below)
- Bonus item: `getComfyDir()` helper refactor in main.js (collapse 4 inline duplicates)
- No UI changes. No new IPC channels. No changes to preload.js or index.html.
- No changes to the workflow node count outside of adding nodes 20-23.

## SCOPE OUT

- GGUF Q6_K model format — deferred to Phase 2.6b
- Manual operator steps (NVIDIA Control Panel, KJNodes/TeaCache installs) — not automated
- Any frontend/renderer changes
- Any changes to 5B workflow or other workflow files
- Any schema changes to BLACKBOARD or IPC protocol

---

## ACCEPTANCE CRITERIA

| ID | Criterion | Target file |
|----|-----------|------------|
| AC-23 | Windows spawnArgs contains `--reserve-vram 1` and does NOT contain `--highvram` | `app/main.js` |
| AC-24 | Windows spawn env contains `PYTORCH_ALLOC_CONF: 'expandable_segments:True'` | `app/main.js` |
| AC-25 | Workflow contains `PatchSageAttentionKJ` (or correct class_type) nodes wired before both ModelSamplingSD3 nodes, after the last LoRA in each stage | `app/workflows/i2v_14B_2stage.json` |
| AC-26 | Workflow contains `ApplyTeaCache` (or correct class_type) nodes wired after ModelSamplingSD3, before both KSamplerAdvanced nodes | `app/workflows/i2v_14B_2stage.json` |
| AC-27 | `validateWorkflow14b()` contract in comfy.js updated — nodes 20-23 added to WORKFLOW_14B_CONTRACT; `PatchSageAttentionKJ` and `ApplyTeaCache` added to NODE_LABELS | `app/comfy.js` |
| AC-28 | 4+ new regression tests covering AC-23, AC-24, and new workflow node contract. All 141+ pass (137 existing + 4 new). | `app/test/regression.js` |

---

## ROUTING REQUIREMENTS

These are the 5 distinct build intents. Every one must trace to a drone or be explicitly scoped.

**RR-01 — Windows spawn config** (main.js)  
Change the `else` branch of `startComfyUI()` to push `--reserve-vram 1` (not 0, not absent) and NOT push `--highvram`. Change Windows env block from `PYTORCH_MPS_HIGH_WATERMARK_RATIO` (Mac-only) to include `PYTORCH_ALLOC_CONF: 'expandable_segments:True'` on Windows. Covers AC-23 and AC-24.

**RR-02 — Workflow JSON surgery** (i2v_14B_2stage.json)  
Insert 4 new nodes (20-23) into the workflow and rewire 4 existing node inputs. SageAttention nodes must be wired BEFORE ModelSamplingSD3; TeaCache nodes must be wired AFTER ModelSamplingSD3. Detailed wiring spec is in the TECHNICAL SPEC section below. Covers AC-25 and AC-26.

**RR-03 — Contract validation update** (comfy.js)  
`WORKFLOW_14B_CONTRACT` must be extended with nodes 20-23. `NODE_LABELS` must include human-readable labels for `PatchSageAttentionKJ` and `ApplyTeaCache`. The `validateWorkflow14b()` function itself needs no logic changes — only the constant object needs updating. Covers AC-27.

**RR-04 — Regression test expansion** (regression.js)  
Add 4+ new tests following the existing pattern. Tests must cover: (a) `--reserve-vram 1` present in Windows spawn, (b) `--highvram` absent from all spawn paths, (c) `PYTORCH_ALLOC_CONF` present in Windows env, (d) nodes 20-23 present in WORKFLOW_14B_CONTRACT. Covers AC-28.

**RR-05 — getComfyDir() helper** (main.js)  
The expression `process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI')` appears 4 times in main.js. Extract to a top-level helper function `getComfyDir()`. Replace all 4 occurrences. Bonus item — no AC number, but a clean code requirement. Same file as RR-01.

---

## TECHNICAL SPEC — EXACT CHANGES REQUIRED

### RR-01/RR-05: main.js

**Current spawn block (lines ~65-76):**
```js
const spawnArgs = ['main.py', '--listen', '127.0.0.1'];
if (isMac) spawnArgs.push('--bf16-unet');
comfyProcess = spawn(pythonPath, spawnArgs, {
  cwd: comfyDir,
  env: {
    ...process.env,
    ...(isMac ? { PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.7' } : {}),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false,
});
```

**Target spawn block:**
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
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false,
});
```

**getComfyDir() helper** — add near top of file, after the debug logger and before `createWindow`:
```js
function getComfyDir() {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
}
```
Replace all 4 occurrences of the inline expression with `getComfyDir()`.

---

### RR-02: i2v_14B_2stage.json

**CURRENT node chain (verified from live JSON 2026-05-08):**
```
Stage 1 (high noise): UNETLoader(1) → LoraLoader(6) → LoraLoader(18) → ModelSamplingSD3(11) → KSamplerAdvanced(13)
Stage 2 (low noise):  UNETLoader(2) → LoraLoaderModelOnly(7) → LoraLoaderModelOnly(19) → ModelSamplingSD3(12) → KSamplerAdvanced(14)
```

**TARGET node chain:**
```
Stage 1: ... LoraLoader(18) → PatchSageAttentionKJ(20) → ModelSamplingSD3(11) → ApplyTeaCache(21) → KSamplerAdvanced(13)
Stage 2: ... LoraLoaderModelOnly(19) → PatchSageAttentionKJ(22) → ModelSamplingSD3(12) → ApplyTeaCache(23) → KSamplerAdvanced(14)
```

**WIRING CHANGES (inputs that must change):**
```
Node 11 model: ["18", 0]  →  ["20", 0]   (ModelSamplingSD3 S1 receives SA-patched model)
Node 12 model: ["19", 0]  →  ["22", 0]   (ModelSamplingSD3 S2 receives SA-patched model)
Node 13 model: ["11", 0]  →  ["21", 0]   (KSamplerAdvanced S1 receives TeaCached model)
Node 14 model: ["12", 0]  →  ["23", 0]   (KSamplerAdvanced S2 receives TeaCached model)
```

**NEW NODES to INSERT:**

Node 20 (PatchSageAttentionKJ — Stage 1 SA):
```json
"20": {
  "class_type": "PatchSageAttentionKJ",
  "inputs": {
    "model": ["18", 0],
    "sageattn_type": "sageattn_qk_int8_pv_fp16_cuda"
  }
}
```
⚠️ `sageattn_type` value and exact `inputs` keys MUST be verified against KJNodes source (`ComfyUI-KJNodes/nodes.py`). The field name may differ. Read the NODE_CLASS_MAPPINGS entry for `PatchSageAttentionKJ` before finalizing.

Node 21 (ApplyTeaCache — Stage 1 TeaCache):
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
⚠️ `class_type`, `inputs` keys, and `model_type` values MUST be verified against ComfyUI-TeaCache source (`nodes.py`). Especially: `retention_mode` field name, `cache_device` options, and whether `model_type` is a required vs optional field.

Node 22 (PatchSageAttentionKJ — Stage 2 SA):
```json
"22": {
  "class_type": "PatchSageAttentionKJ",
  "inputs": {
    "model": ["19", 0],
    "sageattn_type": "sageattn_qk_int8_pv_fp16_cuda"
  }
}
```

Node 23 (ApplyTeaCache — Stage 2 TeaCache):
```json
"23": {
  "class_type": "ApplyTeaCache",
  "inputs": {
    "model": ["12", 0],
    "cache_device": "cuda",
    "retention_mode": true,
    "rel_l1_thresh": 0.30,
    "start_percent": 0.1,
    "max_skip_steps": 2,
    "model_type": "wan2.1_i2v_480p_14B_ret_mode"
  }
}
```

**POLECAT NOTE**: The custom node source files will not be present on the Mac where this code runs — they live on the Windows RTX PC. Write the JSON spec using the class_type strings from the PHASE_2_6_PLAN.md documentation and the wiring spec above. Include a `// VERIFY BEFORE FIRST RUN` comment at the top of the JSON (or in a companion .md stub) noting which fields need operator verification on the PC before first run. The JSON must be syntactically valid. The class_type strings must be treated as correct as specified unless you have specific evidence to the contrary.

---

### RR-03: comfy.js — WORKFLOW_14B_CONTRACT and NODE_LABELS

**Current WORKFLOW_14B_CONTRACT:**
```js
const WORKFLOW_14B_CONTRACT = {
  '6':  'LoraLoader',
  '7':  'LoraLoaderModelOnly',
  '13': 'KSamplerAdvanced',
  '14': 'KSamplerAdvanced',
  '17': 'VHS_VideoCombine',
  '18': 'LoraLoader',
  '19': 'LoraLoaderModelOnly',
};
```

**Target WORKFLOW_14B_CONTRACT (add 4 entries):**
```js
const WORKFLOW_14B_CONTRACT = {
  '6':  'LoraLoader',
  '7':  'LoraLoaderModelOnly',
  '13': 'KSamplerAdvanced',
  '14': 'KSamplerAdvanced',
  '17': 'VHS_VideoCombine',
  '18': 'LoraLoader',
  '19': 'LoraLoaderModelOnly',
  '20': 'PatchSageAttentionKJ',
  '21': 'ApplyTeaCache',
  '22': 'PatchSageAttentionKJ',
  '23': 'ApplyTeaCache',
};
```

**NODE_LABELS additions** (add after `'LoraLoaderModelOnly'` entry):
```js
'PatchSageAttentionKJ': 'Patching SageAttention',
'ApplyTeaCache':        'Applying TeaCache',
```

No changes to `validateWorkflow14b()` logic — only the constant objects.

---

### RR-04: regression.js — New Tests

The current test file (137 tests passing) uses a pattern like source-text assertions on `main.js`. Add 4+ tests:

1. **AC-23a**: Windows spawnArgs contains `--reserve-vram` followed by `1`
2. **AC-23b**: Windows spawnArgs does NOT contain `--highvram`
3. **AC-24**: Windows spawn env contains `PYTORCH_ALLOC_CONF` with value `expandable_segments:True`
4. **AC-27**: `WORKFLOW_14B_CONTRACT` source text includes all 4 new node IDs (`'20'`, `'21'`, `'22'`, `'23'`)

Follow the existing test file's pattern exactly (read the current test file structure first).

---

## SYSTEM CONTEXT

**Stack**: Electron 28, Node.js, CommonJS (`require()`). No TypeScript. No bundler.  
**Platform target**: Windows (RTX 3090 Ti PC). Mac code path must remain untouched.  
**ComfyUI version**: 0.20.1  
**PyTorch**: 2.11.0+cu128  
**Active VRAM allocator**: `cudaMallocAsync`  

**IMPORTANT — Why `--reserve-vram 1` not 0:**  
WAN BOOTH Electron app drives the display on the SAME 3090 Ti. `--reserve-vram 0` consumes all 24GB → WDDM hits ceiling → TDR crash (`nvlddmkm.sys`). Must keep 1GB reserved for display driver.

**IMPORTANT — Why `PYTORCH_ALLOC_CONF` not `PYTORCH_CUDA_ALLOC_CONF`:**  
`PYTORCH_CUDA_ALLOC_CONF` is deprecated in PyTorch 2.8+. The correct env var is `PYTORCH_ALLOC_CONF`. `garbage_collection_threshold` is a no-op under `cudaMallocAsync` (user's active allocator). Use `expandable_segments:True` — honored by cudaMallocAsync.

**IMPORTANT — Stage 1 node chain correction:**  
The plan originally said Stage 1 SA node receives model from Node 7 (`["7", 0]`). This was WRONG. Verified from live JSON: Stage 1's last LoRA is Node 18 (LoraLoader). Node 7 is Stage 2's first LoRA. Correct Stage 1 SA wiring: `model: ["18", 0]`.

---

## FILE MAP

| File | Action | Polecat |
|------|--------|---------|
| `app/main.js` | Edit: Windows spawn + getComfyDir() helper | A |
| `app/workflows/i2v_14B_2stage.json` | Edit: 4 new nodes + 4 wiring changes | B |
| `app/comfy.js` | Edit: WORKFLOW_14B_CONTRACT + NODE_LABELS | C |
| `app/test/regression.js` | Edit: 4+ new tests | C |

**DO NOT TOUCH:**
- `app/preload.js`
- `app/index.html`
- `app/renderer.js` (if present)
- Any `*_5b*` workflow files
- `PHASE_2_6_PLAN.md` (authoritative spec — read-only for Polecats)
- `NORTH_STAR.md`

---

## VALIDATION

After build: `node app/test/regression.js` must print 141+ passing, 0 failing.  
The 4 new tests must be present and passing (not skipped).  
No existing test may be broken.

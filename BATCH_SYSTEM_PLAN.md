# WAN BOOTH — BATCH SYSTEM PLAN

**Soulforge RESEARCH output — S258 continuation**  
**Status: READY TO CODE**

---

## The Core Mental Model

DIAL MODE and PRODUCTION MODE are not parallel alternatives. They are two phases of the same workflow:

```
DIAL (find settings) → PRODUCTION (run at scale with those settings)
```

You don't use them independently. You DIAL to find the sweet spot on one image, then commit those settings to a PRODUCTION run. The codebase must make this flow explicit — when a DIAL run completes, the winning settings should be promotable directly to a PRODUCTION job queue with one click.

This mental model resolves several architectural tensions in the two modes. The design decisions below flow from it.

---

## Prerequisite Fix: LoRA Injection Gap

**This must be fixed first. Nothing else works without it.**

### Current state (bug)

`comfy.js` `injectPlaceholders()` only handles 3 placeholders:
- `{{IMAGE_PATH}}` → node 5 `inputs.image`
- `{{PROMPT}}` → node 8 `inputs.text`
- `{{SEED}}` → node 13 `inputs.noise_seed`

The LoRA strength sliders in the UI exist, `getLoraValues()` collects them, they get passed to `ComfyClient.generate()` as `loraValues` — but **comfy.js does not destructure or inject them**. The workflow always runs with hardcoded `strength_model: 0.8` on all 4 LoRA nodes. The sliders are decorative.

### The fix

`injectPlaceholders()` needs to accept `loraValues` and inject into these nodes:

```
Node 6  — LoraLoader (DR34ML4Y HIGH)         → strength_model, strength_clip = stage1.dr34mlayStr
Node 7  — LoraLoaderModelOnly (DR34ML4Y LOW) → strength_model               = stage2.dr34mlayStr
Node 18 — LoraLoader (k3nk HIGH)             → strength_model, strength_clip = stage1.k3nkStr
Node 19 — LoraLoaderModelOnly (k3nk LOW)     → strength_model               = stage2.k3nkStr
Node 13 — KSamplerAdvanced (Stage 1)         → cfg                          = stage1.cfg
                                               end_at_step                  = stage1.steps
Node 14 — KSamplerAdvanced (Stage 2)         → cfg                          = stage2.cfg
                                               start_at_step                = stage1.steps  ← must match Stage 1
```

**Step split invariant**: Both KSampler nodes use `steps: 51` total. The split is controlled by `end_at_step` (Stage 1) and `start_at_step` (Stage 2). **These must always be equal.** If they diverge by even one, ComfyUI expects Stage 2 to start at a noise level it wasn't given, producing artifacts. `injectPlaceholders()` must set both from `stage1.steps` — there is no separate `stage2.steps`. The `s2-steps` slider in the current UI is architecturally wrong and should be removed in the same coding session.

**`comfy.js` signature change:**
```js
// Before:
async function generate({ imagePath, prompt, seed, workflowName, onProgress, onComplete, onError, onLog })

// After:
async function generate({ imagePath, prompt, seed, workflowName, loraValues, filenamePrefix, onProgress, onComplete, onError, onLog })
```

---

## The Seed Architecture Tension (Resolved)

DIAL MODE and PRODUCTION MODE have opposite seed requirements:

| Mode | Seed requirement | Reason |
|------|-----------------|--------|
| DIAL | **Fixed — same seed for every job in the grid** | You're isolating parameter effects. If each job uses a different seed, you can't know whether a better result is from the CFG change or the seed change. The seed is a confound that must be held constant. |
| PRODUCTION | **Varied — different seed per job** | You want diverse outputs from the same settings. Seed variation IS the point. |

This is not a stylistic preference — DIAL MODE with varied seeds produces uninterpretable results. A researcher who tests CFG 3.0 with seed 9847263 and CFG 6.0 with seed 1234567 has not run a parameter sweep. They've run two random generations.

**Architecture decision**: DIAL MODE takes a single `dialSeed` (random by default, user can lock it) and stamps it on every job in the grid. PRODUCTION MODE generates a seed per job.

The shared batch runner `runBatch()` doesn't need to know which strategy is in use — by the time it receives the job array, each job's `seed` field is already resolved. The seed strategy is entirely upstream, in `buildDialJobs()` vs. `buildProdJobs()`.

---

## Shared Batch Runner Logic

Both modes use the same sequential runner. ComfyUI's queue is naturally serial (FIFO, one job at a time) — we feed it N jobs sequentially.

```js
async function runBatch(jobs, imagePath, prompt) {
  batchActive   = true;
  batchQueue    = jobs;
  batchJobIndex = 0;
  
  for (const job of jobs) {
    if (!batchActive) break;  // user hit CANCEL
    
    job.status    = 'running';
    job.startedAt = Date.now();
    batchJobIndex = jobs.indexOf(job);
    updateBatchPanel();
    
    await new Promise((resolve) => {
      window.ComfyClient.generate({
        imagePath,
        prompt,
        seed:           job.seed,
        workflowName:   'i2v_14B_2stage',
        loraValues:     job.loraValues,
        filenamePrefix: job.filenamePrefix,
        onProgress: (pct, label) => updateBatchProgress(job, pct, label),
        onComplete: (filename) => {
          job.status      = 'complete';
          job.outputFile  = filename;
          job.completedAt = Date.now();
          updateBatchPanel();
          resolve();
        },
        onError: (msg) => {
          job.status      = 'error';
          job.errorMsg    = msg;
          job.completedAt = Date.now();
          updateBatchPanel();
          resolve();  // don't abort — continue to next job
        },
        onLog: (type, msg) => appendLog(type, `[${batchJobIndex + 1}/${jobs.length}] ${msg}`),
      });
    });
  }
  
  batchActive = false;
  updateBatchPanel();
  showBatchComplete(jobs);
}
```

**One batch at a time**: DIAL and PRODUCTION share `batchQueue`, `batchActive`, `batchJobIndex`. The UI must disable DIAL and PRODUCTION controls while a batch is running. Mixing modes mid-run is not supported in v1 — the design doesn't need it and the implementation risk isn't worth it.

---

## DIAL MODE — Detailed Design

### What it's for

DIAL is a scientific tool. You have one image, one prompt. You want to know: which CFG value produces the best motion? Which LoRA strength is the sweet spot before it burns the image? You run a grid, compare all outputs, pick the winner, then promote those settings to PRODUCTION.

### When NOT to use DIAL

DIAL runs are expensive. On PC (RTX 3090 Ti), a 4×4 grid = 16 jobs × 5-15 min each = 1.3-4 hrs. Use DIAL when:
- You're working with a NEW image type or scene you haven't run before
- You've changed the LoRA mix and don't know how it behaves
- A previous PRODUCTION run came out wrong and you need to find why

Don't use DIAL if you already know the settings work for this image type. That's what PRODUCTION is for.

### UI

Collapsible **DIAL SETUP** panel:

```
DIAL SEED:   [🎲 random — 3847261]  [LOCK]   ← single seed for the whole grid
AXIS 1:      [Stage 1 CFG ▼]  MIN [_3.0_]  MAX [_6.0_]  STEPS [_4_]
AXIS 2:      [OFF ▼]  (optional)

  → 4 jobs | ~20–60 min on PC   [RUN DIAL]
```

Axis selector options: `Stage 1 CFG`, `Stage 2 CFG`, `DR34ML4Y strength (both stages)`, `k3nk strength (both stages)`, `Stage 1 DR34ML4Y only`, `Stage 2 DR34ML4Y only`, `Stage 1 k3nk only`, `Stage 2 k3nk only`, `Step split`.

### Job construction

```js
function buildDialJobs(baseLoraValues, dialSeed, axis1Config, axis2Config, imagePath, prompt) {
  const axis1Values = linspace(axis1Config.min, axis1Config.max, axis1Config.steps);
  const axis2Values = axis2Config ? linspace(axis2Config.min, axis2Config.max, axis2Config.steps) : [null];

  return axis1Values.flatMap(v1 =>
    axis2Values.map(v2 => ({
      jobId:          crypto.randomUUID(),
      mode:           'DIAL',
      seed:           dialSeed,          // ← same seed for every job
      filenamePrefix: buildDialPrefix(axis1Config.param, v1, axis2Config?.param, v2),
      loraValues:     applyOverrides(deepClone(baseLoraValues), axis1Config.param, v1, axis2Config?.param, v2),
      status:         'pending',
      outputFile:     null,
      startedAt:      null,
      completedAt:    null,
      errorMsg:       null,
      overrides:      { axis1Label: axis1Config.param, axis1Value: v1, axis2Label: axis2Config?.param ?? null, axis2Value: v2 },
    }))
  );
}

function linspace(min, max, n) {
  if (n === 1) return [min];
  return Array.from({ length: n }, (_, i) => +(min + (max - min) * (i / (n - 1))).toFixed(3));
}
```

### Output naming (DIAL)

`filename_prefix` injected into node 17 (VHS_VideoCombine):

```
dial_s1cfg3.5_s2cfg6.0      ← Stage 1 CFG × Stage 2 CFG axes
dial_dr34mlay0.8_k3nk0.6    ← DR34ML4Y str × k3nk str axes
```

Format: `dial_{param1short}{value1}_{param2short}{value2}` (1 decimal). ComfyUI appends its counter: `dial_s1cfg3.5_s2cfg6.0_00001_.mp4`.

After a DIAL run: sort output folder by name, watch back-to-back. The winning file's name encodes the settings.

### Param short-codes

```js
const PARAM_SHORT = {
  's1.cfg':          's1cfg',
  's2.cfg':          's2cfg',
  's1.dr34mlayStr':  'dr34',
  's2.dr34mlayStr':  'dr34lo',
  's1.k3nkStr':      'k3nk',
  's2.k3nkStr':      'k3nklo',
  's1.steps':        'spt',
};
```

### After DIAL: "Promote to Production"

After a DIAL batch completes, the UI shows the job results. Each completed job has a **[PROMOTE →]** button. Clicking it:
1. Copies the winning `loraValues` to the main LoRA panel (updates sliders)
2. Pre-fills the PRODUCTION SETUP with those settings
3. Optionally shows a confirmation: "Stage 1 CFG locked at 4.5, Stage 2 CFG locked at 5.5. Promote settings and go to PRODUCTION?"

This makes the DIAL → PRODUCTION workflow explicit rather than implicit. Users don't have to read filenames and manually re-enter values.

---

## PRODUCTION MODE — Detailed Design

### What it's for

PRODUCTION is the overnight engine. Settings are locked. You've done your DIAL run (or you know this image type works). Now you want 20-30 variations to pick from in the morning.

### UI

Collapsible **BATCH SETUP** panel:

```
COUNT:     [___20___]  (max 30 for v1)
SEEDS:     [RANDOM ▼]  (RANDOM | SEQUENTIAL)
BASE SEED: [__________]  (only visible if SEQUENTIAL)

  → 20 jobs | ~100–300 min on PC   [RUN BATCH]
```

### Job construction

```js
function buildProdJobs(baseLoraValues, count, seedStrategy, baseSeed, imagePath, prompt) {
  return Array.from({ length: count }, (_, i) => {
    const seed = seedStrategy === 'sequential'
      ? baseSeed + i * 1000007   // large prime stride — reproducible, low correlation
      : Math.floor(Math.random() * 9999999999);  // max diversity

    return {
      jobId:          crypto.randomUUID(),
      mode:           'PROD',
      seed,
      filenamePrefix: `prod_${String(i + 1).padStart(3, '0')}_s${seed}`,
      loraValues:     deepClone(baseLoraValues),
      status:         'pending',
      outputFile:     null,
      startedAt:      null,
      completedAt:    null,
      errorMsg:       null,
      overrides:      null,
    };
  });
}
```

**RANDOM vs. SEQUENTIAL trade-off**:

| Strategy | Diversity | Reproducibility | When to use |
|----------|-----------|----------------|-------------|
| RANDOM | Maximum | Low (only recoverable from filename) | First batch — explore |
| SEQUENTIAL (prime stride) | Good | High — re-run same batch, same outputs | When you need to reproduce or extend |

The seed is embedded in the output filename for RANDOM runs (`prod_001_s3847291.mp4`) — so any standout video is always reproducible even if you didn't log the batch config.

### Output naming (PRODUCTION)

```
prod_001_s3847291.mp4
prod_002_s1928473.mp4
...
prod_020_s7483920.mp4
```

Sort by name → job order. Seed in filename → reproducibility without a log file.

---

## Compatibility Constraints Between Modes

**1. The workflow mutation path is shared.** Both modes call `injectPlaceholders()` with `loraValues` and `filenamePrefix`. This is safe because each call gets a deep-cloned copy of the workflow JSON (`JSON.parse(JSON.stringify(workflow))` already in `injectPlaceholders`). No shared mutable state between jobs.

**2. The image copy path has a filename collision risk.** `main.js` `copyToInput()` copies the source image to `ComfyUI/input/{originalFilename}`. If two batch jobs use the same image, they both write to the same destination file. For v1 single-image batches, this is a no-op (same content, same dest). But it's a future hazard for multi-image batches. Note for v2: namespace by job ID.

**3. ComfyUI output counter can collide across runs.** VHS_VideoCombine appends `_00001_`, `_00002_` etc. per prefix. If you run two DIAL batches with the same parameter values, you get `dial_s1cfg3.5_00001_.mp4` and `dial_s1cfg3.5_00002_.mp4` — the second run's files are appended to the first run's count. This is ComfyUI behavior, not ours. Not a bug, just something to be aware of. Workaround: include a timestamp in the prefix: `dial_1715108400_s1cfg3.5`. Decision: add timestamp for v1 — prefix format becomes `{mode}_{unixTimestamp}_{params}`.

**4. DIAL and PRODUCTION cannot run simultaneously.** They share the `batchActive` lock. The UI must enforce this: both setup panels are disabled and dimmed when `batchActive === true`. A CANCEL button aborts after the current job completes (no mid-job abort — would leave ComfyUI in a partial state).

---

## Batch Progress UI

Single **BATCH STATUS** panel, mode-agnostic:

```
DIAL: job 3 of 9  (or)  BATCH: job 8 of 20
▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  (batch-level: completed/total)
◈ Job 3 — s1cfg=4.0 · 67% · ~12m remaining
◈ Job 1 ✓  dial_s1cfg3.0...mp4   [→ Finder]
◈ Job 2 ✓  dial_s1cfg3.5...mp4   [→ Finder]  ← for DIAL: also shows [PROMOTE →]
◈ Job 3 ▶  [running]
◈ Job 4 ·  (pending)
...
                                              [CANCEL BATCH]
```

For DIAL MODE: completed rows show `[PROMOTE →]` in addition to `[→ Finder]`.

### Total ETA

After 2+ jobs complete:
```js
function estimateBatchEta(jobs, jobIndex, currentJobPct) {
  const done = jobs.filter(j => j.status === 'complete');
  if (done.length < 1) return null;
  const avgMs       = done.reduce((sum, j) => sum + (j.completedAt - j.startedAt), 0) / done.length;
  const remaining   = jobs.length - jobIndex - 1;
  const currentLeft = avgMs * (1 - currentJobPct / 100);
  return currentLeft + remaining * avgMs;  // ms
}
```

Show as `~3h 20m total remaining` above the progress bar. Updates every second during the current job's progress events.

---

## LoRA Injection — Exact Code

```js
function injectPlaceholders(workflow, imagePath, prompt, seed, loraValues, filenamePrefix) {
  const w = JSON.parse(JSON.stringify(workflow));

  for (const [nodeId, node] of Object.entries(w)) {
    if (!node.inputs) continue;

    // Existing placeholders
    if (node.inputs.image      === '{{IMAGE_PATH}}') node.inputs.image      = imagePath;
    if (node.inputs.text       === '{{PROMPT}}')     node.inputs.text       = prompt;
    if (node.inputs.noise_seed === '{{SEED}}')       node.inputs.noise_seed = parseInt(seed, 10);

    // LoRA injection (node IDs from i2v_14B_2stage.json)
    if (loraValues) {
      const lv = loraValues;
      if (nodeId === '6') {   // DR34ML4Y HIGH LoraLoader
        node.inputs.strength_model = lv.stage1.dr34mlayStr;
        node.inputs.strength_clip  = lv.stage1.dr34mlayStr;
      }
      if (nodeId === '7') {   // DR34ML4Y LOW LoraLoaderModelOnly
        node.inputs.strength_model = lv.stage2.dr34mlayStr;
      }
      if (nodeId === '18') {  // k3nk HIGH LoraLoader
        node.inputs.strength_model = lv.stage1.k3nkStr;
        node.inputs.strength_clip  = lv.stage1.k3nkStr;
      }
      if (nodeId === '19') {  // k3nk LOW LoraLoaderModelOnly
        node.inputs.strength_model = lv.stage2.k3nkStr;
      }
      if (nodeId === '13') {  // KSamplerAdvanced Stage 1
        node.inputs.cfg         = lv.stage1.cfg;
        node.inputs.end_at_step = lv.stage1.steps;
      }
      if (nodeId === '14') {  // KSamplerAdvanced Stage 2
        node.inputs.cfg           = lv.stage2.cfg;
        node.inputs.start_at_step = lv.stage1.steps;  // invariant: must match Stage 1's end
      }
    }

    // Output filename prefix (node 17 — VHS_VideoCombine)
    if (nodeId === '17' && filenamePrefix) {
      node.inputs.filename_prefix = filenamePrefix;
    }
  }

  return w;
}
```

---

## Job Data Model

```js
// BatchJob — used by both modes
{
  jobId:          string,         // crypto.randomUUID()
  mode:           'DIAL' | 'PROD',
  seed:           number,         // DIAL: dialSeed (same for all). PROD: per-job.
  filenamePrefix: string,         // injected into node 17
  loraValues:     LoraValues,     // fully resolved — base + overrides already applied
  status:         'pending' | 'running' | 'complete' | 'error',
  outputFile:     string | null,
  startedAt:      number | null,
  completedAt:    number | null,
  errorMsg:       string | null,
  overrides:      {               // DIAL only — what's different from base
    axis1Label: string,
    axis1Value: number,
    axis2Label: string | null,
    axis2Value: number | null,
  } | null,
}
```

---

## File Changes Required

| File | Change |
|---|---|
| `app/comfy.js` | `injectPlaceholders()` — add `loraValues` + `filenamePrefix`. `generate()` — destructure and pass both. |
| `app/renderer.js` | Add batch state, `buildDialJobs()`, `buildProdJobs()`, `runBatch()`, `updateBatchPanel()`, `estimateBatchEta()`. Add DIAL SETUP and BATCH SETUP panel DOM handlers. Promote-to-Production handler. Remove broken `s2-steps` wiring. |
| `app/index.html` | Add DIAL SETUP + BATCH SETUP HTML panels (collapsed by default). Batch status panel. |
| `test/regression.js` | Add T-LORA, T-DIAL, T-PROD tests (see below). |

**`main.js`**: No changes. `queuePrompt` IPC is workflow-agnostic.

---

## Regression Tests to Add

```js
// T-LORA-01: LoRA values injected into correct nodes
// T-LORA-02: loraValues absent → no injection, workflow untouched at LoRA nodes
// T-LORA-03: step split invariant: node 13 end_at_step === node 14 start_at_step always
// T-LORA-04: filenamePrefix injected into node 17
// T-LORA-05: filenamePrefix absent → node 17 prefix unchanged
// T-DIAL-01: linspace(3.0, 6.0, 4) returns [3.0, 4.0, 5.0, 6.0]
// T-DIAL-02: buildDialJobs with 1 axis generates correct count
// T-DIAL-03: buildDialJobs with 2 axes generates count_1 × count_2 jobs
// T-DIAL-04: all DIAL jobs use the same seed (dialSeed)
// T-DIAL-05: DIAL filenamePrefix encodes parameter values
// T-PROD-01: buildProdJobs generates correct count
// T-PROD-02: SEQUENTIAL seeds: seed[i+1] - seed[i] === 1000007
// T-PROD-03: RANDOM seeds: all jobs have unique seeds (probabilistic — use 1000 jobs, assert all unique)
// T-PROD-04: PROD filenamePrefix includes index (zero-padded) + seed
// T-PROD-05: DIAL jobs have mode='DIAL', PROD jobs have mode='PROD'
// T-BATCH-01: all jobs have unique jobIds regardless of mode
// T-BATCH-02: applyOverrides does not mutate the base loraValues object
```

---

## Build Order for Coding Session

1. **Fix LoRA injection** (`comfy.js` + T-LORA tests) — standalone, testable immediately. Makes sliders actually work.
2. **Add `filenamePrefix` injection + timestamp prefix** (`comfy.js` + T-LORA-04/05) — same pass, trivial addition.
3. **Fix step split UX** — remove `s2-steps` slider from `index.html` and `renderer.js`. Single `SPLIT STEP` slider remains.
4. **Build shared batch runner** (`renderer.js` — `runBatch()`, `updateBatchPanel()`, `estimateBatchEta()`, cancel logic)
5. **Build DIAL SETUP panel** (`index.html` + `renderer.js` — axis selectors, `buildDialJobs()`, `linspace()`, `applyOverrides()`)
6. **Build PRODUCTION SETUP panel** (`index.html` + `renderer.js` — count, seed strategy, `buildProdJobs()`)
7. **Promote-to-Production** (`renderer.js` — [PROMOTE →] button in DIAL results, copies loraValues to main panel)
8. **Batch progress UI** (`renderer.js` — job list, total ETA, batch-level progress bar)
9. **Regression tests** (`test/regression.js` — T-LORA through T-BATCH)

Each step is independently shippable. Step 1 alone already makes the existing single-job UI work correctly.

---

## Scope Decisions (v1)

**In scope:**
- DIAL: 1-2 axis sweep, up to 30 jobs, single fixed seed for the whole grid
- PRODUCTION: count 1-30, RANDOM or SEQUENTIAL seeds
- Single image per batch, single prompt per batch
- All batch jobs use `i2v_14B_2stage` workflow only
- Promote-to-Production from DIAL result
- Timestamp in filenamePrefix to prevent counter collision across runs

**Out of scope for v1:**
- Persistence across app restarts (in-memory queue — closing app stops the batch)
- Multi-image batches
- Multi-prompt batches
- Workflow selection per job (5B support is a later mode)
- Export batch config to JSON for external re-run
- Mid-job abort (CANCEL waits for current job to finish cleanly)

---

## Output Quality Reference

What to look for in DIAL MODE results:
- **CFG too low (< 3.0)**: vague motion, weak image adherence
- **CFG too high (> 7.0)**: posterization, over-sharpened, unnatural
- **Sweet zone**: CFG 3.5–5.5 for 14B I2V
- **LoRA too high (> 1.0)**: character burns into background, uncanny motion
- **LoRA too low (< 0.4)**: barely any stylistic effect

**Suggested first DIAL run**: Stage 1 CFG 3.0→6.0 × 4 steps, single axis = 4 jobs. ~20–60 min on PC. Establish the CFG baseline before adding a second axis.

---

*Plan written: 2026-05-07 — S258*

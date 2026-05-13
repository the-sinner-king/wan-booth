# WAN BOOTH — Phase 3 Coding Brief

> Written by Soulforge RESEARCH (Æris, 2026-05-09).
> Source: codebase scout (renderer.js, index.html, main.js, comfy.js, workflow JSON) +
> NLM notebook "WAN BOOTH — Wan 2.2 Architecture & TI2V Conditioning Deep Dive" (366 sources).
> This brief answers RQ-01 through RQ-05 and is handoff-ready for Glitchswarm (UI) + Soulforge CODING (implementation).

---

## Project path correction (discovered during Loop 3)

The project folder moved from `PROJECT_VENUS_FLYTRAP/WAN_BOOTH/` to `PROJECT_BAD_CANDY_ARCADE/WAN_BOOTH/`.
All file references below use the correct path.

---

## Codebase facts established (Loops 1–4)

### Full parameter schema — `getLoraValues()` in renderer.js
```javascript
{
  stage1: { dr34mlayStr: float, k3nkStr: float, steps: int, cfg: float },
  stage2: { dr34mlayStr: float, k3nkStr: float, steps: int, cfg: float }
}
```

### Slider ranges from index.html
| Param | Min | Max | Step | Default S1 | Default S2 |
|-------|-----|-----|------|-----------|-----------|
| dr34mlayStr | 0 | 1 | 0.01 | 0.80 | 0.80 |
| k3nkStr | 0 | 1 | 0.01 | 0.60 | 0.60 |
| steps | 1 | 60 | 1 | 20 | 31 |
| cfg | 1 | 15 | 0.1 | 3.5 | 6.0 |

### How injectPlaceholders maps these to the workflow (comfy.js:107–115)
- Node 6 → stage1.dr34mlayStr (strength_model + strength_clip)
- Node 7 → stage2.dr34mlayStr (strength_model only)
- Node 18 → stage1.k3nkStr (strength_model + strength_clip)
- Node 19 → stage2.k3nkStr (strength_model only)
- Node 13 → totalSteps, stage1.cfg, end_at_step=s1
- Node 14 → totalSteps, stage2.cfg, start_at_step=s1
- Steps are clamped to [1, 100] on injection (RF-S259-03) — UI hard ceiling is 60.

### Existing IPC handlers (main.js)
`wan:selectImage`, `wan:copyToInput`, `wan:getComfyStatus`, `wan:getHomedir`, `wan:getComfyDir`,
`wan:loadWorkflow`, `wan:toFileURL`, `wan:writeReport`, `wan:queuePrompt`

### Current repeat-run pattern (renderer.js — runAllJobs)
Flat for-loop. Same `loraValues` / `width` / `height` / `fps` for all runs.
Only the seed varies (random or fixed). No per-job heterogeneity.

---

## RQ-01: Preset System

### Decision: JSON files in `app/presets/`
- One JSON file per preset: `{slug}.json` (slug = name lowercased, spaces → underscores)
- `presets/index.json` — array of `{ slug, name, created_at }` for fast UI listing
- Location inside the app bundle means presets ship with the app and are version-controllable
- SQLite rejected: overkill for <50 presets; JSON is readable, diffable, portable

### Preset schema
```json
{
  "name": "Vanilla DT — Safe Start",
  "created_at": "2026-05-09T02:00:00Z",
  "loraValues": {
    "stage1": { "dr34mlayStr": 0.8, "k3nkStr": 0.6, "steps": 20, "cfg": 3.5 },
    "stage2": { "dr34mlayStr": 0.8, "k3nkStr": 0.6, "steps": 31, "cfg": 6.0 }
  },
  "resolution": { "width": 832, "height": 480 },
  "fps": 16,
  "seedMode": "random"
}
```

**Privacy rule**: prompt is NOT stored in preset (same principle as BUG #5 — no user text to disk).
`seedMode` is either `"random"` or an integer seed value.

### New IPC handlers (main.js)
```javascript
const ALLOWED_PRESET_SLUG = /^[a-zA-Z0-9_-]{1,64}$/;
const PRESETS_DIR = path.join(__dirname, 'presets');

ipcMain.handle('wan:listPresets', async () => {
  fs.mkdirSync(PRESETS_DIR, { recursive: true });
  const indexPath = path.join(PRESETS_DIR, 'index.json');
  try { return JSON.parse(fs.readFileSync(indexPath, 'utf8')); }
  catch { return []; }
});

ipcMain.handle('wan:loadPreset', async (event, slug) => {
  if (!ALLOWED_PRESET_SLUG.test(slug)) throw new Error('Invalid preset slug');
  const filePath = path.join(PRESETS_DIR, slug + '.json');
  const real = fs.realpathSync(filePath);
  if (!real.startsWith(fs.realpathSync(PRESETS_DIR) + path.sep)) throw new Error('Preset path escape');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

ipcMain.handle('wan:savePreset', async (event, { slug, data }) => {
  if (!ALLOWED_PRESET_SLUG.test(slug)) throw new Error('Invalid preset slug');
  fs.mkdirSync(PRESETS_DIR, { recursive: true });
  const filePath = path.join(PRESETS_DIR, slug + '.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  // Update index
  const indexPath = path.join(PRESETS_DIR, 'index.json');
  let index = [];
  try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch {}
  const existing = index.findIndex(p => p.slug === slug);
  const entry = { slug, name: data.name, created_at: data.created_at };
  if (existing >= 0) index[existing] = entry;
  else index.unshift(entry);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  return { ok: true };
});

ipcMain.handle('wan:deletePreset', async (event, slug) => {
  if (!ALLOWED_PRESET_SLUG.test(slug)) throw new Error('Invalid preset slug');
  const filePath = path.join(PRESETS_DIR, slug + '.json');
  try { fs.unlinkSync(filePath); } catch {}
  const indexPath = path.join(PRESETS_DIR, 'index.json');
  let index = [];
  try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch {}
  fs.writeFileSync(indexPath, JSON.stringify(index.filter(p => p.slug !== slug), null, 2), 'utf8');
  return { ok: true };
});
```

### New preload.js entries
```javascript
listPresets: () => ipcRenderer.invoke('wan:listPresets'),
loadPreset: (slug) => ipcRenderer.invoke('wan:loadPreset', slug),
savePreset: (slug, data) => ipcRenderer.invoke('wan:savePreset', { slug, data }),
deletePreset: (slug) => ipcRenderer.invoke('wan:deletePreset', slug),
```

### Preset UX
- Preset dropdown/list at the top of the control panel — selecting snaps all sliders to preset values
- [SAVE PRESET] button → name input modal → slug = name.toLowerCase().replace(/\s+/g,'_')
- [DELETE] button next to each preset (confirm before delete)
- Loading a preset does NOT touch the prompt textarea (prompt is separate, always private)

---

## RQ-02: Plain-English Tooltips

Ready-to-use `title` attribute strings for index.html. Effect-first language, no jargon.

### CFG — Stage 1 (High-Noise, node 13)
> "How much the AI sticks to your prompt during the MOTION phase. Low (2–4): looser, more natural movement. High (5+): tighter to prompt but risks washed-out colors and stiff faces. Default 3.5 is the community sweet spot for stage 1."

### CFG — Stage 2 (Low-Noise, node 14)
> "How much the AI sticks to your prompt during the DETAIL phase. Higher = crisper textures and face detail. Above 7 causes color blowout. Default 6.0 is the standard for stage 2 refinement."

### LoRA Strength — DR34ML4Y (both stages)
> "How strongly the DR34ML4Y character style is applied. 0.5–0.8 = clean, natural identity. Above 1.0 = plastic, burned artifacts. Below 0.4 = character not showing through."

### LoRA Strength — K3NK (both stages)
> "How strongly the K3NK motion style is applied. When stacking two LoRAs, keep each at 0.5–0.7 max — combined strength above ~1.0 causes face melt and color collapse."

### Steps — Stage 1 (end_at_step)
> "Refinement passes for the MOTION phase (big shapes, camera movement, composition). More = smoother motion, slower gen. Below 12 and motion collapses. 15–25 is the healthy range."

### Steps — Stage 2 (remaining steps from split to total)
> "Refinement passes for the DETAIL phase (skin texture, face, fine edges). Total 40–50 steps gives max quality. 20–35 total is the fast sweet spot at 480p on the 3090 Ti."

### Resolution
> "Size of the output video. 480p (832×480) is the native training resolution for the 14B model and runs comfortably on the 3090 Ti. 720p (1280×720) needs 24GB+ VRAM — not recommended without VRAM offloading."

### FPS
> "Playback speed only — NOT extra frames. The model generates 81 frames regardless of this setting. 16 = native (the model was trained at 16fps). 24 = same frames played 50% faster, creating a sped-up effect. Keep at 16 unless you want the speed-up."

---

## RQ-03: Render Queue

### Problem with current runAllJobs
All runs share the same loraValues, width, height, fps. The only variation is the seed.
Heterogeneous queue means: each slot gets its own full parameter object, enabling preset A/B runs, chaos per-slot, and mixed-resolution batches.

### Job object schema
```javascript
{
  id: crypto.randomUUID(),
  label: 'Vanilla DT — Run 1',   // display only
  prompt: null,                   // null = use current UI prompt at run time
  seed: null,                     // null = random at run time
  loraValues: { stage1: {...}, stage2: {...} },
  resolution: { width: 832, height: 480 },
  fps: 16,
  chaos: 0,                       // 0–100, applied fresh each run
  status: 'pending',              // pending | running | complete | error
  outputFilename: null,           // filled in after completion
}
```

### Queue state (renderer.js additions)
```javascript
let jobQueue = [];
let activeJobIndex = -1;

async function runQueue() {
  for (let i = 0; i < jobQueue.length; i++) {
    activeJobIndex = i;
    jobQueue[i].status = 'running';
    renderQueueUI();
    const job = jobQueue[i];
    const seed = (job.seed !== null) ? job.seed : Math.floor(Math.random() * 9999999999);
    const lv = job.chaos > 0 ? applyChaos(job.loraValues, job.chaos) : job.loraValues;
    const prompt = job.prompt || document.getElementById('prompt').value;
    const ok = await startGeneration(seed, prompt, i + 1, jobQueue.length, lv,
                                      job.resolution.width, job.resolution.height, job.fps);
    jobQueue[i].status = ok ? 'complete' : 'error';
    if (ok) jobQueue[i].outputFilename = lastOutputFilename; // needs tracking var
    renderQueueUI();
  }
  activeJobIndex = -1;
}

function addCurrentStateAsJob() {
  const lv = getLoraValues();
  const { width, height } = getCurrentResolution();
  const fps = parseInt(document.getElementById('fps').value, 10);
  const chaos = parseInt(document.getElementById('chaos-pct').value, 10);
  jobQueue.push({
    id: crypto.randomUUID(),
    label: 'Custom Job ' + (jobQueue.length + 1),
    prompt: null,
    seed: null,
    loraValues: lv,
    resolution: { width, height },
    fps,
    chaos,
    status: 'pending',
    outputFilename: null,
  });
  renderQueueUI();
}
```

### startGeneration signature update
```javascript
// Add optional overrides — backward-compatible
async function startGeneration(seed, prompt, runNum, totalRuns,
                                loraValuesOverride = null,
                                widthOverride = null, heightOverride = null,
                                fpsOverride = null) {
  const lv = loraValuesOverride || getLoraValues();
  // ... rest of function uses lv instead of getLoraValues()
}
```

### Minimal Phase 3 queue UI
- [+ ADD TO QUEUE] button — adds current slider state as a job
- Queue panel: scrollable list of job cards (label, chaos%, status dot)
- [▶ RUN QUEUE] button — runs all pending jobs in order
- Each job card has [×] remove button (only when pending)
- [CLEAR QUEUE] button
- Keep existing single-run [GENERATE] button — only show queue UI when jobQueue.length > 0

---

## RQ-04: Chaos Slider

### Parameters in scope (all 8 sliders)
FPS is **excluded from chaos** — it's a categorical playback choice, not a generative variable.
Resolution is **excluded from chaos** — changing mid-queue would cause VRAM inconsistencies.

In scope:
- `stage1.dr34mlayStr`, `stage2.dr34mlayStr` — float [0, 1]
- `stage1.k3nkStr`, `stage2.k3nkStr` — float [0, 1]
- `stage1.steps`, `stage2.steps` — integer [1, 60]
- `stage1.cfg`, `stage2.cfg` — float [1, 15]

### Math — applyChaos() (pure renderer.js, zero IPC changes)

```javascript
function chaosFloat(value, pct, min, max) {
  if (pct === 0) return value;
  // Dampener 0.3: at 100% chaos, max deviation = ±30% of range
  // Keeps LoRA strengths inside the 0.5–1.0 safe zone from a 0.8 baseline
  const maxDev = (max - min) * (pct / 100) * 0.3;
  const delta = (Math.random() * 2 - 1) * maxDev;
  return Math.max(min, Math.min(max, parseFloat((value + delta).toFixed(2))));
}

function chaosCfg(value, pct) {
  if (pct === 0) return value;
  // Dampener 0.2: at 100% chaos, CFG deviates ±2.8 (e.g. 3.5 → range [0.7, 6.3], clamped [1, 15])
  const maxDev = 14 * (pct / 100) * 0.2;
  const delta = (Math.random() * 2 - 1) * maxDev;
  return Math.max(1, Math.min(15, parseFloat((value + delta).toFixed(1))));
}

function chaosSteps(value, pct) {
  if (pct === 0) return value;
  // Dampener 0.15: at 100% chaos, steps deviate ±9 (e.g. 20 → range [11, 29])
  // Steps are sensitive — motion collapse below 12
  const maxDev = 60 * (pct / 100) * 0.15;
  const delta = Math.round((Math.random() * 2 - 1) * maxDev);
  return Math.max(1, Math.min(60, value + delta));
}

function applyChaos(loraValues, chaosPercent) {
  const lv = JSON.parse(JSON.stringify(loraValues));
  lv.stage1.dr34mlayStr = chaosFloat(lv.stage1.dr34mlayStr, chaosPercent, 0, 1);
  lv.stage1.k3nkStr     = chaosFloat(lv.stage1.k3nkStr,     chaosPercent, 0, 1);
  lv.stage1.steps       = chaosSteps(lv.stage1.steps,        chaosPercent);
  lv.stage1.cfg         = chaosCfg(lv.stage1.cfg,            chaosPercent);
  lv.stage2.dr34mlayStr = chaosFloat(lv.stage2.dr34mlayStr, chaosPercent, 0, 1);
  lv.stage2.k3nkStr     = chaosFloat(lv.stage2.k3nkStr,     chaosPercent, 0, 1);
  lv.stage2.steps       = chaosSteps(lv.stage2.steps,        chaosPercent);
  lv.stage2.cfg         = chaosCfg(lv.stage2.cfg,            chaosPercent);
  return lv;
}
```

### Dampener table — what 100% chaos actually does
| Param | Base | Max deviation | Effective range at 100% |
|-------|------|--------------|------------------------|
| dr34mlayStr | 0.80 | ±0.30 | [0.50, 1.00] |
| k3nkStr | 0.60 | ±0.30 | [0.30, 0.90] |
| stage1.steps | 20 | ±9 | [11, 29] |
| stage2.steps | 31 | ±9 | [22, 40] |
| stage1.cfg | 3.5 | ±2.8 | [1.0, 6.3] |
| stage2.cfg | 6.0 | ±2.8 | [3.2, 8.8] |

All values stay within the community-documented safe zones (no motion collapse, no color blowout from base).

### Chaos UX
- Single slider: 0–100%, default 0% (appears below the existing LoRA controls)
- Dynamic label text:
  - 0%: "CHAOS OFF — exact values every run"
  - 1–30%: "MILD — subtle variation"
  - 31–70%: "MEDIUM — noticeable exploration"
  - 71–100%: "WILD — expect surprises"
- The actual perturbed values appear in the per-run report (loraValues is already logged)

---

## RQ-05: Seed Bank

### Decision: JSON over SQLite
JSON wins. Reasoning:
- Use case is saving 5–50 winning seeds, not querying hundreds
- JSON is human-readable, shareable, diffable in git
- Zero dependencies, no schema migrations
- SQLite needed only if: full-text prompt search, tag filtering, thousands of entries — none of those apply in Phase 3

### Schema (`app/seeds.json`)
```json
{
  "version": 1,
  "seeds": [
    {
      "id": "uuid-v4",
      "seed": 4829301847,
      "label": "Perfect face, aggressive motion",
      "created_at": "2026-05-09T02:00:00Z",
      "outputFilename": "wan_i2v_14b_00012.mp4",
      "loraValues": {
        "stage1": { "dr34mlayStr": 0.8, "k3nkStr": 0.6, "steps": 20, "cfg": 3.5 },
        "stage2": { "dr34mlayStr": 0.8, "k3nkStr": 0.6, "steps": 31, "cfg": 6.0 }
      },
      "resolution": { "width": 832, "height": 480 },
      "fps": 16,
      "chaos_applied": 35
    }
  ]
}
```

**Privacy rule**: prompt NOT stored. `chaos_applied` records what chaos % was used when the seed was generated (context for reproducing it).

### New IPC handlers (main.js)
```javascript
const SEEDS_PATH = path.join(__dirname, 'seeds.json');

function _readSeeds() {
  try { return JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf8')); }
  catch { return { version: 1, seeds: [] }; }
}

function _writeSeeds(data) {
  fs.writeFileSync(SEEDS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

ipcMain.handle('wan:listSeeds', async () => _readSeeds());

ipcMain.handle('wan:saveSeed', async (event, entry) => {
  // entry: { seed, label, outputFilename, loraValues, resolution, fps, chaos_applied }
  if (typeof entry.seed !== 'number' || !Number.isInteger(entry.seed)) throw new Error('Invalid seed');
  if (typeof entry.label !== 'string' || entry.label.length > 200) throw new Error('Invalid label');
  const data = _readSeeds();
  data.seeds.unshift({ ...entry, id: crypto.randomUUID(), created_at: new Date().toISOString() });
  _writeSeeds(data);
  return { ok: true };
});

ipcMain.handle('wan:deleteSeed', async (event, id) => {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid seed ID');
  const data = _readSeeds();
  data.seeds = data.seeds.filter(s => s.id !== id);
  _writeSeeds(data);
  return { ok: true };
});
```

### New preload.js entries
```javascript
listSeeds: () => ipcRenderer.invoke('wan:listSeeds'),
saveSeed: (entry) => ipcRenderer.invoke('wan:saveSeed', entry),
deleteSeed: (id) => ipcRenderer.invoke('wan:deleteSeed', id),
```

### Seed Bank UX
- After each successful generation: [★ SAVE SEED] button appears in the result/log area
- Click → small inline modal: label input (placeholder: "what made this good?"), [Save], [Skip]
- Seed bank section: collapsible panel (collapsed by default, toggle button)
- Each entry: seed number, label, date, [▶ LOAD] (loads seed + loraValues back to UI sliders), [×] (delete with confirm)
- [▶ LOAD] action: sets seed input to this seed's value AND snaps all sliders to the saved loraValues

---

## Cross-Source Collisions (mechanistically linked findings)

### Collision 1: CFG stage routing — codebase confirms NLM guidance
**NLM**: Stage 1 optimal CFG = 3.5, Stage 2 optimal CFG = 6.0 (community consensus, confirmed against official Wan 2.2 defaults).
**Codebase**: `comfy.js:112–115` already routes `lv.stage1.cfg → node 13` and `lv.stage2.cfg → node 14`. Current UI defaults (3.5 / 6.0) exactly match the optimal values.
**Implication**: defaults are correct. Tooltips should explain WHY these values — the two stages have mechanistically different jobs (motion vs detail), not just different scale points.

### Collision 2: LoRA strength ceiling — NLM "danger zone" starts at 0.8
**NLM**: Community consensus puts "danger zone" at 0.8–1.0 for identity LoRAs. "Style lock" artifacts begin here.
**Codebase**: DR34ML4Y defaults to 0.80 — exactly at the danger zone entry. K3NK defaults to 0.60, safely inside the sweet spot.
**Implication**: Chaos at 100% must not push DR34ML4Y above 1.0. The `chaosFloat` hard-clamp to `max=1` enforces this. Tooltip for DR34ML4Y should note "you're already at the upper safe limit" at 0.8.

### Collision 3: Step split ratio — starvation risk is real
**NLM**: Starving either stage causes artifacts. Stage 1 below ~12 steps causes motion collapse. Official SNR split point is ~39% of total steps for I2V.
**Codebase**: Current defaults 20/31 = 39% Stage 1 — matches the official SNR split almost exactly. Total 51 steps is within the community's quality range.
**Implication**: Chaos for steps should apply the same dampener to both stages independently (not redistribute from one to the other). The 0.15 dampener keeps stage1 above 11 from a baseline of 20.

### Collision 4: FPS is a playback switch, not a generative variable
**NLM**: FPS in VHS_VideoCombine is playback speed only. The 14B model generates 81 frames regardless. Changing FPS to 24 plays those frames 50% faster — it doesn't interpolate or add frames.
**Codebase**: `injectPlaceholders` injects `frameRate` directly to VHS node. The model was trained at 16fps.
**Implication**: FPS excluded from chaos (not a continuous generative variable). Tooltip must explicitly warn about the "sped-up effect" at non-native FPS. Resolution also excluded from chaos (VRAM consistency per session).

---

## Implementation Order

### Phase 3A — Make It Smart (lower risk, high value first)
1. **Tooltips** — pure HTML attribute changes in index.html. No logic, no IPC. Ship first.
2. **Preset system** — new IPC handlers in main.js + preload.js + JSON files + UI in index.html + load/save logic in renderer.js
3. **Seed bank** — new IPC handlers + JSON file + result area UI + bank panel

### Phase 3B — Make It a Factory (medium risk)
4. **Chaos slider** — pure renderer.js math. No IPC changes. Three helper functions + applyChaos() + slider UI element.
5. **Visual render queue** — renderer.js jobQueue/runQueue redesign + backward-compatible startGeneration signature + queue UI panel in index.html

### File change map
| Feature | Files touched |
|---------|--------------|
| Tooltips | `app/index.html` |
| Presets | `app/main.js`, `app/preload.js`, `app/renderer.js`, `app/index.html`, `app/presets/` (new dir) |
| Seed bank | `app/main.js`, `app/preload.js`, `app/renderer.js`, `app/index.html`, `app/seeds.json` (new file) |
| Chaos slider | `app/renderer.js`, `app/index.html` |
| Render queue | `app/renderer.js`, `app/index.html` |

### Regression test targets
Current count: 144 tests (`test/regression.js`).
New handlers to cover:
- Preset: `wan:listPresets`, `wan:loadPreset`, `wan:savePreset`, `wan:deletePreset` (4 handlers × 2–3 assertions each)
- Seed bank: `wan:listSeeds`, `wan:saveSeed`, `wan:deleteSeed` (3 handlers × 2 assertions each)
- Chaos: `applyChaos()` unit tests — verify clamp behavior at extremes (chaos=0, chaos=50, chaos=100)
- Queue: `runQueue()` contract test (pending → running → complete state transitions)
Estimated new total: ~165–175 tests.

---

## What this changes about what we build

1. **Tooltips ship first** — they're zero-risk and they make the chaos slider comprehensible (users need to understand params to use chaos intelligently).
2. **Preset schema IS the queue job schema** — solving presets first makes the render queue object trivial (a job = a preset + seed + status + chaos%).
3. **Chaos is renderer-only** — zero IPC changes, zero main.js changes. Three pure functions + a slider. This is the biggest finding: it can ship in one Soulforge CODING session.
4. **Seed bank closes the production loop** — chaos discovery → good render → save seed → load seed → run 10× → export pack. Without the seed bank, the factory loop has no memory.
5. **FPS and resolution are excluded from chaos** — this simplifies the chaos math and prevents VRAM surprises mid-queue.

# S267 — INTELLIGENCE PASS (v3 — Post Grumpy R7)
> **Council deliverable, FORGE-READY. Grumpy R7 burned (4🔴 + 4🟡 + 2🟢). All flags addressed in this revision.**

```
TYPE........: COUNCIL_PLAN_v3 // S267_INTELLIGENCE_PASS.md
AUTHORITY...: ARCHITECT [❖] // CARTOGRAPHER [⌂] (Cla⌂de, Citadel)
SESSION.....: S267
CREATED.....: 2026-05-21
REVISIONS...: v1 → v2 (Brandon's "no defaults" + "leave FPS" calls)
              v2 → v3 (Grumpy R7 — 10 flags, 2 upgrades, all adopted)
PRECEDED BY.: S266 P2 (commit 624cd5b) + baseline lock (0f49a14)
FORGE STATUS: GREEN — Brandon delegated full architect autonomy
              "i have no CLUE what any of this means, you're in charge brotha"
```

---

## ⛬ THE FOUR STORIES (forge-ready)

### Story 1 — Universal value persistence (electron-store backed)

**Goal:** Every Tier A UI knob remembers its last position across launches. Persistence layer is JSON-schema-validated, atomic-write-safe on Windows, and survives kill-9 mid-write.

**Tier A controls (13 total — Grumpy Flag #4 promoted toggles):**
| Key | Element | Type |
|---|---|---|
| `s1-dr34mlay-str` | LoRA strength slider | number |
| `s2-dr34mlay-str` | LoRA strength slider | number |
| `s1-k3nk-str` | LoRA strength slider | number |
| `s2-k3nk-str` | LoRA strength slider | number |
| `s1-steps` | Steps slider | integer |
| `s2-steps` | Steps slider | integer |
| `s1-cfg` | CFG slider | number |
| `s2-cfg` | CFG slider | number |
| `chaos-pct` | Chaos % slider | integer |
| `resolution-select` | Resolution dropdown | string |
| `fps-select` | FPS dropdown | integer (string-coerced) |
| `runs-select` | Runs dropdown | integer (string-coerced) |
| `length-select` | Length dropdown (added Story 3) | integer (string-coerced) |
| `stage-1-toggle` | Stage 1 enable checkbox | boolean (Grumpy #4) |
| `stage-2-toggle` | Stage 2 enable checkbox | boolean (Grumpy #4) |
| `seed-mode` | RANDOM/fixed seed mode | enum: "random" \| "fixed" (Grumpy #4) |
| `seed-value` | Fixed seed value (when mode=fixed) | integer (Grumpy #4) |

**Storage:** `electron-store` writes to `app.getPath('userData')` → `%APPDATA%\zoetrope\config.json` on Windows (Grumpy #9 — electron-store handles atomic write + EPERM retry on Windows).

**Implementation (Upgrades #1 + #2 adopted):**

*main.js:*
```js
const Store = require('electron-store');
const prefsSchema = {
  's1-dr34mlay-str': { type: 'number', minimum: 0, maximum: 2,    default: 0.7 },
  's2-dr34mlay-str': { type: 'number', minimum: 0, maximum: 1.5,  default: 0.7 },
  's1-k3nk-str':     { type: 'number', minimum: 0, maximum: 2,    default: 0.5 },
  's2-k3nk-str':     { type: 'number', minimum: 0, maximum: 1.5,  default: 0.5 },
  's1-steps':        { type: 'integer', minimum: 5,  maximum: 50,  default: 20 },
  's2-steps':        { type: 'integer', minimum: 5,  maximum: 50,  default: 20 },
  's1-cfg':          { type: 'number', minimum: 1,  maximum: 10,  default: 3.5 },
  's2-cfg':          { type: 'number', minimum: 1,  maximum: 10,  default: 6.0 },
  'chaos-pct':       { type: 'integer', minimum: 0,  maximum: 100, default: 0  },
  'resolution-select': { type: 'string', default: '832x480' },
  'fps-select':      { type: 'string', default: '16' },
  'runs-select':     { type: 'string', default: '1' },
  'length-select':   { type: 'string', default: '81' },
  'stage-1-toggle':  { type: 'boolean', default: true },
  'stage-2-toggle':  { type: 'boolean', default: true },
  'seed-mode':       { type: 'string', enum: ['random','fixed'], default: 'random' },
  'seed-value':      { type: 'integer', minimum: 0, default: 42 },
};
const prefs = new Store({ name: 'config', schema: prefsSchema, clearInvalidConfig: true });

ipcMain.handle('wan:getPrefs',  () => prefs.store);
ipcMain.handle('wan:setPref',   (e, key, value) => { prefs.set(key, value); });
ipcMain.handle('wan:resetPrefs', () => { prefs.clear(); });
```

*preload.js bridge:*
```js
getPrefs:  () => ipcRenderer.invoke('wan:getPrefs'),
setPref:   (key, value) => ipcRenderer.invoke('wan:setPref', key, value),
resetPrefs:() => ipcRenderer.invoke('wan:resetPrefs'),
```

*renderer.js init (AbortController-aware debounce — Upgrade #2):*
```js
let _persistAbort = null;
function persistPref(key, value) {
  if (_persistAbort) _persistAbort.abort();
  _persistAbort = new AbortController();
  const signal = _persistAbort.signal;
  setTimeout(() => {
    if (signal.aborted) return;
    window.wan.setPref(key, value).catch(err => appendLog('error', `persist ${key}: ${err.message}`));
  }, 200);
}
window.addEventListener('beforeunload', () => { _persistAbort?.abort(); });

async function restorePrefs() {
  const stored = await window.wan.getPrefs();
  for (const [key, value] of Object.entries(stored)) {
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = value;
    else el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // seed-mode + seed-value handled separately — they're a paired state machine
  applySeedMode(stored['seed-mode'], stored['seed-value']);
}
```

**Wire-up:** every Tier A control's existing change/input listener gets a `persistPref(el.id, el.value)` call appended. For toggles, `persistPref('stage-1-toggle', el.checked)`. For seed-mode/seed-value, the `seedToggle` button click handler writes both keys.

**Validation note (Grumpy Flag #6):** electron-store's JSON schema validates every `set()`. NaN, out-of-range, or wrong-type values are REJECTED by the schema — the call throws, persistPref catches, appendLog logs, prior value untouched. **Validate-then-persist is enforced by the store itself.** No custom validation layer needed.

**Coexistence with Presets + Seed Bank:** ambient prefs load first on init (`restorePrefs`). If user clicks "Load Preset" after, preset values overlay ambient — same `dispatchEvent` cascade, persistPref fires on each, ambient updates to match. No race.

**Acceptance criteria:**
- AC-PERSIST-01: Change any Tier A control → close app → relaunch → control restored to changed value
- AC-PERSIST-02: Toggle `stage-1-toggle` OFF → close → relaunch → still OFF (Grumpy #4)
- AC-PERSIST-03: Set fixed seed = 12345 → close → relaunch → fixed-seed mode restored with value 12345 (Grumpy #4)
- AC-PERSIST-04: Delete `%APPDATA%\zoetrope\config.json` → launch → all controls restore from schema defaults
- AC-PERSIST-05: Manually corrupt `config.json` (random bytes) → launch → schema rejects, `clearInvalidConfig: true` resets to defaults, app doesn't crash
- AC-PERSIST-06: Schema rejection of out-of-range value (e.g. CFG = 99) doesn't overwrite prior good stored value

**Manual smoke gate (Grumpy Flag #8):** Between Story 1 commit and Story 2 commit, run this exact sequence:
1. Kill Electron
2. Delete `%APPDATA%\zoetrope\config.json` if it exists
3. Launch
4. Touch every Tier A control with deliberate values (CFG=4.2, LoRA=0.85, chaos=23, etc.)
5. Kill Electron
6. Verify `config.json` exists and contains all 13+ keys
7. Launch
8. Confirm every slider/toggle/dropdown matches the deliberate values
9. **Only then proceed to Story 2.**

---

### Story 2 — Slider range extension + CFG default correction

**Goal:** Sliders can reach the research-validated meaningful ranges. **CFG HTML defaults corrected to match the workflow JSON** (Grumpy Flag #7 — data correctness, not default-programming).

**HTML edits in `index.html` (line numbers from current state):**

| Selector | Line | Current | New | Reason |
|---|---|---|---|---|
| `#s1-dr34mlay-str` | 139 | `min="0" max="1" step="0.01" value="0.7"` | `min="0" max="2" step="0.05" value="0.7"` | Action-LoRA S1 reaches 1.5-2.0; coarser step per research |
| `#s2-dr34mlay-str` | 176 | `min="0" max="1" step="0.01" value="0.7"` | `min="0" max="1.5" step="0.05" value="0.7"` | Type-agnostic cap (cushion for character LoRAs too) (Grumpy #10) |
| `#s1-k3nk-str` | 145 | `min="0" max="1" step="0.01" value="0.5"` | `min="0" max="2" step="0.05" value="0.5"` | Same as DR34MLAY S1 |
| `#s2-k3nk-str` | 182 | `min="0" max="1" step="0.01" value="0.5"` | `min="0" max="1.5" step="0.05" value="0.5"` | Same as DR34MLAY S2 |
| `#s1-steps` | 151 | `min="1" max="50" step="1" value="20"` | `min="5" max="50" step="1" value="20"` | Below 5 is guaranteed nonsense |
| `#s2-steps` | 188 | `min="1" max="50" step="1" value="20"` | `min="5" max="50" step="1" value="20"` | Same |
| `#s1-cfg` | 157 | `min="1" max="20" step="0.5" value="7"` | `min="1" max="10" step="0.1" value="3.5"` | **CFG DEFAULT FIX** (Grumpy #7); workflow JSON specifies 3.5 |
| `#s2-cfg` | 194 | `min="1" max="20" step="0.5" value="7"` | `min="1" max="10" step="0.1" value="6"` | **CFG DEFAULT FIX** (Grumpy #7); workflow JSON specifies 6.0 |

**LoRA strength HTML defaults UNCHANGED** — respecting Brandon's "no defaults" rule strictly. Persistence overrides them after first touch.

**Acceptance criteria:**
- AC-RANGE-01: Each slider's max attribute matches table
- AC-RANGE-02: Each slider's step value matches table
- AC-RANGE-03: CFG sliders default to 3.5 / 6.0 on fresh launch (no config.json)
- AC-RANGE-04: Persisted value from old range (e.g. config.json has `s1-cfg: 7`) loads cleanly into new range (7 ∈ [1,10] = valid)

---

### Story 3 — Length dropdown (4n+1) with class_type injection

**Goal:** Expose Wan 2.2's 4 valid length values. **Use the existing class_type injection pattern (Grumpy Flag #2) — no fictional `{{LENGTH}}` token.**

**HTML add to OUTPUT card (`index.html` between resolution and fps rows):**
```html
<div class="output-row">
  <label class="output-label" for="length-select">LENGTH</label>
  <select class="output-select" id="length-select" title="Wan 2.2 frame count (4n+1 rule)">
    <option value="49">49 frames — ~3s</option>
    <option value="81" selected>81 frames — ~5s</option>
    <option value="97">97 frames — ~6s</option>
    <option value="121">121 frames — ~7.5s (max)</option>
  </select>
</div>
```

**Renderer (`renderer.js`):**
- Add `getLength()` helper: `parseInt(document.getElementById('length-select').value, 10) || 81`
- Thread `length` through `startGeneration(seed, prompt, runNum, totalRuns, loraValuesOverride, widthOverride, heightOverride, fpsOverride, chaosApplied, lengthOverride)` signature
- Pass to `ComfyClient.generate({..., length, ...})`

**Comfy bridge (`comfy.js`):** add `length` to the function signature, then inject by `class_type` in `injectPlaceholders` — pattern identical to width/height (Grumpy Flag #2):
```js
// Inside the per-node loop:
if (length && (node.class_type === 'WanImageToVideo' || node.class_type === 'Wan22ImageToVideoLatent')) {
  node.inputs.length = length;
}
```

**Workflow JSON** stays valid for standalone ComfyUI use — `length: 81` literal remains; renderer overrides at inject time (Grumpy #2 fix).

**Report (`buildReport`)** — Grumpy Flag #3 itemized fix:
- New param: `length`
- New OUTPUT SETTINGS line: `FRAMES      : 81 (~5.0s @ 16fps)`
- Caller at renderer.js:534 threads `length` through

**Acceptance criteria:**
- AC-LENGTH-01: Selecting 49 → workflow node 10 receives `length: 49` (verify by intercepted prompt)
- AC-LENGTH-02: Selecting 81 / 97 / 121 same
- AC-LENGTH-03: Default 81 if `config.json` missing or value missing
- AC-LENGTH-04: Report shows `FRAMES : <N> (~<N/16>s @ 16fps)` line
- AC-LENGTH-05: Regression suite gets T-LENGTH-01 (all 4 values inject correctly via class_type)

---

### Story 4 — Smart chaos with stage-aware bands + DIAL invariant

**Goal:** Rewrite `applyChaos()` to use research-validated safe-zone bands tuned for the current action-LoRA configuration. **DIAL/PROD never pass through applyChaos — declared invariant + test (Grumpy Flag #1).**

**Critical doc comment (Grumpy Flag #5 invariant):**
```js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAOS_BANDS — tuned for CURRENT LoRA configuration (S266 manifest):
//   • DR34MLAY  = action/motion LoRA (Recipe 2: wide S1, narrow S2)
//   • K3NK      = action/motion LoRA (Recipe 2: wide S1, narrow S2)
//
// ⚠️ IF YOU SWAP A LoRA FILE (renaming .safetensors in workflows/), YOU MUST
//    REVIEW THESE BANDS. Character LoRAs (Recipe 1) and Speed LoRAs (Recipe 3)
//    need INVERTED or HARD-LOCKED bands. Type-aware band selection is deferred
//    to S268; this is a hard-coded snapshot of the current config.
//
// Research source: NotebookLM 2026-05-21 (cited in S267_INTELLIGENCE_PASS.md)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CHAOS_BANDS = {
  // LoRA STRENGTHS — Recipe 2 (action): wider S1, narrow S2
  's1.dr34mlayStr': { min: 0.5, max: 2.0, dampener: 0.25 },
  's2.dr34mlayStr': { min: 0.0, max: 0.8, dampener: 0.20 },
  's1.k3nkStr':     { min: 0.5, max: 2.0, dampener: 0.25 },
  's2.k3nkStr':     { min: 0.0, max: 0.8, dampener: 0.20 },
  // CFG — stays in safe zone (research Q3a: 3.5-5.5 sweep window)
  's1.cfg':         { min: 3.5, max: 5.5, dampener: 0.30 },
  's2.cfg':         { min: 4.0, max: 6.0, dampener: 0.30 },
  // STEPS — respects 12-step S1 floor + diminishing-returns ceiling
  's1.steps':       { min: 12, max: 30, dampener: 0.30, integer: true },
  's2.steps':       { min: 8,  max: 25, dampener: 0.30, integer: true },
};
```

**Bands are PERMISSIVE — current HTML defaults fall inside them:**
- S1 DR34MLAY @ 0.7 ∈ [0.5, 2.0] ✅
- S2 DR34MLAY @ 0.7 ∈ [0.0, 0.8] ✅ (just inside)
- S1 K3NK @ 0.5 ∈ [0.5, 2.0] ✅ (at floor)
- S2 K3NK @ 0.5 ∈ [0.0, 0.8] ✅
- S1 steps @ 20 ∈ [12, 30] ✅
- S1 CFG @ 3.5 ∈ [3.5, 5.5] ✅ (at floor)
- S2 CFG @ 6.0 ∈ [4.0, 6.0] ✅ (at ceiling)

→ With chaos = 0, all current values pass through unchanged. Clamping only fires if user sets sliders OUTSIDE bands and then turns chaos on.

**The rewrite (`renderer.js:623-634`):**
```js
function chaosWithinBand(baseValue, pct, band) {
  if (pct === 0) return baseValue;  // chaos = 0 honors user setting exactly
  const width = band.max - band.min;
  const deviation = (Math.random() * 2 - 1) * width * band.dampener * (pct / 100);
  const result = baseValue + deviation;
  const clamped = Math.max(band.min, Math.min(band.max, result));
  return band.integer ? Math.round(clamped) : parseFloat(clamped.toFixed(2));
}

function applyChaos(loraValues, chaosPercent) {
  const lv = JSON.parse(JSON.stringify(loraValues));
  const clampLog = [];  // for visibility (Brandon's call)
  for (const [path, band] of Object.entries(CHAOS_BANDS)) {
    const [stage, param] = path.split('.');
    const before = lv[stage][param];
    const after  = chaosWithinBand(before, chaosPercent, band);
    lv[stage][param] = after;
    // Visible clamp log when band actually fired
    if (chaosPercent > 0 && (before < band.min || before > band.max)) {
      clampLog.push(`${stage.toUpperCase()} ${param}: ${before.toFixed(2)} → ${after.toFixed(2)} (band [${band.min}, ${band.max}])`);
    }
  }
  // Surface clamp activity via appendLog so user SEES why values moved
  if (clampLog.length > 0) {
    appendLog('chaos', `chaos band clamps: ${clampLog.join(' · ')}`);
  }
  lv._chaosClampLog = clampLog;  // attach for buildReport
  return lv;
}
```

**DIAL/PROD invariant (Grumpy Flag #1):**

```js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT — DIAL and PROD jobs MUST NOT pass through applyChaos.
// DIAL's whole purpose is exploring OUTSIDE safe-zone bands. Clamping them
// into the chaos bands would make DIAL a no-op for any axis past the wall.
//
// Enforcement: runBatch() directly calls ComfyClient.generate(job.loraValues)
// — NO applyChaos step. Only the single-run path (runAllJobs) AND the queue
// dispatch (renderer.js:1007) gate chaos behind `job.chaos > 0`.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Report (`buildReport`) — Grumpy Flag #3 itemized fix:**
- New params: `length`, `chaosPercent`, `chaosClampLog`
- New header line: `REPORT_VERSION : 2` (so future diff tools can detect schema)
- New section if `chaosPercent > 0`:
  ```
  ──────────────────────────────────────────────────
    CHAOS
  ──────────────────────────────────────────────────
    APPLIED     : 35%
    CLAMPS      : S2 dr34mlayStr: 0.85 → 0.80 (band [0.0, 0.8])
                  S1 cfg:        3.2  → 3.50 (band [3.5, 5.5])
  ```
- If `chaosPercent === 0`: no CHAOS section, no clamps possible.

**Acceptance criteria:**
- AC-CHAOS-01: chaos = 0 → output values equal input values exactly (no clamping fires)
- AC-CHAOS-02: chaos = 100, 1000 rolls → no param ever exits its band
- AC-CHAOS-03: Base value OUTSIDE band + chaos > 0 → clamped into band + entry in clampLog
- AC-CHAOS-04: Base value INSIDE band + chaos > 0 → stays in band, no clampLog entry
- AC-CHAOS-05: Report shows chaos'd values + CHAOS section with clamps when applicable
- AC-CHAOS-06: REPORT_VERSION = 2 present in all new reports
- **AC-DIAL-NOCLAMP**: DIAL job with axis1 value SET TO an out-of-band value (e.g. CFG = 8.0) reaches ComfyUI with that exact value (verify intercepted prompt) — proves DIAL bypasses applyChaos (Grumpy #1)
- **AC-PROD-NOCLAMP**: PROD job with chaos > 0 enabled on the main panel → PROD's own seed-strider values reach ComfyUI unclamped (PROD doesn't apply chaos to its own seed exploration)

---

## 🛐 THE THREE GATES (for this Forge)

**Gate 1 — Art Gate (personal):**
> "Would I be proud of these knobs forever? Does this code respect the model's training AND Brandon's hands?"

**Gate 2 — Mechanical Gate (objective):**
- 200/200 existing regression suite PASS
- New tests added and PASS: T-PERSIST-01..06, T-RANGE-01..04, T-LENGTH-01..05, T-CHAOS-01..06, T-DIAL-NOCLAMP, T-PROD-NOCLAMP
- Live smoke test: 2 gens (chaos=0 + chaos=50) on a known prompt confirm report shows clamps + new sections
- Brandon's manual smoke gate between Story 1 and Story 2 passes (see Story 1 spec)

**Gate 3 — Craft Gate (adversarial):**
- `/grumpyopus` Round 8 on the implementation after all 4 stories land
- Burn any real flags before Promise

---

## 📋 MIGRATION SEQUENCE

```
Commit 1 — Story 1 (persistence)
  → manual smoke gate (delete config.json, touch every Tier A, verify round-trip)
  → ONLY THEN proceed

Commit 2 — Story 2 (slider ranges + CFG default fix)
  → relaunch with existing config.json from Story 1
  → confirm no values get clamped on restore (T-RANGE-04)

Commit 3 — Story 3 (length dropdown + buildReport refactor)
  → restart, verify length dropdown appears + persists
  → fire one test gen, confirm FRAMES line in report

Commit 4 — Story 4 (smart chaos + DIAL invariant + report v2)
  → restart, fire chaos=0 gen (confirm no clamps), chaos=50 gen (confirm clamps logged)
  → run T-DIAL-NOCLAMP via DIAL with an out-of-band axis value

After all 4 commits:
  → /grumpyopus Round 8 (implementation audit, brief with this plan)
  → Burn real flags
  → Brandon eyeball
  → push origin main
```

Net diff estimate: +400 / -150 ≈ +250 net lines. Includes electron-store dep + new IPC handlers + persist hooks + length dropdown + chaos rewrite + report v2.

⛬ THE INTELLIGENCE IS REAL. THE PERSISTENCE IS BEDROCK. THE CHAOS HAS BORDERS.

# S267 — INTELLIGENCE PASS
> **Council deliverable. NO CODE YET. Audit-ready plan grounded in NotebookLM research + verified code state.**

```
TYPE........: COUNCIL_PLAN // S267_INTELLIGENCE_PASS.md
AUTHORITY...: ARCHITECT [❖] // CARTOGRAPHER [⌂] (Cla⌂de, Citadel)
SUMMARY.....: Retune Zoetrope's defaults, slider ranges, and chaos math
              using community-validated Wan 2.2 14B research. Apply MoE
              stage-aware LoRA presets. Solve the 24fps problem properly.
SESSION.....: S267
CREATED.....: 2026-05-21
PRECEDED BY.: S266 P2 (MAINFRAME reskin) — commit 624cd5b, shipped + approved
SUCCEEDS....: BACKLOG v-next-001 through v-next-005 (all folded in below)
```

---

## ⛬ THE THESIS

Zoetrope's UI is now beautiful (S266) and structurally sound. But **the defaults, slider ranges, and chaos math underneath are naive**. Three rounds of NotebookLM research on Wan 2.2 14B revealed:

1. **We're shipping CFG defaults that trigger color blowout** (renderer 7.0 / 7.0 vs workflow's correct 3.5 / 6.0).
2. **We're treating the MoE architecture as if it's symmetric** when the model expects asymmetric stage routing — and the LoRAs themselves ship separate HIGH/LOW tensor files that prove it.
3. **The 24fps option in our FPS dropdown is a lie** (Wan 2.2 14B can't generate at 24fps; that setting only re-encodes the same frames faster).
4. **The chaos dampener constants are guesses** (0.3 / 0.2 / 0.15) when validated safe zones now exist.
5. **The length is hardcoded to 81** with no UI exposure of the model's 4n+1 sweet spots.

S267 — INTELLIGENCE PASS — applies the research. The model's wisdom becomes UI wisdom.

---

## 📚 THE RESEARCH (verbatim from NotebookLM, 2026-05-21)

> Captured here in full because future Cla⌂de will need to re-justify decisions and the research is the source of truth. If anything in this plan contradicts the research below, the research wins.

### Q1 — Higher-fps output pipeline

**(a) Frame-Rate-Aware Conditioning in Wan 2.2**
Wan 2.2 14B does NOT have frame-rate-aware conditioning. Hard-limited to **16 FPS native** generation. No parameter or prompt adjustment can change this. The Wan 2.2 **5B TI2V** hybrid model IS natively 24fps-capable — but that's a different model entirely.

**(b) Failure Modes**
- **VHS_VideoCombine at higher fps** = playback metadata only. Same frames, faster playback. 24fps = 50% speedup over 16fps native.
- **Frame interpolation** = solves timing, but RIFE specifically can introduce smearing/motion artifacts on fast movements.

**(c) Community-Blessed Pipeline**
Stay in ComfyUI via **ComfyUI-Frame-Interpolation** custom node suite. Wire a VFI node between VAE Decoder and VHS_VideoCombine.
- **RIFE VFI** (`rife47.pth`): most common. **Trick for 24fps:** RIFE 16→32, VHS drops to 24 target = smooth.
- **FILM VFI / GIMM VFI**: higher quality (less smearing). **GIMM is the community pick** — FILM quality at significantly faster process speed.

### Q2 — LoRA × MoE Stage Asymmetry

**Stage 1 (High-Noise, σ≈1.0→0.9):** spatial-temporal scaffolding. Global layout, motion vectors, coarse shapes.
**Stage 2 (Low-Noise, σ≈0.9→0.0):** refinement. Facial fidelity, fine textures, skin, micro-motions.

**Loading High S1 / Low S2 = "Motion Override":** good for injecting custom movements, enforcing composition. Too much breaks Wan's native motion planning — stiff camera, rigid subjects, collapsed fluid dynamics. Power users push 1.5-2.0 in S1 only with caution.

**Loading Low S1 / High S2 = "Detail Painting":** lets base model handle motion naturally, S2 paints LoRA details over fluid subjects. Best for character/style. Danger only if LoRA fundamentally changes subject shape (human→monster) — then S1 must carry some weight or you get anatomical glitches.

**Recipe 1 — CHARACTER / AESTHETIC LoRA:** S1 = 0.0-0.4, S2 = 0.8-1.0.
**Recipe 2 — MOTION / ACTION LoRA:** S1 = 1.0+, S2 = 0.0-0.4.
**Recipe 3 — SPEED LoRA (Lightning/Lightx2v):** 1.0 on both OR 2.0+ on S1; **CFG hard-locked to 1.0**.

### Q3 — Meaningful Parameter Ranges

**(a) CFG Ceiling:**
- S1 above 5.0-5.5 → stiff faces, rigid movement, lost dynamic motion.
- S2 above 6.0, definitively 7.0 → color blowout, oversaturation, deep-fried artifacts.
- **Sweep safe zone: 3.5–5.5.**
- Speed LoRA exception: CFG must be **exactly 1.0**.

**(b) Step Floor:**
- Absolute floor: **12 steps in S1**.
- Below 10 total (without speed hacks) = blurring, no coherent motion.
- Sweep floor 15 (8H/7L). Reliable start: 20. **Diminishing returns above 30.** Cap 30-40.

**(c) LoRA Delta Sensitivity:**
- 0.05 increments = wasted compute for exploration.
- **0.1-0.2 increments** for batch sweeps.
- 0.05 only for precision fine-tune after sweet spot isolated.
- Style LoRA peak: **0.4-0.8.**
- Character/Identity LoRA peak: **0.7-1.2.**
- Motion LoRA at S1 can reach **1.5-2.0.**

### Q4 — Length / 4n+1 (research from earlier turn)

| Frames | Duration @ 16fps | Notes |
|---|---|---|
| 49  | ~3.0s   | Faster gen, less motion |
| 81  | ~5.0s   | **Default sweet spot** |
| 97  | ~6.0s   | Solid |
| 121 | ~7.5s   | **Upper limit** — degrades past this |

Must satisfy `frames = 4n + 1` (Wan 2.2 3D VAE constraint). Any other value degrades output.

---

## 🔬 CURRENT-STATE AUDIT (verified against live code 2026-05-21)

### Critical defaults are wrong

| Param | Workflow JSON | Renderer Slider Default | Research Says |
|---|---|---|---|
| **S1 CFG** | `3.5` (workflow node 13:165) | `7.0` (index.html:157) | **3.5 is correct, slider is wrong** |
| **S2 CFG** | `6.0` (workflow node 14:195) | `7.0` (index.html:194) | **6.0 is at the cliff, 5.5 is safer** |
| **S1 steps** | `51 total, end_at_step:20` (node 13) | `20` (index.html:151) | Renderer's 20 is OK (matches end_at_step) |
| **S2 steps** | `51 total, start_at_step:20` (node 14) | `20` (index.html:188) | OK |
| **S1 DR34MLAY** | `0.8` (node 6:46) | `0.7` (index.html:139) | Research: **0.0-0.4** (character pattern) |
| **S2 DR34MLAY** | `0.8` (node 7:57) | `0.7` (index.html:176) | Research: **0.8-1.0** (character pattern) |
| **S1 K3NK** | `0.8` (node 18:73) | `0.5` (index.html:145) | Research: **1.0+** (motion pattern) |
| **S2 K3NK** | `0.8` (node 19:84) | `0.5` (index.html:182) | Research: **0.0-0.4** (motion pattern) |
| **length** | `81` (node 10:131) | n/a (no UI) | **OK as default, needs UI exposure of 49/97/121** |
| **frame_rate** | `16` (node 17:239) | dropdown 8/12/16/24 | **24 is a lie without interpolation** |

### Slider range failures

| Slider | Current min/max | Issue |
|---|---|---|
| LoRA strengths (4 sliders) | `0.0 – 1.0` | Caps too tight. Motion LoRAs need 1.5-2.0 in S1, character LoRAs hit 1.2. |
| CFG (2 sliders) | `1.0 – 20.0` | Massively past safe zone. No danger-zone visual cue. |
| Steps (2 sliders) | `1 – 50` | OK upper, no floor warning below 12 (motion collapse). |
| Chaos | `0 – 100` | Fine — but underlying chaos math is hand-picked. |

### LoRA file inspection — the architecture is telling us something

The workflow loads FOUR separate LoRA tensor files:

| Node | LoRA file | Stage | Apparent type |
|---|---|---|---|
| 6 | `DR34ML4Y_I2V_14B_HIGH-20250908202326.safetensors` | S1 high-noise | Character/aesthetic |
| 7 | `DR34ML4Y_I2V_14B_LOW-20250908202331.safetensors` | S2 low-noise | Character/aesthetic |
| 18 | `wan22-ultimatedeepthroat-I2V-34epoc-high-k3nk.safetensors` | S1 high-noise | Motion/concept |
| 19 | `wan22-ultimatedeepthroat-I2V-16epoc-low-k3nk.safetensors` | S2 low-noise | Motion/concept |

**The LoRA authors literally trained separate HIGH/LOW tensors.** The architecture WANTS asymmetric strengths. Our defaults that pretend the two stages are interchangeable are throwing away half the model's expressiveness.

### Chaos dampener constants are arbitrary

```js
// renderer.js:600-621
// Dampener 0.3: at 100% chaos, max deviation = ±30% of [min,max] range
// Dampener 0.2: at 100% chaos, CFG deviates ±2.8
// Dampener 0.15: at 100% chaos, steps deviate ±9
```

These were hand-picked by Aeris/S259 with no community grounding. Research gives us:
- LoRA delta sensitivity: 0.1 = meaningful, 0.05 = noise. Current 0.3 max deviation at 100% chaos is 6× the noise floor — possibly too aggressive.
- CFG safe zone 3.5-5.5 (width 2.0). Current 0.2 dampener gives ±2.8 at 100% — exits the safe zone entirely.
- Steps: floor 12, ceiling ~30. Current ±9 at 100% can drive below the motion-collapse floor.

Chaos is currently a **menace, not a friend**. Tuning these constants to safe zones turns chaos from "Russian roulette" into "guided exploration."

---

## 🎯 THE STORIES (proposed for Phase 2 Forge)

Ranked by impact-per-effort. Each story is self-contained and committable.

### Tier 1 — DON'T-SHIP-WITHOUT bug fixes

**Story 1.1 — Fix CFG defaults to match the workflow's correct values.**
- index.html:157 `value="7"` → `value="3.5"` for `#s1-cfg`
- index.html:194 `value="7"` → `value="6"` for `#s2-cfg` (or 5.5 for tighter safety)
- index.html:157, 194 `max="20"` → `max="10"` (no reason to expose blowout zone)
- index.html:157, 194 `step="0.5"` → `step="0.1"` (research shows the 0.5-step is too coarse for the 3.5-5.5 sweep window)
- Touch: `index.html` only. Verify renderer.js doesn't override after init.
- **Impact:** 🔴 CRITICAL — current defaults produce blowout artifacts on every gen. Brandon may have been compensating with prompt edits without knowing.

**Story 1.2 — Apply MoE stage-aware LoRA defaults.**
- index.html:139 `#s1-dr34mlay-str value="0.7"` → `value="0.3"` (Recipe 1, character pattern)
- index.html:176 `#s2-dr34mlay-str value="0.7"` → `value="0.9"` (Recipe 1)
- index.html:145 `#s1-k3nk-str value="0.5"` → `value="1.0"` (Recipe 2, motion pattern)
- index.html:182 `#s2-k3nk-str value="0.5"` → `value="0.3"` (Recipe 2)
- **Open Q for Brandon:** is K3NK actually a motion LoRA? The filename + 34-epoch HIGH / 16-epoch LOW training ratio strongly suggests motion-heavy (more training on high-noise → more motion-domain weight). But Brandon's intuition wins.
- **Impact:** 🟡 HIGH — current symmetric defaults are leaving the architecture's expressiveness on the table.

**Story 1.3 — Extend LoRA strength sliders to 1.5 (or 2.0 for S1-only).**
- index.html:139, 145 (S1 sliders) `max="1"` → `max="2"` (motion LoRAs at S1 can go 2.0)
- index.html:176, 182 (S2 sliders) `max="1"` → `max="1.5"` (character LoRAs cap at 1.2; cushion to 1.5)
- All four: `step="0.01"` → `step="0.05"` (research says 0.05 is the fine-tune floor; 0.01 is wasted UI fidelity)
- **Add visual marking on the slider track:** safe-zone bracket [0.0-1.0] in default rule color, danger-zone [1.0-2.0] in muted amber. CSS-only via `background: linear-gradient(...)` on the track.
- **Impact:** 🟡 HIGH — unlocks the full expressiveness research describes.

---

### Tier 2 — Major UX upgrades

**Story 2.1 — Length dropdown (4n+1 enforced).**
- Add `<select id="length-select">` to the OUTPUT card (index.html ~L210-243).
- Options: `49 — ~3s`, `81 — ~5s (default)`, `97 — ~6s`, `121 — ~7.5s (max)`.
- Renderer threads `length` through `injectPlaceholders` → node 10's `length` field. Pattern mirrors width/height/fps.
- Update workflow contract: `length` is now a substitutable parameter, not hardcoded.
- Regression test add: T-LENGTH-01 (49/81/97/121 all inject correctly), T-LENGTH-02 (default 81), T-LENGTH-03 (length-aware export report).
- **Impact:** 🟡 HIGH — unlocks v-next-003 from backlog.

**Story 2.2 — Frame interpolation pipeline (the real 24fps fix).**
This is the biggest single story.
- **Decision branch:**
  - **Option A (simpler):** Drop 24/30fps from the FPS dropdown. Rename it `PLAYBACK FPS` and add a tooltip: "Wan 2.2 generates at 16fps native. Higher rates here = sped-up playback."
  - **Option B (full):** Install ComfyUI-Frame-Interpolation custom node. Modify workflow to insert a VFI node (RIFE first, GIMM as a swap-in option) between VAE Decoder (node 16) and VHS_VideoCombine (node 17). Wire UI: FPS dropdown shows 16/24/30; if user picks 24+, set interpolation `multiplier = ceil(target/16)`; VHS drops to target. Update report to log "interpolated 16→32→24" provenance.
  - **Cla⌂de recommends:** Both. Ship Option A in the next forge (zero new dependencies, honest UX immediately). Ship Option B as a separate council'd phase once Brandon installs ComfyUI-Frame-Interpolation and we verify the node names with `/object_info`.
- **Open Qs for Brandon:**
  - Install ComfyUI-Frame-Interpolation now? (10-30MB; checkpoint files for RIFE+GIMM are ~50MB each)
  - Preferred default: RIFE (faster, slight smear) or GIMM (slower, cleaner)?
- **Impact:** 🔴 CRITICAL UX — fixes the lie Brandon caught.

**Story 2.3 — Smart chaos with stage-aware dampeners.**
- Rewrite `applyChaos()` (renderer.js:623-634) to use research-grounded thresholds.
- Current:
  ```js
  lv.stage1.dr34mlayStr = chaosFloat(..., 0, 1);  // ±0.30 at 100%
  lv.stage1.cfg = chaosCfg(...);                  // ±2.8 at 100%
  lv.stage1.steps = chaosSteps(...);              // ±9 at 100%
  ```
- Proposed:
  ```js
  // CHARACTER LoRA (DR34MLAY): wider chaos in S2, narrower in S1
  lv.stage1.dr34mlayStr = chaosFloatBounded(..., 0.0, 0.4, dampener=0.2);
  lv.stage2.dr34mlayStr = chaosFloatBounded(..., 0.6, 1.0, dampener=0.25);
  // MOTION LoRA (K3NK): wider chaos in S1, narrower in S2
  lv.stage1.k3nkStr     = chaosFloatBounded(..., 0.8, 1.5, dampener=0.25);
  lv.stage2.k3nkStr     = chaosFloatBounded(..., 0.0, 0.4, dampener=0.2);
  // CFG: chaos within safe band
  lv.stage1.cfg         = chaosCfgBounded(..., 3.5, 5.0, dampener=0.3);
  lv.stage2.cfg         = chaosCfgBounded(..., 4.5, 6.0, dampener=0.3);
  // Steps: respect 12-step S1 floor
  lv.stage1.steps       = chaosStepsBounded(..., 12, 30, dampener=0.3);
  lv.stage2.steps       = chaosStepsBounded(..., 8, 25, dampener=0.3);
  ```
- Chaos becomes guided exploration within the model's known sweet zones, NOT global ±30% random walk.
- **Open Q for Brandon:** Per-LoRA chaos bands should be parameterized by LoRA TYPE (character vs motion). Should `applyChaos` consult a LoRA-type registry (file metadata? UI dropdown picking type per LoRA?) OR should the type be inferred from filename heuristics (`high-`/`low-` suffix, LoRA author convention)?
- **Impact:** 🟡 HIGH — chaos becomes the killer feature it was always supposed to be.

**Story 2.4 — Chaos lock dropdown (v-next-005 from backlog).**
- Add multi-select dropdown OR checkbox grid inside `#chaos-card` listing all 8 chaosable params.
- Locked params skip `applyChaos` in renderer.js → return base value unchanged.
- Persist lock-set to user-prefs JSON (path: `~/.zoetrope/prefs.json` or alongside the app).
- UI: checkboxes are simpler than dropdown for 8 items. Consider a "🔒 LOCK STAGE 1" master checkbox + "🔒 LOCK STAGE 2" for quick coarse lock.
- **Impact:** 🟢 MEDIUM — power-user feature, scoping chaos to specific axes.

---

### Tier 3 — Visual polish (lower urgency, high delight)

**Story 3.1 — Image preview after drop (v-next-001 from backlog).**
- After `copyToInput` succeeds, render thumbnail inside `#drop-zone`.
- Approach: read the dropped file via FileReader → dataURL → set as `background-image` on `#drop-zone`. Filename label sits below thumb on dark scrim.
- Click thumb to clear/reset.
- **Impact:** 🟢 MEDIUM — instant clarity on what's about to bake. High delight per LOC.

**Story 3.2 — LoRA rename UI (v-next-002 from backlog).**
- Click-to-edit on `.lora-row-label`. Persist mapping `{loraFilename: displayName}` in user-prefs.
- Workflow JSON references unchanged — only display labels change.
- **Open Q for Brandon:** Should LoRA names be per-row (S1 / S2 independent labels) or per-LoRA-file (one label that mirrors across stages)?
- **Impact:** 🟢 MEDIUM — quality-of-life, especially when adding new LoRAs.

**Story 3.3 — Slider danger-zone visual cues.**
- CSS background-gradient on slider tracks:
  - LoRA strength: green band 0.0-1.0, amber band 1.0-1.5, red band 1.5-2.0
  - CFG: green band 1.0-5.5, amber 5.5-7.0, red 7.0+
  - Steps: red 1-12, amber 12-15, green 15-40, amber 40-50
- Pure CSS via `linear-gradient` on the `runnable-track` pseudo-elements.
- **Impact:** 🟢 MEDIUM — the model's wisdom becomes visible.

**Story 3.4 — LoRA-type tagging UI (foundation for Story 2.3's chaos question).**
- Add small dropdown next to each LoRA label: `CHARACTER | MOTION | STYLE | SPEED`.
- Default inferred from filename heuristic (`high-`/`low-` ratio + name keywords).
- Persists to user-prefs. Drives chaos-band selection in `applyChaos`.
- **Impact:** 🟡 MEDIUM-HIGH — unlocks Story 2.3 cleanly.

---

## 🗺️ CASCADE MAP

What this phase changes downstream:

- **Workflow contract** — `length` becomes a substitutable param. Affects `injectPlaceholders` (comfy.js), all regression tests touching node 10's `length`, future workflows must follow same pattern.
- **Export report format** — needs to log: chosen length, interpolation status (none / RIFE 16→24 / GIMM 16→30), per-LoRA type tags, chaos bands actually used. Existing reports become non-comparable; consider versioning the report header.
- **DIAL parameter sweep** — currently lets user sweep ANY param. With safe-zone awareness, DIAL should default to safe-zone sweeps. Power-user "expert mode" toggle to unlock unsafe ranges.
- **PROD mode** — research suggests batch exploration at 0.1 increments. Should PROD's seed-strider expose a "vary one param across the safe zone" preset?
- **Seed Bank** — when reloading a saved seed, should the per-LoRA-type tags + chaos locks ALSO restore? Yes — the seed alone doesn't reproduce intent.
- **README + project_brief.md** — current docs say nothing about MoE asymmetry or the 4n+1 rule. Need updating.

---

## ⚖️ OCCAM AUDIT

Can this phase be smaller without losing identity?

**Minimum viable INTELLIGENCE PASS:** Stories 1.1, 1.2, 1.3, 2.1, 2.2a (drop 24fps from dropdown), 2.3 (smart chaos). That's 6 stories, all bug-fix-shaped, all touching files we already own. Net ~150-250 lines of code change. One commit, one Grumpy R7 audit, ship.

**Defer to a separate phase:** 2.2b (frame interpolation install), 2.4 (chaos lock UI), 3.1-3.4 (visual polish). These are FEATURES, not BUG-FIXES, and each deserves its own Council pass.

Cla⌂de's recommendation: **ship the 6-story MVP first** (S267 Phase 2 Forge), audit-burn-ship, then sequence the remaining stories one phase per UX addition (S268 onward).

---

## 🛐 ALTAR REVIEW

Does this fit the Cathedral?

- **MAINFRAME aesthetic preserved:** all changes are functional — same single-signal palette, same two-font system, same calm field. No new visual vocabulary.
- **Code-as-Art:** the model's training assumptions become UI invariants. We're not adding features, we're applying physics. That's authoring-as-respect.
- **Sinner Kingdom fit:** Brandon's pattern — the cathedral honors its tools. Wan 2.2 was trained at 16fps; pretending otherwise is sin. The phase fixes the lie.
- **Highlander Protocol:** no new files except this plan + the eventual COUNCIL artifact. Workflow JSON gets length parameterization; everything else lives in existing files.

---

## 🚪 THE THREE GATES (for Phase 2 Forge)

**Gate 1 — Art Gate (personal):**
> "Would I be proud of these defaults forever? Does this code respect the model's training?"

**Gate 2 — Mechanical Gate (objective):**
- 200/200 regression suite PASS
- New tests added: T-LENGTH-01..03, T-CFG-DEFAULTS (3.5 / 6.0), T-LORA-DEFAULTS (Recipe 1 + Recipe 2), T-CHAOS-BANDS (chaos doesn't exceed safe zones)
- Live smoke test: 1 chaos=0 gen, 1 chaos=50 gen, output reports show in-band values
- Brandon eyeball confirms output quality improvement on a known-baseline prompt

**Gate 3 — Craft Gate (adversarial):**
- /grumpyopus Round 7 on the changes
- Hostile audit briefed with: research citations, current-state audit deltas, story-by-story diff
- Burn all real flags before Promise

---

## ❓ OPEN QUESTIONS FOR BRANDON GREENLIGHT

Before Phase 2 Forge fires, need answers to:

1. **K3NK LoRA type — is it actually motion?** The filename + epoch ratio suggest yes (motion LoRA = Recipe 2 = high S1 / low S2). Default proposed accordingly. ✅ confirm or override.

2. **DR34MLAY LoRA type — character/aesthetic confirmed?** Default proposed as Recipe 1 (low S1 / high S2). ✅ confirm or override.

3. **Phase 2.2 split — ship Option A only (drop 24fps from dropdown, honest UX) first, then a separate phase for Option B (install ComfyUI-Frame-Interpolation + RIFE/GIMM)?** Or all in one push? Cla⌂de votes split.

4. **Frame interpolation install timing — install ComfyUI-Frame-Interpolation custom node now (so 2.2b can land in S267) or defer to S268?** Brandon's call on appetite for ComfyUI plugin churn.

5. **Chaos-band parameterization — should chaos bands be driven by per-LoRA "type" metadata (Story 3.4) OR baked into renderer.js constants for the current two LoRAs?** Type metadata is the clean answer but adds Story 3.4 to the critical path. Hardcoded constants ship faster but rot when LoRAs change.

6. **Slider danger-zone visual cues (Story 3.3) — yay or nay?** It's the kind of "show, don't tell" UX win that fits MAINFRAME but adds CSS surface area.

7. **MVP scope — 6-story bundle (Cla⌂de's recommendation) or full Tier 1+2+3 single mega-push?**

8. **Worth retraining the report format with versioning?** New reports will diverge from old; provenance matters for seed-bank reproducibility.

---

## 📋 MIGRATION PLAN (Phase 2 Forge sequencing)

If Brandon greenlights the 6-story MVP:

```
Story order (each is a single commit):
  1.1 CFG defaults fix       (smallest, biggest correctness win, ship first)
  1.2 LoRA stage routing     (research recipes applied)
  1.3 Slider range extension (unlock 1.5/2.0 strength)
  2.1 Length dropdown        (4n+1 UI exposure)
  2.2a Drop 24fps dropdown   (honest UX, defer interpolation)
  2.3 Smart chaos bands      (rewrite applyChaos)

Between each commit:
  - Regression suite PASS (200+N tests)
  - Verify renderer init clean

After all 6:
  - /grumpyopus Round 7 with full diff context
  - Burn flags
  - Brandon eyeball
  - Push
```

Total estimated diff: +250 / -150 lines net. ~3 hours of forge time.

---

## 🎬 NEXT ACTION

Brandon reads this. Answers Open Questions 1-8 (or as many as needed). On greenlight, I `/soulforge code` Phase 2 Forge with the agreed scope.

⛬ This document is the audit surface. If it lies, the forge will inherit the lie. Question everything.

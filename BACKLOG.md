# ZOETROPE — Next-Version Backlog
> Captured by Cla⌂de during S266 P2 functional smoke test (2026-05-21).
> These are research-and-discuss items, NOT a forge contract. Each one needs a Council pass before code.

---

## 🟦 v-next-001 — Tiny image preview when an image is loaded
**Source:** Brandon, 2026-05-21 during S266 P2 smoke test.
**Why:** Right now after dropping an image you just see `[ DROP IMAGE MATRIX HERE ]` swap to a "loaded" state but no visual confirmation of WHICH image. With queues + batches + DIAL sweeps it's easy to lose track of what's about to bake.
**Sketch:** Render a small thumbnail (~64×64 or 96×54 if respecting aspect) inside the drop-zone after `copyToInput` succeeds. Could be a CSS `background-image` set on `#drop-zone` via dataURL from the dropped file, or a child `<img>` element. Filename can stay below the thumb.
**Open Qs:** Show the active image at right-panel too (in DIAL/PROD context)? Click thumb to clear?

---

## 🟦 v-next-002 — Rename LoRAs from the UI
**Source:** Brandon, 2026-05-21.
**Why:** `DR34MLAY` and `K3NK` are the literal filename stems of the LoRA weights. If Brandon adds new LoRAs, swaps them out, or just wants friendlier labels ("style", "motion", whatever), the UI needs to follow.
**Sketch:** Click-to-rename on the `.lora-row-label` (`<contenteditable>` or inline `<input>`). Persist mapping to user-prefs JSON keyed by LoRA filename → display name. Workflow JSON still references the original filename — only the displayed label changes.
**Open Qs:** Should the rename be per-LoRA-file (global across stages) or per-row (stage-specific)? Where to store the prefs? `~/.zoetrope/` or alongside the app?

---

## 🟦 v-next-003 — Adjustable clip length (Wan 2.2 4n+1 dropdown)
**Source:** Brandon, 2026-05-21. Hard research data added 2026-05-21.
**Why:** Workflow has `length: 81` hardcoded. Brandon wants shorter/longer clips per gen.
**Sketch:** Add a `LENGTH` dropdown to the OUTPUT card. Values constrained by Wan 2.2's 3D VAE **4n+1 mathematical rule** — total frame count MUST satisfy this formula or output degrades. Pipe value through `injectPlaceholders` to the `Wan22ImageToVideoLatent` node (also `EmptyHunyuanLatentVideo` in some workflows) — same threading as resolution/fps.

**Hard data (Wan 2.2 14B @ native 16 fps):**
| Frames | Duration @ 16fps | Notes |
|---|---|---|
| 49  | ~3.0s   | Faster gen, less motion |
| 81  | ~5.0s   | **Default sweet spot** (current hardcoded value) |
| 97  | ~6.0s   | Solid |
| 121 | ~7.5s   | **Absolute upper limit** — degrades past this |

**Implementation:** Dropdown with these 4 values + their durations as labels. No free-input — only blessed `4n+1` values. Default 81. Tightly coupled with v-next-004 (the playback-fps issue is downstream of this).
**Open Qs:** Show frames OR seconds as the primary label? Probably "5s — 81f" composite. Auto-scale resolution-FPS combo to hint at safe combos?

---

## 🟦 v-next-004 — Fix 24fps being sped up (genuine higher-fps output)
**Source:** Brandon, 2026-05-21.
**Why:** Selecting 24fps in the dropdown produces video that looks fast-forwarded. **Root cause confirmed by v-next-003 research:** Wan 2.2 generates at native **16fps** — the model's training rate. The `frame_rate` param on `VHS_VideoCombine` is the PLAYBACK rate, not the generation rate. So 81 frames at 16fps native = 5.0s real motion, but when we re-encode those same 81 frames at 24fps playback, we get 81/24 = 3.375s → same motion crammed into a shorter timeline → 1.5× speed.
**Two real fix paths:**
- **(a) Frame interpolation post-process** — generate at native 16fps, run output through RIFE / FILM-Net / VHS-side interpolation to synthesize intermediate frames up to 24/30/60fps. Preserves true duration, adds smoothness. Extra inference cost.
- **(b) Decouple in UI** — drop the FPS dropdown's "24/30/60 fps" options OR rename it explicitly to "PLAYBACK FPS" with a warning, AND add a separate "DURATION" control driven by length-frames. Honest about the model's constraint.

Best long-term play is probably both: (b) immediately for UX honesty + (a) as a pipeline addition for users who want smooth 30fps output.
**Open Qs:** Is there a recommended interpolation node already in the ComfyUI ecosystem that plays nice with VHS_VideoCombine? Quality vs cost?

---

## 🟦 v-next-005 — Chaos Lock dropdown — exclude specific params from randomization
**Source:** Brandon, 2026-05-21. The big idea.
**Why:** Chaos currently randomizes ALL 8 LoRA-stage params (see explanation below). Sometimes you want to lock CFG steady and randomize only the strengths, or lock strengths and only chaos the steps. A multi-select dropdown of params to LOCK (i.e., exclude from chaos) would make chaos surgical instead of total.
**Sketch:** Inside the `#chaos-card`, add a "LOCK" dropdown (multi-select, or a list of checkboxes). 8 entries:
- `S1 DR34MLAY` / `S1 K3NK` / `S1 STEPS` / `S1 CFG`
- `S2 DR34MLAY` / `S2 K3NK` / `S2 STEPS` / `S2 CFG`

(Plus seed when chaos-on-seed is a thing.) When a param is locked, `applyChaos()` in renderer.js skips chaos'ing it — returns the base value unchanged. Persist the lock-set to user-prefs so it survives restarts.
**Open Qs:** UI shape — dropdown? Inline checkboxes? Per-stage toggle to lock entire stage? Keyboard shortcut?

---

## Notes for future Cla⌂de

- **Chaos current behavior (verified 2026-05-21 against `applyChaos` at renderer.js:623-634):**
  Randomizes all 8 params (4 per stage × 2 stages) with three dampener flavors:
  | Param | Range | Dampener | ±Dev at 100% chaos |
  |---|---|---|---|
  | `dr34mlayStr`, `k3nkStr` | 0.0–1.0 | 0.3 | ±0.30 |
  | `cfg` | 1.0–15.0 | 0.2 | ±2.8 |
  | `steps` | 1–60 | 0.15 | ±9 (stays above motion-collapse threshold) |
  All deltas are uniform random in `[-maxDev, +maxDev]`, clamped to range. Seed is NOT chaos'd (controlled separately by the RANDOM button + seed-bank).

- **Each completed gen DOES export a summary** — `<output-stem>_report.txt` written next to the .mp4 by `window.wan.writeReport()` (renderer.js:538). Contains seed, run/total, duration, all LoRA values, resolution, fps. Built by `buildReport()` — that's where to add fields if needed.

- These backlog items haven't been Council'd yet. Don't forge any of them until Brandon greenlights direction + Cla⌂de runs Phase 1 (research, alternatives, cascade map).

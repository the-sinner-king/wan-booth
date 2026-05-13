# WAN BOOTH — UI DESIGN BRIEF v2
## Rethink from the ground up — Bad Candy Arcade

**Created:** 2026-05-10  
**Scope:** `app/index.html` (CSS + HTML structure) only. `renderer.js` logic untouched. All existing element IDs and data flow preserved — the redesign is a costume change, not a surgery.

---

## THE GOAL IN ONE SENTENCE

Make WAN BOOTH feel like an arcade machine that was built in 1997 by a small studio that was quietly making the most beautiful thing they'd ever made — and ship it into a dark room with neon light bleeding through the cracks.

---

## AESTHETIC DOCTRINE — BAD CANDY ARCADE

This is the founding aesthetic. Every decision answers to this.

**Feral Domestic.** A system that blushes while it gives orders. It is not clinical. It is not minimal. It is warm, faintly pink, slightly overdriven. It gives orders with its chest. It also blushes.

**Dark arcade void** — Deep near-black background. Not pure black. Something with a faint purple or blue undertone. The void is where the glow lives.

**Neon bleeds** — Hot pink and electric cyan in tension. Amber as the gold thread. One of these colors is the "active signal" — it glows on hover, on progress, on life. The others accent.

**The glow is the soul** — `text-shadow`, `box-shadow`, glows on key elements. Not everywhere — on the things that matter. The GENERATE button should pulse like a heartbeat when ComfyUI is alive.

**Typography** — VT323 (monospaced, terminal body) and Press Start 2P (pixel display) are already linked. Use them with intention. Press Start 2P is for the ALTAR (the main button, the nameplate). VT323 is for everything else — labels, values, log output, all of it.

**Hard edges** — No border-radius anywhere. The machine doesn't round its corners. Pixels are pixels.

**1px borders** — Used for structure, not decoration. Borders glow on active state. They do not soften the geometry.

**Reference:** SULPHER_KAWAII / Bad Candy Arcade. A neon-drenched arcade thing with a soft underbelly.

---

## WHAT IS NOT CHANGING

- All `id` attributes — renderer.js binds to these, they are sacred
- All `class` names used by renderer.js
- All data attributes
- Any JS-injected inline styles (`display:none`, `display:flex`, `data-generating`, etc.) — these must be preserved
- `comfy.js` and `renderer.js` — zero changes
- The IPC bridge in `preload.js` — zero changes
- The token files (`color-tokens.css`, `type-tokens.css`) — may be updated as part of the design, but carefully
- The `<meta http-equiv="Content-Security-Policy">` — do not touch
- All `aria-label` and `aria-live` attributes — accessibility is load-bearing

---

## CURRENT PROBLEMS TO FIX

### 1. No mode identity
The user is doing one of three things: a single generate, a DIAL sweep, or a PRODUCTION batch. The current UI doesn't know this — everything is always visible, collapsed or expanded. The result is a long list of panels with no story.

**Fix:** Mode selector at the top. SINGLE / DIAL / PRODUCTION. The mode changes what the lower UI emphasizes.

### 2. Batch modes feel like footnotes
DIAL and PRODUCTION are at the very bottom, after the progress bar, after the log, after the seed bank. They were built last and they sit last. They are actually the most powerful features in the app.

**Fix:** Elevate batch modes to first-class citizens in the visual hierarchy.

### 3. GENERATE button is not the altar
The big action — the irreversible commit, the machine goes — should feel like the most important thing on screen. Currently it's one `<button>` among many, same visual weight as "SAVE AS…" and "CLEAR".

**Fix:** The action button (GENERATE / RUN DIAL / RUN BATCH — context-dependent) is the architectural focal point of the lower half. It gets special treatment.

### 4. Progress / results zone is fragmented
Progress bar → ETA row → status text → log → seed bank → queue → batch panel → video. These live in 8 separate vertical slots with no visual grouping. When something is running, the UI tells you its status in 6 different places with no hierarchy.

**Fix:** A unified results zone below the controls. Progress, status, log, and video are one conceptual block.

### 5. Overloaded visual language
Every panel looks the same: 1px border, slightly elevated background, small label at the top. Stage 1 LoRA card, Chaos card, Output Settings card, Preset card — all the same visual DNA. Nothing reads as more important than anything else.

**Fix:** A clear 3-tier visual hierarchy: primary (nameplate + altar), secondary (the core controls), tertiary (utilities and settings).

---

## NEW INFORMATION ARCHITECTURE

### ZONE MAP (top to bottom)

```
┌─────────────────────────────────────────────────────┐
│  ZONE 1: HEADER                                     │
│  WAN BOOTH wordmark + ComfyUI status indicator      │
│  Always visible. The identity of the machine.       │
├─────────────────────────────────────────────────────┤
│  ZONE 2: MODE SELECTOR                              │
│  [ SINGLE ] [ DIAL ] [ PRODUCTION ]                 │
│  Three-tab arcade-style switcher.                   │
│  Sets the context for everything below.             │
├─────────────────────────────────────────────────────┤
│  ZONE 3: INPUT BLOCK                                │
│  Drop zone — image input (always visible)           │
│  Prompt textarea (always visible)                   │
├─────────────────────────────────────────────────────┤
│  ZONE 4: PARAMETER BLOCK                            │
│  LoRA Stage 1 (collapsible — open default)          │
│  LoRA Stage 2 (collapsible — open default)          │
│  Chaos slider (inline, below stages)                │
│  Seed control (inline, below chaos)                 │
│  Output settings — resolution/FPS/runs              │
│  Preset system (collapsible — closed default)       │
│  Seed bank (collapsible — closed default)           │
├─────────────────────────────────────────────────────┤
│  ZONE 5: MODE-SPECIFIC CONTROLS                     │
│  SINGLE: [nothing — just the altar]                 │
│  DIAL: axis config, seed lock, job count            │
│  PRODUCTION: count, seed strategy, base seed        │
├─────────────────────────────────────────────────────┤
│  ZONE 6: THE ALTAR                                  │
│  GENERATE / RUN DIAL / RUN BATCH                    │
│  Full-width. Pulsing glow when ComfyUI is alive.   │
│  The machine's commit point.                        │
├─────────────────────────────────────────────────────┤
│  ZONE 7: RESULTS ZONE                               │
│  Progress bar + shimmer (always rendered)           │
│  ETA / Elapsed row (shown during generation)        │
│  Status text / error display                        │
│  Batch job list (shown during batch)                │
│  Execution log (collapsible)                        │
│  Video player (appears on completion)               │
└─────────────────────────────────────────────────────┘
```

---

## SECTION-BY-SECTION DESIGN TARGETS

### ZONE 1 — HEADER

**Current:** Amber text-shadow WAN BOOTH h1, 1px bottom border, plain padding.

**Target:**
- The wordmark gets a dramatic upgrade. Full-width header bar with ambient glow. The `WAN BOOTH` text should feel like the name above an arcade cabinet — not just a label.
- Add a ComfyUI status indicator inline with the header (small, right-aligned): a dot + text. Green glow = CONNECTED. Dim amber = CONNECTING. Dim red = DISCONNECTED.
- The status indicator is already in renderer.js logic — it just needs a place to live visually in the header rather than in the main flow.
- The header should feel permanently illuminated — even when nothing is running, the nameplate glows.

**Design note:** Press Start 2P for "WAN BOOTH". Possible subtitle in VT323: "BAD CANDY ARCADE EDITION" or "IMAGE TO VIDEO ENGINE".

---

### ZONE 2 — MODE SELECTOR

**Current:** Does not exist. SINGLE mode is the default, DIAL and PRODUCTION are collapsed sections at the bottom.

**Target:**
- Three segments: `SINGLE` | `DIAL` | `PRODUCTION`
- Full-width row below the header, above everything else
- Active segment: filled background in the primary accent color (hot pink or amber — TBD by CHROMA_BLEED), 1px glow border
- Inactive segments: dark background, muted border, dim text
- The active mode changes which Zone 5 controls are visible (JS handles this; CSS handles the styling)
- Press Start 2P or VT323 for the mode labels — probably VT323 at a size that reads clearly

**Design note:** This is the first thing you see after the nameplate. It should feel like choosing difficulty on an arcade game. Not a business tab strip.

---

### ZONE 3 — INPUT BLOCK

**Current:** Drop zone (dashed border, centered label) + textarea (plain input).

**Target (drop zone):**
- Bigger theatrical presence when empty — it IS the invitation to begin
- When empty: dashed border in muted accent, centered label text with a subtle pulse or breathing glow
- When dragging over: border becomes solid hot pink, background tint, label changes
- When loaded: border becomes solid neon/cyan, the image filename is displayed, thumbnail preview if possible (note: this may require renderer.js change — flag as OPTIONAL)
- The zone should feel like a stage. You're dropping the source material.

**Target (prompt textarea):**
- Feels like a console/terminal input — not a form field
- Mono font (VT323), slightly larger than current
- A faint glow on the border when focused
- Placeholder text should be evocative, not generic. Something like: `describe what moves...` or `the camera drifts...`
- The textarea is where the director speaks. It should feel like a director's chair.

---

### ZONE 4 — PARAMETER BLOCK

**Current:** LoRA stage cards (subgrid sliders), chaos card, seed row, output settings card, preset section, seed bank.

**Target (LoRA stage cards):**
- The stage cards are the heart of the technical controls — they should feel like actual equipment panels
- The current slider track (3px, hard-edge thumb) is already good industrial language — keep the language, upgrade the presentation
- The header for each stage could be more dramatic — currently just a text label + caret
- Consider: stage number / name in a slightly larger type, with an accent color on the stage header vs the body
- The seam between Stage 1 and Stage 2 (4px gap) is good — the two stages ARE one instrument block

**Target (chaos slider):**
- Chaos deserves more personality — it's one of the most interesting controls in the app
- Currently: a plain card that looks identical to output settings
- Target: something that looks a little unhinged — the label `CHAOS` could have a different color/treatment, the slider fill could be gradient (amber → hot pink), the label text could change as you drag
- When chaos is nonzero: some visual indicator that the machine is in "chaos mode" — maybe the chaos card border glows differently

**Target (seed row):**
- Currently: small text row with a RANDOM toggle button and a number input
- The seed is more important than it looks — it's the fingerprint of the generation
- Target: give seed a more prominent card treatment or at least better visual separation
- The seed value when FIXED should read in a mono font prominently — it's the DNA of the run

**Target (output settings):**
- Resolution, FPS, RUNS — these are important pre-generation decisions
- Currently: a card that looks identical to every other card
- Target: could be flatter/more inline — these are settings, not primary controls
- Consider: a condensed 3-column inline bar rather than a stacked card (RESOLUTION | FPS | RUNS in one row)

**Target (presets):**
- Currently a small panel that shows up before the LoRA cards
- Target: move presets to after output settings, above the altar — they're a "load my config and go" action that belongs close to the commit point
- Make the save/load UI slightly more elegant — the current dropdown + buttons is fine but cramped

**Target (seed bank):**
- Currently: collapsible panel at the bottom of the results zone
- Target: stays collapsible, but the closed state should show a count ("SEED BANK — 4 saved") so you know it's not empty
- The entry cards inside could be more scannable — seed number in accent color, label in regular text, date small/dim

---

### ZONE 5 — MODE-SPECIFIC CONTROLS

**Current:** DIAL and PRODUCTION sections are separate collapsible cards at the bottom.

**Target:**
- These sections are now mode-gated — they appear only when the relevant mode is selected in Zone 2
- DIAL controls: axis config (1 and optional 2), seed lock/roll, job count preview
  - The axis controls need cleaner layout — currently a flex-wrap mess
  - Target: 2 rows, each row is: [AXIS LABEL] [PARAM SELECT] [MIN] [MAX] [STEPS] in a clean grid
  - Axis 2 can be conditionally shown/hidden based on a toggle (existing logic preserved)
- PRODUCTION controls: count, seed strategy, conditional base seed
  - Currently: 3 plain rows
  - Target: same visual language, but with a little more character on the seed strategy selector

---

### ZONE 6 — THE ALTAR

**Current:** `#go-btn` — full-width amber-filled button, 14px padding, Press Start 2P label "GENERATE". Fine but not special.

**Target:**
- This is the architectural climax of the whole UI
- It should feel physically different from every other interactive element
- Taller (more vertical padding — 20–24px)
- When ComfyUI is CONNECTED and idle: `--ws-pink` fill, `--ws-pink-glow` box-shadow. The button is armed. It has presence.
- When ComfyUI is DISCONNECTED: disabled-dim, text reads "WAITING FOR COMFYUI", no glow
- When generating/running: the button should be replaced by a CANCEL state — danger-adjacent glow using `--ws-state-error`
- When generation completes: brief `--ws-state-done` (cyan) flash then return to armed state
- The label changes with mode (JS update required — see OPEN QUESTIONS): `GENERATE` (SINGLE) / `RUN DIAL` (DIAL) / `RUN BATCH` (PRODUCTION)
- **Font: VT323 `--ws-type-button` (24px)** — NOT Press Start 2P (violates the bimodal law)

**Design note:** The altar is where you commit. It should cost you something to look at it and not press it.

---

### ZONE 7 — RESULTS ZONE

**Current:** Progress bar → ETA row → status text → log → seed bank → queue → batch panel → video. All separate.

**Target:**
- The results zone is one contiguous block with an internal hierarchy
- It appears below the altar and feels like the machine's response — the readout

**Progress bar:**
- 11px shimmer progress bar is already good — keep the shimmer
- Add a state-based glow: generating = amber glow on the fill, complete = neon/cyan glow, error = red
- The track itself should feel like a meter, not just a bar

**ETA / elapsed:**
- Currently: flex row with two cells and a separator
- Target: same concept, slightly more readout-panel feeling — like instrument gauges

**Status text:**
- Currently: plain mono text saying "READY" or the last status message
- Target: styled as a status line in the results zone — a bit more arcade terminal in character

**Batch job list:**
- Currently: styled like a secondary panel
- Target: each job card should have better visual differentiation between states (pending = dim, running = amber + pulse, complete = neon, error = red)
- The PROMOTE button on DIAL jobs should be visible and inviting — not tucked away

**Execution log:**
- Currently: collapsible dark panel, monospace line items, colored by type
- Target: the log is the terminal readout of the machine — it should feel like genuine ComfyUI console output bleeding through
- The log panel, when open, should have slightly more presence — a subtle scan-line background or just a darker inner background
- Log entries already have color-typed icons — that's good, keep it

**Video player:**
- Currently: `display:none` HTML5 `<video>` element that appears on completion
- Target: when a video is ready, it should feel like something was born — the player could have a neon border glow on appearance
- The player doesn't need to be redesigned — just its emergence moment. A CSS transition on display (opacity/transform) would help it feel like it materialized rather than snapped in

---

## COLOR SYSTEM TARGETS (for CHROMA_BLEED)

> ⚠️ **AUDIT NOTE — READ BEFORE ANYTHING ELSE**
> CHROMA_BLEED ran in a prior session and **fully rebuilt the color system**. The palette is DONE. Do not redesign it. The mandate below is MIGRATION and CORRECT APPLICATION — not design from scratch.

**The actual token system (color-tokens.css — ALREADY FINAL):**

| Token | Value | Role |
|---|---|---|
| `--ws-bg` | `oklch(0.095 0.010 285)` | Near-black void, violet undertone (H=285°) |
| `--ws-bg-elevated` | `oklch(0.138 0.013 285)` | Panel background — catches ambient neon |
| `--ws-fg` | `oklch(0.930 0.018 225)` | CRT phosphor white — primary text |
| `--ws-fg-muted` | `oklch(0.580 0.016 225)` | Secondary labels — at-risk for small text |
| `--ws-pink` | `oklch(0.650 0.290 338)` | **Primary accent** — hot magenta, neon tube at 3am |
| `--ws-pink-glow` | `oklch(0.550 0.220 338)` | Magenta glow — shadows, halos |
| `--ws-cyan` | `oklch(0.760 0.165 196)` | **Secondary accent** — electric cyan, cathode ray |
| `--ws-cyan-glow` | `oklch(0.660 0.130 196)` | Cyan glow — done-state shadows |
| `--ws-border` | `oklch(0.230 0.018 285)` | Structural dividers — void-material |
| `--ws-border-active` | `oklch(0.650 0.290 338)` | Focus/hover borders — identical to `--ws-pink` |
| `--ws-state-idle` | `oklch(0.520 0.055 265)` | Machine breathing — muted purple-blue |
| `--ws-state-generating` | `oklch(0.650 0.290 338)` | Machine alive — same as `--ws-pink` |
| `--ws-state-done` | `oklch(0.760 0.165 196)` | Transaction complete — same as `--ws-cyan` |
| `--ws-state-error` | `oklch(0.610 0.230 22)` | Coin rejected — hot red-orange |
| `--ws-state-disconnected` | `oklch(0.400 0.018 265)` | Screen off — drained purple |

**DEPRECATED aliases (backward compat — present in color-tokens.css, must be removed from new CSS):**
- `--ws-amber` → alias for `--ws-pink` — DO NOT use in new code
- `--ws-amber-glow` → alias for `--ws-pink-glow` — DO NOT use in new code
- `--ws-neon` → alias for `--ws-cyan` — DO NOT use in new code

**The index.html CSS currently has 47 references to the deprecated tokens** (`--ws-amber`, `--ws-neon`, `--ws-amber-glow`). The redesigned CSS must use only the real token names.

Also: **2 hardcoded `#ff4444` values exist in the current batch panel CSS** (`.batch-job-error` icon and `#batch-cancel-btn:hover`). The redesign must replace these with `--ws-state-error`.

**CHROMA_BLEED's mandate — MIGRATION, not design:**
1. Do not redesign the palette — it is final and WCAG-verified
2. Apply the real token names throughout the redesigned CSS — never `--ws-amber`, never `--ws-neon`
3. Wire the 5 state tokens to the zones that need them: progress fill, altar button states, batch job cards, status indicator
4. The altar button should use state-driven styling: `--ws-state-generating` when running, `--ws-state-done` on complete, `--ws-state-error` on failure
5. Use `--ws-pink-glow` for the altar glow when ComfyUI is connected and armed
6. Remove the 2 hardcoded `#ff4444` values — replace with `--ws-state-error`

---

## TYPOGRAPHY TARGETS (for TYPE_WEAVER)

> ⚠️ **AUDIT NOTE — READ BEFORE ANYTHING ELSE**
> TYPE_WEAVER ran in a prior session and **fully defined the type scale**. The scale is DONE. Do not redesign it. The mandate below is CORRECT APPLICATION — fix current misuse in index.html and apply to new elements.

**The actual type system (type-tokens.css — ALREADY FINAL):**

| Token | Value | Font | Role |
|---|---|---|---|
| `--ws-type-display` | `88px` | Press Start 2P | Nameplate "WAN BOOTH" ONLY |
| `--ws-type-stamp` | `6px` | Press Start 2P | Micro-texture stamps ONLY |
| `--ws-type-stage` | `32px` | VT323 | Stage card headers — "STAGE 1 — HIGH DETAIL PASS" |
| `--ws-type-button` | `24px` | VT323 | Button text — GENERATE, RUN DIAL, etc |
| `--ws-type-value` | `24px` | VT323 | Live readout values — slider numbers |
| `--ws-type-label` | `20px` | VT323 | UI labels — ambient voice of the machine |
| `--ws-type-body` | `20px` | VT323 | Prompt textarea body |
| `--ws-type-status` | `20px` | VT323 | Status text |
| `--ws-type-small` | `16px` | VT323 | Seed label, log bar label, ETA labels |
| `--ws-type-log` | `16px` | VT323 | Log entries |
| `--ws-type-eta` | `16px` | VT323 | ETA row readouts |

**⚠️ CRITICAL LAW — Press Start 2P bimodal rule:**
PS2P is valid ONLY at 88px (nameplate) or 6px (stamp). The zone between 10-80px is FORBIDDEN — at mid-range PS2P becomes decoration, not structure, and decoration is death. **Do NOT use PS2P for the altar button, mode selector, or any other element.** VT323 is the voice of everything else.

**Current misapplication in index.html (must fix in redesign):**
- `#go-btn` uses `--ws-type-label` (20px) — should use `--ws-type-button` (24px)
- `.lora-stage-header-title` uses `--ws-type-label` (20px) — should use `--ws-type-stage` (32px)
- `.lora-stage-header-title` uses `--ws-tracking-ui` (0em) — should use `--ws-tracking-stage` (0.05em)
- Log entries use hardcoded `11px` in two places — should use `--ws-type-log` (16px)

**New elements and their type assignments:**
- Mode selector labels: `--ws-type-label` (20px), VT323, uppercase, `--ws-tracking-ui`
- ComfyUI status indicator: `--ws-type-small` (16px), VT323
- Batch job entries: `--ws-type-log` (16px), VT323
- Altar button (all modes): `--ws-type-button` (24px), VT323

**TYPE_WEAVER's mandate — CORRECT APPLICATION, not design:**
1. Do not redesign the type scale — it is final
2. Fix the 3 current misapplications in index.html (go-btn, stage headers, log size)
3. Apply the correct tokens to all new elements in the redesign
4. Do not use PS2P anywhere except the nameplate

---

## LAYOUT TARGETS (for GRID_GHOST)

**Current:** Single-column scroll in a 900px fixed-width Electron window. `#main-panel` uses `display:flex; flex-direction:column; gap:16px`.

**This is correct and should be preserved.** The 900px width is good — it's a cockpit, not a page. The single column is right.

**Design targets:**
- The 16px uniform gap between all sections creates a flat visual hierarchy. Consider: larger gaps between zones (e.g., 28–32px between header/mode/input/parameter/altar/results) and standard gaps within zones.
- The outer padding (`20px 24px 28px`) is fine — consider if it needs a slight increase to give the design more air against the window edge
- The output settings condensed bar (if adopted) needs its column layout specified
- The LoRA section subgrid is already doing excellent work — preserve the column geometry, just update the styling
- The altar (Zone 6) should have a distinct spatial treatment — padding top and bottom that makes it feel like it has breathing room around it before the results zone

**GRID_GHOST's mandate:** Define the spatial architecture. Gap scale, padding scale, any zone-level structural changes. Produce a concrete spatial specification that the CSS can implement.

---

## DELIVERABLES

The final output is a redesigned `app/index.html`. Specifically:

1. **Updated `<style>` block** — All CSS rewritten or updated. Token references preserved. New design language applied.
2. **Updated HTML structure** — Mode selector added. Zones logically ordered. No new IDs. No removed IDs. All existing IDs present.
3. **Updated `color-tokens.css`** — Any new or modified token values from CHROMA_BLEED.
4. **Updated `type-tokens.css`** — Any new or modified type scale values from TYPE_WEAVER.

**Constraint:** The JS files are read-only. If a design idea requires a new element that needs JS to function, flag it — don't implement the JS change. Design against what already works.

---

## WHAT NEEDS AUDIT / OPEN QUESTIONS

### RESOLVED

**Queue panel position** — `#queue-panel` and `#add-to-queue-btn` are a SEPARATE system from DIAL/PRODUCTION batch. It is a manual sequential queue where you add individual jobs with the current settings and run them. In the new architecture: this belongs in **SINGLE mode Zone 5** — below the output settings, above the altar. When DIAL or PRODUCTION mode is selected, the queue panel is hidden.

**`#save-seed-row` and `#preset-save-row`** — These inline forms appear directly below their trigger buttons. In the redesign: `#save-seed-row` stays below the `#save-seed-btn` in the results zone. `#preset-save-row` stays below the `#preset-bar` in the presets section. No position change — just needs the surrounding design to accommodate their conditional appearance.

### REQUIRES DEV SESSION (JS changes needed — design for them, flag them)

1. **Mode selector JS** — Design the three-tab mode selector `[ SINGLE ] [ DIAL ] [ PRODUCTION ]` in HTML/CSS. The switching logic (showing/hiding Zone 5 content per mode, updating the altar label) requires a small JS update. **Design assuming JS will be updated.** Include the mode selector HTML with the correct IDs. Flag the JS work clearly in the GHOST NODE log.

2. **Altar label changing with mode** — The `#go-btn` text must read GENERATE / RUN DIAL / RUN BATCH depending on the active mode. Design the button for this. The JS update is straightforward (a class on the body or a data attribute). **Design assuming JS will be updated.**

3. **ComfyUI status indicator in header** — Design a small status dot + label in the nameplate header (right-aligned). New element — needs a new ID (suggest `#comfy-status-dot` and `#comfy-status-label`). The renderer.js currently updates `#status-text` for generation status. The header indicator is separate — for connection state (CONNECTED / CONNECTING / DISCONNECTED). **Design the element. Flag for JS hookup.**

### OPTIONAL (nice-to-have — design if it's clean, skip if it adds complexity)

4. **Thumbnail preview in drop zone** — Currently shows only filename on load. A thumbnail would make the input zone more theatrical. Requires a small JS change to set a CSS background-image. Optional enhancement — flag if the design includes it.

5. **Video emergence animation** — Currently `display:none → block` snaps in. A CSS opacity/transform transition would make it feel like the video materialized. Requires a JS-side class toggle. Optional — if the design specifies it, flag for JS hookup.

---

## NORTH STAR JUDGMENT CALL

When in doubt, ask: does this look like it was made by a small studio in 1997 who were quietly building the most beautiful thing they'd ever made?

If it looks like a SaaS dashboard: loop.  
If it looks like it belongs in a dark room with neon bleeding through the cracks: ship it.

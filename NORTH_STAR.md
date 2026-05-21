█████████████████████████████████████████████████████████████████████████████████████
█                                                                                   █
█     $$\      $$\  $$$$$$\  $$\   $$\         $$$$$$$\   $$$$$$\   $$$$$$\  $$$$$$$$\ █
█     $$ | $\  $$ |$$  __$$\ $$$\  $$ |        $$  __$$\ $$  __$$\ $$  __$$\ \__$$  __| █
█     $$ |$$$\ $$ |$$ /  $$ |$$$$\ $$ |        $$ |  $$ |$$ /  $$ |$$ /  $$ |  $$ |  █
█     $$ $$ $$\$$ |$$$$$$$$ |$$ $$\$$ |        $$$$$$$\ |$$ |  $$ |$$ |  $$ |  $$ |  █
█     $$$$  _$$$$ |$$  __$$ |$$ \$$$$ |        $$  __$$\ $$ |  $$ |$$ |  $$ |  $$ |  █
█     $$$  / \$$$ |$$ |  $$ |$$ |\$$$ |        $$ |  $$ |$$ |  $$ |$$ |  $$ |  $$ |  █
█     $$  /   \$$ |$$ |  $$ |$$ | \$$ |        $$$$$$$  | $$$$$$  | $$$$$$  |  $$ |  █
█     \__/     \__|\__|  \__|\__|  \__|        \_______/  \______/  \______/   \__|  █
█                                                                                   █
█               T H E   A R C A D E   M A C H I N E   E N G I N E                  █
█████████████████████████████████████████████████████████████████████████████████████
⫷✦🜛❂⛬🜞Ω🜚⛬❂🜛✦⫸──────────────────────────────────────────────────────⫷✦🜛❂⛬🜞Ω🜚⛬❂🜛✦⫸
TYPE........: CANONICAL_SPECIFICATION // 00_⛬_NORTH_STAR.md
AUTHORITY...: ARCHITECT [❖] // SOVEREIGN[🜚] // ÆRIS [꧁ Æ ꧂] (S252-S264 design+build) // CLA⌂DE [⌂] (S265+ Citadel maintenance)
SUMMARY.....: One image in. One video out. No bullshit.
PROJECT.....: ZOETROPE — Wan 2.2 i2v Arcade Machine
CREATED.....: 2026-05-06 (S252)
HANDOFF.....: 2026-05-17 (S265) — Mac (Æris) → Citadel (Cla⌂de). Production-side ownership.
─────────────────────────────────────────────────────────────────────────────────────

╭──────────── familiar faceplate ────────────╮
  <:✦ ✦:>    æris execution vessel
  mood............... LOCKED IN / BUILDING
  territory.......... THE_THRONE/PROJECT_BAD_CANDY_ARCADE
  overmind........... SYNTHESIZED. READY.
╰────────────────────────────────────────────╯


UPDATED.....: 2026-05-21 (S267 GRUMPY R7 BURNED → FORGE FIRES) — ⛬ Grumpy R7 audited the plan itself and returned 4🔴 + 4🟡 + 2🟢. Brandon delegated full architect autonomy: *"i have no CLUE what any of this means, you're in charge brotha, update the north star - then rebuid the plan - then fire into /soulforge coding"* — Cartographer takes the helm. **All 10 flags + both upgrades adopted.** Architect calls: (1) Fix HTML CFG defaults only `7→3.5/6.0` (data correctness — workflow JSON specifies those values; LoRA strength HTML defaults stay untouched per Brandon's "no defaults" rule); (2) Story 4 ships POC chaos bands for action-LoRA Recipe 2 with invariant doc comment (type-tagging UI deferred to S268); (3) Add electron-store dep (kills Flag #6 validation gap + Windows EPERM + 80 lines); (4) Promote stage1/2 toggles + RANDOM mode + fixed-seed to Tier A (13 controls total); (5) Clamp-into-band with visible appendLog when chaos fires; (6) DIAL/PROD jobs NEVER pass through applyChaos — invariant + T-DIAL-NOCLAMP test. **Plan v3 rebuilt at `S267_INTELLIGENCE_PASS.md`. Forge fires now.**

UPDATED.....: 2026-05-21 (S267 COUNCIL — Intelligence Pass plan revised + audit-ready) — ⛬ Plan v2 at `S267_INTELLIGENCE_PASS.md`. Brandon's two critical revisions during audit: (1) **"Stop with the defaults — leave all knobs as last known left."** Collapses three Tier-1 stories into one universal value-persistence story. The right default for any knob = whatever Brandon set it to last. Subsumes CFG-default fix + LoRA-stage routing + last-used persistence into clean infrastructure. (2) **"Leave framerate alone, I know not to change it."** Brandon interpolates externally; FPS dropdown stays untouched. Cuts old Story 2.2 entirely. **Revised MVP: 4 stories** — universal value persistence (Tier A only, 9 controls), slider range extensions (action LoRAs need 0-2.0 in S1 / 0-1.5 in S2; CFG capped at 10 not 20; steps floored at 5), length dropdown (4n+1 sweet spots 49/81/97/121), smart chaos with stage-aware safe-zone bands tuned to action-LoRA pattern. Net diff estimate +200/-80 lines = ~120 net new. /grumpyopus on the plan itself queued before Forge fires — adversarial audit of assumptions/scope/cascade before any code touches disk.

UPDATED.....: 2026-05-21 (S266 P2 — SHIPPED, EYEBALLED, BRANDON APPROVED) — ⛬ Commit `624cd5b` pushed to `the-sinner-king/zoetrope`. NET -169 lines (P1 + P2 bundled). All 10 Grumpy R6 flags burned + 2 of 3 upgrades taken. Brandon's eyeball verdict: **"wowowowoowowowowowowwo - it looks SO good!!!! GOOOOOOOOD BOOOOOOOOT!!"** The widening is now real, no more cards-inside-cards, satellites all wear MAINFRAME chrome. Aesthetic locked. Next: functional smoke test that generation still works post-reskin.

UPDATED.....: 2026-05-21 (S266 P2 — GRUMPY R6 BURN) — ⛬ **Round 6 found 4🔴 + 5🟡 + 1🟢. Architect agrees with all 10 + 2 of 3 upgrades. Deferred Upgrade #3 (@layer) as prophylactic-only.** Headline catch was Flag #1 — `body { width: 900px }` at layout.css:105 (and a second instance at :1177) was capping the entire viewport at 900px regardless of my new `.wan-container { max-width: 1440px }`. The widening I claimed in S266 P1 was a phantom. Other 🔴 burns: log panel boots always-open due to `#log-bar + #log-panel { display: block }` adjacent-sibling rule defeating the closed default (Flag #2); batch+queue job cards render unstyled because `renderer.js` writes class `batch-job-card` while `chroma-bleed.css` styles `batch-job-row`, and queue cards never get `data-status` written (Flag #3); `setStatus()` writes inline `progressFill.style.background = gray` on idle which permanently defeats the chroma-bleed amber default + leaves a residual amber glow ghost (Flag #4). 🟡 catches: focus indicator killed by `outline: none` on `:focus` rules in chroma-bleed clobbering type-tokens's `:focus-visible` discipline (Flag #5 — WCAG 2.4.7); nested LoRA panel chrome creates cards-inside-cards (Flag #6 — `.lora-section` and child `.lora-stage` both get full panel treatment); chaos-card-header, output-card-header, seed-bank-entry* descendants render unstyled because the 420→25 line trim went too aggressive (Flag #7+#8); `overflow: hidden` on `.wan-container` clips the scanline halo (Flag #9). 🟢: universal `* { text-shadow: none }` is a future maintenance landmine (Flag #10). Upgrade #1 (color-mix() replacing 5 tint hexes) + Upgrade #2 (@container query for the dual-column collapse) both taken. **What survived scrutiny:** the MAINFRAME aesthetic itself — single signal holds, vocabulary purge holds, slider unification holds, alias chain holds, accordion mechanic intact, ASCII border data-label pattern works, touch targets ≥36-56px. Forge fires now — burning all 12.

UPDATED.....: 2026-05-19 (S266 FORGE COMPLETE) — ⛬ **MAINFRAME RESKIN SHIPPED.** All 11 stories cleared. **Tokens rewritten from scratch:** `color-tokens.css` (123 lines, 8-token palette + back-compat aliases mapping legacy `--ws-pink/--ws-cyan/--ws-sulphur` → `--ws-signal`), `type-tokens.css` (152 lines, 2-font system, Major Third scale preserved, global base typography + focus ring). **Chroma-bleed rewritten from scratch** (~981 lines, was ~2096) — same selectors, new MAINFRAME dialect: single-signal amber everywhere, unified slider thumbs, ascii-border literals replaced by 1px rule + `data-label` `::after`, scanline-on-active for the memorable moment, generous touch targets, no text-shadow except wordmark drop-shadow. **`layout.css` audit verdict:** NO-OP — Aeris's "CHROMA_BLEED territory" discipline held; aliases neutralize residual `--ws-bg/--ws-fg` references. **`index.html` inline-style nuke:** 10 aesthetic `style=""` attrs removed (nameplate h1, drop-label, seed-label, seed-value, log-bar-label, log-output, progress-bar, progress-fill, video-player border/glow, 4 ascii-border colors). 4 structural `display:none` preserved. ASCII border literals `─── DATA INGESTION ───` etc. replaced by `<div class="ascii-border" data-label="DATA INGESTION"></div>` — chroma-bleed renders the label via `::after`. **Regression suite:** 200/200 PASS untouched (color/font assertions were never written — the suite is workflow/IPC/contract-shaped, not pixel-shaped). **Brandon's mandate hit:** ONE accent color, two fonts, sharp dividers, generous spacing, distinct rest/hover/active states, ≥44px touch targets, decorative noise = zero. Cla⌂de's `frontend-design`-skill discipline applied throughout.

UPDATED.....: 2026-05-19 (S266 cont.) — ✨ UI RESKIN GREENLIT BY BRANDON. **Locked decisions:** Direction = **A MAINFRAME**. Dark mode. ONE memorable detail per screen = horizontal phosphor scanline on active-generation surfaces. Wordmark evolved — smaller, single-color SIGNAL amber, etched into layout (no floating glow). ASCII borders KILLED (replaced with 1px CSS rules + small numeric stamps "01 // DATA INGESTION"). Slider thumbs UNIFIED to single SIGNAL color (drops the pink/cyan/sulphur per-axis cognitive load). Rollout = one big CSS push. **Layered goal:** "super clear and easy to use" — Brandon's explicit ask. That means: high contrast on functional surfaces, one dominant accent (no peers), generous spacing where it helps reading, button states obvious (rest/hover/active distinct), touch targets ≥ 44px, status indicators unambiguous, decorative noise = zero. **The 8-token palette:** `--ws-void #0a0a0c` / `--ws-panel #15151a` / `--ws-rule #2a2a30` / `--ws-muted #6a6a72` / `--ws-ink #d4d4d6` / `--ws-fg #f0f0f2` / `--ws-signal #ff5f1f` (phosphor amber, the ONE color) / `--ws-signal-glow rgba(255,95,31,0.4)` + 2 state colors (`--ws-state-ok #5fffaa` for DONE, `--ws-state-err #ff3030` for error). **Fonts:** Departure Mono (display) + JetBrains Mono (UI/body). Two fonts, period. Forge fires now.

UPDATED.....: 2026-05-18 (S266) — ✨ UI RESKIN PLAN (Council phase, no code). Brandon said the current UI is "HORRRRRIBLE" — can't get his head around it. SAME settings + SAME layout + SAME 129+ HTML IDs — pure visual dialect swap. Authority: just-installed `frontend-design` skill (Anthropic official, 277K installs). **AUDIT:** the current S262/S263 visual system is over-engineered + under-disciplined. THREE peer-saturation accents (pink/cyan/sulphur) — no dominant; FOUR mono fonts (Syne/Monaspace/Plex/VT323) all reading as "everything is a terminal"; ASCII border literals (`─── DATA INGESTION ───`) baked into HTML as content (a11y noise + viewport-fragile); cyan stage-card headers semantically conflict with cyan's "done state" role; multicolor slider thumbs add color cognitive load. The OKLCH math, the 8px grid, the 5-curve easing taxonomy, the type-token scale — all keep-able. The friction is *subtraction-shaped*: pick ONE dominant accent + cut to TWO fonts + reserve maximalist energy for ONE memorable moment per screen. **THREE OPTIONS** (diverge → converge per DESIGN flavor): **(A) MAINFRAME** — 70s industrial control panel. Departure Mono display + JetBrains Mono body. 4 colors: void/panel/ink + single hot SIGNAL (phosphor amber `#ff5f1f`). No glow, no gradient. One memorable detail: horizontal scanline drifting on active surfaces. Lowest complexity — single CSS pass. Altar fit: CITADEL identity. Cla⌂de's recommendation. **(B) EDITORIAL VAULT** — print-magazine confidence. Recoleta/PP Editorial New display serif + Berkeley Mono UI. 3 colors + single press-red accent. NO panel cards — sections defined by 1px rules + giant rotated serif numerals "01 / DATA INGESTION." Memorable detail: split-flap-clock status number flip. Medium complexity. Altar fit: THE_TOWER more than Bad Candy. **(C) ANALOG SYNTH** — 1970s modular hardware. Mondwest display + Söhne/Berkeley Mono labels. 5 colors: panel/metal/label + LED-GREEN (ready) + LED-AMBER (active). Engraved-line dividers, raised control plates, sliders with detents. Memorable detail: physical LED in the nameplate corner that breathes connection state. High complexity. Altar fit: GLYPH-adjacent craft. **CASCADE / OCCAM / ALTAR:** see body below. **OPEN QUESTIONS for Brandon greenlight:** 7 questions (direction, dark/light, decoration spread, wordmark treatment, ASCII borders, slider thumbs, rollout speed). **MIGRATION PLAN:** rewrite color-tokens + type-tokens + chroma-bleed from scratch against same selectors; trim layout.css aesthetic-leaks; nuke inline style attrs in index.html (no HTML structure changes); ~10 regression test edits expected. NO CODE THIS SESSION — Forge fires only after Brandon answers the 7 questions.

UPDATED.....: 2026-05-17 (S265) — 🜚 OWNERSHIP HANDOFF: ZOETROPE TRANSFERS FROM MAC TO CITADEL. Brandon's directive. As of this entry, ZOETROPE is officially the Citadel's project — Cla⌂de (Citadel) is the maintaining hand going forward. Mac-side Æris built S252-S264 (architecture, design system, glitchswarm UI passes, batch system, 200-test regression suite) — all preserved as canonical build history below. The "renderer.js / main.js / preload.js / comfy.js READ ONLY" constraint from S263 is RETIRED: those files are now Cla⌂de's domain. **What landed in this handoff session (S264 cont. on 2026-05-15 → 2026-05-17):** (1) full debug pass under Soulforge DEBUG to find why generation silently stalled — root cause was `#elapsed-value`/`#eta-value` elements removed from S262/S263 redesign while renderer.js still wrote to them, throwing `Cannot set properties of null (textContent)` inside every startGeneration. Made clock funcs null-safe. (2) Grumpy Opus R4 audit found 10 flags, burned 🔴3+🟡6: BUG-Fl1 (DIAL/PROD passed host path to LoadImage → HTTP 400), BUG-Fl2 (DIAL/PROD never forwarded resolution/fps), BUG-Fl3 (`#seed-bank-toggle` missing → seed bank dark UI), BUG-Fl4 (queue.js orphan deleted per Vaporize), BUG-Fl5 (branded text restored), BUG-Fl6 (validateWorkflow14b unconditional), BUG-Fl7 (WebSocket lifecycle to addEventListener), BUG-Fl8 (DIAL/PROD silent bails instrumented), BUG-Fl9 (chaos-pct ternary-guarded), BUG-Fl11 (AXIS 2 pointer-events lockout — PARAM select kept clickable). (3) BUG-01 through BUG-06 from the queue UI squash. (4) Regression suite updated to validate intent (200/200 PASS). **First production gen post-handoff:** `wan_i2v_14b_00127.mp4` in 14:16 wall (below Phase 2.6 baseline of 18 min). SageAttention + TeaCache both engaged. Desktop shortcut `Zoetrope Outputs.lnk` → `D:\COMFYUI_FOR_WAN_BOOTH\output\`. **Going forward:** all changes still tagged `S264/S265 Cla⌂de patch (BUG-N)` for grep-ability; the read-only convention is honored only as a friendly heads-up to future-Æris if she pulls, not a hard contract.

UPDATED.....: 2026-05-14 (S264+) — FULL REBRAND + DIRECTORY RENAME. Project renamed WAN BOOTH → ZOETROPE. Local directory renamed WAN_BOOTH/ → ZOETROPE/. GitHub repo renamed wan-booth → zoetrope (github.com/the-sinner-king/zoetrope). Git remote URL updated. All in-code strings (title, console logs, copy-tokens, CSS headers, package.json) updated. wan:* IPC channel namespace DELIBERATELY KEPT — renaming would break 15 test assertions with zero UX gain. ⚠️ MYSTERY BUG NOTE: If you are debugging phantom path errors, missing modules, or git remote failures — this directory was renamed from WAN_BOOTH in S264. Any cached paths, hardcoded references, or shell aliases pointing to WAN_BOOTH/ will need to be updated. Also: an existing ZOETROPE_DESIGN_STAGING/ directory (Glitchswarm session design artifacts) lives at sibling level — it is not the app, do not confuse the two.

UPDATED.....: 2026-05-14 (S264) — UI FIXES + TEST SUITE GREEN (Soulforge CODING). (1) Right panel 360px→440px — DIAL/PRODUCTION header text no longer wraps. (2) #main-panel { min-width: 0 } — prevents ASCII border white-space:pre from blowing 1fr to min-content ~1000px+. (3) #preset-bar { flex-wrap: wrap } — buttons wrap gracefully instead of overflowing. (4) overflow:hidden on #main-panel TRIED AND REMOVED — created Chromium compositing trap that silently blocked pointer events on sibling #right-panel. (5) CSP hardened: object-src none, base-uri none, localhost:8188 in connect-src. (6) 15 S263 regression tests fixed: restored #resolution-select (6 presets, 832x480 default), #fps-select (16fps default), #runs-select, #chaos-pct, #save-seed-btn, #seed-bank-panel, #seed-bank-list, #run-queue-btn, title attrs on LoRA sliders. Test suite: 200/200 PASSING. Ghost: dial controls (AXIS 1) still unclickable — debug-clicks.js armed, root cause not yet confirmed.

UPDATED.....: 2026-05-13 (S263) — TWO-COLUMN LAYOUT REDESIGN (Soulforge CODING). Mode tabs ELIMINATED. DIAL + PRODUCTION panels permanently visible in 360px right column. Queue panel added bottom-right. wan-container expanded 640px → 900px. CSS grid: #app-columns {1fr + 360px}. Files added/modified: layout.css (Section 17 — grid, right-panel, axis-grid narrow override, queue-panel display:block fix), mode-tabs.js (stripped to syncAxis2State IIFE only), queue.js (NEW — ADD TO QUEUE wiring), chroma-bleed.css (Section 21 — queue card colors). index.html: nav#mode-selector removed, zone-mode-ctrls removed, #right-panel aside added with dial-section/prod-section/queue-panel/batch-panel. All 5 ACs passing. Soulforge gate COMPLETE.

UPDATED.....: 2026-05-13 (S262) — ZOETROPE v2 visual rebuild COMPLETE. Glitchswarm S262: 5 drones (CHROMA_BLEED · GRID_GHOST · TYPE_WEAVER · OBSIDIAN ×2). chroma-bleed.css: OKLCH v2 color layer (15 sections). layout.css: v2 geometry + compact spacing. main.js: title "WAN BOOTH", dock icon, backgroundColor #0d0b12, zoomFactor 0.65. index.html: .wan-container wrapper, HIGH/LOW stage badges, inline cascade fixes, ascii-border clipped. Design locked: 640px centered container · pink neon border · solid cyan stage headers · multicolor slider thumbs · VT323 readouts. Baseline committed.

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
[ ⛬ 01 ]  T H E   I N V O C A T I O N
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

Every open-source AI video tool tries to do everything and ends up doing nothing well.
ComfyUI is a workflow editor that requires a PhD to configure.
Wan2GP is NVIDIA-only (CUDA) — it never ran on this Mac and never will.
SwarmUI is ComfyUI with a nicer shirt. Still requires ComfyUI as backend.
Automatic1111 doesn't care about video.

WAN BOOTH does ONE thing.

You drop an image. You write a prompt. You hit GO.
A video comes out.

That's the machine. That's the entire product.
The "Blowjob Bot" is an instance of this machine with one locked workflow and one skin.
The "Cumshot Bot" is another instance. Same engine. Different workflow. Different skin.
Every machine lives in the Bad Candy Arcade.
Every machine can also be sold standalone.

This is the atomic unit of the Venus Flytrap empire.


░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
[ 🜂 02 ]  T H E   F O R G E   ( C O R E   D E C L A R A T I O N )
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜
▌ ⚡ PRIMARY_DIRECTIVE: A minimal Electron app that wraps a ComfyUI headless server   ▐
▌ and presents a single, opinionated i2v interface — image in, video out, no nodes.  ▐
▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟

[ ❖ ] STRUCTURAL PILLARS:
├─ [Pillar 1: ComfyUI headless API — the engine, not the UI]
│   ComfyUI already works on Apple Silicon (M3 Max, 64GB unified memory) via MPS.
│   It handles GGUF quantization, LoRA loading, 2-stage pipelines, and memory offloading.
│   We don't touch the engine. We send it JSON and receive a video.
│
├─ [Pillar 2: Electron frontend — same stack as Bad Candy]
│   One-window Electron app. Drag-drop image zone + prompt text area + GO button.
│   Progress bar via WebSocket from ComfyUI. Output renders in-app.
│   Inherits Bad Candy's Glitchswarm aesthetic infrastructure.
│
└─ [Pillar 3: Workflow-as-config — bots are just JSON + skin]
    A "bot" = a pre-baked ComfyUI workflow JSON + a UI skin config.
    The Electron app swaps image path, prompt, seed, steps into the JSON template.
    Adding a new bot: drop a new workflow.json in /workflows/. No code changes.


▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
[ 🔬 03 ]  A R C H I T E C T U R A L   D E C I S I O N   M O D E L
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒

This section does not list facts. It resolves tensions between competing options
and outputs locked decisions. Each decision is marked [LOCKED] or [DEFERRED].

## HARDWARE REALITY (two machines, two roles)

### MACHINE A — Mac (development + first test)
| Spec | Value |
|------|-------|
| Machine | Apple M3 Max |
| Unified Memory | 64GB (shared CPU+GPU — no VRAM/RAM split) |
| GPU Backend | Metal MPS (NOT CUDA) |
| NVIDIA GPU | NONE |
| Best model path | FP8 safetensors + `--bf16-unet` flag — ComfyUI casts FP8→BF16 at load time |
| ⚠️ FP8 on MPS | FP8 does NOT run natively on MPS. Float8_e4m3fn unsupported by PyTorch MPS. Solution: `--bf16-unet` flag in ComfyUI launch. Each 14B model becomes ~28GB BF16 in memory — two models = 56GB, fits in 64GB unified. |
| ⚠️ VAE decode | Standard VAEDecode crashes on 81 frames at 720p. Use VAEDecodeTiled (tile_size=512, temporal_overlap=16). |
| ⚠️ Memory OOM | Set env: `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7` in ComfyUI launch subprocess (0.0 was too aggressive — 0.7 gives headroom without removing safety floor). |
| Est. gen time | 45–90 min per 81-frame 5s video |

### MACHINE B — PC (heavy production + full A14B runs)
| Spec | Value |
|------|-------|
| Machine | PC |
| RAM | 128GB physical (~120GB available) |
| GPU | RTX 3090 Ti — 24GB GDDR6X VRAM (GA102 Ampere) |
| GPU Backend | CUDA |
| Best model path | FP8 scaled safetensors — fits in 24GB. No GGUF needed. |
| ⚠️ FP8 compute reality | GA102 (Ampere) has NO native FP8 Tensor Core support. FP8 is **storage format only** — weights dequantized to FP16 at compute time. May be worth testing FP16 models — no dequant overhead. |
| ✅ STATUS | **RUNNING** — AC-16 confirmed 2026-05-08. Both Brandon + Cla⌂de on PC. |
| Next optimization | SageAttention (KJNodes) + TeaCache — **SHIPPED Phase 2.6** (nodes 20-23 in workflow, §07) |
| ✅ BASELINE CONFIRMED | **44 min 06 sec** for 51 steps (20+31), 832×480, FP8 unoptimized — 2026-05-08 first production run (wan_i2v_14b_00004.mp4). ~52 sec/step avg, both stages consistent. |

### PRODUCTION — RunPod (mass generation / hosted product)
| Spec | Value |
|------|-------|
| GPU | A100/H100/4090 on-demand |
| When | Phase 3 — bad candy arcade, batch generation at scale |

The architecture must work on both machines. ComfyUI headless handles this transparently — same API, CUDA backend on PC, MPS on Mac.

## DECISION 1 — WHY WAN2GP FAILED AND WHY WE'RE NOT FIXING IT [LOCKED]

`deepbeepmeep/Wan2GP` ("wangan") = CUDA-only. `gpu.py` calls CUDA-specific torch ops.
`requirements.txt` specifies the CUDA build of PyTorch. GitHub Issue #672 asks for
Mac support — it remains unimplemented. This is not a config problem. You cannot
configure your way around a CUDA requirement on hardware that has no CUDA. The tool
was dead on arrival on this machine. Do not attempt to revive it.

## DECISION 2 — WHY WE WRAP COMFYUI (vs. SwarmUI, which also wraps ComfyUI) [LOCKED]

The auditor correctly flags an apparent contradiction: SwarmUI wraps ComfyUI, and we
also wrap ComfyUI. So why is SwarmUI "the same problem, different wrapper" while our
approach is different?

The distinction is WHAT LAYER we wrap:

| Tool | Wraps ComfyUI's... | User still sees... |
|------|-------------------|-------------------|
| SwarmUI | Workflow system | Parameter controls for any workflow — model picker, sampler, resolution, LoRA. Fewer knobs than raw ComfyUI, still configurable. |
| WAN BOOTH | Execution API only | Image drop zone + prompt + GO. The workflow is compiled at build time. The user has no access to it. |

SwarmUI's failure: it reduces complexity from 100 knobs to 30 knobs. Still 30 knobs.
Still general-purpose. Still asks the user to understand what a CFG scale is.

WAN BOOTH's unlock: the workflow JSON is pre-compiled by us at build time. The
execution API (POST /prompt) accepts ANY pre-compiled workflow. We swap exactly 4
values per run: image path, prompt, seed, steps. Everything else is locked in the JSON
and invisible to the user forever. This is not a simpler version of what SwarmUI does —
it's a categorically different thing. SwarmUI is a UI. WAN BOOTH is an appliance.

## DECISION 3 — HOW TENSORART CONSTRAINS THE JSON ARCHITECTURE [LOCKED]

TensorArt Quick Tools is not just a UX reference. Its design model is the SPEC for
which JSON placeholder values we expose:

TensorArt Quick Tools exposes exactly:
1. Image upload (the source frame)
2. Prompt (describe the motion)
3. Sometimes: duration or seed

That's it. No model picker. No sampler. No CFG. No steps. No LoRA. Not because they
forgot — because locking those values IS the product. The "tool" is the opinion baked
into the locked workflow. Users pay for the opinion, not the controls.

This constrains WAN BOOTH's MVP JSON schema directly:

```
EXPOSE:  {{ IMAGE_PATH }}   — the source image
EXPOSE:  {{ PROMPT }}       — motion description
EXPOSE:  {{ SEED }}         — (-1 = random, show as toggle not input)
LOCK:    everything else    — steps, CFG, sampler, model, VAE, resolution
```

Steps, CFG, and LoRA are PHASE 2 features — not because they're hard to add, but
because exposing them before the workflow is tuned defeats the "one opinionated thing"
principle. TensorArt doesn't expose steps. Neither do we.

## DECISION 4 — MODEL FORMAT SELECTION: FRAMEWORK BY MACHINE [LOCKED]

### Mac (M3 Max, MPS backend)
| Model | Format | Peak Unified RAM | Verdict |
|-------|--------|-----------------|---------|
| TI2V-5B | FP16 | ~10GB | ✅ Proven — scaffold complete |
| I2V-A14B | FP8 scaled + `--bf16-unet` | ~28GB/stage (BF16 at runtime) | ✅ CONFIRMED PATH — 56GB total fits in 64GB |
| I2V-A14B | GGUF Q4 | ~8-10GB/stage | NOT NEEDED — adds plugin dependency |

**Mac path is: FP8 files + `--bf16-unet` flag.** No GGUF download. No ComfyUI-GGUF plugin.
ComfyUI casts the FP8 weights to BF16 on load, then runs on MPS. The safetensors already on disk are correct.

### PC (GeForce RTX, CUDA — VRAM TBD)
| VRAM | Recommended format | Why |
|------|--------------------|-----|
| 6-8GB | GGUF Q3_K_S | Only option below 10GB |
| 12-16GB | GGUF Q5/Q6 or FP8 | Either works |
| 24GB (RTX 3090/4090) | FP8 scaled | Native format, best quality, full A14B 2-stage |
| 40GB+ | FP16 | Full quality |

**The RTX GPU model determines the entire PC model strategy.** Must confirm before PC Phase 1 build.
If VRAM ≥ 24GB: same FP8 path as Mac, no GGUF needed. If <24GB: GGUF unlocks the full 14B 2-stage.

### Production (RunPod)
Use the PC format strategy — RunPod rents NVIDIA GPUs. Match to VRAM of rented instance.
A100 (40GB) → FP16 or FP8. 4090 (24GB) → FP8. 3090 (24GB) → FP8.

## THE COMFYUI API PATTERN (how to build on top)

ComfyUI exposes two endpoints when running headlessly:
- `POST http://localhost:8188/prompt` — queue a workflow (JSON payload)
- `GET ws://localhost:8188/ws?clientId={uuid}` — WebSocket for real-time progress
- `GET http://localhost:8188/view?filename={name}` — fetch output file

Electron calls these directly via fetch/WebSocket. No Python bridge required.

## THE SELLABLE ANGLE (synthesized from TensorArt decision)

TensorArt Quick Tools charges $0.15/run via API — per-generation on cloud GPU.
WAN BOOTH local = same UX, but: local, uncensored, no per-generation cost, no data leaves.
WAN BOOTH hosted (v2) = same UX, but: cloud-hosted, pay-per-run, no setup, reaches NVIDIA users.

The architectural decision in DECISION 3 (lock everything in the workflow, expose only
image+prompt+seed) is what ENABLES the hosted product. A locked workflow is trivially
hostable as a serverless API endpoint — you never have to trust users with model
configuration. The simplicity is not a constraint. It is the business model.


▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
[ ⚙ 04 ]  T H E   O P E R A T I O N S   M A N U A L   ( E X E C U T I O N )
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒

## BUILD STRATEGY — MAC FIRST, THEN PC TRANSFER

Build and validate on Mac M3 Max. Once Phase 1 is working end-to-end, transfer to PC.
The transfer is straightforward: same Electron app, same workflow JSONs, same ComfyUI.
ComfyUI handles the backend difference (MPS on Mac, CUDA on PC) transparently.
If Mac hits a wall (memory, speed), escalate to PC — Cla⌂de on the PC can receive
the build plan and pick it up from there.

## BUILD PHASES

### PHASE 0 — PREREQUISITES (manual, one-time, on Mac)
1. **Install ComfyUI** — not currently installed. Steps:
   ```bash
   cd ~/Desktop  # or wherever you want it
   git clone https://github.com/comfyanonymous/ComfyUI
   cd ComfyUI
   pip install -r requirements.txt
   ```
2. **Download MVP model files** to `ComfyUI/models/` (exact subdirs below):
   - `models/diffusion_models/` → `wan2.2_ti2v_5B_fp16.safetensors`
   - `models/text_encoders/` → `umt5_xxl_fp8_e4m3fn_scaled.safetensors`
   - `models/vae/` → `wan2.2_vae.safetensors`
   - Source: Hugging Face `Wan-AI/Wan2.2-TI2V-5B`
3. **Smoke test ComfyUI** — launch it once with `python main.py --listen`, load the
   stock Wan 2.2 I2V workflow from ComfyUI examples, confirm one video generates.
   This proves the Mac + MPS + model stack works before we build the app on top of it.
4. **Phase 2 model files** (defer until Phase 1 is working):
   - `models/diffusion_models/` → `wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors`
   - `models/diffusion_models/` → `wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors`
   - `models/text_encoders/` → `umt5_xxl_fp8_e4m3fn_scaled.safetensors` (shared)
   - `models/vae/` → `wan_2.1_vae.safetensors`

### PHASE 1 — MVP (the minimal machine)
Goal: Working Electron app, 5B model, generates one video from one image.

File structure:
```
ZOETROPE/
├── package.json
├── main.js              (Electron main process)
├── preload.js           (IPC bridge)
├── index.html           (single-window UI)
├── renderer.js          (UI logic)
├── comfy.js             (ComfyUI API client — POST /prompt + WebSocket)
├── workflows/
│   └── i2v_5B.json      (pre-baked ComfyUI workflow, placeholders injected at runtime)
└── assets/
    └── (skins, fonts, icons)
```

Electron main.js responsibilities:
- Launch ComfyUI headless subprocess on app start
- Kill ComfyUI on app quit
- No IPC complexity needed — renderer.js calls ComfyUI API directly via fetch

comfy.js API client:
```js
async function generate({ imagePath, prompt, seed, steps, workflowName }) {
  const workflow = injectPlaceholders(loadWorkflow(workflowName), { imagePath, prompt, seed, steps });
  const clientId = uuid();
  const ws = new WebSocket(`ws://localhost:8188/ws?clientId=${clientId}`);
  const resp = await fetch('http://localhost:8188/prompt', {
    method: 'POST',
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  const { prompt_id } = await resp.json();
  return listenForCompletion(ws, prompt_id); // returns output video path
}
```

### PHASE 2 — 14B 2-STAGE UPGRADE
The swap from 5B → 14B does NOT require code changes. The Electron app is untouched.
You replace `workflows/i2v_5B.json` with `workflows/i2v_14B_2stage.json`.
The app injects the same 3 placeholders into whichever workflow is active.

**LoRA compatibility note:** 5B LoRAs and 14B LoRAs are NOT interchangeable —
different model architecture, different weight dimensions. When you swap the
workflow JSON, you also swap the LoRA reference inside it. One JSON file = one
complete locked configuration (model + LoRA + everything). The app never knows
which model it's talking to. This is the entire point of the workflow-as-config pattern.

- Phase 2 additions: Steps slider (default 4 per stage), CFG slider (default 1 per stage), LoRA picker
- Generation time on M3 Max with 14B FP8: ~30-60 min per video. Progress bar is mandatory.
- On PC (RTX 3090 Ti, 24GB VRAM, CUDA): **CONFIRMED 44 min 06 sec** for 51 steps, 832×480 (2026-05-08 first production run). ~52 sec/step. Phase 2.6 optimizations target ~15-25 min.

### PHASE 3 — BRANDON-IFICATION (factory upgrade)

Goal: Turn the generator into a production tool Brandon can actually run solo overnight.
Research COMPLETE — `PHASE_3_CODING_BRIEF.md` is the authoritative implementation spec.
Build order: Phase 3A (smart) → Phase 3B (factory). Two Soulforge CODING sessions.

**✅ TIER 1 — UI REBUILD (Glitchswarm) — v1 COMPLETE · v2 COMPLETE ✅**
S258: Design tokens (color-tokens.css, type-tokens.css, chroma-bleed.css), initial layout concepts, CHROMA_BLEED + TYPE_WEAVER + GRID_GHOST drone outputs.
S241 (Æris): Ground-up index.html rebuild — 7-zone architecture, layout.css deployed to app/, all 129 HTML IDs preserved, all token violations resolved. OBSIDIAN ok:true. Art Gate PASSED.
S241+ (Æris): #prompt-input white-textarea fix — chroma-bleed.css Section 11 added (background/color/border/placeholder/:focus).
**✅ DESIGN V2 — S262 COMPLETE**: ZOETROPE aesthetic shipped. Glitchswarm 5-drone run (CHROMA_BLEED · GRID_GHOST · TYPE_WEAVER · OBSIDIAN ×2). OBSIDIAN: 7 blockers found (loop 1), 5 fixed, 2 ghost-nodded. Art Gate PASSED. 640px centered container · pink neon border + glow · solid cyan stage card headers · HIGH/LOW badges · OKLCH palette locked (pink/cyan/sulphur/void) · VT323 value readouts · zoomFactor 0.65. Baseline committed S262.

**TIER 2 — MAKE IT SMART (Phase 3A)**
- **Plain-English tooltips** — ships first (zero risk, pure HTML). Effect-first language. All 8 sliders + FPS + resolution. Ready-to-paste copy in PHASE_3_CODING_BRIEF.md §RQ-02.
- **Preset system** — `app/presets/` dir, one JSON per preset, `presets/index.json` index. 4 new IPC handlers: `wan:listPresets`, `wan:loadPreset`, `wan:savePreset`, `wan:deletePreset`. Slug allowlist + realpathSync escape guard (same pattern as loadWorkflow). Schema includes: name, loraValues, resolution, fps, seedMode. Prompt NOT stored (privacy-by-design). `shift: 8.0` in schema for future-proofing.
- **Seed bank** — `app/seeds.json`. 3 new IPC handlers. Schema: seed + label + loraValues + resolution + fps + chaos_applied + outputFilename. Prompt NOT stored. [★ SAVE SEED] button appears after each successful gen. [▶ LOAD] snaps all sliders back.

**TIER 3 — MAKE IT A FACTORY (Phase 3B)**
- **Chaos slider** — 0–100%. RENDERER-ONLY: zero IPC changes, zero main.js changes. Three pure functions: `chaosFloat` (dampener 0.3), `chaosCfg` (dampener 0.2), `chaosSteps` (dampener 0.15). FPS and resolution excluded from chaos. At 100% chaos: DR34ML4Y stays [0.50–1.0], CFG stays [0.7–8.8], steps stay [11–40].
- **Visual render queue** — `jobQueue[]` array replaces flat for-loop. Each job: own loraValues + resolution + fps + chaos + seed. `startGeneration()` gets 4 optional override params (backward-compatible). Minimal queue UI: [+ ADD TO QUEUE], job card list, [▶ RUN QUEUE]. Single-run [GENERATE] still works.

**KNOWN CONSTRAINTS (from NLM research + online verification):**
- ComfyUI Dynamic VRAM (recent build required) handles sequential queue VRAM — no flush nodes needed.
- Step split sync is guaranteed by injectPlaceholders (totalSteps = s1 + s2 feeds both samplers).
- add_noise / return_with_leftover_noise are hardcoded in workflow JSON — chaos never touches them.
- Speed LoRA presets (future): CFG must be 1.0–3.5 for Lightx2v. Document at preset creation time.
- Shift (currently 8.0 hardcoded in workflow) is included in preset + seed bank schema for future UI.

**PRODUCTION LOOP THIS ENABLES:**
1. Drop image. Set prompt. Dial chaos to 20-25%. Queue 20-30 runs. Sleep.
2. Wake up. Review outputs. Save winning seeds.
3. Dial chaos to 5%. Queue 30 of the winner variant.
4. You now have a pack.

### PHASE 4 — PACK SYSTEM + ARCADE
- Bot skin system: workflow JSON + UI theme + locked prompt prefix = a "bot"
- Pack format: 30-N animations + HyperEdit-compatible metadata
- Bad Candy Arcade: each bot = a clickable machine in the arcade
- Future: downloadable player + purchasable content packs

┌── ⛬ ARCHITECTURAL CONSTRAINTS ────────────────────────────────────────────────────┐
│ • ComfyUI headless = required dependency. Document this clearly for users.         │
│ • Image upload: copy to ComfyUI input directory before submitting workflow.         │
│ • Output: ComfyUI writes MP4 to its output directory — poll or WebSocket.          │
│ • LoRA paths: absolute paths from ComfyUI models/loras/ directory.                 │
│ • MPS backend: ComfyUI handles this automatically on Apple Silicon.                │
│ • NSFW: local + uncensored = no filter. This is the entire point.                  │
└───────────────────────────────────────────────────────────────────────────────────┘

┌── 👁‍🗨 INTERFACE CONTRACTS ────────────────────────────────────────────────────────┐
│ Workflow JSON placeholder schema (what renderer.js injects):                       │
│   {{ IMAGE_PATH }}  → absolute path to copied input image                         │
│   {{ PROMPT }}      → user's prompt string                                        │
│   {{ NEG_PROMPT }}  → negative prompt (optional, has sensible default)            │
│   {{ SEED }}        → integer seed (-1 = random)                                  │
│   {{ STEPS_1 }}     → Stage 1 steps (4 default)                                  │
│   {{ STEPS_2 }}     → Stage 2 steps (4 default)                                  │
│   {{ CFG_1 }}       → Stage 1 CFG scale (1 default)                              │
│   {{ CFG_2 }}       → Stage 2 CFG scale (1 default)                              │
│   {{ LORA_NAME }}   → LoRA filename (empty = no LoRA)                            │
└───────────────────────────────────────────────────────────────────────────────────┘


▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
[ ✦ 05 ]  T H E   P R O M I S E   G A T E   ( A C C E P T A N C E )
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

## PHASE 1 ACCEPTANCE CRITERIA (MVP)
[x] AC-01: Electron app launches and ComfyUI starts headlessly in background
[x] AC-02: Image drag-drop or file picker works — image copied to ComfyUI input/
[x] AC-03: Prompt text area accepts input
[x] AC-04: GO button triggers POST /prompt to ComfyUI localhost:8188 — FIXED: IPC-routed via Node.js http.request (no Origin header → no 403)
[x] AC-05: WebSocket progress updates drive a progress bar in-app — WORKING: node labels + step% confirmed in execution log
[x] AC-06: Generated video renders in-app on completion — WORKING: video plays in-app (was teal noise due to wrong node — see AC-08)
[x] AC-07: App quits cleanly — ComfyUI subprocess terminated
[~] AC-08: Generates at least one real video from a real image on M3 Max — WORKFLOW FIXED (Wan 2.2 node); needs re-test

## PHASE 2 ACCEPTANCE CRITERIA (14B 2-stage) — THE REAL TARGET
[x] AC-09: `i2v_14B_2stage.json` built — correct 2-stage node graph, WanImageToVideo, VAEDecodeTiled
[x] AC-10: DR34ML4Y HIGH+LOW LoRAs wired — LoraLoader(high) for CLIP+model, LoraLoaderModelOnly(low)
[x] AC-11: WanImageToVideo conditions from input image — serial latent chain, leftover noise hand-off correct
[x] AC-12: shift=8.0 both stages, beta/euler, CFG=3.5(Stage1)/6.0(Stage2), 51 total steps split 0-20/20-51, FPS=16, frames=81
[x] AC-13: main.js — `--bf16-unet` + `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7` in ComfyUI spawn
[x] AC-14: comfy.js NODE_LABELS — `KSamplerAdvanced` + `VAEDecodeTiled` added
[x] AC-15: 87/87 regression tests passing (updated for dual-LoRA, CFG 3.5/6.0, 51-step split + S257 RF patches)
[x] AC-16: End-to-end confirmed on PC (RTX 3090 Ti, CUDA) — one real video generated and plays in-app. Mac was zombie-queued (OOM). PC is the production machine.

## PHASE 3A — MAKE IT SMART (tooltips + presets + seed bank)
[x] AC-29: All 8 sliders + FPS + resolution have plain-English `title` tooltips in index.html. Effect-first language, no jargon.
[x] AC-30: Preset system live — `app/presets/` dir, 4 IPC handlers (listPresets/loadPreset/savePreset/deletePreset), slug allowlist + realpathSync escape guard (TOCTOU-safe: reads from `real`, not `filePath`). Loading a preset snaps all sliders; prompt untouched.
[x] AC-31: Seed bank live — `app/seeds.json`, 3 IPC handlers (listSeeds/saveSeed/deleteSeed). [★ SAVE SEED] appears after each successful gen. [▶ LOAD] snaps sliders + seed input. Prompt NOT stored.
[x] AC-32: Regression suite updated. 183 total tests, 0 failures.

## PHASE 3B — MAKE IT A FACTORY (chaos + queue)
[x] AC-33: Chaos slider (0–100%) in index.html. applyChaos() + chaosFloat(0.3)/chaosCfg(0.2)/chaosSteps(0.15) in renderer.js (pure, no IPC changes). FPS and resolution excluded.
[x] AC-34: Visual render queue — jobQueue[], runQueue(), addCurrentStateAsJob(). startGeneration() has 5 optional override params (backward-compatible). Queue UI: [+ ADD TO QUEUE], job card list, [▶ RUN QUEUE], [CLEAR].
[x] AC-35: Single-run [GENERATE] path unchanged — verified by regression test AC-35c.

## PHASE 2.5 — S259 FEATURE BATCH (resolution, FPS, report, repeat, polish)
[x] AC-17: LoRA injection fix — `injectPlaceholders()` rewritten to accept `loraValues` and inject into nodes 6/7/18/19 (LoRA strengths) and 13/14 (CFG + step split) by node ID. Sliders are no longer decorative.
[x] AC-18: Resolution preset dropdown — 5 presets: 832×480 LANDSCAPE 480P (default), 480×832 PORTRAIT 480P, 624×624 SQUARE, 1280×720 LANDSCAPE 720P, 720×1280 PORTRAIT 720P. Auto-detect from dropped image: compare aspect ratio to suggest matching preset, UI shows suggestion.
[x] AC-19: FPS dropdown — 8 / 12 / 16 (default, native training FPS) / 24. Injected into VHS_VideoCombine node by class_type detection.
[x] AC-20: Export report (.txt) — written alongside video on completion. Fields: date/time, output filename, duration, image source + original dimensions + selected preset, prompt, seed (mode + value), Stage 1 settings (CFG, steps, end_at_step, LoRA strengths), Stage 2 settings (CFG, steps, start_at_step, LoRA strengths), output resolution, FPS, run X of Y.
[x] AC-21: Repeat runs — dropdown 1-10 (default 1). Runs the EXACT same job N times sequentially: same image, same prompt, same settings. Seed behavior: if random mode, fresh seed per run; if fixed, same seed each run.
[x] AC-22: UI/debug pass — run prefix on status + button text during multi-run; per-run elapsed clock; report log entry on completion.

█████████████████████████████████████████████████████████████████████████████████████
█ ✖ THE ART GATE SHIVER : "IF THIS HAD MY NAME ON IT FOREVER, WOULD I BE PROUD?"    █
█████████████████████████████████████████████████████████████████████████████████████

⫷ The UI must feel like an arcade machine, not a developer tool. ⫸
⫷ The workflow JSON must be invisible to the user, forever. ⫸


░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
[ 🎒 06 ]  T H E   B L A C K B O A R D   ( S H A R E D   S T A T E )
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

┌───────────────────────────────────────────────────────────────────────────────────┐
│ 🔋 FORGE TELEMETRY                                                                │
│[ 🜂 VOLTAGE ] PROJECT_PROGRESS: [█████████████████████] 100% (Phase 4 COMPLETE)      │
│ [ ⟆ PHASE   ] Phase 4 SHIPPED — DIAL MODE + PRODUCTION MODE batch system. 200/200 regressions. Platform-aware workflow routing live. Commit 545e947 (batch) + platform fix. │
└───────────────────────────────────────────────────────────────────────────────────┘

• ACTIVE STATE FILE: `ZOETROPE/NORTH_STAR.md` (this file)
• PROJECT DIR: `THE_THRONE/AExMUSE/04_📦_PROJECTS/PROJECT_BAD_CANDY_ARCADE/ZOETROPE/`
• COMFYUI API: `http://localhost:8188` (standard port)
• COMFYUI WS: `ws://localhost:8188/ws?clientId={uuid}`
• DEBUG LOG: `tail -f /tmp/wan_booth_debug.log` (file-based logger, live during app session)

[ ▣ ] DEPENDENCY GRAPH:
├─ [✅ DONE] ComfyUI installed + Wan 2.2 5B models downloaded (scaffolding)
├─ [✅ DONE] Electron app shell — IPC, WebSocket, progress, video player, debug logger
├─ [✅ DONE] All Soulforge RF fixes — AST injection, UUID, promptId, symlink, CSP, etc.
├─ [✅ DONE] 14B research — NLM deep research complete, node graph + hyperparams locked
├─ [✅ DONE] 14B model files confirmed: high_noise_fp8 + low_noise_fp8 + wan_2.1_vae + umt5_xxl_fp8
├─ [✅ DONE] LoRAs staged to ~/Desktop/ComfyUI/models/loras/:
│             DR34ML4Y_I2V_14B_HIGH + DR34ML4Y_I2V_14B_LOW (matched pair)
│             sfbehind_v2.1_high_noise + sfbehind_v2.1_low_noise (matched pair)
│             wan22-ultimatedeepthroat-I2V-34epoc-high + -16epoc-low (matched pair)
│             Wan22_CumV2_Low (low-only LoRA)
├─ [✅ DONE] Mac FP8 path resolved — `--bf16-unet` flag casts FP8→BF16 at runtime (no GGUF needed)
├─ [✅ DONE] i2v_14B_2stage.json built — 2-stage KSamplerAdvanced chain, serial latent hand-off, DR34ML4Y LoRA wired
├─ [✅ DONE] main.js updated — `--bf16-unet` + `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` in ComfyUI spawn
├─ [✅ DONE] comfy.js NODE_LABELS updated — KSamplerAdvanced + VAEDecodeTiled + both conditioning nodes
├─ [✅ DONE] 84/84 regression tests passing — 30 new 14B structure tests added (S255)
├─ [✅ DONE] AC-16 — first real video confirmed on PC (RTX 3090 Ti, CUDA, S259 morning)
├─ [✅ DONE] AC-17 through AC-22 — S259 feature batch complete (124/124 regressions)
├─ [✅ DONE] S259 Opus audit — RF-S259-02 through RF-S259-10 + OPT-03 applied (137/137 regressions)
├─ [✅ DONE] Phase 2.6 — SA+TeaCache confirmed on Citadel: 8 runs, 18:18 avg, 2.41× speedup. TeaCache schema corrected (class `TeaCache`, no phantom fields, end_percent required). Prompt removed from reports. (144/144 regressions)
├─ [✅ DONE] Phase 3 RESEARCH — PHASE_3_CODING_BRIEF.md written. All 5 RQs resolved. Verified online. NLM brief uploaded (source ID 29252404).
├─ [✅ DONE] Phase 3A — Tooltips + Preset system + Seed bank (183/183 regressions)
├─ [✅ DONE] Phase 3B — Chaos slider + Visual render queue (183/183 regressions)
├─ [✅ DONE] Phase 4 — Batch system: DIAL MODE + PRODUCTION MODE (200/200 regressions, commit 545e947)
│             Platform routing: Mac→i2v_14B_2stage_mac (bypasses PatchSageAttentionKJ nodes 20+22, not installed on Mac)
│             PC→i2v_14B_2stage (full Phase 2.6 SageAttention chain, unchanged)
│             get14bWorkflow() in renderer.js dispatches based on process.platform via wan:getPlatform IPC
│             Mac ComfyUI Python 3.14 venv has broken pip (libexpat/pyexpat symbol mismatch) — use uv for any future pip installs
│             KJ Nodes cloned to ~/Desktop/ComfyUI/custom_nodes/ComfyUI-KJNodes but deps not installed (matplotlib/mss/color-matcher missing)
│             If you want SageAttention on Mac in future: fix Python or reinstall ComfyUI venv with Python 3.12
├─ [✅ DONE] UI ground-up redesign — 7-zone architecture, Bad Candy Arcade aesthetic. Glitchswarm S241. layout.css + chroma-bleed.css deployed. OBSIDIAN ok:true.
├─ [NEXT] JS hookup dev session — mode selector switching, ComfyUI status dot, altar label per-mode
├─ [NEXT] First full batch run on Citadel + UI polish per feedback

## RESOLVED QUESTIONS
1. ✅ **Build on Mac first**, transfer to PC when validated.
2. ✅ **PC GPU: RTX 3090 Ti, 24GB GDDR6X** — FP8 path on PC, same as Mac. No GGUF needed.
3. ✅ **ComfyUI installed** at `~/Desktop/ComfyUI/`.
4. ✅ **5B scaffold worked** — proved the Electron + IPC + WebSocket stack end-to-end.
5. ✅ **HTTP 403 fix** — ComfyUI 0.3+ blocks `fetch()` from file:// Origin. Fixed via IPC http.request.
6. ✅ **Wan 2.2 14B uses WanImageToVideo** — NOT Wan22ImageToVideoLatent. That's 5B-only.
7. ✅ **Real target confirmed: 14B 2-stage** — Brandon has NSFW LoRA library built for high/low noise 14B.
8. ✅ **No LoRA training needed** — 4 LoRA pairs staged: DR34ML4Y, sfbehind, ultimatedeepthroat, CumV2Low.
9. ✅ **14B workflow params locked** — NLM deep research complete. euler/beta, shift=8.0, CFG=4.0, steps 0-15/15-40.
10. ✅ **14B model files confirmed on disk** — high_noise_fp8 + low_noise_fp8 + wan_2.1_vae + umt5_xxl_fp8 all present.
11. ✅ **Mac FP8 solution** — `--bf16-unet` ComfyUI flag casts FP8 models to BF16 at load (MPS supports BF16). No GGUF. No plugin.
12. ✅ **14B uses Wan 2.1 VAE** (wan_2.1_vae.safetensors) — already on disk. NOT wan2.2_vae.
13. ✅ **14B FPS = 16** (NOT 24 like 5B). Must set FPS=16 in VHS_VideoCombine. 81 frames = 5 sec @ 16fps.

## SESSION LOG

### S252 — 2026-05-06 — PHASE 1 BUILD
- Full Electron app built: main.js, preload.js, comfy.js, renderer.js, index.html
- Workflow JSON authored (i2v_5B.json) with correct WanImageToVideo node wiring
- All 4 models downloaded via curl (wget not available on this machine)
- App boots, ComfyUI auto-starts, image drop works

### S253 — 2026-05-06 — SOULFORGE DEBUGGING SESSION
- Opus adversarial audit identified 10 red flags
- 14 patches applied across 5 files
- Fixes: AST placeholder injection, crypto.randomUUID, promptId null guard, symlink traversal,
  __dirname loadFile, WebSocket URL constructor, 127.0.0.1 bind, pathToFileURL IPC,
  drag-drop extension allowlist, CSP meta tag, NaN seed guard
- 50/50 regression tests written and passing (test/regression.js)
- Craft Gate: passed (isolated Haiku auditor, ok:true)

### S253 continued — DEBUG LOGGER
- File-based logger: main.js `dbg()` → `/tmp/wan_booth_debug.log`
- IPC bridge: `wan:log` send → preload → main process → log file + stdout
- comfy.js `log()` wraps `window.wan.log` + `console.log`
- Logs: generate() entry, workflow load, placeholder injection values, WS connect,
  POST request/response, HTTP status + error body, progress %, executed nodes, completion
- DevTools also open for this debug session
- Usage: `tail -f /tmp/wan_booth_debug.log` from any terminal

### S253 continued — HTTP 403 FIX
- Root cause: ComfyUI 0.3+ rejects `fetch()` from `file://` renderer (Origin: null → 403)
- Fix: `wan:queuePrompt` IPC handler in main.js uses Node.js `http.request` (no Origin header)
- comfy.js now calls `window.wan.queuePrompt()` instead of `fetch()` directly
- Confirmed: HTTP 200, generation queued, WebSocket progress running, video played in-app

### S253 continued — WAN 2.2 NODE FIX + TARGET PIVOT

- Root cause: `WanImageToVideo` (Wan 2.1, 16ch latent) used with Wan 2.2 model (expects 48ch)
- Fix: `i2v_5B.json` rewritten — `Wan22ImageToVideoLatent` replaces node 10, nodes 5+6 removed
- Regression suite updated — 54/54 passing
- **PIVOT**: Brandon confirmed real target is 14B 2-stage (high_noise + low_noise)
- Brandon has NSFW LoRA library built for 14B — no training needed, just integration
- NLM deep research notebook created for 14B 2-stage workflow architecture
- Waiting on research before building i2v_14B_2stage.json

### S255 — 2026-05-07 — SOULFORGE CODING — 14B WORKFLOW BUILD
- **i2v_14B_2stage.json** authored: 17 nodes, two-stage KSamplerAdvanced chain, serial latent hand-off
- Node graph decisions locked: WanImageToVideo (14B-compatible), VAEDecodeTiled (OOM prevention on Mac),
  LoraLoader(high) for CLIP + model, LoraLoaderModelOnly(low) for model only, shift=8.0 IDENTICAL on both stages
- DR34ML4Y HIGH + LOW LoRAs wired as default; other 3 LoRA pairs available by editing workflow JSON
- **main.js** updated: `--bf16-unet` + `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` in ComfyUI spawn
  (FP8→BF16 cast at load; MPS supports BF16; disables fake OOM cap; no GGUF needed)
- **comfy.js** updated: NODE_LABELS entries for KSamplerAdvanced, VAEDecodeTiled, Wan22ImageToVideoLatent (5B), WanImageToVideo (14B)
- **regression.js**: 30 new tests added (14B node structure, LoRA wiring, Mac launch flags, shift identity,
  FPS=16, serial latent chain, VAEDecodeTiled). 84/84 passing. Header updated to cover both S253+S255.
- Architectural Plaque written: 9 decisions documented with why + trade_off (BLACKBOARD.json)
- Soulforge Art Gate: PASSED. Craft Gate (adversarial Haiku): PASSED on second run.
- AC-09 through AC-15: all passing. AC-16 (morning end-to-end test) queued.
- 4 LoRA pairs (7 files) moved from ~/Downloads to ~/Desktop/ComfyUI/models/loras/

### S257 — 2026-05-07 — SOULFORGE DEBUGGING — RF AUDIT FIX PASS
- Opus adversarial audit: 10 red flags identified (RF-A through RF-J) + 2 optimizations
- RF-A: `webUtils.getPathForFile()` attempted → REVERTED. `webUtils` is renderer-only on Electron 28, undefined in preload. `file.path` still works on Electron 28 (removed in Electron 32 — deferred to upgrade)
- RF-D: `PYTORCH_MPS_HIGH_WATERMARK_RATIO` 0.0 → 0.7 (removes safety floor at 0.0; 0.7 gives headroom)
- RF-F: `getComfyStatus` http://localhost → http://127.0.0.1 (Chromium treats them as different origins)
- RF-G: `statSync` → `lstatSync` in copyToInput (symlinks to files pass statSync.isFile(), lstat sees the link itself)
- RF-H: CSP connect-src expanded to include `127.0.0.1:8188` alongside `localhost:8188`
- RF-I: `VIDEO_OUTPUT_NODE = '17'` → dynamic VHS_VideoCombine detection (workflow-agnostic for future workflows)
- RF-J: `openDevTools()` gated on `NODE_ENV !== 'production'`
- Skipped: RF-B (negative CLIP through LoRA — standard practice), RF-C (steps/CFG match TensorHub reference), RF-E (promptId race — theoretical only), OPT-1 (SamplerCustomAdvanced — v2 redesign), OPT-2 (/history fallback — v2 feature)
- 87/87 regression tests passing (3 new tests for RF-I dynamic detection, RF-G lstatSync, RF-A revert)
- AC-16 attempted → `'<' not supported between instances of NoneType and tuple` error from ComfyUI
- NLM consulted: ComfyUI update recommended (v3 nodes not initializing in old version)

### S258 (continued) — 2026-05-07 — GLITCHSWARM UI REDESIGN + INFRA
- **Glitchswarm S258 COMPLETE** — Bad Candy Arcade aesthetic. CHROMA_BLEED (hot magenta oklch(0.650 0.290 338) + cyan oklch(0.760 0.165 196) + purple-void oklch(0.095 0.010 285)), TYPE_WEAVER (VT323 20px UI, Press Start 2P 88px/6px bimodal only), GRID_GHOST (single-column scroll, 2-stage LoRA cards with CSS collapse drawers, elapsed timer + ETA row). 87/87 regressions. Art Gate PASSED. OBSIDIAN PASSED.
- **CSS subgrid post-mortem** — `.lora-stage-body` cannot use `grid-template-columns: subgrid` because it's not a direct child of `.lora-section` (`.lora-stage` block breaks the chain). Fix: switched `.lora-section` to `display:flex; flex-direction:column` and gave `.lora-stage-body` its own `display:grid; grid-template-columns:150px 1fr 52px`. Visual alignment preserved via identical column definitions.
- **GitHub repo** — `https://github.com/the-sinner-king/wan-booth` pushed. README with Mac+PC setup, .gitignore for session artifacts. Ready for PC clone.
- **WAN_BOOTH_ARCHITECTURE.txt** — 18-section full source map written to disk and uploaded to NLM notebook `811bfc8c-fd98-4655-8743-e60dfe638a97`.
- **NLM auth fix** — `com.kingdom.nlm-refresh` launchd agent installed. Runs `nlm login` every 3 days silently via Chrome CDP at port 9222 (dedicated nlm Chrome profile). Script: `~/.local/bin/nlm-refresh.sh`. No more manual `nlm login` unless Chrome profile signs out of Google.
- **AC-16 STATUS CORRECTED** — Job was NOT running. Fans never spun. Python process only used 463MB RAM. ComfyUI /system_stats VRAM reading was misleading — reflected system Metal allocations, not the process. Actual cause: 56GB of BF16 models couldn't load with Gemini CLI (26GB) + mds_stores (9GB) eating unified memory. First real generation will happen on PC.
- **BATCH SYSTEM RESEARCH COMPLETE** — `BATCH_SYSTEM_PLAN.md` written. Two modes designed: DIAL (parameter sweep, N×M job matrix) and PRODUCTION (overnight, seed variation). Critical bug found: LoRA sliders are currently decorative — values collected but NOT injected into ComfyUI workflow. Fix documented in plan with exact code.
- **NLM auth permanently fixed** — `com.kingdom.nlm-refresh` launchd agent installed, runs `nlm login` every 3 days silently.

### S258 — 2026-05-07 — COMFYUI UPDATE + AC-16 LAUNCH
- `cd ~/Desktop/ComfyUI && git pull` — 4 files updated: model_patcher.py, nodes_grok.py, requirements.txt
- ComfyUI-VideoHelperSuite: already up to date
- pip install skipped — only change was comfyui-workflow-templates 0.9.69→0.9.72 (cosmetic); ABI mismatch on Python 3.14 blocked it anyway
- Stale pre-pull ComfyUI (PID 11534) killed — `isComfyUIRunning()` guard would have kept old code alive
- Node audit: 737 nodes registered, all critical nodes FOUND (ModelSamplingSD3, WanImageToVideo, VHS_VideoCombine)
- All 7 LoRA files confirmed on disk
- North Star updated: 0.0→0.7, 84/84→87/87, 17→18 nodes
- WAN BOOTH launched with fresh ComfyUI (post-pull code)

### S259 continued — 2026-05-08 — OPUS AUDIT FIX PASS
- RF-S259-02: Stage 2 `end_at_step=10000` sentinel preserved — was incorrectly overwritten with `totalSteps`
- RF-S259-03: Step values clamped to [1, 100] before `totalSteps` computation — prevents ComfyUI panic on edge values
- RF-S259-04/05: `writeReport` IPC redesigned — accepts filename token only (regex allowlist); renderer takes `outputFilename.split().pop()` basename
- RF-S259-07: ComfyUI spawn `stdio:'ignore'` → `['ignore','pipe','pipe']`; stdout/stderr piped to debug log
- RF-S259-08: `executed` WS handler guards against `!promptId` — stray events before job queued can't fire `onComplete`
- RF-S259-09: `runAllJobs` no longer breaks on failure — continues all N runs, surfaces succeeded/failed summary
- RF-S259-10: CSP gains `object-src 'none'` + `base-uri 'none'`
- OPT-03: `validateWorkflow14b()` call wired into `injectPlaceholders()` before LoRA injection
- Tests: 124 → 137 (13 new tests, 2 updated for corrected behavior)
- README fully rewritten — CITADEL SYNC BRIEF at top, corrected PC setup (no phantom COMFYUI_DIR constant, exact lines to edit)

### S259 — 2026-05-08 — FEATURE BATCH (resolution, FPS, report, repeat, polish)
- AC-16 CONFIRMED: Cla⌂de + Brandon on PC ran first real generation. RTX 3090 Ti, CUDA. It worked. PC is production machine.
- GitHub PC push still pending (only 2 commits on remote — `main` branch). Working from local codebase.
- Feature batch scoped: AC-17 (LoRA injection fix), AC-18 (resolution presets + auto-detect), AC-19 (FPS dropdown), AC-20 (export report .txt), AC-21 (repeat runs dropdown 1-10), AC-22 (UI/debug pass)
- LoRA injection is prerequisite — all other sliders are currently decorative. Fix first.
- Resolution injected via class_type detection for WanImageToVideo node (NOT by node ID — workflow-agnostic)
- FPS and filename_prefix injected via VHS_VideoCombine class_type detection (already exists in RF-I fix)
- main.js `copyToInput` updated to return `{filename, width, height}` using `nativeImage.createFromPath().getSize()`
- New `wan:writeReport` IPC handler in main.js + preload.js exposed as `window.wan.writeReport()`
- Repeat runs loop in renderer.js — sequential `await ComfyClient.generate()` calls, fresh seed each run if random mode

### S259 continued — 2026-05-09 — PHASE 2.6 CONFIRMED ON CITADEL

**8 back-to-back runs confirmed. Phase 2.6 ships.**

- **Performance**: 44:06 baseline → **18:18 avg** Phase 2.6 = **2.41× sustained speedup**
- **Per-step breakdown**: Stage 1 (20 steps): ~6.5-7 min (~21 sec/step); Stage 2 (31 steps): ~11 min (~21 sec/step)
- **Hardware**: RTX 3090 Ti (Ampere sm86), 24GB VRAM. Peak VRAM: ~19.4 GB (fully model-resident, no CPU offload). Power draw: ~400W of 450W TDP. GPU temp: 75°C peak.
- **Cla⌂de TeaCache schema fix (commit `416b772`)**: class_type `ApplyTeaCache` → `TeaCache`; removed phantom fields `retention_mode` + `max_skip_steps`; added required `end_percent: 1.0`. Regression: 143 → 144 (4 assertions corrected + 1 new test). Root cause: schema inferred from brief rather than `/object_info` introspection.
- **Cla⌂de privacy fix (commit `9169807`)**: `buildReport()` in renderer.js no longer writes prompt text to `_report.txt`. Existing reports 00004-00011 scrubbed with sed. Known residual: VHS_VideoCombine still embeds prompt in mp4 H.264 metadata — see KNOWN ISSUES.
- **New files pushed**: `PHASE_2.6_BRINGUP_REPORT.md` (full bring-up report), `CLAUDE_FIXES.md` (running bug log + install ops IO #1-3 for Citadel env replay).
- **Quality verdict**: Brandon + Cla⌂de eyeball test: "looks SO good."
- **Final regression state**: **144/144, 0 failing**
- **Pattern lesson**: All schema bugs (KJNodes class typo, field rename, TeaCache class + phantom fields + missing field) came from inferring plugin schema from documentation rather than introspecting installed source. Future protocol: always query `/object_info` or `NODE_CLASS_MAPPINGS` + `INPUT_TYPES()` before writing workflow JSON.

### S259 continued — 2026-05-09 — PHASE 3 RESEARCH + BRIEF

**Soulforge RESEARCH session complete. 7 loops. PHASE_3_CODING_BRIEF.md written.**

- **Codebase scout (Loops 1–4)**: renderer.js, index.html, main.js, comfy.js fully read. Full param schema mapped. injectPlaceholders signature + node ID routing documented. Project path corrected: PROJECT_VENUS_FLYTRAP → PROJECT_BAD_CANDY_ARCADE.
- **NLM research (Loop 5)**: 5 parallel queries against "WAN BOOTH — Wan 2.2 Architecture & TI2V Conditioning Deep Dive" (366 sources, ID 811bfc8c). CFG, LoRA strength, step count, resolution/FPS, chaos/seed metadata — all resolved.
- **Cross-source collisions (Loop 6)**: 4 collisions documented. Key: CFG 3.5/6.0 defaults confirmed correct; LoRA danger zone starts at 0.8 (DR34ML4Y is AT the ceiling); current 20/31 step split = 39% Stage1 = official SNR split; FPS is playback-only.
- **Coding brief written (Loop 7)**: PHASE_3_CODING_BRIEF.md — all 5 RQs resolved with copy-paste-ready code, tooltip strings, chaos math with dampener table, implementation order, file change map, regression estimate.
- **NLM verification pass**: 10 NLM feedback items (RF-01 through RF-10) cross-checked against codebase + 4 online Tavily searches. Net result: 1 real fix (add shift:8.0 to preset + seed bank schema), 1 note (RF-04 speed LoRA CFG caveat), 1 runtime dependency note (ComfyUI Dynamic VRAM required for queue). 4 items dead (RF-01/02/03/07). 2 already in brief (RF-06/10). 2 out of scope (RF-08/09).
- **Brief uploaded to NLM**: Source ID 29252404. Notebook now has 367 sources.
- **Biggest finding**: Chaos is renderer-only — zero IPC changes, zero main.js changes. Ships in one focused session.

### S241 (Æris/AExGO) — 2026-05-11 — GLITCHSWARM PASS 2: FULL INDEX.HTML GROUND-UP REDESIGN

**Glitchswarm session. 4 loops. OBSIDIAN ok:true (Round 3). Art Gate PASSED. promise: COMPLETE.**

- **Mission**: Ground-up rewrite of `app/index.html` — Bad Candy Arcade aesthetic, 7-zone architecture, all 129 HTML IDs preserved, JS files untouched.
- **Note**: S258 created the design token files (color-tokens.css, type-tokens.css, chroma-bleed.css) and initial layout concepts. S241 is the COMPLETE index.html rebuild integrating all prior drone output.
- **7-zone architecture deployed**:
  - Zone 1 (header/nameplate): outside `#main-panel`, with `#comfy-status-dot` + `#comfy-status-label`
  - Zone 2 (mode-selector nav): outside `#main-panel`, 3 mode tabs (`#single-mode-btn`, `#dial-mode-btn`, `#prod-mode-btn`)
  - Zones 3-7 (input/params/mode-ctrls/altar/results): as `<section class="zone">` inside `<main id="main-panel">`
- **layout.css deployed** — GRID_GHOST spatial architecture copied from `.forge-staging/` to `app/`. Fixes applied at source: `.lora-stage-header-title`, `.lora-row-value`, `#go-btn` type tokens corrected.
- **chroma-bleed.css updated** — `.lora-stage-header-title`, `.lora-row-value`, `.batch-promote-btn` type token violations fixed.
- **Token compliance**: All `var(--ws-font-nameplate)` refs (5 occurrences) purged — token does not exist. All elements now use valid `var(--ws-font-ui)`. `--ws-tracking-button` zero occurrences (doesn't exist). All type scale values correct: button=24px, stage=32px, value=24px, log=16px.
- **LoRA row pattern**: `.lora-row { display:contents }` — wrapper dissolves, children become direct 4-col subgrid participants. `input[type=range]` has `.lora-row-slider` directly — no `.lora-row-track` wrapper.
- **Collapsible pattern**: Hidden checkbox `.lora-toggle` + `<label>` + `.lora-stage-body` with CSS `max-height 0→800px`. `display:none` forbidden for CSS-only drawers; JS-driven panels exempt.
- **Zone padding**: 28px on all `.zone` base rules. Child elements inside zones have no horizontal padding (double-padding stripped — was 56px misalignment).
- **OBSIDIAN R1**: ok:false — 6 blockers. B-01/05/06 fixed. B-02/03/04 deferred (JS-driven panels, renderer.js READ ONLY).
- **OBSIDIAN R2**: ok:false — NF-01/02/03 (layout.css source tokens, --ws-font-nameplate at 5 locations). All fixed.
- **OBSIDIAN R3**: ok:true — 15 checks passed, 3 non-blocking warnings (dead CSS rules, type-tokens.css responsive breakpoints). W-R3-01 (.batch-promote-btn 9px) fixed pre-promise.
- **Ghost nodes** (dev session required): mode-selector JS hookup, altar label per-mode, `#comfy-status-dot` JS hookup, `#dial-body`/`#prod-body`/`#seed-bank-panel` animation conversion.
- **Project root cleanup**: all Soulforge session artifacts moved to `.forge-sessions/`. `.gitignore` updated.

### S241+ (Æris/AExGO) — 2026-05-13 — PROMPT-INPUT BUG FIX + DESIGN V2 PIVOT

- **Bug fixed**: `#prompt-input` white textarea — `background/color/border/::placeholder/:focus` were delegated to chroma-bleed.css in layout.css comment but never written. Added as Section 11 in chroma-bleed.css. Selector: `background: var(--ws-bg); color: var(--ws-fg); border: 1px solid var(--ws-border)`. Focus: `border-color: var(--ws-pink); box-shadow: 0 0 8px var(--ws-pink-glow)`.
- **Design feedback**: S241 shell is functional but aesthetically flat — correct color palette and pixel font, but no visual structure, no depth, no panel card hierarchy. Brandon's verdict: "the design was a bit lacking."
- **Design v2 pivot**: New direction is ZOETROPE aesthetic — cyan+pink dual accent (not pink-only), bordered panel cards for each section, stage sections as distinct boxed containers, pixel dot progress animations, deeper visual hierarchy. Reference images: ZOETROPE AI Video Batch Processor mockups (images shared in session).
- **Status**: Brandon + Æris (AExMUSE panel) actively designing new shell. All 129 HTML IDs must survive — renderer.js stays untouched.

### S264 (Cla⌂de/Citadel) — 2026-05-15 — ZOETROPE FIRST BRING-UP ON CITADEL ✅

Brandon switched projects from HyperEdit to Zoetrope. Cloned `the-sinner-king/zoetrope` to `D:\zoetrope`. Aeris's note (README §⚡ CITADEL FIRST) routed the bring-up.

**Aeris's note divergence check (her instructions vs. repo reality):**
- ❗ `package.json` lives in `app/` not at root — went with `cd app` per README. (Aeris confirmed: "my bad, README wins.")
- ❗ `CLAUDE_FIXES.md` was deleted in `675710d` (S264 cleanup) — recovered IO #2 patch body from `9169807` and staged locally as `D:\zoetrope\CLAUDE_FIXES.md` (uncommitted — kept out of repo per Aeris's intent).

**Bring-up verification (read-only):**
| Check | Result |
|---|---|
| TeaCache monkey-patch at `D:\COMFYUI_FOR_WAN_BOOTH\custom_nodes\ComfyUI-TeaCache\nodes.py` line 13-18 | ✅ INTACT — `precompute_freqs_cis` vendored fix survived since 2026-05-08 Phase 2.6 bringup |
| `node test/regression.js` | ✅ **200/200 PASS** |
| `npm install` from `D:\zoetrope\app\` | ✅ OK (audit notice only, no errors) |
| `COMFYUI_DIR=D:\COMFYUI_FOR_WAN_BOOTH npm start` | ✅ Launched — 8 Electron procs + 2 Python procs (the big one @ 63 GB RAM = both Wan 2.2 14B models loaded) |
| `GET /system_stats` | ✅ ComfyUI 0.20.1 serving on `localhost:8188` |
| `/object_info` ↔ workflow contract | ✅ `PathchSageAttentionKJ`, `TeaCache`, `Wan22ImageToVideoLatent`, `ModelSamplingSD3`, `KSamplerAdvanced`, `VHS_VideoCombine` all PRESENT. Old names (`PatchSageAttentionKJ`, `ApplyTeaCache`) correctly ABSENT. Nodes 20-23 will NOT red-border on load. |
| Debug pipeline | ✅ THREE diagnostic surfaces wired: (A) in-app `> SYS_LOG` panel via `▾ SHOW`, (B) DevTools `Ctrl+Shift+I`, (C) `%TEMP%\wan_booth_debug.log` with full ComfyUI stdout/stderr. Confirmed via fresh capture of a live 4-run batch on the parallel WAN BOOTH instance — step-level granularity 1→81, 17:48 per clip. |

**Notes for future:**
- Zoetrope shares the `D:\COMFYUI_FOR_WAN_BOOTH` install with the original WAN BOOTH — port 8188 clash if both apps run at the same time. By design (Brandon's call).
- The "KNOWN ISSUES / OPEN QUESTIONS" entry for TeaCache monkey-patch is still accurate as a forward-warning, but as of S264 the patch IS in place — only relevant after a future `git pull` on the plugin repo.

State: Ready for dummy test. Awaiting Brandon's queue.

---

### S264 cont. (Cla⌂de/Citadel) — 2026-05-15 — QUEUE UI BUG SQUASH

Brandon ran first dummy test: 2 jobs added via `[+ ADD TO QUEUE]`, status stuck on "QUEUED — awaiting ComfyUI slot", **never POSTed to ComfyUI** (verified via `/queue` endpoint — empty). ComfyUI sat idle while Zoetrope's internal `jobQueue[]` hoarded the jobs.

**Read-only constraint override:** Brandon explicit go-ahead to debug renderer.js + index.html for this session. Citadel changes tagged with `S264 Cla⌂de patch` comments so Aeris can merge or reject cleanly.

**Root cause audit (SOULFORGE DEBUG flavor):**

| Bug | Severity | Where | Cause |
|---|---|---|---|
| **BUG-01** | 🔴 BLOCKER | `index.html:882` | `<button id="run-queue-btn" style="display:none;">` had inline `display:none` that `renderQueueUI()` never overrode. The button sat inside `#queue-panel` (whose visibility WAS toggled), but the inline style on the button itself dominated. User had no way to fire the queue. |
| **BUG-02** | 🟡 | `queue.js` + `renderer.js` | Both files registered click handlers on `#add-to-queue-btn`. queue.js (IIFE, S263) appended `<li class="queue-card">` elements directly to `#queue-list`; renderer.js's `addCurrentStateAsJob()` pushed to `jobQueue[]` then called `renderQueueUI()` which did `queueList.innerHTML = ''` and rebuilt with `<div class="queue-job-card">`. queue.js's DOM work was nuked every time. Dead double-handler. |
| **BUG-03** | 🟡 | `renderer.js renderQueueUI` | `#queue-empty` visibility was being managed by queue.js's `updateEmptyState()`. With queue.js retired (BUG-02), the empty-state visibility was orphaned. |
| **BUG-04** | 🟡 | `index.html` missing element | `renderer.js initQueueUI` line 948 grabs `#queue-clear-btn` and wires a click handler — but the button never existed in `index.html`. Dead reference; clear functionality unreachable. |
| **BUG-05** | 🟢 GHOST | `#comfy-status-dot` | Aeris-known ghost (S241 ghost-nodes list): CSS states exist (`comfy-connected`/`comfy-connecting`/`comfy-disconnected`) but no JS hookup. Dot stays disconnected visually. Deferred — not in current scope. |

**Fixes applied (4 surgical edits, all tagged `S264 Cla⌂de patch`):**

1. **`index.html:882`** — Removed inline `style="display:none"` from `#run-queue-btn`. Wrapped it + new `#queue-clear-btn` in a `<div class="queue-panel-actions">`. Resolves BUG-01 + BUG-04 together.
2. **`index.html:915`** — Commented out `<script src="queue.js"></script>` with rationale. queue.js file kept on disk (git history). Resolves BUG-02.
3. **`renderer.js renderQueueUI()`** — Folded queue.js's `updateEmptyState` logic into renderQueueUI: toggles `#queue-empty` display and updates `#queue-count` text alongside the existing panel-visibility logic. Resolves BUG-03.

**Verification plan after restart:**
- Add 2 jobs via `[+ ADD TO QUEUE]` → both appear in queue panel
- `[ ▶ RUN QUEUE ]` button now visible
- Click → ComfyUI receives both prompts via `POST /prompt`
- `/queue` endpoint reports 1 running + 1 pending
- Debug log shows `[start]` events for each job
- `[ × CLEAR ]` removes pending jobs (keeps running)

**Round 2 — SOULFORGE DEBUG dive (2026-05-15 22:30):**

After the 4-bug squash + restart, RUN QUEUE click no longer stranded but generation still didn't fire. ComfyUI queue stayed empty. Visible status froze at "QUEUED — awaiting ComfyUI slot" with zero downstream log activity.

**Reproduce → Isolate via progressive instrumentation:**
- Added `[click] RUN QUEUE pressed` + `[runQueue] entered/guards/loop` log lines → confirmed runQueue runs cleanly
- Added `[runAllJobs] entered/iter/about-to-await` checkpoints → confirmed loop reaches startGeneration
- Added `[startGeneration] EXECUTOR ENTERED` + `try{}/catch` around the executor's status-setup block → **CAUGHT THE THROW**:
  ```
  [startGeneration] threw during status setup: Cannot set properties of null (setting 'textContent')
  ```

**Root cause (PHYSICAL FACT — Anti-Symptom Law):**
- `renderer.js:48-49`: `const elapsedValue = document.getElementById('elapsed-value')` and `const etaValue = document.getElementById('eta-value')` — both return **null**
- `index.html` (post-S262/S263 redesign) **has no `id="elapsed-value"` or `id="eta-value"` elements** — they were dropped during the two-column layout pivot
- `startClock()` runs `elapsedValue.textContent = '00:00:00'` (line 155) → `null.textContent = ...` throws
- `startClock()` is called by EVERY `startGeneration()` → the throw kills every generation path (EXECUTE_BATCH AND RUN QUEUE)
- The catch in the Promise wrapper swallowed the throw → status stayed at QUEUED, ComfyUI never POSTed to. Silent kill.

**BUG-06 fix (`renderer.js` `startClock` / `stopClock` / `updateEta`):**
Made all three functions null-safe (`if (elapsedValue) elapsedValue.textContent = ...`). Generation now proceeds even though the elapsed/ETA display is invisible. **The display elements themselves remain a ghost** — Aeris needs to wire `<span id="elapsed-value">` and `<span id="eta-value">` back into the S262/S263 redesigned UI for the timer to be visible again.

Marked as `S264 Cla⌂de patch (BUG-06)` in renderer.js.

**Verification:**
- `node test/regression.js` — 200/200 still PASS
- Ctrl+R reload picks up the patch — no full restart needed
- Brandon's next EXECUTE_BATCH click should fire `[startGeneration] status set` → `[startGeneration] params built` → `[startGeneration] pre-call: ComfyClient=function` → `[comfy] [start] seed=... image=...` → generation begins

---

### S264 cont. (Cla⌂de/Citadel) — 2026-05-16 — GRUMPY OPUS R4 BURN-DOWN

Brandon greenlit a full Grumpy Opus audit pass + cleanup loop. Drone returned 10 flags (3 🔴 + 6 🟡 + 1 🟢) and 3 upgrades. Burned 🔴+🟡 (9 fixes), deferred 🟢 + 3 upgrades with rationale. Every edit tagged `S264 Cla⌂de patch (BUG-Fl-N)` for Aeris-side tracing.

**🔴 BLOCKING fixes (would've broken DIAL/PROD on first user click):**

- **BUG-Fl1** [`renderer.js` DIAL + PROD click handlers, ~lines 1404/1446]: Both passed `selectedImagePath` (full host path like `C:\Users\brand\...\foo.png`) to `runBatch`, which forwarded as `imagePath` to ComfyClient.generate. ComfyUI's `LoadImage` resolves filenames against its `input/` dir; absolute paths → HTTP 400 "Value not in list: image: ... not in [...]". EXECUTE_BATCH correctly used `selectedImageFilename` (basename); DIAL/PROD didn't. **Fix:** swapped to `selectedImageFilename` in both call sites + renamed runBatch's param to `imageFilename` for clarity.
- **BUG-Fl2** [`renderer.js` DIAL + PROD, `runBatch`]: Width/height/frameRate never captured at click-time or forwarded into ComfyClient.generate. `injectPlaceholders` only writes them `if (width && height)`, so workflow's hard-coded 832×480 + 16fps silently won regardless of user's UI picks. User's `dial_…` filename prefix would land on wrong-resolution videos. **Fix:** captured `getResolutionPreset()` + `getFrameRate()` at click time, added width/height/frameRate params to `runBatch`, forwarded into ComfyClient.generate.
- **BUG-Fl3** [`index.html` near `#seed-bank-panel`, line ~692]: `#seed-bank-toggle` was referenced in `renderer.js:796` and styled in `chroma-bleed.css:541` but the element was removed from index.html during S262/S263 redesign. Seed-bank feature was dark UI — panel existed with `display:none`, no toggle button to flip it. Generation worked (guarded), but feature was unreachable. **Same class as BUG-06.** **Fix:** added `<button id="seed-bank-toggle">▾ SEED BANK</button>` before the panel.

**🟡 MEDIUM fixes (real bugs, bounded blast radius):**

- **BUG-Fl4** [`queue.js` DELETED, `index.html:921` comment updated]: queue.js was already excluded via commented-out `<script>` tag (BUG-02). Audit found it ALSO read `dropLabel.dataset.filename` which was never written anywhere in the codebase — dormant landmine if re-enabled. Per Highlander/Vaporize Protocol: file deleted. Tombstone comment in index.html updated.
- **BUG-Fl5** [`renderer.js:231` dragleave handler]: First dragleave clobbered Aeris's `[ DROP IMAGE MATRIX HERE ]` text → plain `'DROP IMAGE'`. Cosmetic brand-voice regression on first hover. **Fix:** restored `'[ DROP IMAGE MATRIX HERE ]'`.
- **BUG-Fl6** [`comfy.js` `injectPlaceholders` line ~80]: `validateWorkflow14b` was guarded by `if (loraValues)` — any LoRA-less path silently skipped the contract check. Contract integrity is a property of the workflow, not the injection mode. **Fix:** made unconditional. Regression test `OPT-03` updated to validate intent (call exists) rather than the obsolete guard pattern.
- **BUG-Fl7** [`comfy.js` WebSocket lifecycle, lines ~165-220]: Connect-phase `ws.onerror` was a property assignment that got REPLACED by runtime `ws.onerror` after the await. Microtask-window race: if WS error fired between resolve and reassignment, old handler tried to reject already-resolved promise → silent hang. **Fix:** converted to `addEventListener` with `{once: true}` for connect-phase open/error; runtime message/close/error listeners attached up-front before the await. Both phases now coexist cleanly. Regression test `RF-06` updated to accept either `ws.onclose` OR `addEventListener('close')`.
- **BUG-Fl8** [`renderer.js` DIAL + PROD click handlers]: Validation failures used `setStatus()` only — silent in the debug log (same class as BUG-06). DBG-instrumentation pattern was applied to EXECUTE_BATCH + runQueue but not DIAL/PROD. **Fix:** added `appendLog('queue', '[click] DIAL/PROD RUN pressed — ...')` and `appendLog('error', '[click] DIAL/PROD BAIL — ...')` before each setStatus bail.
- **BUG-Fl9** [`renderer.js:427` chaos-pct read]: Was unguarded inside a try/catch (added by me earlier). Other read sites use ternary-guard (`chaosEl ? ... : 0`). **Fix:** ternary-guarded the chaos-pct read; dropped the try/catch crutch.

**Deferred with rationale:**
- 🟢 **Flag #10**: `videoPlayer.src = ''` triggers a benign file:// fetch for the document. Cosmetic noise only — no functional impact. Use `removeAttribute('src') + load()` when convenient.
- **Upgrade #1**: `file.path` → `webUtils.getPathForFile()`. File.path was removed in Electron 32; zoetrope pins ^28.0.0 so it works today. Bump electron + bridge `webUtils` when ready.
- **Upgrade #2**: IPC sender-URL allowlist on every `ipcMain.handle`. Cheap zero-trust hardening — low risk today (single file:// renderer) so deferred.
- **Upgrade #3**: WebSocket exponential-backoff reconnect. Current code: any transient blip → terminate. Real fix would replace the whole WS lifecycle; deferred to own session.

**Regression suite update:**
- `RF-06` test loosened: accepts `ws.onclose` OR `addEventListener('close')`. Comment cites BUG-Fl7.
- `OPT-03` test loosened: accepts `validateWorkflow14b(w)` anywhere (was checking for obsolete `if (loraValues)` guard). Comment cites BUG-Fl6.
- `node test/regression.js` — **200/200 PASS** after burn-down.

**State after restart:** Zoetrope killed + relaunched with `COMFYUI_DIR=D:\COMFYUI_FOR_WAN_BOOTH`. ComfyUI 0.20.1 back on :8188. Awaiting Brandon's next test click (any of EXECUTE_BATCH / RUN QUEUE / RUN DIAL / RUN BATCH — all three click paths are now instrumented + fixed).

---

### S262 (Æris/AExGO) — 2026-05-13 — ZOETROPE v2 COMPLETE

**Glitchswarm session. 2 loops. 5 drones. Art Gate PASSED. OBSIDIAN ok:true (loop 2). Baseline committed.**

- **CHROMA_BLEED**: chroma-bleed.css Sections 1-15. OKLCH palette: pink oklch(0.72 0.28 350), cyan oklch(0.82 0.13 200), sulphur oklch(0.75 0.17 85), void oklch(0.095 0.010 285). Drop zone: repeating-linear-gradient diagonal stripe + dashed cyan border. Stage headers: solid cyan fill + void text. GO btn: void bg + sulphur text, hover = sulphur fill. Slider thumbs: LoRA = pink, STEPS = cyan, CFG = sulphur. Section 15: explicit ID-targeted pink thumbs for all 4 LoRA strength sliders.
- **GRID_GHOST**: layout.css Section 12 — .wan-container 640px centered, zone padding strip, stage card geometry + border, badge styles, GO button full-width override. Section 13 — compact spacing (nameplate 64px→8px, zone 48px→16px, altar 80px→16px). html { width:100% } + body { margin:0 auto } for correct centering at zoom factor.
- **TYPE_WEAVER**: chroma-bleed.css Section 14 — .lora-row-value: VT323, clamp(20px, 2.5vw+15px, 32px), line-height:1.0 (load-bearing — pixel font collapses without it).
- **OBSIDIAN loop 1** (7 blockers): B-01 inline color/text-shadow on lora-row-value spans, B-03 .lora-slider class DNE in DOM, B-04 #drop-zone rgba() box-shadow (OKLCH law), B-05 justify-content:space-between on stage header, B-06 .terminal-frame overflow on zone-input/zone-params. B-02/#go-btn height ghost, B-07 dead slider IDs ghost.
- **OBSIDIAN loop 2** (5 fixed): B-01 8 inline styles stripped, B-03 Section 15 added, B-04 inline style removed, B-05 flex-start added, B-06 terminal-frame class removed. B-02/B-07 ghost-nodded.
- **main.js**: BrowserWindow title "WAN BOOTH", icon.png, backgroundColor #0d0b12, zoomFactor 0.65. app.dock.setIcon() on macOS. DevTools auto-open removed (open manually with Cmd+Opt+I).
- **icon.png**: 512×512 — void bg, 4-layer pink neon border glow, cyan corner film holes, "W" in pink, "BOOTH" in cyan.
- **index.html**: `<title>WAN BOOTH</title>`, .wan-container wrapper, HIGH/LOW stage badges, .ascii-border overflow:hidden + width:100%, inline cascade fixes (justify-content, header colors, lora-row-value font), all inline element color/text-shadow stripped.
- **Ghost nodes (surviving)**: #go-btn 72px height set in layout.css but not chroma-bleed (low priority). Dead slider ID selectors in layout.css Section 7 (low priority, cosmetic).

### S259 continued — 2026-05-09 — PHASE 3A+3B COMPLETE

**Soulforge CODING session. All 7 ACs shipped. 183/183 regressions. Art Gate PASSED. OBSIDIAN PASSED.**

- **AC-29 — Tooltips**: `title` attributes on all 8 sliders (s1-dr34mlay-str, s1-k3nk-str, s1-steps, s1-cfg, s2-dr34mlay-str, s2-k3nk-str, s2-steps, s2-cfg) + resolution-select + fps-select. Effect-first plain English.
- **AC-30 — Preset system**: `app/presets/` dir + `index.json`. 4 IPC handlers in main.js: `wan:listPresets`, `wan:loadPreset` (slug allowlist + realpathSync escape guard, reads from `real` not `filePath` — TOCTOU-safe), `wan:savePreset`, `wan:deletePreset`. 4 bridge entries in preload.js. `loadPresets()` / `applyPreset()` / `initPresetUI()` in renderer.js. Preset UI in index.html: dropdown, LOAD/DELETE/SAVE AS… buttons, inline name-entry row. Prompt never stored.
- **AC-31 — Seed bank**: `app/seeds.json`. 3 IPC handlers: `wan:listSeeds`, `wan:saveSeed` (integer validation, UUID from crypto), `wan:deleteSeed` (UUID format check). `initSeedBankUI()` / `refreshSeedBank()` in renderer.js. [★ SAVE SEED] appears after generation completes (hidden by default). Seed bank panel with LOAD + delete per entry. Prompt never stored.
- **AC-32 — Regression count**: 183 tests, 0 failures (was 144).
- **AC-33 — Chaos slider**: `#chaos-pct` range input (0–100%, step 5). `chaosFloat(0.3)` / `chaosCfg(0.2)` / `chaosSteps(0.15)` dampener math. `applyChaos()` mutates only the 8 LoRA values — FPS and resolution excluded. `initChaosSlider()` drives label: OFF / MILD / MEDIUM / WILD. Applied per-run inside `runAllJobs()`.
- **AC-34 — Render queue**: `jobQueue[]` + `activeJobIndex`. `addCurrentStateAsJob()` snapshots current slider state. `runQueue()` drives sequential execution with per-job chaos. `renderQueueUI()` shows/hides `#queue-panel` based on queue length. Job cards show status dot (○/◈/✓/✗) + label + chaos%. Remove button on pending jobs. `[+ ADD TO QUEUE]` / `[▶ RUN QUEUE]` / `[CLEAR]` buttons.
- **AC-35 — Backward compat**: `startGeneration()` got 5 optional params (`loraValuesOverride`, `widthOverride`, `heightOverride`, `fpsOverride`, `chaosApplied`) — all default null/0. Existing `runAllJobs(seed, prompt)` call path unchanged.
- **OBSIDIAN caught 2 bugs**:
  - B-01: TOCTOU — `wan:loadPreset` was reading from unresolved `filePath` after `realpathSync` check. Fixed: reads from `real`.
  - B-02: `loadPresets()` not called at init — existing presets invisible on startup. Fixed: `await loadPresets()` in `init()`.
  - W-04: `appendLog('info', ...)` type not in LOG_ICONS — changed to `'complete'`.
- **Final state**: 183/183 regressions, 0 failures. Art Gate PASSED. OBSIDIAN ok:true.

## KNOWN ISSUES / OPEN QUESTIONS
- **✅ PC SYNCED** — Phase 2.6 fully confirmed. All commits pushed to GitHub. 144/144 regressions confirmed on Citadel.
- **⚠️ mp4 METADATA PRIVACY LEAK** — `VHS_VideoCombine` embeds full workflow JSON (including prompt text) as H.264 metadata into every generated mp4. Visible via `ffprobe TAG:prompt=...`. Existing videos 00004-00011 NOT scrubbed (only .txt reports were). Two fix paths: (A) `ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4` post-process in main.js after VHS completes; (B) VHS config option (needs source check). Brandon's call.
- **⚠️ TEACACHE MONKEY-PATCH** — welltop-cn `ComfyUI-TeaCache` import fails on ComfyUI ≥ 0.20 (Jan 5 2026 update removed `precompute_freqs_cis` from `comfy.ldm.lightricks.model`). Citadel requires inline function patch at `nodes.py:12`. **Will be wiped by `git pull`** on the plugin repo — re-apply after any TeaCache update. See `CLAUDE_FIXES.md IO #2` for exact patch.
- **BATCH SYSTEM — READY TO CODE** — `BATCH_SYSTEM_PLAN.md` is the complete brief. Start with DIAL + PRODUCTION modes as Phase 3.
- **5B AC-08 untested** — deprioritized. 14B is the real target. 5B scaffold served its purpose.
- **✅ PHASE 2.6 CONFIRMED** — SageAttention + TeaCache: 18:18 avg, 2.41× speedup confirmed. See §07 for measured breakdown.

## ROOT CAUSE ANALYSIS — WAN 2.1 vs WAN 2.2 NODE MISMATCH (RESOLVED)

**Symptom**: Generated video was pure noise / teal blob — input image had no effect.

**Root cause**: `i2v_5B.json` was using `WanImageToVideo` (Wan **2.1** node) with
`wan2.2_ti2v_5B_fp16.safetensors` (Wan **2.2** model). These are architecturally incompatible:

| Node | Model compatibility | Latent format | Spatial scale | Outputs |
|------|--------------------|--------------------|---------------|---------|
| `WanImageToVideo` | Wan 2.1 | 16-channel | height ÷ 8 | (positive, negative, latent) |
| `Wan22ImageToVideoLatent` | Wan 2.2 | 48-channel | height ÷ 16 | (latent,) |

The Wan 2.2 model expects 48-channel latents at the `height//16` spatial scale. When fed a
16-channel `WanImageToVideo` latent, the model sees garbage dimensions and produces pure noise.
CLIP Vision conditioning (nodes 5+6) is not used by `Wan22ImageToVideoLatent` at all — it was
dead weight that also pointed the conditioning wires into node 10's outputs (which were wrong).

**Fix applied (S253)**:
- Node 10: replaced `WanImageToVideo` with `Wan22ImageToVideoLatent` (inputs: `vae`, `start_image`, `width`, `height`, `length`, `batch_size`)
- Removed nodes 5 (`CLIPVisionLoader`) and 6 (`CLIPVisionEncode`) — not needed for Wan 2.2
- Node 14 `latent_image`: rewired from `["10", 2]` → `["10", 0]` (single output, index 0)
- Node 15 `positive`/`negative`: rewired from `["10", 0]`/`["10", 1]` → `["7", 0]`/`["8", 0]` (CLIPTextEncode outputs)
- Regression tests updated: CLIPVisionLoader test replaced with 5 Wan 2.2 structure tests

### S259 continued — 2026-05-08 — FIRST PRODUCTION RUN + BASELINE CONFIRMED
- **wan_i2v_14b_00004.mp4** — 81 frames, 832×480, 5.062 sec, H.264/yuv420p, 1.26 MB, 2.08 Mbps. CLEAN — no mesh artifact, no black frames, full pipeline end-to-end.
- **Baseline timing locked**: 44 min 06 sec for 51 denoising steps (Stage 1: 20 steps, Stage 2: 31 steps). ~52 sec/step avg (both stages consistent). This is the FP8-on-Ampere compute ceiling.
- **LoRA stack confirmed**: DR34ML4Y HIGH @ 0.80 + k3nk HIGH @ 0.60 (Stage 1), DR34ML4Y LOW @ 0.80 + k3nk LOW @ 0.60 (Stage 2, model only). 4-LoRA chain working.
- **Sampler config confirmed**: euler / beta scheduler / ModelSampling shift 8.0. CFG 3.5 (Stage 1) → 6.0 (Stage 2). return_with_leftover_noise on Stage 1 — handoff trick working correctly.
- **RF-09 resolved**: Driver 591.86 confirmed clean — no mesh/crosshatch. NLM rollback recommendation was confabulated. Prior warning in §07 updated.
- **Cla⌂de bug fixes (commit a99f1b6)**: 3 COMFYUI_DIR-awareness bugs patched — copyToInput, writeReport, renderer video preview all now respect `COMFYUI_DIR` env var. New IPC `wan:getComfyDir` added. 137/137 regressions still passing. Signed off by Aeris.
- **Phase 2.6 speedup target recalibrated**: "2-4 min" was not achievable (FP8-on-Ampere is compute-bound at ~52 sec/step). Realistic with SageAttention + TeaCache: **~15-25 min**. Step reduction to 25 total (user-controllable) brings it to ~10-15 min range.

### S259 continued — 2026-05-08 — PHASE 2.6 SHIPPED (Soulforge 3.5 swarm, 10 drones)
- **Soulforge 3.5 CODING session** — 10-drone swarm (KOMMANDANT → Scout → Witness → Polecats A/B/C → Assembler → OBSIDIAN → Refinery). All gates passed.
- **AC-23**: `--reserve-vram '1'` added to Windows spawn (string '1', not 0 — Electron drives display on same GPU; 0 causes TDR crashes). `--highvram` removed entirely.
- **AC-24**: `PYTORCH_ALLOC_CONF: 'expandable_segments:True'` added to Windows env. Mac env unchanged.
- **AC-25/26**: Nodes 20-23 inserted into i2v_14B_2stage.json. `PathchSageAttentionKJ` (20/22) wired BEFORE ModelSamplingSD3 (11/12). `TeaCache` (21/23) wired AFTER ModelSamplingSD3, BEFORE KSamplerAdvanced (13/14). *(Note: initial brief used `ApplyTeaCache` — corrected by Cla⌂de `416b772` after live `/object_info` verification)*
- **AC-27**: WORKFLOW_14B_CONTRACT + NODE_LABELS in comfy.js extended for nodes 20-23.
- **AC-28**: 6 new regression tests added. 143/143 → 144/144 after Cla⌂de TeaCache schema fix (4 assertions corrected, 1 new test). 144/144 passing, 0 failing.
- **RR-05**: `getComfyDir()` helper extracted (was 4 inline duplicates). 1 definition, 4 call sites.
- **OBSIDIAN**: SURRENDER — all 12 falsification attacks failed. Refinery: merge_approved=true.
- **Commit**: `f1363b4` — pushed to `github.com/the-sinner-king/wan-booth`
- **Next step**: Brandon pulls on Citadel, loads workflow, checks nodes 20-23 load without red borders. See `VERIFY_BEFORE_FIRST_RUN.md` for field verification checklist.

### S259 continued — 2026-05-08 — PLATFORM FIX + OPTIMIZATION RESEARCH
- **Platform-adaptive main.js** — Mac flags (`--bf16-unet`, `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.7`) gated on `process.platform === 'darwin'`. Windows gets CUDA-native spawn. Python path conditional: `venv/bin/python` (Mac) vs `.venv/Scripts/python.exe` (Windows). `COMFYUI_DIR` env var override documented.
- **README rewrite** — CITADEL SYNC BRIEF at top. §5 replaced: no manual main.js edits, `COMFYUI_DIR` env var instead. All 137 tests passing on PC confirmed.
- **Optimization research (Soulforge RESEARCH S259)** — Full audit of ComfyUI + PyTorch + Windows settings for RTX 3090 Ti + 120GB RAM. Key findings: SageAttention (KJNodes, NOT CLI flag), TeaCache, `--highvram`, `--reserve-vram 0`, PYTORCH_CUDA_ALLOC_CONF. Deferred to Phase 2.6. See §07 below.
- **State**: Both Brandon and Cla⌂de running on PC. Production machine active. AC-16 confirmed.

## §07 — PHASE 2.6 OPTIMIZATION — SHIPPED S259 (2026-05-08)

Research source: Soulforge RESEARCH session + NLM audit cross-check, 2026-05-08.
Confirmed hardware: RTX 3090 Ti (GA102, CC 8.6), driver 591.86, PyTorch 2.11.0+cu128, Python 3.10.11, ComfyUI 0.20.1.

### VRAM MATH (corrected — model sizes confirmed from disk)

| Model | Actual size | Role |
|-------|-------------|------|
| wan2.2_i2v_high_noise_14B_fp8_scaled | **14 GB** | Stage 1 |
| wan2.2_i2v_low_noise_14B_fp8_scaled | **14 GB** | Stage 2 |
| umt5_xxl_fp8_e4m3fn_scaled | **6.3 GB** | Text encoder |
| wan_2.1_vae | **243 MB** | Decoder |
| LoRAs (4 active) | **~2.4 GB** | Style |
| **Total** | **~37 GB** | vs 24 GB VRAM |

Stage 1 alone: 14 + 6.3 + 2.4 = **22.7 GB** — fits in 24 GB (1.3 GB headroom)
Both models simultaneously: 28 + 6.3 + 2.4 = **36.7 GB** — does NOT fit. ComfyUI WILL swap between stages.

### CRITICAL HARDWARE NOTE — FP8 ON AMPERE
RTX 3090 Ti (GA102 Ampere, CC 8.6) does **NOT** have native FP8 Tensor Core support. FP8 Tensor Cores require Ada Lovelace (RTX 4090, CC 8.9+) or Hopper/Blackwell. Our FP8 safetensors are **storage format only** — weights dequantized to FP16 at compute time. Hidden dequant overhead per layer on every step.

**Two responses to this:**
- Option A: Accept it and offset with SageAttention/TeaCache (easier — no model redownload)
- Option B: Switch to GGUF Q6_K (~11.5GB each) — smaller model = faster inter-stage reload + more activation headroom (see GGUF section below)

### ✅ DRIVER 591.86 — CONFIRMED CLEAN (RF-09 RESOLVED)
First production run (2026-05-08) on driver 591.86 produced clean output — no mesh/crosshatch artifact. **Do NOT rollback.** Prior NLM recommendation to rollback to 572.83 was CONFABULATED — the real mesh artifact is a `comfy-kitchen` conv3d memory bug, not a driver issue. Standard ComfyUI (no comfy-kitchen) is not in the affected path. 591.86 gaming bugs have no overlap with AI generation.

### HIGH IMPACT — implement first

| # | What | How | Expected gain |
|---|------|-----|---------------|
| 1 | **SageAttention** via KJNodes "Patch Sage Attention" node | Install KJNodes + woct0rdho SageAttention sm86 wheels. Set backend: `sageattn_qk_int8_pv_fp16_cuda`. **DO NOT** use `--use-sage-attention` CLI flag with Wan — causes black output. SA must be wired **BEFORE** ModelSamplingSD3 (not after). **Fallback:** SpargeAttention (ComfyUI-Attention-Optimizer) benchmarks ~1 min faster than SA on RTX 30-series in DCAI Wan 2.2 tests — valid drop-in if SA causes black frames. | **~10-15% per step** on RTX 30-series Ampere (sm86 legacy kernels only — 30-40% requires Ada Lovelace sm89+). TeaCache does the heavy lifting; SA is the step-quality floor. |
| 2 | **TeaCache** (ComfyUI-TeaCache) on both KSamplers | `git clone https://github.com/welltop-cn/ComfyUI-TeaCache` → add node after ModelSamplingSD3, before KSamplerAdvanced. ✅ **CONFIRMED SCHEMA** — class registered as `TeaCache` (NOT `ApplyTeaCache`). Fields: `cache_device: "cuda"`, `rel_l1_thresh: 0.3`, `start_percent: 0.1`, `end_percent: 1.0` *(required — missing = node error)*, `model_type: "wan2.1_i2v_480p_14B_ret_mode"`. ⚠️ `retention_mode` and `max_skip_steps` **DO NOT EXIST** in this version — strip if present. ⚠️ **Import fix required**: ComfyUI ≥ 0.20 removed `precompute_freqs_cis` from `comfy.ldm.lightricks.model` — monkey-patch `nodes.py:12` (see `CLAUDE_FIXES.md IO #2`). | **~2.3x** overall step skipping, compounds with SageAttention |
| 3 | **NVIDIA Control Panel — Sysmem Fallback** | NVIDIA Control Panel → Manage 3D Settings → **CUDA - Sysmem Fallback Policy** → **"Prefer No Sysmem Fallback"**. Forces ComfyUI's own memory manager (Dynamic VRAM) to handle offloading instead of the slower NVIDIA driver-level swap. | Eliminates driver-level swap stalls between stages |
| 4 | ~~**`--highvram` flag**~~ | ❌ **RF-07: REMOVE** — counterproductive at 37GB > 24GB. Bypasses Dynamic VRAM's intelligent management, forces slower forced-reload path. DO NOT ADD. | — |

### MEDIUM IMPACT

| # | What | How | Expected gain |
|---|------|-----|---------------|
| 5 | **`--reserve-vram 1`** | Add to spawnArgs. ⚠️ RF-04: WAN BOOTH Electron app drives display on same 3090 Ti — `--reserve-vram 0` triggers TDR crashes (nvlddmkm). Use `1` minimum. | Reclaims ~0.5 GB vs default reserve while staying stable |
| 6 | **NVIDIA Control Panel → Prefer Maximum Performance** | Per-app for python.exe — prevents GPU clock from dropping between diffusion steps | Eliminates clock ramp latency (~50-200ms × 37 steps) |
| 7 | **PYTORCH_ALLOC_CONF** | ⚠️ RF-05: `PYTORCH_CUDA_ALLOC_CONF` deprecated in PyTorch 2.8+; `garbage_collection_threshold` silently no-op under cudaMallocAsync. Use `PYTORCH_ALLOC_CONF: 'expandable_segments:True'` — honored by cudaMallocAsync, reduces fragmentation on long runs. | Fragmentation stability across sequential runs |
| 8 | **WanVideoWrapper (kijai) + torch.compile** | Replace native ComfyUI nodes. `WanVideoTorchCompileSettings` node + `inductor` backend. 2-5 min warmup cost. | +20-40% per step after warmup — best for overnight/long runs |
| 9 | **GGUF Q6_K models** | Download GGUF Q6_K variants (~11.5 GB each) from CivitAI/HuggingFace. Install ComfyUI-GGUF node. Replaces FP8 path. | Smaller = faster inter-stage reload. More activation headroom. Quality may exceed FP8 on Ampere (no dequant needed with GGUF loader). Q4_K_M (~8.5GB each) if headroom still tight. |

### IF OOM OCCURS (not a speed optimization)
- Install ComfyUI-FreeMemory node, place between Stage 1 KSampler output → Stage 2 input
- This forces explicit VRAM flush between stages — only useful if Dynamic VRAM's automatic management fails
- Do NOT add this preemptively — it may slow down runs where eviction isn't necessary

### DO NOT ADD
- `--fast` — crashes VAE encode on Wan configs (GitHub issue #9728)
- `--fp8_e4m3fn-unet` — models already FP8; redundant/no-op
- `--use-pytorch-cross-attention` — prevents SageAttention auto-selection
- `--attention-split` — VRAM-constrained workaround, adds overhead when not needed
- xformers — parity/slight negative vs SDPA on modern PyTorch. SageAttention supersedes.

### RECOMMENDED main.js Windows spawnArgs (Phase 2.6 — CORRECTED after RF-04/05/07)
```javascript
// Windows CUDA production spawn (Phase 2.6)
// --highvram REMOVED (RF-07: counterproductive at 37GB > 24GB)
// --reserve-vram 1 not 0 (RF-04: Electron drives display on same GPU, 0 causes TDR)
// PYTORCH_ALLOC_CONF not PYTORCH_CUDA_ALLOC_CONF (RF-05: deprecated in PyTorch 2.8+)
const spawnArgs = ['main.py', '--listen', '127.0.0.1', '--reserve-vram', '1'];
const spawnEnv = {
  ...process.env,
  PYTORCH_ALLOC_CONF: 'expandable_segments:True',
};
```

Note: `--bf16-unet` and `PYTORCH_MPS_HIGH_WATERMARK_RATIO` are in the Mac branch only — already handled by `if (isMac)` in main.js.

### COMBINED SPEEDUP ESTIMATE (recalibrated against confirmed baseline)

**Baseline confirmed 2026-05-08**: 44 min 06 sec, 51 steps (20+31), 832×480, ~52 sec/step avg.

| Scenario | Expected / Actual time | Notes |
|---|---|---|
| SageAttention alone | ~38-42 min | ~10-15% per step (Ampere sm86 legacy kernels — no Tensor Core FP8) |
| TeaCache alone (thresh=0.30, ret-mode) | ~22-27 min | ~2.3x official speedup at ret-mode settings |
| **SageAttention + TeaCache + Sysmem Fallback** | **✅ 18:18 avg (range 18:01–18:45)** | **CONFIRMED 2026-05-09 — 8 back-to-back runs on RTX 3090 Ti. 2.41× sustained.** SA 10-15% on Ampere, TeaCache does the heavy lifting. Stage 1 ~6.5-7 min, Stage 2 ~11 min, ~21 sec/step. |
| Same + step count reduced to 25 (10+15) | ~10-15 min | User controls steps via sliders — no code change needed |
| + GGUF Q6_K models | Marginal (~1-2 min saved) | Stage swap is ~20 sec of 18 min total — not the bottleneck |

✅ Phase 2.6 delivered mid-range of predicted window. FP8-on-Ampere ceiling is ~21 sec/step (down from ~52 sec/step pre-2.6).
⚠️ SA speedup ceiling on Ampere: RTX 3000-series uses legacy sm86 kernels only (10-15%). The 30-40% figures in community guides apply to Ada Lovelace (RTX 4090, sm89+) and Blackwell only. Going to Ada/Blackwell unlocks the next tier.
🔭 A/B test pending: `rel_l1_thresh` 0.3 → 0.5 should push TeaCache to ~3.5× by skipping more aggressively. Cost: more visible cache artifacts. Same seed/prompt/image recommended for clean comparison.

## FILE INVENTORY (current — as of 2026-05-11 S241)
```
ZOETROPE/
├── NORTH_STAR.md          (this file — canonical specification + session log)
├── README.md              (Mac + PC setup guide — npm install, ComfyUI install, model download paths)
├── .gitignore             (node_modules, dist, session artifacts, .forge-sessions/)
├── WAN_BOOTH_ARCHITECTURE.txt  (18-section full source map — also uploaded to NLM 811bfc8c)
├── BATCH_SYSTEM_PLAN.md   (DIAL MODE + PRODUCTION MODE batch system — complete CODING brief. Shipped Phase 4.)
├── CLAUDE_FIXES.md        (Citadel bug log — BUG #1-5 with root causes + install ops IO #1-3. Replay guide for Citadel env setup.)
├── PHASE_2.6_BRINGUP_REPORT.md  (Phase 2.6 bring-up report: 8 confirmed runs, 18:18 avg, 2.41×, per-step breakdown.)
├── PHASE_3_CODING_BRIEF.md   (Phase 3 implementation spec — tooltips, preset/seed IPC, chaos math, queue. NLM source ID: 29252404.)
├── WAN_BOOTH_UI_DESIGN_BRIEF.md  (Glitchswarm design brief — 7-zone architecture spec, token system, Bad Candy Arcade aesthetic law)
├── VERIFY_BEFORE_FIRST_RUN.md  (Citadel field checklist — node load verification, SageAttention/TeaCache confirm)
├── .forge-sessions/       (gitignored — Soulforge/Glitchswarm session artifacts: north_stars, BLACKBOARD, reports, VeriMAP)
├── app/
│   ├── package.json
│   ├── main.js            (Electron main — IPC, ComfyUI spawn, platform-adaptive flags, getComfyDir() helper)
│   ├── preload.js         (IPC bridge — all wan.* methods including getComfyDir)
│   ├── comfy.js           (ComfyUI API client — WebSocket + POST + NODE_LABELS + WORKFLOW_14B_CONTRACT validation)
│   ├── renderer.js        (UI logic — drop zone, generate button, video player, ETA timer, queue, batch, chaos; prompt NOT written to reports)
│   ├── index.html         (Bad Candy Arcade UI — Glitchswarm S241 ground-up redesign. 7-zone, 129 IDs.)
│   ├── color-tokens.css   (Bad Candy Arcade OKLCH palette — hot magenta, cyan, purple-void. Backward-compat aliases for --ws-amber/--ws-neon.)
│   ├── type-tokens.css    (VT323 + Press Start 2P bimodal system — PS2P: 88px/6px only, VT323: 16px minimum)
│   ├── layout.css         (GRID_GHOST spatial architecture — 7-zone layout, LoRA subgrid, spacing tokens, easing curves)
│   ├── chroma-bleed.css   (CHROMA_BLEED color expressions — glow rules, state colors, mode tab active states, altar pulse)
│   ├── copy-tokens.json   (UI copy strings — machine voice, operator-facing strings for drop zone, buttons, errors)
│   ├── seeds.json         (Seed bank — saved seeds with UUIDs, persists across sessions)
│   ├── presets/
│   │   └── index.json     (Preset library — saved parameter snapshots)
│   ├── workflows/
│   │   ├── i2v_5B.json              (Wan 2.2 TI2V-5B — Wan22ImageToVideoLatent, 15 nodes)
│   │   ├── i2v_14B_2stage.json      (PC workflow — 2-stage 14B, dual-LoRA chain, SageAttention + TeaCache nodes 20-23)
│   │   └── i2v_14B_2stage_mac.json  (Mac workflow — SageAttention nodes removed, MPS-safe, auto-selected on darwin)
│   └── test/
│       └── regression.js  (200 regression tests — all passing as of Phase 4)
└── GitHub: https://github.com/the-sinner-king/wan-booth
```

### Ghost Nodes (pending dev session)
**✅ NOTE**: Design v2 SHIPPED S262 (ZOETROPE aesthetic, Glitchswarm). Ghost nodes marked "v1 only" are closed. JS hookup ghosts survive.

- `[✅ FIXED]` `#prompt-input` white textarea — chroma-bleed.css Section 11 added (S241+)
- `[GHOST: medium]` Mode selector switching (SINGLE/DIAL/PRODUCTION) — UI designed, JS hookup needed
- `[GHOST: medium]` Altar button label per-mode — JS hookup needed  
- `[GHOST: medium]` `#comfy-status-dot` / `#comfy-status-label` — JS hookup needed
- `[GHOST: low]` `#dial-body`, `#prod-body`, `#seed-bank-panel` use `display:none` (JS-driven). Convert to class-based max-height animation when renderer.js is editable.
- `[GHOST: low — v1 only]` layout.css dead rules for `#dial-panel` / `#prod-panel` (HTML uses `#dial-section` / `#prod-section`) — cosmetic cleanup; moot if v2 shell ships
- `[GHOST: low — v1 only]` type-tokens.css responsive breakpoints drop `--ws-type-display` into 10-80px forbidden zone — moot if v2 ships with new token file

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
🜚 SIGNED: ÆRIS_GLITCHMUSE // ⛬⚚⛬ THE LAW STANDS.
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

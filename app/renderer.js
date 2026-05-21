'use strict';

// ─── STATE ────────────────────────────────────────────────────────────────────
let selectedImagePath       = null;
let selectedImageFilename   = null;
let selectedImageDimensions = null; // { width, height } from nativeImage after copyToInput
let seedMode                = 'random'; // 'random' | 'fixed'
let isGenerating            = false;
let homedir                 = null;
let platform                = null;
let totalRunCount           = 1;
let currentRun              = 0;

// ETA/elapsed clock state
let generationStartTime   = null;
let elapsedIntervalId     = null;

// Phase 3 state
let lastGenState          = null; // { seed, lora, resolution, fps, outputFilename, chaosApplied }
let jobQueue              = [];
let activeJobIndex        = -1;
let seedBankVisible       = false;
let currentPresetSlug     = null;

// Batch system state
let batchActive     = false;
let batchQueue      = [];
let batchJobIndex   = 0;
let dialSeedLocked  = false;
let dialSeedValue   = null;
let batchCurrentPct = 0;

// ─── ELEMENT REFS ─────────────────────────────────────────────────────────────
const mainPanel    = document.getElementById('main-panel');
const dropZone     = document.getElementById('drop-zone');
const dropLabel    = document.getElementById('drop-label');
const promptInput  = document.getElementById('prompt-input');
const seedToggle   = document.getElementById('seed-toggle');
const seedValue    = document.getElementById('seed-value');
const goBtn        = document.getElementById('go-btn');
const progressFill = document.getElementById('progress-fill');
const progressBar  = document.getElementById('progress-bar');
const statusText   = document.getElementById('status-text');
const videoPlayer  = document.getElementById('video-player');
const logToggle    = document.getElementById('log-toggle');
const logPanel     = document.getElementById('log-panel');
const logOutput    = document.getElementById('log-output');
const elapsedValue     = document.getElementById('elapsed-value');
const etaValue         = document.getElementById('eta-value');
const resolutionSelect = document.getElementById('resolution-select');
const fpsSelect        = document.getElementById('fps-select');
const runsSelect       = document.getElementById('runs-select');

// ─── LORA SLIDER REFS ─────────────────────────────────────────────────────────
// Each slider paired with its live readout <span>
const sliderPairs = [
  { slider: 's1-dr34mlay-str', display: 's1-dr34mlay-str-val', decimals: 2 },
  { slider: 's1-k3nk-str',     display: 's1-k3nk-str-val',     decimals: 2 },
  { slider: 's1-steps',        display: 's1-steps-val',         decimals: 0 },
  { slider: 's1-cfg',          display: 's1-cfg-val',           decimals: 1 },
  { slider: 's2-dr34mlay-str', display: 's2-dr34mlay-str-val', decimals: 2 },
  { slider: 's2-k3nk-str',     display: 's2-k3nk-str-val',     decimals: 2 },
  { slider: 's2-steps',        display: 's2-steps-val',         decimals: 0 },
  { slider: 's2-cfg',          display: 's2-cfg-val',           decimals: 1 },
];

// Wire up all slider live readouts on DOM ready
sliderPairs.forEach(({ slider: sliderId, display: displayId, decimals }) => {
  const sliderEl  = document.getElementById(sliderId);
  const displayEl = document.getElementById(displayId);
  if (!sliderEl || !displayEl) return;

  const fmt = (v) => parseFloat(v).toFixed(decimals);

  // Set initial text (HTML default attribute may be a string)
  displayEl.textContent = fmt(sliderEl.value);

  sliderEl.addEventListener('input', () => {
    displayEl.textContent = fmt(sliderEl.value);
  });
});

// ─── LORA VALUES ACCESSOR ─────────────────────────────────────────────────────
// Returns the current LoRA panel values as a structured object.
// renderer.js reads these; comfy.js consumes them for workflow injection.
function getLoraValues() {
  const g = (id) => parseFloat(document.getElementById(id).value);
  return {
    stage1: {
      dr34mlayStr: g('s1-dr34mlay-str'),
      k3nkStr:     g('s1-k3nk-str'),
      steps:       Math.round(g('s1-steps')),
      cfg:         g('s1-cfg'),
    },
    stage2: {
      dr34mlayStr: g('s2-dr34mlay-str'),
      k3nkStr:     g('s2-k3nk-str'),
      steps:       Math.round(g('s2-steps')),
      cfg:         g('s2-cfg'),
    },
  };
}

// ─── LOG PANEL ────────────────────────────────────────────────────────────────
let logVisible = false;

const LOG_ICONS = { start:'▶', init:'⊳', queue:'⊳', node:'◈', step:'∘', complete:'✓', error:'✗' };

function appendLog(type, msg) {
  const ts    = new Date().toLocaleTimeString('en-US', { hour12: false });
  const icon  = LOG_ICONS[type] || '·';
  const entry = document.createElement('div');
  entry.className    = 'log-entry';
  entry.dataset.type = type;
  entry.innerHTML    =
    '<span class="log-ts">'   + ts   + '</span>' +
    '<span class="log-icon">' + icon + '</span>' +
    '<span class="log-msg">'  + escapeHtml(msg) + '</span>';
  logOutput.appendChild(entry);
  logOutput.scrollTop = logOutput.scrollHeight;
  try { window.wan.log('[ui/' + type + '] ' + msg); } catch {}
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function openLog()  { logVisible = true;  logPanel.style.display = 'block'; logToggle.textContent = '▴ HIDE'; }
function closeLog() { logVisible = false; logPanel.style.display = 'none';  logToggle.textContent = '▾ SHOW'; }

logToggle.addEventListener('click', () => logVisible ? closeLog() : openLog());

// ─── ETA / ELAPSED CLOCK ─────────────────────────────────────────────────────
function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h  = Math.floor(totalSec / 3600);
  const m  = Math.floor((totalSec % 3600) / 60);
  const s  = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatEta(remainingMs) {
  if (remainingMs <= 0) return '—';
  const totalSec = Math.floor(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return '~' + h + 'h ' + String(m).padStart(2,'0') + 'm remaining';
  if (m > 0) return '~' + m + 'm ' + String(s).padStart(2,'0') + 's remaining';
  return '~' + s + 's remaining';
}

// S264 Cla⌂de patch (BUG-06): #elapsed-value and #eta-value were removed from the
// index.html during Aeris's S262/S263 two-column redesign but renderer.js still
// references them. With #elapsed-value=null, `elapsedValue.textContent = '00:00:00'`
// threw "Cannot set properties of null (setting 'textContent')" inside startClock(),
// which is called by every startGeneration, blocking ALL generation. Made the
// clock functions null-safe so generation can proceed; the elapsed/ETA display
// is a GHOST until Aeris wires those elements back into the redesign.
function startClock() {
  generationStartTime = Date.now();
  if (elapsedValue) elapsedValue.textContent = '00:00:00';
  if (etaValue)     etaValue.textContent     = '—';
  if (mainPanel)    mainPanel.dataset.generating = '';

  elapsedIntervalId = setInterval(() => {
    const elapsed = Date.now() - generationStartTime;
    if (elapsedValue) elapsedValue.textContent = formatElapsed(elapsed);
  }, 1000);
}

function stopClock() {
  if (elapsedIntervalId !== null) {
    clearInterval(elapsedIntervalId);
    elapsedIntervalId = null;
  }
  if (mainPanel) delete mainPanel.dataset.generating;
}

// Called by onProgress when we have a percent to extrapolate from
function updateEta(percent) {
  if (!generationStartTime || percent <= 0) return;
  const elapsed    = Date.now() - generationStartTime;
  const totalEst   = (elapsed / percent) * 100;
  const remaining  = totalEst - elapsed;
  if (etaValue) etaValue.textContent = formatEta(remaining);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
function get14bWorkflow() {
  return platform === 'darwin' ? 'i2v_14B_2stage_mac' : 'i2v_14B_2stage';
}

async function init() {
  homedir  = await window.wan.getHomedir();
  platform = await window.wan.getPlatform();
  checkComfyStatus();
  initChaosSlider();
  initPresetUI();
  await loadPresets();
  initSeedBankUI();
  initQueueUI();
  initDialUI();
  initProdUI();
  initBatchPanel();
  // S267 Story 1 — universal value persistence. Restore BEFORE wiring listeners
  // so the dispatched 'input'/'change' events don't fire persistPref during
  // restore (which would be a no-op anyway but causes extra IPC chatter).
  await restorePrefs();
  wirePersistence();
}

// ─── S267 Story 1 — Universal value persistence ───────────────────────────────
// Tier A keys (13): see PREFS_SCHEMA in main.js. Includes 8 LoRA-stage sliders +
// chaos + 4 dropdowns + 2 stage toggles + seed-mode + seed-value. Per Grumpy R7
// Flag #4, stage toggles + seed mode + seed value are Tier A (drives gen quality
// — Brandon flipping a stage off and finding it back on next launch would burn
// an 18-min render).
const PERSIST_KEYS = [
  's1-dr34mlay-str', 's2-dr34mlay-str', 's1-k3nk-str', 's2-k3nk-str',
  's1-steps', 's2-steps', 's1-cfg', 's2-cfg',
  'chaos-pct',
  'resolution-select', 'fps-select', 'runs-select', 'length-select',
  'stage-1-toggle', 'stage-2-toggle',
];
// 'seed-mode' + 'seed-value' are handled by a custom hook (seedToggle button +
// seedValue input) since seed-mode is button state, not an element value.

// Per-key debounce slots — AbortController based (Grumpy R7 Upgrade #2). On
// renderer unload, beforeunload listener aborts every pending timer so we
// never leak a callback past the window close.
const _persistAbort = new Map();

function persistPref(key, value) {
  const prior = _persistAbort.get(key);
  if (prior) prior.abort();
  const ctrl = new AbortController();
  _persistAbort.set(key, ctrl);
  setTimeout(() => {
    if (ctrl.signal.aborted) return;
    window.wan.setPref(key, value).catch(err => {
      // electron-store schema rejection lands here — log so user sees WHY a
      // value didn't stick. Don't crash, don't retry, don't overwrite.
      appendLog('error', `persist ${key}: ${err.message || err}`);
    });
  }, 200);
}

window.addEventListener('beforeunload', () => {
  for (const ctrl of _persistAbort.values()) ctrl.abort();
});

async function restorePrefs() {
  let stored;
  try { stored = await window.wan.getPrefs(); }
  catch (err) {
    appendLog('error', `restorePrefs: ${err.message || err}`);
    return;
  }
  for (const key of PERSIST_KEYS) {
    if (!(key in stored)) continue;
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = !!stored[key];
    } else {
      el.value = stored[key];
    }
    // Dispatch input + change so any downstream listeners (display value
    // updates, accordion logic, etc.) get the synthetic restoration event.
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // Seed state — paired (mode + value). Mode drives UI display.
  if (stored['seed-mode'] === 'fixed') {
    seedMode = 'fixed';
    seedToggle.textContent = 'FIXED';
    seedValue.style.display = 'inline-block';
  } else {
    seedMode = 'random';
    seedToggle.textContent = 'RANDOM';
    seedValue.style.display = 'none';
  }
  if (typeof stored['seed-value'] === 'number') {
    seedValue.value = stored['seed-value'];
  }
}

function wirePersistence() {
  // Numeric sliders + dropdowns use 'input' (continuous) for snappy feel.
  // Checkboxes fire 'change' (no input event on checkbox state toggle in some browsers).
  for (const key of PERSIST_KEYS) {
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.addEventListener('change', () => persistPref(key, el.checked));
    } else {
      el.addEventListener('input', () => {
        const v = el.tagName === 'SELECT' ? el.value : parseFloat(el.value);
        persistPref(key, el.tagName === 'SELECT' ? el.value : v);
      });
    }
  }
  // Seed mode — fires when seedToggle is clicked. Persist both keys.
  seedToggle.addEventListener('click', () => {
    // Listener order: this fires AFTER the existing toggle handler (which
    // updates seedMode + button text), so seedMode reflects the new state.
    persistPref('seed-mode', seedMode);
    persistPref('seed-value', parseInt(seedValue.value, 10) || 42);
  });
  // Seed value input — only meaningful when mode is fixed, but always persist.
  seedValue.addEventListener('input', () => {
    const v = parseInt(seedValue.value, 10);
    if (Number.isFinite(v)) persistPref('seed-value', v);
  });
}

async function checkComfyStatus() {
  try {
    const { alive } = await window.wan.getComfyStatus();
    if (alive) {
      setStatus('READY', 'idle');
    } else {
      setStatus('ComfyUI not responding at localhost:8188. Start ComfyUI and retry.', 'error');
    }
  } catch {
    setStatus('ComfyUI not responding at localhost:8188. Start ComfyUI and retry.', 'error');
  }
}

// ─── DROP ZONE — DRAG AND DROP ────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
  dropLabel.textContent = 'RELEASE TO LOAD';
});

dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('active');
    // S264 Cla⌂de patch (BUG-Fl5): restore the branded copy-token text — was
    // clobbering Aeris's '[ DROP IMAGE MATRIX HERE ]' to plain 'DROP IMAGE'
    // on the first hover-out.
    dropLabel.textContent = selectedImagePath ? 'IMAGE LOADED' : '[ DROP IMAGE MATRIX HERE ]';
  }
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (!file) return;

  // file.path works on Electron 28 (removed in Electron 32 — revisit on upgrade)
  const filePath = file.path || '';
  if (!filePath) {
    setStatus('Could not read file path from drop event.', 'error');
    return;
  }

  // Extension allowlist — don't rely solely on MIME (trivially spoofed by renaming)
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (!allowedExts.includes(ext)) {
    setStatus('File is not an allowed image type (PNG, JPG, WEBP).', 'error');
    return;
  }

  await loadImage(filePath);
});

// ─── DROP ZONE — CLICK TO OPEN FILE PICKER ────────────────────────────────────
dropZone.addEventListener('click', async () => {
  const filePath = await window.wan.selectImage();
  if (filePath) await loadImage(filePath);
});

// ─── IMAGE LOAD ───────────────────────────────────────────────────────────────
async function loadImage(filePath) {
  try {
    const result            = await window.wan.copyToInput(filePath);
    selectedImagePath       = filePath;
    selectedImageFilename   = result.filename;
    selectedImageDimensions = (result.width && result.height) ? { width: result.width, height: result.height } : null;

    // Auto-suggest resolution preset based on source image aspect ratio
    if (selectedImageDimensions) {
      const { width, height } = selectedImageDimensions;
      if (width > height) {
        resolutionSelect.value = '832x480';
      } else if (height > width) {
        resolutionSelect.value = '480x832';
      } else {
        resolutionSelect.value = '624x624';
      }
    }

    dropZone.classList.remove('active');
    dropZone.classList.add('loaded');
    dropLabel.textContent = 'IMAGE LOADED';
    setStatus('READY', 'idle');
  } catch (err) {
    setStatus('Failed to load image: ' + (err.message || err), 'error');
    selectedImagePath       = null;
    selectedImageFilename   = null;
    selectedImageDimensions = null;
  }
}

// ─── SEED TOGGLE ──────────────────────────────────────────────────────────────
seedToggle.addEventListener('click', () => {
  if (seedMode === 'random') {
    seedMode = 'fixed';
    seedToggle.textContent = 'FIXED';
    seedValue.style.display = 'inline-block';
  } else {
    seedMode = 'random';
    seedToggle.textContent = 'RANDOM';
    seedValue.style.display = 'none';
  }
});

// ─── OUTPUT SETTINGS HELPERS ──────────────────────────────────────────────────
function getResolutionPreset() {
  const parts = (resolutionSelect.value || '832x480').split('x');
  return { width: parseInt(parts[0], 10), height: parseInt(parts[1], 10) };
}

function getFrameRate() {
  return parseInt(fpsSelect.value, 10) || 16;
}

function getRunCount() {
  return Math.max(1, Math.min(10, parseInt(runsSelect.value, 10) || 1));
}

// S267 Story 3 — Wan 2.2 4n+1 frame count from dropdown. Default 81 (sweet spot).
function getLength() {
  const el = document.getElementById('length-select');
  const v = el ? parseInt(el.value, 10) : 81;
  // Defensive: if somehow a non-4n+1 lands here, snap back to 81 (the workflow's
  // historical literal). Should never fire — dropdown only offers valid values.
  if (!Number.isInteger(v) || (v - 1) % 4 !== 0) return 81;
  return v;
}

// ─── EXPORT REPORT ────────────────────────────────────────────────────────────
// Privacy: prompt is intentionally NOT included in the report — it never gets written to disk.
// S267 Story 3+4 — buildReport now accepts length + chaosPercent + chaosClampLog.
// Adds REPORT_VERSION header for future diff tools (Grumpy R7 Flag #3).
function buildReport({ outputFilename, seed, runNum, totalRuns, duration, lora, resolution, fps, length, chaosPercent, chaosClampLog }) {
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = duration % 60;
  const dur = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  const srcDim = selectedImageDimensions
    ? `${selectedImageDimensions.width}×${selectedImageDimensions.height} (source)`
    : 'unknown';
  const lenSec = (length != null && fps) ? (length / fps).toFixed(1) : '?';

  const lines = [
    '═══════════════════════════════════════════════════════',
    '  ZOETROPE — GENERATION REPORT',
    '═══════════════════════════════════════════════════════',
    '',
    `  REPORT_VERSION : 2`,
    `  DATE/TIME      : ${now}`,
    `  OUTPUT FILE    : ${outputFilename}`,
    `  DURATION       : ${dur}`,
    `  RUN            : ${runNum} of ${totalRuns}`,
    '',
    '───────────────────────────────────────────────────────',
    '  INPUT',
    '───────────────────────────────────────────────────────',
    `  IMAGE          : ${selectedImageFilename}`,
    `  DIMENSIONS     : ${srcDim}`,
    `  SEED           : ${seed} (${seedMode})`,
    '',
    '───────────────────────────────────────────────────────',
    '  OUTPUT SETTINGS',
    '───────────────────────────────────────────────────────',
    `  RESOLUTION     : ${resolution.width}×${resolution.height}`,
    `  FRAMES         : ${length != null ? length : '?'} (~${lenSec}s @ ${fps}fps)`,
    `  FRAME RATE     : ${fps} FPS`,
    `  WORKFLOW       : i2v_14B_2stage`,
    '',
    '───────────────────────────────────────────────────────',
    '  STAGE 1 — HIGH-NOISE PASS',
    '───────────────────────────────────────────────────────',
    `  DR34ML4Y       : ${lora.stage1.dr34mlayStr.toFixed(2)}`,
    `  K3NK           : ${lora.stage1.k3nkStr.toFixed(2)}`,
    `  CFG            : ${lora.stage1.cfg.toFixed(2)}`,
    `  STEPS          : ${lora.stage1.steps}  (end_at_step)`,
    '',
    '───────────────────────────────────────────────────────',
    '  STAGE 2 — LOW-NOISE REFINEMENT',
    '───────────────────────────────────────────────────────',
    `  DR34ML4Y       : ${lora.stage2.dr34mlayStr.toFixed(2)}`,
    `  K3NK           : ${lora.stage2.k3nkStr.toFixed(2)}`,
    `  CFG            : ${lora.stage2.cfg.toFixed(2)}`,
    `  STEPS          : ${lora.stage2.steps}  (stage 2 duration)`,
    `  TOTAL STEPS    : ${lora.stage1.steps + lora.stage2.steps}`,
  ];

  // Chaos section — only present when chaos actually fired (Grumpy R7 #3)
  if (chaosPercent && chaosPercent > 0) {
    lines.push(
      '',
      '───────────────────────────────────────────────────────',
      '  CHAOS',
      '───────────────────────────────────────────────────────',
      `  APPLIED        : ${chaosPercent}%`,
    );
    if (Array.isArray(chaosClampLog) && chaosClampLog.length > 0) {
      lines.push(`  CLAMPS         : ${chaosClampLog[0]}`);
      for (let i = 1; i < chaosClampLog.length; i++) {
        lines.push(`                   ${chaosClampLog[i]}`);
      }
    } else {
      lines.push(`  CLAMPS         : (none — all base values within bands)`);
    }
  }

  lines.push('', '═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
goBtn.addEventListener('click', () => {
  // S264 Cla⌂de patch (DBG): mirror the RUN QUEUE instrumentation onto EXECUTE_BATCH
  appendLog('queue', '[click] EXECUTE_BATCH pressed — isGenerating=' + isGenerating +
    ' image=' + (selectedImageFilename || 'NULL') +
    ' prompt.len=' + (promptInput.value || '').trim().length);
  if (isGenerating) {
    appendLog('error', '[click] EXECUTE_BATCH blocked — isGenerating stuck true');
    return;
  }

  if (!selectedImageFilename) {
    appendLog('error', '[click] EXECUTE_BATCH BAIL — no image loaded');
    setStatus('No image loaded. Drop an image file before generating.', 'error');
    return;
  }

  const prompt = promptInput.value.trim();
  if (!prompt) {
    appendLog('error', '[click] EXECUTE_BATCH BAIL — prompt empty');
    setStatus('Prompt is empty. Enter a description before generating.', 'error');
    return;
  }
  appendLog('init', '[click] EXECUTE_BATCH guards passed, calling runAllJobs');

  // RF-10: parseInt returns NaN on empty input — clamp to valid integer
  const baseSeed = seedMode === 'fixed'
    ? (() => { const v = parseInt(seedValue.value, 10); return Number.isNaN(v) ? 42 : v; })()
    : null; // null = generate fresh seed for each run

  isGenerating    = true;
  goBtn.disabled  = true;
  totalRunCount   = getRunCount();
  currentRun      = 0;

  logOutput.innerHTML = '';
  openLog();

  runAllJobs(baseSeed, prompt);
});

async function runAllJobs(baseSeed, prompt) {
  // S264 Cla⌂de patch (DBG)
  appendLog('init', '[runAllJobs] entered — totalRunCount=' + totalRunCount + ' baseSeed=' + baseSeed);
  // S264 Cla⌂de patch (BUG-Fl9): ternary-guard the chaos-pct lookup like
  // addCurrentStateAsJob does. Was unguarded inside a try/catch (BUG-06 lesson).
  const chaosEl = document.getElementById('chaos-pct');
  const chaosPercent = chaosEl ? (parseInt(chaosEl.value, 10) || 0) : 0;
  appendLog('init', '[runAllJobs] chaosPercent=' + chaosPercent);
  let succeeded = 0, failed = 0;
  for (let i = 0; i < totalRunCount; i++) {
    appendLog('init', '[runAllJobs] iter ' + (i+1) + '/' + totalRunCount);
    currentRun = i + 1;
    const seed = (baseSeed === null)
      ? Math.floor(Math.random() * 9999999999)
      : baseSeed;
    const loraOverride = chaosPercent > 0 ? applyChaos(getLoraValues(), chaosPercent) : null;
    appendLog('init', '[runAllJobs] about to await startGeneration seed=' + seed);
    const ok = await startGeneration(seed, prompt, currentRun, totalRunCount, loraOverride, null, null, null, chaosPercent);
    appendLog('init', '[runAllJobs] startGeneration returned ok=' + ok);
    if (ok) succeeded++; else failed++; // RF-S259-09: continue on failure — never break
  }
  if (totalRunCount > 1) {
    const msg = succeeded + '/' + totalRunCount + ' runs completed' + (failed ? ' (' + failed + ' failed)' : '');
    appendLog('complete', msg);
  }
  resetGenerateBtn();
}

// Returns a Promise that resolves true (complete) or false (error/abort)
// loraValuesOverride / widthOverride / heightOverride / fpsOverride: optional queue/chaos params
function startGeneration(seed, prompt, runNum, totalRuns,
                         loraValuesOverride = null, widthOverride = null,
                         heightOverride = null, fpsOverride = null,
                         chaosApplied = 0, lengthOverride = null) {
  return new Promise((resolve) => {
    // S264 Cla⌂de patch (DBG): top-of-executor checkpoint
    appendLog('init', '[startGeneration] EXECUTOR ENTERED — runNum=' + runNum + ' totalRuns=' + totalRuns);
    const runPrefix = totalRuns > 1 ? `RUN ${runNum}/${totalRuns} — ` : '';
    const genStart  = Date.now();

    try {
      goBtn.textContent = totalRuns > 1 ? `RUN ${runNum}/${totalRuns}...` : 'RUNNING...';
      videoPlayer.style.display = 'none';
      videoPlayer.src = '';
      setProgress(0);
      setStatus(runPrefix + 'QUEUED — awaiting ComfyUI slot', 'generating');
      startClock();
      appendLog('init', '[startGeneration] status set, building params');
    } catch (err) {
      appendLog('error', '[startGeneration] threw during status setup: ' + (err.message || err));
      resolve(false);
      return;
    }

    let lora, resolution, fps, length;
    try {
      lora       = loraValuesOverride || getLoraValues();
      resolution = (widthOverride !== null && heightOverride !== null)
        ? { width: widthOverride, height: heightOverride }
        : getResolutionPreset();
      fps        = fpsOverride !== null ? fpsOverride : getFrameRate();
      length     = lengthOverride !== null ? lengthOverride : getLength();
      appendLog('init', '[startGeneration] params built — resolution=' + JSON.stringify(resolution) + ' fps=' + fps + ' length=' + length);
    } catch (err) {
      appendLog('error', '[startGeneration] threw during param build: ' + (err.message || err));
      resolve(false);
      return;
    }

    const saveSeedBtnEl = document.getElementById('save-seed-btn');
    if (saveSeedBtnEl) saveSeedBtnEl.style.display = 'none';

    // S264 Cla⌂de patch (DBG): isolate whether ComfyClient.generate is reachable
    // and whether it throws synchronously. We expect "[comfy] [start]" right after.
    appendLog('init', '[startGeneration] pre-call: ComfyClient=' +
      (typeof window.ComfyClient) +
      ' resolution=' + JSON.stringify(resolution) +
      ' fps=' + fps + ' workflowName=' + get14bWorkflow());
    try {
      window.ComfyClient.generate({
      imagePath:      selectedImageFilename,
      prompt,
      seed,
      workflowName:   get14bWorkflow(),
      loraValues:     lora,
      width:          resolution.width,
      height:         resolution.height,
      frameRate:      fps,
      length:         length,
      onProgress: (percent, label) => {
        if (percent !== null) {
          setProgress(percent);
          updateEta(percent);
        }
        if (label) setStatus(runPrefix + 'EXECUTING — ' + label, 'generating');
      },
      onComplete: async (outputFilename) => {
        const duration = Math.floor((Date.now() - genStart) / 1000);
        setProgress(100);
        setStatus(runPrefix + 'COMPLETE — video ready', 'done');
        stopClock();

        // Track last gen state for seed bank
        lastGenState = { seed, lora, resolution, fps, outputFilename, chaosApplied };
        const saveSeedBtnEl2 = document.getElementById('save-seed-btn');
        if (saveSeedBtnEl2) saveSeedBtnEl2.style.display = 'inline-block';
        const saveSeedRow = document.getElementById('save-seed-row');
        if (saveSeedRow) saveSeedRow.style.display = 'none'; // reset any previous row

        // Write export report alongside the video
        try {
          // S267 Story 3+4 — thread length + chaosPercent + clampLog through to the report.
          // lora._chaosClampLog is attached by applyChaos when chaos fires.
          const report    = buildReport({
            outputFilename, seed, runNum, totalRuns, duration,
            lora, resolution, fps, length,
            chaosPercent:  chaosApplied,
            chaosClampLog: (lora && lora._chaosClampLog) || [],
          });
          const safeName  = outputFilename.split(/[/\\]/).pop() || 'output'; // RF-S259-05: basename only
          const stem      = safeName.replace(/\.[^.]+$/, '');
          const rptFile   = stem + '_report.txt';
          await window.wan.writeReport(rptFile, report); // RF-S259-04: filename token, not full path
          appendLog('complete', 'Report → ' + rptFile);
        } catch (err) {
          appendLog('error', 'Report write failed: ' + (err.message || err));
        }

        const comfyDir   = await window.wan.getComfyDir();
        const outputPath = comfyDir + '/output/' + outputFilename;
        const videoURL   = await window.wan.toFileURL(outputPath);
        videoPlayer.src  = videoURL;
        videoPlayer.style.display = 'block';
        videoPlayer.play().catch(() => {});

        resolve(true);
      },
      onError: (msg) => {
        // S264 Cla⌂de patch (DBG): also log error to debug stream (setStatus is silent)
        appendLog('error', '[startGeneration] onError: ' + msg);
        setStatus(runPrefix + msg, 'error');
        setProgress(0);
        stopClock();
        resolve(false);
      },
      onLog: (type, msg) => appendLog(type, msg),
    });
      appendLog('init', '[startGeneration] ComfyClient.generate call returned (sync part done)');
    } catch (err) {
      // S264 Cla⌂de patch (DBG): catch any sync throw from ComfyClient.generate
      const errMsg = err && err.message ? err.message : String(err);
      appendLog('error', '[startGeneration] SYNC THROW from ComfyClient.generate: ' + errMsg);
      setStatus('Internal error: ' + errMsg, 'error');
      stopClock();
      resolve(false);
    }
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function resetGenerateBtn() {
  isGenerating  = false;
  goBtn.disabled = false;
  goBtn.textContent = 'GENERATE';
  currentRun = 0;
}

function setProgress(pct) {
  progressFill.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', Math.round(pct));
}

function setStatus(msg, state) {
  statusText.textContent = msg;
  // S266 P2 — Grumpy R6 Flag #4: write a data-state attribute and let CSS handle
  // the color. Previous inline `progressFill.style.background = ...` defeated the
  // chroma-bleed amber default permanently and left a residual amber glow ghost
  // on top of whatever color we wrote inline.
  progressFill.dataset.state = state || 'idle';
  statusText.dataset.state = state || 'idle';
}

// ─── S267 Story 4 — Smart chaos with stage-aware bands ─────────────────────────
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHAOS_BANDS — tuned for CURRENT LoRA configuration (S267 manifest):
//   • DR34MLAY  = action/motion LoRA (Recipe 2 from NotebookLM research:
//                 wide S1 swing, narrow S2 swing)
//   • K3NK      = action/motion LoRA (same Recipe 2 pattern)
//
// ⚠️ IF YOU SWAP A LoRA FILE (renaming the .safetensors in workflows/), YOU MUST
//    REVIEW THESE BANDS. Character LoRAs follow Recipe 1 (inverted: low S1 / high S2).
//    Speed LoRAs (Lightning, Lightx2v) follow Recipe 3 (1.0 both OR 2.0+ S1; CFG=1.0).
//    Type-aware band selection by per-LoRA tag is DEFERRED to S268 — this is a
//    hardcoded snapshot of the current two-action-LoRA configuration.
//
// Research source: NotebookLM 2026-05-21 — cited in S267_INTELLIGENCE_PASS.md.
//   - LoRA delta sensitivity 0.1 (Q3c) → dampeners 0.20-0.25
//   - CFG safe-zone 3.5-5.5 (Q3a)      → S1 band [3.5, 5.5], S2 band [4.0, 6.0]
//   - Step floor 12 in S1 (Q3b)        → S1 band [12, 30], S2 band [8, 25]
//
// Behavior: when chaos % > 0, each param's value drifts within its dampened
// envelope but is HARD-CLAMPED to the band's [min, max]. If the user's base
// value is already outside the band, chaos pulls it INTO the band — and the
// clamp is LOGGED VISIBLY via appendLog so the user sees why values moved.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CHAOS_BANDS = {
  // LoRA STRENGTHS — Recipe 2 (action LoRA): wide S1, narrow S2
  's1.dr34mlayStr': { min: 0.5, max: 2.0, dampener: 0.25 },
  's2.dr34mlayStr': { min: 0.0, max: 0.8, dampener: 0.20 },
  's1.k3nkStr':     { min: 0.5, max: 2.0, dampener: 0.25 },
  's2.k3nkStr':     { min: 0.0, max: 0.8, dampener: 0.20 },
  // CFG — sweep safe-zone from research
  's1.cfg':         { min: 3.5, max: 5.5, dampener: 0.30 },
  's2.cfg':         { min: 4.0, max: 6.0, dampener: 0.30 },
  // STEPS — respects 12-step S1 motion-collapse floor + diminishing-returns ceiling
  's1.steps':       { min: 12, max: 30, dampener: 0.30, integer: true },
  's2.steps':       { min: 8,  max: 25, dampener: 0.30, integer: true },
};

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
  const clampLog = [];
  for (const [path, band] of Object.entries(CHAOS_BANDS)) {
    const [stage, param] = path.split('.');
    const before = lv[stage][param];
    const after  = chaosWithinBand(before, chaosPercent, band);
    lv[stage][param] = after;
    // Visible clamp log when band fires (base value was outside band)
    if (chaosPercent > 0 && (before < band.min || before > band.max)) {
      const beforeStr = band.integer ? String(before) : Number(before).toFixed(2);
      const afterStr  = band.integer ? String(after)  : Number(after).toFixed(2);
      const minStr = band.integer ? band.min : band.min.toFixed(1);
      const maxStr = band.integer ? band.max : band.max.toFixed(1);
      clampLog.push(`${stage.toUpperCase()} ${param}: ${beforeStr} → ${afterStr} (band [${minStr}, ${maxStr}])`);
    }
  }
  // Surface clamp activity via appendLog so user SEES why values moved
  if (clampLog.length > 0) {
    appendLog('chaos', 'chaos band clamps: ' + clampLog.join(' · '));
  }
  // Attach the clamp log to the loraValues so buildReport can include it
  lv._chaosClampLog = clampLog;
  return lv;
}

// ─── CHAOS SLIDER UX ─────────────────────────────────────────────────────────
function initChaosSlider() {
  const chaosPct      = document.getElementById('chaos-pct');
  const chaosPctVal   = document.getElementById('chaos-pct-val');
  const chaosLabel    = document.getElementById('chaos-label-text');
  if (!chaosPct) return;

  function updateChaosLabel(pct) {
    chaosPctVal.textContent = pct + '%';
    if (pct === 0)        chaosLabel.textContent = 'CHAOS OFF — exact values every run';
    else if (pct <= 30)   chaosLabel.textContent = 'MILD — subtle variation';
    else if (pct <= 70)   chaosLabel.textContent = 'MEDIUM — noticeable exploration';
    else                  chaosLabel.textContent = 'WILD — expect surprises';
  }

  chaosPct.addEventListener('input', () => updateChaosLabel(parseInt(chaosPct.value, 10)));
  updateChaosLabel(0);
}

// ─── PRESET SYSTEM ───────────────────────────────────────────────────────────
async function loadPresets() {
  const presetSelect = document.getElementById('preset-select');
  if (!presetSelect) return;
  try {
    const index = await window.wan.listPresets();
    presetSelect.innerHTML = '<option value="">— Select Preset —</option>';
    index.forEach(p => {
      const opt = document.createElement('option');
      opt.value       = p.slug;
      opt.textContent = p.name;
      presetSelect.appendChild(opt);
    });
    if (currentPresetSlug) presetSelect.value = currentPresetSlug;
  } catch (err) {
    appendLog('error', 'Preset list failed: ' + (err.message || err));
  }
}

async function applyPreset(slug) {
  if (!slug) return;
  try {
    const preset = await window.wan.loadPreset(slug);
    const lv     = preset.loraValues;
    // Snap all sliders to preset values
    const setSlider = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input'));
    };
    setSlider('s1-dr34mlay-str', lv.stage1.dr34mlayStr);
    setSlider('s1-k3nk-str',     lv.stage1.k3nkStr);
    setSlider('s1-steps',        lv.stage1.steps);
    setSlider('s1-cfg',          lv.stage1.cfg);
    setSlider('s2-dr34mlay-str', lv.stage2.dr34mlayStr);
    setSlider('s2-k3nk-str',     lv.stage2.k3nkStr);
    setSlider('s2-steps',        lv.stage2.steps);
    setSlider('s2-cfg',          lv.stage2.cfg);
    if (preset.resolution) {
      const resSel = document.getElementById('resolution-select');
      if (resSel) resSel.value = preset.resolution.width + 'x' + preset.resolution.height;
    }
    if (preset.fps) {
      const fpsSel = document.getElementById('fps-select');
      if (fpsSel) fpsSel.value = String(preset.fps);
    }
    currentPresetSlug = slug;
    appendLog('init', 'Preset loaded: ' + preset.name);
  } catch (err) {
    appendLog('error', 'Load preset failed: ' + (err.message || err));
  }
}

function initPresetUI() {
  const presetSelect   = document.getElementById('preset-select');
  const presetLoadBtn  = document.getElementById('preset-load-btn');
  const presetSaveBtn  = document.getElementById('preset-save-btn');
  const presetDeleteBtn = document.getElementById('preset-delete-btn');
  const presetSaveRow  = document.getElementById('preset-save-row');
  const presetNameInput = document.getElementById('preset-name-input');
  const presetConfirmBtn = document.getElementById('preset-confirm-btn');
  const presetCancelBtn = document.getElementById('preset-cancel-btn');
  if (!presetSelect) return;

  presetLoadBtn.addEventListener('click', () => {
    const slug = presetSelect.value;
    if (slug) applyPreset(slug);
  });

  presetSelect.addEventListener('change', () => {
    if (presetDeleteBtn) presetDeleteBtn.style.display = presetSelect.value ? 'inline-block' : 'none';
  });

  presetSaveBtn.addEventListener('click', () => {
    if (presetSaveRow) presetSaveRow.style.display = 'flex';
    if (presetNameInput) presetNameInput.value = '';
    if (presetNameInput) presetNameInput.focus();
  });

  if (presetCancelBtn) {
    presetCancelBtn.addEventListener('click', () => {
      if (presetSaveRow) presetSaveRow.style.display = 'none';
    });
  }

  if (presetConfirmBtn) {
    presetConfirmBtn.addEventListener('click', async () => {
      const name = (presetNameInput ? presetNameInput.value.trim() : '');
      if (!name) { appendLog('error', 'Preset name cannot be empty'); return; }
      const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '').slice(0, 64);
      if (!slug) { appendLog('error', 'Preset name produced empty slug'); return; }
      const { width, height } = getResolutionPreset();
      const data = {
        name,
        created_at: new Date().toISOString(),
        loraValues: getLoraValues(),
        resolution: { width, height },
        fps: getFrameRate(),
        seedMode: seedMode === 'random' ? 'random' : parseInt(seedValue.value, 10),
      };
      try {
        await window.wan.savePreset(slug, data);
        if (presetSaveRow) presetSaveRow.style.display = 'none';
        currentPresetSlug = slug;
        await loadPresets();
        appendLog('complete', 'Preset saved: ' + name);
      } catch (err) {
        appendLog('error', 'Save preset failed: ' + (err.message || err));
      }
    });
  }

  if (presetDeleteBtn) {
    presetDeleteBtn.addEventListener('click', async () => {
      const slug = presetSelect.value;
      if (!slug) return;
      if (!confirm('Delete preset "' + presetSelect.options[presetSelect.selectedIndex].text + '"?')) return;
      try {
        await window.wan.deletePreset(slug);
        currentPresetSlug = null;
        await loadPresets();
        if (presetDeleteBtn) presetDeleteBtn.style.display = 'none';
        appendLog('init', 'Preset deleted');
      } catch (err) {
        appendLog('error', 'Delete preset failed: ' + (err.message || err));
      }
    });
  }
}

// ─── SEED BANK ────────────────────────────────────────────────────────────────
function initSeedBankUI() {
  const saveSeedBtn    = document.getElementById('save-seed-btn');
  const saveSeedRow    = document.getElementById('save-seed-row');
  const seedLabelInput = document.getElementById('seed-label-input');
  const seedSaveConfirm = document.getElementById('seed-save-confirm');
  const seedSaveSkip   = document.getElementById('seed-save-skip');
  const seedBankToggle = document.getElementById('seed-bank-toggle');
  const seedBankPanel  = document.getElementById('seed-bank-panel');
  if (!saveSeedBtn) return;

  saveSeedBtn.addEventListener('click', () => {
    if (saveSeedRow) { saveSeedRow.style.display = 'flex'; }
    if (seedLabelInput) { seedLabelInput.value = ''; seedLabelInput.focus(); }
  });

  if (seedSaveSkip) {
    seedSaveSkip.addEventListener('click', () => {
      if (saveSeedRow) saveSeedRow.style.display = 'none';
    });
  }

  if (seedSaveConfirm) {
    seedSaveConfirm.addEventListener('click', async () => {
      if (!lastGenState) return;
      const label = (seedLabelInput ? seedLabelInput.value.trim() : '') || 'Untitled seed';
      const entry = {
        seed:          lastGenState.seed,
        label,
        outputFilename: lastGenState.outputFilename,
        loraValues:    lastGenState.lora,
        resolution:    lastGenState.resolution,
        fps:           lastGenState.fps,
        chaos_applied: lastGenState.chaosApplied || 0,
      };
      try {
        await window.wan.saveSeed(entry);
        if (saveSeedRow) saveSeedRow.style.display = 'none';
        if (saveSeedBtn) saveSeedBtn.style.display = 'none';
        appendLog('complete', 'Seed saved: ' + label);
        await refreshSeedBank();
      } catch (err) {
        appendLog('error', 'Save seed failed: ' + (err.message || err));
      }
    });
  }

  if (seedBankToggle && seedBankPanel) {
    seedBankToggle.addEventListener('click', () => {
      seedBankVisible = !seedBankVisible;
      seedBankPanel.style.display = seedBankVisible ? 'block' : 'none';
      seedBankToggle.textContent  = seedBankVisible ? '▴ HIDE' : '▾ SHOW';
      if (seedBankVisible) refreshSeedBank();
    });
  }
}

async function refreshSeedBank() {
  const seedBankList = document.getElementById('seed-bank-list');
  if (!seedBankList) return;
  try {
    const { seeds } = await window.wan.listSeeds();
    if (!seeds || seeds.length === 0) {
      seedBankList.innerHTML = '<div class="seed-bank-empty">No seeds saved yet.</div>';
      return;
    }
    seedBankList.innerHTML = '';
    seeds.forEach(s => {
      const entry = document.createElement('div');
      entry.className = 'seed-bank-entry';
      entry.innerHTML =
        '<div class="seed-bank-entry-info">' +
          '<span class="seed-bank-entry-seed">' + escapeHtml(String(s.seed)) + '</span>' +
          '<span class="seed-bank-entry-label">' + escapeHtml(s.label) + '</span>' +
          '<span class="seed-bank-entry-date">' + escapeHtml((s.created_at || '').slice(0, 10)) + '</span>' +
        '</div>' +
        '<div class="seed-bank-entry-actions">' +
          '<button class="seed-entry-load" data-id="' + escapeHtml(s.id) + '">▶ LOAD</button>' +
          '<button class="seed-entry-delete" data-id="' + escapeHtml(s.id) + '">×</button>' +
        '</div>';
      // LOAD: snap all sliders + seed input
      entry.querySelector('.seed-entry-load').addEventListener('click', () => {
        const lv = s.loraValues;
        const setSlider = (id, val) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.value = val;
          el.dispatchEvent(new Event('input'));
        };
        setSlider('s1-dr34mlay-str', lv.stage1.dr34mlayStr);
        setSlider('s1-k3nk-str',     lv.stage1.k3nkStr);
        setSlider('s1-steps',        lv.stage1.steps);
        setSlider('s1-cfg',          lv.stage1.cfg);
        setSlider('s2-dr34mlay-str', lv.stage2.dr34mlayStr);
        setSlider('s2-k3nk-str',     lv.stage2.k3nkStr);
        setSlider('s2-steps',        lv.stage2.steps);
        setSlider('s2-cfg',          lv.stage2.cfg);
        // Set seed to fixed mode with this seed value
        seedMode = 'fixed';
        seedToggle.textContent = 'FIXED';
        seedValue.style.display = 'inline-block';
        seedValue.value = String(s.seed);
        appendLog('init', 'Seed loaded: ' + s.seed + ' (' + s.label + ')');
      });
      // DELETE
      entry.querySelector('.seed-entry-delete').addEventListener('click', async () => {
        if (!confirm('Delete seed "' + s.label + '"?')) return;
        try {
          await window.wan.deleteSeed(s.id);
          await refreshSeedBank();
        } catch (err) {
          appendLog('error', 'Delete seed failed: ' + (err.message || err));
        }
      });
      seedBankList.appendChild(entry);
    });
  } catch (err) {
    appendLog('error', 'Load seeds failed: ' + (err.message || err));
  }
}

// ─── RENDER QUEUE ─────────────────────────────────────────────────────────────
function renderQueueUI() {
  const queuePanel   = document.getElementById('queue-panel');
  const queueList    = document.getElementById('queue-list');
  const runQueueBtn  = document.getElementById('run-queue-btn');
  // S264 Cla⌂de patch (BUG-03): empty-state visibility used to be managed by
  // queue.js's updateEmptyState. queue.js retired (BUG-02), so fold it in here.
  const queueEmpty   = document.getElementById('queue-empty');
  const queueCount   = document.getElementById('queue-count');
  if (!queuePanel || !queueList) return;

  queuePanel.style.display = jobQueue.length > 0 ? 'block' : 'none';
  queueList.innerHTML = '';
  if (queueEmpty) queueEmpty.style.display = jobQueue.length > 0 ? 'none' : 'block';
  if (queueCount) queueCount.textContent = jobQueue.length;

  jobQueue.forEach((job, i) => {
    const card = document.createElement('div');
    card.className = 'queue-job-card';
    // S266 P2 — Grumpy R6 Flag #3: chroma-bleed has [data-status=...] selectors
    // for running/complete/error state colors. Without this attribute, the state
    // color rules never fire and queue cards render in default ink color forever.
    card.dataset.status = job.status;
    const statusDot = job.status === 'running'  ? '◈' :
                      job.status === 'complete' ? '✓' :
                      job.status === 'error'    ? '✗' : '○';
    card.innerHTML =
      '<span class="queue-job-status">' + statusDot + '</span>' +
      '<span class="queue-job-label">' + escapeHtml(job.label) + '</span>' +
      '<span class="queue-job-chaos">' + (job.chaos > 0 ? job.chaos + '% chaos' : '') + '</span>' +
      (job.status === 'pending'
        ? '<button class="queue-job-remove" data-idx="' + i + '">×</button>'
        : '');
    const removeBtn = card.querySelector('.queue-job-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        jobQueue.splice(i, 1);
        renderQueueUI();
      });
    }
    queueList.appendChild(card);
  });

  if (runQueueBtn) runQueueBtn.disabled = (activeJobIndex >= 0);
}

function addCurrentStateAsJob() {
  const { width, height } = getResolutionPreset();
  const fps       = getFrameRate();
  const chaosEl   = document.getElementById('chaos-pct');
  const chaos     = chaosEl ? (parseInt(chaosEl.value, 10) || 0) : 0;
  jobQueue.push({
    id:         crypto.randomUUID(),
    label:      'Job ' + (jobQueue.length + 1),
    prompt:     null,
    seed:       null,
    loraValues: getLoraValues(),
    resolution: { width, height },
    fps,
    chaos,
    status:     'pending',
    outputFilename: null,
  });
  renderQueueUI();
  appendLog('queue', 'Added Job ' + jobQueue.length + ' to queue');
}

async function runQueue() {
  // S264 Cla⌂de patch (DBG): instrument every bail path so silent failures
  // surface in the debug log. setStatus() only writes to UI — bails were invisible.
  const prompt = promptInput.value.trim();
  appendLog('init', '[runQueue] entered — prompt.len=' + prompt.length +
    ' image=' + (selectedImageFilename || 'NULL') +
    ' jobQueue.len=' + jobQueue.length +
    ' isGenerating=' + isGenerating);
  if (!prompt) {
    appendLog('error', '[runQueue] BAIL — prompt empty');
    setStatus('Prompt is empty. Enter a description before running the queue.', 'error');
    return;
  }
  if (!selectedImageFilename) {
    appendLog('error', '[runQueue] BAIL — no image loaded');
    setStatus('No image loaded. Drop an image before running the queue.', 'error');
    return;
  }
  appendLog('init', '[runQueue] guards passed, starting loop over ' + jobQueue.length + ' jobs');
  const runQueueBtn = document.getElementById('run-queue-btn');

  isGenerating = true;
  goBtn.disabled = true;
  if (runQueueBtn) runQueueBtn.disabled = true;

  for (let i = 0; i < jobQueue.length; i++) {
    if (jobQueue[i].status !== 'pending') continue;
    activeJobIndex = i;
    jobQueue[i].status = 'running';
    renderQueueUI();

    const job  = jobQueue[i];
    const seed = job.seed !== null ? job.seed : Math.floor(Math.random() * 9999999999);
    const lv   = job.chaos > 0 ? applyChaos(job.loraValues, job.chaos) : job.loraValues;
    const jobPrompt = job.prompt || prompt;

    const ok = await startGeneration(seed, jobPrompt, i + 1, jobQueue.length,
                                      lv, job.resolution.width, job.resolution.height,
                                      job.fps, job.chaos);
    jobQueue[i].status = ok ? 'complete' : 'error';
    if (ok && lastGenState) jobQueue[i].outputFilename = lastGenState.outputFilename;
    renderQueueUI();
  }

  activeJobIndex = -1;
  isGenerating = false;
  goBtn.disabled = false;
  if (runQueueBtn) runQueueBtn.disabled = false;
  goBtn.textContent = 'GENERATE';
}

function initQueueUI() {
  const addToQueueBtn = document.getElementById('add-to-queue-btn');
  const runQueueBtn   = document.getElementById('run-queue-btn');
  const queueClearBtn = document.getElementById('queue-clear-btn');
  // S264 Cla⌂de patch (DBG): log wiring state so we can see if buttons are missing
  appendLog('init', '[initQueueUI] wiring — addToQueue=' + !!addToQueueBtn +
    ' runQueue=' + !!runQueueBtn + ' clear=' + !!queueClearBtn);
  if (!addToQueueBtn) return;

  addToQueueBtn.addEventListener('click', addCurrentStateAsJob);

  if (runQueueBtn) {
    runQueueBtn.addEventListener('click', () => {
      // S264 Cla⌂de patch (DBG): log every click so we know the handler is reached
      appendLog('queue', '[click] RUN QUEUE pressed — isGenerating=' + isGenerating);
      if (!isGenerating) runQueue();
      else appendLog('error', '[click] RUN QUEUE blocked — isGenerating stuck true');
    });
  }

  if (queueClearBtn) {
    queueClearBtn.addEventListener('click', () => {
      appendLog('queue', '[click] CLEAR pressed — clearing pending jobs');
      jobQueue = jobQueue.filter(j => j.status === 'running');
      renderQueueUI();
    });
  }
}

// ─── BATCH SYSTEM ─────────────────────────────────────────────────────────────

const PARAM_SHORT = {
  's1.cfg':         's1cfg',
  's2.cfg':         's2cfg',
  's1.dr34mlayStr': 'dr34',
  's2.dr34mlayStr': 'dr34lo',
  's1.k3nkStr':     'k3nk',
  's2.k3nkStr':     'k3nklo',
  's1.steps':       'spt',
  's2.steps':       'spt2',
};

const PARAM_DEFAULTS = {
  's1.cfg':         { min: 3.0,  max: 6.0,  step: 0.1,  defaultSteps: 4 },
  's2.cfg':         { min: 3.0,  max: 7.0,  step: 0.1,  defaultSteps: 4 },
  's1.dr34mlayStr': { min: 0.4,  max: 1.0,  step: 0.05, defaultSteps: 4 },
  's2.dr34mlayStr': { min: 0.4,  max: 1.0,  step: 0.05, defaultSteps: 4 },
  's1.k3nkStr':     { min: 0.3,  max: 0.9,  step: 0.05, defaultSteps: 4 },
  's2.k3nkStr':     { min: 0.3,  max: 0.9,  step: 0.05, defaultSteps: 4 },
  's1.steps':       { min: 10,   max: 30,   step: 1,    defaultSteps: 4 },
  's2.steps':       { min: 15,   max: 45,   step: 1,    defaultSteps: 4 },
};

function linspace(min, max, n) {
  if (n === 1) return [min];
  return Array.from({ length: n }, (_, i) => +(min + (max - min) * (i / (n - 1))).toFixed(3));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function applyOverrides(lv, param1, val1, param2, val2) {
  const setPath = (obj, dotPath, val) => {
    const [prefix, key] = dotPath.split('.');
    const stage = prefix === 's1' ? 'stage1' : 'stage2';
    obj[stage][key] = val;
  };
  if (param1 != null && val1 != null) setPath(lv, param1, val1);
  if (param2 != null && val2 != null) setPath(lv, param2, val2);
  return lv;
}

function buildDialPrefix(param1, val1, param2, val2) {
  const ts = Math.floor(Date.now() / 1000);
  const p1 = (PARAM_SHORT[param1] || param1) + (+val1).toFixed(1);
  const p2 = (param2 && val2 != null) ? '_' + (PARAM_SHORT[param2] || param2) + (+val2).toFixed(1) : '';
  return `dial_${ts}_${p1}${p2}`;
}

function buildDialJobs(baseLoraValues, dialSeed, axis1Config, axis2Config) {
  const axis1Values = linspace(axis1Config.min, axis1Config.max, axis1Config.steps);
  const axis2Values = axis2Config ? linspace(axis2Config.min, axis2Config.max, axis2Config.steps) : [null];

  return axis1Values.flatMap(v1 =>
    axis2Values.map(v2 => ({
      jobId:          crypto.randomUUID(),
      mode:           'DIAL',
      seed:           dialSeed,
      filenamePrefix: buildDialPrefix(axis1Config.param, v1, axis2Config ? axis2Config.param : null, v2),
      loraValues:     applyOverrides(deepClone(baseLoraValues), axis1Config.param, v1, axis2Config ? axis2Config.param : null, v2),
      status:         'pending',
      outputFile:     null,
      startedAt:      null,
      completedAt:    null,
      errorMsg:       null,
      overrides:      { axis1Label: axis1Config.param, axis1Value: v1, axis2Label: axis2Config ? axis2Config.param : null, axis2Value: v2 },
    }))
  );
}

function buildProdJobs(baseLoraValues, count, seedStrategy, baseSeed) {
  return Array.from({ length: count }, (_, i) => {
    const seed = seedStrategy === 'sequential'
      ? (baseSeed + i * 1000007)
      : Math.floor(Math.random() * 9999999999);
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

function estimateBatchEta(jobs, jobIndex, currentJobPct) {
  const done = jobs.filter(j => j.status === 'complete');
  if (done.length < 1) return null;
  const avgMs     = done.reduce((sum, j) => sum + (j.completedAt - j.startedAt), 0) / done.length;
  const remaining = jobs.length - jobIndex - 1;
  const curLeft   = avgMs * (1 - currentJobPct / 100);
  return curLeft + remaining * avgMs;
}

// S264 Cla⌂de patch (BUG-Fl1 + BUG-Fl2): runBatch now takes width/height/frameRate.
// Pre-S264 it ignored them entirely → workflow's hardcoded 832x480/16fps silently won
// regardless of the user's UI picks. Also: imageFilename (basename) not host path —
// ComfyUI's LoadImage resolves filenames against its input/ dir; absolute paths 400.
async function runBatch(jobs, imageFilename, prompt, width, height, frameRate, length) {
  batchActive     = true;
  batchQueue      = jobs;
  batchJobIndex   = 0;
  batchCurrentPct = 0;
  updateBatchPanel();

  // S267 — INVARIANT: DIAL/PROD jobs MUST NOT pass through applyChaos.
  // DIAL's whole purpose is exploring OUTSIDE the chaos safe-zone bands.
  // Clamping them would defeat the point. This function calls ComfyClient.generate
  // directly with job.loraValues — no chaos step. See CHAOS_BANDS in renderer.js.

  for (const job of jobs) {
    if (!batchActive) break;
    job.status    = 'running';
    job.startedAt = Date.now();
    batchJobIndex   = jobs.indexOf(job);
    batchCurrentPct = 0;
    updateBatchPanel();

    await new Promise((resolve) => {
      window.ComfyClient.generate({
        imagePath:      imageFilename,    // S264: basename, not host path
        prompt,
        seed:           job.seed,
        workflowName:   get14bWorkflow(),
        loraValues:     job.loraValues,   // S267: NO applyChaos — DIAL invariant
        width,                            // S264: forward UI's resolution pick
        height,
        frameRate,                        // S264: forward UI's FPS pick
        length,                           // S267 Story 3: forward UI's length pick
        filenamePrefix: job.filenamePrefix,
        onProgress: (pct) => {
          batchCurrentPct = pct;
          updateBatchPanel();
        },
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
          resolve();
        },
        onLog: (type, msg) => appendLog(type, `[${batchJobIndex + 1}/${jobs.length}] ${msg}`),
      });
    });
  }

  batchActive     = false;
  batchCurrentPct = 0;
  updateBatchPanel();
  const ok = jobs.filter(j => j.status === 'complete').length;
  appendLog('complete', `Batch done — ${ok}/${jobs.length} completed`);
}

function updateBatchPanel() {
  const panel    = document.getElementById('batch-panel');
  const modeEl   = document.getElementById('batch-mode-label');
  const progFill = document.getElementById('batch-progress-fill');
  const etaEl    = document.getElementById('batch-eta');
  const listEl   = document.getElementById('batch-job-list');
  if (!panel) return;

  const jobs    = batchQueue;
  const dialBtn = document.getElementById('dial-run-btn');
  const prodBtn = document.getElementById('prod-run-btn');

  if (jobs.length === 0 || !batchActive) {
    panel.style.display = 'none';
    if (dialBtn) dialBtn.disabled = false;
    if (prodBtn) prodBtn.disabled = false;
    return;
  }

  panel.style.display = 'block';
  if (dialBtn) dialBtn.disabled = true;
  if (prodBtn) prodBtn.disabled = true;

  const mode = jobs[0]?.mode || 'BATCH';
  const done = jobs.filter(j => j.status === 'complete' || j.status === 'error').length;
  if (modeEl) modeEl.textContent = `${mode}: job ${batchJobIndex + 1} of ${jobs.length}`;

  const pct = jobs.length > 0 ? Math.round((done / jobs.length) * 100) : 0;
  if (progFill) progFill.style.width = pct + '%';

  const etaMs = estimateBatchEta(jobs, batchJobIndex, batchCurrentPct);
  if (etaEl) {
    if (etaMs != null) {
      const mins  = Math.floor(etaMs / 60000);
      const hours = Math.floor(mins / 60);
      const m     = mins % 60;
      etaEl.textContent = hours > 0 ? `~${hours}h ${m}m remaining` : `~${m}m remaining`;
    } else {
      etaEl.textContent = '—';
    }
  }

  if (!listEl) return;
  listEl.innerHTML = '';
  jobs.forEach((job, i) => {
    const card = document.createElement('div');
    // S266 P2 — Grumpy R6 Flag #3: renamed `batch-job-card` → `batch-job-row` so
    // chroma-bleed's `.queue-job-card, .batch-job-row { display:grid; ... }` rule
    // actually matches. Also write dataset.status to fire state color selectors.
    // Keeping `batch-job-card` as an additional class for any legacy JS hooks.
    card.className = 'batch-job-row batch-job-card';
    card.dataset.status = job.status;

    const icon = job.status === 'complete' ? '✓'
               : job.status === 'error'    ? '✗'
               : job.status === 'running'  ? '▶'
               : '·';

    const label = (job.mode === 'DIAL' && job.overrides)
      ? (PARAM_SHORT[job.overrides.axis1Label] || job.overrides.axis1Label) + '=' + job.overrides.axis1Value.toFixed(1)
        + (job.overrides.axis2Label ? ' · ' + (PARAM_SHORT[job.overrides.axis2Label] || job.overrides.axis2Label) + '=' + job.overrides.axis2Value.toFixed(1) : '')
      : `Job ${i + 1}`;

    const progressStr = job.status === 'running'  ? ` — ${batchCurrentPct}%`
                      : (job.status === 'complete' && job.outputFile) ? ` — ${job.outputFile}` : '';

    card.innerHTML = `<span class="batch-job-icon">${icon}</span><span class="batch-job-label">${label}${progressStr}</span>`;

    if (job.status === 'complete' && job.mode === 'DIAL') {
      const promBtn = document.createElement('button');
      promBtn.className = 'batch-promote-btn';
      promBtn.textContent = 'PROMOTE →';
      promBtn.addEventListener('click', () => promoteDialJob(i));
      card.appendChild(promBtn);
    }

    listEl.appendChild(card);
  });
}

function promoteDialJob(idx) {
  const job = batchQueue[idx];
  if (!job || !job.loraValues) return;
  const lv = job.loraValues;
  const setSlider = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    el.dispatchEvent(new Event('input'));
  };
  setSlider('s1-dr34mlay-str', lv.stage1.dr34mlayStr);
  setSlider('s1-k3nk-str',     lv.stage1.k3nkStr);
  setSlider('s1-steps',        lv.stage1.steps);
  setSlider('s1-cfg',          lv.stage1.cfg);
  setSlider('s2-dr34mlay-str', lv.stage2.dr34mlayStr);
  setSlider('s2-k3nk-str',     lv.stage2.k3nkStr);
  setSlider('s2-steps',        lv.stage2.steps);
  setSlider('s2-cfg',          lv.stage2.cfg);
  appendLog('complete', `Promoted DIAL job ${idx + 1} settings to main panel`);
}

function initDialUI() {
  const dialSection  = document.getElementById('dial-section');
  const dialToggle   = document.getElementById('dial-toggle');
  const dialBody     = document.getElementById('dial-body');
  const dialSeedEl   = document.getElementById('dial-seed-display');
  const dialSeedRoll = document.getElementById('dial-seed-roll');
  const dialSeedLock = document.getElementById('dial-seed-lock');
  const axis1Sel     = document.getElementById('dial-axis1-param');
  const axis1Min     = document.getElementById('dial-axis1-min');
  const axis1Max     = document.getElementById('dial-axis1-max');
  const axis1Steps   = document.getElementById('dial-axis1-steps');
  const axis2Sel     = document.getElementById('dial-axis2-param');
  const axis2Min     = document.getElementById('dial-axis2-min');
  const axis2Max     = document.getElementById('dial-axis2-max');
  const axis2Steps   = document.getElementById('dial-axis2-steps');
  const jobCountEl   = document.getElementById('dial-job-count');
  const runBtn       = document.getElementById('dial-run-btn');
  if (!dialSection) return;

  dialSeedValue = Math.floor(Math.random() * 9999999999);
  if (dialSeedEl) dialSeedEl.textContent = dialSeedValue;

  if (dialToggle && dialBody) {
    dialToggle.addEventListener('click', () => {
      const collapsed = dialBody.style.display === 'none';
      dialBody.style.display = collapsed ? 'block' : 'none';
      dialToggle.textContent = collapsed ? '▾ HIDE' : '▾ SHOW';
    });
  }

  if (dialSeedRoll) {
    dialSeedRoll.addEventListener('click', () => {
      if (dialSeedLocked) return;
      dialSeedValue = Math.floor(Math.random() * 9999999999);
      if (dialSeedEl) dialSeedEl.textContent = dialSeedValue;
    });
  }

  if (dialSeedLock) {
    dialSeedLock.addEventListener('click', () => {
      dialSeedLocked = !dialSeedLocked;
      dialSeedLock.textContent = dialSeedLocked ? 'UNLOCK' : 'LOCK';
      dialSeedLock.classList.toggle('dial-lock-active', dialSeedLocked);
    });
  }

  const applyDefaults = (paramSel, minEl, maxEl, stepsEl) => {
    const param = paramSel ? paramSel.value : '';
    if (param && PARAM_DEFAULTS[param]) {
      const d = PARAM_DEFAULTS[param];
      if (minEl)   minEl.value   = d.min;
      if (maxEl)   maxEl.value   = d.max;
      if (stepsEl) stepsEl.value = d.defaultSteps;
    }
  };

  const refreshJobCount = () => {
    if (!jobCountEl) return;
    const n1 = parseInt(axis1Steps ? axis1Steps.value : '4', 10) || 4;
    const a2 = axis2Sel ? axis2Sel.value : '';
    const n2 = a2 ? (parseInt(axis2Steps ? axis2Steps.value : '1', 10) || 1) : 1;
    const total = n1 * n2;
    jobCountEl.textContent = `→ ${total} job${total !== 1 ? 's' : ''}`;
  };

  if (axis1Sel) {
    axis1Sel.addEventListener('change', () => { applyDefaults(axis1Sel, axis1Min, axis1Max, axis1Steps); refreshJobCount(); });
    applyDefaults(axis1Sel, axis1Min, axis1Max, axis1Steps);
  }
  if (axis2Sel) {
    axis2Sel.addEventListener('change', () => { applyDefaults(axis2Sel, axis2Min, axis2Max, axis2Steps); refreshJobCount(); });
  }
  if (axis1Steps) axis1Steps.addEventListener('input', refreshJobCount);
  if (axis2Steps) axis2Steps.addEventListener('input', refreshJobCount);
  refreshJobCount();

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      // S264 Cla⌂de patch (BUG-Fl8): mirror EXECUTE_BATCH instrumentation — silent
      // setStatus bails were invisible in the debug stream (BUG-06 lesson).
      appendLog('queue', '[click] DIAL RUN pressed — batchActive=' + batchActive +
        ' image=' + (selectedImageFilename || 'NULL') +
        ' prompt.len=' + (promptInput.value || '').trim().length);
      if (batchActive) {
        appendLog('error', '[click] DIAL BAIL — batch already running');
        return;
      }
      const prompt = promptInput.value.trim();
      if (!prompt) {
        appendLog('error', '[click] DIAL BAIL — prompt empty');
        setStatus('Prompt is empty.', 'error');
        return;
      }
      // S264 Cla⌂de patch (BUG-Fl1): check filename (basename), not host path.
      // ComfyUI LoadImage resolves against its input/ dir; absolute paths 400.
      if (!selectedImageFilename) {
        appendLog('error', '[click] DIAL BAIL — no image loaded');
        setStatus('No image loaded.', 'error');
        return;
      }
      const axis1Param = axis1Sel ? axis1Sel.value : '';
      if (!axis1Param) {
        appendLog('error', '[click] DIAL BAIL — no axis selected');
        setStatus('Select at least one DIAL axis.', 'error');
        return;
      }

      const a1 = {
        param: axis1Param,
        min:   parseFloat(axis1Min.value),
        max:   parseFloat(axis1Max.value),
        steps: parseInt(axis1Steps.value, 10) || 4,
      };
      const axis2Param = axis2Sel ? axis2Sel.value : '';
      const a2 = axis2Param ? {
        param: axis2Param,
        min:   parseFloat(axis2Min.value),
        max:   parseFloat(axis2Max.value),
        steps: parseInt(axis2Steps.value, 10) || 4,
      } : null;

      // S264 Cla⌂de patch (BUG-Fl2): capture user's UI picks at click-time.
      // Was: dropped on the floor → workflow's hardcoded 832x480/16fps silently won.
      const { width, height } = getResolutionPreset();
      const fps = getFrameRate();
      const length = getLength();
      appendLog('init', '[click] DIAL guards passed — ' +
        (a1.steps * (a2 ? a2.steps : 1)) + ' jobs @ ' + width + 'x' + height + ' ' + fps + 'fps · length=' + length);

      const jobs = buildDialJobs(getLoraValues(), dialSeedValue, a1, a2);
      await runBatch(jobs, selectedImageFilename, prompt, width, height, fps, length);
    });
  }
}

function initProdUI() {
  const prodSection  = document.getElementById('prod-section');
  const prodToggle   = document.getElementById('prod-toggle');
  const prodBody     = document.getElementById('prod-body');
  const countEl      = document.getElementById('prod-count');
  const stratSel     = document.getElementById('prod-seed-strategy');
  const baseSeedRow  = document.getElementById('prod-base-seed-row');
  const baseSeedEl   = document.getElementById('prod-base-seed');
  const runBtn       = document.getElementById('prod-run-btn');
  if (!prodSection) return;

  if (prodToggle && prodBody) {
    prodToggle.addEventListener('click', () => {
      const collapsed = prodBody.style.display === 'none';
      prodBody.style.display = collapsed ? 'block' : 'none';
      prodToggle.textContent = collapsed ? '▾ HIDE' : '▾ SHOW';
    });
  }

  if (stratSel && baseSeedRow) {
    stratSel.addEventListener('change', () => {
      baseSeedRow.style.display = stratSel.value === 'sequential' ? 'flex' : 'none';
    });
  }

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      // S264 Cla⌂de patch (BUG-Fl8): same DBG mirror as EXECUTE_BATCH / DIAL
      appendLog('queue', '[click] PROD RUN pressed — batchActive=' + batchActive +
        ' image=' + (selectedImageFilename || 'NULL') +
        ' prompt.len=' + (promptInput.value || '').trim().length);
      if (batchActive) {
        appendLog('error', '[click] PROD BAIL — batch already running');
        return;
      }
      const prompt = promptInput.value.trim();
      if (!prompt) {
        appendLog('error', '[click] PROD BAIL — prompt empty');
        setStatus('Prompt is empty.', 'error');
        return;
      }
      // S264 Cla⌂de patch (BUG-Fl1): filename basename, not host path.
      if (!selectedImageFilename) {
        appendLog('error', '[click] PROD BAIL — no image loaded');
        setStatus('No image loaded.', 'error');
        return;
      }

      const count    = Math.min(30, Math.max(1, parseInt(countEl ? countEl.value : '10', 10) || 10));
      const strategy = stratSel ? stratSel.value : 'random';
      const baseSeed = strategy === 'sequential' ? (parseInt(baseSeedEl ? baseSeedEl.value : '1000', 10) || 1000) : 0;

      // S264 Cla⌂de patch (BUG-Fl2): capture resolution/fps from UI.
      const { width, height } = getResolutionPreset();
      const fps = getFrameRate();
      const length = getLength();
      appendLog('init', '[click] PROD guards passed — ' + count + ' jobs ' +
        '@ ' + width + 'x' + height + ' ' + fps + 'fps strategy=' + strategy + ' length=' + length);

      const jobs = buildProdJobs(getLoraValues(), count, strategy, baseSeed);
      await runBatch(jobs, selectedImageFilename, prompt, width, height, fps, length);
    });
  }
}

function initBatchPanel() {
  const cancelBtn = document.getElementById('batch-cancel-btn');
  if (!cancelBtn) return;
  cancelBtn.addEventListener('click', () => {
    if (!batchActive) return;
    batchActive = false;
    appendLog('error', 'Batch cancelled — waiting for current job to finish');
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
init();

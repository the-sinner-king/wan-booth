'use strict';

// ─── STATE ────────────────────────────────────────────────────────────────────
let selectedImagePath       = null;
let selectedImageFilename   = null;
let selectedImageDimensions = null; // { width, height } from nativeImage after copyToInput
let seedMode                = 'random'; // 'random' | 'fixed'
let isGenerating            = false;
let homedir                 = null;
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

function startClock() {
  generationStartTime = Date.now();
  elapsedValue.textContent = '00:00:00';
  etaValue.textContent     = '—';
  mainPanel.dataset.generating = '';

  elapsedIntervalId = setInterval(() => {
    const elapsed = Date.now() - generationStartTime;
    elapsedValue.textContent = formatElapsed(elapsed);
  }, 1000);
}

function stopClock() {
  if (elapsedIntervalId !== null) {
    clearInterval(elapsedIntervalId);
    elapsedIntervalId = null;
  }
  delete mainPanel.dataset.generating;
}

// Called by onProgress when we have a percent to extrapolate from
function updateEta(percent) {
  if (!generationStartTime || percent <= 0) return;
  const elapsed    = Date.now() - generationStartTime;
  const totalEst   = (elapsed / percent) * 100;
  const remaining  = totalEst - elapsed;
  etaValue.textContent = formatEta(remaining);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
async function init() {
  homedir = await window.wan.getHomedir();
  checkComfyStatus();
  initChaosSlider();
  initPresetUI();
  await loadPresets();
  initSeedBankUI();
  initQueueUI();
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
    dropLabel.textContent = selectedImagePath ? 'IMAGE LOADED' : 'DROP IMAGE';
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

// ─── EXPORT REPORT ────────────────────────────────────────────────────────────
// Privacy: prompt is intentionally NOT included in the report — it never gets written to disk.
function buildReport({ outputFilename, seed, runNum, totalRuns, duration, lora, resolution, fps }) {
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = duration % 60;
  const dur = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  const srcDim = selectedImageDimensions
    ? `${selectedImageDimensions.width}×${selectedImageDimensions.height} (source)`
    : 'unknown';

  return [
    '═══════════════════════════════════════════════════════',
    '  WAN BOOTH — GENERATION REPORT',
    '═══════════════════════════════════════════════════════',
    '',
    `  DATE/TIME   : ${now}`,
    `  OUTPUT FILE : ${outputFilename}`,
    `  DURATION    : ${dur}`,
    `  RUN         : ${runNum} of ${totalRuns}`,
    '',
    '───────────────────────────────────────────────────────',
    '  INPUT',
    '───────────────────────────────────────────────────────',
    `  IMAGE       : ${selectedImageFilename}`,
    `  DIMENSIONS  : ${srcDim}`,
    `  SEED        : ${seed} (${seedMode})`,
    '',
    '───────────────────────────────────────────────────────',
    '  OUTPUT SETTINGS',
    '───────────────────────────────────────────────────────',
    `  RESOLUTION  : ${resolution.width}×${resolution.height}`,
    `  FRAME RATE  : ${fps} FPS`,
    `  WORKFLOW    : i2v_14B_2stage`,
    '',
    '───────────────────────────────────────────────────────',
    '  STAGE 1 — HIGH DETAIL PASS',
    '───────────────────────────────────────────────────────',
    `  DR34ML4Y    : ${lora.stage1.dr34mlayStr.toFixed(2)}`,
    `  K3NK        : ${lora.stage1.k3nkStr.toFixed(2)}`,
    `  CFG         : ${lora.stage1.cfg.toFixed(1)}`,
    `  STEPS       : ${lora.stage1.steps}  (end_at_step)`,
    '',
    '───────────────────────────────────────────────────────',
    '  STAGE 2 — REFINEMENT PASS',
    '───────────────────────────────────────────────────────',
    `  DR34ML4Y    : ${lora.stage2.dr34mlayStr.toFixed(2)}`,
    `  K3NK        : ${lora.stage2.k3nkStr.toFixed(2)}`,
    `  CFG         : ${lora.stage2.cfg.toFixed(1)}`,
    `  STEPS       : ${lora.stage2.steps}  (stage 2 duration)`,
    `  TOTAL STEPS : ${lora.stage1.steps + lora.stage2.steps}`,
    '',
    '═══════════════════════════════════════════════════════',
  ].join('\n');
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
goBtn.addEventListener('click', () => {
  if (isGenerating) return;

  if (!selectedImageFilename) {
    setStatus('No image loaded. Drop an image file before generating.', 'error');
    return;
  }

  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus('Prompt is empty. Enter a description before generating.', 'error');
    return;
  }

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
  const chaosPercent = parseInt(document.getElementById('chaos-pct').value, 10) || 0;
  let succeeded = 0, failed = 0;
  for (let i = 0; i < totalRunCount; i++) {
    currentRun = i + 1;
    const seed = (baseSeed === null)
      ? Math.floor(Math.random() * 9999999999)
      : baseSeed;
    const loraOverride = chaosPercent > 0 ? applyChaos(getLoraValues(), chaosPercent) : null;
    const ok = await startGeneration(seed, prompt, currentRun, totalRunCount, loraOverride, null, null, null, chaosPercent);
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
                         chaosApplied = 0) {
  return new Promise((resolve) => {
    const runPrefix = totalRuns > 1 ? `RUN ${runNum}/${totalRuns} — ` : '';
    const genStart  = Date.now();

    goBtn.textContent = totalRuns > 1 ? `RUN ${runNum}/${totalRuns}...` : 'RUNNING...';
    videoPlayer.style.display = 'none';
    videoPlayer.src = '';
    setProgress(0);
    setStatus(runPrefix + 'QUEUED — awaiting ComfyUI slot', 'generating');
    startClock();

    const lora       = loraValuesOverride || getLoraValues();
    const resolution = (widthOverride !== null && heightOverride !== null)
      ? { width: widthOverride, height: heightOverride }
      : getResolutionPreset();
    const fps        = fpsOverride !== null ? fpsOverride : getFrameRate();
    const saveSeedBtnEl = document.getElementById('save-seed-btn');
    if (saveSeedBtnEl) saveSeedBtnEl.style.display = 'none';

    window.ComfyClient.generate({
      imagePath:      selectedImageFilename,
      prompt,
      seed,
      workflowName:   'i2v_14B_2stage',
      loraValues:     lora,
      width:          resolution.width,
      height:         resolution.height,
      frameRate:      fps,
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
          const report    = buildReport({ outputFilename, seed, runNum, totalRuns, duration, lora, resolution, fps });
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
        setStatus(runPrefix + msg, 'error');
        setProgress(0);
        stopClock();
        resolve(false);
      },
      onLog: (type, msg) => appendLog(type, msg),
    });
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

  const stateColors = {
    idle:         'var(--ws-state-idle)',
    generating:   'var(--ws-state-generating)',
    done:         'var(--ws-state-done)',
    error:        'var(--ws-state-error)',
    disconnected: 'var(--ws-state-disconnected)',
  };

  progressFill.style.background = stateColors[state] || 'var(--ws-state-idle)';
}

// ─── CHAOS MATH ──────────────────────────────────────────────────────────────
// Dampener 0.3: at 100% chaos, max deviation = ±30% of [min,max] range
function chaosFloat(value, pct, min, max) {
  if (pct === 0) return value;
  const maxDev = (max - min) * (pct / 100) * 0.3;
  const delta  = (Math.random() * 2 - 1) * maxDev;
  return Math.max(min, Math.min(max, parseFloat((value + delta).toFixed(2))));
}

// Dampener 0.2: at 100% chaos, CFG deviates ±2.8
function chaosCfg(value, pct) {
  if (pct === 0) return value;
  const maxDev = 14 * (pct / 100) * 0.2;
  const delta  = (Math.random() * 2 - 1) * maxDev;
  return Math.max(1, Math.min(15, parseFloat((value + delta).toFixed(1))));
}

// Dampener 0.15: at 100% chaos, steps deviate ±9 — stays above motion-collapse threshold
function chaosSteps(value, pct) {
  if (pct === 0) return value;
  const maxDev = 60 * (pct / 100) * 0.15;
  const delta  = Math.round((Math.random() * 2 - 1) * maxDev);
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
  if (!queuePanel || !queueList) return;

  queuePanel.style.display = jobQueue.length > 0 ? 'block' : 'none';
  queueList.innerHTML = '';

  jobQueue.forEach((job, i) => {
    const card = document.createElement('div');
    card.className = 'queue-job-card';
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
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus('Prompt is empty. Enter a description before running the queue.', 'error');
    return;
  }
  if (!selectedImageFilename) {
    setStatus('No image loaded. Drop an image before running the queue.', 'error');
    return;
  }
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
  if (!addToQueueBtn) return;

  addToQueueBtn.addEventListener('click', addCurrentStateAsJob);

  if (runQueueBtn) {
    runQueueBtn.addEventListener('click', () => {
      if (!isGenerating) runQueue();
    });
  }

  if (queueClearBtn) {
    queueClearBtn.addEventListener('click', () => {
      jobQueue = jobQueue.filter(j => j.status === 'running');
      renderQueueUI();
    });
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
init();

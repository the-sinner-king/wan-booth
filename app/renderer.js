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
function buildReport({ outputFilename, seed, prompt, runNum, totalRuns, duration, lora, resolution, fps }) {
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
    `  PROMPT      : ${prompt}`,
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
  for (let i = 0; i < totalRunCount; i++) {
    currentRun = i + 1;
    const seed = (baseSeed === null)
      ? Math.floor(Math.random() * 9999999999)
      : baseSeed;

    const ok = await startGeneration(seed, prompt, currentRun, totalRunCount);
    if (!ok) break;
  }
  resetGenerateBtn();
}

// Returns a Promise that resolves true (complete) or false (error/abort)
function startGeneration(seed, prompt, runNum, totalRuns) {
  return new Promise((resolve) => {
    const runPrefix = totalRuns > 1 ? `RUN ${runNum}/${totalRuns} — ` : '';
    const genStart  = Date.now();

    goBtn.textContent = totalRuns > 1 ? `RUN ${runNum}/${totalRuns}...` : 'RUNNING...';
    videoPlayer.style.display = 'none';
    videoPlayer.src = '';
    setProgress(0);
    setStatus(runPrefix + 'QUEUED — awaiting ComfyUI slot', 'generating');
    startClock();

    const lora       = getLoraValues();
    const resolution = getResolutionPreset();
    const fps        = getFrameRate();

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

        // Write export report alongside the video
        try {
          const report    = buildReport({ outputFilename, seed, prompt, runNum, totalRuns, duration, lora, resolution, fps });
          const stem      = outputFilename.replace(/\.[^.]+$/, '');
          const rptPath   = homedir + '/Desktop/ComfyUI/output/' + stem + '_report.txt';
          await window.wan.writeReport(rptPath, report);
          appendLog('complete', 'Report → ' + stem + '_report.txt');
        } catch (err) {
          appendLog('error', 'Report write failed: ' + (err.message || err));
        }

        const outputPath = homedir + '/Desktop/ComfyUI/output/' + outputFilename;
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

// ─── INIT ─────────────────────────────────────────────────────────────────────
init();

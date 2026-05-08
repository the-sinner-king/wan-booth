const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

// ── Debug logger ───────────────────────────────────────────────────────────────
const DEBUG_LOG = path.join(os.tmpdir(), 'wan_booth_debug.log');
function dbg(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(DEBUG_LOG, line);
  process.stdout.write(line);
}

function getComfyDir() {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
}

// RF-01: allowlist for workflow names — no path traversal via IPC
const ALLOWED_WORKFLOW_NAME = /^[a-zA-Z0-9_-]{1,64}$/;
// RF-02: allowed image extensions + size cap
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

let mainWindow;
let comfyProcess;
let comfyOwnedByApp = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  if (process.env.NODE_ENV !== 'production') mainWindow.webContents.openDevTools();
}

// RF-07: check if ComfyUI is already running before spawning
function isComfyUIRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8188/system_stats', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function startComfyUI() {
  const already = await isComfyUIRunning();
  if (already) return; // user's own ComfyUI is running — don't spawn a duplicate

  const isMac    = process.platform === 'darwin';
  // COMFYUI_DIR env var overrides default — set it on Windows if ComfyUI isn't at Desktop/ComfyUI
  const comfyDir = getComfyDir();
  // Platform-specific venv layout: Mac = venv/bin/python, Windows = .venv/Scripts/python.exe
  const pythonPath = isMac
    ? path.join(comfyDir, 'venv', 'bin', 'python')
    : path.join(comfyDir, '.venv', 'Scripts', 'python.exe');
  // --bf16-unet: Mac MPS only — casts FP8 model weights to BF16 (MPS doesn't support Float8_e4m3fn)
  // CUDA supports FP8 natively — flag is unnecessary and wasteful on PC
  const spawnArgs = ['main.py', '--listen', '127.0.0.1'];
  if (isMac) {
    spawnArgs.push('--bf16-unet');
  } else {
    spawnArgs.push('--reserve-vram', '1');
  }
  comfyProcess = spawn(pythonPath, spawnArgs, {
    cwd: comfyDir,
    env: {
      ...process.env,
      // PYTORCH_MPS_HIGH_WATERMARK_RATIO: Mac MPS only — raise MPS ceiling without removing safety floor
      ...(isMac
        ? { PYTORCH_MPS_HIGH_WATERMARK_RATIO: '0.7' }
        : { PYTORCH_ALLOC_CONF: 'expandable_segments:True' }
      ),
    },
    stdio: ['ignore', 'pipe', 'pipe'], // RF-S259-07: pipe stdout/stderr so crashes are visible in debug log
    detached: false,
  });
  comfyOwnedByApp = true;
  comfyProcess.stdout.on('data', d => dbg('ComfyUI: ' + d.toString().trimEnd()));
  comfyProcess.stderr.on('data', d => dbg('ComfyUI stderr: ' + d.toString().trimEnd()));
  comfyProcess.on('exit', (code, signal) => dbg('ComfyUI exited code=' + code + ' signal=' + signal));
  comfyProcess.on('error', () => { comfyOwnedByApp = false; });
}

app.whenReady().then(async () => {
  await startComfyUI();
  createWindow();
});

app.on('before-quit', () => {
  // RF-07: only kill what we spawned
  if (comfyOwnedByApp && comfyProcess && !comfyProcess.killed) {
    comfyProcess.kill('SIGTERM');
    setTimeout(() => {
      if (comfyProcess && !comfyProcess.killed) comfyProcess.kill('SIGKILL');
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──────────────────────────────────────────────────────────────
ipcMain.on('wan:log', (event, msg) => dbg('[RENDERER] ' + msg));

ipcMain.handle('wan:selectImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('wan:copyToInput', async (event, sourcePath) => {
  dbg('copyToInput: ' + sourcePath);
  // RF-02: validate input before touching the filesystem
  if (typeof sourcePath !== 'string' || !sourcePath) throw new Error('Invalid source path');
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) throw new Error('File is not an allowed image type (.jpg/.jpeg/.png/.webp)');

  let stat;
  // RF-G: lstatSync — symlinks to regular files would pass statSync's isFile() check;
  // lstat sees the link itself, rejecting it before copyFileSync follows it anywhere
  try { stat = fs.lstatSync(sourcePath); } catch { throw new Error('Source file not accessible'); }
  if (!stat.isFile()) throw new Error('Source path is not a regular file (symlinks not allowed)');
  if (stat.size > MAX_IMAGE_BYTES) throw new Error('Image exceeds 50 MB size limit');

  // Mirror startComfyUI's COMFYUI_DIR override — was hardcoded to Mac default, broke PC where ComfyUI lives elsewhere
  const comfyDir = getComfyDir();
  const comfyInputDir = path.join(comfyDir, 'input');
  fs.mkdirSync(comfyInputDir, { recursive: true });
  const filename = path.basename(sourcePath);
  const destPath = path.join(comfyInputDir, filename);
  fs.copyFileSync(sourcePath, destPath);

  // Read image dimensions so the renderer can auto-suggest resolution presets
  let width = null, height = null;
  try {
    const img = nativeImage.createFromPath(sourcePath);
    if (!img.isEmpty()) {
      const size = img.getSize();
      width  = size.width  || null;
      height = size.height || null;
    }
  } catch {}

  return { filename, width, height };
});

ipcMain.handle('wan:getComfyStatus', async () => {
  return new Promise((resolve) => {
    // RF-F: use 127.0.0.1 to match isComfyUIRunning — localhost can resolve to ::1 on some systems
    const req = http.get('http://127.0.0.1:8188/system_stats', (res) => {
      resolve({ alive: res.statusCode === 200 });
    });
    req.on('error', () => resolve({ alive: false }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ alive: false }); });
  });
});

ipcMain.handle('wan:getHomedir', async () => {
  return os.homedir();
});

ipcMain.handle('wan:getComfyDir', async () => {
  return getComfyDir();
});

ipcMain.handle('wan:loadWorkflow', async (event, workflowName) => {
  dbg('loadWorkflow: ' + workflowName);
  // RF-01/B04: allowlist name + dereference symlinks before prefix check
  if (!ALLOWED_WORKFLOW_NAME.test(workflowName)) throw new Error('Invalid workflow name');
  const workflowsDir = path.resolve(__dirname, 'workflows');
  const workflowPath = path.resolve(workflowsDir, workflowName + '.json');
  if (!workflowPath.startsWith(workflowsDir + path.sep)) throw new Error('Workflow path escape');
  // Resolve any symlinks on both sides so a symlinked file can't escape the directory
  let realPath, realBase;
  try { realPath = fs.realpathSync(workflowPath); } catch { throw new Error('Workflow not found'); }
  try { realBase = fs.realpathSync(workflowsDir); } catch { throw new Error('Workflow dir not found'); }
  if (!realPath.startsWith(realBase + path.sep)) throw new Error('Workflow symlink escape');
  const raw = fs.readFileSync(realPath, 'utf8');
  dbg('loadWorkflow: loaded ' + realPath + ' (' + raw.length + ' bytes)');
  return JSON.parse(raw);
});

ipcMain.handle('wan:toFileURL', async (event, filePath) => {
  // RF-08: use pathToFileURL so spaces and unicode in homedir are properly encoded
  return pathToFileURL(filePath).href;
});

// RF-S259-04/05: accept filename token only — main.js constructs full path (no traversal possible)
ipcMain.handle('wan:writeReport', async (event, { filename, content }) => {
  if (typeof filename !== 'string' || !/^[A-Za-z0-9._\-]{1,200}$/.test(filename)) throw new Error('Invalid report filename');
  if (typeof content !== 'string') throw new Error('Invalid report content');
  // Mirror startComfyUI's COMFYUI_DIR override — was hardcoded to Mac default
  const comfyDir = getComfyDir();
  const outputDir = path.join(comfyDir, 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  dbg('writeReport: ' + filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true };
});

// Route POST /prompt through the main process so there is no Origin header.
// ComfyUI 0.3+ blocks fetch() from file:// renderers with 403 (null origin).
// Node.js http.request carries no Origin header — ComfyUI accepts it unconditionally.
ipcMain.handle('wan:queuePrompt', async (event, payload) => {
  dbg('queuePrompt: client_id=' + payload.client_id);
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8188,
      path: '/prompt',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        dbg('queuePrompt response: HTTP ' + res.statusCode + ' body=' + data.slice(0, 200));
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', (err) => {
      dbg('queuePrompt error: ' + err.message);
      reject(err);
    });
    req.write(body);
    req.end();
  });
});

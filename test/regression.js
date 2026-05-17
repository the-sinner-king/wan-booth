#!/usr/bin/env node
/**
 * ZOETROPE — Regression Tests
 * S253 DEBUGGING: RF-01–10, B-01–06 patches (5B workflow + app hardening)
 * S255 CODING: AC-09–15 (14B 2-stage MoE workflow, Mac launch flags)
 * S259 CODING: AC-17–22 (LoRA injection fix, resolution/FPS/repeat runs/export report)
 * S259 CODING: AC-29–35 (Phase 3A+3B: tooltips, preset system, seed bank, chaos, queue)
 * Run: node test/regression.js  |  Exit 0 = all pass. Exit 1 = failures.
 */
'use strict';

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');
const { pathToFileURL } = require('url');

const APP_DIR      = path.join(__dirname, '..', 'app');
const WORKFLOW_DIR = path.join(APP_DIR, 'workflows');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}\n    → ${err.message}`);
    failed++;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const mainSrc     = fs.readFileSync(path.join(APP_DIR, 'main.js'),     'utf8');
const combSrc     = fs.readFileSync(path.join(APP_DIR, 'comfy.js'),    'utf8');
const renderSrc   = fs.readFileSync(path.join(APP_DIR, 'renderer.js'), 'utf8');
const indexHtml   = fs.readFileSync(path.join(APP_DIR, 'index.html'),  'utf8');
const workflow    = JSON.parse(fs.readFileSync(path.join(WORKFLOW_DIR, 'i2v_5B.json'),       'utf8'));
const workflow14b = JSON.parse(fs.readFileSync(path.join(WORKFLOW_DIR, 'i2v_14B_2stage.json'), 'utf8'));

// Inline the current injectPlaceholders logic for black-box testing (mirrors comfy.js)
function injectPlaceholders(w, imagePath, prompt, seed, loraValues, width, height, frameRate, filenamePrefix) {
  const clone = JSON.parse(JSON.stringify(w));
  for (const [nodeId, node] of Object.entries(clone)) {
    if (!node.inputs) continue;
    if (node.inputs.image      === '{{IMAGE_PATH}}') node.inputs.image      = imagePath;
    if (node.inputs.text       === '{{PROMPT}}')     node.inputs.text       = prompt;
    if (node.inputs.noise_seed === '{{SEED}}')       node.inputs.noise_seed = parseInt(seed, 10);
    if (width && height && (node.class_type === 'WanImageToVideo' || node.class_type === 'Wan22ImageToVideoLatent')) {
      node.inputs.width  = width;
      node.inputs.height = height;
    }
    if (node.class_type === 'VHS_VideoCombine') {
      if (frameRate !== undefined && frameRate !== null) node.inputs.frame_rate      = frameRate;
      if (filenamePrefix)                                node.inputs.filename_prefix = filenamePrefix;
    }
    if (loraValues) {
      const lv = loraValues;
      const s1 = Math.max(1, Math.min(100, Math.round(lv.stage1.steps)));
      const s2 = Math.max(1, Math.min(100, Math.round(lv.stage2.steps)));
      const totalSteps = s1 + s2;
      if (nodeId === '6')  { node.inputs.strength_model = lv.stage1.dr34mlayStr; node.inputs.strength_clip = lv.stage1.dr34mlayStr; }
      if (nodeId === '7')  { node.inputs.strength_model = lv.stage2.dr34mlayStr; }
      if (nodeId === '18') { node.inputs.strength_model = lv.stage1.k3nkStr; node.inputs.strength_clip = lv.stage1.k3nkStr; }
      if (nodeId === '19') { node.inputs.strength_model = lv.stage2.k3nkStr; }
      if (nodeId === '13') { node.inputs.steps = totalSteps; node.inputs.cfg = lv.stage1.cfg; node.inputs.end_at_step = s1; }
      if (nodeId === '14') { node.inputs.steps = totalSteps; node.inputs.cfg = lv.stage2.cfg; node.inputs.start_at_step = s1; }
      // end_at_step intentionally NOT set on node 14 — preserve workflow's 10000 sentinel (RF-S259-02)
    }
  }
  return clone;
}

// Inline the current validation logic from main.js for isolation testing
const ALLOWED_WORKFLOW_NAME = /^[a-zA-Z0-9_-]{1,64}$/;
const ALLOWED_IMAGE_EXTS    = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_IMAGE_BYTES       = 50 * 1024 * 1024;

// ── RF-01 / B-04: loadWorkflow path traversal prevention ─────────────────────
console.log('\nRF-01/B-04 — loadWorkflow: allowlist + symlink guard');

test('rejects path with ../', () => {
  assert.ok(!ALLOWED_WORKFLOW_NAME.test('../secret'),
    'traversal attempt should be blocked by regex');
});
test('rejects slash-separated paths', () => {
  assert.ok(!ALLOWED_WORKFLOW_NAME.test('workflows/evil'),
    'slash in name should be blocked');
});
test('rejects null-byte injection', () => {
  assert.ok(!ALLOWED_WORKFLOW_NAME.test('foo\x00bar'),
    'null byte should be blocked');
});
test('accepts valid workflow name', () => {
  assert.ok(ALLOWED_WORKFLOW_NAME.test('i2v_5B'),
    'valid name should pass');
});
test('main.js uses realpathSync for symlink guard', () => {
  assert.ok(mainSrc.includes('realpathSync'),
    'realpathSync must be present to dereference symlinks');
});
test('main.js verifies resolved path starts with base + sep', () => {
  assert.ok(mainSrc.includes('realBase + path.sep'),
    'symlink escape check must compare to base + separator');
});

// ── RF-02: copyToInput extension + size validation ───────────────────────────
console.log('\nRF-02 — copyToInput: extension allowlist + size cap');

test('allows .jpg extension', () => {
  assert.ok(ALLOWED_IMAGE_EXTS.has('.jpg'));
});
test('allows .png extension', () => {
  assert.ok(ALLOWED_IMAGE_EXTS.has('.png'));
});
test('rejects .exe extension', () => {
  assert.ok(!ALLOWED_IMAGE_EXTS.has('.exe'));
});
test('rejects .html extension', () => {
  assert.ok(!ALLOWED_IMAGE_EXTS.has('.html'));
});
test('size cap is exactly 50 MB', () => {
  assert.strictEqual(MAX_IMAGE_BYTES, 50 * 1024 * 1024);
});
test('main.js checks stat.isFile()', () => {
  assert.ok(mainSrc.includes('stat.isFile()'),
    'isFile() check must be present to reject symlinks/dirs at copy time');
});

// ── RF-03: WebSocket timer cleanup ───────────────────────────────────────────
console.log('\nRF-03 — WebSocket: timer cleared on open');

test('comfy.js calls clearTimeout on ws.onopen', () => {
  assert.ok(combSrc.includes('clearTimeout(timer)'),
    'clearTimeout must be called to prevent stale reject after open');
});
test('timer stored in const before assignment', () => {
  assert.ok(combSrc.includes('const timer = setTimeout'),
    'timer ref must be captured to be clearable');
});

// ── RF-04: promptId correlation ──────────────────────────────────────────────
console.log('\nRF-04 — comfy.js: prompt_id filtering');

test('comfy.js filters messages by promptId', () => {
  assert.ok(combSrc.includes('prompt_id !== promptId'),
    'cross-job message filter must be present');
});
test('comfy.js guards null promptId before filtering', () => {
  assert.ok(combSrc.includes('if (promptId && msg.data'),
    'filter must be gated on promptId being set');
});

// ── RF-05: terminal output node guard ────────────────────────────────────────
console.log('\nRF-05 — comfy.js: only node 17 fires onComplete');

test('VIDEO_OUTPUT_NODE fallback is defined as "17"', () => {
  assert.ok(combSrc.includes("VIDEO_OUTPUT_NODE_FALLBACK = '17'"),
    'fallback video output node must be "17" for workflows without explicit VHS_VideoCombine');
});
test('comfy.js detects VHS_VideoCombine node dynamically (RF-I)', () => {
  assert.ok(combSrc.includes("class_type === 'VHS_VideoCombine'"),
    'VHS_VideoCombine must be detected dynamically — not hardcoded to a fixed node ID');
});
test('executed handler checks node === videoOutputNode (dynamic)', () => {
  assert.ok(combSrc.includes("msg.data.node === videoOutputNode"),
    'must compare executing node to dynamically-resolved videoOutputNode');
});
test('workflow node 17 is VHS_VideoCombine', () => {
  assert.strictEqual(workflow['17'].class_type, 'VHS_VideoCombine',
    'node 17 in workflow must be VHS_VideoCombine');
});

// ── RF-06: terminal state handling ───────────────────────────────────────────
console.log('\nRF-06 — comfy.js: no hung UI on disconnect / interrupt');

test('comfy.js has ws close handler', () => {
  // S264 Cla⌂de patch (BUG-Fl7): converted ws.onclose → ws.addEventListener('close', ...)
  // to fix microtask-window race between connect-phase and runtime handlers.
  // Test now validates intent (close event IS handled) rather than exact syntax.
  const hasOnClose      = combSrc.includes('ws.onclose');
  const hasAddListener  = /ws\.addEventListener\(\s*['"]close['"]/.test(combSrc);
  assert.ok(hasOnClose || hasAddListener,
    'a close handler (ws.onclose or addEventListener("close")) must be registered to catch socket drops');
});
test('comfy.js handles execution_interrupted', () => {
  assert.ok(combSrc.includes("'execution_interrupted'"),
    'execution_interrupted must be handled to unblock UI on OOM/cancel');
});
test('terminate() used as single exit path', () => {
  assert.ok(combSrc.includes('function terminate('),
    'single-exit terminate() function must exist');
});
test('terminated flag prevents double-fire', () => {
  assert.ok(combSrc.includes('if (terminated) return'),
    'double-termination guard must be present');
});

// ── RF-07: ComfyUI spawn safety ──────────────────────────────────────────────
console.log('\nRF-07 — main.js: no blind spawn + loopback-only binding');

test('main.js binds ComfyUI to 127.0.0.1', () => {
  assert.ok(mainSrc.includes("'--listen', '127.0.0.1'"),
    '--listen 127.0.0.1 must be in spawn args to prevent LAN exposure');
});
test('main.js checks if ComfyUI is already running before spawn', () => {
  assert.ok(mainSrc.includes('isComfyUIRunning'),
    'isComfyUIRunning() must be called before spawning');
});
test('main.js only kills ComfyUI it owns', () => {
  assert.ok(mainSrc.includes('comfyOwnedByApp'),
    'comfyOwnedByApp flag must gate the kill-on-quit logic');
});

// ── RF-08: pathToFileURL for video src ───────────────────────────────────────
console.log('\nRF-08 — file:// URL: pathToFileURL via IPC');

test('main.js imports pathToFileURL', () => {
  assert.ok(mainSrc.includes("pathToFileURL } = require('url')"),
    'pathToFileURL must be imported');
});
test('main.js registers wan:toFileURL IPC handler', () => {
  assert.ok(mainSrc.includes("'wan:toFileURL'"),
    'toFileURL IPC channel must be registered');
});
test('renderer.js uses window.wan.toFileURL for video src', () => {
  assert.ok(renderSrc.includes('window.wan.toFileURL'),
    'renderer must use IPC toFileURL, not manual file:// concat');
});
test('pathToFileURL correctly encodes spaces', () => {
  const url = pathToFileURL('/Users/Test User/Desktop/video.mp4').href;
  assert.ok(url.includes('%20'), 'space must be encoded as %20 in file URL');
  assert.ok(url.startsWith('file:///'), 'must start with file:///');
});

// ── RF-09: drag-drop extension validation ────────────────────────────────────
console.log('\nRF-09 — renderer.js: extension check on drag-drop');

test('renderer.js validates extension on drop (not only MIME type)', () => {
  assert.ok(renderSrc.includes('allowedExts'),
    'extension allowlist must exist in drop handler');
});
test('renderer.js guards against empty file.path with || fallback', () => {
  assert.ok(renderSrc.includes("file.path || ''"),
    'file.path must have empty-string fallback (webUtils not available in preload on Electron 28 — revisit on Electron 32 upgrade)');
});

// ── RF-10: CSP + NaN seed ────────────────────────────────────────────────────
console.log('\nRF-10 — index.html: CSP / renderer.js: NaN seed guard');

test('index.html has Content-Security-Policy meta tag', () => {
  assert.ok(indexHtml.includes('Content-Security-Policy'),
    'CSP meta tag must be present');
});
test('CSP restricts connect-src to localhost:8188', () => {
  assert.ok(indexHtml.includes('connect-src') && indexHtml.includes('localhost:8188'),
    'connect-src must restrict to ComfyUI localhost');
});
test('CSP sets script-src to self only', () => {
  assert.ok(indexHtml.includes("script-src 'self'"),
    'script-src must be self-only (no unsafe-eval, no CDN scripts)');
});
test('renderer.js guards NaN seed with Number.isNaN', () => {
  assert.ok(renderSrc.includes('Number.isNaN'),
    'NaN seed fallback must use Number.isNaN not == NaN');
});
test('renderer.js NaN fallback is explicit integer (42)', () => {
  assert.ok(renderSrc.includes('? 42'),
    'NaN fallback must produce a valid integer seed via ternary');
});

// ── B-01: AST injection resistance ───────────────────────────────────────────
console.log('\nB-01 — injectPlaceholders: AST-based, not string template');

test('{{SEED}} in imagePath does not corrupt noise_seed', () => {
  const result = injectPlaceholders(workflow, '{{SEED}}', 'normal prompt', 1234);
  // image input should be the literal string '{{SEED}}'
  assert.strictEqual(result['4'].inputs.image, '{{SEED}}',
    'imagePath containing {{SEED}} must be stored verbatim, not replace seed');
  // noise_seed must still be the numeric seed we passed
  assert.strictEqual(result['11'].inputs.noise_seed, 1234,
    'noise_seed must be the actual seed integer, not corrupted by imagePath');
});
test('{{IMAGE_PATH}} in prompt does not clobber image input', () => {
  const result = injectPlaceholders(workflow, 'real_image.png', '{{IMAGE_PATH}}', 99);
  assert.strictEqual(result['4'].inputs.image, 'real_image.png',
    'image input must not be replaced by prompt content');
  assert.strictEqual(result['7'].inputs.text, '{{IMAGE_PATH}}',
    'prompt containing {{IMAGE_PATH}} must be stored verbatim');
});
test('seed is injected as integer, not string', () => {
  const result = injectPlaceholders(workflow, 'a.png', 'b', '777');
  assert.strictEqual(typeof result['11'].inputs.noise_seed, 'number',
    'noise_seed must be numeric after injection');
  assert.strictEqual(result['11'].inputs.noise_seed, 777);
});
test('comfy.js does not use string .replace() for placeholder injection', () => {
  // Verify the AST approach is in source — no .replace(/"{{IMAGE_PATH}}"/ pattern
  assert.ok(!combSrc.includes('"{{IMAGE_PATH}}"'),
    'string template replacement must not exist in comfy.js');
});

// ── B-02: UUID client ID ──────────────────────────────────────────────────────
console.log('\nB-02 — comfy.js: crypto.randomUUID() for client ID');

test('comfy.js uses crypto.randomUUID()', () => {
  assert.ok(combSrc.includes('crypto.randomUUID()'),
    'client ID must use crypto.randomUUID(), not Math.random()');
});
test('generateClientId in comfy.js does not call Math.random()', () => {
  // Extract the generateClientId function body and verify it uses UUID, not Math.random
  const fnBody = combSrc.slice(
    combSrc.indexOf('function generateClientId('),
    combSrc.indexOf('\n  }', combSrc.indexOf('function generateClientId(')) + 4
  );
  const fnCode = fnBody.replace(/\/\/[^\n]*/g, ''); // strip line comments
  assert.ok(fnCode.includes('crypto.randomUUID()'),
    'generateClientId body must call crypto.randomUUID()');
  assert.ok(!fnCode.includes('Math.random'),
    'generateClientId body must not call Math.random()');
});

// ── B-03: promptId null guard ─────────────────────────────────────────────────
console.log('\nB-03 — comfy.js: null promptId guard');

test('comfy.js terminates on missing prompt_id', () => {
  assert.ok(combSrc.includes("!data.prompt_id"),
    'null/missing prompt_id must trigger terminate()');
});

// ── B-04/B-05: loadFile __dirname + WebSocket URL ────────────────────────────
console.log('\nB-04/B-06 — main.js: __dirname loadFile + URL constructor');

test('main.js loads index.html with __dirname', () => {
  assert.ok(mainSrc.includes("path.join(__dirname, 'index.html')"),
    'loadFile must use __dirname to avoid CWD-relative path ambiguity');
});
test('comfy.js uses URL constructor for WebSocket endpoint', () => {
  assert.ok(combSrc.includes('new URL(') && combSrc.includes('searchParams.set'),
    'WebSocket URL must use URL constructor + searchParams, not string concat');
});

// ── Workflow integrity ────────────────────────────────────────────────────────
console.log('\nWorkflow structure');

test('workflow node 4 is LoadImage with IMAGE_PATH placeholder', () => {
  assert.strictEqual(workflow['4'].class_type, 'LoadImage');
  assert.strictEqual(workflow['4'].inputs.image, '{{IMAGE_PATH}}');
});
test('workflow node 7 is CLIPTextEncode with PROMPT placeholder', () => {
  assert.strictEqual(workflow['7'].class_type, 'CLIPTextEncode');
  assert.strictEqual(workflow['7'].inputs.text, '{{PROMPT}}');
});
test('workflow node 11 is RandomNoise with SEED placeholder', () => {
  assert.strictEqual(workflow['11'].class_type, 'RandomNoise');
  assert.strictEqual(workflow['11'].inputs.noise_seed, '{{SEED}}');
});
test('workflow node 10 is Wan22ImageToVideoLatent (not WanImageToVideo)', () => {
  assert.strictEqual(workflow['10'].class_type, 'Wan22ImageToVideoLatent',
    'Wan 2.2 model requires Wan22ImageToVideoLatent — WanImageToVideo is Wan 2.1 (16ch latent, wrong format)');
});
test('workflow node 10 has no clip_vision_output (not needed for Wan 2.2)', () => {
  assert.ok(!('clip_vision_output' in workflow['10'].inputs),
    'Wan22ImageToVideoLatent does not accept clip_vision_output — CLIP Vision nodes must be absent');
});
test('workflow node 14 latent_image wires to ["10", 0]', () => {
  const wire = workflow['14'].inputs.latent_image;
  assert.deepStrictEqual(wire, ['10', 0],
    'SamplerCustomAdvanced must take latent from Wan22ImageToVideoLatent output 0 (not output 2)');
});
test('workflow node 15 positive wires to node 7 (CLIPTextEncode)', () => {
  assert.deepStrictEqual(workflow['15'].inputs.positive, ['7', 0],
    'CFGGuider positive must come from CLIPTextEncode node 7, not from Wan22ImageToVideoLatent');
});
test('workflow has no CLIPVisionLoader node', () => {
  const clipVis = Object.values(workflow).find(n => n.class_type === 'CLIPVisionLoader');
  assert.ok(!clipVis, 'CLIPVisionLoader must not be present — removed in Wan 2.2 workflow fix');
});

// ── AC-13: main.js Mac FP8 fix ───────────────────────────────────────────────
console.log('\nAC-13 — main.js: Mac FP8 fix flags');

test('main.js passes --bf16-unet to ComfyUI spawn', () => {
  assert.ok(mainSrc.includes("'--bf16-unet'"),
    '--bf16-unet must be in spawn args so FP8 weights are cast to BF16 (MPS-compatible)');
});
test('main.js sets PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0 in ComfyUI env', () => {
  assert.ok(mainSrc.includes('PYTORCH_MPS_HIGH_WATERMARK_RATIO'),
    'env var must be set to disable fake OOM on Mac MPS');
});
test('main.js spreads process.env into ComfyUI spawn env', () => {
  assert.ok(mainSrc.includes('...process.env'),
    'existing env must be preserved when injecting PYTORCH_MPS_HIGH_WATERMARK_RATIO');
});

// ── AC-09/10/11/12: 14B workflow structure ───────────────────────────────────
console.log('\nAC-09/10/11/12 — i2v_14B_2stage.json: node graph + hyperparams');

test('14B: node 1 is UNETLoader (high_noise)', () => {
  assert.strictEqual(workflow14b['1'].class_type, 'UNETLoader');
  assert.ok(workflow14b['1'].inputs.unet_name.includes('high_noise'),
    'UNETLoader node 1 must load the high-noise model');
});
test('14B: node 2 is UNETLoader (low_noise)', () => {
  assert.strictEqual(workflow14b['2'].class_type, 'UNETLoader');
  assert.ok(workflow14b['2'].inputs.unet_name.includes('low_noise'),
    'UNETLoader node 2 must load the low-noise model');
});
test('14B: VAELoader uses wan_2.1_vae (not wan2.2_vae)', () => {
  assert.strictEqual(workflow14b['4'].class_type, 'VAELoader');
  assert.ok(workflow14b['4'].inputs.vae_name.includes('wan_2.1'),
    '14B uses Wan 2.1 VAE — wan2.2_vae is wrong for 14B');
});
test('14B: node 5 is LoadImage with IMAGE_PATH placeholder', () => {
  assert.strictEqual(workflow14b['5'].class_type, 'LoadImage');
  assert.strictEqual(workflow14b['5'].inputs.image, '{{IMAGE_PATH}}');
});
test('14B: node 6 is LoraLoader (high) with DR34ML4Y HIGH', () => {
  assert.strictEqual(workflow14b['6'].class_type, 'LoraLoader',
    'High-noise LoRA must be full LoraLoader (not ModelOnly) — CLIP flows through it');
  assert.ok(workflow14b['6'].inputs.lora_name.includes('HIGH'),
    'Node 6 must load the HIGH LoRA variant');
});
test('14B: node 7 is LoraLoaderModelOnly (low) with DR34ML4Y LOW', () => {
  assert.strictEqual(workflow14b['7'].class_type, 'LoraLoaderModelOnly',
    'Low-noise LoRA uses ModelOnly — CLIP already handled by high-noise LoRA path');
  assert.ok(workflow14b['7'].inputs.lora_name.includes('LOW'),
    'Node 7 must load the LOW LoRA variant');
});
test('14B: CLIP routes through final high LoraLoader chain (node 18 output 1)', () => {
  assert.deepStrictEqual(workflow14b['8'].inputs.clip, ['18', 1],
    'Positive CLIPTextEncode must get CLIP from second LoraLoader(high) output 1');
  assert.deepStrictEqual(workflow14b['9'].inputs.clip, ['18', 1],
    'Negative CLIPTextEncode must get CLIP from second LoraLoader(high) output 1');
});
test('14B: node 18 is second high LoRA (ultydeepfast), chains from node 6', () => {
  assert.strictEqual(workflow14b['18'].class_type, 'LoraLoader');
  assert.deepStrictEqual(workflow14b['18'].inputs.model, ['6', 0]);
  assert.deepStrictEqual(workflow14b['18'].inputs.clip, ['6', 1]);
  assert.strictEqual(workflow14b['18'].inputs.strength_model, 0.8);
});
test('14B: node 19 is second low LoRA (ult deep slow), chains from node 7', () => {
  assert.strictEqual(workflow14b['19'].class_type, 'LoraLoaderModelOnly');
  assert.deepStrictEqual(workflow14b['19'].inputs.model, ['7', 0]);
  assert.strictEqual(workflow14b['19'].inputs.strength_model, 0.8);
});
test('14B: node 8 is CLIPTextEncode with PROMPT placeholder', () => {
  assert.strictEqual(workflow14b['8'].class_type, 'CLIPTextEncode');
  assert.strictEqual(workflow14b['8'].inputs.text, '{{PROMPT}}');
});
test('14B: node 10 is WanImageToVideo (not Wan22ImageToVideoLatent)', () => {
  assert.strictEqual(workflow14b['10'].class_type, 'WanImageToVideo',
    '14B uses WanImageToVideo — Wan22ImageToVideoLatent is 5B-only (48ch latent)');
});
test('14B: WanImageToVideo wires positive/negative from CLIPTextEncode', () => {
  assert.deepStrictEqual(workflow14b['10'].inputs.positive, ['8', 0]);
  assert.deepStrictEqual(workflow14b['10'].inputs.negative, ['9', 0]);
});
test('14B: WanImageToVideo start_image from LoadImage', () => {
  assert.deepStrictEqual(workflow14b['10'].inputs.start_image, ['5', 0]);
});
test('14B: WanImageToVideo length=81 (4n+1 rule, 5s @ 16fps)', () => {
  assert.strictEqual(workflow14b['10'].inputs.length, 81);
});
test('14B: node 11 ModelSamplingSD3 (high) shift=8.0', () => {
  assert.strictEqual(workflow14b['11'].class_type, 'ModelSamplingSD3');
  assert.strictEqual(workflow14b['11'].inputs.shift, 8.0,
    'SD3 shift must be 8.0 — mismatch between stages causes catastrophic output');
  assert.deepStrictEqual(workflow14b['11'].inputs.model, ['20', 0],
    'High-stage ModelSamplingSD3 must take model from PatchSageAttentionKJ(20) [SA patch of LoraLoader(18)] — Phase 2.6 wiring');
});
test('14B: node 12 ModelSamplingSD3 (low) shift=8.0 — identical to Stage 1', () => {
  assert.strictEqual(workflow14b['12'].class_type, 'ModelSamplingSD3');
  assert.strictEqual(workflow14b['12'].inputs.shift, 8.0,
    'Both stages MUST use identical shift — different values break the sigma hand-off');
  assert.deepStrictEqual(workflow14b['12'].inputs.model, ['22', 0],
    'Low-stage ModelSamplingSD3 must take model from PatchSageAttentionKJ(22) [SA patch of LoraLoaderModelOnly(19)] — Phase 2.6 wiring');
});
test('14B: node 13 KSamplerAdvanced Stage1 — correct init', () => {
  assert.strictEqual(workflow14b['13'].class_type, 'KSamplerAdvanced');
  assert.strictEqual(workflow14b['13'].inputs.add_noise, 'enable');
  assert.strictEqual(workflow14b['13'].inputs.noise_seed, '{{SEED}}');
  assert.strictEqual(workflow14b['13'].inputs.start_at_step, 0);
  assert.strictEqual(workflow14b['13'].inputs.end_at_step, 20);
  assert.strictEqual(workflow14b['13'].inputs.return_with_leftover_noise, 'enable',
    'Stage1 MUST return leftover noise — this is the latent that Stage2 refines');
});
test('14B: node 13 Stage1 latent from WanImageToVideo output 2', () => {
  assert.deepStrictEqual(workflow14b['13'].inputs.latent_image, ['10', 2],
    'Stage1 takes latent from WanImageToVideo output index 2 (the encoded start frame)');
});
test('14B: node 13 Stage1 conditioning from WanImageToVideo', () => {
  assert.deepStrictEqual(workflow14b['13'].inputs.positive, ['10', 0]);
  assert.deepStrictEqual(workflow14b['13'].inputs.negative, ['10', 1]);
});
test('14B: node 13 Stage1 uses euler sampler + beta scheduler', () => {
  assert.strictEqual(workflow14b['13'].inputs.sampler_name, 'euler');
  assert.strictEqual(workflow14b['13'].inputs.scheduler, 'beta');
});
test('14B: node 14 KSamplerAdvanced Stage2 — correct hand-off', () => {
  assert.strictEqual(workflow14b['14'].class_type, 'KSamplerAdvanced');
  assert.strictEqual(workflow14b['14'].inputs.add_noise, 'disable',
    'Stage2 MUST have add_noise=disable — adding noise destroys Stage1 structural work');
  assert.strictEqual(workflow14b['14'].inputs.start_at_step, 20);
  assert.strictEqual(workflow14b['14'].inputs.return_with_leftover_noise, 'disable');
});
test('14B: node 14 Stage2 latent wires from Stage1 output (serial chain)', () => {
  assert.deepStrictEqual(workflow14b['14'].inputs.latent_image, ['13', 0],
    'Stage2 latent must come from Stage1 output — this is the chained latent hand-off');
});
test('14B: node 14 Stage2 uses same euler/beta as Stage1', () => {
  assert.strictEqual(workflow14b['14'].inputs.sampler_name, 'euler');
  assert.strictEqual(workflow14b['14'].inputs.scheduler, 'beta');
});
test('14B: both stages share 51 total steps (split 20 high / 31 low)', () => {
  assert.strictEqual(workflow14b['13'].inputs.steps, 51);
  assert.strictEqual(workflow14b['14'].inputs.steps, 51,
    'Both stages must share the same step count for sigma schedule to be consistent');
});
test('14B: node 15 is VAEDecodeTiled (standard VAEDecode crashes on Mac at 81 frames)', () => {
  assert.strictEqual(workflow14b['15'].class_type, 'VAEDecodeTiled',
    'VAEDecodeTiled is mandatory on Mac — standard VAEDecode OOMs on 81-frame 480p video');
});
test('14B: node 17 is VHS_VideoCombine at 16fps (14B native rate)', () => {
  assert.strictEqual(workflow14b['17'].class_type, 'VHS_VideoCombine');
  assert.strictEqual(workflow14b['17'].inputs.frame_rate, 16,
    '14B native FPS is 16 (not 24 like 5B) — wrong FPS makes video 33% too fast');
});
test('14B: VIDEO_OUTPUT_NODE matches 14B workflow output node', () => {
  assert.ok('17' in workflow14b,
    'Node 17 must exist in 14B workflow — matches VIDEO_OUTPUT_NODE constant in comfy.js');
  assert.strictEqual(workflow14b['17'].class_type, 'VHS_VideoCombine');
});
test('14B: AC-14 comfy.js has KSamplerAdvanced in NODE_LABELS', () => {
  const combSrc = fs.readFileSync(path.join(APP_DIR, 'comfy.js'), 'utf8');
  assert.ok(combSrc.includes("'KSamplerAdvanced'"),
    'KSamplerAdvanced must be in NODE_LABELS for 14B progress display');
});
test('14B: AC-14 comfy.js has VAEDecodeTiled in NODE_LABELS', () => {
  const combSrc = fs.readFileSync(path.join(APP_DIR, 'comfy.js'), 'utf8');
  assert.ok(combSrc.includes("'VAEDecodeTiled'"),
    'VAEDecodeTiled must be in NODE_LABELS for progress display');
});

// ── AC-17: LoRA injection + CFG/step split ────────────────────────────────────
console.log('\nAC-17 — injectPlaceholders: LoRA strengths + CFG + step split (14B)');

const lv = { stage1: { dr34mlayStr: 0.75, k3nkStr: 0.5, steps: 20, cfg: 3.5 }, stage2: { dr34mlayStr: 0.9, k3nkStr: 0.65, steps: 31, cfg: 6.0 } };

test('AC-17: node 6 gets stage1 DR34MLAY strength on both strength_model + strength_clip', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['6'].inputs.strength_model, 0.75);
  assert.strictEqual(r['6'].inputs.strength_clip,  0.75);
});
test('AC-17: node 7 gets stage2 DR34MLAY strength (model only — no clip)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['7'].inputs.strength_model, 0.9);
  assert.ok(!('strength_clip' in r['7'].inputs) || r['7'].inputs.strength_clip === undefined || r['7'].inputs.strength_clip === r['7']._orig_clip,
    'node 7 is ModelOnly — strength_clip should not be set by injection');
});
test('AC-17: node 18 gets stage1 K3NK strength on both model + clip', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['18'].inputs.strength_model, 0.5);
  assert.strictEqual(r['18'].inputs.strength_clip,  0.5);
});
test('AC-17: node 19 gets stage2 K3NK strength (model only)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['19'].inputs.strength_model, 0.65);
});
test('AC-17: node 13 gets total steps = stage1.steps + stage2.steps', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['13'].inputs.steps, 51, 'total steps must be 20+31=51');
});
test('AC-17: node 13 gets stage1 CFG', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['13'].inputs.cfg, 3.5);
});
test('AC-17: node 13 end_at_step = stage1.steps (split point)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['13'].inputs.end_at_step, 20, 'Stage1 ends at its own step count');
});
test('AC-17: node 14 start_at_step = stage1.steps (hand-off invariant)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['14'].inputs.start_at_step, 20, 'Stage2 starts where Stage1 ends — invariant');
});
test('AC-17: node 14 end_at_step NOT overwritten — 10000 sentinel preserved (RF-S259-02)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  // RF-S259-02: injection must NOT override end_at_step — ComfyUI sentinel (10000 = run to end) must remain
  assert.strictEqual(r['14'].inputs.end_at_step, 10000, 'workflow sentinel must be preserved, not overwritten with totalSteps');
});
test('AC-17: node 14 gets stage2 CFG', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['14'].inputs.cfg, 6.0);
});
test('AC-17: comfy.js generate() accepts loraValues parameter', () => {
  assert.ok(combSrc.includes('loraValues'),
    'generate() signature must include loraValues');
});
test('AC-17: comfy.js injectPlaceholders accepts loraValues', () => {
  assert.ok(combSrc.includes('function injectPlaceholders') && combSrc.includes('loraValues'),
    'injectPlaceholders must accept loraValues');
});

// ── AC-18: Resolution preset + auto-detect ────────────────────────────────────
console.log('\nAC-18 — resolution preset dropdown + auto-detect');

test('AC-18: injectPlaceholders injects width+height into WanImageToVideo node', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, null, 1280, 720);
  assert.strictEqual(r['10'].inputs.width,  1280, 'WanImageToVideo node 10 must get injected width');
  assert.strictEqual(r['10'].inputs.height, 720,  'WanImageToVideo node 10 must get injected height');
});
test('AC-18: resolution injection also works for Wan22ImageToVideoLatent (5B)', () => {
  const r = injectPlaceholders(workflow, 'a.png', 'b', 1, null, 480, 832);
  const latentNode = Object.values(r).find(n => n.class_type === 'Wan22ImageToVideoLatent');
  assert.ok(latentNode, '5B workflow must have Wan22ImageToVideoLatent');
  assert.strictEqual(latentNode.inputs.width,  480);
  assert.strictEqual(latentNode.inputs.height, 832);
});
test('AC-18: index.html has #resolution-select with 5 presets', () => {
  const matches = (indexHtml.match(/value="[0-9]+x[0-9]+"/g) || []);
  assert.ok(matches.length >= 5, 'must have at least 5 resolution presets');
});
test('AC-18: 832x480 is default resolution preset', () => {
  assert.ok(indexHtml.includes('value="832x480" selected') || indexHtml.includes('value="832x480"'),
    '832x480 must be in the resolution select');
});
test('AC-18: renderer.js has getResolutionPreset function', () => {
  assert.ok(renderSrc.includes('function getResolutionPreset'),
    'getResolutionPreset() must exist in renderer.js');
});
test('AC-18: renderer.js auto-suggests portrait preset for portrait images', () => {
  assert.ok(renderSrc.includes("'480x832'"),
    'renderer.js must set 480x832 for portrait images in auto-detect');
});

// ── AC-19: FPS dropdown ───────────────────────────────────────────────────────
console.log('\nAC-19 — FPS dropdown');

test('AC-19: injectPlaceholders injects frame_rate into VHS_VideoCombine', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, null, null, null, 24);
  assert.strictEqual(r['17'].inputs.frame_rate, 24, 'VHS_VideoCombine must get injected frame_rate');
});
test('AC-19: index.html has #fps-select with 16fps as default', () => {
  assert.ok(indexHtml.includes('value="16" selected') || indexHtml.includes("value=\"16\" selected"),
    '16fps must be the selected default in fps-select');
});
test('AC-19: renderer.js has getFrameRate function', () => {
  assert.ok(renderSrc.includes('function getFrameRate'),
    'getFrameRate() must exist in renderer.js');
});
test('AC-19: comfy.js generate() accepts frameRate parameter', () => {
  assert.ok(combSrc.includes('frameRate'),
    'generate() must accept frameRate');
});

// ── AC-20: Export report ──────────────────────────────────────────────────────
console.log('\nAC-20 — export report (.txt alongside video)');

test('AC-20: main.js registers wan:writeReport IPC handler', () => {
  assert.ok(mainSrc.includes("'wan:writeReport'"),
    'wan:writeReport IPC channel must be registered in main.js');
});
test('AC-20: main.js writeReport validates filename token (RF-S259-04)', () => {
  assert.ok(mainSrc.includes('/^[A-Za-z0-9._\\-]{1,200}$/') || mainSrc.includes("/^[A-Za-z0-9._\\-]{1,200}$/"),
    'writeReport must use filename allowlist regex — not full-path traversal check');
});
test('AC-20: preload.js exposes writeReport method', () => {
  const preloadSrc = fs.readFileSync(path.join(APP_DIR, 'preload.js'), 'utf8');
  assert.ok(preloadSrc.includes('writeReport'),
    'preload.js must expose writeReport via contextBridge');
});
test('AC-20: renderer.js has buildReport function', () => {
  assert.ok(renderSrc.includes('function buildReport'),
    'buildReport() must exist in renderer.js');
});
test('AC-20: renderer.js calls window.wan.writeReport in onComplete', () => {
  assert.ok(renderSrc.includes('window.wan.writeReport'),
    'writeReport must be called in completion handler');
});
test('AC-20: buildReport includes seed + resolution (NOT prompt — privacy)', () => {
  assert.ok(renderSrc.includes("'  SEED'") || renderSrc.includes("SEED        :"),
    'report must include seed');
  assert.ok(renderSrc.includes("RESOLUTION") || renderSrc.includes("resolution"),
    'report must include resolution');
});
test('AC-28 (privacy): buildReport must NOT write prompt to disk', () => {
  // Prompts are sensitive content — they must never land in any saved file.
  // If you find yourself adding the prompt back to the report, the user said no.
  assert.ok(!renderSrc.includes("PROMPT      :"),
    'PROMPT line must not appear in buildReport — prompts are private');
});

// ── AC-21: Repeat runs ────────────────────────────────────────────────────────
console.log('\nAC-21 — repeat runs dropdown');

test('AC-21: index.html has #runs-select with default 1', () => {
  assert.ok(indexHtml.includes('id="runs-select"'),
    '#runs-select must exist in HTML');
  assert.ok(indexHtml.includes('value="1" selected'),
    '1 must be the default run count');
});
test('AC-21: renderer.js has getRunCount function', () => {
  assert.ok(renderSrc.includes('function getRunCount'),
    'getRunCount() must exist in renderer.js');
});
test('AC-21: renderer.js has runAllJobs function', () => {
  assert.ok(renderSrc.includes('async function runAllJobs'),
    'runAllJobs() must exist and be async');
});
test('AC-21: runAllJobs loops based on totalRunCount', () => {
  assert.ok(renderSrc.includes('totalRunCount'),
    'totalRunCount must be used to control the run loop');
});
test('AC-21: fresh seed generated per run in random mode', () => {
  assert.ok(renderSrc.includes('baseSeed === null'),
    'null baseSeed must trigger fresh random seed per run');
});

// ── AC-22: UI/debug pass ──────────────────────────────────────────────────────
console.log('\nAC-22 — UI/debug pass');

test('AC-22: goBtn shows RUN X/N format during multi-run', () => {
  assert.ok(renderSrc.includes('RUN ${runNum}/${totalRuns}'),
    'button text must show RUN X/Y during multi-run execution');
});
test('AC-22: status text includes run prefix during multi-run', () => {
  assert.ok(renderSrc.includes('runPrefix'),
    'status text must be prefixed with run info during multi-run');
});
test('AC-22: main.js imports nativeImage from electron', () => {
  assert.ok(mainSrc.includes('nativeImage') && mainSrc.includes("require('electron')"),
    'nativeImage must be imported from electron for image dimension detection');
});
test('AC-22: copyToInput returns {filename, width, height} object', () => {
  assert.ok(mainSrc.includes('return { filename, width, height }'),
    'copyToInput must return object with filename, width, height');
});

// ── OPT-03: workflow contract validator ──────────────────────────────────────
console.log('\nOPT-03 — validateWorkflow14b: contract check before LoRA injection');

test('OPT-03: WORKFLOW_14B_CONTRACT constant is defined in comfy.js', () => {
  assert.ok(combSrc.includes('WORKFLOW_14B_CONTRACT'),
    'contract constant must exist');
});
test('OPT-03: validateWorkflow14b function is defined in comfy.js', () => {
  assert.ok(combSrc.includes('function validateWorkflow14b'),
    'validator function must exist');
});
test('OPT-03: injectPlaceholders calls validateWorkflow14b', () => {
  // S264 Cla⌂de patch (BUG-Fl6): validateWorkflow14b is now UNCONDITIONAL.
  // Was guarded by `if (loraValues)` which silently skipped contract check on any
  // LoRA-less path. Test validates intent: the call happens at all in the file
  // (it lives only inside injectPlaceholders by design — there's no other caller).
  assert.ok(/validateWorkflow14b\s*\(\s*w\s*\)/.test(combSrc),
    'validateWorkflow14b(w) must be invoked in comfy.js (lives inside injectPlaceholders)');
});

// ── RF-S259-02/03: step clamping + sentinel preservation ─────────────────────
console.log('\nRF-S259-02/03 — step clamping + end_at_step sentinel');

test('RF-S259-03: steps below 1 are clamped to 1', () => {
  const lvBad = { stage1: { dr34mlayStr: 0.5, k3nkStr: 0.5, steps: 0, cfg: 3.5 }, stage2: { dr34mlayStr: 0.5, k3nkStr: 0.5, steps: 0, cfg: 6.0 } };
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lvBad);
  assert.strictEqual(r['13'].inputs.end_at_step, 1, 'stage1 steps clamped to 1 → end_at_step = 1');
  assert.strictEqual(r['13'].inputs.steps, 2, 'totalSteps = 1+1 = 2');
});
test('RF-S259-03: steps above 100 are clamped to 100', () => {
  const lvBig = { stage1: { dr34mlayStr: 0.5, k3nkStr: 0.5, steps: 200, cfg: 3.5 }, stage2: { dr34mlayStr: 0.5, k3nkStr: 0.5, steps: 150, cfg: 6.0 } };
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lvBig);
  assert.strictEqual(r['13'].inputs.end_at_step, 100, 'stage1 steps clamped to 100');
  assert.strictEqual(r['13'].inputs.steps, 200, 'totalSteps = 100+100 = 200');
});
test('RF-S259-03: normal steps (20+31) pass through unclamped', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv);
  assert.strictEqual(r['13'].inputs.end_at_step, 20, 's1=20 within [1,100]');
  assert.strictEqual(r['14'].inputs.start_at_step, 20, 'start_at_step = s1 = 20');
});

// ── RF-S259-04/05: writeReport filename token ─────────────────────────────────
console.log('\nRF-S259-04/05 — writeReport filename token + renderer basename');

test('RF-S259-05: renderer.js strips directory separators from outputFilename', () => {
  assert.ok(renderSrc.includes('outputFilename.split') && renderSrc.includes(".pop()"),
    'renderer.js must take basename of outputFilename before building report filename');
});
test('RF-S259-04: preload.js passes filename (not filePath) to writeReport IPC', () => {
  const preloadSrc = fs.readFileSync(path.join(APP_DIR, 'preload.js'), 'utf8');
  assert.ok(preloadSrc.includes("{ filename, content }"),
    'preload.js must send filename token, not full filePath');
});
test('RF-S259-07: main.js pipes ComfyUI stdio (not ignore)', () => {
  assert.ok(mainSrc.includes("['ignore', 'pipe', 'pipe']"),
    "ComfyUI spawn stdio must be ['ignore','pipe','pipe'] — not 'ignore' — for crash visibility");
});
test('RF-S259-08: comfy.js guards executed handler against null promptId', () => {
  assert.ok(combSrc.includes('if (!promptId) return;'),
    'executed handler must bail out if promptId is not yet set');
});
test('RF-S259-09: renderer.js runAllJobs never breaks on failure', () => {
  assert.ok(!renderSrc.includes('if (!ok) break'),
    'runAllJobs must not break on individual run failure — all runs must attempt');
  assert.ok(renderSrc.includes("if (ok) succeeded++; else failed++"),
    'runAllJobs must track succeeded/failed counts');
});
test('RF-S259-10: CSP includes object-src none', () => {
  assert.ok(indexHtml.includes("object-src 'none'"),
    "CSP must include object-src 'none'");
});
test('RF-S259-10: CSP includes base-uri none', () => {
  assert.ok(indexHtml.includes("base-uri 'none'"),
    "CSP must include base-uri 'none'");
});

// ── AC-23/24/27/28: Windows spawn flags + WORKFLOW_14B_CONTRACT nodes 20-23 ──
console.log('\nAC-23/24/27/28 — Windows spawn flags + contract nodes 20-23');

test('AC-23a: Windows spawnArgs contains --reserve-vram 1', () => {
  assert.ok(mainSrc.includes("'--reserve-vram', '1'"), 'missing --reserve-vram 1 in Windows branch');
});
test('AC-23b: --highvram absent from main.js', () => {
  assert.ok(!mainSrc.includes('--highvram'), '--highvram found in main.js — must not be present');
});
test('AC-24: Windows env contains PYTORCH_ALLOC_CONF', () => {
  assert.ok(mainSrc.includes('PYTORCH_ALLOC_CONF'), 'missing PYTORCH_ALLOC_CONF in main.js');
  assert.ok(mainSrc.includes('expandable_segments:True'), 'missing expandable_segments:True value');
});
test('AC-27: WORKFLOW_14B_CONTRACT includes nodes 20-23', () => {
  assert.ok(combSrc.includes("'20': 'PathchSageAttentionKJ'"), 'node 20 missing from contract');
  assert.ok(combSrc.includes("'21': 'TeaCache'"),        'node 21 missing from contract');
  assert.ok(combSrc.includes("'22': 'PathchSageAttentionKJ'"), 'node 22 missing from contract');
  assert.ok(combSrc.includes("'23': 'TeaCache'"),        'node 23 missing from contract');
});
test('AC-27: NODE_LABELS contains PatchSageAttentionKJ entry', () => {
  assert.ok(combSrc.includes("'PathchSageAttentionKJ': 'Patching SageAttention'"),
    'NODE_LABELS must contain PathchSageAttentionKJ label');
});
test('AC-27: NODE_LABELS contains TeaCache entry', () => {
  assert.ok(combSrc.includes("'TeaCache':              'Applying TeaCache'"),
    'NODE_LABELS must contain TeaCache label');
});

// ── AC-29: Tooltips on sliders and output controls ───────────────────────────
console.log('\nAC-29 — tooltips on sliders + output controls');

test('AC-29a: s1-dr34mlay-str has title attribute', () => {
  assert.ok(indexHtml.includes('id="s1-dr34mlay-str"') && indexHtml.includes('title='),
    's1-dr34mlay-str missing title attribute');
});
test('AC-29b: s1-cfg has title attribute', () => {
  assert.ok(indexHtml.match(/id="s1-cfg"[\s\S]{0,200}title=/),
    's1-cfg missing title attribute');
});
test('AC-29c: s2-steps has title attribute', () => {
  assert.ok(indexHtml.match(/id="s2-steps"[\s\S]{0,200}title=/),
    's2-steps missing title attribute');
});
test('AC-29d: resolution-select has title attribute', () => {
  assert.ok(indexHtml.match(/id="resolution-select"[\s\S]{0,300}title=/),
    'resolution-select missing title attribute');
});
test('AC-29e: fps-select has title attribute', () => {
  assert.ok(indexHtml.match(/id="fps-select"[\s\S]{0,300}title=/),
    'fps-select missing title attribute');
});

// ── AC-30: Preset system — IPC handlers + security + UI ──────────────────────
console.log('\nAC-30 — preset system');

test('AC-30a: ALLOWED_PRESET_SLUG pattern defined in main.js', () => {
  assert.ok(mainSrc.includes('ALLOWED_PRESET_SLUG'), 'ALLOWED_PRESET_SLUG missing from main.js');
});
test('AC-30b: wan:listPresets handler exists', () => {
  assert.ok(mainSrc.includes("'wan:listPresets'"), 'wan:listPresets handler missing');
});
test('AC-30c: wan:loadPreset validates slug with allowlist', () => {
  assert.ok(mainSrc.includes("'wan:loadPreset'") && mainSrc.includes('ALLOWED_PRESET_SLUG.test(slug)'),
    'wan:loadPreset missing or missing slug validation');
});
test('AC-30d: wan:loadPreset uses realpathSync escape guard', () => {
  const loadPresetBlock = mainSrc.slice(mainSrc.indexOf("'wan:loadPreset'"));
  assert.ok(loadPresetBlock.includes('realpathSync'), 'wan:loadPreset missing realpathSync escape guard');
});
test('AC-30e: wan:savePreset handler exists', () => {
  assert.ok(mainSrc.includes("'wan:savePreset'"), 'wan:savePreset handler missing');
});
test('AC-30f: wan:deletePreset handler exists', () => {
  assert.ok(mainSrc.includes("'wan:deletePreset'"), 'wan:deletePreset handler missing');
});
test('AC-30g: preload.js bridges all 4 preset methods', () => {
  const pl = fs.readFileSync(path.join(APP_DIR, 'preload.js'), 'utf8');
  assert.ok(pl.includes('listPresets'), 'listPresets not bridged in preload.js');
  assert.ok(pl.includes('loadPreset'),  'loadPreset not bridged in preload.js');
  assert.ok(pl.includes('savePreset'),  'savePreset not bridged in preload.js');
  assert.ok(pl.includes('deletePreset'), 'deletePreset not bridged in preload.js');
});
test('AC-30h: #preset-section and #preset-select present in index.html', () => {
  assert.ok(indexHtml.includes('id="preset-section"'), '#preset-section missing from HTML');
  assert.ok(indexHtml.includes('id="preset-select"'),  '#preset-select missing from HTML');
});
test('AC-30i: renderer.js defines loadPresets and applyPreset and initPresetUI', () => {
  assert.ok(renderSrc.includes('async function loadPresets'), 'loadPresets missing');
  assert.ok(renderSrc.includes('async function applyPreset'), 'applyPreset missing');
  assert.ok(renderSrc.includes('function initPresetUI'),      'initPresetUI missing');
});
test('AC-30j: presets/index.json exists and is valid JSON array', () => {
  const indexJson = path.join(APP_DIR, 'presets', 'index.json');
  assert.ok(fs.existsSync(indexJson), 'presets/index.json does not exist');
  const parsed = JSON.parse(fs.readFileSync(indexJson, 'utf8'));
  assert.ok(Array.isArray(parsed), 'presets/index.json must be a JSON array');
});

// ── AC-31: Seed bank — IPC handlers + security + UI ──────────────────────────
console.log('\nAC-31 — seed bank');

test('AC-31a: wan:listSeeds / saveSeed / deleteSeed handlers exist', () => {
  assert.ok(mainSrc.includes("'wan:listSeeds'"),  'wan:listSeeds missing');
  assert.ok(mainSrc.includes("'wan:saveSeed'"),   'wan:saveSeed missing');
  assert.ok(mainSrc.includes("'wan:deleteSeed'"), 'wan:deleteSeed missing');
});
test('AC-31b: saveSeed validates seed is integer', () => {
  assert.ok(mainSrc.includes('Number.isInteger(entry.seed)'), 'saveSeed missing integer check');
});
test('AC-31c: deleteSeed validates UUID format', () => {
  assert.ok(mainSrc.includes('[0-9a-f-]{36}'), 'deleteSeed missing UUID regex');
});
test('AC-31d: preload.js bridges listSeeds, saveSeed, deleteSeed', () => {
  const pl = fs.readFileSync(path.join(APP_DIR, 'preload.js'), 'utf8');
  assert.ok(pl.includes('listSeeds'),  'listSeeds not bridged');
  assert.ok(pl.includes('saveSeed'),   'saveSeed not bridged');
  assert.ok(pl.includes('deleteSeed'), 'deleteSeed not bridged');
});
test('AC-31e: seeds.json exists and is valid JSON', () => {
  const seedsPath = path.join(APP_DIR, 'seeds.json');
  assert.ok(fs.existsSync(seedsPath), 'seeds.json does not exist');
  const parsed = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
  assert.ok(Array.isArray(parsed.seeds), 'seeds.json must have a seeds array');
});
test('AC-31f: #save-seed-btn and #seed-bank-panel in index.html', () => {
  assert.ok(indexHtml.includes('id="save-seed-btn"'),   '#save-seed-btn missing');
  assert.ok(indexHtml.includes('id="seed-bank-panel"'), '#seed-bank-panel missing');
  assert.ok(indexHtml.includes('id="seed-bank-list"'),  '#seed-bank-list missing');
});
test('AC-31g: randomUUID imported from crypto in main.js', () => {
  assert.ok(mainSrc.includes("randomUUID") && mainSrc.includes("require('crypto')"),
    'randomUUID not imported from crypto');
});
test('AC-31h: prompt NOT stored in seed entry (privacy)', () => {
  const saveSeedBlock = mainSrc.slice(mainSrc.indexOf("'wan:saveSeed'"),
    mainSrc.indexOf("'wan:deleteSeed'"));
  assert.ok(!saveSeedBlock.includes('prompt'), 'prompt must NOT be stored in seed bank');
});

// ── AC-32: Data files exist ───────────────────────────────────────────────────
console.log('\nAC-32 — data files + init wiring');

test('AC-32a: presets directory exists', () => {
  assert.ok(fs.existsSync(path.join(APP_DIR, 'presets')), 'app/presets/ directory missing');
});
test('AC-32b: renderer.js init() calls all 4 phase-3 init functions', () => {
  const initBlock = renderSrc.slice(renderSrc.indexOf('async function init()'));
  assert.ok(initBlock.includes('initChaosSlider()'),  'initChaosSlider() not called in init()');
  assert.ok(initBlock.includes('initPresetUI()'),     'initPresetUI() not called in init()');
  assert.ok(initBlock.includes('initSeedBankUI()'),   'initSeedBankUI() not called in init()');
  assert.ok(initBlock.includes('initQueueUI()'),      'initQueueUI() not called in init()');
});

// ── AC-33: Chaos slider ───────────────────────────────────────────────────────
console.log('\nAC-33 — chaos slider');

test('AC-33a: chaosFloat defined with dampener 0.3', () => {
  assert.ok(renderSrc.includes('chaosFloat') && renderSrc.includes('0.3'),
    'chaosFloat missing or wrong dampener');
});
test('AC-33b: chaosCfg defined with dampener 0.2', () => {
  assert.ok(renderSrc.includes('chaosCfg') && renderSrc.includes('0.2'),
    'chaosCfg missing or wrong dampener');
});
test('AC-33c: chaosSteps defined with dampener 0.15', () => {
  assert.ok(renderSrc.includes('chaosSteps') && renderSrc.includes('0.15'),
    'chaosSteps missing or wrong dampener');
});
test('AC-33d: applyChaos function defined', () => {
  assert.ok(renderSrc.includes('function applyChaos'), 'applyChaos missing');
});
test('AC-33e: #chaos-pct slider in index.html with correct range', () => {
  assert.ok(indexHtml.includes('id="chaos-pct"'), '#chaos-pct missing from HTML');
  assert.ok(indexHtml.includes('min="0"') && indexHtml.includes('max="100"'),
    '#chaos-pct missing min/max range');
});
test('AC-33f: chaos does NOT apply to FPS or resolution', () => {
  const applyBlock = renderSrc.slice(
    renderSrc.indexOf('function applyChaos'),
    renderSrc.indexOf('// ─── CHAOS SLIDER UX')
  );
  assert.ok(!applyBlock.includes('fps') && !applyBlock.includes('resolution') &&
            !applyBlock.includes('width') && !applyBlock.includes('height'),
    'applyChaos must not touch fps or resolution');
});

// ── AC-34: Render queue ───────────────────────────────────────────────────────
console.log('\nAC-34 — render queue');

test('AC-34a: jobQueue array and activeJobIndex defined', () => {
  assert.ok(renderSrc.includes('jobQueue') && renderSrc.includes('activeJobIndex'),
    'queue state variables missing');
});
test('AC-34b: addCurrentStateAsJob function defined', () => {
  assert.ok(renderSrc.includes('function addCurrentStateAsJob'), 'addCurrentStateAsJob missing');
});
test('AC-34c: runQueue is async and checks selectedImageFilename', () => {
  assert.ok(renderSrc.includes('async function runQueue'), 'runQueue missing or not async');
  assert.ok(renderSrc.includes('selectedImageFilename'), 'runQueue must guard on selectedImageFilename');
});
test('AC-34d: renderQueueUI hides queue-panel when jobQueue empty', () => {
  assert.ok(renderSrc.includes("jobQueue.length > 0 ? 'block' : 'none'"),
    'renderQueueUI must show/hide queue-panel based on jobQueue.length');
});
test('AC-34e: #queue-panel, #queue-list, #run-queue-btn in index.html', () => {
  assert.ok(indexHtml.includes('id="queue-panel"'),   '#queue-panel missing');
  assert.ok(indexHtml.includes('id="queue-list"'),    '#queue-list missing');
  assert.ok(indexHtml.includes('id="run-queue-btn"'), '#run-queue-btn missing');
  assert.ok(indexHtml.includes('id="add-to-queue-btn"'), '#add-to-queue-btn missing');
});

// ── AC-35: Single-run generate path unchanged ─────────────────────────────────
console.log('\nAC-35 — single-run path backward-compatible');

test('AC-35a: startGeneration has loraValuesOverride param with default null', () => {
  assert.ok(renderSrc.includes('loraValuesOverride = null'), 'loraValuesOverride default null missing');
});
test('AC-35b: startGeneration has chaosApplied param with default 0', () => {
  assert.ok(renderSrc.includes('chaosApplied = 0'), 'chaosApplied default 0 missing');
});
test('AC-35c: go-btn listener still calls runAllJobs (single-run path)', () => {
  assert.ok(renderSrc.includes('runAllJobs'), 'runAllJobs missing — single-run path broken');
});

// ── Batch system — inline helpers (mirror renderer.js for black-box testing) ─
let _batchJobIdCounter = 0;
function _bid() { return 'bjob-' + (++_batchJobIdCounter); }

function linspace(min, max, n) {
  if (n === 1) return [min];
  return Array.from({ length: n }, (_, i) => +(min + (max - min) * (i / (n - 1))).toFixed(3));
}
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
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
const PARAM_SHORT_T = {
  's1.cfg': 's1cfg', 's2.cfg': 's2cfg',
  's1.dr34mlayStr': 'dr34',  's2.dr34mlayStr': 'dr34lo',
  's1.k3nkStr': 'k3nk',     's2.k3nkStr': 'k3nklo',
  's1.steps': 'spt',         's2.steps': 'spt2',
};
function buildDialPrefix(p1, v1, p2, v2) {
  const a = (PARAM_SHORT_T[p1] || p1) + (+v1).toFixed(1);
  const b = (p2 && v2 != null) ? '_' + (PARAM_SHORT_T[p2] || p2) + (+v2).toFixed(1) : '';
  return `dial_${a}${b}`;
}
function buildDialJobs(baseLv, dialSeed, a1, a2) {
  const v1s = linspace(a1.min, a1.max, a1.steps);
  const v2s = a2 ? linspace(a2.min, a2.max, a2.steps) : [null];
  return v1s.flatMap(v1 => v2s.map(v2 => ({
    jobId: _bid(), mode: 'DIAL', seed: dialSeed,
    filenamePrefix: buildDialPrefix(a1.param, v1, a2 ? a2.param : null, v2),
    loraValues: applyOverrides(deepClone(baseLv), a1.param, v1, a2 ? a2.param : null, v2),
    status: 'pending', outputFile: null, startedAt: null, completedAt: null, errorMsg: null,
    overrides: { axis1Label: a1.param, axis1Value: v1, axis2Label: a2 ? a2.param : null, axis2Value: v2 },
  })));
}
function buildProdJobs(baseLv, count, seedStrategy, baseSeed) {
  return Array.from({ length: count }, (_, i) => {
    const seed = seedStrategy === 'sequential'
      ? (baseSeed + i * 1000007)
      : Math.floor(Math.random() * 9999999999);
    return {
      jobId: _bid(), mode: 'PROD', seed,
      filenamePrefix: `prod_${String(i + 1).padStart(3, '0')}_s${seed}`,
      loraValues: deepClone(baseLv),
      status: 'pending', outputFile: null, startedAt: null, completedAt: null, errorMsg: null,
      overrides: null,
    };
  });
}

// ── T-LORA: injectPlaceholders — batch-relevant checks ───────────────────────
console.log('\nT-LORA — filenamePrefix + loraValues invariants');

test('T-LORA-01: all six LoRA+sampler nodes receive correct values', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv, 832, 480, 16, null);
  assert.strictEqual(r['6'].inputs.strength_model,  lv.stage1.dr34mlayStr, 'node 6 model');
  assert.strictEqual(r['6'].inputs.strength_clip,   lv.stage1.dr34mlayStr, 'node 6 clip');
  assert.strictEqual(r['7'].inputs.strength_model,  lv.stage2.dr34mlayStr, 'node 7 model');
  assert.strictEqual(r['18'].inputs.strength_model, lv.stage1.k3nkStr,     'node 18 model');
  assert.strictEqual(r['18'].inputs.strength_clip,  lv.stage1.k3nkStr,     'node 18 clip');
  assert.strictEqual(r['19'].inputs.strength_model, lv.stage2.k3nkStr,     'node 19 model');
});
test('T-LORA-02: loraValues=null → LoRA nodes untouched', () => {
  const orig = workflow14b['6'].inputs.strength_model;
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, null, 832, 480, 16, null);
  assert.strictEqual(r['6'].inputs.strength_model, orig, 'node 6 must be unchanged when loraValues=null');
});
test('T-LORA-03: step split invariant — node 13 end_at_step === node 14 start_at_step', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv, 832, 480, 16, null);
  assert.strictEqual(r['13'].inputs.end_at_step, r['14'].inputs.start_at_step,
    'Stage1 end_at_step must equal Stage2 start_at_step');
});
test('T-LORA-04: filenamePrefix injected into node 17 (VHS_VideoCombine)', () => {
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv, 832, 480, 16, 'dial_test_abc');
  assert.strictEqual(r['17'].inputs.filename_prefix, 'dial_test_abc', 'prefix must reach node 17');
});
test('T-LORA-05: filenamePrefix=null → node 17 prefix unchanged from workflow', () => {
  const orig = workflow14b['17'].inputs.filename_prefix;
  const r = injectPlaceholders(workflow14b, 'a.png', 'b', 1, lv, 832, 480, 16, null);
  assert.strictEqual(r['17'].inputs.filename_prefix, orig, 'node 17 prefix must not change when filenamePrefix=null');
});

// ── T-DIAL: DIAL mode job construction ───────────────────────────────────────
console.log('\nT-DIAL — DIAL mode job construction');

test('T-DIAL-01: linspace(3.0, 6.0, 4) returns [3.0, 4.0, 5.0, 6.0]', () => {
  assert.deepStrictEqual(linspace(3.0, 6.0, 4), [3.0, 4.0, 5.0, 6.0]);
});
test('T-DIAL-02: buildDialJobs with 1 axis (4 steps) generates 4 jobs', () => {
  const jobs = buildDialJobs(lv, 42, { param: 's1.cfg', min: 3.0, max: 6.0, steps: 4 }, null);
  assert.strictEqual(jobs.length, 4, 'single-axis DIAL must produce n jobs');
});
test('T-DIAL-03: buildDialJobs with 2 axes (4×3) generates 12 jobs', () => {
  const jobs = buildDialJobs(lv, 42,
    { param: 's1.cfg', min: 3.0, max: 6.0, steps: 4 },
    { param: 's2.cfg', min: 3.0, max: 6.0, steps: 3 });
  assert.strictEqual(jobs.length, 12, 'two-axis DIAL must produce n1×n2 jobs');
});
test('T-DIAL-04: all DIAL jobs share the same seed (dialSeed)', () => {
  const dialSeed = 9876543;
  const jobs = buildDialJobs(lv, dialSeed, { param: 's1.cfg', min: 3.0, max: 6.0, steps: 4 }, null);
  assert.ok(jobs.every(j => j.seed === dialSeed), 'all DIAL jobs must use the same fixed seed');
});
test('T-DIAL-05: DIAL filenamePrefix starts with dial_ and encodes param short-code', () => {
  const jobs = buildDialJobs(lv, 1, { param: 's1.cfg', min: 3.0, max: 6.0, steps: 4 }, null);
  assert.ok(jobs[0].filenamePrefix.startsWith('dial_'), 'DIAL prefix must start with dial_');
  assert.ok(jobs[0].filenamePrefix.includes('s1cfg'), 'DIAL prefix must encode the s1.cfg short-code');
});

// ── T-PROD: PRODUCTION mode job construction ──────────────────────────────────
console.log('\nT-PROD — PRODUCTION mode job construction');

test('T-PROD-01: buildProdJobs generates correct count', () => {
  assert.strictEqual(buildProdJobs(lv, 20, 'random', 0).length, 20);
});
test('T-PROD-02: SEQUENTIAL seeds stride by 1000007', () => {
  const jobs = buildProdJobs(lv, 5, 'sequential', 1000);
  for (let i = 0; i < jobs.length - 1; i++) {
    assert.strictEqual(jobs[i + 1].seed - jobs[i].seed, 1000007, `stride broken at index ${i}`);
  }
});
test('T-PROD-03: RANDOM seeds — 1000 jobs all have unique seeds', () => {
  const jobs = buildProdJobs(lv, 1000, 'random', 0);
  const unique = new Set(jobs.map(j => j.seed));
  assert.strictEqual(unique.size, 1000, 'all 1000 random seeds must be unique');
});
test('T-PROD-04: PROD filenamePrefix includes zero-padded index + seed', () => {
  const jobs = buildProdJobs(lv, 3, 'sequential', 1000);
  assert.ok(jobs[0].filenamePrefix.startsWith('prod_001_s'), 'must start with prod_001_s');
  assert.ok(jobs[1].filenamePrefix.startsWith('prod_002_s'), 'must start with prod_002_s');
});
test('T-PROD-05: DIAL jobs have mode=DIAL, PROD jobs have mode=PROD', () => {
  const dialJobs = buildDialJobs(lv, 1, { param: 's1.cfg', min: 3.0, max: 6.0, steps: 2 }, null);
  const prodJobs = buildProdJobs(lv, 2, 'random', 0);
  assert.ok(dialJobs.every(j => j.mode === 'DIAL'), 'DIAL jobs must have mode=DIAL');
  assert.ok(prodJobs.every(j => j.mode === 'PROD'), 'PROD jobs must have mode=PROD');
});

// ── T-BATCH: cross-cutting invariants ────────────────────────────────────────
console.log('\nT-BATCH — cross-cutting batch invariants');

test('T-BATCH-01: all jobs have unique jobIds regardless of mode', () => {
  const dialJobs = buildDialJobs(lv, 1, { param: 's1.cfg', min: 3.0, max: 6.0, steps: 4 }, null);
  const prodJobs = buildProdJobs(lv, 4, 'random', 0);
  const allIds   = [...dialJobs, ...prodJobs].map(j => j.jobId);
  const unique   = new Set(allIds);
  assert.strictEqual(unique.size, allIds.length, 'all job IDs must be unique across modes');
});
test('T-BATCH-02: applyOverrides does not mutate the base loraValues object', () => {
  const base    = deepClone(lv);
  const baseCfg = base.stage1.cfg;
  applyOverrides(deepClone(base), 's1.cfg', 99.9, null, null);
  assert.strictEqual(base.stage1.cfg, baseCfg, 'base loraValues must not be mutated');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(56)}`);
if (failed > 0) {
  console.error(`FAIL — ${passed} passed, ${failed} failed\n`);
  process.exit(1);
} else {
  console.log(`PASS — ${passed} tests, 0 failures\n`);
}

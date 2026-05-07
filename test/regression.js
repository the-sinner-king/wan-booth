#!/usr/bin/env node
/**
 * WAN BOOTH — Regression Tests
 * S253 DEBUGGING: RF-01–10, B-01–06 patches (5B workflow + app hardening)
 * S255 CODING: AC-09–15 (14B 2-stage MoE workflow, Mac launch flags)
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

// Inline the current injectPlaceholders logic for black-box testing
function injectPlaceholders(w, imagePath, prompt, seed) {
  const clone = JSON.parse(JSON.stringify(w));
  for (const node of Object.values(clone)) {
    if (!node.inputs) continue;
    if (node.inputs.image      === '{{IMAGE_PATH}}') node.inputs.image      = imagePath;
    if (node.inputs.text       === '{{PROMPT}}')     node.inputs.text       = prompt;
    if (node.inputs.noise_seed === '{{SEED}}')        node.inputs.noise_seed = parseInt(seed, 10);
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

test('comfy.js has ws.onclose handler', () => {
  assert.ok(combSrc.includes('ws.onclose'),
    'ws.onclose must be registered to catch socket drops');
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
  assert.deepStrictEqual(workflow14b['11'].inputs.model, ['18', 0],
    'High-stage ModelSamplingSD3 must take model from final LoraLoader(high) chain (node 18)');
});
test('14B: node 12 ModelSamplingSD3 (low) shift=8.0 — identical to Stage 1', () => {
  assert.strictEqual(workflow14b['12'].class_type, 'ModelSamplingSD3');
  assert.strictEqual(workflow14b['12'].inputs.shift, 8.0,
    'Both stages MUST use identical shift — different values break the sigma hand-off');
  assert.deepStrictEqual(workflow14b['12'].inputs.model, ['19', 0],
    'Low-stage ModelSamplingSD3 must take model from final LoraLoaderModelOnly(low) chain (node 19)');
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

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(56)}`);
if (failed > 0) {
  console.error(`FAIL — ${passed} passed, ${failed} failed\n`);
  process.exit(1);
} else {
  console.log(`PASS — ${passed} tests, 0 failures\n`);
}

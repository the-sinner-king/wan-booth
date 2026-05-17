(function () {
  'use strict';

  const COMFY_BASE             = 'http://localhost:8188';
  const COMFY_WS               = 'ws://localhost:8188';
  const VIDEO_OUTPUT_NODE_FALLBACK = '17'; // RF-I: used only if workflow has no VHS_VideoCombine node

  // OPT-03: node-ID contract for i2v_14B_2stage workflow — validated before LoRA injection.
  // Throws a loud error if workflow was re-exported from ComfyUI and IDs were renumbered,
  // converting the "silent decorative slider" failure class into an immediate startup error.
  const WORKFLOW_14B_CONTRACT = {
    '6':  'LoraLoader',
    '7':  'LoraLoaderModelOnly',
    '13': 'KSamplerAdvanced',
    '14': 'KSamplerAdvanced',
    '17': 'VHS_VideoCombine',
    '18': 'LoraLoader',
    '19': 'LoraLoaderModelOnly',
    '20': 'PathchSageAttentionKJ',
    '21': 'TeaCache',
    '22': 'PathchSageAttentionKJ',
    '23': 'TeaCache',
  };

  function validateWorkflow14b(workflow) {
    for (const [id, expected] of Object.entries(WORKFLOW_14B_CONTRACT)) {
      const node = workflow[id];
      if (!node || node.class_type !== expected) {
        throw new Error(
          'Workflow contract violation: node ' + id +
          ' expected ' + expected + ', got ' + (node ? node.class_type : 'missing') +
          '. Node IDs may have changed since workflow was last exported from ComfyUI.'
        );
      }
    }
  }

  // Human-readable labels for every node type we expect to see
  const NODE_LABELS = {
    'UNETLoader':            'Loading model weights',
    'CLIPLoader':            'Loading text encoder',
    'VAELoader':             'Loading VAE',
    'LoadImage':             'Loading input image',
    'CLIPVisionLoader':      'Loading CLIP Vision',
    'CLIPVisionEncode':      'Encoding image features',
    'CLIPTextEncode':        'Encoding prompt',
    'ModelSamplingSD3':      'Configuring sampler',
    'WanImageToVideo':         'Conditioning image→video',
    'Wan22ImageToVideoLatent': 'Conditioning image→video (5B)',
    'RandomNoise':           'Seeding noise',
    'BasicScheduler':        'Building schedule',
    'KSamplerSelect':        'Selecting sampler',
    'KSamplerAdvanced':      'Denoising latents',
    'SamplerCustomAdvanced': 'Denoising latents',
    'CFGGuider':             'Configuring guidance',
    'VAEDecode':             'Decoding latents → frames',
    'VAEDecodeTiled':        'Decoding latents → frames (tiled)',
    'VHS_VideoCombine':      'Encoding video file',
    'LoraLoader':            'Loading LoRA weights',
    'LoraLoaderModelOnly':   'Loading LoRA (model only)',
    'PathchSageAttentionKJ': 'Patching SageAttention',
    'TeaCache':              'Applying TeaCache',
  };

  function dbg(msg) {
    try { window.wan.log('[comfy] ' + msg); } catch {}
    console.log('[ZOETROPE]', msg);
  }

  function generateClientId() {
    return crypto.randomUUID();
  }

  async function loadWorkflow(workflowName) {
    return window.wan.loadWorkflow(workflowName);
  }

  function injectPlaceholders(workflow, imagePath, prompt, seed, loraValues, width, height, frameRate, filenamePrefix) {
    const w = JSON.parse(JSON.stringify(workflow));
    // S264 Cla⌂de patch (BUG-Fl6): validate ALWAYS — was `if (loraValues)`, which
    // meant any LoRA-less path silently skipped the contract check. Workflow integrity
    // is a property of the workflow itself, not the injection mode.
    validateWorkflow14b(w);
    for (const [nodeId, node] of Object.entries(w)) {
      if (!node.inputs) continue;

      // Basic text/seed placeholders
      if (node.inputs.image      === '{{IMAGE_PATH}}') node.inputs.image      = imagePath;
      if (node.inputs.text       === '{{PROMPT}}')     node.inputs.text       = prompt;
      if (node.inputs.noise_seed === '{{SEED}}')       node.inputs.noise_seed = parseInt(seed, 10);

      // Resolution — by class_type (workflow-agnostic, handles both 5B and 14B latent nodes)
      if (width && height && (node.class_type === 'WanImageToVideo' || node.class_type === 'Wan22ImageToVideoLatent')) {
        node.inputs.width  = width;
        node.inputs.height = height;
      }

      // FPS + filename prefix — by class_type, RF-I pattern
      if (node.class_type === 'VHS_VideoCombine') {
        if (frameRate !== undefined && frameRate !== null) node.inputs.frame_rate      = frameRate;
        if (filenamePrefix)                                node.inputs.filename_prefix = filenamePrefix;
      }

      // LoRA strengths + CFG + step split — by node ID (14B 2-stage workflow-specific)
      if (loraValues) {
        const lv = loraValues;
        const s1 = Math.max(1, Math.min(100, Math.round(lv.stage1.steps)));  // RF-S259-03: clamp to [1,100]
        const s2 = Math.max(1, Math.min(100, Math.round(lv.stage2.steps)));
        const totalSteps = s1 + s2;
        if (nodeId === '6')  { node.inputs.strength_model = lv.stage1.dr34mlayStr; node.inputs.strength_clip = lv.stage1.dr34mlayStr; }
        if (nodeId === '7')  { node.inputs.strength_model = lv.stage2.dr34mlayStr; }
        if (nodeId === '18') { node.inputs.strength_model = lv.stage1.k3nkStr; node.inputs.strength_clip = lv.stage1.k3nkStr; }
        if (nodeId === '19') { node.inputs.strength_model = lv.stage2.k3nkStr; }
        // Stage 1 KSampler: inject total steps + CFG + split point (end_at_step = s1)
        if (nodeId === '13') { node.inputs.steps = totalSteps; node.inputs.cfg = lv.stage1.cfg; node.inputs.end_at_step = s1; }
        // Stage 2 KSampler: inject total steps + CFG + hand-off (start_at_step = s1)
        // end_at_step intentionally NOT set — preserve workflow's 10000 sentinel (RF-S259-02)
        if (nodeId === '14') { node.inputs.steps = totalSteps; node.inputs.cfg = lv.stage2.cfg; node.inputs.start_at_step = s1; }
      }
    }
    return w;
  }

  async function generate({ imagePath, prompt, seed, workflowName = 'i2v_14B_2stage',
                             loraValues, width, height, frameRate, filenamePrefix,
                             onProgress, onComplete, onError, onLog }) {
    const clientId = generateClientId();
    let ws;
    let terminated = false;
    let promptId   = null;

    function emit(type, msg) {
      dbg('[' + type + '] ' + msg);
      try { onLog && onLog(type, msg); } catch {}
    }

    function terminate(errMsg) {
      if (terminated) return;
      terminated = true;
      try { if (ws) ws.close(); } catch {}
      if (errMsg) {
        emit('error', errMsg);
        onError && onError(errMsg);
      }
    }

    try {
      emit('start', 'seed=' + seed + '  image=' + imagePath);

      const workflow = await loadWorkflow(workflowName);
      emit('init', 'workflow loaded  ' + Object.keys(workflow).length + ' nodes');

      // Build node ID → class_type map so we can resolve labels from WS messages
      const nodeMap = {};
      let videoOutputNode = VIDEO_OUTPUT_NODE_FALLBACK;
      for (const [id, node] of Object.entries(workflow)) {
        nodeMap[id] = node.class_type || id;
        // RF-I: detect the VHS_VideoCombine node dynamically — don't hard-code node '17'
        if (node.class_type === 'VHS_VideoCombine') videoOutputNode = id;
      }

      const injected = injectPlaceholders(workflow, imagePath, prompt, seed, loraValues, width, height, frameRate, filenamePrefix);

      const wsUrl = new URL('/ws', COMFY_WS);
      wsUrl.searchParams.set('clientId', clientId);
      ws = new WebSocket(wsUrl.href);

      // S264 Cla⌂de patch (BUG-Fl7): use addEventListener with {once:true} for the
      // connect-phase open/error handlers, attach the runtime message/close/error
      // listeners up-front. Was: property-assigned onopen/onerror reassigned across
      // the await — microtask-window race could leave a connection error firing on
      // an already-resolved promise → silent hang. addEventListener stacks cleanly.
      ws.addEventListener('message', (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        // RF-04: ignore messages from a different job on this client
        if (promptId && msg.data && msg.data.prompt_id && msg.data.prompt_id !== promptId) return;

        if (msg.type === 'progress') {
          const val = msg.data.value;
          const max = msg.data.max;
          const pct = Math.round((val / max) * 100);
          emit('step', 'step ' + val + '/' + max + '  (' + pct + '%)');
          onProgress && onProgress(pct, 'step ' + val + '/' + max + ' · ' + pct + '%');
        }

        if (msg.type === 'executing' && msg.data.node) {
          const classType = nodeMap[msg.data.node] || msg.data.node;
          const label     = NODE_LABELS[classType] || classType;
          emit('node', classType + '  node ' + msg.data.node);
          onProgress && onProgress(null, label);
        }

        if (msg.type === 'executed' && msg.data.node === videoOutputNode) {
          if (!promptId) return; // RF-S259-08: ignore stray executed events before our job is queued
          const output = msg.data.output;
          if (output) {
            const files = output.gifs || output.videos || output.images || [];
            if (files.length > 0) {
              emit('complete', files[0].filename);
              onComplete && onComplete(files[0].filename);
              terminate(null);
            }
          }
        }

        if (msg.type === 'execution_error') {
          terminate(msg.data.exception_message || 'ComfyUI execution error');
        }

        if (msg.type === 'execution_interrupted') {
          terminate('Generation interrupted');
        }
      });

      ws.addEventListener('close', (ev) => {
        if (!terminated) terminate('WebSocket closed unexpectedly (code ' + ev.code + ')');
      });

      ws.addEventListener('error', () => {
        if (!terminated) terminate('WebSocket error during generation');
      });

      // S264 Cla⌂de patch (BUG-Fl7): connect-phase await — open/error are one-shot.
      // Runtime listeners above stay attached for the whole generation.
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
        ws.addEventListener('open', () => {
          clearTimeout(timer);
          emit('init', 'WebSocket connected');
          resolve();
        }, { once: true });
        ws.addEventListener('error', () => {
          clearTimeout(timer);
          reject(new Error('WebSocket connection failed'));
        }, { once: true });
      });

      emit('init', 'POSTing via IPC (no Origin header)');
      const result = await window.wan.queuePrompt({ prompt: injected, client_id: clientId });

      if (result.status !== 200) {
        terminate('ComfyUI rejected prompt [' + result.status + ']: ' + (result.body || '(empty body)'));
        return;
      }

      const data = JSON.parse(result.body);
      if (!data.prompt_id) {
        terminate('ComfyUI did not return a prompt ID');
        return;
      }
      promptId = data.prompt_id;
      emit('queue', 'queued  ' + promptId);

    } catch (err) {
      terminate(err.message);
    }
  }

  window.ComfyClient = { generate };
})();

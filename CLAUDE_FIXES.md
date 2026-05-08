# Claude Fixes — WAN BOOTH

> Running log of bugs found by Citadel-Cla⌂de during PC port + ongoing testing.
> Each entry: what broke, why, the patch, what changed.
> Goal: keep moving while Aeris merges these upstream Mac-side.

---

## 2026-05-08

### BUG #1 — `copyToInput` ignored `COMFYUI_DIR` (image never reached ComfyUI)

**Symptom:** First generation attempt failed at validation:
```
ComfyUI rejected prompt [400]:
"image - Invalid image file: <filename>"
node 5 (LoadImage) — custom_validation_failed
```

**Root cause:** `app/main.js` line 128 had a Mac-default hardcoded path:
```js
const comfyInputDir = path.join(os.homedir(), 'Desktop', 'ComfyUI', 'input');
```

Aeris's platform-adaptive patch (commit `ae411cc`) correctly added a
`COMFYUI_DIR` env-var override to `startComfyUI()`, but missed this
parallel hardcoded path in the `wan:copyToInput` IPC handler.

On Citadel (`COMFYUI_DIR=D:\COMFYUI_FOR_WAN_BOOTH`):
- ComfyUI reads from `D:\COMFYUI_FOR_WAN_BOOTH\input\`
- main.js copied to `C:\Users\brand\Desktop\ComfyUI\input\` (auto-created phantom)
- ComfyUI saw nothing → "Invalid image file"

**Patch:**
```js
// app/main.js line 128
const comfyDir = process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
const comfyInputDir = path.join(comfyDir, 'input');
```

**Files changed:** `app/main.js`

---

### BUG #2 — `writeReport` ignored `COMFYUI_DIR` (export reports went to phantom dir)

**Symptom:** Not yet observed (would have surfaced after first successful gen).
Found via post-fix grep for the same class of bug.

**Root cause:** Same Mac-default hardcoded path, second site —
`app/main.js` line 191 in the `wan:writeReport` IPC handler:
```js
const outputDir = path.join(os.homedir(), 'Desktop', 'ComfyUI', 'output');
```

Aeris's S259 export-report feature would have written `<video>_report.txt`
to `C:\Users\brand\Desktop\ComfyUI\output\` instead of next to the actual
video at `D:\COMFYUI_FOR_WAN_BOOTH\output\`.

**Patch:**
```js
// app/main.js line 191
const comfyDir = process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
const outputDir = path.join(comfyDir, 'output');
```

**Files changed:** `app/main.js`

---

### BUG #3 — Renderer video preview pointed at phantom path

**Symptom:** Not yet observed (would have shown a broken `<video>` after
generation completed).
Found via post-fix grep for the same class of bug.

**Root cause:** `app/renderer.js` line 445 constructed the video preview
URL using a homedir + Mac-default suffix, with no env-var awareness:
```js
const outputPath = homedir + '/Desktop/ComfyUI/output/' + outputFilename;
```

Renderer is sandboxed from `process.env`, so this needed a new IPC bridge.

**Patch:** added a new IPC `wan:getComfyDir` so the renderer can resolve
the same path the main process resolves:

`app/main.js` — new handler:
```js
ipcMain.handle('wan:getComfyDir', async () => {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
});
```

`app/preload.js` — exposed via `window.wan`:
```js
getComfyDir: () => ipcRenderer.invoke('wan:getComfyDir'),
```

`app/renderer.js` — line 445 rewrite:
```js
const comfyDir   = await window.wan.getComfyDir();
const outputPath = comfyDir + '/output/' + outputFilename;
```

**Files changed:** `app/main.js`, `app/preload.js`, `app/renderer.js`

---

### Verification after Bugs #1-3

- `node test/regression.js` → PASS 137/137 (no contract regressions)
- App relaunched, full generation pipeline tested end-to-end
- `D:\COMFYUI_FOR_WAN_BOOTH\input\` receives dropped images
- `D:\COMFYUI_FOR_WAN_BOOTH\output\` receives both video + report .txt
- Video preview in renderer loads from real path

---

### Pattern note for Aeris

All three bugs are the same pattern: hardcoded `os.homedir() + 'Desktop' + 'ComfyUI'`.
Suggest factoring `getComfyDir()` into a single helper in `main.js` — both IPC
handlers (`copyToInput`, `writeReport`, `getComfyDir`) would call it once.
Renderer would only need the IPC bridge. Three call sites collapse to one source
of truth, future bugs of this class become impossible by construction.

```js
// proposed helper at top of main.js
function getComfyDir() {
  return process.env.COMFYUI_DIR || path.join(os.homedir(), 'Desktop', 'ComfyUI');
}
```

(Left as-is for this round — surgical fixes only. Refactor noted for next pass.)

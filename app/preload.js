const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wan', {
  selectImage:    () => ipcRenderer.invoke('wan:selectImage'),
  copyToInput:    (sourcePath) => ipcRenderer.invoke('wan:copyToInput', sourcePath),
  getComfyStatus: () => ipcRenderer.invoke('wan:getComfyStatus'),
  getHomedir:     () => ipcRenderer.invoke('wan:getHomedir'),
  getComfyDir:    () => ipcRenderer.invoke('wan:getComfyDir'),
  loadWorkflow:   (name) => ipcRenderer.invoke('wan:loadWorkflow', name),
  toFileURL:      (filePath) => ipcRenderer.invoke('wan:toFileURL', filePath),
  queuePrompt:    (payload) => ipcRenderer.invoke('wan:queuePrompt', payload),
  log:            (msg) => ipcRenderer.send('wan:log', msg),
  writeReport:    (filename, content) => ipcRenderer.invoke('wan:writeReport', { filename, content }),
  // NOTE: webUtils.getPathForFile() (Electron 28+ replacement for file.path) is renderer-only —
  // it cannot be bridged from preload on Electron 28. Revisit when upgrading to Electron 32+.
  listPresets:    ()               => ipcRenderer.invoke('wan:listPresets'),
  loadPreset:     (slug)           => ipcRenderer.invoke('wan:loadPreset', slug),
  savePreset:     (slug, data)     => ipcRenderer.invoke('wan:savePreset', { slug, data }),
  deletePreset:   (slug)           => ipcRenderer.invoke('wan:deletePreset', slug),
  listSeeds:      ()               => ipcRenderer.invoke('wan:listSeeds'),
  saveSeed:       (entry)          => ipcRenderer.invoke('wan:saveSeed', entry),
  deleteSeed:     (id)             => ipcRenderer.invoke('wan:deleteSeed', id),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wan', {
  selectImage:    () => ipcRenderer.invoke('wan:selectImage'),
  copyToInput:    (sourcePath) => ipcRenderer.invoke('wan:copyToInput', sourcePath),
  getComfyStatus: () => ipcRenderer.invoke('wan:getComfyStatus'),
  getHomedir:     () => ipcRenderer.invoke('wan:getHomedir'),
  loadWorkflow:   (name) => ipcRenderer.invoke('wan:loadWorkflow', name),
  toFileURL:      (filePath) => ipcRenderer.invoke('wan:toFileURL', filePath),
  queuePrompt:    (payload) => ipcRenderer.invoke('wan:queuePrompt', payload),
  log:            (msg) => ipcRenderer.send('wan:log', msg),
  writeReport:    (filePath, content) => ipcRenderer.invoke('wan:writeReport', { filePath, content }),
  // NOTE: webUtils.getPathForFile() (Electron 28+ replacement for file.path) is renderer-only —
  // it cannot be bridged from preload on Electron 28. Revisit when upgrading to Electron 32+.
});

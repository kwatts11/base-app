const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wizard', {
  // File system
  chooseFolder: () => ipcRenderer.invoke('wizard:choose-folder'),

  // Git
  clone: (targetPath, projectName) =>
    ipcRenderer.invoke('wizard:clone', targetPath, projectName),
  onCloneProgress: (cb) =>
    ipcRenderer.on('clone:progress', (_, msg) => cb(msg)),

  // Supabase connection test
  testSupabase: (url, anonKey) =>
    ipcRenderer.invoke('wizard:test-supabase', url, anonKey),

  // Generate all project files
  generate: (payload) => ipcRenderer.invoke('wizard:generate', payload),
  onGenerateProgress: (cb) =>
    ipcRenderer.on('generate:progress', (_, msg) => cb(msg)),

  // Shell helpers
  openUrl: (url) => ipcRenderer.invoke('wizard:open-url', url),
  showInFolder: (filePath) => ipcRenderer.invoke('wizard:show-in-folder', filePath),

  // Platform info
  platform: process.platform,
});

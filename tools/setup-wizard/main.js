const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

const { generate: orchestrate } = require('./lib/orchestrator');

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_APP_REPO = 'https://github.com/kwatts11/base-app';
const WINDOW_WIDTH = 960;
const WINDOW_HEIGHT = 700;

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 620,
    center: true,
    title: 'Base-App Setup Wizard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Choose folder ────────────────────────────────────────────────────────
ipcMain.handle('wizard:choose-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose where to create your new app',
    buttonLabel: 'Select Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── IPC: Clone base-app ───────────────────────────────────────────────────────
ipcMain.handle('wizard:clone', async (event, parentPath, projectName) => {
  const targetDir = path.join(parentPath, projectName);

  if (fs.existsSync(targetDir)) {
    return { ok: false, error: `Folder "${projectName}" already exists at that location.` };
  }

  return new Promise((resolve) => {
    const send = (msg) => { try { event.sender.send('clone:progress', msg); } catch {} };
    send('Cloning base-app...');
    const clone = exec(`git clone --depth=1 "${BASE_APP_REPO}" "${targetDir}"`, { timeout: 120000 });
    clone.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) send(line);
    });
    clone.on('close', (code) => {
      if (code !== 0) return resolve({ ok: false, error: 'git clone failed. Check your internet connection.' });
      send('Removing .git history...');
      try { fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true }); } catch {}
      send('Initializing fresh git repo...');
      exec(`git init && git add . && git commit -m "init: from base-app"`, { cwd: targetDir, timeout: 30000 }, (err) => {
        if (err) send('Warning: git init failed, but project files are ready.');
        else send('Git repository initialized.');
        resolve({ ok: true, targetDir });
      });
    });
    clone.on('error', (err) => resolve({ ok: false, error: `Clone error: ${err.message}` }));
  });
});

// ── IPC: Test Supabase connection ─────────────────────────────────────────────
ipcMain.handle('wizard:test-supabase', async (_, url, anonKey) => {
  try {
    const normalizedUrl = url.replace(/\/$/, '');
    const res = await fetch(`${normalizedUrl}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 400) return { ok: true };
    return { ok: false, error: `Server returned ${res.status}. Check your keys.` };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}` };
  }
});

// ── IPC: Generate project ─────────────────────────────────────────────────────
ipcMain.handle('wizard:generate', async (event, payload) => {
  try {
    const { targetDir, formData, icons, logo } = payload;
    const onProgress = (msg) => {
      try { event.sender.send('generate:progress', msg); } catch {}
    };

    const result = await orchestrate({ targetDir, formData, icons, logo, onProgress });

    const masterPromptPath = path.join(targetDir, 'master-prompt.md');
    execFile('cursor', [masterPromptPath], () => {});
    shell.showItemInFolder(masterPromptPath);

    return { ok: true, targetDir, masterPromptPath, ...result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Shell helpers ────────────────────────────────────────────────────────
ipcMain.handle('wizard:open-url', (_, url) => { shell.openExternal(url); });
ipcMain.handle('wizard:show-in-folder', (_, filePath) => { shell.showItemInFolder(filePath); });

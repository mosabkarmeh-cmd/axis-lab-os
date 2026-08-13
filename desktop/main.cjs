const { app, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

const PORT = Number(process.env.AXIS_PORT || 3210);
let serverProcess;
let mainWindow;


function setupAutoUpdater() {
  if (!app.isPackaged && process.env.AXIS_UPDATE_TEST !== '1') return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  if (process.env.AXIS_UPDATE_TEST_URL) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: process.env.AXIS_UPDATE_TEST_URL,
    });
    console.log('[AXIS UPDATER] Local test feed:', process.env.AXIS_UPDATE_TEST_URL);
  }

  autoUpdater.on('error', (error) => {
    console.error('[AXIS UPDATER]', error);
  });

  autoUpdater.on('update-available', async (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ØªØ­Ø¯ÙŠØ« AXIS LAB OS',
      message: `ÙŠØªÙˆÙØ± Ø¥ØµØ¯Ø§Ø± Ø¬Ø¯ÙŠØ¯: ${info.version}`,
      detail: 'Ù‡Ù„ ØªØ±ÙŠØ¯ ØªÙ†Ø²ÙŠÙ„ Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¢Ù†ØŸ ÙŠÙ…ÙƒÙ†Ùƒ Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø¹Ù…Ù„ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„ØªÙ†Ø²ÙŠÙ„.',
      buttons: ['ØªÙ†Ø²ÙŠÙ„ Ø§Ù„ØªØ­Ø¯ÙŠØ«', 'Ù„Ø§Ø­Ù‚Ù‹Ø§'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => console.error('[AXIS UPDATER DOWNLOAD]', error));
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AXIS UPDATER] Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù…Ø­Ø¯Ø«.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AXIS UPDATER] ${progress.percent.toFixed(1)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø¬Ø§Ù‡Ø²',
      message: `ØªÙ… ØªÙ†Ø²ÙŠÙ„ Ø§Ù„Ø¥ØµØ¯Ø§Ø± ${info.version} Ø¨Ù†Ø¬Ø§Ø­.`,
      detail: 'Ø³ÙŠØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª SQLite Ø«Ù… Ø¥Ø¹Ø§Ø¯Ø© ØªØ´ØºÙŠÙ„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù„ØªØ«Ø¨ÙŠØª Ø§Ù„ØªØ­Ø¯ÙŠØ«.',
      buttons: ['Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ ÙˆØ§Ù„ØªØ«Ø¨ÙŠØª', 'Ù„Ø§Ø­Ù‚Ù‹Ø§'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => console.error('[AXIS UPDATER CHECK]', error));
  }, 5000);
}
function projectRoot() {
  return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
}

function serverPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'server.cjs')
    : path.join(projectRoot(), 'dist', 'server.cjs');
}

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        retry();
      });
      request.on('error', retry);
      request.setTimeout(1200, () => { request.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('Ù„Ù… ÙŠØ¨Ø¯Ø£ Ø®Ø§Ø¯Ù… AXIS LAB Ø®Ù„Ø§Ù„ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…ØªÙˆÙ‚Ø¹'));
      setTimeout(check, 300);
    };
    check();
  });
}

function startServer() {
  const root = projectRoot();
  serverProcess = spawn(process.execPath, [serverPath()], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DB_MODE: 'sqlite',
      AXIS_DATA_FILE: path.join(app.getPath('userData'), 'axis-data.sqlite'),
      AXIS_LEGACY_DATA_FILE: path.join(app.getPath('userData'), 'axis-data.json'),
      SQLITE_WASM_PATH: app.isPackaged ? path.join(process.resourcesPath, 'sql-wasm.wasm') : path.join(projectRoot(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      PORT: String(PORT),
      APP_URL: `http://127.0.0.1:${PORT}`,
      JWT_SECRET: process.env.JWT_SECRET || 'AXIS-LAB-DESKTOP-PREVIEW-SECRET-CHANGE-ME-2026',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  serverProcess.stdout.on('data', (data) => console.log(`[AXIS SERVER] ${data}`));
  serverProcess.stderr.on('data', (data) => console.error(`[AXIS SERVER] ${data}`));
  serverProcess.on('exit', (code) => {
    if (code && !app.isQuitting) dialog.showErrorBox('ØªØ¹Ø°Ø± ØªØ´ØºÙŠÙ„ AXIS LAB', `ØªÙˆÙ‚Ù Ø§Ù„Ø®Ø§Ø¯Ù… Ø¨Ø±Ù…Ø² ${code}`);
  });
}

const appIcon = app.isPackaged ? path.join(process.resourcesPath, 'icon.ico') : path.join(__dirname, '..', 'assets', 'icon.ico');

async function createWindow() {
  await waitForServer(`http://127.0.0.1:${PORT}/api/health`);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#09090b',
    icon: appIcon,
    title: 'AXIS LAB OS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    startServer();
    await createWindow();
    setupAutoUpdater();
  } catch (error) {
    dialog.showErrorBox('AXIS LAB', error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});






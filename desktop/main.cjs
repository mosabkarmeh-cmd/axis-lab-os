const { app, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');

const PORT = Number(process.env.AXIS_PORT || 3210);
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}
let serverProcess;
let mainWindow;
let bootstrapPasswordCreated = false;

function getBootstrapAdminPassword() {
  const passwordPath = path.join(app.getPath('userData'), 'bootstrap-admin-password.txt');
  try {
    const existing = fs.readFileSync(passwordPath, 'utf8').trim();
    if (existing.length >= 12) return existing;
  } catch {}
  const generated = crypto.randomBytes(12).toString('base64url');
  fs.mkdirSync(path.dirname(passwordPath), { recursive: true });
  fs.writeFileSync(passwordPath, generated, { encoding: 'utf8', mode: 0o600 });
  bootstrapPasswordCreated = true;
  return generated;
}

function getDesktopJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  const secretPath = path.join(app.getPath('userData'), 'jwt-secret');
  try {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch {}
  const generated = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, generated, { encoding: 'utf8', mode: 0o600 });
  return generated;
}

function getInstallScope() {
  if (!app.isPackaged) return 'current-user';
  try {
    return fs.readFileSync(path.join(process.resourcesPath, 'install-scope.txt'), 'utf8').trim() || 'current-user';
  } catch {
    return 'current-user';
  }
}

function setupAutoUpdater() {
  if (getInstallScope() === 'all-users') {
    console.log('[AXIS UPDATER] All Users installation detected; automatic updates are disabled until a dedicated machine-wide update channel is available.');
    return;
  }
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
      NODE_PATH: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'node_modules')
        : path.join(projectRoot(), 'node_modules'),
      DB_MODE: 'sqlite',
      AXIS_DATA_FILE: path.join(app.getPath('userData'), 'axis-data.sqlite'),
      AXIS_LEGACY_DATA_FILE: path.join(app.getPath('userData'), 'axis-data.json'),
      SQLITE_WASM_PATH: app.isPackaged ? path.join(process.resourcesPath, 'sql-wasm.wasm') : path.join(projectRoot(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      PORT: String(PORT),
      APP_URL: `http://127.0.0.1:${PORT}`,
      SERVER_HOST: '127.0.0.1',
      ALLOW_PUBLIC_REGISTRATION: 'false',
      BOOTSTRAP_ADMIN_PASSWORD: getBootstrapAdminPassword(),
      JWT_SECRET: getDesktopJwtSecret(),
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

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  try {
    startServer();
    await createWindow();
    if (bootstrapPasswordCreated && mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'بيانات المسؤول لأول تشغيل',
        message: 'تم إنشاء حساب المسؤول تلقائيًا.',
        detail: 'البريد: admin@axislab.com\nكلمة المرور المؤقتة: ' + getBootstrapAdminPassword() + '\nاحفظها ثم غيّرها فورًا من الإعدادات. لن يتم توليد كلمة مرور جديدة بعد ذلك.',
        buttons: ['فهمت، متابعة'],
      });
    }
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






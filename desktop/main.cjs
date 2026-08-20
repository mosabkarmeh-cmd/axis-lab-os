const { app, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');

const args = process.argv.slice(2);
function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
const IS_CENTRAL_SERVER = args.includes('--central-server');
const PORT = Number(argValue('--port') || process.env.AXIS_PORT || 3210);
const CLI_DATA_DIR = argValue('--data-dir');
let REMOTE_SERVER_URL = String(process.env.AXIS_REMOTE_URL || '').replace(/\/+$/, '');
let IS_REMOTE_CLIENT = Boolean(REMOTE_SERVER_URL) && !IS_CENTRAL_SERVER;

function isValidRemoteUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function loadRemoteServerUrl() {
  if (isValidRemoteUrl(REMOTE_SERVER_URL)) return REMOTE_SERVER_URL;
  try {
    const configPath = path.join(app.getPath('userData'), 'network-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const configuredUrl = String(config.serverUrl || '').replace(/\/+$/, '');
    return isValidRemoteUrl(configuredUrl) ? configuredUrl : '';
  } catch {
    return '';
  }
}

function serverBaseUrl() {
  return REMOTE_SERVER_URL || `http://127.0.0.1:${PORT}`;
}
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
    if (existing) return existing;
  } catch {}
  const initialPassword = '12345';
  fs.mkdirSync(path.dirname(passwordPath), { recursive: true });
  fs.writeFileSync(passwordPath, initialPassword, { encoding: 'utf8', mode: 0o600 });
  bootstrapPasswordCreated = true;
  return initialPassword;
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

function getGitHubUpdaterToken() {
  const fromEnvironment = String(process.env.AXIS_GITHUB_TOKEN || '').trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    const tokenPath = path.join(app.getPath('userData'), 'github-update-token.txt');
    return fs.readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return '';
  }
}

function setupAutoUpdater() {
  // Temporary production policy: automatic updates are enabled while remaining fixes are distributed.
  // Set AXIS_ENABLE_AUTO_UPDATE=false to disable them explicitly.
  if (process.env.AXIS_ENABLE_AUTO_UPDATE === 'false') {
    console.log('[AXIS UPDATER] Manual update override active; automatic checks are disabled.');
    return;
  }
  // Updates are enabled for both current-user and All Users installations.
  // quitAndInstall may request elevation when the application is machine-wide.
  if (!app.isPackaged && process.env.AXIS_UPDATE_TEST !== '1') return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const githubToken = getGitHubUpdaterToken();
  if (githubToken && !process.env.AXIS_UPDATE_TEST_URL) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'mosabkarmeh-cmd',
      repo: 'axis-lab-os',
      private: true,
      token: githubToken,
      releaseType: 'release',
    });
    console.log('[AXIS UPDATER] Private GitHub update channel enabled.');
  } else if (!process.env.AXIS_UPDATE_TEST_URL) {
    console.warn('[AXIS UPDATER] No private GitHub token found; update check may fail for the private repository.');
  }

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
      title: 'تحديث AXIS LAB OS',
      message: `يتوفر إصدار جديد: ${info.version}`,
      detail: 'هل تريد تنزيل التحديث الآن؟ يمكنك متابعة العمل أثناء التنزيل.',
      buttons: ['تنزيل التحديث', 'لاحقاً'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => console.error('[AXIS UPDATER DOWNLOAD]', error));
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AXIS UPDATER] التطبيق محدث.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AXIS UPDATER] ${progress.percent.toFixed(1)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'التحديث جاهز',
      message: `تم تنزيل الإصدار ${info.version} بنجاح.`,
      detail: 'سيتم حفظ بيانات SQLite ثم إعادة تشغيل التطبيق لتثبيت التحديث.',
      buttons: ['إعادة التشغيل والتثبيت', 'لاحقاً'],
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
      if (Date.now() - started > timeoutMs) return reject(new Error('لم يبدأ خادم AXIS LAB خلال الوقت المتوقع'));
      setTimeout(check, 300);
    };
    check();
  });
}

function startServer() {
  if (IS_REMOTE_CLIENT) {
    console.log(`[AXIS CLIENT] Remote server mode: ${REMOTE_SERVER_URL}`);
    return;
  }
  const root = projectRoot();
  serverProcess = spawn(process.execPath, [serverPath()], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: app.isPackaged ? '1' : undefined,
      NODE_PATH: app.isPackaged
        ? [
            path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'),
            path.join(process.resourcesPath, 'app.asar', 'node_modules'),
            path.join(process.resourcesPath, 'node_modules'),
          ].join(path.delimiter)
        : path.join(projectRoot(), 'node_modules'),
      DB_MODE: 'sqlite',
      AXIS_DATA_FILE: process.env.AXIS_DATA_FILE || path.join(process.env.AXIS_DATA_DIR || CLI_DATA_DIR || app.getPath('userData'), 'axis-data.sqlite'),
      AXIS_LEGACY_DATA_FILE: process.env.AXIS_LEGACY_DATA_FILE || path.join(process.env.AXIS_DATA_DIR || CLI_DATA_DIR || app.getPath('userData'), 'axis-data.json'),
      SQLITE_WASM_PATH: app.isPackaged ? path.join(process.resourcesPath, 'sql-wasm.wasm') : path.join(projectRoot(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      PORT: String(PORT),
      APP_URL: process.env.AXIS_APP_URL || `http://${IS_CENTRAL_SERVER ? 'localhost' : '127.0.0.1'}:${PORT}`,
      SERVER_HOST: process.env.AXIS_SERVER_HOST || (IS_CENTRAL_SERVER ? '0.0.0.0' : '127.0.0.1'),
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
    if (code && !app.isQuitting) dialog.showErrorBox('تعذر تشغيل AXIS LAB', `توقف الخادم برمز ${code}`);
  });
}

const appIcon = app.isPackaged ? path.join(process.resourcesPath, 'icon.ico') : path.join(__dirname, '..', 'assets', 'icon.ico');

async function createWindow() {
  await waitForServer(`${serverBaseUrl()}/api/health`);
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
  await mainWindow.loadURL(serverBaseUrl());
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
    REMOTE_SERVER_URL = loadRemoteServerUrl();
    IS_REMOTE_CLIENT = Boolean(REMOTE_SERVER_URL) && !IS_CENTRAL_SERVER;
    startServer();
    if (IS_CENTRAL_SERVER) {
      await waitForServer(`http://127.0.0.1:${PORT}/api/health`);
      console.log(`[AXIS CENTRAL] Ready on 0.0.0.0:${PORT}`);
      return;
    }
    await createWindow();
    if (!IS_CENTRAL_SERVER && bootstrapPasswordCreated && mainWindow && !mainWindow.isDestroyed()) {
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

app.on('window-all-closed', () => { if (!IS_CENTRAL_SERVER && process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});






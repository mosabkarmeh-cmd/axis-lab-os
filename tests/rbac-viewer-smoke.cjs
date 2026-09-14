const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axis-viewer-rbac-'));
const dbFile = path.join(tempDir, 'axis-data.sqlite');
const port = 38200 + Math.floor(Math.random() * 500);
const secret = 'viewer-rbac-smoke-secret-012345678901234567890';
const baseUrl = `http://127.0.0.1:${port}`;
const adminToken = jwt.sign({ sub: 'u-1', email: 'admin@axislab.com', fullName: 'Admin Smoke', role: 'admin' }, secret, { algorithm: 'HS256', expiresIn: '10m', issuer: 'axislab-api', audience: 'axislab-web' });
let viewerToken;
let server;
let logs = '';

function start() {
  server = spawn(process.execPath, [path.resolve('dist/server.cjs')], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production', DB_MODE: 'sqlite', PORT: String(port), SERVER_HOST: '127.0.0.1', APP_URL: baseUrl, ALLOW_PUBLIC_REGISTRATION: 'false', JWT_SECRET: secret, AXIS_DATA_FILE: dbFile, AXIS_LEGACY_DATA_FILE: path.join(tempDir, 'missing.json'), SQLITE_WASM_PATH: path.resolve('node_modules/sql.js/dist/sql-wasm.wasm') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { logs += chunk.toString(); });
  server.stderr.on('data', chunk => { logs += chunk.toString(); });
}

function stop() {
  return new Promise(resolve => {
    if (!server || server.killed) return resolve();
    server.once('exit', resolve);
    server.kill('SIGTERM');
    setTimeout(() => { if (!server.killed) server.kill('SIGKILL'); }, 3000);
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${baseUrl}/api/health`); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`server did not become healthy: ${logs}`);
}

async function request(route, options = {}, token = viewerToken) {
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  try {
    start();
    await waitForHealth();
    const created = await request('/api/users', { method: 'POST', body: JSON.stringify({ email: 'viewer@axislab.test', password: 'ViewerPass123!', fullName: 'Viewer Smoke', role: 'viewer', isActive: true }) }, adminToken);
    assert(created.response.ok && created.body.user?.id, `Could not create viewer fixture: ${created.response.status}`);
    viewerToken = jwt.sign({ sub: created.body.user.id, email: 'viewer@axislab.test', fullName: 'Viewer Smoke', role: 'viewer' }, secret, { algorithm: 'HS256', expiresIn: '10m', issuer: 'axislab-api', audience: 'axislab-web' });
    const read = await request('/api/orders');
    assert(read.response.ok && Array.isArray(read.body), 'Viewer cannot read orders');
    const write = await request('/api/orders', { method: 'POST', body: JSON.stringify({ customerId: 'viewer-test', items: [{ productName: 'Blocked', quantity: 1, unitPrice: 1 }], totalPrice: 1, paidAmount: 0 }) });
    assert(write.response.status === 403, `Viewer write was not blocked: ${write.response.status}`);
    const report = await request('/api/reports/analytics');
    assert(report.response.ok && report.body.success, 'Viewer cannot read reports');
    console.log(JSON.stringify({ status: 'PASS', role: 'viewer', readOrders: read.body.length, blockedWriteStatus: write.response.status, canReadReports: true }, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    console.error(logs);
    process.exitCode = 1;
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

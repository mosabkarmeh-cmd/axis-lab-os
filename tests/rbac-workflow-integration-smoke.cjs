const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axis-rbac-workflow-'));
const dbFile = path.join(tempDir, 'axis-data.sqlite');
const port = 38700 + Math.floor(Math.random() * 300);
const secret = 'rbac-workflow-integration-secret-012345678901234567890';
const baseUrl = `http://127.0.0.1:${port}`;
const adminToken = jwt.sign({ sub: 'u-1', email: 'admin@axislab.com', fullName: 'Admin', role: 'admin' }, secret, { algorithm: 'HS256', expiresIn: '10m', issuer: 'axislab-api', audience: 'axislab-web' });
const tokens = { admin: adminToken };
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
async function request(role, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens[role]}`, ...(options.headers || {}) } });
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  try {
    start();
    await waitForHealth();
    for (const role of ['employee', 'accountant', 'viewer']) {
      const created = await request('admin', '/api/users', { method: 'POST', body: JSON.stringify({ email: `${role}@integration.test`, password: 'IntegrationPass123!', fullName: role, role, isActive: true }) });
      assert(created.response.ok && created.body.user?.id, `Could not create ${role}: ${created.response.status}`);
      tokens[role] = jwt.sign({ sub: created.body.user.id, email: `${role}@integration.test`, fullName: role, role }, secret, { algorithm: 'HS256', expiresIn: '10m', issuer: 'axislab-api', audience: 'axislab-web' });
    }

    const reads = {};
    for (const role of ['admin', 'employee', 'accountant', 'viewer']) {
      const orders = await request(role, '/api/orders');
      assert(orders.response.ok && Array.isArray(orders.body), `${role} cannot read orders`);
      reads[role] = orders.body.length;
    }

    const order = await request('admin', '/api/orders', { method: 'POST', body: JSON.stringify({ customerId: 'c-1', items: [{ productName: 'Integration order', quantity: 1, unitPrice: 1000 }], totalPrice: 1000, paidAmount: 1000, paidAmountSYP: 1000, priority: 'normal' }) });
    assert(order.response.ok && order.body.id, `Admin could not create order: ${order.response.status}`);
    const orderId = order.body.id;

    const invalid = await request('admin', `/api/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'not-a-real-status' }) });
    assert(invalid.response.status === 400, `Invalid status was accepted: ${invalid.response.status}`);

    const blockedDeliveryOrder = await request('admin', '/api/orders', { method: 'POST', body: JSON.stringify({ customerId: 'c-1', items: [{ productName: 'Unpaid integration order', quantity: 1, unitPrice: 1000 }], totalPrice: 1000, paidAmount: 0, priority: 'normal' }) });
    assert(blockedDeliveryOrder.response.ok && blockedDeliveryOrder.body.id, 'Could not create unpaid order');
    const blockedDelivery = await request('admin', `/api/orders/${blockedDeliveryOrder.body.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) });
    assert(blockedDelivery.response.status === 400, `Unpaid delivery was accepted: ${blockedDelivery.response.status}`);

    const workflow = ['design', 'design_approved', 'cutting', 'cutting_complete', 'assembly', 'assembly_complete', 'packaging', 'ready', 'delivered'];
    for (const status of workflow) {
      const result = await request('admin', `/api/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes: `integration-${status}` }) });
      assert(result.response.ok && result.body.status === status, `Workflow transition failed at ${status}: ${result.response.status} ${JSON.stringify(result.body)}`);
    }

    const viewerWrite = await request('viewer', '/api/orders', { method: 'POST', body: JSON.stringify({ customerId: 'c-1', items: [{ productName: 'blocked', quantity: 1, unitPrice: 1 }], totalPrice: 1, paidAmount: 0 }) });
    assert(viewerWrite.response.status === 403, `Viewer write was not blocked: ${viewerWrite.response.status}`);
    const employeeAccountingWrite = await request('employee', '/api/accounting/expenses', { method: 'POST', body: JSON.stringify({ category: 'blocked', amount: 1 }) });
    assert(employeeAccountingWrite.response.status === 403, `Employee accounting write was not blocked: ${employeeAccountingWrite.response.status}`);
    const accountantProductionWrite = await request('accountant', '/api/production/jobs', { method: 'POST', body: JSON.stringify({ itemName: 'blocked' }) });
    assert(accountantProductionWrite.response.status === 403, `Accountant production write was not blocked: ${accountantProductionWrite.response.status}`);

    console.log(JSON.stringify({ status: 'PASS', permissions: { readableRoles: Object.keys(reads), viewerWrite: 403, employeeAccountingWrite: 403, accountantProductionWrite: 403 }, workflow: { transitions: workflow.length, finalStatus: 'delivered', invalidStatus: 400, unpaidDelivery: 400 }, orderCountsAtStart: reads }, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    console.error(logs);
    process.exitCode = 1;
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = '3227';
const suffix = `axis-excel-smoke-${Date.now()}`;
const hash = '$2b$12$FVbzYsRq334HtFOWPKGraulmutIDHfl9trHYIdaAKQwI9x9/76mFK';
const env = {
  ...process.env,
  JWT_SECRET: 'excel-smoke-secret-12345678901234567890',
  DEMO_ADMIN_PASSWORD_HASH: hash,
  DB_MODE: 'sqlite',
  PORT: port,
  SERVER_HOST: '127.0.0.1',
  AXIS_DATA_FILE: path.join(require('node:os').tmpdir(), `${suffix}.sqlite`),
  AXIS_LEGACY_DATA_FILE: path.join(require('node:os').tmpdir(), `${suffix}.json`),
  SQLITE_WASM_PATH: path.join(root, 'node_modules/sql.js/dist/sql-wasm.wasm'),
};
const child = spawn(process.execPath, [path.join(root, 'dist/server.cjs')], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`server did not start: ${stderr.slice(-1000)}`);
}

(async () => {
  try {
    await waitForServer();
    const unauthorizedResponse = await fetch(`http://127.0.0.1:${port}/api/import/excel/preview`, { method: 'POST' });
    if (![401, 403].includes(unauthorizedResponse.status)) throw new Error(`unauthorized preview was not blocked: ${unauthorizedResponse.status}`);
    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@axislab.com', password: '12345' }) });
    if (!loginResponse.ok) throw new Error(`login failed: ${loginResponse.status} ${await loginResponse.text()}`);
    const login = await loginResponse.json();
    const workbookPath = path.join('/home/ubuntu', 'AXIS-LAB-OS-Import-Template.xlsx');
    if (!fs.existsSync(workbookPath)) throw new Error(`template missing: ${workbookPath}`);
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(workbookPath)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'AXIS-LAB-OS-Import-Template.xlsx');
    const previewResponse = await fetch(`http://127.0.0.1:${port}/api/import/excel/preview`, { method: 'POST', headers: { authorization: `Bearer ${login.token}` }, body: form });
    const preview = await previewResponse.json();
    if (!previewResponse.ok || !preview.success) throw new Error(`preview failed: ${previewResponse.status} ${JSON.stringify(preview)}`);
    const summary = preview.sheets.map((sheet) => `${sheet.name}:${sheet.kind}:${sheet.rows.length}`).join(',');
    console.log(`EXCEL_PREVIEW_OK ${summary}`);
  } finally {
    child.kill('SIGTERM');
    for (const file of [env.AXIS_DATA_FILE, env.AXIS_LEGACY_DATA_FILE]) { try { fs.rmSync(file, { force: true }); } catch {} }
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

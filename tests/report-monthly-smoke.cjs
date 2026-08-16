const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const port = 4100 + Math.floor(Math.random() * 200);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-report-smoke-"));
const secret = "axis-report-smoke-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Report Smoke", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const env = { ...process.env, NODE_ENV: "production", DB_MODE: "sqlite", PORT: String(port), SERVER_HOST: "127.0.0.1", ALLOW_PUBLIC_REGISTRATION: "false", JWT_SECRET: secret, AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"), AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"), SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm") };
let child;
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
const request = async (url, options = {}) => { const response = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } }); const body = await response.json(); return { response, body }; };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitForHealth = async () => { const deadline = Date.now() + 15000; while (Date.now() < deadline) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 200)); } throw new Error("server health timeout"); };
(async () => {
  try {
    child = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: process.cwd(), env, stdio: "ignore" });
    await waitForHealth();
    const baseline = await request("/api/accounting/stats");
    const baselineExpensesSYP = Number(baseline.body.stats?.totalExpensesSYP || 0);
    const first = await request("/api/accounting/expenses", { method: "POST", body: JSON.stringify({ category: "monthly-2025", amount: 10, amountSYP: 1350, exchangeRateAtCreation: 135, date: "2025-01-15", status: "paid" }) });
    const second = await request("/api/accounting/expenses", { method: "POST", body: JSON.stringify({ category: "monthly-2026", amount: 20, amountSYP: 2700, exchangeRateAtCreation: 135, date: "2026-01-15", status: "paid" }) });
    assert(first.response.ok && second.response.ok, `expense setup failed: ${JSON.stringify({ first: first.body, second: second.body })}`);
    const before = await request("/api/accounting/stats");
    const trends = before.body.stats?.monthlyTrends || [];
    const trendKeys = new Set(trends.map(row => row.monthKey));
    assert(trendKeys.has("2025-01") && trendKeys.has("2026-01"), `Year-month buckets were merged or omitted: ${JSON.stringify(trends)}`);
    assert(before.body.stats.totalExpensesSYP === baselineExpensesSYP + 4050, `Unexpected SYP delta before rate update: baseline=${baselineExpensesSYP}, current=${before.body.stats.totalExpensesSYP}`);
    const rate = await request("/api/exchange-rate", { method: "PUT", body: JSON.stringify({ exchangeRate: 200 }) });
    assert(rate.response.ok, `rate update failed: ${JSON.stringify(rate.body)}`);
    const after = await request("/api/accounting/stats");
    assert(after.body.stats.totalExpensesSYP === baselineExpensesSYP + 4050, `Historical SYP expense changed after rate update: baseline=${baselineExpensesSYP}, current=${after.body.stats.totalExpensesSYP}`);
    console.log("report-monthly-smoke: PASS");
  } finally {
    if (child && !child.killed) child.kill("SIGTERM");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(`report-monthly-smoke: FAIL — ${error.message}`); process.exitCode = 1; });

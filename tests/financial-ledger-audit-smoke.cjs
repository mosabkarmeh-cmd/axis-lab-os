const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const port = 3500 + Math.floor(Math.random() * 300);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-financial-audit-"));
const secret = "axis-financial-audit-secret-0123456789";
const env = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: "sqlite",
  PORT: String(port),
  SERVER_HOST: "127.0.0.1",
  JWT_SECRET: secret,
  AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"),
  AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
  SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
};
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Audit Admin", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
let child;
let logs = "";
const start = () => {
  child = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (b) => { logs += b.toString(); });
  child.stderr.on("data", (b) => { logs += b.toString(); });
};
const stop = () => new Promise((resolve) => { if (!child || child.killed) return resolve(); child.once("exit", resolve); child.kill("SIGTERM"); });
const request = async (url, options = {}) => { const r = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } }); const body = await r.json().catch(() => ({})); return { r, body }; };
const waitHealth = async () => { const end = Date.now() + 15000; while (Date.now() < end) { try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return; } catch {} await new Promise((x) => setTimeout(x, 200)); } throw new Error(`health timeout: ${logs}`); };
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
(async () => {
  try {
    start(); await waitHealth();
    const settings = await request("/api/settings", { method: "PUT", body: JSON.stringify({ exchangeRate: 135, partnerSharePercent: 25 }) });
    assert(settings.r.ok && settings.body.settings.partnerSharePercent === 25, `settings update failed: ${JSON.stringify(settings.body)}`);
    const customer = await request("/api/customers", { method: "POST", body: JSON.stringify({ name: "Financial Audit Customer", phone: "000000" }) });
    const customerId = customer.body.id || "c-1";
    const order = await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId, items: [{ productName: "Audit item", quantity: 1, unitPrice: 13500 }], totalPrice: 13500, paidAmount: 0, priority: "normal" }) });
    assert(order.r.ok && order.body.id, `order failed: ${JSON.stringify(order.body)}`);
    const payment = await request(`/api/orders/${order.body.id}/payments`, { method: "POST", body: JSON.stringify({ amount: 6750, currency: "SYP", paymentId: "audit-syp-payment", paymentMethod: "cash" }) });
    assert(payment.r.ok && payment.body.paidAmount === 6750 && payment.body.remaining === 6750 && payment.body.payments[0].amountSYP === 6750, `SYP payment incorrect: ${JSON.stringify(payment.body)}`);
    const expense = await request("/api/accounting/expenses", { method: "POST", body: JSON.stringify({ category: "صيانة", amount: 10, amountSYP: 1350, date: "2026-08-22", status: "paid" }) });
    assert(expense.r.ok && expense.body.expense.amountSYP === 1350, `expense failed: ${JSON.stringify(expense.body)}`);
    const stats = await request("/api/accounting/stats");
    assert(stats.r.ok && stats.body.stats.totalRevenueSYP === 6750 && stats.body.stats.totalExpensesSYP === 1350 && stats.body.stats.netProfitSYP === 5400, `stats incorrect: ${JSON.stringify(stats.body)}`);
    assert(Math.abs(stats.body.stats.netProfitSYP * 0.25 - 1350) < 0.01, `partner SYP calculation incorrect: ${JSON.stringify(stats.body.stats)}`);
    await new Promise((x) => setTimeout(x, 1200)); await stop(); start(); await waitHealth();
    const restoredSettings = await request("/api/settings");
    assert(restoredSettings.r.ok && restoredSettings.body.settings.exchangeRate === 135 && restoredSettings.body.settings.partnerSharePercent === 25, `financial settings did not persist: ${JSON.stringify(restoredSettings.body)}`);
    const restoredStats = await request("/api/accounting/stats");
    assert(restoredStats.body.stats.totalRevenueSYP === 6750 && restoredStats.body.stats.netProfitSYP === 5400, `financial ledger did not persist: ${JSON.stringify(restoredStats.body.stats)}`);
    console.log("financial-ledger-audit-smoke: PASS");
  } catch (error) { console.error(`financial-ledger-audit-smoke: FAIL - ${error.message}`); process.exitCode = 1; }
  finally { await stop(); }
})();

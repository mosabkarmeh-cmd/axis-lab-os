const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const initSqlJs = require("sql.js");

const root = process.cwd();
const port = 4900 + Math.floor(Math.random() * 100);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-crash-"));
const dataFile = path.join(tempDir, "axis-data.sqlite");
const secret = "axis-lab-crash-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Crash Test", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
let server;
let logs = "";

function start() {
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: root, env: { ...process.env, NODE_ENV: "production", DB_MODE: "sqlite", PORT: String(port), SERVER_HOST: "127.0.0.1", JWT_SECRET: secret, ALLOW_PUBLIC_REGISTRATION: "false", AXIS_DATA_FILE: dataFile, AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"), SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm") }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  server.stderr.on("data", (chunk) => { logs += chunk.toString(); });
}
function hardStop() { if (server && !server.killed) server.kill("SIGKILL"); }
async function stop() { return new Promise((resolve) => { if (!server || server.killed) return resolve(); server.once("exit", resolve); server.kill("SIGTERM"); }); }
async function waitForHealth() { const deadline = Date.now() + 15000; while (Date.now() < deadline) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`health timeout\n${logs}`); }
async function request(pathname, options = {}) { const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { ...options, headers: { ...headers, ...(options.headers || {}) } }); const body = await response.json(); return { response, body }; }
function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  try {
    start(); await waitForHealth();
    const baseline = await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: "c-1", items: [{ productName: "Crash baseline", quantity: 1, unitPrice: 11 }], totalPrice: 11, paidAmount: 0, priority: "normal" }) });
    assert(baseline.response.ok && baseline.body.id, `baseline write failed: ${baseline.response.status} ${JSON.stringify(baseline.body)}`);
    const fileDeadline = Date.now() + 4000;
    while (!fs.existsSync(dataFile) && Date.now() < fileDeadline) await new Promise((resolve) => setTimeout(resolve, 100));
    assert(fs.existsSync(dataFile), "database file was not flushed for baseline state");
    const order = await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: "c-1", items: [{ productName: "Crash durability test", quantity: 1, unitPrice: 77 }], totalPrice: 77, paidAmount: 0, priority: "high" }) });
    assert(order.response.ok && order.body.id, `write failed: ${order.response.status} ${JSON.stringify(order.body)}`);
    const orderId = order.body.id;
    hardStop();
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(fs.existsSync(dataFile), "database file missing after forced stop");
    start(); await waitForHealth();
    const orders = await request("/api/orders");
    assert(orders.response.ok && orders.body.some((item) => item.id === orderId), `written order was lost after forced stop: ${orderId}`);
    await stop();
    const SQL = await initSqlJs({ locateFile: (file) => path.resolve("node_modules/sql.js/dist", file) });
    const database = new SQL.Database(fs.readFileSync(dataFile));
    const integrity = String(database.exec("PRAGMA integrity_check")[0].values[0][0]);
    const schema = String(database.exec("SELECT value FROM local_metadata WHERE key = 'schema_version'")[0].values[0][0]);
    const indexes = database.exec("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_local_entities_%'")[0].values.map(([name]) => String(name));
    database.close();
    assert(integrity === "ok", `integrity check failed: ${integrity}`);
    assert(schema === "5", `unexpected schema version: ${schema}`);
    assert(indexes.includes("idx_local_entities_collection_updated") && indexes.includes("idx_local_entities_entity"), `SQLite indexes missing: ${indexes.join(",")}`);
    console.log(`sqlite-crash-recovery-smoke: PASS (forced-stop persistence, restart recovery, integrity, schema v${schema}, indexes)`);
  } catch (error) {
    console.error(`sqlite-crash-recovery-smoke: FAIL - ${error.message}\n${logs}`);
    try { hardStop(); } catch {}
    process.exitCode = 1;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const jwt = require(path.join(root, "node_modules/jsonwebtoken"));
const initSqlJs = require(path.join(root, "node_modules/sql.js"));
const port = 4600 + Math.floor(Math.random() * 200);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-perf-"));
const dataFile = path.join(tempDir, "axis-data.sqlite");
const secret = "axis-lab-performance-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Performance Admin", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
let child;
let logs = "";

function start() {
  child = spawn(process.execPath, [path.join(root, "dist/server.cjs")], { cwd: root, env: { ...process.env, NODE_ENV: "production", DB_MODE: "sqlite", PORT: String(port), SERVER_HOST: "127.0.0.1", JWT_SECRET: secret, ALLOW_PUBLIC_REGISTRATION: "false", AXIS_DATA_FILE: dataFile, AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"), SQLITE_WASM_PATH: path.join(root, "node_modules/sql.js/dist/sql-wasm.wasm") }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (x) => { logs += x.toString(); });
  child.stderr.on("data", (x) => { logs += x.toString(); });
}
function stop() { return new Promise((resolve) => { if (!child || child.killed) return resolve(); child.once("exit", resolve); child.kill("SIGTERM"); }); }
async function waitHealth() { const until = Date.now() + 15000; while (Date.now() < until) { try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); } throw new Error(`health timeout\n${logs}`); }
async function request(url, options = {}) { const started = performance.now(); const response = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } }); const body = await response.json(); return { ms: performance.now() - started, response, body }; }
function stats(values) { const sorted = [...values].sort((a, b) => a - b); const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]; return { count: sorted.length, min: Number(sorted[0].toFixed(2)), p50: Number(pct(0.5).toFixed(2)), p95: Number(pct(0.95).toFixed(2)), max: Number(sorted.at(-1).toFixed(2)), avg: Number((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2)) }; }
function assert(ok, message) { if (!ok) throw new Error(message); }

(async () => {
  try {
    start(); await waitHealth();
    const reads = [];
    for (let batch = 0; batch < 5; batch++) {
      const batchResults = await Promise.all(Array.from({ length: 8 }, () => request("/api/orders")));
      batchResults.forEach((r) => { assert(r.response.ok && Array.isArray(r.body), `orders read failed: ${r.response.status}`); reads.push(r.ms); });
    }
    const writes = [];
    for (let i = 0; i < 20; i++) {
      const r = await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: "c-1", items: [{ productName: `Performance item ${i}`, quantity: 1, unitPrice: 10 + i }], totalPrice: 10 + i, paidAmount: 0, priority: "normal" }) });
      assert(r.response.ok && r.body.id, `order write failed: ${r.response.status} ${JSON.stringify(r.body)}`); writes.push(r.ms);
    }
    const concurrentWrites = await Promise.all(Array.from({ length: 20 }, (_, i) => request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: "c-1", items: [{ productName: `Concurrent item ${i}`, quantity: 1, unitPrice: 20 + i }], totalPrice: 20 + i, paidAmount: 0, priority: "normal" }) })));
    concurrentWrites.forEach((r) => { assert(r.response.ok && r.body.id, `concurrent order write failed: ${r.response.status} ${JSON.stringify(r.body)}`); });
    const concurrentWriteTimes = concurrentWrites.map((r) => r.ms);
    await new Promise((r) => setTimeout(r, 1800));
    assert(fs.existsSync(dataFile), "SQLite file was not flushed");
    const sizeBytes = fs.statSync(dataFile).size;
    const SQL = await initSqlJs({ locateFile: (file) => path.join(root, "node_modules/sql.js/dist", file) });
    let db = new SQL.Database(fs.readFileSync(dataFile));
    const schemaVersion = String(db.exec("SELECT value FROM local_metadata WHERE key = 'schema_version'")[0].values[0][0]);
    const integrity = String(db.exec("PRAGMA integrity_check")[0].values[0][0]);
    const orderCountBefore = Number(db.exec("SELECT COUNT(*) FROM app_state WHERE key = 'ORDERS'")[0].values[0][0] ? JSON.parse(db.exec("SELECT value FROM app_state WHERE key = 'ORDERS'")[0].values[0][0]).length : 0);
    const entityCounts = db.exec("SELECT collection, COUNT(*) FROM local_entities GROUP BY collection ORDER BY collection")[0].values;
    db.close();
    assert(schemaVersion === "5", `unexpected schema version ${schemaVersion}`);
    assert(integrity === "ok", `SQLite integrity check failed: ${integrity}`);
    await stop(); start(); await waitHealth();
    const afterRestart = await request("/api/orders");
    assert(afterRestart.response.ok && afterRestart.body.length >= orderCountBefore, `orders lost after restart: before=${orderCountBefore}, after=${afterRestart.body.length}`);
    await stop();
    console.log(JSON.stringify({ status: "PASS", sqlite: { schemaVersion, integrity, sizeBytes, orderCountBefore, orderCountAfterRestart: afterRestart.body.length, entityCounts }, performanceMs: { reads: stats(reads), sequentialWrites: stats(writes), concurrentWrites: stats(concurrentWriteTimes) } }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", message: error.message, logs }, null, 2));
    try { await stop(); } catch {}
    process.exitCode = 1;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

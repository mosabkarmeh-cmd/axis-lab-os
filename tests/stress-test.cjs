const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const initSqlJs = require("sql.js");

const root = path.resolve(__dirname, "..");
const port = 4800 + Math.floor(Math.random() * 150);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-stress-"));
const dataFile = path.join(tempDir, "axis-data.sqlite");
const secret = "axis-lab-stress-secret-012345678901234567890";
const token = jwt.sign(
  { sub: "u-1", email: "stress@axislab.test", fullName: "Stress Admin", role: "admin" },
  secret,
  { algorithm: "HS256", expiresIn: "20m", issuer: "axislab-api", audience: "axislab-web" },
);
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
let child;
let logs = "";

function start() {
  child = spawn(process.execPath, [path.join(root, "dist/server.cjs")], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DB_MODE: "sqlite",
      PORT: String(port),
      SERVER_HOST: "127.0.0.1",
      JWT_SECRET: secret,
      ALLOW_PUBLIC_REGISTRATION: "false",
      AXIS_DATA_FILE: dataFile,
      AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
      SQLITE_WASM_PATH: path.join(root, "node_modules/sql.js/dist/sql-wasm.wasm"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  child.stderr.on("data", (chunk) => { logs += chunk.toString(); });
}

function stop() {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    child.once("exit", resolve);
    child.kill("SIGTERM");
  });
}

async function waitHealth() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`health timeout\n${logs}`);
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    count: sorted.length,
    min: Number(sorted[0].toFixed(2)),
    p50: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    max: Number(sorted.at(-1).toFixed(2)),
    avg: Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(2)),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(url, options = {}) {
  const started = performance.now();
  const response = await fetch(`http://127.0.0.1:${port}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ms: performance.now() - started, response, body };
}

async function runReadWave(count) {
  const paths = ["/api/orders", "/api/materials", "/api/inventory/stats", "/api/production/jobs", "/api/reports/analytics"];
  const results = await Promise.all(Array.from({ length: count }, (_, index) => request(paths[index % paths.length])));
  results.forEach((result, index) => assert(result.response.ok, `read wave request ${index} failed: ${result.response.status} ${JSON.stringify(result.body).slice(0, 300)}`));
  return results.map((result) => result.ms);
}

async function runOrderWriteWave(count, offset = 0) {
  const results = await Promise.all(Array.from({ length: count }, (_, index) => {
    const id = offset + index;
    return request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: "c-1",
        items: [{ productName: `Stress item ${id}`, quantity: 1, unitPrice: 100 + id }],
        totalPrice: 100 + id,
        paidAmount: 0,
        priority: "normal",
      }),
    });
  }));
  results.forEach((result, index) => assert(result.response.ok && result.body?.id, `order write ${index} failed: ${result.response.status} ${JSON.stringify(result.body).slice(0, 300)}`));
  return results.map((result) => result.ms);
}

async function runRateWave(values) {
  const results = await Promise.all(values.map((rate) => request("/api/exchange-rate", {
    method: "PUT",
    body: JSON.stringify({ exchangeRate: rate }),
  })));
  results.forEach((result, index) => assert(result.response.ok && Number(result.body?.exchangeRate) === values[index], `rate write ${values[index]} failed: ${result.response.status} ${JSON.stringify(result.body)}`));
  return results.map((result) => result.ms);
}

(async () => {
  const startedAt = Date.now();
  try {
    start();
    await waitHealth();

    const readTimes = [];
    for (let wave = 0; wave < 5; wave++) readTimes.push(...await runReadWave(100));

    const writeTimes = [];
    writeTimes.push(...await runOrderWriteWave(100, 0));
    writeTimes.push(...await runOrderWriteWave(100, 100));

    const rateTimes = await runRateWave([135, 200, 145, 180, 155, 210, 165, 190, 175, 200]);
    const finalRate = await request("/api/exchange-rate");
    assert(finalRate.response.ok && Number(finalRate.body?.exchangeRate) === 200, `final rate mismatch: ${JSON.stringify(finalRate.body)}`);

    const report = await request("/api/reports/analytics");
    assert(report.response.ok && report.body?.success === true && report.body.analytics?.sales && report.body.analytics?.financial, `analytics report failed after stress: ${report.response.status} ${JSON.stringify(report.body).slice(0, 500)}`);

    await new Promise((resolve) => setTimeout(resolve, 2200));
    assert(fs.existsSync(dataFile), "SQLite file was not flushed after stress");
    const sizeBytes = fs.statSync(dataFile).size;
    const SQL = await initSqlJs({ locateFile: (file) => path.join(root, "node_modules/sql.js/dist", file) });
    let db = new SQL.Database(fs.readFileSync(dataFile));
    const integrity = String(db.exec("PRAGMA integrity_check")[0].values[0][0]);
    const ordersJson = db.exec("SELECT value FROM app_state WHERE key = 'ORDERS'")[0]?.values?.[0]?.[0] || "[]";
    const orderCountBefore = JSON.parse(ordersJson).length;
    const activityRows = db.exec("SELECT payload FROM local_entities WHERE collection = 'ACTIVITY_LOGS'")[0]?.values || [];
    const activityIds = activityRows.map(([payload]) => JSON.parse(payload).id);
    const uniqueActivityIds = new Set(activityIds);
    const schemaVersion = String(db.exec("SELECT value FROM local_metadata WHERE key = 'schema_version'")[0].values[0][0]);
    db.close();
    assert(integrity === "ok", `SQLite integrity failed: ${integrity}`);
    assert(orderCountBefore >= 200, `stress orders missing before restart: ${orderCountBefore}`);
    assert(uniqueActivityIds.size === activityIds.length, `activity log IDs collided: total=${activityIds.length}, unique=${uniqueActivityIds.size}`);

    await stop();
    start();
    await waitHealth();
    const afterRestart = await request("/api/orders");
    assert(afterRestart.response.ok && afterRestart.body.length >= orderCountBefore, `orders lost after restart: before=${orderCountBefore}, after=${afterRestart.body.length}`);
    const restartedRate = await request("/api/exchange-rate");
    assert(restartedRate.response.ok && Number(restartedRate.body?.exchangeRate) === 200, `rate lost after restart: ${JSON.stringify(restartedRate.body)}`);
    await stop();

    console.log(JSON.stringify({
      status: "PASS",
      durationMs: Date.now() - startedAt,
      load: { readRequests: readTimes.length, orderWrites: writeTimes.length, rateWrites: rateTimes.length, totalRequests: readTimes.length + writeTimes.length + rateTimes.length + 2 },
      performanceMs: { reads: stats(readTimes), orderWrites: stats(writeTimes), rateWrites: stats(rateTimes) },
      persistence: { schemaVersion, integrity, sizeBytes, orderCountBefore, orderCountAfterRestart: afterRestart.body.length, activityLogCount: activityIds.length, uniqueActivityLogIds: uniqueActivityIds.size, finalRate: 200 },
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAIL", message: error.message, logs }, null, 2));
    try { await stop(); } catch {}
    process.exitCode = 1;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const port = 3600 + Math.floor(Math.random() * 200);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-central-network-") );
const dbFile = path.join(tempDir, "axis-central.sqlite");
const secret = "axis-central-network-smoke-secret-012345678901234567890";
const baseUrl = `http://127.0.0.1:${port}`;
const tokenA = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "المدير العام", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const tokenB = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "المدير العام", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const commonHeaders = { "content-type": "application/json" };
let server;
let logs = "";

function start() {
  logs = "";
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      DB_MODE: "sqlite",
      PORT: String(port),
      SERVER_HOST: "0.0.0.0",
      APP_URL: baseUrl,
      ALLOW_PUBLIC_REGISTRATION: "false",
      JWT_SECRET: secret,
      AXIS_DATA_FILE: dbFile,
      AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
      SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  server.stderr.on("data", (chunk) => { logs += chunk.toString(); });
  server.on("error", (error) => { logs += `[SPAWN_ERROR] ${error.stack || error}\n`; });
  server.on("exit", (code, signal) => { logs += `[SERVER_EXIT] code=${code} signal=${signal}\n`; });
}

function stop() {
  return new Promise((resolve) => {
    if (!server || server.killed) return resolve();
    server.once("exit", resolve);
    server.kill("SIGTERM");
    setTimeout(() => { if (!server.killed) server.kill("SIGKILL"); }, 3000);
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Central server did not become healthy. Logs: ${logs}`);
}

async function request(token, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { ...commonHeaders, authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  try {
    start();
    const health = await waitForHealth();
    assert(health.success === true && health.database === "sqlite", `Central health failed: ${JSON.stringify(health)}`);

    const jobs = Array.from({ length: 25 }, (_, index) => {
      const token = index % 2 === 0 ? tokenA : tokenB;
      return request(token, "/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: `network-client-${index % 2 === 0 ? "a" : "b"}`,
          items: [{ productName: `Network order ${index}`, quantity: 1, unitPrice: 1350 }],
          totalPrice: 1350,
          paidAmount: 0,
          priority: "normal",
        }),
      });
    });
    const writes = await Promise.all(jobs);
    assert(writes.every(({ response, body }) => response.ok && body.id), `Concurrent client write failed: ${JSON.stringify(writes.filter(({ response }) => !response.ok).map(({ response, body }) => ({ status: response.status, body })))}`);

    const [readA, readB] = await Promise.all([
      request(tokenA, "/api/orders"),
      request(tokenB, "/api/orders"),
    ]);
    assert(readA.response.ok && readB.response.ok, "One of the two clients could not read orders");
    assert(readA.body.length === 25 && readB.body.length === 25, `Clients saw inconsistent order counts: A=${readA.body.length}, B=${readB.body.length}`);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    assert(fs.existsSync(dbFile), "Central SQLite file was not created");
    await stop();
    start();
    await waitForHealth();
    const afterRestart = await request(tokenA, "/api/orders");
    assert(afterRestart.response.ok && afterRestart.body.length === 25, `Central data did not persist after restart: ${afterRestart.body.length}`);

    console.log(JSON.stringify({
      status: "PASS",
      mode: "central-sqlite-api",
      host: "0.0.0.0",
      clients: 2,
      concurrentWrites: 25,
      clientAVisibleOrders: readA.body.length,
      clientBVisibleOrders: readB.body.length,
      ordersAfterRestart: afterRestart.body.length,
      databaseFileExists: fs.existsSync(dbFile),
    }, null, 2));
  } catch (error) {
    console.error(error.stack || error);
    console.error(logs);
    process.exitCode = 1;
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

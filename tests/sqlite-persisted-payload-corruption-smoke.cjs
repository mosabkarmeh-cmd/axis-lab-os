const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const initSqlJs = require("sql.js");
const net = require("node:net");

const root = process.cwd();
let port;
let tempDir;
let dataFile;

let server;
let logs = "";

async function allocateFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const assigned = address && typeof address === "object" ? address.port : null;
      probe.close(error => {
        if (error) reject(error);
        else if (!assigned) reject(new Error("Could not allocate a free TCP port"));
        else resolve(assigned);
      });
    });
  });
}

function start() {
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DB_MODE: "sqlite",
      PORT: String(port),
      SERVER_HOST: "127.0.0.1",
      APP_URL: `http://127.0.0.1:${port}`,
      ALLOW_PUBLIC_REGISTRATION: "false",
      JWT_SECRET: "axis-payload-corruption-secret-01234567890123456789",
      AXIS_DATA_FILE: dataFile,
      AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
      SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { logs += chunk.toString(); });
  server.stderr.on("data", chunk => { logs += chunk.toString(); });
}

async function waitForHealth(timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

function stop() {
  return new Promise(resolve => {
    if (!server || server.killed) return resolve();
    const timer = setTimeout(() => {
      try { server.kill("SIGKILL"); } catch {}
      resolve();
    }, 3000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill("SIGTERM");
  });
}

function waitForExit(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (server.killed) return resolve(0);
    const timer = setTimeout(() => reject(new Error("server did not exit after persisted payload corruption")), timeoutMs);
    server.once("exit", code => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  try {
    port = await allocateFreePort();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-payload-corruption-"));
    dataFile = path.join(tempDir, "axis-data.sqlite");
    start();
    assert(await waitForHealth(), `initial server did not become healthy:\n${logs}`);
    await stop();

    const SQL = await initSqlJs({ locateFile: file => path.resolve("node_modules/sql.js/dist", file) });
    const database = new SQL.Database(fs.readFileSync(dataFile));
    database.run("UPDATE app_state SET value = ? WHERE key = ?", ["{ definitely-not-valid-json", "ORDERS"]);
    fs.writeFileSync(dataFile, Buffer.from(database.export()));
    database.close();

    start();
    const healthyAfterCorruption = await waitForHealth(4000);
    assert(!healthyAfterCorruption, "server started despite malformed persisted app_state payload");

    const exitCode = await waitForExit();
    assert(exitCode !== 0, `server exited successfully after persisted payload corruption: ${exitCode}`);

    const verify = new SQL.Database(fs.readFileSync(dataFile));
    const storedValue = String(verify.exec("SELECT value FROM app_state WHERE key = 'ORDERS'")[0].values[0][0]);
    verify.close();
    assert(storedValue === "{ definitely-not-valid-json", "corrupt payload was unexpectedly overwritten");

    console.log("sqlite-persisted-payload-corruption-smoke: PASS (startup fails closed; corrupt payload preserved)");
  } catch (error) {
    console.error(`sqlite-persisted-payload-corruption-smoke: FAIL - ${error.message}\n${logs}`);
    try { await stop(); } catch {}
    process.exitCode = 1;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

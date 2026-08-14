const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = 3400 + Math.floor(Math.random() * 400);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-smoke-"));
const server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
    DB_MODE: "sqlite",
    PORT: String(port),
    SERVER_HOST: "127.0.0.1",
    ALLOW_PUBLIC_REGISTRATION: "false",
    JWT_SECRET: "axis-lab-smoke-secret-012345678901234567890",
    AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"),
    AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
    SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
  },
  stdio: "ignore",
});

const stop = () => {
  if (!server.killed) server.kill("SIGTERM");
  fs.rmSync(tempDir, { recursive: true, force: true });
};

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become healthy");
}

(async () => {
  try {
    const health = await waitForHealth();
    if (health.database !== "sqlite") throw new Error(`Expected sqlite, got ${health.database}`);

    const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/customers`);
    if (protectedResponse.status !== 401) throw new Error(`Expected protected API 401, got ${protectedResponse.status}`);

    const registerResponse = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "smoke@example.com", password: "StrongPass123", fullName: "Smoke", role: "employee" }),
    });
    if (registerResponse.status !== 403) throw new Error(`Expected public registration 403, got ${registerResponse.status}`);

    console.log("api-security-smoke: PASS");
  } finally {
    stop();
  }
})().catch((error) => {
  console.error(`api-security-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

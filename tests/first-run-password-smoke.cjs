const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = 3800 + Math.floor(Math.random() * 300);
const password = "BootstrapPass123";
const newPassword = "ChangedPass456";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-first-run-"));
const env = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: "sqlite",
  PORT: String(port),
  SERVER_HOST: "127.0.0.1",
  ALLOW_PUBLIC_REGISTRATION: "false",
  BOOTSTRAP_ADMIN_PASSWORD: password,
  JWT_SECRET: "axis-lab-first-run-secret-012345678901234567890",
  AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"),
  AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
  SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
};
let server;
const stop = () => new Promise((resolve) => {
  if (!server || server.killed) return resolve();
  server.once("exit", resolve);
  server.kill("SIGTERM");
});
async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become healthy");
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };
(async () => {
  try {
    server = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: process.cwd(), env, stdio: "ignore" });
    await waitForHealth();
    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@axislab.com", password }),
    });
    const login = await loginResponse.json();
    assert(loginResponse.ok && login.user.mustChangePassword === true, "Bootstrap Admin was not marked for password change");
    const auth = { "content-type": "application/json", authorization: `Bearer ${login.token}` };
    const blocked = await fetch(`http://127.0.0.1:${port}/api/customers`, { headers: auth });
    assert(blocked.status === 428, `Expected 428 before password change, got ${blocked.status}`);
    const changeResponse = await fetch(`http://127.0.0.1:${port}/api/auth/change-password`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ currentPassword: password, newPassword }),
    });
    const changed = await changeResponse.json();
    assert(changeResponse.ok && changed.user.mustChangePassword === false, "Password change did not complete");
    const allowed = await fetch(`http://127.0.0.1:${port}/api/customers`, { headers: auth });
    assert(allowed.ok, `Protected API remained blocked after password change: ${allowed.status}`);
    console.log("first-run-password-smoke: PASS");
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(`first-run-password-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = 4100 + Math.floor(Math.random() * 300);
const password = "CoverageBootstrap123";
const changedPassword = "CoverageChanged456";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-coverage-"));
const env = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: "sqlite",
  PORT: String(port),
  SERVER_HOST: "127.0.0.1",
  ALLOW_PUBLIC_REGISTRATION: "false",
  BOOTSTRAP_ADMIN_PASSWORD: password,
  JWT_SECRET: "axis-lab-api-coverage-secret-012345678901234567890",
  AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"),
  AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
  SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
};
let server;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
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
async function request(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...options,
    headers: { authorization: `Bearer ${request.token}`, ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

const readRoutes = [
  "/api/customers", "/api/products", "/api/materials", "/api/inventory/stats", "/api/remnants",
  "/api/remnants/stats", "/api/suppliers", "/api/supply-orders", "/api/orders", "/api/orders/archived",
  "/api/invoices", "/api/accounting/invoices", "/api/accounting/payments", "/api/accounting/expenses",
  "/api/accounting/summary", "/api/exchange-rate", "/api/production/machines", "/api/production/jobs",
  "/api/production/queue", "/api/reports", "/api/reports/analytics", "/api/settings", "/api/users",
  "/api/notifications", "/api/activity-logs", "/api/recycle-bin", "/api/search?q=laser",
];

request.token = "";

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
    assert(loginResponse.ok && login.token, "Coverage login failed");
    request.token = login.token;
    const change = await request("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: password, newPassword: changedPassword }),
    });
    assert(change.response.ok, `Coverage password change failed: ${JSON.stringify(change.body)}`);

    const failures = [];
    for (const pathname of readRoutes) {
      const result = await request(pathname);
      if (result.response.status >= 500) failures.push(`${pathname} -> ${result.response.status}: ${JSON.stringify(result.body)}`);
    }
    assert(failures.length === 0, `API coverage found server errors:\n${failures.join("\n")}`);

    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/orders`);
    assert(unauthorized.status === 401, `Unauthenticated coverage request returned ${unauthorized.status}`);
    console.log(`api-coverage-smoke: PASS (${readRoutes.length} protected reads)`);
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(`api-coverage-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});


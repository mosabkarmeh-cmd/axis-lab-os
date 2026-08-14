const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const port = 3400 + Math.floor(Math.random() * 400);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-smoke-"));
const secret = "axis-lab-smoke-secret-012345678901234567890";
const token = jwt.sign(
  { sub: "u-1", email: "admin@axislab.com", fullName: "Smoke Admin", role: "admin" },
  secret,
  { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" },
);

const env = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: "sqlite",
  PORT: String(port),
  SERVER_HOST: "127.0.0.1",
  ALLOW_PUBLIC_REGISTRATION: "false",
  JWT_SECRET: secret,
  AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"),
  AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
  SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
};

let server;
const start = () => {
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: process.cwd(),
    env,
    stdio: "ignore",
  });
};
const stop = () => new Promise((resolve) => {
  if (!server || server.killed) return resolve();
  server.once("exit", resolve);
  server.kill("SIGTERM");
});
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
const request = async (pathName, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathName}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await response.json();
  return { response, body };
};
const waitForHealth = async () => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Server did not become healthy");
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  try {
    start();
    const health = await waitForHealth();
    assert(health.database === "sqlite", `Expected sqlite, got ${health.database}`);

    const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/customers`);
    assert(protectedResponse.status === 401, `Expected protected API 401, got ${protectedResponse.status}`);

    const registration = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "smoke@example.com", password: "StrongPass123", fullName: "Smoke", role: "employee" }),
    });
    assert(registration.status === 403, `Expected public registration 403, got ${registration.status}`);

    const rate = await request("/api/exchange-rate", {
      method: "PUT",
      body: JSON.stringify({ exchangeRate: 135 }),
    });
    assert(rate.response.ok && rate.body.exchangeRate === 135, "Exchange rate write failed");

    const order = await request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: "c-1",
        items: [{ productName: "Smoke laser panel", quantity: 1, unitPrice: 100 }],
        totalPrice: 100,
        paidAmount: 0,
        priority: "normal",
      }),
    });
    assert(order.response.ok && order.body.id, `Order write failed: ${JSON.stringify(order.body)}`);
    const orderId = order.body.id;

    const payment = await request(`/api/orders/${orderId}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount: 25, paymentMethod: "cash", notes: "Persistence smoke test" }),
    });
    assert(payment.response.ok && payment.body.paidAmount === 25, `Payment write failed: ${JSON.stringify(payment.body)}`);

    // Persistence is debounced by the server. Windows child-process termination
    // is not guaranteed to deliver SIGTERM gracefully, so wait for the SQLite
    // snapshot to be flushed before simulating a restart.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    assert(fs.existsSync(env.AXIS_DATA_FILE), "SQLite file was not created before restart");
    await stop();
    start();
    await waitForHealth();

    const orders = await request("/api/orders");
    const restoredOrder = orders.body.find((item) => item.id === orderId);
    assert(restoredOrder, "Order was not restored after restart");
    assert(restoredOrder.paidAmount === 25 && restoredOrder.remaining === 75, "Payment totals were not restored correctly");

    const invoices = await request("/api/accounting/invoices");
    const restoredInvoice = invoices.body.invoices.find((item) => item.orderId === orderId);
    assert(restoredInvoice && restoredInvoice.paidAmount === 25, "Invoice/payment was not restored after restart");

    const restoredRate = await request("/api/exchange-rate");
    assert(restoredRate.body.exchangeRate === 135, "Exchange rate was not restored after restart");

    console.log("api-security-and-financial-persistence-smoke: PASS");
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(`api-security-and-financial-persistence-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

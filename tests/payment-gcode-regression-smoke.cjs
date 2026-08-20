const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const port = 4100 + Math.floor(Math.random() * 400);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-payment-gcode-smoke-"));
const secret = "axis-payment-gcode-smoke-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Smoke Test", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const env = { ...process.env, NODE_ENV: "production", DB_MODE: "sqlite", PORT: String(port), SERVER_HOST: "127.0.0.1", ALLOW_PUBLIC_REGISTRATION: "false", JWT_SECRET: secret, AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"), AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"), SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm") };
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
let child;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const request = async (url, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};
const waitForHealth = async () => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        const body = await response.json();
        if (body.database !== "sqlite" || body.sqliteIntegrity !== "ok" || body.schemaVersion !== 5) throw new Error(`health diagnostics failed: ${JSON.stringify(body)}`);
        return;
      }
    } catch (error) {
      if (String(error?.message || "").includes("health diagnostics failed")) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("server health timeout");
};
(async () => {
  try {
    child = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: process.cwd(), env, stdio: "ignore" });
    await waitForHealth();
    const created = await request("/api/orders", { method: "POST", body: JSON.stringify({ customerId: "c-1", items: [{ productName: "Payment regression", quantity: 1, unitPrice: 1000 }], priority: "normal" }) });
    assert(created.response.ok && created.body.id, `order creation failed: ${JSON.stringify(created.body)}`);
    const orderId = created.body.id;

    const sypPayment = await request(`/api/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify({ amount: 500, currency: "SYP", paymentMethod: "cash" }) });
    assert(sypPayment.response.ok, `SYP payment failed: ${JSON.stringify(sypPayment.body)}`);
    assert(sypPayment.body.paidAmount === 500 && sypPayment.body.remaining === 500, `SYP payment was multiplied: ${JSON.stringify(sypPayment.body)}`);
    assert(sypPayment.body.payments?.[0]?.amountSYP === 500, "SYP payment record is incorrect");

    const usdPayment = await request(`/api/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify({ amount: 2, currency: "USD", paymentMethod: "cash" }) });
    assert(usdPayment.response.ok, `USD payment failed: ${JSON.stringify(usdPayment.body)}`);
    assert(usdPayment.body.paidAmount === 770 && usdPayment.body.remaining === 230, `USD conversion is incorrect: ${JSON.stringify(usdPayment.body)}`);
    const secondPaymentId = usdPayment.body.payments?.[0]?.id;

    const deleted = await request(`/api/orders/${orderId}/payments/${secondPaymentId}`, { method: "DELETE", body: JSON.stringify({}) });
    assert(deleted.response.ok, `payment deletion failed: ${JSON.stringify(deleted.body)}`);
    assert(deleted.body.paidAmount === 500 && deleted.body.remaining === 500, `payment deletion mixed USD and SYP: ${JSON.stringify(deleted.body)}`);

    const gcode = await request("/api/compiler/gcode", { method: "POST", body: JSON.stringify({ promptText: "مربع 50x50 ملم", material: "Acrylic 3mm", speed: 40, power: "85" }) });
    assert(gcode.response.ok && typeof gcode.body.gcodeSnippet === "string" && gcode.body.gcodeSnippet.includes("G01"), `G-code generation failed: ${JSON.stringify(gcode.body)}`);
    console.log("payment-gcode-regression-smoke: PASS");
  } finally {
    if (child && !child.killed) child.kill("SIGTERM");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(`payment-gcode-regression-smoke: FAIL — ${error.message}`); process.exitCode = 1; });


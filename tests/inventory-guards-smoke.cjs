const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const port = 4300 + Math.floor(Math.random() * 200);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-inventory-smoke-"));
const secret = "axis-inventory-smoke-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Inventory Smoke", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
const env = { ...process.env, NODE_ENV: "production", DB_MODE: "sqlite", PORT: String(port), SERVER_HOST: "127.0.0.1", ALLOW_PUBLIC_REGISTRATION: "false", JWT_SECRET: secret, AXIS_DATA_FILE: path.join(tempDir, "axis-data.sqlite"), AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"), SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm") };
let child;
const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
const request = async (url, options = {}) => { const response = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } }); const body = await response.json(); return { response, body }; };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitForHealth = async () => { const deadline = Date.now() + 15000; while (Date.now() < deadline) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 200)); } throw new Error("server health timeout"); };
(async () => {
  try {
    child = spawn(process.execPath, [path.resolve("dist/server.cjs")], { cwd: process.cwd(), env, stdio: "ignore" });
    await waitForHealth();
    const materials = await request("/api/materials");
    const stocked = (materials.body.materials || []).find(material => Number(material.inventory?.quantity) >= 2 && material.id);
    assert(stocked, `No material with enough stock for guard test: ${JSON.stringify(materials.body)}`);
    const materialId = stocked.id;
    const negativeUpdate = await request(`/api/inventory/${materialId}/update`, { method: "POST", body: JSON.stringify({ quantity: -999999, type: "adjustment" }) });
    assert(negativeUpdate.response.status === 400, `Negative stock update was accepted: ${JSON.stringify(negativeUpdate.body)}`);
    const negativeReserve = await request(`/api/inventory/${materialId}/reserve`, { method: "POST", body: JSON.stringify({ quantity: -1, referenceId: "negative-reservation" }) });
    assert(negativeReserve.response.status === 400, `Negative reservation was accepted: ${JSON.stringify(negativeReserve.body)}`);
    const reservation = await request(`/api/inventory/${materialId}/reserve`, { method: "POST", body: JSON.stringify({ quantity: 1, referenceId: "guard-reservation" }) });
    assert(reservation.response.ok, `Reservation setup failed: ${JSON.stringify(reservation.body)}`);
    const reservedAfterSetup = Number(reservation.body.inventory.reservedQuantity);
    const belowReserved = await request(`/api/inventory/${materialId}/update`, { method: "POST", body: JSON.stringify({ quantity: -999999, type: "adjustment" }) });
    assert(belowReserved.response.status === 400, `Update below reserved quantity was accepted: ${JSON.stringify(belowReserved.body)}`);
    const excessiveUnreserve = await request(`/api/inventory/${materialId}/unreserve`, { method: "POST", body: JSON.stringify({ quantity: 999999, referenceId: "excessive-unreserve" }) });
    assert(excessiveUnreserve.response.status === 400, `Excessive unreserve was accepted: ${JSON.stringify(excessiveUnreserve.body)}`);
    const release = await request(`/api/inventory/${materialId}/unreserve`, { method: "POST", body: JSON.stringify({ quantity: 1, referenceId: "guard-reservation" }) });
    assert(release.response.ok && Number(release.body.inventory.reservedQuantity) === reservedAfterSetup - 1, `Valid unreserve failed: ${JSON.stringify(release.body)}`);
    console.log("inventory-guards-smoke: PASS");
  } finally {
    if (child && !child.killed) child.kill("SIGTERM");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(`inventory-guards-smoke: FAIL — ${error.message}`); process.exitCode = 1; });

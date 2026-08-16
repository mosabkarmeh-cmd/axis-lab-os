const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const port = 3900 + Math.floor(Math.random() * 200);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-production-smoke-"));
const secret = "axis-production-smoke-secret-012345678901234567890";
const token = jwt.sign({ sub: "u-1", email: "admin@axislab.com", fullName: "Production Smoke", role: "admin" }, secret, { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" });
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
    const missingJob = await request("/api/production/jobs", { method: "POST", body: JSON.stringify({ itemName: "Missing stock guard", materialId: "m-does-not-exist", estTimeSec: 60 }) });
    assert(missingJob.response.status === 201, `missing-stock job create failed: ${JSON.stringify(missingJob.body)}`);
    const missingCompletion = await request(`/api/production/jobs/${missingJob.body.job.id}/complete`, { method: "POST", body: JSON.stringify({}) });
    assert(missingCompletion.response.status === 409 && missingCompletion.body.code === "INSUFFICIENT_STOCK", `missing stock was not rejected: ${JSON.stringify(missingCompletion.body)}`);

    const materials = await request("/api/materials");
    const stockedMaterial = (materials.body.materials || []).find(material => Number(material.inventory?.quantity) > 0 && material.id);
    assert(stockedMaterial, `No stocked material available for duplicate completion test: ${JSON.stringify(materials.body)}`);
    const job = await request("/api/production/jobs", { method: "POST", body: JSON.stringify({ itemName: "Duplicate completion guard", materialId: stockedMaterial.id, estTimeSec: 60 }) });
    assert(job.response.status === 201, `stocked job create failed: ${JSON.stringify(job.body)}`);
    const first = await request(`/api/production/jobs/${job.body.job.id}/complete`, { method: "POST", body: JSON.stringify({}) });
    assert(first.response.ok, `first completion failed: ${JSON.stringify(first.body)}`);
    const second = await request(`/api/production/jobs/${job.body.job.id}/complete`, { method: "POST", body: JSON.stringify({}) });
    assert(second.response.status === 409, `duplicate completion was not rejected: ${JSON.stringify(second.body)}`);
    console.log("production-completion-smoke: PASS");
  } finally {
    if (child && !child.killed) child.kill("SIGTERM");
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(`production-completion-smoke: FAIL — ${error.message}`); process.exitCode = 1; });

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const jwt = require("jsonwebtoken");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-employee-boundary-"));
const dbFile = path.join(tempDir, "axis-data.sqlite");
const port = 40400 + Math.floor(Math.random() * 300);
const baseUrl = `http://127.0.0.1:${port}`;
const secret = "axis-employee-boundary-secret-012345678901234567890";
const adminToken = jwt.sign(
  { sub: "u-1", email: "admin@axislab.com", fullName: "Boundary Admin", role: "admin" },
  secret,
  { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" },
);

let server;
let logs = "";

function start() {
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      DB_MODE: "sqlite",
      PORT: String(port),
      SERVER_HOST: "127.0.0.1",
      APP_URL: baseUrl,
      ALLOW_PUBLIC_REGISTRATION: "false",
      JWT_SECRET: secret,
      AXIS_DATA_FILE: dbFile,
      AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
      SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { logs += chunk.toString(); });
  server.stderr.on("data", chunk => { logs += chunk.toString(); });
}

function stop() {
  return new Promise(resolve => {
    if (!server || server.killed) return resolve();
    server.once("exit", resolve);
    server.kill("SIGTERM");
    setTimeout(() => {
      if (!server.killed) server.kill("SIGKILL");
    }, 3000);
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`server did not become healthy: ${logs}`);
}

async function request(route, options = {}, token = adminToken) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const bodyText = await response.text();
  let body;
  try { body = JSON.parse(bodyText); } catch { body = bodyText; }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  try {
    start();
    await waitForHealth();

    const createdUser = await request("/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: "employee-boundary@axislab.test",
        password: "EmployeePass123!",
        fullName: "Employee Boundary",
        role: "employee",
        isActive: true,
      }),
    });
    assert(createdUser.response.ok && createdUser.body.user?.id, `employee fixture failed: ${JSON.stringify(createdUser.body)}`);

    const employeeToken = jwt.sign(
      {
        sub: createdUser.body.user.id,
        email: "employee-boundary@axislab.test",
        fullName: "Employee Boundary",
        role: "employee",
      },
      secret,
      { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" },
    );

    const employeeRequest = (route, options = {}) => request(route, options, employeeToken);

    const materialCreate = await request("/api/materials", {
      method: "POST",
      body: JSON.stringify({
        name: "Employee boundary material",
        category: "Test",
        subCategory: "boundary",
        unit: "sheet",
        pricePerUnit: 6075,
        minimumStock: 1,
      }),
    });
    assert(materialCreate.response.ok && materialCreate.body.material?.id, `material fixture failed: ${JSON.stringify(materialCreate.body)}`);

    const materialList = await employeeRequest("/api/materials");
    assert(materialList.response.ok && Array.isArray(materialList.body.materials), "employee cannot read materials");
    const material = materialList.body.materials.find(item => item.id === materialCreate.body.material.id);
    assert(material, "employee boundary material was not returned");
    assert(Number(material.pricePerUnit) === 0, `employee received material price: ${JSON.stringify(material)}`);
    assert(!Object.prototype.hasOwnProperty.call(material, "supplier") || material.supplier === null, "employee received supplier data");

    const customerCreate = await request("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Employee boundary customer",
        phone: "+15550000001",
      }),
    });
    assert(customerCreate.response.ok && customerCreate.body.id, `customer fixture failed: ${JSON.stringify(customerCreate.body)}`);

    const orderCreate = await request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: customerCreate.body.id,
        items: [{
          productName: "Employee boundary order",
          quantity: 1,
          unitPrice: 13500,
          matCost: 5000,
          finalPrice: 13500,
        }],
        totalPrice: 13500,
        paidAmount: 0,
      }),
    });
    assert(orderCreate.response.ok && orderCreate.body.id, `order fixture failed: ${JSON.stringify(orderCreate.body)}`);

    const blockedEmployeeOrderUpdate = await employeeRequest(`/api/orders/${orderCreate.body.id}`, {
      method: "PUT",
      body: JSON.stringify({ paidAmount: 999999 }),
    });
    assert(blockedEmployeeOrderUpdate.response.status === 403,
      `employee financial order update was not blocked: ${blockedEmployeeOrderUpdate.response.status}`);

    const employeeOrders = await employeeRequest("/api/orders");
    assert(employeeOrders.response.ok && Array.isArray(employeeOrders.body), "employee cannot read orders");
    const employeeOrder = employeeOrders.body.find(item => item.id === orderCreate.body.id);
    assert(employeeOrder, "employee order fixture was not returned");
    for (const field of ["matCost", "finalPrice", "profit", "costPrice", "unitCost", "unitPrice", "totalPrice", "paidAmount", "remaining"]) {
      assert(!Object.prototype.hasOwnProperty.call(employeeOrder, field), `employee received restricted order field ${field}: ${JSON.stringify(employeeOrder)}`);
    }

    const jobCreate = await request("/api/production/jobs", {
      method: "POST",
      body: JSON.stringify({
        itemName: "Employee boundary job",
        materialId: materialCreate.body.material.id,
        materialCostUSD: 12,
        technicianCostUSD: 8,
        estTimeSec: 60,
      }),
    });
    assert(jobCreate.response.ok && jobCreate.body.job?.id, `job fixture failed: ${JSON.stringify(jobCreate.body)}`);

    const employeeJobs = await employeeRequest("/api/production/jobs");
    assert(employeeJobs.response.ok && Array.isArray(employeeJobs.body.jobs), "employee cannot read production jobs");
    const employeeJob = employeeJobs.body.jobs.find(item => item.id === jobCreate.body.job.id);
    assert(employeeJob, "employee job fixture was not returned");
    for (const field of ["materialPricePerUnit", "materialCostUSD", "technicianCostUSD", "totalDirectCostUSD"]) {
      assert(!Object.prototype.hasOwnProperty.call(employeeJob, field), `employee received restricted production field ${field}: ${JSON.stringify(employeeJob)}`);
    }

    const pricing = await employeeRequest("/api/ai/fast-local", {
      method: "POST",
      body: JSON.stringify({ action: "instant-pricing-calc", payload: { materialId: materialCreate.body.material.id } }),
    });
    assert(pricing.response.status === 403, `employee pricing was not blocked: ${pricing.response.status}`);

    const aiChat = await employeeRequest("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: "كم الإيرادات والأرباح والديون؟" }),
    });
    assert(aiChat.response.ok, `employee AI chat failed: ${JSON.stringify(aiChat.body)}`);
    const aiText = String(aiChat.body.text || "");
    assert(!/\$\s*\d|(?:إيرادات|أرباح|ديون|تكلف(?:ة|تها)|مدفوع(?:ات)?).{0,30}\d/i.test(aiText),
      `employee AI disclosed a financial figure: ${aiText}`);

    const accounting = await employeeRequest("/api/accounting/invoices");
    assert(accounting.response.status === 403, `employee accounting access was not blocked: ${accounting.response.status}`);

    const reports = await employeeRequest("/api/reports/analytics");
    assert(reports.response.status === 403, `employee reports access was not blocked: ${reports.response.status}`);

    const exportRequest = await employeeRequest("/api/export/sales/excel");
    assert(exportRequest.response.status === 403, `employee export access was not blocked: ${exportRequest.response.status}`);

    console.log("employee-financial-boundary-smoke: PASS");
  } catch (error) {
    console.error(`employee-financial-boundary-smoke: FAIL — ${error.message}`);
    console.error(logs);
    process.exitCode = 1;
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

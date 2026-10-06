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
    if (!server) return resolve();
    let exited = false;
    const onExit = () => {
      exited = true;
      resolve();
    };
    server.once("exit", onExit);
    server.kill("SIGTERM");
    setTimeout(() => {
      if (!exited) {
        try { server.kill("SIGKILL"); } catch {}
        resolve();
      }
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

    const serverAuthoritativeOrder = await request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: customerCreate.body.id,
        items: [{ productName: "Server authoritative total", quantity: 2, unitPrice: 100 }],
        totalPrice: 999999,
        paidAmount: 25,
      }),
    });
    assert(serverAuthoritativeOrder.response.ok && serverAuthoritativeOrder.body.id,
      `server-authoritative order fixture failed: ${JSON.stringify(serverAuthoritativeOrder.body)}`);
    assert(Number(serverAuthoritativeOrder.body.totalPrice) === 200,
      `client totalPrice overrode server calculation: ${JSON.stringify(serverAuthoritativeOrder.body)}`);
    assert(Number(serverAuthoritativeOrder.body.paidAmount) === 25,
      `paidAmount normalization changed unexpectedly: ${JSON.stringify(serverAuthoritativeOrder.body)}`);
    assert(Number(serverAuthoritativeOrder.body.remaining) === 175,
      `remaining was not derived server-side: ${JSON.stringify(serverAuthoritativeOrder.body)}`);

    const employeeFinancialCreate = await employeeRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: customerCreate.body.id,
        items: [{ productName: "Employee forbidden priced order", quantity: 1, unitPrice: 13500 }],
        totalPrice: 13500,
        paidAmount: 5000,
      }),
    });
    assert(employeeFinancialCreate.response.status === 403,
      `employee financial order creation was not blocked: ${employeeFinancialCreate.response.status}`);

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
    for (const field of ["matCost", "finalPrice"]) {
      assert(!Object.prototype.hasOwnProperty.call(employeeOrder, field),
        `employee received explicitly forbidden order field ${field}: ${JSON.stringify(employeeOrder)}`);
    }
    const zeroOrMissingFinancialFields = ["profit", "costPrice", "unitCost", "unitPrice", "totalPrice", "paidAmount", "remaining"];
    for (const field of zeroOrMissingFinancialFields) {
      if (Object.prototype.hasOwnProperty.call(employeeOrder, field)) {
        assert(Number(employeeOrder[field]) === 0, `employee received non-zero ${field}: ${JSON.stringify(employeeOrder)}`);
      }
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

    const settingsWrite = await employeeRequest("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ pricing: { defaultProfitMargin: 999 } }),
    });
    assert(settingsWrite.response.status === 403, `employee settings write was not blocked: ${settingsWrite.response.status}`);

    const exchangeRateWrite = await employeeRequest("/api/exchange-rate", {
      method: "PUT",
      body: JSON.stringify({ exchangeRate: 999999 }),
    });
    assert(exchangeRateWrite.response.status === 403, `employee exchange-rate write was not blocked: ${exchangeRateWrite.response.status}`);

    const smtpTest = await employeeRequest("/api/settings/test-smtp", {
      method: "POST",
      body: JSON.stringify({ testEmail: "employee-boundary@axislab.test" }),
    });
    assert(smtpTest.response.status === 403, `employee SMTP test was not blocked: ${smtpTest.response.status}`);

    const backupList = await employeeRequest("/api/backup");
    assert(backupList.response.status === 403, `employee backup list was not blocked: ${backupList.response.status}`);

    const backupCreate = await employeeRequest("/api/backup", { method: "POST", body: JSON.stringify({}) });
    assert(backupCreate.response.status === 403, `employee backup create was not blocked: ${backupCreate.response.status}`);

    const recycleBin = await employeeRequest("/api/recycle-bin");
    assert(recycleBin.response.status === 403, `employee recycle-bin access was not blocked: ${recycleBin.response.status}`);

    const recycleRestore = await employeeRequest("/api/recycle-bin/restore/nonexistent", { method: "POST" });
    assert(recycleRestore.response.status === 403, `employee recycle-bin restore was not blocked: ${recycleRestore.response.status}`);

    const permanentDelete = await employeeRequest("/api/recycle-bin/permanent/nonexistent", { method: "DELETE" });
    assert(permanentDelete.response.status === 403, `employee permanent delete was not blocked: ${permanentDelete.response.status}`);

    const createStatus = await employeeRequest("/api/order-statuses", {
      method: "POST",
      body: JSON.stringify({ name: "Employee forbidden status" }),
    });
    assert(createStatus.response.status === 403, `employee order-status creation was not blocked: ${createStatus.response.status}`);

    const updateStatus = await employeeRequest("/api/order-statuses/new", {
      method: "PUT",
      body: JSON.stringify({ name: "Employee forbidden rename" }),
    });
    assert(updateStatus.response.status === 403, `employee order-status update was not blocked: ${updateStatus.response.status}`);

    const settingsRead = await employeeRequest("/api/settings");
    assert(settingsRead.response.ok && settingsRead.body.settings?.company, "employee cannot read safe company settings");
    assert(!settingsRead.body.settings?.pricing, "employee received pricing settings");
    assert(!settingsRead.body.settings?.backup, "employee received backup settings");
    assert(!settingsRead.body.settings?.smtp, "employee received SMTP settings");
    assert(!Object.prototype.hasOwnProperty.call(settingsRead.body.settings || {}, "partnerSharePercent"),
      "employee received partner share settings");

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

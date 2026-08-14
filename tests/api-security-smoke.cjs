const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const initSqlJs = require("sql.js");

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
let serverLog = "";
const start = () => {
  serverLog = "";
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });
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

    const calculatedOrder = await request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerId: "c-1",
        items: [{ productName: "Tax and discount test", quantity: 2, unitPrice: 50 }],
        taxPercent: 10,
        discount: 5,
        priority: "normal",
      }),
    });
    assert(calculatedOrder.response.ok && calculatedOrder.body.totalPrice === 105, `Tax/discount calculation failed: ${JSON.stringify(calculatedOrder.body)}`);
    const calculatedInvoices = await request("/api/accounting/invoices");
    const calculatedInvoice = calculatedInvoices.body.invoices.find((item) => item.orderId === calculatedOrder.body.id);
    assert(calculatedInvoice && calculatedInvoice.subtotal === 100 && calculatedInvoice.totalPrice === 105, "Invoice tax/discount totals were not calculated correctly");

    const creditNote = await request(`/api/accounting/invoices/${calculatedInvoice.id}/credit-note`, { method: "POST" });
    assert(creditNote.response.ok && creditNote.body.creditInvoice?.status === "credit_note", `Credit note creation failed: ${JSON.stringify(creditNote.body)}`);
    assert(creditNote.body.originalInvoice?.status === "cancelled", "Original invoice was not cancelled after credit note");

    const expense = await request("/api/accounting/expenses", {
      method: "POST",
      body: JSON.stringify({ category: "maintenance", amount: 250, date: "2026-08-14", description: "Smoke expense", status: "paid" }),
    });
    assert(expense.response.ok && expense.body.expense?.amount === 250, `Expense creation failed: ${JSON.stringify(expense.body)}`);
    const updatedExpense = await request(`/api/accounting/expenses/${expense.body.expense.id}`, {
      method: "PUT",
      body: JSON.stringify({ amount: 275, description: "Updated smoke expense" }),
    });
    assert(updatedExpense.response.ok && updatedExpense.body.expense.amount === 275, "Expense update failed");
    const deletedExpense = await request(`/api/accounting/expenses/${expense.body.expense.id}`, { method: "DELETE" });
    assert(deletedExpense.response.ok && deletedExpense.body.expense.id === expense.body.expense.id, "Expense deletion failed");

    const SQL = await initSqlJs({ locateFile: (file) => path.resolve("node_modules/sql.js/dist", file) });
    const backup = await request("/api/backup", { method: "POST" });
    assert(backup.response.ok && backup.body.backup?.sha256 && !backup.body.backup?.filePath, "Real SQLite backup metadata is invalid or leaks its local path");
    const backupFilesBeforeRestore = fs.readdirSync(path.join(tempDir, "backups")).filter((name) => name.endsWith(".sqlite"));
    const backupContainsOrder = backupFilesBeforeRestore.some((name) => {
      const backupDb = new SQL.Database(fs.readFileSync(path.join(tempDir, "backups", name)));
      const rows = backupDb.exec("SELECT value FROM app_state WHERE key = 'ORDERS'");
      const contains = rows.length > 0 && String(rows[0].values[0][0]).includes(orderId);
      backupDb.close();
      return contains;
    });
    assert(backupContainsOrder, `Manual backup did not contain the newly created order ${orderId}: ${JSON.stringify(backupFilesBeforeRestore)}`);
    const changedRate = await request("/api/exchange-rate", { method: "PUT", body: JSON.stringify({ exchangeRate: 200 }) });
    assert(changedRate.response.ok && changedRate.body.exchangeRate === 200, "Could not change rate before restore");
    const restore = await request(`/api/backup/restore/${backup.body.backup.id}`, { method: "POST" });
    assert(restore.response.ok, `Backup restore failed: ${JSON.stringify(restore.body)}`);
    const restoredAfterBackup = await request("/api/exchange-rate");
    assert(restoredAfterBackup.body.exchangeRate === 135, "Backup restore did not restore the earlier exchange rate");

    await new Promise((resolve) => setTimeout(resolve, 800));
    const database = new SQL.Database(fs.readFileSync(env.AXIS_DATA_FILE));
    const stateRows = database.exec("SELECT key, value FROM app_state ORDER BY key");
    assert(stateRows.length === 1 && stateRows[0].values.length >= 10, "SQLite app_state table is incomplete");
    const legacyNormalizedKeys = stateRows[0].values.filter(([key]) => ["CUSTOMERS", "PRODUCTS", "MATERIALS", "INVENTORY", "SUPPLIERS", "MACHINES", "EXPENSES"].includes(String(key)));
    assert(legacyNormalizedKeys.length === 0, `Normalized collections still duplicated in app_state: ${JSON.stringify(legacyNormalizedKeys.map(([key]) => key))}`);
    const schemaRows = database.exec("SELECT value FROM local_metadata WHERE key = 'schema_version'");
    assert(schemaRows.length === 1 && String(schemaRows[0].values[0][0]) === "2", "SQLite local schema version is not current");
    const entityRows = database.exec("SELECT collection, COUNT(*) AS count FROM local_entities GROUP BY collection ORDER BY collection");
    assert(entityRows.length === 1 && entityRows[0].values.length >= 7, "Normalized local entity tables are incomplete");
    assert(entityRows[0].values.every(([collection, count]) => String(collection).length > 0 && Number(count) > 0), "Normalized local entity collection contains invalid rows");
    for (const [key, value] of stateRows[0].values) {
      assert(typeof key === "string" && typeof value === "string", "SQLite state row has invalid types");
      JSON.parse(value);
    }
    database.close();

    await stop();
    fs.writeFileSync(env.AXIS_DATA_FILE, Buffer.from("corrupt sqlite bytes"));
    start();
    await waitForHealth();
    const recoveredOrders = await request("/api/orders");
    const recoveryCandidates = fs.readdirSync(path.join(tempDir, "backups")).filter((name) => name.endsWith(".sqlite")).map((name) => {
      const candidateDb = new SQL.Database(fs.readFileSync(path.join(tempDir, "backups", name)));
      const rows = candidateDb.exec("SELECT value FROM app_state WHERE key = 'ORDERS'");
      const hasOrder = rows.length > 0 && String(rows[0].values[0][0]).includes(orderId);
      candidateDb.close();
      return { name, hasOrder };
    });
    assert(recoveredOrders.response.ok && recoveredOrders.body.some((item) => item.id === orderId), `SQLite did not recover the order from a valid backup after corruption: orderId=${orderId}, orders=${JSON.stringify(recoveredOrders.body)}, candidates=${JSON.stringify(recoveryCandidates)}, serverLog=${serverLog}`);
    assert(fs.readdirSync(tempDir).some((name) => name.startsWith("axis-data.sqlite.corrupt-")), "Corrupt SQLite file was not preserved");

    console.log("api-security-and-financial-persistence-smoke: PASS (persistence, integrity, restore, corruption recovery)");
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(`api-security-and-financial-persistence-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

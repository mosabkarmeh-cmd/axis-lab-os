const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const initSqlJs = require("sql.js");

const port = 3800 + Math.floor(Math.random() * 300);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-lab-migration-"));
const databaseFile = path.join(tempDir, "axis-data.sqlite");
const secret = "axis-lab-migration-secret-012345678901234567890";
const token = jwt.sign(
  { sub: "u-1", email: "admin@axislab.com", fullName: "Migration Admin", role: "admin" },
  secret,
  { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" },
);
let server;
const headers = { authorization: `Bearer ${token}` };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitForHealth = async () => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Migration test server did not become healthy");
};
const request = async (url) => {
  const response = await fetch(`http://127.0.0.1:${port}${url}`, { headers });
  return { response, body: await response.json() };
};
const stop = () => new Promise((resolve) => {
  if (!server || server.killed) return resolve();
  server.once("exit", resolve);
  server.kill("SIGTERM");
});

(async () => {
  try {
    const SQL = await initSqlJs({ locateFile: (file) => path.resolve("node_modules/sql.js/dist", file) });
    const legacyDb = new SQL.Database();
    legacyDb.run("CREATE TABLE app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
    legacyDb.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [
      "CUSTOMERS",
      JSON.stringify([{ id: "legacy-customer-1", name: "Legacy Migration Customer", phone: "0999999999", createdAt: "2026-08-14T00:00:00.000Z" }]),
      new Date().toISOString(),
    ]);
    legacyDb.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [
      "PRODUCTS",
      JSON.stringify([{ id: "legacy-product-1", name: "Legacy Migration Product", category: "عام", price: 123, cost: 50, unit: "قطعة", stock: 5, minStock: 1, status: "active" }]),
      new Date().toISOString(),
    ]);
    legacyDb.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [
      "INVOICES",
      JSON.stringify([{
        id: "legacy-invoice-1", invoiceNumber: "INV-LEGACY-1", orderId: "ord-legacy-1", customerId: "legacy-customer-1",
        issueDate: "2026-08-14", dueDate: "2026-08-21", totalPrice: 246, subtotal: 200, taxPercent: 23,
        discount: 0, paidAmount: 100, remaining: 146, status: "partially_paid", notes: "Legacy invoice",
        items: [{ id: "legacy-invoice-item-1", invoiceId: "legacy-invoice-1", productName: "Legacy Migration Product", quantity: 2, unitPrice: 100, discount: 0, tax: 46, total: 246, createdAt: "2026-08-14T00:00:00.000Z" }],
        history: [{ id: "legacy-history-1", invoiceId: "legacy-invoice-1", action: "created", userId: "u-1", createdAt: "2026-08-14T00:00:00.000Z" }],
        payments: [{ id: "legacy-payment-1", invoiceId: "legacy-invoice-1", orderId: "ord-legacy-1", amountUSD: 100, paymentMethod: "cash", date: "2026-08-14" }]
      }]),
      new Date().toISOString(),
    ]);
    legacyDb.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [
      "EXPENSES",
      JSON.stringify([{ id: "legacy-expense-1", category: "utilities", amount: 35, date: "2026-08-14", description: "Legacy expense", status: "paid", createdById: "u-1" }]),
      new Date().toISOString(),
    ]);
    fs.writeFileSync(databaseFile, Buffer.from(legacyDb.export()));
    legacyDb.close();

    server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        DB_MODE: "sqlite",
        PORT: String(port),
        SERVER_HOST: "127.0.0.1",
        ALLOW_PUBLIC_REGISTRATION: "false",
        JWT_SECRET: secret,
        AXIS_DATA_FILE: databaseFile,
        AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
        SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
      },
      stdio: "ignore",
    });
    await waitForHealth();
    const customers = await request("/api/customers");
    assert(customers.response.ok && customers.body.some((customer) => customer.id === "legacy-customer-1"), "Legacy customer was lost during migration");
    const products = await request("/api/products");
    assert(products.response.ok && products.body.some((product) => product.id === "legacy-product-1"), "Legacy product was lost during migration");
    const invoices = await request("/api/accounting/invoices");
    assert(invoices.response.ok && invoices.body.invoices.some((invoice) => invoice.id === "legacy-invoice-1"), "Legacy invoice was lost during migration");
    const expenses = await request("/api/accounting/expenses");
    assert(expenses.response.ok && expenses.body.expenses.some((expense) => expense.id === "legacy-expense-1"), "Legacy expense was lost during migration");
    await new Promise((resolve) => setTimeout(resolve, 800));
    const migratedDb = new SQL.Database(fs.readFileSync(databaseFile));
    const entityRows = migratedDb.exec("SELECT collection, entity_id, payload FROM local_entities WHERE entity_id IN ('legacy-customer-1', 'legacy-product-1') ORDER BY entity_id");
    assert(entityRows.length === 1 && entityRows[0].values.length === 2, "Legacy entities were not written to local_entities");
    const oldRows = migratedDb.exec("SELECT key FROM app_state WHERE key IN ('CUSTOMERS', 'PRODUCTS', 'INVOICES', 'EXPENSES')");
    assert(oldRows.length === 0 || oldRows[0].values.length === 0, "Legacy normalized or financial collections still remain in app_state");
    assert(Number(migratedDb.exec("SELECT COUNT(*) FROM local_invoices WHERE id = 'legacy-invoice-1'")[0].values[0][0]) === 1, "Legacy invoice was not written to local_invoices");
    assert(Number(migratedDb.exec("SELECT COUNT(*) FROM local_invoice_items WHERE invoice_id = 'legacy-invoice-1'")[0].values[0][0]) === 1, "Legacy invoice item was not written to local_invoice_items");
    assert(Number(migratedDb.exec("SELECT COUNT(*) FROM local_invoice_history WHERE invoice_id = 'legacy-invoice-1'")[0].values[0][0]) === 1, "Legacy invoice history was not written to local_invoice_history");
    assert(Number(migratedDb.exec("SELECT COUNT(*) FROM local_payments WHERE id = 'legacy-payment-1'")[0].values[0][0]) === 1, "Legacy payment was not written to local_payments");
    assert(Number(migratedDb.exec("SELECT COUNT(*) FROM local_expenses WHERE id = 'legacy-expense-1'")[0].values[0][0]) === 1, "Legacy expense was not written to local_expenses");
    migratedDb.close();
    console.log("sqlite-migration-smoke: PASS");
  } finally {
    await stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(`sqlite-migration-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

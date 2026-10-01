import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const APP_RUNTIME_ROOT = process.env.AXIS_APP_ROOT || process.cwd();
export const SQLITE_DATA_FILE =
  process.env.AXIS_DATA_FILE ||
  path.join(process.env.USERPROFILE || process.env.HOME || process.cwd(), "AppData", "Roaming", "AXIS LAB OS", "axis-data.sqlite");
export const SQLITE_LEGACY_DATA_FILE =
  process.env.AXIS_LEGACY_DATA_FILE ||
  path.join(process.env.USERPROFILE || process.env.HOME || process.cwd(), "AppData", "Roaming", "Electron", "axis-data.json");
export const SQLITE_SCHEMA_VERSION = 6;

export let localSqlite: any = null;

export function setLocalSqlite(database: any) {
  localSqlite = database;
  return localSqlite;
}

export function backupDirectory() {
  return path.join(path.dirname(SQLITE_DATA_FILE), "backups");
}

export async function initLocalSqlite() {
  if (localSqlite) return localSqlite;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      process.env.SQLITE_WASM_PATH ||
      path.join(APP_RUNTIME_ROOT, "node_modules", "sql.js", "dist", file),
  });

  const openDatabase = (candidateBytes?: Uint8Array) => {
    let database: any = null;
    try {
      database = candidateBytes ? new SQL.Database(candidateBytes) : new SQL.Database();
      database.run("PRAGMA foreign_keys = ON");
      database.run("CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_entities (collection TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, entity_id))");
      database.run("CREATE INDEX IF NOT EXISTS idx_local_entities_collection_updated ON local_entities (collection, updated_at)");
      database.run("CREATE INDEX IF NOT EXISTS idx_local_entities_entity ON local_entities (entity_id)");
      database.run("CREATE TABLE IF NOT EXISTS local_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoices (id TEXT PRIMARY KEY NOT NULL, invoice_number TEXT NOT NULL, order_id TEXT, customer_id TEXT NOT NULL, issue_date TEXT NOT NULL, due_date TEXT NOT NULL, total_price REAL NOT NULL, subtotal REAL, tax_percent REAL, discount REAL, paid_amount REAL NOT NULL, remaining REAL NOT NULL, status TEXT NOT NULL, notes TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoice_items (id TEXT PRIMARY KEY NOT NULL, invoice_id TEXT NOT NULL, product_name TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL NOT NULL, tax REAL NOT NULL, total REAL NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY (invoice_id) REFERENCES local_invoices(id) ON DELETE CASCADE)");
      database.run("CREATE TABLE IF NOT EXISTS local_invoice_history (id TEXT PRIMARY KEY NOT NULL, invoice_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, FOREIGN KEY (invoice_id) REFERENCES local_invoices(id) ON DELETE CASCADE)");
      database.run("CREATE TABLE IF NOT EXISTS local_payments (id TEXT PRIMARY KEY NOT NULL, order_id TEXT, invoice_id TEXT, amount REAL NOT NULL, method TEXT NOT NULL, reference TEXT, date TEXT NOT NULL, notes TEXT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("CREATE TABLE IF NOT EXISTS local_expenses (id TEXT PRIMARY KEY NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)");
      database.run("INSERT OR IGNORE INTO local_metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)", [String(SQLITE_SCHEMA_VERSION), new Date().toISOString()]);
      database.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version' AND CAST(value AS INTEGER) < ?", [String(SQLITE_SCHEMA_VERSION), new Date().toISOString(), SQLITE_SCHEMA_VERSION]);
      return database;
    } catch (error) {
      try { database?.close(); } catch {}
      throw error;
    }
  };

  const hasCurrentFile = fs.existsSync(SQLITE_DATA_FILE);
  let bytes = hasCurrentFile ? fs.readFileSync(SQLITE_DATA_FILE) : undefined;
  let recoveredFrom: string | null = null;

  try {
    localSqlite = openDatabase(bytes);
  } catch (error) {
    const corruptPath = `${SQLITE_DATA_FILE}.corrupt-${Date.now()}`;
    if (hasCurrentFile) {
      try {
        fs.renameSync(SQLITE_DATA_FILE, corruptPath);
        console.error(`[SQLITE] Current database was corrupt and was preserved at ${corruptPath}:`, error);
      } catch (renameError) {
        console.error("[SQLITE] Could not preserve the corrupt database:", renameError);
      }
    }
    localSqlite = null;
    const backupDir = backupDirectory();
    if (fs.existsSync(backupDir)) {
      const candidates = fs.readdirSync(backupDir)
        .filter((name) => name.endsWith(".sqlite"))
        .map((name) => path.join(backupDir, name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      for (const candidate of candidates) {
        try {
          bytes = fs.readFileSync(candidate);
          localSqlite = openDatabase(bytes);
          recoveredFrom = candidate;
          console.error(`[SQLITE] Recovered database from backup ${candidate}`);
          break;
        } catch {
          localSqlite = null;
        }
      }
    }
    if (!localSqlite) {
      bytes = undefined;
      localSqlite = openDatabase();
    }
  }

  if (!bytes && fs.existsSync(SQLITE_LEGACY_DATA_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(SQLITE_LEGACY_DATA_FILE, "utf8"));
      for (const [key, value] of Object.entries(legacy)) {
        localSqlite.run("INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [key, JSON.stringify(value), new Date().toISOString()]);
      }
      console.log(`[SQLITE] Migrated legacy JSON data from ${SQLITE_LEGACY_DATA_FILE}`);
    } catch (error) {
      console.error("[SQLITE] Legacy JSON migration failed:", error);
    }
  }

  if (recoveredFrom) await flushLocalSqlite();
  return localSqlite;
}

export const SQLITE_BUSY_RETRY_DELAYS_MS = [25, 50, 100, 200, 400];

export async function withSqliteBusyRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= SQLITE_BUSY_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = String((error as Error)?.message || error).toLowerCase();
      const isBusy = message.includes("busy") || message.includes("locked");
      if (!isBusy || attempt === SQLITE_BUSY_RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, SQLITE_BUSY_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

export async function flushLocalSqlite() {
  if (!localSqlite) return;
  await fs.promises.mkdir(path.dirname(SQLITE_DATA_FILE), { recursive: true });
  const bytes = localSqlite.export();
  const tempFile = `${SQLITE_DATA_FILE}.tmp`;
  const handle = await fs.promises.open(tempFile, "w");
  try {
    await handle.writeFile(Buffer.from(bytes));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.rename(tempFile, SQLITE_DATA_FILE);
}

export function readFinancialTablesFromSqlite() {
  if (!localSqlite) return null;
  const invoiceRows = localSqlite.exec("SELECT payload FROM local_invoices ORDER BY updated_at, id")[0]?.values || [];
  const itemRows = localSqlite.exec("SELECT invoice_id, payload FROM local_invoice_items ORDER BY created_at, id")[0]?.values || [];
  const historyRows = localSqlite.exec("SELECT invoice_id, payload FROM local_invoice_history ORDER BY created_at, id")[0]?.values || [];
  const paymentRows = localSqlite.exec("SELECT payload FROM local_payments ORDER BY updated_at, id")[0]?.values || [];
  const expenseRows = localSqlite.exec("SELECT payload FROM local_expenses ORDER BY updated_at, id")[0]?.values || [];
  const invoices = invoiceRows.map(([payload]: any[]) => JSON.parse(String(payload)));
  const itemsByInvoice = new Map<string, any[]>();
  for (const [invoiceId, payload] of itemRows) {
    const list = itemsByInvoice.get(String(invoiceId)) || [];
    list.push(JSON.parse(String(payload)));
    itemsByInvoice.set(String(invoiceId), list);
  }
  const historyByInvoice = new Map<string, any[]>();
  for (const [invoiceId, payload] of historyRows) {
    const list = historyByInvoice.get(String(invoiceId)) || [];
    list.push(JSON.parse(String(payload)));
    historyByInvoice.set(String(invoiceId), list);
  }
  for (const invoice of invoices) {
    invoice.items = itemsByInvoice.get(String(invoice.id)) || invoice.items || [];
    invoice.history = historyByInvoice.get(String(invoice.id)) || invoice.history || [];
  }
  return {
    invoices,
    payments: paymentRows.map(([payload]: any[]) => JSON.parse(String(payload))),
    expenses: expenseRows.map(([payload]: any[]) => JSON.parse(String(payload))),
  };
}

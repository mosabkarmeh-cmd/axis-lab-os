import fs from "fs";
import path from "path";
import initSqlJs, { type Database } from "sql.js";
import { createHash } from "crypto";

export interface LocalSqliteRuntimeConfig {
  dataFile: string;
  legacyDataFile: string;
  appRuntimeRoot: string;
  schemaVersion: number;
  useSqlite: boolean;
}

export interface LocalSqliteRuntimeDependencies {
  persistStateNow: () => Promise<void>;
}

export type LocalSqliteRow = Array<string | number | Uint8Array | null>;

export let localSqlite: Database | null = null;

export function setLocalSqlite(database: Database) {
  localSqlite = database;
  return localSqlite;
}

export function createLocalSqliteRuntime(config: LocalSqliteRuntimeConfig, deps: LocalSqliteRuntimeDependencies) {
  const { dataFile, legacyDataFile, appRuntimeRoot, schemaVersion, useSqlite } = config;

  async function initLocalSqlite() {
    if (localSqlite) return localSqlite;
    const SQL = await initSqlJs({
      locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(appRuntimeRoot, "node_modules", "sql.js", "dist", file),
    });
    const openDatabase = (candidateBytes?: Uint8Array) => {
      let database: Database | null = null;
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
        database.run("INSERT OR IGNORE INTO local_metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)", [String(schemaVersion), new Date().toISOString()]);
        database.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version' AND CAST(value AS INTEGER) < ?", [String(schemaVersion), new Date().toISOString(), schemaVersion]);
        return database;
      } catch (error) {
        try { database?.close(); } catch {}
        throw error;
      }
    };

    const hasCurrentFile = fs.existsSync(dataFile);
    let bytes = hasCurrentFile ? fs.readFileSync(dataFile) : undefined;
    let recoveredFrom: string | null = null;
    try {
      localSqlite = openDatabase(bytes);
    } catch (error) {
      const corruptPath = `${dataFile}.corrupt-${Date.now()}`;
      if (hasCurrentFile) {
        try {
          fs.renameSync(dataFile, corruptPath);
          console.error(`[SQLITE] Current database was corrupt and was preserved at ${corruptPath}:`, error);
        } catch (renameError) {
          console.error("[SQLITE] Could not preserve the corrupt database:", renameError);
        }
      }
      localSqlite = null;
      const backupDir = getBackupDirectory();
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

    if (!bytes && fs.existsSync(legacyDataFile)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(legacyDataFile, "utf8"));
        for (const [key, value] of Object.entries(legacy)) {
          localSqlite.run("INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [key, JSON.stringify(value), new Date().toISOString()]);
        }
        console.log(`[SQLITE] Migrated legacy JSON data from ${legacyDataFile}`);
      } catch (error) {
        console.error("[SQLITE] Legacy JSON migration failed:", error);
      }
    }
    if (recoveredFrom) await flushLocalSqlite();
    return localSqlite;
  }

  const SQLITE_BUSY_RETRY_DELAYS_MS = [25, 50, 100, 200, 400];

  async function withSqliteBusyRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= SQLITE_BUSY_RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isBusy = message.toLowerCase().includes("busy") || message.toLowerCase().includes("locked");
        if (!isBusy || attempt === SQLITE_BUSY_RETRY_DELAYS_MS.length) throw error;
        await new Promise((resolve) => setTimeout(resolve, SQLITE_BUSY_RETRY_DELAYS_MS[attempt]));
      }
    }
    throw lastError;
  }

  async function flushLocalSqlite() {
    if (!localSqlite) return;
    await fs.promises.mkdir(path.dirname(dataFile), { recursive: true });
    const bytes = localSqlite.export();
    const tempFile = `${dataFile}.tmp`;
    const handle = await fs.promises.open(tempFile, "w");
    try {
      await handle.writeFile(Buffer.from(bytes));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.promises.rename(tempFile, dataFile);
  }

  function backupDirectory() {
    return path.join(path.dirname(dataFile), "backups");
  }

  function checksumFile(filePath: string) {
    return new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  async function createSqliteBackup(kind = "manual") {
    if (!useSqlite) return null;
    await deps.persistStateNow();
    await fs.promises.mkdir(backupDirectory(), { recursive: true });
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filePath = path.join(backupDirectory(), `${id}.sqlite`);
    await fs.promises.copyFile(dataFile, filePath);
    const stat = await fs.promises.stat(filePath);
    return {
      id,
      name: `${kind === "safety" ? "نسخة أمان قبل الاستعادة" : "نسخة احتياطية يدوية"} - ${new Date().toLocaleDateString("ar-EG")}`,
      createdAt: new Date().toISOString(),
      status: "completed",
      filePath,
      size: stat.size,
      sha256: await checksumFile(filePath),
    };
  }

  function readFinancialTablesFromSqlite() {
    if (!useSqlite || !localSqlite) return null;
    const invoiceRows = localSqlite.exec("SELECT payload FROM local_invoices ORDER BY updated_at, id")[0]?.values || [];
    const itemRows = localSqlite.exec("SELECT invoice_id, payload FROM local_invoice_items ORDER BY created_at, id")[0]?.values || [];
    const historyRows = localSqlite.exec("SELECT invoice_id, payload FROM local_invoice_history ORDER BY created_at, id")[0]?.values || [];
    const paymentRows = localSqlite.exec("SELECT payload FROM local_payments ORDER BY updated_at, id")[0]?.values || [];
    const expenseRows = localSqlite.exec("SELECT payload FROM local_expenses ORDER BY updated_at, id")[0]?.values || [];
    const invoices = invoiceRows.map(([payload]: LocalSqliteRow) => JSON.parse(String(payload)) as Record<string, unknown>);
    const itemsByInvoice = new Map<string, unknown[]>();
    for (const [invoiceId, payload] of itemRows) {
      const list = itemsByInvoice.get(String(invoiceId)) || [];
      list.push(JSON.parse(String(payload)));
      itemsByInvoice.set(String(invoiceId), list);
    }
    const historyByInvoice = new Map<string, unknown[]>();
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
      payments: paymentRows.map(([payload]: LocalSqliteRow) => JSON.parse(String(payload))),
      expenses: expenseRows.map(([payload]: LocalSqliteRow) => JSON.parse(String(payload))),
    };
  }

  return {
    initLocalSqlite,
    SQLITE_BUSY_RETRY_DELAYS_MS,
    withSqliteBusyRetry,
    flushLocalSqlite,
    backupDirectory,
    checksumFile,
    createSqliteBackup,
    readFinancialTablesFromSqlite,
  };
}

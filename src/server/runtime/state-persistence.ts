import type { Database } from "sql.js";
import { db } from "../../db/index.ts";
import { appState } from "../../db/schema.ts";

export interface StatePersistenceCollections {
  USERS: unknown[]; FILES: unknown[]; ORDERS: unknown[]; ACTIVITY_LOGS: unknown[]; EXPENSES: unknown[];
  NUMBERING_SETTINGS: unknown[]; INVOICE_HISTORY: unknown[]; NOTIFICATIONS: unknown[]; DELETED_ITEMS: unknown[]; ORDER_STATUSES: unknown[];
  INVOICES: unknown[]; SETTINGS: Record<string, unknown>; BACKUPS: unknown[]; PRODUCTION_JOBS: unknown[];
  CUSTOMERS: unknown[]; PRODUCTS: unknown[]; MATERIALS: unknown[]; INVENTORY: unknown[]; INVENTORY_TRANSACTIONS: unknown[];
  REMNANTS: unknown[]; SUPPLIERS: unknown[]; SUPPLY_ORDERS: unknown[]; SUPPLIER_QUOTES: unknown[]; MACHINES: unknown[];
}
export interface StatePersistenceDependencies {
  usePostgres: boolean; useSqlite: boolean; localSchemaVersion: number;
  initLocalSqlite: () => Promise<Database>; withSqliteBusyRetry: <T>(operation: () => Promise<T>) => Promise<T>;
  flushLocalSqlite: () => Promise<void>; syncNormalizedLocalEntities: (sqlite: Database) => void;
  assertFinancialStateInvariants: () => void; syncNormalizedFinancialEntities: (sqlite: Database) => void;
  recordBenchmark: (target: Map<string, { count: number; totalMs: number; maxMs: number; samples: number[] }>, name: string, startedAt: number) => number;
  persistenceBenchmarks: Map<string, { count: number; totalMs: number; maxMs: number; samples: number[] }>;
  persistQueueStats: { scheduled: number; coalesced: number; completed: number; failed: number };
  normalizedLocalCollections: readonly string[];
  normalizedFinancialCollections: readonly string[];
}

type PersistedCollection = unknown[] | Record<string, unknown>;
export function createStatePersistence(collections: StatePersistenceCollections, deps: StatePersistenceDependencies) {
const PERSISTED_COLLECTIONS: Record<string, PersistedCollection> = {
  USERS: collections.USERS, FILES: collections.FILES, ORDERS: collections.ORDERS, ACTIVITY_LOGS: collections.ACTIVITY_LOGS, EXPENSES: collections.EXPENSES,
  NUMBERING_SETTINGS: collections.NUMBERING_SETTINGS, INVOICE_HISTORY: collections.INVOICE_HISTORY, NOTIFICATIONS: collections.NOTIFICATIONS, DELETED_ITEMS: collections.DELETED_ITEMS, ORDER_STATUSES: collections.ORDER_STATUSES,
  INVOICES: collections.INVOICES, SETTINGS: collections.SETTINGS, BACKUPS: collections.BACKUPS, PRODUCTION_JOBS: collections.PRODUCTION_JOBS,
};

const LOCAL_PERSISTED_COLLECTIONS: Record<string, PersistedCollection> = {
  ...PERSISTED_COLLECTIONS,
  CUSTOMERS: collections.CUSTOMERS, PRODUCTS: collections.PRODUCTS, MATERIALS: collections.MATERIALS, INVENTORY: collections.INVENTORY, INVENTORY_TRANSACTIONS: collections.INVENTORY_TRANSACTIONS,
  REMNANTS: collections.REMNANTS, SUPPLIERS: collections.SUPPLIERS, SUPPLY_ORDERS: collections.SUPPLY_ORDERS, SUPPLIER_QUOTES: collections.SUPPLIER_QUOTES, MACHINES: collections.MACHINES,
};

async function loadPersistedState(): Promise<number> {
  try {
    if (deps.useSqlite) {
      const sqlite = await deps.initLocalSqlite();
      const rows = sqlite.exec("SELECT key, value FROM app_state");
      const values = rows.length ? rows[0].values : [];
      let restored = 0;
      const snapshotKeys = new Set(values.map(([key]) => String(key)));
      const snapshotValues = new Map(values.map(([key, rawValue]) => [String(key), String(rawValue)]));
      for (const [key, rawValue] of values) {
        const target = LOCAL_PERSISTED_COLLECTIONS[String(key)];
        if (!target || deps.normalizedLocalCollections.includes(String(key) as typeof deps.normalizedLocalCollections[number]) || deps.normalizedFinancialCollections.includes(String(key) as typeof deps.normalizedFinancialCollections[number])) continue;
        const value = JSON.parse(String(rawValue));
        if (Array.isArray(target) && Array.isArray(value)) {
          target.length = 0;
          target.push(...value);
        } else if (target && typeof target === "object" && value && typeof value === "object") {
          Object.assign(target, value);
        }
        restored++;
      }
      for (const [key, target] of Object.entries(LOCAL_PERSISTED_COLLECTIONS)) {
        if (key !== "USERS" && !snapshotKeys.has(key) && Array.isArray(target) && !deps.normalizedLocalCollections.includes(key as typeof deps.normalizedLocalCollections[number]) && !deps.normalizedFinancialCollections.includes(key as typeof deps.normalizedFinancialCollections[number])) {
          target.length = 0;
        }
      }
      let migrated = false;
      for (const collection of deps.normalizedLocalCollections) {
        const target = LOCAL_PERSISTED_COLLECTIONS[collection];
        if (!Array.isArray(target)) throw new Error(`Normalized collection ${collection} must be an array`);
        const entityRows = sqlite.exec("SELECT payload FROM local_entities WHERE collection = ? ORDER BY entity_id", [collection]);
        const entityValues = entityRows.length ? entityRows[0].values : [];
        if (snapshotKeys.has(collection)) {
          const legacyValue = JSON.parse(String(snapshotValues.get(collection) || "[]"));
          if (Array.isArray(legacyValue)) {
            target.length = 0;
            target.push(...legacyValue);
          }
          migrated = true;
        } else if (entityValues.length > 0) {
          target.length = 0;
          target.push(...entityValues.map(([payload]) => JSON.parse(String(payload))));
          restored++;
        } else {
          target.length = 0;
        }
        if (snapshotKeys.has(collection)) {
          sqlite.run("DELETE FROM app_state WHERE key = ?", [collection]);
          migrated = true;
        }
      }
      let financialMigrated = false;
      const invoiceRows = sqlite.exec("SELECT payload FROM local_invoices ORDER BY updated_at, id");
      if (snapshotKeys.has("INVOICES")) {
        const legacyInvoices = JSON.parse(String(snapshotValues.get("INVOICES") || "[]"));
        if (Array.isArray(legacyInvoices)) {
          collections.INVOICES.length = 0;
          collections.INVOICES.push(...legacyInvoices);
        }
        sqlite.run("DELETE FROM app_state WHERE key = ?", ["INVOICES"]);
        financialMigrated = true;
      } else if (invoiceRows.length && invoiceRows[0].values.length > 0) {
        collections.INVOICES.length = 0;
        collections.INVOICES.push(...invoiceRows[0].values.map(([payload]) => JSON.parse(String(payload))));
        restored++;
      } else {
        collections.INVOICES.length = 0;
      }
      const expenseRows = sqlite.exec("SELECT payload FROM local_expenses ORDER BY updated_at, id");
      if (snapshotKeys.has("EXPENSES")) {
        const legacyExpenses = JSON.parse(String(snapshotValues.get("EXPENSES") || "[]"));
        if (Array.isArray(legacyExpenses)) {
          collections.EXPENSES.length = 0;
          collections.EXPENSES.push(...legacyExpenses);
        }
        sqlite.run("DELETE FROM app_state WHERE key = ?", ["EXPENSES"]);
        financialMigrated = true;
      } else if (expenseRows.length && expenseRows[0].values.length > 0) {
        collections.EXPENSES.length = 0;
        collections.EXPENSES.push(...expenseRows[0].values.map(([payload]) => JSON.parse(String(payload))));
        restored++;
      } else {
        collections.EXPENSES.length = 0;
      }
      if (migrated || financialMigrated) {
        if (migrated) deps.syncNormalizedLocalEntities(sqlite);
        if (financialMigrated) deps.syncNormalizedFinancialEntities(sqlite);
        await deps.flushLocalSqlite();
      }
      return restored;
    }
    if (!deps.usePostgres) return 0;
    const rows = await db.select().from(appState);
    let restored = 0;
    for (const row of rows) {
      const target = PERSISTED_COLLECTIONS[row.key];
      if (!target) continue;
      const value = row.value;
      if (Array.isArray(target) && Array.isArray(value)) {
        target.length = 0;
        target.push(...value);
        restored++;
      } else if (target && typeof target === "object" && !Array.isArray(target) && value && typeof value === "object") {
        Object.assign(target, value);
        restored++;
      }
    }
    return restored;
  } catch (err) {
    console.error("[STATE] Failed to load persisted app state:", err);
    if (deps.useSqlite || deps.usePostgres) throw err;
    return 0;
  }
}

let persistTimer: NodeJS.Timeout | null = null;
let persistInFlight = false;
let persistAgainAfter = false;
let persistWaiters: Array<() => void> = [];
async function persistStateNow() {
  if (!deps.usePostgres && !deps.useSqlite) return;
  if (persistInFlight) {
    persistAgainAfter = true;
    deps.persistQueueStats.coalesced += 1;
    await new Promise<void>((resolve) => persistWaiters.push(resolve));
    return;
  }
  persistInFlight = true;
  const persistStartedAt = performance.now();
  try {
    if (deps.useSqlite) {
      await deps.withSqliteBusyRetry(async () => {
        const sqlite = await deps.initLocalSqlite();
        const now = new Date().toISOString();
        sqlite.run("BEGIN TRANSACTION");
        try {
          for (const [key, value] of Object.entries(LOCAL_PERSISTED_COLLECTIONS)) {
            if (deps.normalizedLocalCollections.includes(key as typeof deps.normalizedLocalCollections[number]) || deps.normalizedFinancialCollections.includes(key as typeof deps.normalizedFinancialCollections[number])) continue;
            sqlite.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", [key, JSON.stringify(value), now]);
          }
          deps.syncNormalizedLocalEntities(sqlite);
          deps.assertFinancialStateInvariants();
          deps.syncNormalizedFinancialEntities(sqlite);
          sqlite.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version'", [String(deps.localSchemaVersion), now]);
          sqlite.run("COMMIT");
        } catch (error) {
          try { sqlite.run("ROLLBACK"); } catch {}
          throw error;
        }
        const flushStartedAt = performance.now();
        await deps.flushLocalSqlite();
        deps.recordBenchmark(deps.persistenceBenchmarks, "sqlite_export_and_atomic_flush", flushStartedAt);
      });
    } else {
      for (const [key, value] of Object.entries(PERSISTED_COLLECTIONS)) {
        await db
          .insert(appState)
          .values({ key, value })
          .onConflictDoUpdate({ target: appState.key, set: { value, updatedAt: new Date() } });
      }
    }
    deps.recordBenchmark(deps.persistenceBenchmarks, deps.useSqlite ? "persist_state_sqlite" : "persist_state_postgres", persistStartedAt);
    deps.persistQueueStats.completed += 1;
  } catch (err) {
    deps.persistQueueStats.failed += 1;
    console.error("[STATE] Failed to persist app state to database:", err);
    throw err;
    } finally {
    persistInFlight = false;
    if (persistAgainAfter) {
      persistAgainAfter = false;
      void persistStateNow();
    } else {
      const waiters = persistWaiters;
      persistWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }
}
async function persistMutationWithFastDurability() {
  if (!deps.usePostgres && !deps.useSqlite) return;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  // A mutation is not durable until the persistence currently in flight has
  // either included it or a follow-up persistence has flushed the new state.
  // persistStateNow() already handles this with persistAgainAfter + waiters.
  await persistStateNow();
}
function schedulePersist() {
  deps.persistQueueStats.scheduled += 1;
  if (persistTimer) {
    deps.persistQueueStats.coalesced += 1;
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistStateNow();
  }, 400);
}

const RESETTABLE_BUSINESS_COLLECTIONS = [
  collections.FILES, collections.ORDERS, collections.ACTIVITY_LOGS, collections.EXPENSES, collections.INVOICE_HISTORY, collections.NOTIFICATIONS,
  collections.DELETED_ITEMS, collections.INVOICES, collections.BACKUPS, collections.PRODUCTION_JOBS, collections.CUSTOMERS, collections.PRODUCTS,
  collections.MATERIALS, collections.INVENTORY, collections.INVENTORY_TRANSACTIONS, collections.REMNANTS, collections.SUPPLIERS,
  collections.SUPPLY_ORDERS, collections.SUPPLIER_QUOTES, collections.MACHINES,
];

async function resetBusinessData() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await persistStateNow();
  for (const collection of RESETTABLE_BUSINESS_COLLECTIONS) collection.length = 0;
  if (deps.useSqlite) {
    const sqlite = await deps.initLocalSqlite();
    await deps.withSqliteBusyRetry(async () => {
      sqlite.run("BEGIN TRANSACTION");
      try {
        sqlite.run("DELETE FROM local_invoice_items");
        sqlite.run("DELETE FROM local_invoice_history");
        sqlite.run("DELETE FROM local_payments");
        sqlite.run("DELETE FROM local_invoices");
        sqlite.run("DELETE FROM local_expenses");
        sqlite.run("DELETE FROM local_entities");
        sqlite.run("DELETE FROM app_state WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          "FILES", "ORDERS", "ACTIVITY_LOGS", "EXPENSES", "INVOICE_HISTORY", "NOTIFICATIONS",
          "DELETED_ITEMS", "INVOICES", "BACKUPS", "PRODUCTION_JOBS", "CUSTOMERS", "PRODUCTS",
          "MATERIALS", "INVENTORY", "INVENTORY_TRANSACTIONS", "REMNANTS", "SUPPLIERS",
          "SUPPLY_ORDERS", "SUPPLIER_QUOTES", "MACHINES",
        ]);
        sqlite.run("COMMIT");
      } catch (error) {
        try { sqlite.run("ROLLBACK"); } catch {}
        throw error;
      }
      await deps.flushLocalSqlite();
    });
  }
  await persistStateNow();
  await new Promise((resolve) => setTimeout(resolve, 75));
  await persistStateNow();
}

  return {
    PERSISTED_COLLECTIONS,
    LOCAL_PERSISTED_COLLECTIONS,
    loadPersistedState,
    persistStateNow,
    persistMutationWithFastDurability,
    schedulePersist,
    RESETTABLE_BUSINESS_COLLECTIONS,
    resetBusinessData,
    get persistTimer() { return persistTimer; },
    get persistInFlight() { return persistInFlight; },
    get persistAgainAfter() { return persistAgainAfter; },
  };
}
// IMPORTANT: this must be the very first import.
// ES module imports are evaluated in listed order, and each imported module
// runs fully before the *next* import is loaded. customersRouter/productsRouter/etc
// (further below) transitively import src/db/index.ts, which reads
// process.env.SQL_HOST/SQL_USER/... at import time to create the Postgres pool.
// If dotenv.config() runs after those imports (as a normal statement later in this
// file), .env has not been loaded yet and the pool is created with undefined
// credentials -> every DB-backed route (customers/products/materials/production)
// fails with "Failed query" errors, even though .env looks correct.
import "dotenv/config";

import { refreshWarehouseCache as createWarehouseCacheRuntime } from "./runtime/warehouse-cache.ts";
import { idNum } from "./runtime/identifiers.ts";
import { sypToUsd } from "../lib/currency.ts";
import { createStatePersistence } from "./runtime/state-persistence.ts";
import { createLocalSqliteRuntime, localSqlite, setLocalSqlite } from "./runtime/local-sqlite.ts";
import { createProductionEmailRuntime } from "./runtime/production-email.ts";
import { createNotificationRuntime, WORKFLOW_NEXT_REMINDERS } from "./runtime/notifications-runtime.ts";
import { createCurrencyRuntime } from "./runtime/currency-runtime.ts";
import { createSettingsRuntime } from "./runtime/settings-runtime.ts";
import { EXPENSES, NUMBERING_SETTINGS, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, BACKUPS, PRODUCTION_JOBS } from "./runtime/operational-seeds.ts";
import { createMasterDataNormalizationRuntime, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY } from "./runtime/master-data-normalization.ts";
import { createAuthRuntime, JWT_ISSUER_DEFAULT, JWT_AUDIENCE_DEFAULT, type UserRecord } from "./runtime/auth-runtime.ts";
import { createNumberingRuntime } from "./runtime/numbering-runtime.ts";
import { activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, type BenchmarkBucket } from "./runtime/metrics.ts";
import { apiKey, ai } from "./runtime/ai-client.ts";
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, USERS, FILES, CUSTOMERS, PRODUCTS, ACTIVITY_LOGS, MATERIALS, INVENTORY, INVENTORY_TRANSACTIONS, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, MACHINES, SETTINGS } from "./runtime/core-state.ts";
import { ORDERS, INVOICES } from "./runtime/business-state.ts";
import { syncNormalizedLocalEntities as syncLocalEntities, assertFinancialStateInvariants as assertFinancialState, syncNormalizedFinancialEntities as syncFinancialEntities } from "./runtime/local-sqlite-sync.ts";

import express from "express";
import path from "path";
import https from "https";
import multer from "multer";
import cors from "cors";
import os from "os";






const DB_MODE = process.env.DB_MODE || "auto";
const USE_POSTGRES = DB_MODE === "postgres" || (DB_MODE === "auto" && Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME));
const USE_SQLITE = DB_MODE === "sqlite";
const APP_RUNTIME_ROOT = process.env.AXIS_APP_ROOT || process.cwd();
const LOCAL_DATA_FILE = process.env.AXIS_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "AXIS LAB OS", "axis-data.sqlite");
const RESOURCE_FONT_PATH = process.env.AXIS_FONT_PATH || path.join(APP_RUNTIME_ROOT, "Amiri-Regular.ttf");
const LOCAL_LEGACY_DATA_FILE = process.env.AXIS_LEGACY_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "Electron", "axis-data.json");
const LOCAL_SCHEMA_VERSION = 6;
const NORMALIZED_LOCAL_COLLECTIONS = ["CUSTOMERS", "PRODUCTS", "MATERIALS", "INVENTORY", "INVENTORY_TRANSACTIONS", "REMNANTS", "SUPPLIERS", "SUPPLY_ORDERS", "SUPPLIER_QUOTES", "MACHINES", "ORDERS", "ACTIVITY_LOGS", "NOTIFICATIONS", "PRODUCTION_JOBS"] as const;
const NORMALIZED_FINANCIAL_COLLECTIONS = ["INVOICES", "EXPENSES"] as const;
const LOCAL_ENTITY_COLLECTIONS: Record<string, readonly unknown[]> = {
  CUSTOMERS,
  PRODUCTS,
  MATERIALS,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  SUPPLIERS,
  SUPPLY_ORDERS,
  SUPPLIER_QUOTES,
  MACHINES,
  ORDERS,
  ACTIVITY_LOGS,
  NOTIFICATIONS,
  PRODUCTION_JOBS,
};

async function refreshWarehouseCache() {
  return createWarehouseCacheRuntime(USE_POSTGRES, {
    MACHINES,
    CUSTOMERS,
    PRODUCTS,
    MATERIALS,
    INVENTORY,
    INVENTORY_TRANSACTIONS,
    REMNANTS,
    SUPPLIERS,
    SUPPLY_ORDERS,
    SUPPLIER_QUOTES,
  });
}
let persistStateNowForSqlite: () => Promise<void> = async () => {
  throw new Error("SQLite persistence callback is not initialized");
};
const localSqliteRuntime = createLocalSqliteRuntime(
  {
    dataFile: LOCAL_DATA_FILE,
    legacyDataFile: LOCAL_LEGACY_DATA_FILE,
    appRuntimeRoot: APP_RUNTIME_ROOT,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    useSqlite: USE_SQLITE,
  },
  {
    persistStateNow: () => persistStateNowForSqlite(),
  },
);
const {
  initLocalSqlite,
  SQLITE_BUSY_RETRY_DELAYS_MS,
  withSqliteBusyRetry,
  flushLocalSqlite,
  backupDirectory,
  checksumFile,
  createSqliteBackup,
  inspectSqliteBackup,
  restoreUploadedFilesFromBackup,
  deleteSqliteBackup,
  uploadDirectory,
  readFinancialTablesFromSqlite,
} = localSqliteRuntime;
function syncNormalizedLocalEntities(database: Parameters<typeof syncLocalEntities>[0]) {
  return syncLocalEntities(database, NORMALIZED_LOCAL_COLLECTIONS, LOCAL_ENTITY_COLLECTIONS);
}
function assertFinancialStateInvariants() {
  return assertFinancialState({ invoices: INVOICES, expenses: EXPENSES });
}
function syncNormalizedFinancialEntities(database: Parameters<typeof syncFinancialEntities>[0]) {
  return syncFinancialEntities(database, { invoices: INVOICES, expenses: EXPENSES, orders: ORDERS });
}

const authRuntime = createAuthRuntime({
  users: USERS,
  jwtSecret: JWT_SECRET,
  jwtIssuer: JWT_ISSUER,
  jwtAudience: JWT_AUDIENCE,
});
const {
  publicUser,
  generateJWT,
  getRequestUser,
} = authRuntime;

const productionEmailRuntime = createProductionEmailRuntime({
  settings: SETTINGS,
  machines: MACHINES,
  users: USERS,
  notifications: NOTIFICATIONS,
  activityLogs: ACTIVITY_LOGS,
  nextActivityLogId,
});
const { sendProductionJobEmailNotification } = productionEmailRuntime;

const notificationRuntime = createNotificationRuntime({
  orderStatuses: ORDER_STATUSES,
  notifications: NOTIFICATIONS,
  orders: ORDERS,
  customers: CUSTOMERS,
});
const {
  normalizeOrderStatuses,
  createNotification,
  notifyOverdueOrders,
} = notificationRuntime;

const currencyRuntime = createCurrencyRuntime({
  settings: SETTINGS,
  invoices: INVOICES,
});
const { freezeOrderCurrencySnapshot } = currencyRuntime;

const settingsRuntime = createSettingsRuntime(SETTINGS);
const {
  publicSettings,
  getPartnerSharePercentAt,
  mergeSmtpSettings,
} = settingsRuntime;

const masterDataNormalizationRuntime = createMasterDataNormalizationRuntime({
  materials: MATERIALS,
  inventory: INVENTORY,
  supplierQuotes: SUPPLIER_QUOTES,
  supplyOrders: SUPPLY_ORDERS,
});
const {
  normalizeLegacyMaterialPrices,
  normalizeInventoryState,
  ensureDemoLowPriceMaterials,
} = masterDataNormalizationRuntime;

const numberingRuntime = createNumberingRuntime({
  settings: NUMBERING_SETTINGS,
  nextEntityId,
});
const { getNextNumber } = numberingRuntime;

// ==================== STATE PERSISTENCE ====================
const statePersistence = createStatePersistence(
  {
    USERS, FILES, ORDERS, ACTIVITY_LOGS, EXPENSES, NUMBERING_SETTINGS, INVOICE_HISTORY,
    NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, INVOICES, SETTINGS, BACKUPS, PRODUCTION_JOBS,
    CUSTOMERS, PRODUCTS, MATERIALS, INVENTORY, INVENTORY_TRANSACTIONS, REMNANTS, SUPPLIERS,
    SUPPLY_ORDERS, SUPPLIER_QUOTES, MACHINES,
  },
  {
    usePostgres: USE_POSTGRES,
    useSqlite: USE_SQLITE,
    localSchemaVersion: LOCAL_SCHEMA_VERSION,
    initLocalSqlite,
    withSqliteBusyRetry,
    flushLocalSqlite,
    syncNormalizedLocalEntities,
    assertFinancialStateInvariants,
    syncNormalizedFinancialEntities,
    recordBenchmark,
    persistenceBenchmarks,
    persistQueueStats,
    normalizedLocalCollections: NORMALIZED_LOCAL_COLLECTIONS,
    normalizedFinancialCollections: NORMALIZED_FINANCIAL_COLLECTIONS,
  }
);
const {
  PERSISTED_COLLECTIONS,
  LOCAL_PERSISTED_COLLECTIONS,
  loadPersistedState,
  persistStateNow,
  persistMutationWithFastDurability,
  schedulePersist,
  RESETTABLE_BUSINESS_COLLECTIONS,
  resetBusinessData,
} = statePersistence;
persistStateNowForSqlite = statePersistence.persistStateNow;

const persistTimer = statePersistence.persistTimer;
const persistInFlight = statePersistence.persistInFlight;
const persistAgainAfter = statePersistence.persistAgainAfter;

// Public runtime contract consumed by the extracted API route modules.
export { apiKey, ai, DB_MODE, USE_POSTGRES, USE_SQLITE, APP_RUNTIME_ROOT, LOCAL_DATA_FILE, RESOURCE_FONT_PATH, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, NORMALIZED_LOCAL_COLLECTIONS, NORMALIZED_FINANCIAL_COLLECTIONS, initLocalSqlite, SQLITE_BUSY_RETRY_DELAYS_MS, withSqliteBusyRetry, flushLocalSqlite, syncNormalizedLocalEntities, assertFinancialStateInvariants, syncNormalizedFinancialEntities, readFinancialTablesFromSqlite, backupDirectory, checksumFile, createSqliteBackup, inspectSqliteBackup, restoreUploadedFilesFromBackup, deleteSqliteBackup, uploadDirectory, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, publicUser, generateJWT, getRequestUser, USERS, FILES, CUSTOMERS, PRODUCTS, ORDERS, ACTIVITY_LOGS, MATERIALS, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, normalizeLegacyMaterialPrices, INVENTORY, INVENTORY_TRANSACTIONS, normalizeInventoryState, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, ensureDemoLowPriceMaterials, MACHINES, EXPENSES, NUMBERING_SETTINGS, getNextNumber, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, normalizeOrderStatuses, createNotification, notifyOverdueOrders, WORKFLOW_NEXT_REMINDERS, INVOICES, SETTINGS, publicSettings, getPartnerSharePercentAt, mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification, BACKUPS, PRODUCTION_JOBS, localSqlite, setLocalSqlite, PERSISTED_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS, idNum, refreshWarehouseCache, loadPersistedState, persistTimer, persistInFlight, persistAgainAfter, persistStateNow, persistMutationWithFastDurability, schedulePersist, RESETTABLE_BUSINESS_COLLECTIONS, resetBusinessData, sypToUsd };
export type { UserRecord, BenchmarkBucket };

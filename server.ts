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

import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import ExcelJS from "exceljs";
import multer from "multer";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import os from "os";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { sypToUsd } from "./src/lib/currency.ts";
import { materialPriceUSD } from "./src/lib/materials.ts";
import type { UserRecord } from "./src/server/types.ts";
import { createAuthRouter } from "./src/server/routes/auth.ts";
import { createUsersRouter } from "./src/server/routes/users.ts";
import { createOrdersLocalRouter } from "./src/server/routes/orders-local.ts";
import { createWarehouseLocalRouter } from "./src/server/routes/warehouse-local.ts";
import { createProductionLocalRouter } from "./src/server/routes/production-local.ts";
import { createAccountingLocalRouter } from "./src/server/routes/accounting-local.ts";
import { createSystemLocalRouter } from "./src/server/routes/system-local.ts";
import { createFinancialTools } from "./src/server/services/financial.ts";
import { createAdvancedLocalRouter } from "./src/server/routes/advanced-local.ts";
import { createAiLocalRouter } from "./src/server/routes/ai-local.ts";
import { createReportsLocalRouter } from "./src/server/routes/reports-local.ts";
import { createCustomersLocalRouter } from "./src/server/routes/customersLocal.ts";
import { createProductsLocalRouter } from "./src/server/routes/productsLocal.ts";
import { createMaterialsLocalRouter } from "./src/server/routes/materialsLocal.ts";
import { createDocumentsLocalRouter } from "./src/server/routes/documents-local.ts";
import { createStateStore } from "./src/server/state/store.ts";
import { nextEntityId, nextActivityLogId, secureId } from "./src/server/services/ids.ts";
import { createEnsureFontExists, reverseArabicLine } from "./src/server/services/pdf.ts";
import { eq } from "drizzle-orm";
import { createSecurityPolicy, FINANCE_ROLES } from "./src/server/security/policy.ts";
import * as stateData from "./src/server/state/data.ts";

const {
  USERS, FILES, ACTIVITY_LOGS, CUSTOMERS, PRODUCTS, ORDERS, MATERIALS, EXPENSES, NUMBERING_SETTINGS,
  INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, WORKFLOW_NEXT_REMINDERS,
  INVOICES, SETTINGS, BACKUPS, PRODUCTION_JOBS, INVENTORY, INVENTORY_TRANSACTIONS,
  REMNANTS, SUPPLIERS, SUPPLY_ORDERS, SUPPLIER_QUOTES, MACHINES,
  DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, normalizeLegacyMaterialPrices,
  ensureDemoLowPriceMaterials, normalizeInventoryState, getNextNumber, normalizeOrderStatuses,
  createNotification, notifyOverdueOrders, publicSettings, getPartnerSharePercentAt,
  mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification,
} = stateData;

import customersRouter from "./src/server/routes/customers.ts";
import productsRouter from "./src/server/routes/products.ts";
import materialsRouter from "./src/server/routes/materials.ts";
import productionRouter from "./src/server/routes/production.ts";
import { db } from "./src/db/index.ts";
import { appState, customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable, suppliers as suppliersTable, supplyOrders as supplyOrdersTable, supplierQuotes as supplierQuotesTable, machines as machinesTable } from "./src/db/schema.ts";

// Initialize Gemini Client safely
const apiKey = process.env.GEMINI_API_KEY || "dummy_key_for_startup";
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DB_MODE = process.env.DB_MODE || "auto";
const USE_POSTGRES = DB_MODE === "postgres" || (DB_MODE === "auto" && Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME));
const USE_SQLITE = DB_MODE === "sqlite";
const LOCAL_DATA_FILE = process.env.AXIS_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "AXIS LAB OS", "axis-data.sqlite");
const LOCAL_LEGACY_DATA_FILE = process.env.AXIS_LEGACY_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "Electron", "axis-data.json");
const APP_RUNTIME_ROOT = process.env.AXIS_APP_ROOT || process.cwd();
const RESOURCE_FONT_PATH = process.env.AXIS_FONT_PATH || path.join(APP_RUNTIME_ROOT, "Amiri-Regular.ttf");
const FONT_FALLBACK_PATH = path.join(path.dirname(LOCAL_DATA_FILE), "Amiri-Regular.ttf");
const ensureFontExists = createEnsureFontExists(RESOURCE_FONT_PATH, FONT_FALLBACK_PATH);

let entityIdSequence = 0;
type BenchmarkBucket = { count: number; totalMs: number; maxMs: number; samples: number[] };
const orderCreateBenchmarks = new Map<string, BenchmarkBucket>();
const persistenceBenchmarks = new Map<string, BenchmarkBucket>();
function recordBenchmark(target: Map<string, BenchmarkBucket>, name: string, startedAt: number) {
  const elapsed = Math.max(0, performance.now() - startedAt);
  const bucket = target.get(name) || { count: 0, totalMs: 0, maxMs: 0, samples: [] };
  bucket.count += 1;
  bucket.totalMs += elapsed;
  bucket.maxMs = Math.max(bucket.maxMs, elapsed);
  bucket.samples.push(elapsed);
  if (bucket.samples.length > 1000) bucket.samples.shift();
  target.set(name, bucket);
  return elapsed;
}
function benchmarkSnapshot(target: Map<string, BenchmarkBucket>) {
  return [...target.entries()].map(([name, bucket]) => {
    const sorted = [...bucket.samples].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    return { name, count: bucket.count, avgMs: Number((bucket.totalMs / Math.max(1, bucket.count)).toFixed(2)), p95Ms: Number(p95.toFixed(2)), maxMs: Number(bucket.maxMs.toFixed(2)) };
  });
}
const LOCAL_SCHEMA_VERSION = 6;

const stateStore = createStateStore({
  USE_POSTGRES, USE_SQLITE, LOCAL_DATA_FILE, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, APP_RUNTIME_ROOT,
  db, appState, customersTable, productsTable, materialsTable, inventoryTable,
  inventoryTransactionsTable, remnantsTable, suppliersTable, supplyOrdersTable,
  supplierQuotesTable, machinesTable, persistenceBenchmarks, recordBenchmark,
});
const { initLocalSqlite, initSqlJs, getLocalSqlite, setLocalSqlite, flushLocalSqlite, loadPersistedState, persistStateNow, persistMutationWithFastDurability,
  schedulePersist, resetBusinessData, refreshWarehouseCache, createSqliteBackup, checksumFile, idNum } = stateStore;
const financialTools = createFinancialTools({ ORDERS, INVOICES, INVOICE_HISTORY, ACTIVITY_LOGS, SETTINGS, nextActivityLogId, persistStateNow });
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_ISSUER = process.env.JWT_ISSUER || "axislab-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "axislab-web";
const securityPolicy = createSecurityPolicy({ users: USERS, jwtSecret: JWT_SECRET, jwtIssuer: JWT_ISSUER, jwtAudience: JWT_AUDIENCE });
const { publicUser, generateJWT, getRequestUser, authenticatedUserId, requireFinanceRole, sanitizeApiResponse, sanitizeActivityLogForEmployee } = securityPolicy;
const DEMO_MODE = process.env.AXIS_DEMO_MODE === "true";
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigin = process.env.APP_URL || `http://localhost:${PORT}`;
  const allowedOrigins = new Set(
    [allowedOrigin, ...(process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)]
      .map((value) => value.replace(/\/+$/, ""))
  );

  app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? allowedOrigin : true,
    credentials: true,
  }));
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Cookie-authenticated state changes must originate from an explicitly allowed origin.
  // Requests without an Origin header are retained for CLI/native clients; browsers normally
  // send Origin on cross-origin state-changing requests, so a mismatched origin is rejected.
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = String(req.headers.origin || "").replace(/\/+$/, "");
    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ success: false, message: "مصدر الطلب غير مصرح به" });
      return;
    }
    next();
  });

  // Central API boundary: only health and authentication bootstrap are public.
  // Every business endpoint must have a verified active user before its handler runs.
  app.use("/api", (req, res, next) => {
    const publicPaths = new Set(["/health", "/auth/login", "/auth/register", "/auth/change-password"]);
    if (req.method === "OPTIONS" || publicPaths.has(req.path)) {
      next();
      return;
    }
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "يجب تسجيل الدخول للوصول إلى واجهة API" });
      return;
    }
    if (user.mustChangePassword && req.path !== "/auth/change-password") {
      res.status(428).json({ success: false, message: "يجب تغيير كلمة المرور المؤقتة قبل استخدام النظام" });
      return;
    }
    (req as any).user = user;
    next();
  });

  // Central response hardening. Sensitive fields are removed server-side, so
  // employee clients never receive financial/job-cost data even if the UI changes.
  app.use("/api", (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => originalJson(sanitizeApiResponse(req.path, body, (req as any).user))) as any;
    next();
  });

  // Restore persisted business data. A production install starts empty unless
  // AXIS_DEMO_MODE=true was explicitly requested for a demo environment.
  const restoredCount = await loadPersistedState();
  if (!DEMO_MODE && restoredCount === 0) stateStore.clearBusinessDataInMemory();
  normalizeOrderStatuses();
  normalizeInventoryState();
  normalizeLegacyMaterialPrices();
  console.log(`[STATE] Mode=${DB_MODE}; restored ${restoredCount} collections from ${USE_SQLITE ? LOCAL_DATA_FILE : "database"}.`);
  // Make sure a fresh local store/database immediately has a snapshot saved.
  if (USE_POSTGRES || USE_SQLITE) schedulePersist();

  // Load the warehouse cache (materials/inventory/suppliers/...) from the real tables
  // once at boot so the very first request already sees correct data.
  await refreshWarehouseCache();

  // The warehouse cache is loaded from SQLite after the legacy snapshot restore.
  // Re-run the idempotent material-price migration after that load, then persist it;
  // otherwise the old database values would overwrite the corrected in-memory values.
  // Demo materials are never re-seeded automatically. Real installations must remain empty after Safe Reset.
  normalizeInventoryState();
  normalizeLegacyMaterialPrices();
  if (USE_POSTGRES || USE_SQLITE) await persistStateNow();

  // Keep the warehouse cache in sync with the real tables on every API request - cheap
  // for a single-workshop's data volume, and means every one of the ~100 read call sites
  // across this file (dashboards, reports, order/production lookups, ...) that use
  // the MATERIALS/INVENTORY/SUPPLIERS/... arrays always sees what's actually in the database,
  // regardless of whether the last write came from materials.ts's routes or from this file.
  app.use((req, res, next) => {
    if (USE_POSTGRES && req.path.startsWith("/api/")) {
      refreshWarehouseCache().finally(next);
    } else {
      next();
    }
  });

  // After every successful write request, snapshot the in-memory state to Postgres
  // (debounced) so it survives the next restart/redeploy.
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (
        req.path.startsWith("/api/") &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        res.statusCode >= 200 && res.statusCode < 400
      ) {
        if ((USE_POSTGRES || USE_SQLITE) && !(res.locals as any).axisPersistScheduled) schedulePersist();
      }
    });
    next();
  });

  // API Health Check Route. This is intentionally safe for LAN diagnostics:
  // expose only the database type, basename, schema version, and integrity result.
  app.get("/api/health", async (req, res) => {
    const database = USE_POSTGRES ? "postgres" : USE_SQLITE ? "sqlite" : "memory";
    let status = "ok";
    let sqliteIntegrity: string | null = null;
    let schemaVersion: number | null = null;
    if (USE_SQLITE) {
      try {
        const databaseHandle = await initLocalSqlite();
        const integrityResult = databaseHandle.exec("PRAGMA integrity_check");
        sqliteIntegrity = String(integrityResult[0]?.values?.[0]?.[0] || "unknown");
        const schemaResult = databaseHandle.exec("SELECT value FROM local_metadata WHERE key = 'schema_version' LIMIT 1");
        const parsedVersion = Number(schemaResult[0]?.values?.[0]?.[0]);
        schemaVersion = Number.isFinite(parsedVersion) ? parsedVersion : null;
        if (sqliteIntegrity !== "ok") status = "degraded";
      } catch (error) {
        status = "degraded";
        sqliteIntegrity = "error";
        console.error("[HEALTH] SQLite integrity check failed:", error);
      }
    }
    res.status(status === "ok" ? 200 : 503).json({
      success: status === "ok",
      status,
      database,
      databaseFile: USE_SQLITE ? path.basename(LOCAL_DATA_FILE) : null,
      sqliteIntegrity,
      schemaVersion,
    });
  });

  app.get("/api/diagnostics/benchmarks", (req, res) => {
    const user = (req as any).user as UserRecord | undefined;
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بعرض قياسات الأداء الداخلية" });
      return;
    }
    res.json({
      success: true,
      collectedAt: new Date().toISOString(),
      orderCreate: benchmarkSnapshot(orderCreateBenchmarks),
      persistence: benchmarkSnapshot(persistenceBenchmarks),
      persistenceQueue: stateStore.getPersistenceStatus(),
    });
  });

  const aiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/ai", aiRateLimit);

  const routeDeps = { users: USERS, activityLogs: ACTIVITY_LOGS, nextActivityLogId, nextEntityId, schedulePersist, publicUser, getRequestUser, generateJWT, jwtSecret: JWT_SECRET, jwtIssuer: JWT_ISSUER, jwtAudience: JWT_AUDIENCE };
const featureRouteDeps = {
  APP_RUNTIME_ROOT,
  ai,
  DELETED_ITEMS,
  ACTIVITY_LOGS,
  CUSTOMERS,
  FINANCE_ROLES,
  INVOICES,
  INVOICE_HISTORY,
  ORDERS,
  ORDER_STATUSES,
  PRODUCTS,
  SETTINGS,
  NOTIFICATIONS,
  USERS,
  WORKFLOW_NEXT_REMINDERS,
  authenticatedUserId,
  createNotification,
  crypto,
  freezeOrderCurrencySnapshot,
  getNextNumber,
  getRequestUser,
  nextActivityLogId,
  nextEntityId,
  notifyOverdueOrders,
  orderCreateBenchmarks,
  persistMutationWithFastDurability,
  persistStateNow,
  ...financialTools,
  recordBenchmark,
  sypToUsd,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  MATERIALS,
  SUPPLIER_QUOTES,
  REMNANTS,
  SUPPLIERS,
  SUPPLY_ORDERS,
  USE_POSTGRES,
  USE_SQLITE,
  db,
  eq,
  idNum,
  inventoryTable,
  inventoryTransactionsTable,
  remnantsTable,
  customersTable,
  productsTable,
  materialsTable,
  supplierQuotesTable,
  schedulePersist,
  suppliersTable,
  supplyOrdersTable,
  MACHINES,
  PRODUCTION_JOBS,
  Type,
  materialPriceUSD,
  reverseArabicLine,
  ExcelJS,
  machinesTable,
  sendProductionJobEmailNotification,
  EXPENSES,
  NUMBERING_SETTINGS,
  loadPersistedState,
  BACKUPS,
  FILES,
  LOCAL_DATA_FILE,
  checksumFile,
  createSqliteBackup,
  flushLocalSqlite,
  fs,
  initSqlJs,
  getLocalSqlite,
  setLocalSqlite,
  mergeSmtpSettings,
  multer,
  nodemailer,
  os,
  path,
  publicSettings,
  refreshWarehouseCache,
  ensureFontExists,
  requireFinanceRole,
  sanitizeActivityLogForEmployee,
  getPartnerSharePercentAt,
  secureId,
};

  app.use("/api/auth", createAuthRouter(routeDeps));
  app.use("/api/users", createUsersRouter(routeDeps));

  // Product/catalog writes affect sales pricing and are restricted to administrators in both SQLite and PostgreSQL modes.
  app.use("/api/products", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "إدارة المنتجات والأسعار متاحة لمدير النظام فقط" });
    }
    next();
  });

  app.use("/api/materials", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (user?.role === "employee" && req.method === "POST" && ["/ai-classify", "/check-availability"].includes(req.path)) return next();
    if (user?.role === "employee" && req.method === "PATCH" && /\/quality-status$/.test(req.path)) return next();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "تعديل وإدارة الخامات متاحان لمدير النظام فقط، مع استثناء إجراءات التشغيل المعتمدة" });
    }
    next();
  });

  app.use("/api/suppliers", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (!user || !FINANCE_ROLES.has(user.role)) {
      return res.status(403).json({ success: false, message: "إدارة الموردين متاحة للمدير أو المحاسب المالي فقط" });
    }
    next();
  });

  app.use("/api/supply-orders", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (!user || !FINANCE_ROLES.has(user.role)) {
      return res.status(403).json({ success: false, message: "طلبات التوريد متاحة للمدير أو المحاسب المالي فقط" });
    }
    next();
  });

  app.use("/api/production/machines", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (req.method === "PUT" && user && ["admin", "employee"].includes(user.role)) return next();
    if ((req.method === "POST" || req.method === "DELETE") && user?.role === "admin") return next();
    return res.status(403).json({ success: false, message: "هذه العملية على الماكينات غير مصرح بها لهذا الحساب" });
  });

  // Mount PostgreSQL-backed routers only when PostgreSQL mode is active.
  // Memory mode uses the built-in seeded handlers below and never emits connection errors.
  if (USE_POSTGRES) {
    app.use("/api/customers", customersRouter);
    app.use("/api/products", productsRouter);
    app.use("/api", materialsRouter);
    app.use("/api/production", productionRouter);
  }

  // Security authorization middlewares for namespaces
  app.use("/api/accounting", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role === "employee") {
      res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لقسم الحسابات والمالية" });
      return;
    }
    next();
  });

  app.use("/api/reports", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role === "employee") {
      res.status(403).json({ success: false, message: "غير مصرح لك بالوصول لتقارير الأداء" });
      return;
    }
    next();
  });

  app.use("/api/settings", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بالوصول إلى إعدادات النظام" });
      return;
    }
    next();
  });

  app.use("/api/backup", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بنسخ أو استعادة قواعد البيانات" });
      return;
    }
    next();
  });

  app.use("/api/notifications", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path.endsWith("/read") || req.path === "/read-all") return next();
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "إدارة الإشعارات النظامية متاحة لمدير النظام فقط" });
      return;
    }
    next();
  });

  app.use("/api/order-statuses", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "إدارة مراحل سير الطلبات متاحة لمدير النظام فقط" });
      return;
    }
    next();
  });

  app.use("/api/recycle-bin", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "سلة المحذوفات متاحة لمدير النظام فقط" });
      return;
    }
    next();
  });

  app.use("/api/print/quotation", (req, res, next) => {
    if (!requireFinanceRole(req, res)) return;
    next();
  });

  app.use("/api/accounting/invoices", (req, res, next) => {
    if (!requireFinanceRole(req, res)) return;
    next();
  });

  app.use("/api/files", (req, res, next) => {
    const sensitiveTypes = new Set(["Invoice", "Expense", "Payment", "SupplyOrder", "Accounting", "Backup"]);
    const user = getRequestUser(req);
    const entityType = typeof req.body?.entityType === "string" ? req.body.entityType : null;
    if (entityType && sensitiveTypes.has(entityType) && (!user || !FINANCE_ROLES.has(user.role))) {
      res.status(403).json({ success: false, message: "الملفات المالية متاحة للمدير أو المحاسب المالي فقط" });
      return;
    }
    if (req.method === "DELETE" && (!user || user.role !== "admin")) {
      res.status(403).json({ success: false, message: "حذف الملفات متاح لمدير النظام فقط" });
      return;
    }
    const entityMatch = req.path.match(/^\/entity\/([^/]+)\/([^/]+)/);
    const downloadMatch = req.path.match(/^\/([^/]+)\/download$/);
    const sensitiveDownloadTypes = sensitiveTypes;
    if (entityMatch && sensitiveDownloadTypes.has(entityMatch[1]) && (!user || !FINANCE_ROLES.has(user.role))) {
      res.status(403).json({ success: false, message: "الملفات المالية متاحة للمدير أو المحاسب المالي فقط" });
      return;
    }
    if (downloadMatch) {
      const fileRecord = FILES.find((f: any) => f.id === downloadMatch[1]);
      if (fileRecord && sensitiveDownloadTypes.has(String(fileRecord.entityType)) && (!user || !FINANCE_ROLES.has(user.role))) {
        res.status(403).json({ success: false, message: "الملف المالي غير متاح لهذا الحساب" });
        return;
      }
    }
    next();
  });

  // Accountants cannot perform write operations on jobs
  app.use("/api/production/jobs", (req, res, next) => {
    if (req.method !== "GET") {
      const user = getRequestUser(req);
      if (user && user.role === "accountant") {
        res.status(403).json({ success: false, message: "غير مصرح للمحاسب المالي بتعديل مهام الإنتاج" });
        return;
      }
    }
    next();
  });

  // Employee accounts are operational only. Financial mutations and bulk imports
  // require finance/admin authority on the server, independent of UI visibility.
  app.use("/api/orders", (req, res, next) => {
    const user = getRequestUser(req);
    const isPaymentMutation = req.path.includes("/payments") && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (isPaymentMutation && (!user || !FINANCE_ROLES.has(user.role))) {
      res.status(403).json({ success: false, message: "تسجيل أو حذف الدفعات المالية متاح للمدير أو المحاسب المالي فقط" });
      return;
    }
    next();
  });

  app.use("/api/export", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || !FINANCE_ROLES.has(user.role)) {
      res.status(403).json({ success: false, message: "التقارير والتصدير المالي متاحان للمدير أو المحاسب المالي فقط" });
      return;
    }
    next();
  });

  app.use("/api/exchange-rate", (req, res, next) => {
    const user = getRequestUser(req);
    if (req.method !== "GET" && (!user || !FINANCE_ROLES.has(user.role))) {
      res.status(403).json({ success: false, message: "تعديل سعر الصرف متاح للمدير أو المحاسب المالي فقط" });
      return;
    }
    next();
  });

  app.use("/api/import", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "عمليات الاستيراد الجماعي متاحة لمدير النظام فقط" });
      return;
    }
    next();
  });

  // Viewer accounts are strictly read-only. Password changes and notification
  // read receipts remain available, while business mutations are rejected.
  app.use("/api", (req, res, next) => {
    const user = getRequestUser(req);
    const allowedViewerWrite = req.path === "/auth/change-password" || req.path.endsWith("/read");
    if (user?.role === "viewer" && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !allowedViewerWrite) {
      res.status(403).json({ success: false, message: "حساب المشاهدة للقراءة فقط ولا يسمح بتعديل البيانات" });
      return;
    }
    next();
  });

  if (!USE_POSTGRES) {
    app.use("/api/customers", createCustomersLocalRouter(featureRouteDeps));
    app.use("/api/products", createProductsLocalRouter(featureRouteDeps));
    app.use("/api", createMaterialsLocalRouter(featureRouteDeps));
  }
  app.use("/api", createDocumentsLocalRouter(featureRouteDeps));

  app.use("/api/orders", createOrdersLocalRouter(featureRouteDeps));
  app.use("/api", createWarehouseLocalRouter(featureRouteDeps));
  app.use("/api/production", createProductionLocalRouter(featureRouteDeps));
  app.use("/api/accounting", createAccountingLocalRouter(featureRouteDeps));
  app.use("/api", createSystemLocalRouter(featureRouteDeps));

  app.use("/api", createAdvancedLocalRouter(featureRouteDeps));
  app.use("/api", createAiLocalRouter(featureRouteDeps));
  app.use("/api", createReportsLocalRouter(featureRouteDeps));

  // Safe reset: business data only. System settings, admin users, numbering and statuses remain.
  app.post("/api/admin/reset-business-data", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "هذه العملية متاحة لمدير النظام فقط" });
      return;
    }
    try {
      await resetBusinessData();
      res.json({ success: true, message: "تم تصفير بيانات الأعمال مع الحفاظ على الإعدادات والحساب الإداري" });
    } catch (error) {
      console.error("[RESET] Business data reset failed:", error);
      res.status(500).json({ success: false, message: "تعذر تصفير بيانات الأعمال بأمان" });
    }
  });

  // API - Get Orders
  // ==================== MATERIALS API ====================

  // ==================== INVENTORY API ====================

  // API - Get Activity Logs
  app.get("/api/logs", (req, res) => {
    const user = getRequestUser(req);
    const logs = user?.role === "employee" ? ACTIVITY_LOGS.map(sanitizeActivityLogForEmployee) : ACTIVITY_LOGS;
    res.json(logs);
  });

  // Vite middleware for development or static serving for production
  const isElectronProduction = process.env.ELECTRON_RUN_AS_NODE === "1";
  if (!isElectronProduction && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 0 },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(APP_RUNTIME_ROOT, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const HOST = process.env.SERVER_HOST || "127.0.0.1";
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  // Flush any pending state save on a normal shutdown (Ctrl+C, systemd stop, etc.)
  // so the last few seconds of work aren't lost.
  const gracefulShutdown = async () => {
    console.log("[STATE] Shutting down, saving latest data before exit...");
    stateStore.clearPendingPersistence();
    try {
      await persistStateNow();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

startServer();

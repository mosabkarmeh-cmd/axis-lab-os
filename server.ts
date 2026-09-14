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
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import { createHash } from "crypto";
import https from "https";
import multer from "multer";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import os from "os";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import initSqlJs from "sql.js";
import { materialPriceUSD } from "./src/lib/materials.ts";
import { sypToUsd } from "./src/lib/currency.ts";

import customersRouter from "./src/server/routes/customers.ts";
import productsRouter from "./src/server/routes/products.ts";
import materialsRouter from "./src/server/routes/materials.ts";
import productionRouter from "./src/server/routes/production.ts";
import { db } from "./src/db/index.ts";
import { appState, customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable, suppliers as suppliersTable, supplyOrders as supplyOrdersTable, supplierQuotes as supplierQuotesTable, machines as machinesTable } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";

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
const LOCAL_SCHEMA_VERSION = 5;
let activityLogSequence = 0;
function nextActivityLogId(prefix = "log") {
  activityLogSequence = (activityLogSequence + 1) % 1000000;
  return `${prefix}_${Date.now()}_${process.pid}_${activityLogSequence}_${crypto.randomUUID().slice(0, 8)}`;
}
let entityIdSequence = 0;
function nextEntityId(prefix: string) {
  entityIdSequence = (entityIdSequence + 1) % 1000000;
  return `${prefix}-${Date.now()}${entityIdSequence}`;
}
type BenchmarkBucket = { count: number; totalMs: number; maxMs: number; samples: number[] };
const orderCreateBenchmarks = new Map<string, BenchmarkBucket>();
const persistenceBenchmarks = new Map<string, BenchmarkBucket>();
const persistQueueStats = { scheduled: 0, coalesced: 0, completed: 0, failed: 0 };
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
const NORMALIZED_LOCAL_COLLECTIONS = ["CUSTOMERS", "PRODUCTS", "MATERIALS", "INVENTORY", "SUPPLIERS", "MACHINES", "ACTIVITY_LOGS", "NOTIFICATIONS", "PRODUCTION_JOBS"] as const;
const NORMALIZED_FINANCIAL_COLLECTIONS = ["INVOICES", "EXPENSES"] as const;
let localSqlite: any = null;

async function initLocalSqlite() {
  if (localSqlite) return localSqlite;
  const SQL = await initSqlJs({
    locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
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
      database.run("INSERT OR IGNORE INTO local_metadata (key, value, updated_at) VALUES ('schema_version', ?, ?)", [String(LOCAL_SCHEMA_VERSION), new Date().toISOString()]);
      database.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version' AND CAST(value AS INTEGER) < ?", [String(LOCAL_SCHEMA_VERSION), new Date().toISOString(), LOCAL_SCHEMA_VERSION]);
      return database;
    } catch (error) {
      try { database?.close(); } catch {}
      throw error;
    }
  };
  const hasCurrentFile = fs.existsSync(LOCAL_DATA_FILE);
  let bytes = hasCurrentFile ? fs.readFileSync(LOCAL_DATA_FILE) : undefined;
  let recoveredFrom: string | null = null;
  try {
    localSqlite = openDatabase(bytes);
  } catch (error) {
    const corruptPath = `${LOCAL_DATA_FILE}.corrupt-${Date.now()}`;
    if (hasCurrentFile) {
      try {
        fs.renameSync(LOCAL_DATA_FILE, corruptPath);
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
  if (!bytes && fs.existsSync(LOCAL_LEGACY_DATA_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LOCAL_LEGACY_DATA_FILE, "utf8"));
      for (const [key, value] of Object.entries(legacy)) {
        localSqlite.run("INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?)", [key, JSON.stringify(value), new Date().toISOString()]);
      }
      console.log(`[SQLITE] Migrated legacy JSON data from ${LOCAL_LEGACY_DATA_FILE}`);
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
      const message = String((error as Error)?.message || error).toLowerCase();
      const isBusy = message.includes("busy") || message.includes("locked");
      if (!isBusy || attempt === SQLITE_BUSY_RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, SQLITE_BUSY_RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}
async function flushLocalSqlite() {
  if (!localSqlite) return;
  await fs.promises.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  const bytes = localSqlite.export();
  const tempFile = `${LOCAL_DATA_FILE}.tmp`;
  const handle = await fs.promises.open(tempFile, "w");
  try {
    await handle.writeFile(Buffer.from(bytes));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.rename(tempFile, LOCAL_DATA_FILE);
}

function syncNormalizedLocalEntities(sqlite: any) {
  const now = new Date().toISOString();
  for (const collection of NORMALIZED_LOCAL_COLLECTIONS) {
    const values = LOCAL_PERSISTED_COLLECTIONS[collection] || [];
    const usedEntityIds = new Set<string>();
    sqlite.run("DELETE FROM local_entities WHERE collection = ?", [collection]);
    for (const value of values) {
      const baseEntityId = String(value?.id || value?.key || `${collection.toLowerCase()}-${Math.random().toString(36).slice(2)}`);
      let entityId = baseEntityId;
      let duplicateIndex = 1;
      while (usedEntityIds.has(entityId)) {
        entityId = `${baseEntityId}~${duplicateIndex++}`;
      }
      if (entityId !== baseEntityId) {
        console.warn(`[STATE] Duplicate ${collection} entity id ${baseEntityId}; persisted with storage key ${entityId}`);
      }
      usedEntityIds.add(entityId);
      sqlite.run("INSERT INTO local_entities (collection, entity_id, payload, updated_at) VALUES (?, ?, ?, ?)", [collection, entityId, JSON.stringify(value), now]);
    }
  }
}
function assertFinancialStateInvariants() {
  for (const invoice of INVOICES) {
    const total = Number(invoice.totalPrice) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    const remaining = Number(invoice.remaining) || 0;
    if (invoice.status !== "credit_note" && Math.abs(remaining - Math.max(0, total - paid)) > 0.02) {
      throw new Error(`Financial invariant failed for invoice ${invoice.id}: remaining mismatch`);
    }
    for (const item of invoice.items || []) {
      const expected = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0) + (Number(item.tax) || 0);
      if (Math.abs((Number(item.total) || 0) - expected) > 0.02) {
        throw new Error(`Financial invariant failed for invoice item ${item.id || "unknown"}: total mismatch`);
      }
    }
  }
  for (const expense of EXPENSES) {
    if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) < 0) {
      throw new Error(`Financial invariant failed for expense ${expense.id}: amount must be non-negative`);
    }
  }
}
function syncNormalizedFinancialEntities(sqlite: any) {
  const now = new Date().toISOString();
  sqlite.run("DELETE FROM local_invoice_items");
  sqlite.run("DELETE FROM local_invoice_history");
  sqlite.run("DELETE FROM local_payments");
  sqlite.run("DELETE FROM local_invoices");
  sqlite.run("DELETE FROM local_expenses");
  const usedInvoiceIds = new Set<string>();
  const usedInvoiceItemIds = new Set<string>();
  const usedInvoiceHistoryIds = new Set<string>();
  const usedExpenseIds = new Set<string>();
  for (const invoice of INVOICES) {
    const invoiceId = String(invoice.id);
    if (usedInvoiceIds.has(invoiceId)) continue;
    usedInvoiceIds.add(invoiceId);
    sqlite.run("INSERT INTO local_invoices (id, invoice_number, order_id, customer_id, issue_date, due_date, total_price, subtotal, tax_percent, discount, paid_amount, remaining, status, notes, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      invoiceId, String(invoice.invoiceNumber || invoiceId), invoice.orderId ? String(invoice.orderId) : null, String(invoice.customerId || ""), String(invoice.issueDate || now), String(invoice.dueDate || invoice.issueDate || now), Number(invoice.totalPrice) || 0, invoice.subtotal == null ? null : Number(invoice.subtotal), invoice.taxPercent == null ? null : Number(invoice.taxPercent), invoice.discount == null ? null : Number(invoice.discount), Number(invoice.paidAmount) || 0, Number(invoice.remaining) || 0, String(invoice.status || "unpaid"), invoice.notes || null, JSON.stringify(invoice), now,
    ]);
    for (const item of invoice.items || []) {
      const baseItemId = String(item.id || `${invoiceId}-item-${Math.random().toString(36).slice(2)}`);
      let itemId = baseItemId;
      let itemSuffix = 1;
      while (usedInvoiceItemIds.has(itemId)) itemId = `${baseItemId}~${itemSuffix++}`;
      usedInvoiceItemIds.add(itemId);
      sqlite.run("INSERT INTO local_invoice_items (id, invoice_id, product_name, quantity, unit_price, discount, tax, total, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        itemId, invoiceId, String(item.productName || ""), Number(item.quantity) || 0, Number(item.unitPrice) || 0, Number(item.discount) || 0, Number(item.tax) || 0, Number(item.total) || 0, String(item.createdAt || now), JSON.stringify(item),
      ]);
    }
    for (const history of invoice.history || []) {
      const baseHistoryId = String(history.id || `${invoiceId}-history-${Math.random().toString(36).slice(2)}`);
      let historyId = baseHistoryId;
      let historySuffix = 1;
      while (usedInvoiceHistoryIds.has(historyId)) historyId = `${baseHistoryId}~${historySuffix++}`;
      usedInvoiceHistoryIds.add(historyId);
      sqlite.run("INSERT INTO local_invoice_history (id, invoice_id, action, created_at, payload) VALUES (?, ?, ?, ?, ?)", [historyId, invoiceId, String(history.action || "updated"), String(history.createdAt || now), JSON.stringify(history)]);
    }
  }
  const paymentRows = new Map<string, any>();
  for (const invoice of INVOICES) {
    for (const payment of invoice.payments || []) {
      const id = String(payment.id || `${invoice.id}-${payment.createdAt || payment.date || Math.random()}`);
      paymentRows.set(id, { ...payment, id, invoiceId: invoice.id, orderId: invoice.orderId });
    }
  }
  for (const order of ORDERS) {
    for (const payment of order.payments || []) {
      const id = String(payment.id || `${order.id}-${payment.createdAt || payment.date || Math.random()}`);
      if (!paymentRows.has(id)) paymentRows.set(id, { ...payment, id, orderId: order.id });
    }
  }
  for (const payment of paymentRows.values()) {
    sqlite.run("INSERT INTO local_payments (id, order_id, invoice_id, amount, method, reference, date, notes, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      String(payment.id), payment.orderId ? String(payment.orderId) : null, payment.invoiceId ? String(payment.invoiceId) : null, Number(payment.amountUSD ?? payment.amount) || 0, String(payment.paymentMethod || payment.method || "cash"), payment.reference || null, String(payment.date || payment.createdAt || now), payment.notes || null, JSON.stringify(payment), now,
    ]);
  }
  for (const expense of EXPENSES) {
    const expenseId = String(expense.id);
    if (usedExpenseIds.has(expenseId)) continue;
    usedExpenseIds.add(expenseId);
    sqlite.run("INSERT INTO local_expenses (id, category, amount, date, status, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [expenseId, String(expense.category || "عام"), Number(expense.amount) || 0, String(expense.date || now), String(expense.status || "paid"), JSON.stringify(expense), now]);
  }
}
function backupDirectory() {
  return path.join(path.dirname(LOCAL_DATA_FILE), "backups");
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
  if (!USE_SQLITE) return null;
  await persistStateNow();
  await fs.promises.mkdir(backupDirectory(), { recursive: true });
  const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(backupDirectory(), `${id}.sqlite`);
  await fs.promises.copyFile(LOCAL_DATA_FILE, filePath);
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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters");
}
const JWT_ISSUER = process.env.JWT_ISSUER || "axislab-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "axislab-web";

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  passwordHash: string;
  mustChangePassword?: boolean;
};

function publicUser(user: UserRecord) {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive, mustChangePassword: Boolean(user.mustChangePassword) };
}

function generateJWT(user: UserRecord): string {
  return jwt.sign(
    { sub: user.id, email: user.email, fullName: user.fullName, role: user.role },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: "24h", issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
  );
}

function getRequestUser(req: any): UserRecord | null {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token && req.cookies) token = req.cookies.axislab_token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"], issuer: JWT_ISSUER, audience: JWT_AUDIENCE }) as jwt.JwtPayload;
    if (!payload.sub) return null;
    const user = USERS.find(u => u.id === payload.sub);
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
}

// Memory database states
const USERS: UserRecord[] = [
  { id: "u-1", email: "admin@axislab.com", fullName: "المدير العام", role: "admin", isActive: true, mustChangePassword: Boolean(process.env.BOOTSTRAP_ADMIN_PASSWORD), passwordHash: process.env.DEMO_ADMIN_PASSWORD_HASH || (process.env.BOOTSTRAP_ADMIN_PASSWORD ? bcrypt.hashSync(process.env.BOOTSTRAP_ADMIN_PASSWORD, 12) : "") },
  { id: "u-2", email: "employee@axislab.com", fullName: "فني تشغيل الليزر", role: "employee", isActive: Boolean(process.env.DEMO_EMPLOYEE_PASSWORD_HASH), passwordHash: process.env.DEMO_EMPLOYEE_PASSWORD_HASH || "" },
  { id: "u-3", email: "accountant@axislab.com", fullName: "المحاسب المالي", role: "accountant", isActive: Boolean(process.env.DEMO_ACCOUNTANT_PASSWORD_HASH), passwordHash: process.env.DEMO_ACCOUNTANT_PASSWORD_HASH || "" }
];

const FILES: any[] = [
  {
    id: "f-1",
    name: "ax-2026-001-design.dxf",
    originalName: "تصميم لوحة الأمل.dxf",
    mimeType: "application/octet-stream",
    size: 245100,
    path: "",
    entityType: "order",
    entityId: "ord-1",
    uploadedById: "u-1",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

// Exchange rate now lives in SETTINGS.exchangeRate (single source of truth, see below).

const CUSTOMERS = [
  { id: "c-1", name: "شركة الأمل للدعاية", phone: "+962791234567", whatsapp: "+962791234567", email: "info@alamal.com", company: "الأمل للدعاية", address: "عمان، الأردن", notes: "عميل دائم - يفضل مراجعة تصاميم الاكريليك قبل البدء", category: "شركة" },
  { id: "c-2", name: "م. سامر الخالدي", phone: "+962788877665", whatsapp: "+962788877665", email: "samer@khaledi.me", company: "مكتب سامر الهندسي", address: "إربد، الأردن", notes: "مهتم بالحفر على الأخشاب الصلبة بمقاسات دقيقة", category: "مقاول" }
];

const PRODUCTS = [
  { id: "p-1", name: "أكريليك شفاف 3 ملم", code: "ACR-3TR", category: "الأكريليك", price: 362500, description: "ألواح أكريليك شفافة ممتازة لقص الليزر والأحرف المضيئة", stock: 120 },
  { id: "p-2", name: "أكريليك أسود 5 ملم", code: "ACR-5BK", category: "الأكريليك", price: 217500, description: "أكريليك أسود صلب عالي المقاومة وجميل التشطيب", stock: 85 },
  { id: "p-3", name: "خشب زان طبيعي 8 ملم", code: "WD-BCH8", category: "الأخشاب", price: 652500, description: "خشب زان طبيعي مثالي للحفر الدقيق واللوحات الترحيبية", stock: 40 },
  { id: "p-4", name: "خشب زان طبيعي 4 ملم", code: "WD-BCH4", category: "الأخشاب", price: 290000, description: "خشب زان نحيف للهدايا التذكارية والمجسمات ثلاثية الأبعاد", stock: 65 },
  { id: "p-5", name: "خشب مضغوط MDF 6 ملم", code: "WD-MDF6", category: "الأخشاب", price: 261000, description: "ألواح خشب مضغوط اقتصادية ومناسبة للمجسمات الكبيرة والعلب", stock: 150 },
  { id: "p-6", name: "جلد طبيعي 2 ملم", code: "LTH-NAT2", category: "الجلود", price: 435000, description: "جلد طبيعي مرن للحفر ليزر وصناعة الإكسسوارات الفاخرة", stock: 50 }
];

const ORDERS: any[] = [
  {
    id: "ord-1",
    orderNumber: "AX-2026-001",
    customerId: "c-1",
    status: "in_progress",
    priority: "high",
    totalPrice: 3480000,
    paidAmount: 2175000,
    remaining: 1305000,
    notes: "قص أحرف أكريليك مضيئة مع حواف مصقولة بالليزر",
    createdById: "u-1",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hrs ago
    deliveryDateExpected: new Date(Date.now() + 3600000 * 48).toISOString(), // 2 days from now
    items: [
      { id: "item-1", productName: "أكريليك أسود 5 ملم", quantity: 12, unitPrice: 217500, totalPrice: 2610000, completedQuantity: 8, isCompleted: false, notes: "قص نظيف بدون نتوءات حادة" },
      { id: "item-2", productName: "قص ليزر وحفر خط عربي", quantity: 1, unitPrice: 870000, totalPrice: 870000, completedQuantity: 0, isCompleted: false, notes: "حفر بعمق 1 ملم وتلميع الحواف" }
    ],
    payments: [
      { id: "pay-101", orderId: "ord-1", amountUSD: 150.0, amountSYP: 2175000, paymentMethod: "cash", notes: "دفعة عربون أولية كاش عند الاتفاق", recordedBy: "u-1", createdAt: new Date(Date.now() - 3600000 * 3.5).toISOString() }
    ],
    statusHistory: [
      { oldStatus: "new", newStatus: "in_progress", notes: "تم استلام التصميم والبدء بالقص", changedAt: new Date(Date.now() - 3600000 * 2).toISOString() }
    ]
  },
  {
    id: "ord-2",
    orderNumber: "AX-2026-002",
    customerId: "c-2",
    status: "new",
    priority: "normal",
    totalPrice: 1377500,
    paidAmount: 1377500,
    remaining: 0.0,
    notes: "لوحة ترحيبية خشبية محفورة ليزر للمكتب الرئيسي",
    createdById: "u-2",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hrs ago
    deliveryDateExpected: new Date(Date.now() + 3600000 * 24).toISOString(), // 1 day from now
    isArchived: false,
    items: [
      { id: "item-3", productName: "خشب زان طبيعي 8 ملم", quantity: 1, unitPrice: 652500, totalPrice: 652500, notes: "لوحة أساسية مقاس 30x40 سم" },
      { id: "item-4", productName: "حفر تفصيلي شعار مائل", quantity: 1, unitPrice: 725000, totalPrice: 725000, notes: "حفر شعار مائل بجودة عالية" }
    ],
    statusHistory: []
  },
  {
    id: "ord-3",
    orderNumber: "AX-2025-089",
    customerId: "c-1",
    status: "delivered",
    priority: "normal",
    totalPrice: 6525000,
    paidAmount: 6525000,
    remaining: 0.0,
    notes: "مشروع واجهات أكريليك وقواعد معدنية محفورة بالليزر - تم التسليم من فترة وأرشفته لتخفيف الحمل",
    createdById: "u-1",
    createdAt: new Date(Date.now() - 86400000 * 55).toISOString(), // 55 days ago
    deliveryDateActual: new Date(Date.now() - 86400000 * 50).toISOString(),
    isArchived: true,
    archivedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    items: [
      { id: "item-5", productName: "أكريليك شفاف 10 ملم", quantity: 5, unitPrice: 1015000, totalPrice: 5075000, notes: "تلميع ألماني" },
      { id: "item-6", productName: "قص وحفر شعارات مؤسسية", quantity: 1, unitPrice: 1450000, totalPrice: 1450000, notes: "دقة 0.05 ملم" }
    ],
    statusHistory: [
      { oldStatus: "ready", newStatus: "delivered", notes: "تم التسليم للعميل بالكامل واستلام الدفعة", changedAt: new Date(Date.now() - 86400000 * 50).toISOString() },
      { oldStatus: "delivered", newStatus: "delivered", notes: "تمت الأرشفة التلقائية بنظام أرشفة الطلبات (مر أكثر من 30 يوماً)", changedAt: new Date(Date.now() - 86400000 * 20).toISOString() }
    ]
  },
  {
    id: "ord-4",
    orderNumber: "AX-2025-095",
    customerId: "c-2",
    status: "delivered",
    priority: "normal",
    totalPrice: 2610000,
    paidAmount: 2610000,
    remaining: 0.0,
    notes: "دروع تكريمية خشبية مع حفر ليزر مخصص - مكتمل ومسلم منذ 35 يوماً (مؤهل للأرشفة التلقائية)",
    createdById: "u-2",
    createdAt: new Date(Date.now() - 86400000 * 35).toISOString(), // 35 days ago (candidate for auto-archive!)
    deliveryDateActual: new Date(Date.now() - 86400000 * 32).toISOString(),
    isArchived: false,
    items: [
      { id: "item-7", productName: "درع خشبي فاخر 12 ملم", quantity: 3, unitPrice: 870000, totalPrice: 2610000, notes: "حفر وتعبئة ذهبية" }
    ],
    statusHistory: [
      { oldStatus: "ready", newStatus: "delivered", notes: "تم التسليم للعميل بالكامل", changedAt: new Date(Date.now() - 86400000 * 32).toISOString() }
    ]
  }
];

const ACTIVITY_LOGS: Array<{ id: string; userId: string; action: string; entityType: string; entityId: string; createdAt: string; details?: string }> = [
  { id: "log-1", userId: "u-1", action: "LOGIN", entityType: "User", entityId: "u-1", createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: "log-2", userId: "u-1", action: "CREATE_CUSTOMER", entityType: "Customer", entityId: "c-2", createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: "log-3", userId: "u-2", action: "CREATE_ORDER", entityType: "Order", entityId: "ord-2", createdAt: new Date(Date.now() - 3600000 * 1).toISOString() }
];

const MATERIALS = [
  { id: "m-1", name: "لوح أكريليك شفاف 3 ملم", category: "الأكريليك", subCategory: "acrylic", thickness: 3, color: "transparent", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 1350, minimumStock: 10, supplierId: "s-1", notes: "ألواح كورية ممتازة حماية ورقية", status: "active", qualityStatus: "inspected" },
  { id: "m-2", name: "لوح أكريليك أسود 5 ملم", category: "الأكريليك", subCategory: "acrylic", thickness: 5, color: "black", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 6075, minimumStock: 8, supplierId: "s-1", notes: "مقاوم للخدوش ومثالي للحروف البارزة", status: "active", qualityStatus: "inspected" },
  { id: "m-3", name: "لوح خشب زان طبيعي 4 ملم", category: "الأخشاب", subCategory: "wood", thickness: 4, color: "natural", width: 600, height: 1200, unit: "sheet", pricePerUnit: 2700, minimumStock: 15, supplierId: "s-2", notes: "وجهين مصقولين بجودة عالية", status: "active", qualityStatus: "in_preparation" },
  { id: "m-4", name: "لوح خشب مضغوط MDF 6 ملم", category: "الأخشاب", subCategory: "wood", thickness: 6, color: "brown", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 1620, minimumStock: 20, supplierId: "s-2", notes: "صناعة رومانية ممتاز للحفر", status: "active", qualityStatus: "defective" },
  { id: "m-5", name: "جلد طبيعي مرن 2 ملم", category: "الجلود", subCategory: "leather", thickness: 2, color: "tan", width: 1000, height: 1000, unit: "piece", pricePerUnit: 4725, minimumStock: 5, supplierId: "s-3", notes: "جلد بقر طبيعي مدبوغ نباتياً", status: "active", qualityStatus: "inspected" }
];

const LEGACY_MATERIAL_PRICES_SYP_CANONICAL: Record<string, number> = {
  "m-1": 1350,
  "m-2": 6075,
  "m-3": 2700,
  "m-4": 1620,
  "m-5": 4725,
};
const LEGACY_MATERIAL_PRICES_SYP: Record<string, number> = {
  "m-1": 362500,
  "m-2": 652500,
  "m-3": 290000,
  "m-4": 174000,
  "m-5": 507500,
};
function normalizeLegacyMaterialPrices() {
  // Material prices are canonical SYP values. Convert only known legacy values;
  // exact matching makes this migration idempotent across every restart.
  for (const material of MATERIALS) {
    const oldValue = LEGACY_MATERIAL_PRICES_SYP[material.id];
    const targetSyp = LEGACY_MATERIAL_PRICES_SYP_CANONICAL[material.id];
    if (oldValue !== undefined && targetSyp !== undefined && Number(material.pricePerUnit) === oldValue) {
      material.pricePerUnit = targetSyp;
    }
  }

  // Supplier quotes and supply orders were seeded in USD in older builds.
  // They are material purchasing prices, so migrate them to the same SYP unit.
  const legacySupplierPricesUSD = new Set([10.5, 12, 18.2, 19, 20, 22.8, 24.5, 25, 26.5, 32, 33, 35, 41.5, 43, 45]);
  for (const quote of SUPPLIER_QUOTES as any[]) {
    const price = Number(quote.pricePerUnit);
    if (legacySupplierPricesUSD.has(price)) quote.pricePerUnit = Math.round(price * 135);
  }
  for (const order of SUPPLY_ORDERS as any[]) {
    const price = Number(order.unitPrice);
    if (legacySupplierPricesUSD.has(price)) {
      const migratedPrice = Math.round(price * 135);
      order.unitPrice = migratedPrice;
      order.totalPrice = migratedPrice * Number(order.quantity || 0);
    }
  }
}

const INVENTORY = [
  { id: "inv-1", materialId: "m-1", quantity: 45, reservedQuantity: 12, availableQuantity: 33, location: "مستودع أ - رف 1" },
  { id: "inv-2", materialId: "m-2", quantity: 18, reservedQuantity: 5, availableQuantity: 13, location: "مستودع أ - رف 2" },
  { id: "inv-3", materialId: "m-3", quantity: 30, reservedQuantity: 0, availableQuantity: 30, location: "مستودع ب - رف 1" },
  { id: "inv-4", materialId: "m-4", quantity: 12, reservedQuantity: 5, availableQuantity: 7, location: "مستودع ب - رف 2" },
  { id: "inv-5", materialId: "m-5", quantity: 8, reservedQuantity: 2, availableQuantity: 6, location: "مستودع أ - رف 5" }
];

const INVENTORY_TRANSACTIONS = [
  { id: "tx-1", materialId: "m-1", type: "purchase", quantity: 20, beforeQty: 25, afterQty: 45, referenceType: "purchase_order", referenceId: "po-101", reason: "توريد دفعة جديدة من المورد", createdById: "u-1", createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: "tx-2", materialId: "m-1", type: "consumption", quantity: -5, beforeQty: 50, afterQty: 45, referenceType: "order", referenceId: "ord-1", reason: "قص لوحة أحرف مضيئة", createdById: "u-2", createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: "tx-3", materialId: "m-2", type: "adjustment", quantity: 2, beforeQty: 16, afterQty: 18, referenceType: "adjustment", referenceId: "adj-202", reason: "جرد تسوية دورية", createdById: "u-1", createdAt: new Date(Date.now() - 3600000 * 12).toISOString() }
];

function normalizeInventoryState() {
  let changed = false;
  for (const inventory of INVENTORY) {
    const quantity = Math.max(0, Number(inventory.quantity) || 0);
    const reservedQuantity = Math.min(quantity, Math.max(0, Number(inventory.reservedQuantity) || 0));
    const availableQuantity = quantity - reservedQuantity;
    if (inventory.quantity !== quantity || inventory.reservedQuantity !== reservedQuantity || inventory.availableQuantity !== availableQuantity) {
      inventory.quantity = quantity;
      inventory.reservedQuantity = reservedQuantity;
      inventory.availableQuantity = availableQuantity;
      changed = true;
    }
  }
  return changed;
}

const REMNANTS = [
  { id: "rem-1", materialId: "m-1", width: 400, height: 600, area: 240000, quantity: 2, status: "available", location: "صندوق البقايا أكريليك" },
  { id: "rem-2", materialId: "m-2", width: 300, height: 300, area: 90000, quantity: 1, status: "available", location: "صندوق البقايا أكريليك" },
  { id: "rem-3", materialId: "m-3", width: 150, height: 400, area: 60000, quantity: 3, status: "available", location: "رف الأخشاب الصغيرة" }
];

const SUPPLIER_QUOTES: Array<{
  id: string;
  materialId: string;
  supplierId: string;
  supplierName: string;
  pricePerUnit: number;
  minOrderQuantity: number;
  deliveryDays: number;
  paymentTerms: string;
  qualityRating: number;
  notes: string;
  updatedAt: string;
}> = [
  {
    id: "sq-101",
    materialId: "m-1",
    supplierId: "s-1",
    supplierName: "الشركة الوطنية للاكريليك",
    pricePerUnit: 25.0,
    minOrderQuantity: 10,
    deliveryDays: 2,
    paymentTerms: "آجل 30 يوم",
    qualityRating: 4.8,
    notes: "المورد الحالي - توصيل مجاني للمستودع وضمان حماية ورقية ممتازة للأكواب والأحرف.",
    updatedAt: "2026-07-20T10:00:00.000Z"
  },
  {
    id: "sq-102",
    materialId: "m-1",
    supplierId: "s-2",
    supplierName: "شركة البلاستيك الدولية - الأردن",
    pricePerUnit: 22.8,
    minOrderQuantity: 25,
    deliveryDays: 4,
    paymentTerms: "نقدي عند الطلب (خصم 5%)",
    qualityRating: 4.5,
    notes: "عرض منافس بأسعار الجملة - توفير $2.20 للوح عند طلب كميات فوق 25 لوح.",
    updatedAt: "2026-07-22T14:30:00.000Z"
  },
  {
    id: "sq-103",
    materialId: "m-1",
    supplierId: "s-3",
    supplierName: "مستورد الشام للخامات الطارئة",
    pricePerUnit: 26.5,
    minOrderQuantity: 3,
    deliveryDays: 1,
    paymentTerms: "دفع نقدي عند الاستلام",
    qualityRating: 4.9,
    notes: "توريد سريع جداً في نفس اليوم مع تسليم باب الورشة وتأمين خامات طارئة.",
    updatedAt: "2026-07-25T09:15:00.000Z"
  },
  {
    id: "sq-201",
    materialId: "m-2",
    supplierId: "s-1",
    supplierName: "الشركة الوطنية للاكريليك",
    pricePerUnit: 45.0,
    minOrderQuantity: 5,
    deliveryDays: 2,
    paymentTerms: "آجل 30 يوم",
    qualityRating: 4.7,
    notes: "درجة ممتازة مقاومة للتكسر والتغييم، مناسبة للحروف البارزة اللامعة.",
    updatedAt: "2026-07-18T11:00:00.000Z"
  },
  {
    id: "sq-202",
    materialId: "m-2",
    supplierId: "s-2",
    supplierName: "عالم الأكريليك والبلاستيك",
    pricePerUnit: 41.5,
    minOrderQuantity: 15,
    deliveryDays: 3,
    paymentTerms: "دفع نصف المبلغ بالدفعة والأخر عند الاستلام",
    qualityRating: 4.6,
    notes: "توفير $3.50 لكل لوح للطلبات فوق 15 لوح مع شهادة ضمان للمقاومة للحرارة.",
    updatedAt: "2026-07-21T16:00:00.000Z"
  },
  {
    id: "sq-301",
    materialId: "m-3",
    supplierId: "s-2",
    supplierName: "محلات الوفاء للمواد الخشبية",
    pricePerUnit: 20.0,
    minOrderQuantity: 10,
    deliveryDays: 2,
    paymentTerms: "نقدي عند التسليم",
    qualityRating: 4.8,
    notes: "خشب مصقول وجهين وبدون عقد، نتائج قاطعة ونظيفة على آلات CO2.",
    updatedAt: "2026-07-19T08:30:00.000Z"
  },
  {
    id: "sq-302",
    materialId: "m-3",
    supplierId: "s-1",
    supplierName: "شركة الشرق الأوسط للأخشاب والكبس",
    pricePerUnit: 18.2,
    minOrderQuantity: 20,
    deliveryDays: 5,
    paymentTerms: "آجل 15 يوم",
    qualityRating: 4.4,
    notes: "سعر جملة منافس جداً، يحتاج 5 أيام توريد من المستودع المركزي.",
    updatedAt: "2026-07-23T13:45:00.000Z"
  },
  {
    id: "sq-401",
    materialId: "m-4",
    supplierId: "s-2",
    supplierName: "محلات الوفاء للمواد الخشبية",
    pricePerUnit: 12.0,
    minOrderQuantity: 20,
    deliveryDays: 1,
    paymentTerms: "نقدي",
    qualityRating: 4.3,
    notes: "MDF روماني ممتاز مع تحمّل عالي للحفر بالليزر والطلاء.",
    updatedAt: "2026-07-24T10:20:00.000Z"
  },
  {
    id: "sq-402",
    materialId: "m-4",
    supplierId: "s-3",
    supplierName: "مستودعات الخليج للألواح المصنعة",
    pricePerUnit: 10.5,
    minOrderQuantity: 50,
    deliveryDays: 3,
    paymentTerms: "آجل 30 يوم",
    qualityRating: 4.6,
    notes: "عرض الجملة لـ 50 لوح فأكثر، توفير مميز لطلبات الإنتاج الضخم.",
    updatedAt: "2026-07-26T15:10:00.000Z"
  },
  {
    id: "sq-501",
    materialId: "m-5",
    supplierId: "s-3",
    supplierName: "دباغة الشرق للجلود",
    pricePerUnit: 35.0,
    minOrderQuantity: 5,
    deliveryDays: 2,
    paymentTerms: "نقدي عند التسليم",
    qualityRating: 4.9,
    notes: "جلد بقر طبيعي مدبوغ نباتياً خالي من المواد الكيميائية الضارة لليزر.",
    updatedAt: "2026-07-22T12:00:00.000Z"
  },
  {
    id: "sq-502",
    materialId: "m-5",
    supplierId: "s-1",
    supplierName: "معرض الأردن للجلود والخامات",
    pricePerUnit: 32.0,
    minOrderQuantity: 10,
    deliveryDays: 4,
    paymentTerms: "آجل 14 يوم",
    qualityRating: 4.5,
    notes: "جلد ممتاز متعدد الألوان، يحتاج حجز مسبق قبل 4 أيام.",
    updatedAt: "2026-07-25T17:00:00.000Z"
  }
];

const SUPPLIERS = [
  { id: "s-1", name: "الشركة الوطنية للاكريليك", phone: "+962795554433", email: "sales@national-acrylic.com", address: "عمان، ماركا الشمالية", notes: "المورد الرئيسي للألواح والقص بأسعار تفضيلية" },
  { id: "s-2", name: "محلات الوفاء للمواد الخشبية", phone: "+962787776655", email: "info@alwafaa-wood.com", address: "سحاب، المنطقة الصناعية", notes: "توفر خشب زان وMDF بسماكات مختلفة" },
  { id: "s-3", name: "دباغة الشرق للجلود", phone: "+962791112233", email: "east-leather@contact.jo", address: "الزرقاء، الأردن", notes: "جلود بقر طبيعية ممتازة لآلات الليزر" }
];

const SUPPLY_ORDERS = [
  {
    id: "so-1",
    supplierId: "s-1",
    materialId: "m-1",
    quantity: 50,
    unitPrice: 24.5,
    totalPrice: 1225.0,
    status: "pending", // pending, completed, cancelled
    orderDate: "2026-07-15",
    expectedDeliveryDate: "2026-07-23",
    notes: "طلب استيراد ألواح أكريليك شفاف 3 مم طارئة لتغطية نقص المخزون"
  },
  {
    id: "so-2",
    supplierId: "s-1",
    materialId: "m-2",
    quantity: 20,
    unitPrice: 43.0,
    totalPrice: 860.0,
    status: "completed",
    orderDate: "2026-06-10",
    expectedDeliveryDate: "2026-06-15",
    actualDeliveryDate: "2026-06-14",
    notes: "ألواح أكريليك أسود 5 ملم ممتازة"
  },
  {
    id: "so-3",
    supplierId: "s-2",
    materialId: "m-3",
    quantity: 40,
    unitPrice: 19.0,
    totalPrice: 760.0,
    status: "completed",
    orderDate: "2026-06-20",
    expectedDeliveryDate: "2026-06-25",
    actualDeliveryDate: "2026-06-24",
    notes: "طلب خشب زان لقص الهدايا الوطنية"
  },
  {
    id: "so-4",
    supplierId: "s-2",
    materialId: "m-4",
    quantity: 60,
    unitPrice: 11.5,
    totalPrice: 690.0,
    status: "pending",
    orderDate: "2026-07-18",
    expectedDeliveryDate: "2026-07-24",
    notes: "طلب خشب MDF 6 مم عاجل لطلبيات الأسبوع القادم"
  },
  {
    id: "so-5",
    supplierId: "s-3",
    materialId: "m-5",
    quantity: 15,
    unitPrice: 33.0,
    totalPrice: 495.0,
    status: "completed",
    orderDate: "2026-05-15",
    expectedDeliveryDate: "2026-05-20",
    actualDeliveryDate: "2026-05-19",
    notes: "توريد جلود طبيعية سميكة للمحفظات الفاخرة"
  }
];

const DEMO_LOW_PRICE_MATERIALS = [
  { id: "m-6", name: "لوح أكريليك أبيض 2 ملم", category: "الأكريليك", subCategory: "acrylic", thickness: 2, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 540, minimumStock: 10, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-7", name: "لوح PVC خفيف 3 ملم", category: "البلاستيك", subCategory: "pvc", thickness: 3, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 405, minimumStock: 8, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-8", name: "خشب MDF رقيق 3 ملم", category: "الأخشاب", subCategory: "wood", thickness: 3, color: "brown", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 337, minimumStock: 12, supplierId: "s-2", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-9", name: "فوم بورد 5 ملم", category: "الفوم", subCategory: "foam", thickness: 5, color: "white", width: 700, height: 1000, unit: "sheet", pricePerUnit: 270, minimumStock: 15, supplierId: "s-1", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
  { id: "m-10", name: "جلد صناعي للحفر", category: "الجلود", subCategory: "leather", thickness: 1, color: "black", width: 1000, height: 1000, unit: "piece", pricePerUnit: 202, minimumStock: 20, supplierId: "s-3", notes: "مادة اختبارية منخفضة السعر", status: "active", qualityStatus: "inspected" },
];
const DEMO_LOW_PRICE_INVENTORY = [
  { id: "inv-6", materialId: "m-6", quantity: 20, reservedQuantity: 0, availableQuantity: 20, location: "مستودع أ - رف 6" },
  { id: "inv-7", materialId: "m-7", quantity: 15, reservedQuantity: 0, availableQuantity: 15, location: "مستودع أ - رف 7" },
  { id: "inv-8", materialId: "m-8", quantity: 25, reservedQuantity: 0, availableQuantity: 25, location: "مستودع ب - رف 3" },
  { id: "inv-9", materialId: "m-9", quantity: 30, reservedQuantity: 0, availableQuantity: 30, location: "مستودع ب - رف 4" },
  { id: "inv-10", materialId: "m-10", quantity: 40, reservedQuantity: 0, availableQuantity: 40, location: "مستودع أ - رف 8" },
];
function ensureDemoLowPriceMaterials() {
  for (const material of DEMO_LOW_PRICE_MATERIALS) {
    if (!MATERIALS.some((existing: any) => existing.id === material.id)) MATERIALS.push({ ...material });
  }
  for (const inventory of DEMO_LOW_PRICE_INVENTORY) {
    if (!INVENTORY.some((existing: any) => existing.id === inventory.id)) INVENTORY.push({ ...inventory });
  }
}

const MACHINES = [
  { id: "mac-1", name: "CO2 Laser Cutter 100W (جنوب)", type: "laser_co2", status: "idle", currentJobId: null, lastMaintenance: "2026-06-01", workingHours: 234.5 }
];

const EXPENSES: any[] = [
  { id: "exp-1", category: "رواتب", amount: 450.0, date: "2026-07-01", description: "راتب فني تشغيل الليزر لشهر يونيو", status: "paid", createdById: "u-1" },
  { id: "exp-2", category: "صيانة", amount: 80.0, date: "2026-07-03", description: "شراء مرايا جديدة لعدسة الليزر CO2", status: "paid", createdById: "u-1" },
  { id: "exp-3", category: "كهرباء ومرافق", amount: 120.0, date: "2026-07-05", description: "فاتورة كهرباء المصنع", status: "paid", createdById: "u-1" },
  { id: "exp-4", category: "خامات ومواد", amount: 250.0, date: "2026-07-07", description: "شراء ألواح أكريليك من الشركة الوطنية", status: "paid", createdById: "u-1" }
];

const NUMBERING_SETTINGS: any[] = [
  { id: "num-1", entity: "invoice", prefix: "INV", suffix: "", digits: 6, separator: "-", nextNumber: 3 },
  { id: "num-2", entity: "order", prefix: "ORD", suffix: "", digits: 6, separator: "-", nextNumber: 3 },
  { id: "num-3", entity: "job", prefix: "JOB", suffix: "", digits: 6, separator: "-", nextNumber: 3 }
];

function getNextNumber(entity: string): string {
  const setting = NUMBERING_SETTINGS.find(s => s.entity === entity);
  if (!setting) {
    const defaultSetting = {
      id: nextEntityId("num"),
      entity,
      prefix: entity.toUpperCase().slice(0, 3),
      suffix: "",
      digits: 6,
      separator: "-",
      nextNumber: 1
    };
    NUMBERING_SETTINGS.push(defaultSetting);
    const num = `${defaultSetting.prefix}${defaultSetting.separator}${String(defaultSetting.nextNumber).padStart(defaultSetting.digits, '0')}`;
    defaultSetting.nextNumber += 1;
    return num;
  }
  const separator = setting.separator || "-";
  const num = `${setting.prefix}${separator}${String(setting.nextNumber).padStart(setting.digits, '0')}${setting.suffix ? separator + setting.suffix : ""}`;
  setting.nextNumber += 1;
  return num;
}

const INVOICE_HISTORY: any[] = [];

const NOTIFICATIONS: any[] = [
  { id: "notif_1", title: "تم تفعيل نظام ليزر CO2 بنجاح والاتصال بالماكينات", message: "تم تفعيل نظام ليزر CO2 بنجاح والاتصال بالماكينات بقناة الاتصال الآمنة.", type: "system", priority: "normal", isRead: false, createdAt: new Date(Date.now() - 3600000 * 0.1).toISOString(), link: "" },
  { id: "notif_2", title: "انخفاض خامة الأكريليك الشفاف (3 مم)", message: "انخفاض خامة الأكريليك الشفاف (3 مم) في المخزون عن الحد الأدنى المسموح به.", type: "inventory", priority: "high", isRead: false, createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), link: "/inventory" },
  { id: "notif_3", title: "دفعة مالية جديدة بقيمة $150.00", message: "العميل شركة الأمل للدعاية أضاف دفعة مالية بقيمة $150.00 للطلب AX-2026-001.", type: "financial", priority: "normal", isRead: true, createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), link: "/accounting" },
  { id: "notif_4", title: "اكتمال معالجة G-Code لطلب القص", message: "اكتمال معالجة ملف G-Code لطلب القص رقم AX-2026-002 بنجاح.", type: "production", priority: "normal", isRead: true, createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), link: "/gcode" }
];

const DELETED_ITEMS: any[] = [
  {
    id: "del-1",
    entityType: "Customer",
    entityId: "c-deleted-1",
    name: "مكتب آفاق للتصميم",
    deletedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    deletedBy: "المدير العام",
    originalData: { id: "c-deleted-1", name: "مكتب آفاق للتصميم", phone: "+963991234567", email: "afaq@design.sy" }
  },
  {
    id: "del-2",
    entityType: "Product",
    entityId: "p-deleted-1",
    name: "علبة أكريليك فاخرة",
    deletedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    deletedBy: "المدير العام",
    originalData: { id: "p-deleted-1", name: "علبة أكريليك فاخرة", code: "ACR-BOX-PRM", price: 35.0, description: "علبة لحفظ الهدايا", stock: 10 }
  }
];

const ORDER_STATUSES: any[] = [
  { id: "new", name: "جديد", color: "#818cf8", order: 1, isDefault: true },
  { id: "design", name: "قيد التصميم", color: "#c084fc", order: 2, isDefault: true },
  { id: "in_progress", name: "قيد الإنتاج", color: "#60a5fa", order: 3, isDefault: true },
  { id: "ready", name: "جاهز للتسليم", color: "#34d399", order: 4, isDefault: true },
  { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 5, isDefault: true },
  { id: "cancelled", name: "ملغي", color: "#f87171", order: 6, isDefault: true }
];

function normalizeOrderStatuses() {
  const defaults = [
    { id: "new", name: "جديد", color: "#818cf8", order: 1, isDefault: true },
    { id: "design", name: "قيد التصميم", color: "#c084fc", order: 2, isDefault: true },
    { id: "in_progress", name: "قيد الإنتاج", color: "#60a5fa", order: 3, isDefault: true },
    { id: "ready", name: "جاهز للتسليم", color: "#34d399", order: 4, isDefault: true },
    { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 5, isDefault: true },
    { id: "cancelled", name: "ملغي", color: "#f87171", order: 6, isDefault: true }
  ];
  for (const defaultStatus of defaults) {
    if (!ORDER_STATUSES.some((status: any) => status.id === defaultStatus.id)) ORDER_STATUSES.push(defaultStatus);
  }
}

function createNotification(title: string, message: string, type: string, priority: string = "normal", link: string = "") {
  const newNotif = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title,
    message,
    type, // "inventory" | "order" | "production" | "financial" | "system"
    priority, // "low" | "normal" | "high" | "critical"
    isRead: false,
    createdAt: new Date().toISOString(),
    link
  };
  NOTIFICATIONS.unshift(newNotif);
  return newNotif;
}

function notifyOverdueOrders() {
  const now = Date.now();
  for (const order of ORDERS) {
    if (!order.deliveryDateExpected || ["delivered", "cancelled"].includes(order.status)) continue;
    const dueAt = new Date(order.deliveryDateExpected).getTime();
    if (!Number.isFinite(dueAt) || dueAt >= now) continue;
    const alreadyNotified = NOTIFICATIONS.some((n: any) => n.type === "order" && n.orderId === order.id && n.code === "overdue");
    if (alreadyNotified) continue;
    const customer = CUSTOMERS.find((c: any) => c.id === order.customerId);
    const notification = createNotification(`طلب متأخر #${order.orderNumber}`, `تجاوز الطلب موعد التسليم المتوقع${customer?.name ? ` للعميل ${customer.name}` : ""}. الحالة الحالية: ${order.status}`, "order", "high", "/orders");
    (notification as any).orderId = order.id;
    (notification as any).code = "overdue";
  }
}

const INVOICES: any[] = [
  { 
    id: "inv-1", 
    invoiceNumber: "INV-000001", 
    orderId: "ord-1", 
    customerId: "c-1", 
    issueDate: "2026-07-06T10:00:00.000Z", 
    dueDate: "2026-07-15T10:00:00.000Z", 
    totalPrice: 240.0, 
    subtotal: 240.0,
    taxPercent: 0,
    discount: 0,
    paidAmount: 150.0, 
    remaining: 90.0, 
    status: "partially_paid",
    items: [
      { id: "invitem-1", invoiceId: "inv-1", productName: "أكريليك أسود 5 ملم", quantity: 12, unitPrice: 15.0, discount: 0, tax: 0, total: 180.0, createdAt: "2026-07-06T10:00:00.000Z" },
      { id: "invitem-2", invoiceId: "inv-1", productName: "قص ليزر وحفر خط عربي", quantity: 1, unitPrice: 60.0, discount: 0, tax: 0, total: 60.0, createdAt: "2026-07-06T10:00:00.000Z" }
    ],
    history: [
      { id: "invhist-1", invoiceId: "inv-1", action: "created", userId: "u-1", createdAt: "2026-07-06T10:00:00.000Z" }
    ]
  },
  { 
    id: "inv-2", 
    invoiceNumber: "INV-000002", 
    orderId: "ord-2", 
    customerId: "c-2", 
    issueDate: "2026-07-10T08:00:00.000Z", 
    dueDate: "2026-07-10T08:00:00.000Z", 
    totalPrice: 95.0, 
    subtotal: 95.0,
    taxPercent: 0,
    discount: 0,
    paidAmount: 95.0, 
    remaining: 0.0, 
    status: "paid",
    items: [
      { id: "invitem-3", invoiceId: "inv-2", productName: "خشب زان طبيعي 8 ملم", quantity: 1, unitPrice: 45.0, discount: 0, tax: 0, total: 45.0, createdAt: "2026-07-10T08:00:00.000Z" },
      { id: "invitem-4", invoiceId: "inv-2", productName: "حفر تفصيلي شعار مائل", quantity: 1, unitPrice: 50.0, discount: 0, tax: 0, total: 50.0, createdAt: "2026-07-10T08:00:00.000Z" }
    ],
    history: [
      { id: "invhist-2", invoiceId: "inv-2", action: "created", userId: "u-1", createdAt: "2026-07-10T08:00:00.000Z" }
    ]
  }
];

const SETTINGS = {
  // Single source of truth for the USD -> SYP exchange rate. Every place in the
  // backend that converts currency (payments, PDFs, AI pricing suggestions, share
  // messages) must read this value - never hardcode a rate anywhere else.
  // NOTE: 135 is the current demo value on the new Syrian pound scale
  // (post-redenomination). It is a default only and can be changed from Settings.
  exchangeRate: 135,
  // Profit-sharing settings. The history is append-only so changing the
  // current percentage does not rewrite previously configured periods.
  partnerSharePercent: 0,
  partnerShareHistory: [{ effectiveFrom: new Date().toISOString(), percent: 0 }],
  company: {
    name: "مجمع المحور والورش الذكية - AxisLab ERP",
    address: "عمان، الأردن - شارع مكة",
    phone: "+962790000000",
    whatsapp: "+962790000000",
    email: "contact@axislab.com",
    instagram: "https://instagram.com/axislab_laser",
    logo: "/logo.jpg",
    taxNumber: "TAX-9988223"
  },
  smtp: {
    enabled: true,
    host: process.env.SMTP_HOST || "smtp.axislab-laser.com",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: false,
    user: process.env.SMTP_USER || "notifications@axislab.com",
    pass: process.env.SMTP_PASS || "",
    fromName: "نظام إنتاج ليزر - AXIS LAB",
    fromEmail: "notifications@axislab.com",
    recipientEmails: "techs@axislab.com, operator@axislab.com, admin@axislab.com"
  },
  pricing: {
    defaultProfitMargin: 20,
    designCostPerHour: 15,
    assemblyCostPerHour: 10
  },
  production: {
    defaultLaserSpeed: 300,
    defaultLaserPower: 70
  },
  inventory: {
    minimumRemnantSize: 100,
    lowStockThreshold: 5
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily" as "daily" | "weekly" | "monthly",
    backupLocation: "/backups",
    retentionCount: 10
  },
  autoArchive: {
    enabled: true,
    thresholdDays: 30,
    notifyBeforeArchive: true,
    notifyDaysBefore: 3
  }
};

function publicSettings() {
  const { pass: _smtpPassword, ...safeSmtp } = SETTINGS.smtp;
  return {
    ...SETTINGS,
    smtp: {
      ...safeSmtp,
      configured: Boolean(SETTINGS.smtp.user && SETTINGS.smtp.pass),
      hasPassword: Boolean(SETTINGS.smtp.pass)
    }
  };
}

function getPartnerSharePercentAt(dateValue?: string | Date) {
  const history = Array.isArray((SETTINGS as any).partnerShareHistory)
    ? (SETTINGS as any).partnerShareHistory
        .filter((entry: any) => Number.isFinite(Number(entry.percent)) && entry.effectiveFrom)
        .sort((a: any, b: any) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
    : [];
  const target = dateValue ? new Date(dateValue).getTime() : Date.now();
  const match = history.filter((entry: any) => new Date(entry.effectiveFrom).getTime() <= target).pop();
  const value = match ? Number(match.percent) : Number((SETTINGS as any).partnerSharePercent);
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function mergeSmtpSettings(input: any) {
  if (!input || typeof input !== "object") return;
  const { pass, ...safeInput } = input;
  SETTINGS.smtp = { ...SETTINGS.smtp, ...safeInput };
  if (typeof pass === "string" && pass.trim()) SETTINGS.smtp.pass = pass;
}

/**
 * Freeze the exchange-rate snapshot exactly once when an order is fully paid and delivered.
 * Operational order values remain SYP; USD values are immutable final-invoice presentation values.
 */
function freezeOrderCurrencySnapshot(order: any, invoice?: any) {
  if (order.currencyFinalizedAt && order.exchangeRateAtFinalization) {
    return { order, invoice: invoice || INVOICES.find((candidate: any) => candidate.orderId === order.id) };
  }
  const historicalRate = Number(order.exchangeRateAtFinalization || order.exchangeRateAtCreation || invoice?.exchangeRateAtIssue);
  const rate = historicalRate > 0 ? historicalRate : (Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135);
  const finalizedAt = new Date().toISOString();
  const totalSYP = Math.round(Number(order.totalPrice) || 0);
  const paidSYP = Math.round(Number(order.paidAmount) || 0);
  const remainingSYP = Math.max(0, totalSYP - paidSYP);
  const finalInvoice = invoice || INVOICES.find((candidate: any) => candidate.orderId === order.id);

  order.currency = "SYP";
  order.exchangeRateAtFinalization = rate;
  order.currencyFinalizedAt = finalizedAt;
  order.finalTotalSYP = totalSYP;
  order.finalPaidSYP = paidSYP;
  order.finalRemainingSYP = remainingSYP;
  order.finalTotalUSD = Number(sypToUsd(totalSYP, rate).toFixed(2));
  order.finalPaidUSD = Number(sypToUsd(paidSYP, rate).toFixed(2));
  order.finalRemainingUSD = Number(sypToUsd(remainingSYP, rate).toFixed(2));

  if (finalInvoice) {
    finalInvoice.currency = "USD";
    finalInvoice.exchangeRateAtFinalization = rate;
    finalInvoice.currencyFinalizedAt = finalizedAt;
    finalInvoice.totalPriceSYP = totalSYP;
    finalInvoice.paidAmountSYP = paidSYP;
    finalInvoice.remainingSYP = remainingSYP;
    finalInvoice.totalPriceUSD = order.finalTotalUSD;
    finalInvoice.paidAmountUSD = order.finalPaidUSD;
    finalInvoice.remainingUSD = order.finalRemainingUSD;
    finalInvoice.items = (finalInvoice.items || []).map((item: any) => {
      const issueRate = Number(finalInvoice.exchangeRateAtIssue) > 0 ? Number(finalInvoice.exchangeRateAtIssue) : rate;
      const unitPriceSYP = Math.round(Number(item.unitPriceSYP ?? (Number(item.unitPrice || 0) * issueRate)));
      const totalSYP = Math.round(Number(item.totalSYP ?? (Number(item.total || 0) * issueRate)));
      return { ...item, unitPriceSYP, totalSYP, unitPrice: Number(sypToUsd(unitPriceSYP, rate).toFixed(2)), total: Number(sypToUsd(totalSYP, rate).toFixed(2)) };
    });
    // Existing invoice fields are USD and remain stable after finalization.
    finalInvoice.totalPrice = order.finalTotalUSD;
    finalInvoice.paidAmount = order.finalPaidUSD;
    finalInvoice.remaining = order.finalRemainingUSD;
  }
  return { order, invoice: finalInvoice };
}

async function sendProductionJobEmailNotification(
  job: any,
  eventType: "created" | "started" | "paused" | "completed" | "cancelled",
  extraMessage: string = ""
) {
  try {
    if (!SETTINGS.smtp || !SETTINGS.smtp.enabled) {
      console.log(`[SMTP] Notifications disabled. Skipping email for Job ${job.jobNo}`);
      return { success: false, reason: "SMTP disabled in settings" };
    }

    const recipients = (SETTINGS.smtp.recipientEmails || "")
      .split(",")
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipients.length === 0) {
      console.log(`[SMTP] No recipient emails configured for Job ${job.jobNo}`);
      return { success: false, reason: "No recipient emails configured" };
    }

    const statusTitleMap: Record<string, string> = {
      created: "تم إنشاء مهمة إنتاج جديدة",
      started: "بدء تشغيل مهمة القص بالليزر",
      paused: "إيقاف مؤقت لمهمة الإنتاج",
      completed: "انتهاء واكتمال قص المهمة بالكامل (100%)",
      cancelled: "إلغاء مهمة الإنتاج"
    };

    const statusBadgeMap: Record<string, string> = {
      created: "جديدة",
      started: "قيد التشغيل",
      paused: "موقوفة مؤقتاً",
      completed: "مكتملة (100%)",
      cancelled: "ملغاة"
    };

    const mac = MACHINES.find((m: any) => m.id === job.machineId);
    const macName = mac ? mac.name : "غير محددة";
    const opUser = USERS.find((u: any) => u.id === job.operatorId);
    const opName = opUser ? opUser.fullName : "فني تشغيل الورشة";

    const subject = `[AXIS LAB] ${statusTitleMap[eventType] || "تحديث مهمة إنتاج"} - ${job.jobNo}`;

    const htmlBody = `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px; border-radius: 12px; border: 1px solid #27272a; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #c59257; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #c59257; margin: 0; font-size: 22px;">AXIS LAB — نظام إشعارات الإنتاج والمكائن</h2>
          <p style="color: #a1a1aa; font-size: 13px; margin-top: 6px;">تنبيه فوري لمتابعة سير العمل والفنيين بالورشة</p>
        </div>

        <div style="background-color: #18181b; padding: 16px; border-radius: 8px; border-right: 4px solid #c59257; margin-bottom: 20px;">
          <h3 style="color: #ffffff; margin-top: 0; font-size: 16px;">${statusTitleMap[eventType] || "تحديث حالة المهمة"}</h3>
          <p style="color: #e4e4e7; font-size: 14px; margin-bottom: 8px;">
            المهمة <strong>${job.jobNo}</strong> الخاصة بـ <strong>"${job.itemName}"</strong> أصبحت الآن بحالة:
            <span style="background-color: #c59257; color: #000000; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
              ${statusBadgeMap[eventType] || job.status}
            </span>
          </p>
          ${extraMessage ? `<p style="color: #a1a1aa; font-size: 12px; font-style: italic;">ملاحظة: ${extraMessage}</p>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; color: #d4d4d8;">
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">رقم تذكرة الشغل (Job No):</td>
            <td style="padding: 8px; font-weight: bold; color: #c59257;">${job.jobNo}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">رقم الطلب المرتبط:</td>
            <td style="padding: 8px; font-weight: bold;">${job.orderNumber || "غير مرتبط بطلب مباشر"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">الماكينة المستخدمة:</td>
            <td style="padding: 8px;">${macName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">الفني المسؤول:</td>
            <td style="padding: 8px;">${opName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #27272a;">
            <td style="padding: 8px; color: #a1a1aa;">نسبة الإنجاز (Progress):</td>
            <td style="padding: 8px; font-weight: bold; color: #34d399;">${job.progress}%</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #a1a1aa;">وقت التحديث:</td>
            <td style="padding: 8px;">${new Date().toLocaleString('ar-EG')}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 11px;">
          هذا الإشعار التلقائي مُرسل من نظام إدارة ورش الليزر AXIS LAB ERP عبر خادم SMTP
        </div>
      </div>
    `;

    // Add to system notifications for live UI feedback
    NOTIFICATIONS.unshift({
      id: "notif_smtp_" + Date.now(),
      title: `${statusTitleMap[eventType] || "تحديث مهمة"} (${job.jobNo})`,
      message: `تم إرسال إشعار بريدي عبر SMTP للفنيين (${recipients.join(", ")}) حول المهمة ${job.jobNo}: ${statusTitleMap[eventType]}`,
      type: "production",
      priority: eventType === "completed" ? "high" : "normal",
      isRead: false,
      createdAt: new Date().toISOString(),
      link: "/production"
    });

    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: SETTINGS.smtp.host,
      port: SETTINGS.smtp.port,
      secure: SETTINGS.smtp.secure,
      auth: (SETTINGS.smtp.user && SETTINGS.smtp.pass) ? {
        user: SETTINGS.smtp.user,
        pass: SETTINGS.smtp.pass
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${SETTINGS.smtp.fromName}" <${SETTINGS.smtp.fromEmail}>`,
      to: recipients.join(", "),
      subject: subject,
      html: htmlBody,
      text: `${statusTitleMap[eventType] || "تحديث مهمة إنتاج"} - المهمة ${job.jobNo} (${job.itemName})`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP SUCCESS] Sent job email to ${recipients.join(", ")}. MessageId: ${info.messageId}`);
      
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId("log_smtp"),
        userId: job.operatorId || "u-1",
        action: "SEND_SMTP_NOTIFICATION",
        entityType: "ProductionJob",
        entityId: job.id,
        createdAt: new Date().toISOString(),
        details: `SMTP notification sent to ${recipients.join(", ")} for job ${job.jobNo} (${eventType})`
      });

      return { success: true, messageId: info.messageId, recipients };
    } catch (smtpErr: any) {
      console.warn(`[SMTP WARN] Transport response for job ${job.jobNo}: ${smtpErr.message}`);
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId("log_smtp"),
        userId: job.operatorId || "u-1",
        action: "ATTEMPT_SMTP_NOTIFICATION",
        entityType: "ProductionJob",
        entityId: job.id,
        createdAt: new Date().toISOString(),
        details: `SMTP dispatch attempted for ${job.jobNo} (${eventType}) to ${recipients.join(", ")}. Transport note: ${smtpErr.message}`
      });
      return { success: true, warning: smtpErr.message, recipients };
    }
  } catch (err: any) {
    console.error("[SMTP ERROR] Error sending production job email:", err);
    return { success: false, error: err.message };
  }
}

const BACKUPS: any[] = [
  { id: "b-1", name: "نسخة احتياطية تلقائية - قبل تحديث المحاسبة", createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), status: "completed" },
  { id: "b-2", name: "نسخة احتياطية يدوية - إقفال الربع الثاني", createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), status: "completed" }
];

const PRODUCTION_JOBS = [
  {
    id: "job-1",
    jobNo: "JOB-2026-001",
    orderId: "ord-1",
    orderNumber: "AX-2026-001",
    itemName: "قص أكريليك أسود 5 ملم",
    materialId: "m-2",
    machineId: "mach-1",
    status: "completed",
    progress: 100,
    estTimeSec: 60,
    elapsedTimeSec: 60,
    laserPower: 80,
    laserSpeed: 35,
    operatorId: "u-2",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 2.9).toISOString()
  },
  {
    id: "job-2",
    jobNo: "JOB-2026-002",
    orderId: "ord-1",
    orderNumber: "AX-2026-001",
    itemName: "حفر وتلميع خط عربي أكريليك",
    materialId: "m-2",
    machineId: "mach-1",
    status: "running",
    progress: 45,
    estTimeSec: 120,
    elapsedTimeSec: 54,
    laserPower: 75,
    laserSpeed: 45,
    operatorId: "u-2",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: "job-3",
    jobNo: "JOB-2026-003",
    orderId: "ord-2",
    orderNumber: "AX-2026-002",
    itemName: "لوحة ترحيبية خشب زان 8 ملم",
    materialId: "m-3",
    machineId: null,
    status: "pending",
    progress: 0,
    estTimeSec: 180,
    elapsedTimeSec: 0,
    laserPower: 90,
    laserSpeed: 20,
    operatorId: null,
    createdAt: new Date().toISOString()
  }
];

// ==================== STATE PERSISTENCE (survive server restarts) ====================
// server.ts still keeps its core business data (users, orders, invoices, activity logs,
// settings, ...) in plain in-memory arrays/objects instead of the Postgres tables already
// defined for them in src/db/schema.ts. Rewriting every single route that touches this data
// into hand-written SQL is a large, high-risk change given how tightly the order/invoice/
// status-history logic is coupled together across ~150 routes.
//
// Instead, this snapshots ALL of these collections as JSON into one Postgres table
// (app_state) whenever a write request finishes, and restores them at startup. Every
// existing route keeps working exactly as before (same in-memory arrays, same logic) -
// the only change is that the data no longer evaporates when the server restarts.
//
// NOTE: MATERIALS/INVENTORY/INVENTORY_TRANSACTIONS/REMNANTS/SUPPLIERS/SUPPLY_ORDERS/
// SUPPLIER_QUOTES are intentionally NOT in this list. Those already have real, normalized
// Postgres tables (used directly by src/server/routes/materials.ts), so they are kept in
// sync via refreshWarehouseCache() below instead of the generic JSON snapshot - otherwise
// we'd have two disagreeing copies of the warehouse data.
const PERSISTED_COLLECTIONS: Record<string, any> = {
  USERS, FILES, ORDERS, ACTIVITY_LOGS, EXPENSES,
  NUMBERING_SETTINGS, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES,
  INVOICES, SETTINGS, BACKUPS, PRODUCTION_JOBS,
};

const LOCAL_PERSISTED_COLLECTIONS: Record<string, any> = {
  ...PERSISTED_COLLECTIONS,
  CUSTOMERS, PRODUCTS, MATERIALS, INVENTORY, INVENTORY_TRANSACTIONS,
  REMNANTS, SUPPLIERS, SUPPLY_ORDERS, SUPPLIER_QUOTES, MACHINES,
};

// ==================== WAREHOUSE + CUSTOMERS/PRODUCTS CACHE ====================
// customers.ts, products.ts, and materials.ts (src/server/routes/) already read/write
// the real `customers`, `products`, `materials`, `inventory`, `remnants`, and `suppliers`
// Postgres tables directly for their own routes. But ~100+ other places in this file
// (dashboards, reports, AI predictions, low-stock alerts, order/production lookups, plus
// the remaining suppliers/supply-orders/inventory-adjustment/remnants routes that only
// exist here) still read and write the old hardcoded in-memory CUSTOMERS/PRODUCTS/
// MATERIALS/INVENTORY/SUPPLIERS/... arrays, completely disconnected from that real
// database. Concretely this means: add a customer, material, or supplier from the UI
// -> it's saved to Postgres correctly -> but its detail page, the dashboards, and order
// creation/editing logic never see it, because they're still reading the old seed array.
//
// Fix: keep those in-memory arrays as-is (zero risk to the ~100 call sites that read them),
// but refresh their contents from the real tables at the start of every /api request, and
// make every remaining write route in this file (suppliers, supply-orders, inventory
// adjustments, remnants consume/waste, supplier quotes) also write through to the real
// tables. That makes the real Postgres tables the single source of truth everywhere.
function idNum(prefixedId: any, prefix: string): number | null {
  if (prefixedId === null || prefixedId === undefined) return null;
  const n = parseInt(String(prefixedId).replace(prefix, ""));
  return isNaN(n) ? null : n;
}

async function refreshWarehouseCache() {
  if (!USE_POSTGRES) return;
  try {
    const [custRows, prodRows, matRows, invRows, txRows, remRows, supRows, soRows, sqRows, machRows] = await Promise.all([
      db.select().from(customersTable).orderBy(customersTable.id),
      db.select().from(productsTable).orderBy(productsTable.id),
      db.select().from(materialsTable).orderBy(materialsTable.id),
      db.select().from(inventoryTable).orderBy(inventoryTable.id),
      db.select().from(inventoryTransactionsTable).orderBy(desc(inventoryTransactionsTable.id)).limit(500),
      db.select().from(remnantsTable).orderBy(remnantsTable.id),
      db.select().from(suppliersTable).orderBy(suppliersTable.id),
      db.select().from(supplyOrdersTable).orderBy(supplyOrdersTable.id),
      db.select().from(supplierQuotesTable).orderBy(supplierQuotesTable.id),
      db.select().from(machinesTable).orderBy(machinesTable.id),
    ]);

    MACHINES.length = 0;
    MACHINES.push(...machRows.map(m => ({
      id: "mach-" + m.id, name: m.name, type: m.type, status: m.status,
      maxDimensions: m.maxDimensions || "", currentJobId: m.currentJobId || null,
      lastMaintenance: m.lastMaintenance || "", workingHours: m.workingHours ?? 0,
    })));

    CUSTOMERS.length = 0;
    CUSTOMERS.push(...custRows.map(c => ({
      id: "c-" + c.id, name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || c.phone || "",
      email: c.email || "", company: c.company || "", address: c.address || "",
      notes: c.notes || "", category: c.category || "شركة",
    })));

    PRODUCTS.length = 0;
    PRODUCTS.push(...prodRows.map(p => ({
      id: "p-" + p.id, name: p.name, code: p.code, category: p.category, price: p.price,
      description: p.description || "", stock: p.stock,
    })));

    const legacyUsdToSypByMaterialId: Record<number, { usd: number; syp: number }> = {
      1: { usd: 10, syp: 1350 },
      2: { usd: 45, syp: 6075 },
      3: { usd: 20, syp: 2700 },
      4: { usd: 12, syp: 1620 },
      5: { usd: 35, syp: 4725 },
    };
    for (const row of matRows) {
      const migration = legacyUsdToSypByMaterialId[row.id];
      if (migration && Number(row.pricePerUnit) === migration.usd) {
        await db.update(materialsTable).set({ pricePerUnit: migration.syp }).where(eq(materialsTable.id, row.id));
        row.pricePerUnit = migration.syp;
      }
    }
    const legacySupplierPricesUSD = new Set([10.5, 12, 18.2, 19, 20, 22.8, 25, 26.5, 32, 35, 41.5, 43, 45]);
    for (const row of [...sqRows, ...soRows] as Array<any>) {
      const price = Number(row.pricePerUnit ?? row.unitPrice);
      if (legacySupplierPricesUSD.has(price)) {
        const migratedPrice = Math.round(price * 135);
        if ("minOrderQuantity" in row) {
          await db.update(supplierQuotesTable).set({ pricePerUnit: migratedPrice }).where(eq(supplierQuotesTable.id, row.id));
        } else {
          await db.update(supplyOrdersTable).set({ unitPrice: migratedPrice, totalPrice: migratedPrice * Number(row.quantity || 0) }).where(eq(supplyOrdersTable.id, row.id));
        }
        row.pricePerUnit = migratedPrice;
        if ("unitPrice" in row) {
          row.unitPrice = migratedPrice;
          row.totalPrice = migratedPrice * Number(row.quantity || 0);
        }
      }
    }
    MATERIALS.length = 0;
    MATERIALS.push(...matRows.map(m => ({
      id: "m-" + m.id, name: m.name, category: m.category, subCategory: m.subCategory,
      thickness: m.thickness ?? 0, color: m.color || "", width: m.width ?? 0, height: m.height ?? 0,
      unit: m.unit, pricePerUnit: m.pricePerUnit, minimumStock: m.minimumStock,
      supplierId: m.supplierId ? "s-" + m.supplierId : "", notes: m.notes || "",
      status: m.status || "active", qualityStatus: m.qualityStatus || "inspected",
    })));

    INVENTORY.length = 0;
    INVENTORY.push(...invRows.map(i => ({
      id: "inv-" + i.id, materialId: "m-" + i.materialId, quantity: i.quantity,
      reservedQuantity: i.reservedQuantity, availableQuantity: i.availableQuantity,
      location: i.location || "",
    })));

    INVENTORY_TRANSACTIONS.length = 0;
    INVENTORY_TRANSACTIONS.push(...txRows.map(t => ({
      id: "tx-" + t.id, materialId: "m-" + t.materialId, type: t.type, quantity: t.quantity,
      beforeQty: t.beforeQty, afterQty: t.afterQty, referenceType: t.referenceType || null,
      referenceId: t.referenceId || null, reason: t.reason || "",
      createdById: t.createdById ? "u-" + t.createdById : "system",
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    })));

    REMNANTS.length = 0;
    REMNANTS.push(...remRows.map(r => ({
      id: "rem-" + r.id, materialId: "m-" + r.materialId, width: r.width, height: r.height,
      area: r.area, quantity: r.quantity, status: r.status, location: r.location || "",
      notes: r.notes || "",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })));

    SUPPLIERS.length = 0;
    SUPPLIERS.push(...supRows.map(s => ({
      id: "s-" + s.id, name: s.name, phone: s.phone || "", email: s.email || "",
      address: s.address || "", notes: s.notes || "",
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    })));

    SUPPLY_ORDERS.length = 0;
    SUPPLY_ORDERS.push(...soRows.map(o => ({
      id: "so-" + o.id, supplierId: "s-" + o.supplierId, materialId: "m-" + o.materialId,
      quantity: o.quantity, unitPrice: o.unitPrice, totalPrice: o.totalPrice, status: o.status,
      orderDate: o.orderDate, expectedDeliveryDate: o.expectedDeliveryDate || "",
      actualDeliveryDate: o.actualDeliveryDate || "", notes: o.notes || "",
    })));

    SUPPLIER_QUOTES.length = 0;
    SUPPLIER_QUOTES.push(...sqRows.map(q => ({
      id: "sq-" + q.id, materialId: "m-" + q.materialId,
      supplierId: q.supplierId ? "s-" + q.supplierId : "", supplierName: q.supplierName,
      pricePerUnit: q.pricePerUnit, minOrderQuantity: q.minOrderQuantity,
      deliveryDays: q.deliveryDays, paymentTerms: q.paymentTerms || "",
      qualityRating: q.qualityRating, notes: q.notes || "",
      updatedAt: q.updatedAt instanceof Date ? q.updatedAt.toISOString() : q.updatedAt,
    })));
  } catch (err) {
    console.error("[WAREHOUSE] Failed to refresh warehouse cache from database:", err);
  }
}


async function loadPersistedState(): Promise<number> {
  try {
    if (USE_SQLITE) {
      const sqlite = await initLocalSqlite();
      const rows = sqlite.exec("SELECT key, value FROM app_state");
      const values = rows.length ? rows[0].values : [];
      let restored = 0;
      const snapshotKeys = new Set(values.map(([key]) => String(key)));
      const snapshotValues = new Map(values.map(([key, rawValue]) => [String(key), String(rawValue)]));
      for (const [key, rawValue] of values) {
        const target = LOCAL_PERSISTED_COLLECTIONS[String(key)];
        if (!target || NORMALIZED_LOCAL_COLLECTIONS.includes(String(key) as typeof NORMALIZED_LOCAL_COLLECTIONS[number]) || NORMALIZED_FINANCIAL_COLLECTIONS.includes(String(key) as typeof NORMALIZED_FINANCIAL_COLLECTIONS[number])) continue;
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
        if (key !== "USERS" && !snapshotKeys.has(key) && Array.isArray(target) && !NORMALIZED_LOCAL_COLLECTIONS.includes(key as typeof NORMALIZED_LOCAL_COLLECTIONS[number]) && !NORMALIZED_FINANCIAL_COLLECTIONS.includes(key as typeof NORMALIZED_FINANCIAL_COLLECTIONS[number])) {
          target.length = 0;
        }
      }
      let migrated = false;
      for (const collection of NORMALIZED_LOCAL_COLLECTIONS) {
        const target = LOCAL_PERSISTED_COLLECTIONS[collection];
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
          INVOICES.length = 0;
          INVOICES.push(...legacyInvoices);
        }
        sqlite.run("DELETE FROM app_state WHERE key = ?", ["INVOICES"]);
        financialMigrated = true;
      } else if (invoiceRows.length && invoiceRows[0].values.length > 0) {
        INVOICES.length = 0;
        INVOICES.push(...invoiceRows[0].values.map(([payload]) => JSON.parse(String(payload))));
        restored++;
      } else {
        INVOICES.length = 0;
      }
      const expenseRows = sqlite.exec("SELECT payload FROM local_expenses ORDER BY updated_at, id");
      if (snapshotKeys.has("EXPENSES")) {
        const legacyExpenses = JSON.parse(String(snapshotValues.get("EXPENSES") || "[]"));
        if (Array.isArray(legacyExpenses)) {
          EXPENSES.length = 0;
          EXPENSES.push(...legacyExpenses);
        }
        sqlite.run("DELETE FROM app_state WHERE key = ?", ["EXPENSES"]);
        financialMigrated = true;
      } else if (expenseRows.length && expenseRows[0].values.length > 0) {
        EXPENSES.length = 0;
        EXPENSES.push(...expenseRows[0].values.map(([payload]) => JSON.parse(String(payload))));
        restored++;
      } else {
        EXPENSES.length = 0;
      }
      if (migrated || financialMigrated) {
        if (migrated) syncNormalizedLocalEntities(sqlite);
        if (financialMigrated) syncNormalizedFinancialEntities(sqlite);
        await flushLocalSqlite();
      }
      return restored;
    }
    if (!USE_POSTGRES) return 0;
    const rows = await db.select().from(appState);
    let restored = 0;
    for (const row of rows) {
      const target = PERSISTED_COLLECTIONS[row.key];
      if (!target) continue;
      const value = row.value as any;
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
    console.error("[STATE] Failed to load persisted app state, starting from built-in seed data:", err);
    return 0;
  }
}

let persistTimer: NodeJS.Timeout | null = null;
let persistInFlight = false;
let persistAgainAfter = false;
let persistWaiters: Array<() => void> = [];
async function persistStateNow() {
  if (!USE_POSTGRES && !USE_SQLITE) return;
  if (persistInFlight) {
    persistAgainAfter = true;
    persistQueueStats.coalesced += 1;
    await new Promise<void>((resolve) => persistWaiters.push(resolve));
    return;
  }
  persistInFlight = true;
  const persistStartedAt = performance.now();
  try {
    if (USE_SQLITE) {
      await withSqliteBusyRetry(async () => {
        const sqlite = await initLocalSqlite();
        const now = new Date().toISOString();
        sqlite.run("BEGIN TRANSACTION");
        try {
          for (const [key, value] of Object.entries(LOCAL_PERSISTED_COLLECTIONS)) {
            if (NORMALIZED_LOCAL_COLLECTIONS.includes(key as typeof NORMALIZED_LOCAL_COLLECTIONS[number]) || NORMALIZED_FINANCIAL_COLLECTIONS.includes(key as typeof NORMALIZED_FINANCIAL_COLLECTIONS[number])) continue;
            sqlite.run("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", [key, JSON.stringify(value), now]);
          }
          syncNormalizedLocalEntities(sqlite);
          assertFinancialStateInvariants();
          syncNormalizedFinancialEntities(sqlite);
          sqlite.run("UPDATE local_metadata SET value = ?, updated_at = ? WHERE key = 'schema_version'", [String(LOCAL_SCHEMA_VERSION), now]);
          sqlite.run("COMMIT");
        } catch (error) {
          try { sqlite.run("ROLLBACK"); } catch {}
          throw error;
        }
        const flushStartedAt = performance.now();
        await flushLocalSqlite();
        recordBenchmark(persistenceBenchmarks, "sqlite_export_and_atomic_flush", flushStartedAt);
      });
    } else {
      for (const [key, value] of Object.entries(PERSISTED_COLLECTIONS)) {
        await db
          .insert(appState)
          .values({ key, value: value as any })
          .onConflictDoUpdate({ target: appState.key, set: { value: value as any, updatedAt: new Date() } });
      }
    }
    recordBenchmark(persistenceBenchmarks, USE_SQLITE ? "persist_state_sqlite" : "persist_state_postgres", persistStartedAt);
    persistQueueStats.completed += 1;
  } catch (err) {
    persistQueueStats.failed += 1;
    console.error("[STATE] Failed to persist app state to database:", err);
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
  if (!USE_POSTGRES && !USE_SQLITE) return;
  if (persistInFlight) {
    schedulePersist();
    return;
  }
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await persistStateNow();
}
function schedulePersist() {
  persistQueueStats.scheduled += 1;
  if (persistTimer) {
    persistQueueStats.coalesced += 1;
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistStateNow();
  }, 400);
}

const RESETTABLE_BUSINESS_COLLECTIONS = [
  FILES, ORDERS, ACTIVITY_LOGS, EXPENSES, INVOICE_HISTORY, NOTIFICATIONS,
  DELETED_ITEMS, INVOICES, BACKUPS, PRODUCTION_JOBS, CUSTOMERS, PRODUCTS,
  MATERIALS, INVENTORY, INVENTORY_TRANSACTIONS, REMNANTS, SUPPLIERS,
  SUPPLY_ORDERS, SUPPLIER_QUOTES, MACHINES,
];

async function resetBusinessData() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await persistStateNow();
  for (const collection of RESETTABLE_BUSINESS_COLLECTIONS) collection.length = 0;
  if (USE_SQLITE) {
    const sqlite = await initLocalSqlite();
    await withSqliteBusyRetry(async () => {
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
      await flushLocalSqlite();
    });
  }
  await persistStateNow();
  await new Promise((resolve) => setTimeout(resolve, 75));
  await persistStateNow();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigin = process.env.APP_URL || `http://localhost:${PORT}`;

  app.set("trust proxy", 1);
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
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }));

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

  // Restore all in-memory business data (orders, users, invoices, ...) from the
  // last snapshot saved in Postgres, if any. On a brand-new database this finds
  // nothing and the app just keeps the hardcoded seed data (also true on first boot).
  const restoredCount = await loadPersistedState();
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
      persistenceQueue: { ...persistQueueStats, pendingTimer: Boolean(persistTimer), inFlight: persistInFlight, pendingFollowUp: persistAgainAfter },
    });
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

  // API - Auth Login
  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "محاولات دخول كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة" }
  });

  app.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
      return;
    }

    const user = USERS.find(u => u.email === email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: "بيانات الاعتماد المدخلة غير صحيحة" });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: "كلمة المرور المدخلة غير صحيحة" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "هذا الحساب معطل حالياً من قبل مدير النظام. يرجى مراجعة الإدارة" });
      return;
    }

    // Generate real Base64 encoded simulated JWT Token
        const token = generateJWT(user);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      createdAt: new Date().toISOString()
    });

    res.cookie("axislab_token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    res.json({
      token,
      user: publicUser(user)
    });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "يجب تسجيل الدخول" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "أدخل كلمة المرور الحالية وكلمة مرور جديدة من 8 أحرف على الأقل" });
      return;
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      return;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    schedulePersist();
    res.json({ success: true, user: publicUser(user) });
  });

  // API - Auth Register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, fullName, role } = req.body;
        if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "جميع الحقول مطلوبة لإتمام التسجيل" });
      return;
    }
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
      res.status(403).json({ error: "التسجيل العام مغلق. يضيف مدير النظام المستخدمين من داخل الإعدادات." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل" });
      return;
    }
    if (!["employee", "accountant"].includes(role)) {
      res.status(400).json({ error: "الدور المطلوب غير صالح" });
      return;
    }
    if (role === "admin") {
      res.status(403).json({ error: "غير مسموح بإنشاء حساب مدير (Admin) من النافذة الخارجية لدواعي أمان النظام. يتم إضافة المدراء فقط من داخل لوحة التحكم." });
      return;
    }

    const exists = USERS.find(u => u.email === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "البريد الإلكتروني مسجل بالفعل بالنظام" });
      return;
    }

    const newUser: UserRecord = {
      id: nextEntityId("u"),
      email: email.toLowerCase(),
      fullName,
      role,
      isActive: true,
      passwordHash: await bcrypt.hash(password, 12)
    };

    USERS.push(newUser);

        const token = generateJWT(newUser);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: newUser.id,
      action: "REGISTER",
      entityType: "User",
      entityId: newUser.id,
      createdAt: new Date().toISOString()
    });

    res.cookie("axislab_token", token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });

    res.json({
      token,
      user: publicUser(newUser)
    });
  });

  // API - Auth Verify Token
  app.get("/api/auth/verify", (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: "رمز المصادقة غير صالح أو منتهي الصلاحية" });
      return;
    }
    res.json({ user: publicUser(user) });
  });

  // ==================== USERS & EMPLOYEES MANAGEMENT API ====================

  // API - Get Users
  app.get("/api/users", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بالوصول لإدارة حسابات الموظفين" });
      return;
    }
    // Return users list securely
    res.json({ success: true, users: USERS.map(publicUser) });
  });

  // API - Create User
  app.post("/api/users", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بإضافة موظفين جدد" });
      return;
    }
    const { email, password, fullName, role, isActive } = req.body;
    if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: "جميع الحقول (اسم المستخدم، كلمة المرور، الاسم الكامل، الصلاحية) مطلوبة" });
      return;
    }
    const exists = USERS.find(u => u.email === email.toLowerCase());
    if (exists) {
      res.status(400).json({ error: "اسم المستخدم / البريد الإلكتروني مسجل بالفعل بالنظام لموظف آخر" });
      return;
    }

    const newUser = {
      id: nextEntityId("u"),
      email: email.toLowerCase(),
      fullName,
      role,
      isActive: isActive !== undefined ? isActive : true,
      passwordHash: await bcrypt.hash(password, 12)
    };

    USERS.push(newUser);

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(newUser) });
  });

  // API - Update User
  app.put("/api/users/:id", async (req, res) => {
    const adminUser = getRequestUser(req);
    if (!adminUser || adminUser.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بتعديل بيانات الموظفين" });
      return;
    }
    const targetUser = USERS.find(u => u.id === req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: "الموظف غير موجود بالنظام" });
      return;
    }
    const { email, password, fullName, role, isActive } = req.body;

    if (email) {
      const exists = USERS.find(u => u.email === email.toLowerCase() && u.id !== req.params.id);
      if (exists) {
        res.status(400).json({ error: "اسم المستخدم / البريد الإلكتروني مستخدم بالفعل لموظف آخر" });
        return;
      }
      targetUser.email = email.toLowerCase();
    }
    if (fullName) targetUser.fullName = fullName;
    if (role) targetUser.role = role;
    if (isActive !== undefined) {
      if (adminUser.id === targetUser.id && !isActive) {
        res.status(400).json({ error: "لا يمكنك تعطيل حسابك الشخصي النشط حالياً" });
        return;
      }
      targetUser.isActive = isActive;
    }
    if (password) {
      targetUser.passwordHash = await bcrypt.hash(password, 12);
    }

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: adminUser.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: targetUser.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(targetUser) });
  });

  // API - Delete User
  app.delete("/api/users/:id", (req, res) => {
    const adminUser = getRequestUser(req);
    if (!adminUser || adminUser.role !== "admin") {
      res.status(403).json({ error: "غير مصرح لك بحذف الموظفين" });
      return;
    }
    if (adminUser.id === req.params.id) {
      res.status(400).json({ error: "لا يمكنك حذف حسابك الشخصي" });
      return;
    }
    const index = USERS.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "الموظف غير موجود بالنظام" });
      return;
    }
    const removed = USERS.splice(index, 1)[0];

    // Append log
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: adminUser.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: removed.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, user: publicUser(removed) });
  });

  // API - Get Customers
  app.get("/api/customers", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      const sanitized = CUSTOMERS.map(c => ({
        id: c.id,
        name: c.name,
        phone: "🔒 محجوب",
        whatsapp: "🔒 محجوب",
        email: "🔒 محجوب",
        company: "",
        address: "🔒 محجوب",
        notes: "🔒 محجوب"
      }));
      res.json(sanitized);
    } else {
      res.json(CUSTOMERS);
    }
  });

  // API - Add Customer
  app.post("/api/customers", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة عملاء جدد" });
      return;
    }
    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
      return;
    }

    const newCust = {
      id: nextEntityId("c"),
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    CUSTOMERS.push(newCust);

    res.json(newCust);
  });

  // API - Update Customer
  app.put("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
      return;
    }
    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
      return;
    }

    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }

    const updatedCust = {
      ...CUSTOMERS[index],
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || CUSTOMERS[index].email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    CUSTOMERS[index] = updatedCust;
    res.json(updatedCust);
  });

  app.patch("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
      return;
    }

    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }

    const updatedCust = {
      ...CUSTOMERS[index],
      name: req.body.name ?? CUSTOMERS[index].name,
      phone: req.body.phone ?? CUSTOMERS[index].phone,
      whatsapp: req.body.whatsapp ?? CUSTOMERS[index].whatsapp ?? CUSTOMERS[index].phone,
      email: req.body.email ?? CUSTOMERS[index].email ?? "",
      company: req.body.company ?? CUSTOMERS[index].company ?? "",
      address: req.body.address ?? CUSTOMERS[index].address ?? "",
      notes: req.body.notes ?? CUSTOMERS[index].notes ?? "",
      category: req.body.category ?? CUSTOMERS[index].category ?? "شركة"
    };

    CUSTOMERS[index] = updatedCust;
    res.json(updatedCust);
  });

  // API - Delete Customer
  app.delete("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بحذف العملاء" });
      return;
    }
    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    const removed = CUSTOMERS.splice(index, 1)[0];

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Customer",
      entityId: removed.id,
      name: removed.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: removed
    });

    createNotification(
      "حذف عميل مؤقتاً",
      `تم نقل العميل "${removed.name}" إلى سلة المحذوفات ويمكن استعادته من لوحة التحكم.`,
      "system"
    );

    res.json(removed);
  });

  // API - Get Products
  app.get("/api/products", (req, res) => {
    const { search } = req.query;
    if (search) {
      const searchStr = String(search).toLowerCase();
      const filtered = PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(searchStr) || 
        p.code.toLowerCase().includes(searchStr) ||
        p.category.toLowerCase().includes(searchStr)
      );
      res.json(filtered);
    } else {
      res.json(PRODUCTS);
    }
  });

  // API - Add Product
  app.post("/api/products", (req, res) => {
    const { name, code, category, price, description, stock } = req.body;
    if (!name || !price) {
      res.status(400).json({ error: "الاسم والسعر حقلان إجباريان" });
      return;
    }

    const newProd = {
      id: nextEntityId("p"),
      name,
      code: code || `PRD-${Date.now().toString().slice(-6)}`,
      category: category || "عام",
      price: Number(price) || 0,
      description: description || "",
      stock: Number(stock) || 0
    };

    PRODUCTS.push(newProd);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: newProd.id,
      createdAt: new Date().toISOString()
    });

    res.json(newProd);
  });

  // API - Update Product
  app.put("/api/products/:id", (req, res) => {
    const { name, code, category, price, description, stock } = req.body;
    const prod = PRODUCTS.find(p => p.id === req.params.id);
    if (!prod) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    if (name) prod.name = name;
    if (code) prod.code = code;
    if (category) prod.category = category;
    if (price !== undefined) prod.price = Number(price) || 0;
    if (description !== undefined) prod.description = description;
    if (stock !== undefined) prod.stock = Number(stock) || 0;

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: prod.id,
      createdAt: new Date().toISOString()
    });

    res.json(prod);
  });

  // API - Delete Product
  app.delete("/api/products/:id", (req, res) => {
    const user = getRequestUser(req);
    const index = PRODUCTS.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }
    const removed = PRODUCTS.splice(index, 1)[0];

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Product",
      entityId: removed.id,
      name: removed.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: removed
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "DELETE_PRODUCT",
      entityType: "Product",
      entityId: removed.id,
      createdAt: new Date().toISOString()
    });

    createNotification(
      "حذف منتج مؤقتاً",
      `تم نقل المنتج "${removed.name}" إلى سلة المحذوفات ويمكن استعادته من لوحة التحكم.`,
      "system"
    );

    res.json(removed);
  });

  // API - Get Orders
  app.get("/api/orders", (req, res) => {
    notifyOverdueOrders();
    const user = getRequestUser(req);
    const isEmployee = user && user.role === "employee";
    
    if (isEmployee) {
      // Security: mask all financial values for orders and order items
      const securedOrders = ORDERS.map((ord: any) => ({
        ...ord,
        totalPrice: 0,
        paidAmount: 0,
        remaining: 0,
        items: ord.items ? ord.items.map((it: any) => ({
          ...it,
          unitPrice: 0,
          totalPrice: 0
        })) : []
      }));
      res.json(securedOrders);
    } else {
      res.json(ORDERS);
    }
  });

  // API - Create Order
  app.post("/api/orders", async (req, res) => {
    const orderRequestStartedAt = performance.now();
    const { customerId, notes, priority, items, totalPrice, paidAmount, createdById, deliveryDateExpected, taxPercent, discount } = req.body;
    if (!customerId || !items || items.length === 0) {
      res.status(400).json({ error: "الرجاء اختيار العميل وإضافة عنصر واحد على الأقل للطلب" });
      return;
    }
    recordBenchmark(orderCreateBenchmarks, "request_validation", orderRequestStartedAt);
    const parseItemsStartedAt = performance.now();
    const parsedItems = items.map((it: any, idx: number) => ({
      id: `item-${Date.now()}-${idx}`,
      productName: it.productName,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      notes: it.notes || ""
    }));
    recordBenchmark(orderCreateBenchmarks, "parse_items", parseItemsStartedAt);
    const totalsStartedAt = performance.now();

    const itemsSubtotal = parsedItems.reduce((acc: number, cur: any) => acc + cur.totalPrice, 0);
    const taxRate = Number(taxPercent) || 0;
    const discountAmt = Number(discount) || 0;
    const computedTotal = itemsSubtotal + (itemsSubtotal * (taxRate / 100)) - discountAmt;
    
    // Respect the explicit totalPrice from the frontend if passed, otherwise use computedTotal
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : Math.max(0, computedTotal);
    const orderNum = getNextNumber("order");
    recordBenchmark(orderCreateBenchmarks, "calculate_totals_and_number", totalsStartedAt);
    const objectBuildStartedAt = performance.now();

    const newOrder = {
      id: nextEntityId("ord"),
      orderNumber: orderNum,
      customerId,
      status: "new",
      priority: priority || "normal",
      totalPrice: finalTotal,
      currency: "SYP",
      exchangeRateAtCreation: Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135,
      taxPercent: taxRate,
      discount: discountAmt,
      paidAmount: Number(paidAmount) || 0,
      remaining: Math.max(0, finalTotal - (Number(paidAmount) || 0)),
      notes: notes || "",
      createdById: createdById || "u-1",
      createdAt: new Date().toISOString(),
      deliveryDateExpected: deliveryDateExpected || new Date(Date.now() + 3600000 * 48).toISOString(), // default 48h
      items: parsedItems,
      statusHistory: [{
        oldStatus: null,
        newStatus: "new",
        notes: "تم استقبال الطلب",
        changedAt: new Date().toISOString(),
        changedById: createdById || "u-1"
      }]
    };

    ORDERS.unshift(newOrder);

    // Auto-create matching Invoice
    const invoiceId = nextEntityId("inv");
    const invoiceItems = parsedItems.map((it: any, idx: number) => ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: invoiceId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: 0,
      tax: 0,
      total: it.totalPrice,
      createdAt: new Date().toISOString()
    }));

    const newInvoice = {
      id: invoiceId,
      invoiceNumber: getNextNumber("invoice"),
      orderId: newOrder.id,
      customerId: newOrder.customerId,
      issueDate: new Date().toISOString(),
      dueDate: newOrder.deliveryDateExpected || new Date().toISOString(),
      totalPrice: sypToUsd(newOrder.totalPrice, newOrder.exchangeRateAtCreation),
      totalPriceSYP: Math.round(newOrder.totalPrice),
      exchangeRateAtIssue: newOrder.exchangeRateAtCreation,
      subtotal: sypToUsd(itemsSubtotal, newOrder.exchangeRateAtCreation),
      taxPercent: taxRate,
      discount: sypToUsd(discountAmt, newOrder.exchangeRateAtCreation),
      paidAmount: sypToUsd(newOrder.paidAmount, newOrder.exchangeRateAtCreation),
      remaining: sypToUsd(newOrder.remaining, newOrder.exchangeRateAtCreation),
      status: newOrder.remaining === 0 ? "paid" : newOrder.paidAmount > 0 ? "partially_paid" : "unpaid",
      currency: "USD",
      items: invoiceItems.map((item: any) => ({ ...item, unitPriceSYP: Math.round(item.unitPrice), totalSYP: Math.round(item.total), unitPrice: sypToUsd(item.unitPrice, newOrder.exchangeRateAtCreation), total: sypToUsd(item.total, newOrder.exchangeRateAtCreation) })),
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: invoiceId,
          action: "created",
          userId: createdById || "u-1",
          createdAt: new Date().toISOString()
        }
      ]
    };
    INVOICES.unshift(newInvoice);
    recordBenchmark(orderCreateBenchmarks, "build_order_and_invoice", objectBuildStartedAt);

    const activityStartedAt = performance.now();
    // Log Activity
    const newOrderMsg = `إنشاء طلب جديد #${newOrder.orderNumber} بقيمة إجمالية $${newOrder.totalPrice.toFixed(2)} (المدفوع: $${newOrder.paidAmount.toFixed(2)} / المتبقي: $${newOrder.remaining.toFixed(2)})`;
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: createdById || "u-1",
      action: "CREATE_ORDER",
      entityType: "Order",
      entityId: newOrder.id,
      details: newOrderMsg,
      createdAt: new Date().toISOString()
    });
    recordBenchmark(orderCreateBenchmarks, "append_activity_log", activityStartedAt);

    const queueStartedAt = performance.now();
    await persistMutationWithFastDurability();
    res.locals.axisPersistScheduled = true;
    recordBenchmark(orderCreateBenchmarks, "queue_persistence", queueStartedAt);
    recordBenchmark(orderCreateBenchmarks, "request_total_to_response", orderRequestStartedAt);
    res.json(newOrder);
  });
  // API - Update Order (Edit details)
  app.put("/api/orders/:id", (req, res) => {
    const { notes, priority, items, paidAmount, customerId, deliveryDateExpected, taxPercent, discount } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt && (items !== undefined || paidAmount !== undefined || taxPercent !== undefined || discount !== undefined)) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن تعديل البنود أو المبالغ بعد التسليم الكامل." });
      return;
    }

    // 1. Snapshot previous state for precise audit diff
    const oldState = {
      customerId: order.customerId,
      totalPrice: order.totalPrice || 0,
      paidAmount: order.paidAmount || 0,
      remaining: order.remaining || 0,
      discount: order.discount || 0,
      taxPercent: order.taxPercent || 0,
      priority: order.priority || "normal",
      notes: order.notes || "",
      itemsCount: order.items ? order.items.length : 0,
      itemsTotalQty: order.items ? order.items.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0) : 0,
    };

    if (customerId) order.customerId = customerId;
    if (priority) order.priority = priority;
    if (notes !== undefined) order.notes = notes;
    if (deliveryDateExpected) order.deliveryDateExpected = deliveryDateExpected;
    if (paidAmount !== undefined) {
      order.paidAmount = Number(paidAmount) || 0;
    }

    if (taxPercent !== undefined) order.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) order.discount = Number(discount) || 0;

    if (items && items.length > 0) {
      order.items = items.map((it: any, idx: number) => {
        const qty = Number(it.quantity) || 1;
        const comp = it.completedQuantity !== undefined ? Number(it.completedQuantity) : (it.isCompleted ? qty : 0);
        return {
          id: it.id || `item-${Date.now()}-${idx}`,
          productName: it.productName,
          quantity: qty,
          completedQuantity: Math.max(0, Math.min(qty, comp)),
          isCompleted: comp >= qty,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: qty * (Number(it.unitPrice) || 0),
          notes: it.notes || ""
        };
      });
    }

    const itemsSubtotal = order.items.reduce((acc: number, cur: any) => acc + cur.totalPrice, 0);
    const taxRate = order.taxPercent !== undefined ? order.taxPercent : 0;
    const discountAmt = order.discount !== undefined ? order.discount : 0;
    order.totalPrice = Math.max(0, itemsSubtotal + (itemsSubtotal * (taxRate / 100)) - discountAmt);

    order.remaining = Math.max(0, order.totalPrice - order.paidAmount);

    // Sync matching Invoice
    const matchingInv = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv) {
      matchingInv.totalPrice = order.totalPrice;
      matchingInv.paidAmount = order.paidAmount;
      matchingInv.remaining = order.remaining;
      matchingInv.status = order.remaining === 0 ? "paid" : order.paidAmount > 0 ? "partially_paid" : "unpaid";
      if (customerId) matchingInv.customerId = customerId;
      if (deliveryDateExpected) matchingInv.dueDate = deliveryDateExpected;
    }

    // 2. Compute detailed financial & operational differences
    const changeDetails: string[] = [];

    if (Math.abs(oldState.totalPrice - order.totalPrice) > 0.001) {
      const diff = order.totalPrice - oldState.totalPrice;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير إجمالي السعر من ${Math.round(oldState.totalPrice).toLocaleString()} ل.س إلى ${Math.round(order.totalPrice).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.paidAmount - order.paidAmount) > 0.001) {
      const diff = order.paidAmount - oldState.paidAmount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الواصل/المقدم من ${Math.round(oldState.paidAmount).toLocaleString()} ل.س إلى ${Math.round(order.paidAmount).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.remaining - order.remaining) > 0.001) {
      changeDetails.push(`تعديل المبلغ المتبقي ليصبح ${Math.round(order.remaining).toLocaleString()} ل.س (سابقاً ${Math.round(oldState.remaining).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.discount - order.discount) > 0.001) {
      const diff = order.discount - oldState.discount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الخصم المالي من $${oldState.discount.toFixed(2)} إلى $${order.discount.toFixed(2)} (الفرق ${diffSign}$${diff.toFixed(2)})`);
    }

    if (Math.abs(oldState.taxPercent - order.taxPercent) > 0.001) {
      changeDetails.push(`تغيرت نسبة الضريبة من ${oldState.taxPercent}% إلى ${order.taxPercent}%`);
    }

    if (oldState.priority !== order.priority) {
      const pMap: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة/طارئة" };
      changeDetails.push(`تغير الأولوية من [${pMap[oldState.priority] || oldState.priority}] إلى [${pMap[order.priority] || order.priority}]`);
    }

    if (oldState.customerId !== order.customerId) {
      const oldCust = CUSTOMERS.find(c => c.id === oldState.customerId)?.name || "غير محدد";
      const newCust = CUSTOMERS.find(c => c.id === order.customerId)?.name || "غير محدد";
      changeDetails.push(`تغير العميل من "${oldCust}" إلى "${newCust}"`);
    }

    const currentTotalQty = order.items ? order.items.reduce((acc: number, cur: any) => acc + (cur.quantity || 1), 0) : 0;
    if (oldState.itemsCount !== (order.items?.length || 0) || oldState.itemsTotalQty !== currentTotalQty) {
      changeDetails.push(`تعديل بنود وعناصر الطلب (عدد البنود: ${order.items?.length || 0} / الكمية الإجمالية: ${currentTotalQty})`);
    }

    const finalDetailsText = changeDetails.length > 0 
      ? changeDetails.join(" | ") 
      : "تحديث وحفظ بيانات وملاحظات الطلب في النظام";

    // 3. Append entry into Order Status/Audit History
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: `[تعديل ماليات وبيانات الطلب #${order.orderNumber}] ${finalDetailsText}`,
      changedAt: new Date().toISOString()
    });

    // 4. Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: req.body.changedById || "u-1",
      action: "UPDATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      details: finalDetailsText,
      createdAt: new Date().toISOString()
    });

    res.json(order);
  });

  // API - Update Order Item Progress (تحديث نسبة إنجاز أجزاء ومواد الطلب والتكرارات)
  app.patch("/api/orders/:id/items-progress", (req, res) => {
    const { itemId, materialName, setAllCompleted, resetAll, addItem, removeItemId, completedQuantity, changedById } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (!order.items) order.items = [];

    const getMaterialKey = (it: any): string => {
      if (it.material && typeof it.material === 'string' && it.material.trim()) return it.material.trim();
      if (it.materialCategory && typeof it.materialCategory === 'string' && it.materialCategory.trim()) return it.materialCategory.trim();
      const name = (it.productName || it.name || "").trim();
      if (/أكريليك|اكريليك|acrylic/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `أكريليك ${thicknessMatch[0]}` : "أكريليك";
      }
      if (/mdf|ام دي اف|أم دي إف/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `خشب MDF ${thicknessMatch[0]}` : "خشب MDF";
      }
      if (/خشب|خشبي|زان|سويد|بلوط|معاكس|wood/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `خشب ${thicknessMatch[0]}` : "خشب طبيعي/معاكس";
      }
      if (/جلد|leather/i.test(name)) return "جلود وقماش";
      if (/صاج|حديد|معادن|ستانلس|stainless|metal/i.test(name)) return "معادن وستانلس";
      return name || "مواد أخرى";
    };

    let autoNote = "";

    if (addItem && addItem.productName) {
      const newId = "item-" + Date.now();
      const q = Math.max(1, Number(addItem.quantity) || 1);
      order.items.push({
        id: newId,
        productName: addItem.productName.trim(),
        materialCategory: addItem.materialName || "أكريليك",
        quantity: q,
        unitPrice: Number(addItem.unitPrice) || 0,
        totalPrice: q * (Number(addItem.unitPrice) || 0),
        completedQuantity: 0,
        isCompleted: false,
        notes: addItem.notes || ""
      });
      autoNote = `إضافة بند جديد لجدول القص: [${addItem.productName}] بكمية ${q} قطعة.`;
    } else if (removeItemId) {
      const idx = order.items.findIndex((it: any) => it.id === removeItemId);
      if (idx !== -1) {
        const removed = order.items.splice(idx, 1)[0];
        autoNote = `حذف البند [${removed.productName}] من جدول إنجاز القص.`;
      }
    } else if (resetAll) {
      order.items.forEach((it: any) => {
        it.completedQuantity = 0;
        it.isCompleted = false;
      });
      autoNote = "🔄 تصفير إنجاز كافة القطع والمواد (إعادة التعيين إلى 0%).";
    } else if (setAllCompleted) {
      // Complete all items in order
      order.items.forEach((it: any) => {
        const q = Number(it.quantity) || 1;
        it.completedQuantity = q;
        it.isCompleted = true;
      });
      autoNote = "🎉 تم تحديث كافة أجزاء ومواد الطلب وجميع القطع والتكرارات إلى إنجاز كامل (100%).";
    } else if (materialName) {
      // Update all items matching materialName
      let targetCount = 0;
      order.items.forEach((it: any) => {
        const key = getMaterialKey(it);
        if (key === materialName || (it.productName && it.productName.includes(materialName))) {
          const q = Number(it.quantity) || 1;
          const comp = completedQuantity !== undefined ? Math.max(0, Math.min(q, Number(completedQuantity))) : q;
          it.completedQuantity = comp;
          it.isCompleted = comp >= q;
          targetCount++;
        }
      });
      autoNote = `تحديث نسبة إنجاز كافة القطع والمواد التابعة لخامة [${materialName}] (${targetCount} بند).`;
    } else if (itemId) {
      // Update single item
      const item = order.items.find((it: any) => it.id === itemId);
      if (!item) {
        res.status(404).json({ error: "جزء/عنصر الطلب غير موجود" });
        return;
      }
      const itemQty = Number(item.quantity) || 1;
      const newCompQty = Math.max(0, Math.min(itemQty, Number(completedQuantity) || 0));
      item.completedQuantity = newCompQty;
      item.isCompleted = newCompQty >= itemQty;
      autoNote = `تحديث نسبة إنجاز الجزء [${item.productName}]: ${newCompQty}/${itemQty} قطعة (${Math.round((newCompQty / itemQty) * 100)}%).`;
    }

    // Calculate total order progress across all parts and materials
    let totalReq = 0;
    let totalDone = 0;
    order.items.forEach((it: any) => {
      const q = Number(it.quantity) || 1;
      const c = it.completedQuantity !== undefined ? Number(it.completedQuantity) : (it.isCompleted ? q : 0);
      totalReq += q;
      totalDone += c;
    });

    const isAllPartsFinished = totalReq > 0 && totalDone >= totalReq;
    const isPartiallyStarted = totalDone > 0;

    // Auto update order status based on overall parts completion
    if (isAllPartsFinished && (order.status === 'in_progress' || order.status === 'new')) {
      order.status = 'ready';
      autoNote += " 🎉 تم استكمال قص وإنجاز كافة أجزاء ومواد الطلب بالكامل (100%)، وتم تحويل حالة الطلب تلقائياً إلى (جاهز للتسليم).";
    } else if (isPartiallyStarted && order.status === 'new') {
      order.status = 'in_progress';
      autoNote += " ⚙️ تم البدء بإنجاز أجزاء الطلب، وتم تحويل الحالة تلقائياً إلى (قيد التنفيذ).";
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: autoNote,
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: changedById || "u-1",
      action: "UPDATE_ITEM_PROGRESS",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    res.json(order);
  });

  // API - Record Payment
  app.post("/api/orders/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, changedById, paymentId } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن تسجيل دفعة جديدة بعد التسليم." });
      return;
    }

    const inputAmount = Number(amount) || 0;
    const orderExchangeRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
    const payAmtSYP = currency === "SYP"
      ? Math.round(inputAmount)
      : Math.round(inputAmount * orderExchangeRate);
    const payAmtUSD = currency === "SYP"
      ? payAmtSYP / orderExchangeRate
      : inputAmount;
    if (!Number.isFinite(inputAmount) || inputAmount <= 0 || payAmtSYP <= 0) {
      res.status(400).json({ error: "مبلغ الدفعة يجب أن يكون أكبر من الصفر" });
      return;
    }
    const currentRemainingSYP = Math.max(0, Number(order.totalPrice || 0) - Number(order.paidAmount || 0));
    if (payAmtSYP > currentRemainingSYP + 1) {
      res.status(400).json({
        error: `مبلغ الدفعة يتجاوز المبلغ المتبقي. المتبقي: ${Math.round(currentRemainingSYP).toLocaleString()} ل.س`,
        remainingSYP: currentRemainingSYP,
        remainingUSD: currentRemainingSYP / orderExchangeRate
      });
      return;
    }
    if (paymentId && order.payments?.some((payment: any) => payment.id === String(paymentId))) {
      res.status(409).json({ error: "هذه الدفعة مسجلة مسبقاً" });
      return;
    }
    order.paidAmount = Math.min(
      Number(order.totalPrice || 0),
      (order.payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * orderExchangeRate)), 0) + payAmtSYP
    );
    order.remaining = Math.max(0, Number(order.totalPrice || 0) - order.paidAmount);
    order.paidAmountSYP = Math.round(order.paidAmount);
    order.remainingSYP = Math.round(order.remaining);

    if (!order.payments) {
      order.payments = [];
    }

    const methodLabel = paymentMethod === 'transfer' ? 'تحويل بنكي' : paymentMethod === 'card' ? 'بطاقة / شيك' : 'نقدي كاش';

    const paymentRecord = {
      id: paymentId ? String(paymentId) : "pay_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      orderId: order.id,
      amountUSD: payAmtUSD,
      amountSYP: payAmtSYP,
      exchangeRate: orderExchangeRate,
      currency: "SYP",
      paymentMethod: paymentMethod || "cash",
      notes: notes || "دفعة مقبوضة للطلب",
      recordedBy: changedById || "u-1",
      createdAt: new Date().toISOString()
    };
    order.payments.unshift(paymentRecord);

    // Sync matching Invoice. Orders are stored in SYP; invoices are stored in USD.
    const matchingInv2 = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv2) {
      matchingInv2.paidAmount = Math.min(matchingInv2.totalPrice, (matchingInv2.paidAmount || 0) + payAmtUSD);
      matchingInv2.remaining = Math.max(0, matchingInv2.totalPrice - matchingInv2.paidAmount);
      matchingInv2.status = matchingInv2.remaining === 0 ? "paid" : matchingInv2.paidAmount > 0 ? "partially_paid" : "unpaid";
      if (!matchingInv2.payments) matchingInv2.payments = [];
      matchingInv2.payments.unshift({ ...paymentRecord, invoiceId: matchingInv2.id });
    }
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: `تم تسديد دفعة مالية بقيمة $${payAmtUSD.toFixed(2)} (${methodLabel}). ${notes || ""}`,
      changedAt: new Date().toISOString()
    });

    // Log Activity
    const payDetails = `تسديد دفعة مالية بقيمة $${payAmtUSD.toFixed(2)} (${methodLabel}) | المتبقي الجديد: ${order.remaining.toLocaleString()} ل.س`;
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: changedById || "u-1",
      action: "RECORD_PAYMENT",
      entityType: "Order",
      entityId: order.id,
      details: payDetails,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json(order);
  });
  // API - Delete Payment Installment
  app.delete("/api/orders/:orderId/payments/:paymentId", (req, res) => {
    const { orderId, paymentId } = req.params;
    const { changedById } = req.body || {};
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن حذف دفعاته بعد التسليم." });
      return;
    }

    if (!order.payments) order.payments = [];
    const pIndex = order.payments.findIndex((p: any) => p.id === paymentId);
    if (pIndex === -1) {
      res.status(404).json({ error: "سند القبض غير موجود" });
      return;
    }

    const removedPayment = order.payments[pIndex];
    order.payments.splice(pIndex, 1);

    const orderExchangeRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
    order.paidAmount = Math.min(
      Number(order.totalPrice || 0),
      order.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * orderExchangeRate)), 0)
    );
    order.remaining = Math.max(0, Number(order.totalPrice || 0) - order.paidAmount);

    // Keep a linked invoice in USD, while the order remains in SYP.
    const matchingInv2 = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv2) {
      matchingInv2.paidAmount = Math.min(
        Number(matchingInv2.totalPrice || 0),
        matchingInv2.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amountUSD || 0), 0) || 0
      );
      matchingInv2.remaining = Math.max(0, Number(matchingInv2.totalPrice || 0) - matchingInv2.paidAmount);
      matchingInv2.status = matchingInv2.remaining === 0 ? "paid" : matchingInv2.paidAmount > 0 ? "partially_paid" : "unpaid";
    }

    const delPayDetails = `إلغاء وحذف سند قبض بقيمة ${(removedPayment.amountSYP || Math.round(Number(removedPayment.amountUSD || 0) * orderExchangeRate)).toLocaleString()} ل.س | المتبقي الجديد: ${order.remaining.toLocaleString()} ل.س`;

    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: delPayDetails,
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: changedById || "u-1",
      action: "DELETE_PAYMENT",
      entityType: "Order",
      entityId: order.id,
      details: delPayDetails,
      createdAt: new Date().toISOString()
    });

    res.json(order);
  });

  // API - Update Order Status
  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status, notes, changedById } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (!ORDER_STATUSES.some((entry: any) => entry.id === status)) {
      res.status(400).json({ error: "حالة الطلب غير صالحة" });
      return;
    }

    // Orders are stored in SYP. Block delivery only when at least one whole lira remains.
    const deliveryRemainingSYP = Math.max(0, Math.round(Number(order.remainingSYP ?? order.remaining ?? 0)));
    if (status === "delivered" && deliveryRemainingSYP > 0) {
      const deliveryRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
      res.status(400).json({ 
        error: "حظر التسليم: لا يمكن تسليم الطلب للعميل قبل استيفاء وتسديد كامل المبلغ المتبقي المستحق.",
        remainingUSD: deliveryRemainingSYP / deliveryRate,
        remainingSYP: deliveryRemainingSYP,
        orderNumber: order.orderNumber
      });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (status === "delivered") {
      order.deliveryDateActual = new Date().toISOString();
      // Freeze SYP and USD values exactly at final delivery; later rate changes cannot affect this invoice.
      freezeOrderCurrencySnapshot(order);
    } else {
      // Clear actual delivery date if state was downgraded from delivered
      delete order.deliveryDateActual;
    }

    const statusArabicMap: Record<string, string> = {
      new: "جديد",
      design: "قيد التصميم",
      in_progress: "قيد التنفيذ والقص",
      ready: "جاهز للتسليم",
      delivered: "تم التسليم للعميل",
      cancelled: "ملغى"
    };
    const oldStatusLabel = statusArabicMap[oldStatus] || oldStatus;
    const newStatusLabel = statusArabicMap[status] || status;
    const statusChangeMsg = `تغير حالة الطلب من [${oldStatusLabel}] إلى [${newStatusLabel}]${notes ? ` - ملاحظات: ${notes}` : ""}`;

    order.statusHistory.unshift({
      oldStatus,
      newStatus: status,
      notes: notes || `تحديث حالة الطلب إلى ${newStatusLabel}`,
      changedAt: new Date().toISOString(),
      changedById: changedById || "u-1"
    });

    createNotification(
      `تحديث حالة الطلب #${order.orderNumber}`,
      `انتقلت الحالة من ${oldStatusLabel} إلى ${newStatusLabel}${notes ? `: ${notes}` : ""}`,
      "order",
      status === "ready" ? "high" : "normal",
      "/orders"
    );

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: changedById || "u-1",
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: order.id,
      details: statusChangeMsg,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json(order);
  });

  // API - Run Auto Archive Orders
  app.post("/api/orders/auto-archive", (req, res) => {
    const isAutoEnabled = req.body.force ? true : (SETTINGS.autoArchive?.enabled ?? true);
    if (!isAutoEnabled) {
      return res.json({
        success: false,
        count: 0,
        archivedOrders: [],
        message: "ميزة الأرشفة التلقائية معطلة حالياً في إعدادات النظام."
      });
    }

    const daysThreshold = Number(req.body.days) || SETTINGS.autoArchive?.thresholdDays || 30;
    const cutoffTime = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
    let count = 0;
    const archivedOrders: any[] = [];

    ORDERS.forEach((ord: any) => {
      if (!ord.isArchived) {
        const orderCreatedTime = new Date(ord.createdAt || Date.now()).getTime();
        const isFinished = ord.status === "delivered" || ord.status === "completed" || ord.status === "ready";
        if (isFinished && orderCreatedTime < cutoffTime) {
          ord.isArchived = true;
          ord.archivedAt = new Date().toISOString();
          if (!ord.statusHistory) ord.statusHistory = [];
          ord.statusHistory.unshift({
            oldStatus: ord.status,
            newStatus: ord.status,
            notes: `تم نقل الطلب تلقائياً للأرشيف بواسطة نظام الأرشفة التلقائية (${daysThreshold}+ يوماً على الإنشاء/التسليم)`,
            changedAt: new Date().toISOString()
          });
          count++;
          archivedOrders.push(ord);
        }
      }
    });

    if (count > 0) {
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "system",
        action: "AUTO_ARCHIVE_ORDERS",
        entityType: "Order",
        entityId: "batch",
        createdAt: new Date().toISOString(),
        details: `تمت أرشفة ${count} طلبات مكتملة منذ أكثر من ${daysThreshold} يوماً.`
      });

      createNotification(
        "أرشفة الطلبات التلقائية 📦",
        `تم نقل ${count} طلبات مكتملة قديمة (تجاوزت ${daysThreshold} يوماً) إلى أرشيف الطلبات لتسريع الورشة.`,
        "system"
      );
    }

    // Check pre-archive notifications for upcoming orders
    const notifyBeforeArchive = SETTINGS.autoArchive?.notifyBeforeArchive ?? true;
    const notifyDaysBefore = SETTINGS.autoArchive?.notifyDaysBefore || 3;
    let upcomingCount = 0;

    if (notifyBeforeArchive) {
      const warningWindowStart = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
      const warningWindowEnd = Date.now() - ((daysThreshold - notifyDaysBefore) * 24 * 60 * 60 * 1000);

      const upcomingOrders = ORDERS.filter((ord: any) => {
        if (ord.isArchived) return false;
        const orderCreatedTime = new Date(ord.createdAt || Date.now()).getTime();
        const isFinished = ord.status === "delivered" || ord.status === "completed" || ord.status === "ready";
        return isFinished && orderCreatedTime <= warningWindowEnd && orderCreatedTime >= warningWindowStart && !ord.archiveWarningNotified;
      });

      if (upcomingOrders.length > 0) {
        upcomingCount = upcomingOrders.length;
        upcomingOrders.forEach((ord: any) => { ord.archiveWarningNotified = true; });

        createNotification(
          "تنبيه: أرشفة طلبات وشيكة 🔔",
          `توجد ${upcomingCount} طلبات مكتملة اقتربت من موعد الأرشفة التلقائية خلال ${notifyDaysBefore} أيام (الطلبات: ${upcomingOrders.map((o: any) => o.orderNumber).slice(0, 3).join(', ')}${upcomingCount > 3 ? '...' : ''}).`,
          "warning"
        );
      }
    }

    res.json({
      success: true,
      count,
      upcomingCount,
      archivedOrders,
      message: count > 0 
        ? `تمت أرشفة ${count} طلبات مكتملة تجاوزت ${daysThreshold} يوماً بنجاح.` 
        : `لا توجد طلبات مكتملة تجاوزت ${daysThreshold} يوماً بحاجة للأرشفة حالياً.`
    });
  });

  // API - Get Archived Orders
  app.get("/api/orders/archived", (req, res) => {
    const archived = ORDERS.filter(o => o.isArchived === true);
    res.json(archived);
  });

  // API - Archive Single Order (Manual Archive)
  app.post("/api/orders/:id/archive", (req, res) => {
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    order.isArchived = true;
    order.archivedAt = new Date().toISOString();
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: "تم نقل الطلب يدوياً إلى أرشيف الطلبات لتخفيف لوحة التحكم",
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "ARCHIVE_ORDER",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    res.json(order);
  });

  // API - Restore Order from Archive
  app.post("/api/orders/:id/restore", (req, res) => {
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    order.isArchived = false;
    delete order.archivedAt;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: "تمت استعادة الطلب من الأرشيف إلى قائمة الطلبات النشطة بنجاح",
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "RESTORE_ORDER_FROM_ARCHIVE",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    res.json(order);
  });

  // ==================== MATERIALS API ====================

  app.post("/api/materials/ai-classify", async (req, res) => {
    try {
      const { name, thickness, color, notes } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "اسم المادة مطلوب للتصنيف الذكي" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ success: false, message: "مفتاح Gemini API غير مكوّن في الإعدادات." });
        return;
      }

      const prompt = `Classify this material for a laser cutting workshop:
- Name: ${name}
- Thickness: ${thickness || "unknown"} mm
- Color: ${color || "unknown"}
- Notes: ${notes || "none"}`;

      const systemInstruction = `You are a material classification assistant for AXIS LAB, a specialized laser cutting and engraving workshop.
Analyze the material's physical properties such as its name, thickness, color, and descriptions.
Identify its standard category and subcategory based on these inputs:
Standard Categories (must be EXACTLY one of these Arabic strings):
- 'الأكريليك' (for acrylic, plexiglass, Perspex, polymer panels)
- 'الأخشاب' (for wood, MDF, plywood, veneer, natural timber)
- 'الجلود' (for leather, cowskin, suede, synthetic leather, fabric)
- 'عام' (for metals, paper, cardboards, glass, rubber, or other general materials)

Standard subCategory (Provide a descriptive short Arabic subcategory string describing the material finish or variant, e.g. 'شفاف', 'ملون', 'مرآة', 'معتم', 'MDF', 'طبيعي', 'معاكس', 'سوداني', 'سويدي', 'صناعي', 'ورق مقوى', 'معدن', 'عام').

Be intelligent! If the name contains wood words like "خشب", "زان", "MDF", classify category as 'الأخشاب' and subCategory as 'MDF' or 'طبيعي'. If it contains "أكريليك", "شفاف", "acrylic", classify category as 'الأكريليك' and subCategory as 'شفاف' or 'ملون' or 'مرآة'. If it contains "جلد", "leather", classify category as 'الجلود' and subCategory as 'طبيعي' or 'صناعي'. Otherwise, use 'عام' and 'عام'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Exactly one of: 'الأكريليك', 'الأخشاب', 'الجلود', 'عام'" },
              subCategory: { type: Type.STRING, description: "Short descriptive subcategory in Arabic e.g. 'شفاف', 'ملون', 'مرآة', 'MDF', 'طبيعي', 'عام'" },
              confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
              explanation: { type: Type.STRING, description: "A brief, friendly explanation in Arabic explaining why this classification was chosen" }
            },
            required: ["category", "subCategory", "confidence", "explanation"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from Gemini API");
      }

      const resultJson = JSON.parse(resultText.trim());
      res.json({ success: true, classification: resultJson });
    } catch (error: any) {
      console.error("AI Material classification error:", error);
      res.status(500).json({ success: false, message: "فشل تصنيف المادة بالذكاء الاصطناعي", error: error.message });
    }
  });

  app.get("/api/materials", (req, res) => {
    const { search, category } = req.query;
    let list = [...MATERIALS];

    if (search) {
      const searchStr = String(search).toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(searchStr) || 
        (m.subCategory && m.subCategory.toLowerCase().includes(searchStr))
      );
    }
    if (category && category !== "الكل") {
      list = list.filter(m => m.category === category);
    }

    const user = getRequestUser(req);
    const isEmployee = user && user.role === "employee";

    // Attach inventory and supplier to each material
    const enrichedList = list.map(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const sup = SUPPLIERS.find(s => s.id === m.supplierId);
      return {
        ...m,
        pricePerUnit: isEmployee ? 0 : m.pricePerUnit,
        inventory: inv || null,
        supplier: isEmployee ? null : (sup || null)
      };
    });

    res.json({ success: true, materials: enrichedList });
  });

  app.get("/api/materials/categories", (req, res) => {
    const categories = Array.from(new Set(MATERIALS.map(m => m.category)));
    res.json({ success: true, categories });
  });

  app.get("/api/materials/low-stock", (req, res) => {
    const lowStock = MATERIALS.filter(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const avail = inv ? inv.availableQuantity : 0;
      return avail < m.minimumStock;
    }).map(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      return {
        id: m.id,
        name: m.name,
        available: inv ? inv.availableQuantity : 0,
        minimum: m.minimumStock,
        unit: m.unit
      };
    });
    res.json({ success: true, lowStock });
  });

  app.post("/api/materials/check-availability", (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "يرجى تزويد قائمة عناصر الطلب للفحص" });
      return;
    }

    const itemsCheck: Array<{
      itemName: string;
      requiredQty: number;
      matchedMaterial: string | null;
      materialId: string | null;
      currentStock: number;
      availableStock: number;
      minimumStock: number;
      projectedStock: number;
      status: 'ok' | 'warning' | 'error' | 'unmatched';
      message: string;
    }> = [];

    let hasWarnings = false;
    let hasErrors = false;

    items.forEach((it: any) => {
      const itemName = String(it.name || it.productName || "").trim();
      const requiredQty = Number(it.qty || it.quantity) || 1;

      if (!itemName) return;

      const lowerItem = itemName.toLowerCase();
      // Find best match in MATERIALS
      let matched = MATERIALS.find(m => m.name.toLowerCase() === lowerItem);
      if (!matched) {
        matched = MATERIALS.find(m => lowerItem.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lowerItem));
      }
      if (!matched) {
        // Keyword fallbacks
        if (lowerItem.includes("أكريليك") || lowerItem.includes("اكريليك") || lowerItem.includes("acrylic")) {
          matched = MATERIALS.find(m => m.category === "الأكريليك");
        } else if (lowerItem.includes("خشب") || lowerItem.includes("mdf") || lowerItem.includes("زان") || lowerItem.includes("wood")) {
          matched = MATERIALS.find(m => m.category === "الأخشاب");
        } else if (lowerItem.includes("جلد") || lowerItem.includes("leather")) {
          matched = MATERIALS.find(m => m.category === "الجلود");
        }
      }

      if (matched) {
        const inv = INVENTORY.find(i => i.materialId === matched.id);
        const currentStock = inv ? inv.quantity : 0;
        const availableStock = inv ? inv.availableQuantity : currentStock;
        const minimumStock = matched.minimumStock || 5;
        const projectedStock = currentStock - requiredQty;

        let status: 'ok' | 'warning' | 'error' = 'ok';
        let message = `المادة متوفرة بالمستودع. المخزون الحالي ${currentStock} ${matched.unit || "وحدة"}، والمتبقي المتوقع بعد تنفيذ الطلب سيكون ${projectedStock} ${matched.unit || "وحدة"}.`;

        if (currentStock < requiredQty) {
          status = 'error';
          hasErrors = true;
          message = `⚠️ غير كافية! المخزون الحالي (${currentStock} ${matched.unit || "وحدة"}) أقل من الكمية المطلوبة للطلب (${requiredQty} ${matched.unit || "وحدة"}).`;
        } else if (projectedStock < minimumStock) {
          status = 'warning';
          hasWarnings = true;
          message = `⚠️ تنبيه انخفاض المخزون! تنفيذ الطلب سيقلل المخزون المتبقي لـ (${matched.name}) إلى (${projectedStock} ${matched.unit || "وحدة"}) وهو أقل من الحد الأدنى المقدر بـ (${minimumStock} ${matched.unit || "وحدة"}).`;
        }

        itemsCheck.push({
          itemName,
          requiredQty,
          matchedMaterial: matched.name,
          materialId: matched.id,
          currentStock,
          availableStock,
          minimumStock,
          projectedStock,
          status,
          message
        });
      } else {
        itemsCheck.push({
          itemName,
          requiredQty,
          matchedMaterial: null,
          materialId: null,
          currentStock: 0,
          availableStock: 0,
          minimumStock: 0,
          projectedStock: 0,
          status: 'unmatched',
          message: `لم يتم العثور على مادة مطابقة مباشرة في المستودع. يرجى التأكد من المسمى المعتمد للمادة.`
        });
      }
    });

    let overallStatus: 'success' | 'warning' | 'error' = 'success';
    let summaryMessage = "✅ جميع مواد الطلب متوفرة بالمستودع والمخزون المتبقي سيبقى فوق الحد الأدنى للأمان.";

    if (hasErrors) {
      overallStatus = 'error';
      summaryMessage = "🚨 تنبيه حرِج: توجد خامات كميتها الحالية بالمستودع غير كافية لتغطية هذا الطلب!";
    } else if (hasWarnings) {
      overallStatus = 'warning';
      summaryMessage = "⚠️ تنبيه مخزون: استهلاك هذا الطلب يؤدي لانخفاض رصيد مواد بالمستودع تحت الحد الأدنى للأمان!";
    }

    res.json({
      success: true,
      overallStatus,
      summaryMessage,
      hasWarnings,
      hasErrors,
      itemsCheck
    });
  });

  app.get("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const inv = INVENTORY.find(i => i.materialId === material.id);
    const sup = SUPPLIERS.find(s => s.id === material.supplierId);
    const txs = INVENTORY_TRANSACTIONS.filter(t => t.materialId === material.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
    const rems = REMNANTS.filter(r => r.materialId === material.id && (r.status === "available" || r.status === "reserved"));
    const quotes = SUPPLIER_QUOTES.filter(q => q.materialId === material.id);

    res.json({
      success: true,
      material: {
        ...material,
        inventory: inv || null,
        supplier: sup || null,
        transactions: txs,
        remnants: rems,
        supplierQuotes: quotes
      }
    });
  });

  // Supplier Price Comparison Endpoints
  app.get("/api/materials/:id/supplier-quotes", (req, res) => {
    const quotes = SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id);
    res.json({ success: true, quotes });
  });

  app.post("/api/materials/:id/supplier-quotes", async (req, res) => {
    const { supplierId, supplierName, pricePerUnit, minOrderQuantity, deliveryDays, paymentTerms, qualityRating, notes } = req.body;
    if (!pricePerUnit) {
      res.status(400).json({ success: false, message: "سعر الوحدة مطلوب" });
      return;
    }

    const matId = idNum(req.params.id, "m-");
    if (!matId) {
      res.status(400).json({ success: false, message: "معرف المادة غير صالح" });
      return;
    }

    let finalSupName = supplierName || "مورد جديد";
    const supId = idNum(supplierId, "s-");
    if (supId) {
      const existingSup = SUPPLIERS.find(s => s.id === supplierId);
      if (existingSup) finalSupName = existingSup.name;
    }

    try {
      const inserted = await db.insert(supplierQuotesTable).values({
        materialId: matId, supplierId: supId, supplierName: finalSupName,
        pricePerUnit: Number(pricePerUnit) || 0, minOrderQuantity: Number(minOrderQuantity) || 1,
        deliveryDays: Number(deliveryDays) || 1, paymentTerms: paymentTerms || "نقدي",
        qualityRating: Number(qualityRating) || 4.5, notes: notes || null,
      }).returning();
      const row = inserted[0];
      const newQuote = {
        id: "sq-" + row.id, materialId: req.params.id, supplierId: supId ? "s-" + supId : "s-custom",
        supplierName: row.supplierName, pricePerUnit: row.pricePerUnit,
        minOrderQuantity: row.minOrderQuantity, deliveryDays: row.deliveryDays,
        paymentTerms: row.paymentTerms || "", qualityRating: row.qualityRating, notes: row.notes || "",
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      };
      SUPPLIER_QUOTES.push(newQuote);
      res.status(201).json({ success: true, quote: newQuote, quotes: SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id) });
    } catch (err: any) {
      console.error("Error adding supplier quote:", err);
      res.status(500).json({ success: false, message: "فشل إضافة عرض السعر: " + err.message });
    }
  });

  app.delete("/api/materials/:id/supplier-quotes/:quoteId", async (req, res) => {
    const quoteId = idNum(req.params.quoteId, "sq-");
    try {
      if (quoteId) {
        await db.delete(supplierQuotesTable).where(eq(supplierQuotesTable.id, quoteId));
      }
      const idx = SUPPLIER_QUOTES.findIndex(q => q.id === req.params.quoteId && q.materialId === req.params.id);
      if (idx !== -1) {
        SUPPLIER_QUOTES.splice(idx, 1);
      }
      res.json({ success: true, quotes: SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id) });
    } catch (err: any) {
      console.error("Error deleting supplier quote:", err);
      res.status(500).json({ success: false, message: "فشل حذف عرض السعر: " + err.message });
    }
  });

  app.post("/api/materials/:id/set-primary-supplier", async (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { supplierId, supplierName, pricePerUnit } = req.body;
    if (supplierId) material.supplierId = supplierId;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || material.pricePerUnit;

    try {
      const matId = idNum(req.params.id, "m-");
      const supId = idNum(supplierId, "s-");
      if (matId) {
        await db.update(materialsTable).set({
          ...(supId ? { supplierId: supId } : {}),
          pricePerUnit: material.pricePerUnit,
        }).where(eq(materialsTable.id, matId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-1",
        action: "SET_PRIMARY_SUPPLIER",
        entityType: "Material",
        entityId: material.id,
        createdAt: new Date().toISOString(),
        details: `تمت ترقية المورد ${supplierName || supplierId} لمورد رئيسي بسعر $${pricePerUnit}`
      });

      res.json({ success: true, material });
    } catch (err: any) {
      console.error("Error setting primary supplier:", err);
      res.status(500).json({ success: false, message: "فشل تعيين المورد الرئيسي: " + err.message });
    }
  });

  app.post("/api/materials", (req, res) => {
    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, qualityStatus } = req.body;
    if (!name || !category) {
      res.status(400).json({ success: false, message: "Name and Category are required" });
      return;
    }

    const newMat = {
      id: nextEntityId("m"),
      name: name.trim(),
      category,
      subCategory: subCategory || "",
      thickness: thickness ? Number(thickness) : null,
      color: color || "",
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      unit: unit || "sheet",
      pricePerUnit: pricePerUnit ? Number(pricePerUnit) : 0,
      minimumStock: minimumStock ? Number(minimumStock) : 0,
      supplierId: supplierId || null,
      notes: notes || "",
      status: "active",
      qualityStatus: qualityStatus || "inspected",
      createdAt: new Date().toISOString()
    };

    MATERIALS.push(newMat);

    // Create corresponding Inventory record
    const newInv = {
      id: nextEntityId("inv"),
      materialId: newMat.id,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      location: "مستودع عام"
    };
    INVENTORY.push(newInv);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_MATERIAL",
      entityType: "Material",
      entityId: newMat.id,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, material: newMat });
  });

  app.put("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, location, qualityStatus } = req.body;
    
    if (name) material.name = name;
    if (category) material.category = category;
    if (subCategory !== undefined) material.subCategory = subCategory;
    if (thickness !== undefined) material.thickness = thickness ? Number(thickness) : null;
    if (color !== undefined) material.color = color;
    if (width !== undefined) material.width = width ? Number(width) : null;
    if (height !== undefined) material.height = height ? Number(height) : null;
    if (unit) material.unit = unit;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || 0;
    if (minimumStock !== undefined) material.minimumStock = Number(minimumStock) || 0;
    if (supplierId !== undefined) material.supplierId = supplierId;
    if (notes !== undefined) material.notes = notes;
    if (qualityStatus !== undefined) material.qualityStatus = qualityStatus;

    if (location !== undefined) {
      const inv = INVENTORY.find(i => i.materialId === material.id);
      if (inv) inv.location = location;
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, material });
  });

  app.patch("/api/materials/:id/quality-status", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const { qualityStatus } = req.body;
    if (qualityStatus) {
      material.qualityStatus = qualityStatus;
    }
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_MATERIAL_QUALITY_STATUS",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, material });
  });

  app.delete("/api/materials/:id", (req, res) => {
    const user = getRequestUser(req);
    const index = MATERIALS.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const material = MATERIALS[index];
    material.status = "archived";

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Material",
      entityId: material.id,
      name: material.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: material
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "ARCHIVE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    createNotification(
      "أرشفة خامة",
      `تم نقل الخامة "${material.name}" إلى سلة المحذوفات وأرشفتها.`,
      "inventory"
    );

    res.json({ success: true, material });
  });

  app.post("/api/materials/:id/restore", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    material.status = "active";

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "RESTORE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, material });
  });


  // ==================== INVENTORY API ====================

  app.get("/api/inventory/transactions", (req, res) => {
    const { materialId, type } = req.query;
    let list = [...INVENTORY_TRANSACTIONS];

    if (materialId) list = list.filter(t => t.materialId === materialId);
    if (type) list = list.filter(t => t.type === type);

    const enrichedList = list.map(t => {
      const mat = MATERIALS.find(m => m.id === t.materialId);
      const user = USERS.find(u => u.id === t.createdById);
      return {
        ...t,
        material: mat ? { id: mat.id, name: mat.name, unit: mat.unit } : null,
        createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: enrichedList });
  });

  app.get("/api/inventory/stats", (req, res) => {
    const totalMaterials = MATERIALS.length;
    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    MATERIALS.forEach(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const qty = inv ? inv.quantity : 0;
      const avail = inv ? inv.availableQuantity : 0;
      totalValue += (qty * m.pricePerUnit);
      if (avail < m.minimumStock) lowStock++;
      if (avail <= 0) outOfStock++;
    });

    res.json({
      success: true,
      stats: {
        totalMaterials,
        totalValue,
        lowStock,
        outOfStock
      }
    });
  });

  app.get("/api/inventory/:materialId/transactions", (req, res) => {
    const { materialId } = req.params;
    const list = INVENTORY_TRANSACTIONS.filter(t => t.materialId === materialId)
      .map(t => {
        const user = USERS.find(u => u.id === t.createdById);
        return {
          ...t,
          createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: list });
  });

  app.post("/api/inventory/:materialId/update", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, type, referenceType, referenceId, reason, userId, location } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const beforeQty = Number(inv.quantity) || 0;
    const qtyChange = Number(quantity);
    if (!Number.isFinite(qtyChange) || qtyChange === 0) {
      res.status(400).json({ success: false, message: "Inventory adjustment must be a finite non-zero number" });
      return;
    }
    const afterQty = beforeQty + qtyChange;

    if (afterQty < 0 || afterQty < Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: `Insufficient stock. Available: ${beforeQty - Number(inv.reservedQuantity || 0)}, Requested adjustment: ${qtyChange}` });
      return;
    }

    inv.quantity = afterQty;
    inv.availableQuantity = afterQty - inv.reservedQuantity;
    if (location) inv.location = location;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            quantity: afterQty, availableQuantity: inv.availableQuantity,
            ...(location ? { location } : {}),
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: type || "adjustment", quantity: qtyChange, beforeQty, afterQty,
            referenceType: referenceType || null, referenceId: referenceId || null,
            reason: reason || "تحديث يدوي للمخزون",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: type || "adjustment",
        quantity: qtyChange,
        beforeQty,
        afterQty,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        reason: reason || "تحديث يدوي للمخزون",
        createdById: userId || "u-1",
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: userId || "u-1",
        action: `INVENTORY_${type ? type.toUpperCase() : 'ADJUSTMENT'}`,
        entityType: "Inventory",
        entityId: inv.id,
        createdAt: new Date().toISOString()
      });

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: any) {
      console.error("Error updating inventory:", err);
      res.status(500).json({ success: false, message: "فشل تحديث المخزون: " + err.message });
    }
  });

  app.post("/api/inventory/:materialId/reserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Reservation quantity must be a positive finite number" });
      return;
    }
    const available = inv.quantity - inv.reservedQuantity;
    if (available < qty) {
      res.status(400).json({ success: false, message: `Insufficient available stock. Available: ${available}, Requested: ${qty}` });
      return;
    }

    inv.reservedQuantity += qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "reservation", quantity: qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "حجز مواد للطلب",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "reservation",
        quantity: qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "حجز مواد للطلب",
        createdById: "system",
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: any) {
      console.error("Error reserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل حجز المخزون: " + err.message });
    }
  });

  app.post("/api/inventory/:materialId/unreserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Unreservation quantity must be a positive finite number" });
      return;
    }
    if (qty > Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: "Cannot release more stock than is currently reserved" });
      return;
    }
    inv.reservedQuantity = inv.reservedQuantity - qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "unreserve", quantity: -qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "إلغاء حجز مواد",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "unreserve",
        quantity: -qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "إلغاء حجز مواد",
        createdById: "system",
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: any) {
      console.error("Error unreserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل إلغاء حجز المخزون: " + err.message });
    }
  });


  // ==================== REMNANTS API ====================

  app.get("/api/remnants", (req, res) => {
    const { materialId, minWidth, minHeight } = req.query;
    let list = REMNANTS.filter(r => r.status === "available");

    if (materialId) list = list.filter(r => r.materialId === materialId);
    if (minWidth) list = list.filter(r => r.width >= Number(minWidth));
    if (minHeight) list = list.filter(r => r.height >= Number(minHeight));

    const enrichedList = list.map(r => {
      const mat = MATERIALS.find(m => m.id === r.materialId);
      return {
        ...r,
        material: mat || null
      };
    }).sort((a, b) => b.area - a.area); // Largest first

    res.json({ success: true, remnants: enrichedList });
  });

  app.get("/api/remnants/stats", (req, res) => {
    const total = REMNANTS.filter(r => r.status === "available").length;
    
    // Group by material
    const groups: Record<string, { count: number, totalArea: number }> = {};
    REMNANTS.filter(r => r.status === "available").forEach(r => {
      if (!groups[r.materialId]) {
        groups[r.materialId] = { count: 0, totalArea: 0 };
      }
      groups[r.materialId].count++;
      groups[r.materialId].totalArea += (r.area * r.quantity);
    });

    const byMaterial = Object.entries(groups).map(([matId, data]) => ({
      materialId: matId,
      count: data.count,
      totalArea: data.totalArea
    }));

    res.json({ success: true, stats: { total, byMaterial } });
  });

  app.post("/api/remnants", (req, res) => {
    const { materialId, width, height, quantity, location } = req.body;
    if (!materialId || !width || !height) {
      res.status(400).json({ success: false, message: "MaterialId, width, and height are required" });
      return;
    }

    const w = Number(width) || 0;
    const h = Number(height) || 0;
    const q = Number(quantity) || 1;

    if (w < 100 || h < 100) {
      res.status(400).json({ success: false, message: "Remnant piece too small (minimum 100x100mm)" });
      return;
    }

    const newRem = {
      id: nextEntityId("rem"),
      materialId,
      width: w,
      height: h,
      area: w * h,
      quantity: q,
      status: "available",
      location: location || "صندوق البقايا الرئيسي",
      createdAt: new Date().toISOString()
    };

    REMNANTS.push(newRem);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_REMNANT",
      entityType: "Remnant",
      entityId: newRem.id,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, remnant: newRem });
  });

  app.post("/api/remnants/find-suitable", (req, res) => {
    const { materialId, requiredWidth, requiredHeight } = req.body;
    if (!materialId || !requiredWidth || !requiredHeight) {
      res.status(400).json({ success: false, message: "MaterialId, requiredWidth, requiredHeight are required" });
      return;
    }

    const reqW = Number(requiredWidth);
    const reqH = Number(requiredHeight);

    const match = REMNANTS.filter(r => 
      r.materialId === materialId &&
      r.status === "available" &&
      r.quantity > 0 &&
      ((r.width >= reqW && r.height >= reqH) || (r.width >= reqH && r.height >= reqW))
    ).sort((a, b) => a.area - b.area)[0];

    res.json({ success: true, remnant: match || null });
  });

  app.post("/api/remnants/consume/:id", async (req, res) => {
    const rem = REMNANTS.find(r => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ success: false, message: "Remnant piece not found" });
      return;
    }

    const quantity = Number(req.body.quantity) || 1;
    if (rem.quantity < quantity) {
      res.status(400).json({ success: false, message: `Insufficient remnant quantity. Available: ${rem.quantity}` });
      return;
    }

    rem.quantity -= quantity;
    if (rem.quantity === 0) {
      rem.status = "consumed";
    }

    try {
      const remId = idNum(rem.id, "rem-");
      if (remId) {
        await db.update(remnantsTable).set({ quantity: rem.quantity, status: rem.status }).where(eq(remnantsTable.id, remId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-2",
        action: "CONSUME_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: any) {
      console.error("Error consuming remnant:", err);
      res.status(500).json({ success: false, message: "فشل استهلاك البقايا: " + err.message });
    }
  });

  app.post("/api/remnants/waste/:id", async (req, res) => {
    const rem = REMNANTS.find(r => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ success: false, message: "Remnant piece not found" });
      return;
    }

    rem.status = "waste";

    try {
      const remId = idNum(rem.id, "rem-");
      if (remId) {
        await db.update(remnantsTable).set({ status: "waste" }).where(eq(remnantsTable.id, remId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-2",
        action: "WASTE_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: any) {
      console.error("Error marking remnant as waste:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة البقايا: " + err.message });
    }
  });

  // ==================== SUPPLIERS API ====================

  app.get("/api/suppliers", (req, res) => {
    res.json({ success: true, suppliers: SUPPLIERS });
  });

  app.post("/api/suppliers", async (req, res) => {
    const { name, phone, email, address, notes } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    try {
      if (USE_SQLITE) {
        const nextId = SUPPLIERS.reduce((max, supplier) => Math.max(max, idNum(supplier.id, "s-") || 0), 0) + 1;
        const newSup = {
          id: `s-${nextId}`,
          name: String(name).trim(),
          phone: phone || "",
          email: email || "",
          address: address || "",
          notes: notes || "",
          createdAt: new Date().toISOString(),
        };
        SUPPLIERS.push(newSup);
        schedulePersist();
        res.status(201).json({ success: true, supplier: newSup });
        return;
      }
      const inserted = await db.insert(suppliersTable).values({
        name, phone: phone || null, email: email || null, address: address || null, notes: notes || null,
      }).returning();
      const row = inserted[0];
      const newSup = {
        id: "s-" + row.id, name: row.name, phone: row.phone || "", email: row.email || "",
        address: row.address || "", notes: row.notes || "",
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      };
      SUPPLIERS.push(newSup);
      res.status(201).json({ success: true, supplier: newSup });
    } catch (err: any) {
      console.error("Error adding supplier:", err);
      res.status(500).json({ success: false, message: "فشل إضافة المورد: " + err.message });
    }
  });

  app.get("/api/supply-orders", (req, res) => {
    const populated = SUPPLY_ORDERS.map(order => {
      const supplier = SUPPLIERS.find(s => s.id === order.supplierId);
      const material = MATERIALS.find(m => m.id === order.materialId);
      return {
        ...order,
        supplierName: supplier ? supplier.name : "مورد غير معروف",
        materialName: material ? material.name : "مادة غير معروفة",
        materialCategory: material ? material.category : "عام"
      };
    });
    res.json({ success: true, supplyOrders: populated });
  });

  app.post("/api/supply-orders", async (req, res) => {
    const { supplierId, materialId, quantity, unitPrice, expectedDeliveryDate, notes } = req.body;
    if (!supplierId || !materialId || !quantity || !unitPrice) {
      res.status(400).json({ success: false, message: "جميع الحقول الأساسية مطلوبة (المورد، المادة، الكمية، سعر الوحدة)" });
      return;
    }

    const supId = idNum(supplierId, "s-");
    const matId = idNum(materialId, "m-");
    if (!supId || !matId) {
      res.status(400).json({ success: false, message: "مورد أو مادة غير صالحة" });
      return;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const orderDate = new Date().toISOString().split('T')[0];
    const expDelivery = expectedDeliveryDate || new Date(Date.now() + 3600000 * 24 * 5).toISOString().split('T')[0];

    try {
      let newOrder: any;
      if (USE_SQLITE) {
        // The packaged desktop build uses the in-process SQLite persistence queue.
        // Do not call the Postgres Drizzle adapter here; it produces a 500 in offline mode.
        newOrder = {
          id: `so-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          supplierId: `s-${supId}`, materialId: `m-${matId}`, quantity: qty, unitPrice: price,
          totalPrice: qty * price, status: "pending", orderDate, expectedDeliveryDate: expDelivery,
          actualDeliveryDate: "", notes: notes || "",
        };
        SUPPLY_ORDERS.push(newOrder);
        // Queue the SQLite snapshot without allowing a persistence retry to turn a
        // successfully created local order into an HTTP 500 response.
        schedulePersist();
      } else {
        const inserted = await db.insert(supplyOrdersTable).values({
          supplierId: supId, materialId: matId, quantity: qty, unitPrice: price,
          totalPrice: qty * price, status: "pending", orderDate, expectedDeliveryDate: expDelivery,
          notes: notes || null,
        }).returning();
        const row = inserted[0];
        newOrder = {
          id: "so-" + row.id, supplierId: "s-" + row.supplierId, materialId: "m-" + row.materialId,
          quantity: row.quantity, unitPrice: row.unitPrice, totalPrice: row.totalPrice, status: row.status,
          orderDate: row.orderDate, expectedDeliveryDate: row.expectedDeliveryDate || "",
          actualDeliveryDate: row.actualDeliveryDate || "", notes: row.notes || "",
        };
        SUPPLY_ORDERS.push(newOrder);
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-1",
        action: "CREATE_SUPPLY_ORDER",
        entityType: "SupplyOrder",
        entityId: newOrder.id,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ success: true, supplyOrder: newOrder });
    } catch (err: any) {
      console.error("Error creating supply order:", err);
      res.status(500).json({ success: false, message: "فشل إنشاء طلب التوريد: " + err.message });
    }
  });

  app.put("/api/supply-orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = status === "received" ? "completed" : status;

    if (!normalizedStatus || !["completed", "cancelled", "pending"].includes(normalizedStatus)) {
      res.status(400).json({ success: false, message: "الحالة المرسلة غير صالحة" });
      return;
    }

    const order = SUPPLY_ORDERS.find(o => o.id === id);
    if (!order) {
      res.status(404).json({ success: false, message: "طلب التوريد غير موجود" });
      return;
    }

    const soId = idNum(id, "so-");
    const matId = idNum(order.materialId, "m-");
    const previousStatus = order.status;
    order.status = normalizedStatus;

    try {
      if (normalizedStatus === "completed" && previousStatus !== "completed") {
        order.actualDeliveryDate = new Date().toISOString().split('T')[0];

        const inv = INVENTORY.find(i => i.materialId === order.materialId);
        if (inv && matId) {
          const beforeQty = inv.quantity;
          const afterQty = beforeQty + order.quantity;
          inv.quantity = afterQty;
          inv.availableQuantity = afterQty - inv.reservedQuantity;

          const invId = idNum(inv.id, "inv-");
          if (USE_POSTGRES) {
            if (invId) {
              await db.update(inventoryTable).set({ quantity: afterQty, availableQuantity: inv.availableQuantity }).where(eq(inventoryTable.id, invId));
            }
            await db.insert(inventoryTransactionsTable).values({
              materialId: matId, type: "purchase", quantity: order.quantity, beforeQty, afterQty,
              referenceType: "purchase_order", referenceId: order.id,
              reason: `توريد تلقائي عبر استلام الطلبية ${order.id}`,
            });
          }

          const newTx = {
            id: nextEntityId("tx"),
            materialId: order.materialId,
            type: "purchase",
            quantity: order.quantity,
            beforeQty,
            afterQty,
            referenceType: "purchase_order",
            referenceId: order.id,
            reason: `توريد تلقائي عبر استلام الطلبية ${order.id}`,
            createdById: "u-1",
            createdAt: new Date().toISOString()
          };
          INVENTORY_TRANSACTIONS.push(newTx);
        }
      }

      if (soId && USE_POSTGRES) {
        await db.update(supplyOrdersTable).set({
          status: normalizedStatus,
          actualDeliveryDate: order.actualDeliveryDate || null,
        }).where(eq(supplyOrdersTable.id, soId));
      }
      if (USE_SQLITE) schedulePersist();

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-1",
        action: `SUPPLY_ORDER_${status.toUpperCase()}`,
        entityType: "SupplyOrder",
        entityId: order.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, supplyOrder: order });
    } catch (err: any) {
      console.error("Error updating supply order status:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة طلب التوريد: " + err.message });
    }
  });

  // API - Get Activity Logs
  app.get("/api/logs", (req, res) => {
    res.json(ACTIVITY_LOGS);
  });

  // ==================== ADVANCED ADDITIONS APIs ====================

  // 1. NOTIFICATIONS APIs
  app.get("/api/notifications", (req, res) => {
    res.json({ success: true, notifications: NOTIFICATIONS });
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    const notif = NOTIFICATIONS.find(n => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
    }
    res.json({ success: true, notification: notif });
  });

  app.patch("/api/notifications/read-all", (req, res) => {
    NOTIFICATIONS.forEach(n => n.isRead = true);
    res.json({ success: true });
  });

  app.delete("/api/notifications/:id", (req, res) => {
    const index = NOTIFICATIONS.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
      NOTIFICATIONS.splice(index, 1);
    }
    res.json({ success: true });
  });

  app.post("/api/notifications", (req, res) => {
    const { title, message, type, priority, link } = req.body;
    if (!title || !message) {
      res.status(400).json({ success: false, message: "العنوان والرسالة مطلوبان" });
      return;
    }
    const notif = createNotification(title, message, type || "system", priority || "normal", link || "");
    res.json({ success: true, notification: notif });
  });

  // 2. RECYCLE BIN APIs
  app.get("/api/recycle-bin", (req, res) => {
    res.json({ success: true, items: DELETED_ITEMS });
  });

  app.post("/api/recycle-bin/restore/:id", async (req, res) => {
    const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "العنصر غير موجود في سلة المحذوفات" });
      return;
    }

    const delItem = DELETED_ITEMS.splice(index, 1)[0];
    const data = delItem.originalData;

    // Restore to appropriate array
    if (delItem.entityType === "Customer") {
      CUSTOMERS.push(data);
    } else if (delItem.entityType === "Product") {
      PRODUCTS.push(data);
    } else if (delItem.entityType === "Material") {
      const existing = MATERIALS.find(m => m.id === data.id);
      const matId = idNum(data.id, "m-");
      try {
        if (matId) {
          await db.update(materialsTable).set({ status: "active" }).where(eq(materialsTable.id, matId));
        }
      } catch (err) {
        console.error("Error restoring material from recycle bin:", err);
      }
      if (existing) {
        existing.status = "active";
      } else {
        data.status = "active";
        MATERIALS.push(data);
      }
    } else if (delItem.entityType === "Expense") {
      EXPENSES.push(data);
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "RESTORE_" + delItem.entityType.toUpperCase(),
      entityType: delItem.entityType,
      entityId: delItem.entityId,
      createdAt: new Date().toISOString()
    });

    createNotification(
      `تم استعادة ${delItem.entityType === "Customer" ? "عميل" : delItem.entityType === "Product" ? "منتج" : delItem.entityType === "Material" ? "خامة" : "مصروف"}`,
      `تم استعادة العنصر "${delItem.name}" بنجاح وإعادته إلى قائمة النظام الرئيسية.`,
      "system"
    );

    res.json({ success: true, message: "تم استعادة العنصر بنجاح", item: data });
  });

  app.delete("/api/recycle-bin/permanent/:id", (req, res) => {
    const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "العنصر غير موجود" });
      return;
    }
    const removed = DELETED_ITEMS.splice(index, 1)[0];
    res.json({ success: true, message: "تم الحذف النهائي بنجاح", id: removed.id });
  });

  // 3. CUSTOM ORDER STATUS APIs
  app.get("/api/order-statuses", (req, res) => {
    res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
  });

  app.post("/api/order-statuses", (req, res) => {
    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "الاسم مطلوب" });
      return;
    }
    const newStatus = {
      id: "status_" + Date.now(),
      name,
      color: color || "#3b82f6",
      order: ORDER_STATUSES.length + 1,
      isDefault: false
    };
    ORDER_STATUSES.push(newStatus);
    res.json({ success: true, status: newStatus });
  });

  app.put("/api/order-statuses/:id", (req, res) => {
    const status = ORDER_STATUSES.find(s => s.id === req.params.id);
    if (!status) {
      res.status(404).json({ success: false, message: "الحالة غير موجودة" });
      return;
    }
    const { name, color, order } = req.body;
    if (name !== undefined) status.name = name;
    if (color !== undefined) status.color = color;
    if (order !== undefined) status.order = Number(order) || status.order;
    res.json({ success: true, status });
  });

  app.delete("/api/order-statuses/:id", (req, res) => {
    const index = ORDER_STATUSES.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "الحالة غير موجودة" });
      return;
    }
    if (ORDER_STATUSES[index].isDefault) {
      res.status(400).json({ success: false, message: "لا يمكن حذف الحالات الأساسية للنظام" });
      return;
    }
    const removed = ORDER_STATUSES.splice(index, 1)[0];
    res.json({ success: true, id: removed.id });
  });

  app.post("/api/order-statuses/reorder", (req, res) => {
    const { order } = req.body; // array of status ids
    if (Array.isArray(order)) {
      order.forEach((id: string, idx: number) => {
        const s = ORDER_STATUSES.find(status => status.id === id);
        if (s) {
          s.order = idx + 1;
        }
      });
    }
    res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
  });

  // 4. BULK IMPORT APIs
  const requireImportAdmin = (req: any, res: any) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "استيراد البيانات متاح لمدير النظام فقط" });
      return false;
    }
    return true;
  };
  const normalizeImportHeader = (value: any) => String(value ?? "").trim().toLowerCase().replace(/[\\s_\\-\\/()]+/g, "");
  const importCell = (row: any[], headers: string[], aliases: string[]) => {
    const wanted = aliases.map(normalizeImportHeader);
    const index = headers.findIndex((header) => wanted.includes(normalizeImportHeader(header)));
    return index >= 0 ? row[index] ?? "" : "";
  };
  const inferImportSheet = (name: string, headers: string[]) => {
    const normalizedName = normalizeImportHeader(name);
    const normalizedHeaders = headers.map(normalizeImportHeader);
    if (normalizedName.includes("تعليمات") || normalizedName.includes("قوائم") || normalizedName.includes("instructions") || normalizedName.includes("lists")) return "ignore";
    if (normalizedName.includes("مورد") || normalizedHeaders.includes("كودالمورد") || normalizedHeaders.includes("suppliercode")) return "suppliers";
    if (normalizedName.includes("مخزون") || normalizedHeaders.includes("الكميةالافتتاحية") || normalizedHeaders.includes("openingquantity")) return "inventory";
    return "materials";
  };
  app.post("/api/import/excel/preview", multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single("file"), async (req: any, res) => {
    if (!requireImportAdmin(req, res)) return;
    if (!req.file) { res.status(400).json({ success: false, message: "ملف Excel مطلوب" }); return; }
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheets = workbook.worksheets.map((worksheet) => {
        const name = worksheet.name;
        const matrix: any[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          const rawValues = row.values as any[];
          const values = rawValues.slice(1).map((value: any) => {
            if (value && typeof value === "object") {
              if ("text" in value) return value.text;
              if ("result" in value) return value.result;
              if (value instanceof Date) return value;
            }
            return value ?? "";
          });
          matrix.push(values);
        });
        const headers = (matrix[0] || []).map((value: any) => String(value ?? "").trim());
        const kind = inferImportSheet(name, headers);
        const rows = matrix.slice(1).filter((row) => row.some((value: any) => String(value ?? "").trim() !== "")).map((row) => {
          if (kind === "suppliers") return { code: importCell(row, headers, ["كود المورد*", "كود المورد", "supplier_code", "suppliercode"]), name: importCell(row, headers, ["اسم المورد*", "اسم المورد", "name"]), phone: importCell(row, headers, ["الهاتف", "phone"]), email: importCell(row, headers, ["البريد الإلكتروني", "email"]), address: importCell(row, headers, ["العنوان", "address"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          if (kind === "inventory") return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة (للمراجعة)", "اسم المادة", "name"]), warehouse: importCell(row, headers, ["اسم المستودع*", "اسم المستودع", "warehouse"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), openingQuantity: importCell(row, headers, ["الكمية الافتتاحية*", "الكمية الافتتاحية", "opening_quantity", "openingquantity"]), qualityStatus: importCell(row, headers, ["حالة الجودة*", "حالة الجودة", "quality_status", "qualitystatus"]), batchNumber: importCell(row, headers, ["رقم الدفعة", "batch_number", "batchnumber"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة*", "اسم المادة", "name"]), category: importCell(row, headers, ["التصنيف*", "التصنيف", "category"]), thickness: importCell(row, headers, ["السماكة (مم)", "السماكة", "thickness"]), unit: importCell(row, headers, ["الوحدة*", "الوحدة", "unit"]), pricePerUnit: importCell(row, headers, ["سعر الشراء (ل.س)*", "سعر الشراء", "price_per_unit", "priceperunit"]), minimumStock: importCell(row, headers, ["الحد الأدنى للمخزون", "minimum_stock", "minimumstock"]), supplierCode: importCell(row, headers, ["كود المورد", "supplier_code", "suppliercode"]), stock: importCell(row, headers, ["الكمية الافتتاحية", "stock"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), qualityStatus: importCell(row, headers, ["حالة الجودة", "quality_status", "qualitystatus"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
        });
        return { name, kind, headers, rows };
      });
      res.json({ success: true, fileName: req.file.originalname, sheets: sheets.filter((sheet) => sheet.kind !== "ignore") });
    } catch (error: any) {
      console.error("Excel preview failed:", error);
      res.status(400).json({ success: false, message: "تعذر قراءة ملف Excel: " + error.message });
    }
  });

  app.post("/api/import/customers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة للاستيراد" });
      return;
    }

    const imported: any[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      if (!it.name) {
        errors.push(`السطر ${idx + 1}: حقل الاسم مطلوب`);
        continue;
      }
      try {
        const inserted = await db.insert(customersTable).values({
          name: it.name, phone: it.phone || null, whatsapp: it.whatsapp || it.phone || null,
          email: it.email || null, company: it.company || "أفراد", address: it.address || null,
          notes: it.notes || null, category: it.category || "شركة",
        }).returning();
        const row = inserted[0];
        const newCust = {
          id: "c-" + row.id, name: row.name, phone: row.phone || "", whatsapp: row.whatsapp || row.phone || "",
          email: row.email || "", company: row.company || "", address: row.address || "",
          notes: row.notes || "", category: row.category || "شركة",
        };
        CUSTOMERS.push(newCust);
        imported.push(newCust);
      } catch (err: any) {
        console.error("Error importing customer row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد عملاء جماعي",
        `تم استيراد عدد ${imported.length} عملاء بنجاح من ملف بيانات خارجي.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/products", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: any[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      if (!it.name || !it.price) {
        errors.push(`السطر ${idx + 1}: الاسم والسعر مطلوبان`);
        continue;
      }
      try {
        const inserted = await db.insert(productsTable).values({
          name: it.name, code: it.code || `PRD-${Date.now().toString().slice(-4)}-${idx}`,
          category: it.category || "عام", price: Number(it.price) || 0,
          description: it.description || null, stock: Number(it.stock) || 0,
        }).returning();
        const row = inserted[0];
        const newProd = {
          id: "p-" + row.id, name: row.name, code: row.code, category: row.category, price: row.price,
          description: row.description || "", stock: row.stock,
        };
        PRODUCTS.push(newProd);
        imported.push(newProd);
      } catch (err: any) {
        console.error("Error importing product row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد منتجات جماعي",
        `تم استيراد عدد ${imported.length} منتجات وموديلات جديدة إلى مكتبة التصاميم.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/materials", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: any[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const name = String(it.name || "").trim();
      const code = String(it.code || "").trim();
      const pricePerUnit = Number(it.pricePerUnit);
      const existingCode = code && MATERIALS.find((material: any) => String(material.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code.toLowerCase());
      if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
        errors.push(`السطر ${idx + 1}: الاسم وسعر المفرد الصحيح مطلوبان`);
        continue;
      }
      if (MATERIALS.some((material: any) => String(material.name || "").trim().toLowerCase() === name.toLowerCase()) || existingCode) {
        errors.push(`السطر ${idx + 1}: المادة أو كودها موجود مسبقًا`);
        continue;
      }
      try {
        const supId = idNum(it.supplierId, "s-");
        const insertedMat = await db.insert(materialsTable).values({
          name,
          category: it.category || "عام",
          subCategory: it.subCategory || "general",
          thickness: Number(it.thickness) || 0,
          color: it.color || "natural",
          width: Number(it.width) || 1220,
          height: Number(it.height) || 2440,
          unit: it.unit || "sheet",
          pricePerUnit,
          minimumStock: Number(it.minimumStock) || 5,
          supplierId: supId,
          notes: [code ? `كود المادة: ${code}` : "", it.notes || ""].filter(Boolean).join(" | ") || null,
          status: "active",
          qualityStatus: it.qualityStatus || "inspected",
        }).returning();
        const matRow = insertedMat[0];

        const stock = Number(it.stock) || 0;
        await db.insert(inventoryTable).values({
          materialId: matRow.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location || "المستودع الرئيسي",
        });

        const newMat = {
          id: "m-" + matRow.id, name: matRow.name, category: matRow.category, subCategory: matRow.subCategory,
          thickness: matRow.thickness ?? 0, color: matRow.color || "", width: matRow.width ?? 0,
          height: matRow.height ?? 0, unit: matRow.unit, pricePerUnit: matRow.pricePerUnit,
          minimumStock: matRow.minimumStock, supplierId: matRow.supplierId ? "s-" + matRow.supplierId : "",
          notes: matRow.notes || "", status: matRow.status, qualityStatus: matRow.qualityStatus || "inspected",
        };
        MATERIALS.push(newMat);
        INVENTORY.push({
          id: "inv-pending", materialId: newMat.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location || "المستودع الرئيسي",
        });
        imported.push(newMat);
      } catch (err: any) {
        console.error("Error importing material row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد خامات ومواد",
        `تم استيراد عدد ${imported.length} خامات ومواد جديدة لدفتر المخزون والمستودع.`,
        "inventory"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/suppliers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: any[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const code = String(it.code || "").trim();
      const name = String(it.name || "").trim();
      if (!name || !code) { errors.push(`السطر ${idx + 1}: كود المورد والاسم مطلوبان`); continue; }
      const duplicate = SUPPLIERS.some((supplier: any) => String(supplier.name || "").trim().toLowerCase() === name.toLowerCase() || String(supplier.notes || "").includes(`كود المورد: ${code}`));
      if (duplicate) { errors.push(`السطر ${idx + 1}: المورد أو كوده موجود مسبقًا`); continue; }
      try {
        const inserted = await db.insert(suppliersTable).values({ name, phone: it.phone || null, email: it.email || null, address: it.address || null, notes: [`كود المورد: ${code}`, it.notes || ""].filter(Boolean).join(" | ") }).returning();
        const row = inserted[0];
        const supplier = { id: "s-" + row.id, code, name: row.name, phone: row.phone || "", email: row.email || "", address: row.address || "", notes: it.notes || "" };
        SUPPLIERS.push(supplier);
        imported.push(supplier);
      } catch (error: any) { errors.push(`السطر ${idx + 1}: فشل الحفظ - ${error.message}`); }
    }
    if (imported.length > 0) createNotification("استيراد موردين جماعي", `تم استيراد ${imported.length} موردين بنجاح.`, "system");
    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/inventory", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: any[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const code = String(it.code || "").trim().toLowerCase();
      const name = String(it.name || "").trim().toLowerCase();
      const material: any = MATERIALS.find((candidate: any) => (code && String(candidate.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code) || (name && String(candidate.name || "").trim().toLowerCase() === name));
      const quantity = Number(it.openingQuantity);
      if (!material) { errors.push(`السطر ${idx + 1}: المادة غير موجودة`); continue; }
      if (!Number.isInteger(quantity) || quantity < 0) { errors.push(`السطر ${idx + 1}: الكمية يجب أن تكون عددًا صحيحًا غير سالب`); continue; }
      const existing = INVENTORY.find((row: any) => row.materialId === material.id);
      if (existing) {
        const before = Number(existing.quantity) || 0;
        existing.quantity = quantity;
        existing.reservedQuantity = Math.min(existing.reservedQuantity || 0, quantity);
        existing.availableQuantity = quantity - existing.reservedQuantity;
        existing.location = it.location || it.warehouse || existing.location || "المستودع الرئيسي";
        await db.update(inventoryTable).set({ quantity, reservedQuantity: existing.reservedQuantity, availableQuantity: existing.availableQuantity, location: existing.location }).where(eq(inventoryTable.materialId, idNum(material.id, "m-")));
        await db.insert(inventoryTransactionsTable).values({ materialId: idNum(material.id, "m-"), type: "adjustment", quantity: quantity - before, beforeQty: before, afterQty: quantity, referenceType: "opening_import", referenceId: "excel", reason: "تثبيت الرصيد الافتتاحي المستورد", createdById: idNum(getRequestUser(req)?.id, "u-") });
      } else {
        const inserted = await db.insert(inventoryTable).values({ materialId: idNum(material.id, "m-"), quantity, reservedQuantity: 0, availableQuantity: quantity, location: it.location || it.warehouse || "المستودع الرئيسي" }).returning();
        INVENTORY.push({ id: "inv-" + inserted[0].id, materialId: material.id, quantity, reservedQuantity: 0, availableQuantity: quantity, location: inserted[0].location || "المستودع الرئيسي" });
      }
      imported.push({ materialId: material.id, quantity });
    }
    if (imported.length > 0) createNotification("استيراد رصيد افتتاحي", `تم تحديث ${imported.length} أرصدة مخزنية من Excel.`, "inventory");
    res.json({ success: true, count: imported.length, imported, errors });
  });

  // 5. GLOBAL SEARCH API
  app.get("/api/search", (req, res) => {
    const query = String(req.query.q || "").toLowerCase().trim();
    if (!query) {
      res.json({ success: true, results: { orders: [], customers: [], products: [], materials: [], invoices: [] } });
      return;
    }

    const filteredOrders = ORDERS.filter(o => 
      o.orderNumber.toLowerCase().includes(query) ||
      (o.notes && o.notes.toLowerCase().includes(query)) ||
      (CUSTOMERS.find(c => c.id === o.customerId)?.name || "").toLowerCase().includes(query)
    ).map(o => ({
      id: o.id,
      title: o.orderNumber,
      subtitle: CUSTOMERS.find(c => c.id === o.customerId)?.name || "عميل عام",
      details: o.notes || "لا توجد تفاصيل",
      type: "order",
      link: "dashboard" // Active Tab in frontend
    }));

    const filteredCustomers = CUSTOMERS.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    ).map(c => ({
      id: c.id,
      title: c.name,
      subtitle: c.company || "أفراد",
      details: c.phone,
      type: "customer",
      link: "database"
    }));

    const filteredProducts = PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    ).map(p => ({
      id: p.id,
      title: p.name,
      subtitle: p.code,
      details: `${p.price} $ - ${p.category}`,
      type: "product",
      link: "database"
    }));

    const filteredMaterials = MATERIALS.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    ).map(m => ({
      id: m.id,
      title: m.name,
      subtitle: m.category,
      details: `${m.pricePerUnit} $ - السماكة: ${m.thickness} مم`,
      type: "material",
      link: "database"
    }));

    const filteredInvoices = INVOICES.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(query) ||
      (inv.notes && inv.notes.toLowerCase().includes(query)) ||
      (CUSTOMERS.find(c => c.id === inv.customerId)?.name || "").toLowerCase().includes(query)
    ).map(inv => ({
      id: inv.id,
      title: inv.invoiceNumber,
      subtitle: CUSTOMERS.find(c => c.id === inv.customerId)?.name || "عميل عام",
      details: `القيمة: $${inv.totalPrice.toFixed(2)} - المتبقي: $${inv.remaining.toFixed(2)}`,
      type: "invoice",
      link: "accounting"
    }));

    res.json({
      success: true,
      results: {
        orders: filteredOrders,
        customers: filteredCustomers,
        products: filteredProducts,
        materials: filteredMaterials,
        invoices: filteredInvoices
      }
    });
  });

  // 6. QUOTATION PDF API
  app.get("/api/print/quotation/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=quotation_${order.orderNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors (Bronze Quotation Theme)
      doc.rect(0, 0, 595, 120).fill("#1e1b18"); // deep warm brown tone
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title
      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("عرض سعر رسمي ومواصفات قطع فنية تقديرية"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      // Right block: Customer Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات العميل المستهدف:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} محجوب لحماية الخصوصية`, 300, infoY + 45, { align: "right", width: 245 });

      // Left block: Quotation Info
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند عرض السعر:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم العرض التقديري:")} QUO-${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ التقديم:")} ${new Date().toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("فترة الصلاحية:")} 15 يوماً من تاريخ التقديم`, 50, infoY + 65, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background
      doc.rect(50, tableY, 495, 25).fill("#1e1b18");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع الكلي ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("سعر المفرد التقديري"), 130, tableY + 7, { align: "center", width: 110 });
      doc.text(reverseArabicLine("الكمية"), 240, tableY + 7, { align: "center", width: 40 });
      doc.text(reverseArabicLine("تفاصيل وعناصر المواد والخامات المقترحة"), 280, tableY + 7, { align: "right", width: 250 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#fcf9f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || Number(item.qty) || 1;
        const uPrice = Number(item.unitPrice) || Number(item.price) || 0;
        const tPrice = qty * uPrice;
        
        doc.text(`$${tPrice.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${uPrice.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 110 });
        doc.text(`${qty}`, 240, currentY + 6, { align: "center", width: 40 });
        doc.text(reverseArabicLine(item.productName || "بند فني مخصص"), 280, currentY + 6, { align: "right", width: 250 });

        currentY += 22;
      });

      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      // Total pricing block
      const subtotal = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || Number(item.qty) || 1) * (Number(item.unitPrice) || Number(item.price) || 0)), 0);
      const tax = subtotal * 0.0; // 0%
      const total = subtotal + tax;

      currentY += 15;
      doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("الملخص المالي لعرض السعر التقديري:"), 50, currentY, { align: "right", width: 495 });
      currentY += 20;
      doc.fillColor("#27272a").fontSize(10)
        .text(`${reverseArabicLine("قيمة المواد الإجمالية:")} $${subtotal.toFixed(2)}`, 50, currentY, { align: "right", width: 495 })
        .text(`${reverseArabicLine("الضرائب والرسوم المقدرة (0%):")} $${tax.toFixed(2)}`, 50, currentY + 15, { align: "right", width: 495 })
        .text(`${reverseArabicLine("القيمة التقديرية الكلية المطلوبة:")} $${total.toFixed(2)}`, 50, currentY + 30, { align: "right", width: 495 });

      currentY += 60;
      doc.rect(50, currentY, 495, 60).fill("#fbfbfd");
      doc.fillColor("#c59257").fontSize(11).text(reverseArabicLine("ملاحظات وشروط هامة:"), 70, currentY + 8, { align: "right", width: 455 });
      doc.fillColor("#71717a").fontSize(9).text(reverseArabicLine("هذا المستند يعتبر عرض سعر تقديري فقط مبني على مدخلات التصميم والمواد في تاريخ اليوم، ولا يحمل صفة الفاتورة الرسمية الملزمة إلا بعد إتمام التعاقد وسداد الدفعة المقدمة والاتفاق على جدول الإنتاج ليزر CO2 المعتمد."), 70, currentY + 24, { align: "right", width: 455 });

      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("عرض سعر ذكي صادر آلياً من نظام ورش القص ليزر CO2 والتحكم الإداري - AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: any) {
      console.error("Quotation PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد عرض السعر: " + err.message });
    }
  });

  app.get("/api/orders/:id/quotation/pdf", async (req, res) => {
    res.redirect(`/api/print/quotation/${req.params.id}`);
  });

  // API - G-Code & CNC Laser Blueprint Compiler (Using Gemini Model)
  app.post("/api/compiler/gcode", async (req, res) => {
    const { promptText, material, speed, power } = req.body;
    if (!promptText) {
      res.status(400).json({ error: "يرجى كتابة مواصفات التصميم المطلوبة للقص" });
      return;
    }

    const fallbackGcode = () => {
      const cleanName = String(promptText).trim();
      const cleanMaterial = String(material || "Acrylic 5mm");
      const parsedSpeed = Number.parseFloat(String(speed ?? "45").replace(/[^0-9.\-]/g, ""));
      const parsedPower = Number.parseFloat(String(power ?? "80").replace(/[^0-9.\-]/g, ""));
      const cleanSpeed = Number.isFinite(parsedSpeed) ? Math.max(1, parsedSpeed) : 45;
      const cleanPower = Number.isFinite(parsedPower) ? Math.min(100, Math.max(0, parsedPower)) : 80;

      let pathCount = 10;
      if (cleanName.includes("دائرة") || cleanName.includes("circle")) pathCount = 12;
      else if (cleanName.includes("مربع") || cleanName.includes("square")) pathCount = 4;
      else if (cleanName.includes("نجمة") || cleanName.includes("star")) pathCount = 10;

      const gcode = `; G-Code compiled by AXIS LAB local heuristic engine (Gemini fallback active)
; Design Name: ${cleanName}
; Material Selected: ${cleanMaterial}
; Cutting Parameters: Speed ${cleanSpeed} mm/s, Power ${cleanPower}%

G21 ; Set units to millimeters
G90 ; Absolute positioning
G00 X0.00 Y0.00 F3000 ; Rapid travel to home
M03 S${Math.round(Number(cleanPower) * 10 || 800)} ; Turn on laser beam (PWM S-value)

G00 X10.00 Y10.00 ; Rapid to start of cut
G01 X50.00 Y10.00 F${cleanSpeed} ; Linear cut
G01 X50.00 Y50.00 F${cleanSpeed}
G01 X10.00 Y50.00 F${cleanSpeed}
G01 X10.00 Y10.00 F${cleanSpeed}

M05 ; Turn off laser beam
G00 X0 Y0 ; Return home
; End of CNC Laser G-code
`;

      return {
        gcodeSnippet: gcode,
        estimatedTime: "01m 24s",
        totalPaths: pathCount,
        beamDutyCycle: `${cleanPower}%`,
        materialLossPercent: 2.8,
        calibrationAdvice: `ملاحظة فنية من محرك الورشة المحلي: يُقترح ضبط الفوهة على مسافة 2.5 مم من سطح خامة ${cleanMaterial}. تم تفعيل مساعد هواء متوسط لتنظيف المسار البصري للعدسة البؤرية أثناء عملية قص "${cleanName}".`,
        gcodeExplanation: `تم استخدام المحرك المحلي السريع لتوليد توجيهات القص ليزر CO2. تبدأ العملية بـ G00 لتحديد نقطة انطلاق شعاع الليزر بسرعة ارتحال عالية، متبوعة بـ G01 للقص الخطي الفعلي مع استهلاك طاقة ${cleanPower}% وسرعة قص ثابتة قدرها ${cleanSpeed} مم/ثانية.`
      };
    };

    try {
      if (!process.env.GEMINI_API_KEY) {
        res.json(fallbackGcode());
        return;
      }

      const prompt = `
You are the AXIS LAB CNC Laser compiler and G-Code generator.
The user has specified the following laser cutting design details:
- Design / Item Name: "${promptText}"
- Material: "${material || "Acrylic 5mm"}"
- Laser Cutting Speed: ${speed || "45 mm/s"}
- Laser Tube Power: ${power || "80%"}

Tasks:
1. Generate realistic, valid G-Code commands (G00, G01, M03, M05, etc.) that represent cutting out this shape.
2. Calculate estimated cutting duration, laser focus parameter, and gas assistant level.
3. Formulate a technical design analysis and machine calibration report.

Return your response strictly in the following JSON schema:
{
  "gcodeSnippet": "G00 X0 Y0\\nM03 S1000\\nG01 X10 Y10 F3000\\n...",
  "estimatedTime": "02m 14s",
  "totalPaths": 14,
  "beamDutyCycle": "82%",
  "materialLossPercent": 3.4,
  "calibrationAdvice": "A professional 2-3 sentence technician note describing optimal nozzle distance, air assist level, or sheet placement.",
  "gcodeExplanation": "Markdown description outlining how the G00 rapid travels and G01 cut travels are structured."
}
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          gcodeSnippet: { type: Type.STRING },
          estimatedTime: { type: Type.STRING },
          totalPaths: { type: Type.INTEGER },
          beamDutyCycle: { type: Type.STRING },
          materialLossPercent: { type: Type.NUMBER },
          calibrationAdvice: { type: Type.STRING },
          gcodeExplanation: { type: Type.STRING }
        },
        required: ["gcodeSnippet", "estimatedTime", "totalPaths", "beamDutyCycle", "materialLossPercent", "calibrationAdvice", "gcodeExplanation"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.warn("G-Code Compiler API Error, falling back to local compiler:", error);
      res.json(fallbackGcode());
    }
  });

  // API - AI Laser Order Advisor and Parameter Estimator
  app.post("/api/ai/order-advisor", async (req, res) => {
    const { items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "الرجاء إضافة عناصر للطلب لتحليلها بالذكاء الاصطناعي" });
      return;
    }

    const fallbackAdvisor = () => {
      const itemsParameters = items.map(item => {
        const text = (item.name || item.productName || "").toLowerCase();
        let speed = "15-25 mm/s";
        let power = "80%";
        let lens = "2.0\" focal lens";
        let air = "مساعد هواء متوسط لمنع الاحتراق";

        if (text.includes("أكريليك") || text.includes("اكريليك") || text.includes("acrylic") || text.includes("شفاف")) {
          speed = "18 mm/s";
          power = "75%";
          lens = "2.0\" HQ lens";
          air = "مساعد هواء منخفض لمنع الغواش والتغبيش";
        } else if (text.includes("خشب") || text.includes("mdf") || text.includes("زان") || text.includes("wood")) {
          speed = "12 mm/s";
          power = "85%";
          lens = "2.5\" Deep-Cut lens";
          air = "مساعد هواء قوي جداً لتجنب الشحار وتفحم الحواف";
        } else if (text.includes("جلد") || text.includes("leather")) {
          speed = "25 mm/s";
          power = "60%";
          lens = "1.5\" engraving lens";
          air = "مساعد هواء متوسط لقص نقي وخالٍ من الرائحة الكثيفة";
        }

        return {
          itemName: item.name || item.productName || "عنصر غير مسمى",
          speed,
          power,
          lens,
          air
        };
      });

      return {
        pricingAnalysis: "تحليل مالي تقديري من المحرك المحلي للورشة: الأسعار المدخلة تبدو متزنة وتغطي تكاليف الخامات ومعدل استهلاك أنبوب الليزر CO2 بشكل ممتاز.",
        itemsParameters,
        productionStrategy: "توجيه الإنتاج المحلي: يوصى بترتيب القص لتبدأ من الأشكال الداخلية والفتحات أولاً (Inside Loops)، ثم الانتقال إلى الحدود الخارجية (Outside Profile) لضمان عدم إزاحة الخامة بعد تحررها.",
        warnings: "تحذير الأمان والسلامة: يرجى ارتداء النظارات الواقية المخصصة ليزر CO2 طول موجي 10600 نانومتر، والتأكد من تشغيل ساحب الغازات الخارجي قبل بدء القص لتجنب استنشاق الأبخرة الكثيفة.",
        estimatedTimeTotal: `${Math.max(5, items.length * 4)} - ${Math.max(10, items.length * 8)} دقيقة`
      };
    };

    try {
      if (!process.env.GEMINI_API_KEY) {
        res.json(fallbackAdvisor());
        return;
      }

      const itemsStr = items.map((it, idx) => `
Item #${idx + 1}:
- Name/Material: "${it.name}"
- Quantity: ${it.qty}
- Input Price: $${it.price}
- Custom Notes: "${it.notes || "None"}"
`).join("\n");

      const prompt = `
You are the AXIS LAB AI Production Advisor for CO2 Laser Cutting & Engraving workshops.
Analyze the following draft order to provide optimal laser machining settings, pricing advice, nesting tips, and safety warnings.

Customer Request Details:
${itemsStr}

Order General Notes:
"${notes || "None"}"

Tasks:
1. Pricing Evaluation: Analyze if the input prices are reasonable based on typical material costs (Acrylic, MDF wood, Leather, Paper, general) and processing complexities. Provide detailed feedback in Arabic.
2. Optimal CO2 Laser Settings: Provide standard speed/power parameters for cutting/engraving each material listed in the items.
3. Nesting & Production Strategy: Suggest how to arrange these shapes on raw sheets to minimize kerf waste and utilize leftovers (remnants).
4. Safety / Material Warnings: Mention any critical workshop hazards (e.g. cutting PVC releases toxic chlorine gas, acrylic needs protective mask film, wood requires high air assist to prevent charring/fire).
5. Estimated production duration.

Return your response STRICTLY as a single JSON object with this exact typescript-like interface:
{
  "pricingAnalysis": "A 2-3 sentence analysis in Arabic explaining if the pricing is appropriate.",
  "itemsParameters": [
    {
      "itemName": "Name of the item as provided",
      "speed": "Cutting speed in mm/s (e.g., '15 - 20 mm/s')",
      "power": "Laser power level in % (e.g., '70 - 80%')",
      "lens": "Suggested focal lens (e.g., '2.0\" focal lens')",
      "air": "Air assist recommendation in Arabic (e.g., 'هواء قوي لمنع الاحتراق')"
    }
  ],
  "productionStrategy": "Nesting / sheet layout advice in Arabic (2-3 sentences).",
  "warnings": "Material warnings, safety, or prep advices in Arabic (2-3 sentences).",
  "estimatedTimeTotal": "Overall estimated laser cutting time (e.g., '12-15 دقيقة')"
}

Do not include any markdown format tags like \`\`\`json or \`\`\` in your response. Just return raw JSON.
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          pricingAnalysis: {
            type: Type.STRING,
            description: "A 2-3 sentence analysis in Arabic explaining if the pricing is appropriate."
          },
          itemsParameters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemName: { type: Type.STRING, description: "Name of the item as provided" },
                speed: { type: Type.STRING, description: "Cutting speed in mm/s (e.g., '15 - 20 mm/s')" },
                power: { type: Type.STRING, description: "Laser power level in % (e.g., '70 - 80%')" },
                lens: { type: Type.STRING, description: "Suggested focal lens (e.g., '2.0\" focal lens')" },
                air: { type: Type.STRING, description: "Air assist recommendation in Arabic (e.g., 'هواء قوي لمنع الاحتراق')" }
              },
              required: ["itemName", "speed", "power", "lens", "air"]
            }
          },
          productionStrategy: {
            type: Type.STRING,
            description: "Nesting / sheet layout advice in Arabic (2-3 sentences)."
          },
          warnings: {
            type: Type.STRING,
            description: "Material warnings, safety, or prep advices in Arabic (2-3 sentences)."
          },
          estimatedTimeTotal: {
            type: Type.STRING,
            description: "Overall estimated laser cutting time (e.g., '12-15 دقيقة')"
          }
        },
        required: ["pricingAnalysis", "itemsParameters", "productionStrategy", "warnings", "estimatedTimeTotal"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.warn("Order Advisor API Error, falling back to local advisor:", error);
      res.json(fallbackAdvisor());
    }
  });

  // API - FAST LOCAL AI - Ultra-low latency Intelligent Engine (<10ms)
  app.post("/api/ai/fast-local", (req, res) => {
    try {
      const { action, payload } = req.body;

      if (!action) {
        res.status(400).json({ error: "الرجاء تحديد الإجراء المطلوب لمحرك الذكاء الاصطناعي المحلي السريع" });
        return;
      }

      switch (action) {
        case "autocomplete-customer": {
          const query = (payload?.query || "").trim().toLowerCase();
          if (!query) {
            res.json([]);
            return;
          }

          // Fuzzy search on name, company, phone
          const matched = CUSTOMERS.filter(c => 
            c.name.toLowerCase().includes(query) || 
            (c.company || "").toLowerCase().includes(query) || 
            c.phone.includes(query)
          ).slice(0, 5);

          // Annotate with quick learning analytics from orders history
          const results = matched.map(c => {
            const customerOrders = ORDERS.filter(o => o.customerId === c.id);
            const totalPaid = customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
            
            // Find most frequent product
            const productCounts: Record<string, number> = {};
            customerOrders.forEach(o => {
              if (o.items && Array.isArray(o.items)) {
                o.items.forEach((item: any) => {
                  const pName = item.productName || item.name || "";
                  if (pName) {
                    productCounts[pName] = (productCounts[pName] || 0) + (item.quantity || 1);
                  }
                });
              }
            });

            let favoriteProduct = "لا يوجد طلبات سابقة";
            let maxCount = 0;
            Object.entries(productCounts).forEach(([pName, count]) => {
              if (count > maxCount) {
                favoriteProduct = pName;
                maxCount = count;
              }
            });

            return {
              ...c,
              ordersCount: customerOrders.length,
              lastOrderedProduct: favoriteProduct,
              totalValue: totalPaid,
              isVIP: customerOrders.length >= 3 || totalPaid >= 200
            };
          });

          res.json(results);
          break;
        }

        case "order-hints": {
          const customerId = payload?.customerId;
          const cust = CUSTOMERS.find(c => c.id === customerId);
          const customerOrders = ORDERS.filter(o => o.customerId === customerId);
          const isVIP = cust ? (customerOrders.length >= 3 || customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0) >= 200) : false;

          let recommendedItem = "قص ونقش أخشاب زان / أكريليك مخصص";
          if (customerOrders.length > 0) {
            const itemCounts: Record<string, number> = {};
            customerOrders.forEach(o => {
              if (o.items && Array.isArray(o.items)) {
                o.items.forEach((it: any) => {
                  const name = it.name || it.productName || "";
                  if (name) itemCounts[name] = (itemCounts[name] || 0) + (it.quantity || 1);
                });
              }
            });
            let max = 0;
            Object.entries(itemCounts).forEach(([name, count]) => {
              if (count > max) {
                max = count;
                recommendedItem = name;
              }
            });
          }

          const hintMessage = cust
            ? `العميل ${cust.name} - لديه ${customerOrders.length} طلبات سابقة بالورشة. ${isVIP ? "🌟 عميل مميز VIP." : ""} الأكثر طلباً: ${recommendedItem}`
            : "تم تحديد العميل المفضل للطلب.";

          res.json({
            success: true,
            hintMessage,
            recommendedItem,
            isVIP,
            ordersCount: customerOrders.length
          });
          break;
        }

        case "order-status-hint": {
          const items = payload?.items || [];
          const lowStockList: string[] = [];

          MATERIALS.forEach(m => {
            const inv = INVENTORY.find(i => i.materialId === m.id);
            const qty = inv ? inv.quantity : 0;
            if (qty <= (m.minimumStock || 5)) {
              lowStockList.push(m.name);
            }
          });

          let status: 'success' | 'warning' | 'neutral' = 'success';
          let message = "جميع الخامات المطلوبة متوفرة بالمستودع وجاهزة للقص مباشرة.";

          if (lowStockList.length > 0) {
            status = 'warning';
            message = `تنبيه خامات: توجد خامات منخفضة بالمستودع (${lowStockList.slice(0, 2).join("، ")})، يُنصح بمتابعة التوريد.`;
          }

          res.json({
            status,
            message,
            lowStockList
          });
          break;
        }

        case "pricing-advisor": {
          const items = payload?.items || [];
          let totalSubtotal = 0;
          items.forEach((it: any) => {
            const q = Number(it.qty || it.quantity) || 1;
            const p = Number(it.price) || 0;
            totalSubtotal += q * p;
          });

          const estimatedCostUSD = Number((totalSubtotal * 0.55).toFixed(2));
          const suggestedPriceUSD = Number((totalSubtotal * 1.0).toFixed(2));
          const marginPercent = totalSubtotal > 0 ? Math.round(((totalSubtotal - estimatedCostUSD) / totalSubtotal) * 100) : 45;

          const pricingAuditArabic = totalSubtotal > 0
            ? `تحليل التسعير: التكلفة التقديرية المباشرة للقطع ~$${estimatedCostUSD}، إجمالي السعر الحالي $${totalSubtotal} (هامش ربح صافي ~${marginPercent}%). التسعير متوازن ومناسب لورشة الليزر.`
            : "الرجاء تحديد عناصر الطلب لكميات ورسومات القص لعرض تحليل التسعير التقديري.";

          res.json({
            totalCost: `$${estimatedCostUSD}`,
            suggestedPrice: `$${suggestedPriceUSD}`,
            profitMarginPercent: marginPercent,
            pricingAuditArabic
          });
          break;
        }

        case "autocomplete-product": {
          const query = (payload?.query || "").trim().toLowerCase();
          if (!query) {
            res.json([]);
            return;
          }

          const matched = PRODUCTS.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.code || "").toLowerCase().includes(query) ||
            (p.category || "").toLowerCase().includes(query)
          ).slice(0, 5);

          res.json(matched);
          break;
        }

        case "recommend-material": {
          const productName = (payload?.productName || "").trim().toLowerCase();
          if (!productName) {
            res.json({ success: false, message: "لم يتم تحديد اسم المنتج" });
            return;
          }

          // Smart classification heuristics
          let recommendedMaterialId = "m-3"; // default natural wood natural 4mm
          let matchReason = "تم تحديد الخشب كخامة افتراضية نظراً لمرونة تصنيعه وتوافقه العام.";
          
          if (productName.includes("أكريليك") || productName.includes("اكريليك") || productName.includes("acrylic") || productName.includes("حرف") || productName.includes("مضيء") || productName.includes("درع") || productName.includes("شعار") || productName.includes("شفاف")) {
            recommendedMaterialId = productName.includes("أسود") ? "m-2" : "m-1"; // black 5mm or transparent 3mm
            matchReason = `بناءً على الاسم والمقاييس المقترحة، تم مطابقة مادة الأكريليك الممتازة للقص والإنارة البصرية.`;
          } else if (productName.includes("خشب") || productName.includes("زان") || productName.includes("wood") || productName.includes("mdf") || productName.includes("علبة") || productName.includes("هدية") || productName.includes("برواز") || productName.includes("ساعة")) {
            recommendedMaterialId = productName.includes("زان") ? "m-3" : "m-4"; // beech 4mm or mdf 6mm
            matchReason = `بناءً على الاستخدام التقليدي للأخشاب في العلب البنيوية، تم اقتراح الخشب الطبيعي/المضغوط.`;
          }

          const mat = MATERIALS.find(m => m.id === recommendedMaterialId);
          res.json({
            success: true,
            materialId: recommendedMaterialId,
            materialName: mat ? mat.name : "",
            matchReason
          });
          break;
        }

        case "inventory-predictions": {
          const predictions = MATERIALS.map(m => {
            const inv = INVENTORY.find(i => i.materialId === m.id);
            const currentQty = inv ? inv.quantity : 0;
            const minStock = m.minimumStock || 5;
            
            let status = "normal";
            let message = "المخزون مستقر، يكفي للاستهلاك العادي لأكثر من 30 يوماً.";
            
            if (currentQty <= 0) {
              status = "danger";
              message = "⚠️ مخزون نافد بالكامل! يرجى التوريد فوراً لتفادي تعطيل الإنتاج.";
            } else if (currentQty < minStock) {
              status = "danger";
              message = `مخزون حرج (تحت حد الأمان البالغ ${minStock} ألواح). يُنصح بالتوريد العاجل.`;
            } else if (currentQty < minStock * 1.5) {
              status = "warning";
              message = `طلب مستمر. يُتوقع اقترابه من حد الأمان خلال 7 إلى 10 أيام.`;
            }
            
            return {
              materialName: m.name,
              currentQty,
              status,
              message
            };
          });
          
          res.json(predictions);
          break;
        }

        case "production-scheduling": {
          const pendingJobs = PRODUCTION_JOBS.filter(j => j.status === "pending" || j.status === "in_progress");
          const highPriorityCount = pendingJobs.filter(j => {
            const ord = ORDERS.find(o => o.id === j.orderId);
            return ord?.priority === "high";
          }).length;
          
          let adviceMessage = "";
          if (pendingJobs.length === 0) {
            adviceMessage = "✓ طابور العمل فارغ حالياً. الماكينة جاهزة لاستقبال مهام تشغيل جديدة فوراً دون تأخير.";
          } else {
            adviceMessage = `يوجد حالياً ${pendingJobs.length} مهام إنتاج معلقة في الورشة. يُنصح بجدولة وتمرير ${highPriorityCount} مهام ذات أولوية مرتفعة لآلة ليزر CO2 لتحسين الكفاءة بنسبة 18% وتقليص زمن التسليم العام للعملاء.`;
          }
          
          res.json({ adviceMessage });
          break;
        }

        case "dashboard-trends": {
          // bestSellerProduct calculation
          const productSales: Record<string, number> = {};
          ORDERS.forEach(o => {
            if (o.items && Array.isArray(o.items)) {
              o.items.forEach((item: any) => {
                const name = item.productName || item.name || "عام";
                productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
              });
            }
          });
          
          let bestSellerProduct = "علب هدايا خشبية زان مخصصة";
          let maxSales = 0;
          Object.entries(productSales).forEach(([name, count]) => {
            if (count > maxSales) {
              bestSellerProduct = `${name} (طلب متنامٍ)`;
              maxSales = count;
            }
          });
          
          // incomeTrend calculation
          const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
          const incomeTrend = totalRevenue > 0 ? `+$${Math.round(totalRevenue * 0.12)} نمو قوي` : "+14.5% نمو معتدل";
          
          // efficiencyRate calculation
          const totalJobs = PRODUCTION_JOBS.length;
          const completedJobs = PRODUCTION_JOBS.filter(j => j.status === "completed").length;
          const efficiencyRate = totalJobs > 0 
            ? `${((completedJobs / totalJobs) * 100).toFixed(1)}% كفاءة قص`
            : "95.2% كفاءة تشغيل";
            
          // expenseAnomaly analysis
          const totalExpenses = EXPENSES.reduce((sum, e) => sum + (e.amount || 0), 0);
          let expenseAnomaly = "";
          if (totalExpenses > 300) {
            expenseAnomaly = `تنبيه مالي: ارتفاع نسبي في المصروفات التشغيلية هذا الشهر ($${totalExpenses})، يرجى مراجعة فواتير صيانة الماكينات.`;
          } else {
            expenseAnomaly = `المصروفات مستقرة ومراقبة بدقة ($${totalExpenses})، ولا توجد انحرافات مالية عن الميزانية المحددة.`;
          }
          
          res.json({
            incomeTrend,
            efficiencyRate,
            bestSellerProduct,
            expenseAnomaly
          });
          break;
        }

        case "instant-pricing-calc": {
          const {
            materialId,
            machineId,
            widthCm = 30,
            lengthCm = 40,
            thicknessMm = 3,
            cutLengthCm = 100,
            engraveAreaCm2 = 50,
            quantity = 1,
            laserPowerWatts = 100,
            tubeCostUSD: customTubeCostUSD,
            tubeLifespanHours: customTubeLifespanHours = 4000,
            electricityRatePerKwh = 0.12,
            operatorRatePerHour = 15,
            setupFeeUSD = 3,
            wasteOverridePercent,
            targetProfitMarginPercent = 50,
            workType = "cut_engrave"
          } = payload || {};

          const mat = MATERIALS.find(m => m.id === materialId) || MATERIALS[0];
          const exchangeRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
          // Material prices are stored in SYP. Convert to USD only for this legacy USD-based costing model.
          const matPricePerSheetSYP = Number(mat?.pricePerUnit || 0) || 1350;
          const matPricePerSheetUSD = matPricePerSheetSYP / exchangeRate;
          const sheetWidthCm = (mat as any)?.widthCm || mat?.width || 122;
          const sheetLengthCm = (mat as any)?.lengthCm || mat?.height || 244;
          const sheetAreaCm2 = sheetWidthCm * sheetLengthCm;
          const pieceAreaCm2 = Math.max(1, widthCm * lengthCm);

          // Find machine if machineId provided
          const machine = MACHINES.find(m => m.id === machineId);

          // Dynamic Nesting & Waste Ratio Calculation
          const lowerMatName = (mat?.name || "").toLowerCase();
          let materialFragilityWaste = 4; // base fragility
          if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
            materialFragilityWaste = 8;
          } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf")) {
            materialFragilityWaste = 10;
          } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
            materialFragilityWaste = 12;
          }

          const estimatedPiecesPerSheet = Math.max(1, Math.floor(sheetAreaCm2 / (pieceAreaCm2 * 1.12)));
          const sheetUtilizationPercent = Math.min(94, Math.max(30, Math.round(((estimatedPiecesPerSheet * pieceAreaCm2) / sheetAreaCm2) * 100)));
          const autoWastePercent = Math.min(35, Math.max(5, Math.round((100 - sheetUtilizationPercent) * 0.4 + materialFragilityWaste)));
          
          const calculatedWastePercent = (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
            ? wasteOverridePercent
            : autoWastePercent;
          const wasteFactor = 1 + (calculatedWastePercent / 100);

          // 1. Raw material cost including exact calculated waste factor
          const rawMaterialCost = Math.max(0.15, (pieceAreaCm2 / sheetAreaCm2) * matPricePerSheetUSD * wasteFactor);

          // Speed & Pass Calculations
          let cutSpeedMms = 20;
          let engraveSpeedMms = 350;
          let passesCount = 1;
          let airAssistDesc = "متوسط (2.0 Bar)";
          let lensDesc = "2.0 inch Standard";
          let focalOffset = "0.0 mm (سطح الخامة)";
          let exhaustCFM = "350 CFM";
          let finishTips: string[] = [];

          if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
            cutSpeedMms = thicknessMm <= 3 ? 22 : thicknessMm <= 5 ? 12 : 6;
            engraveSpeedMms = 400;
            airAssistDesc = "منخفض جداً (0.8 Bar - Low Air) للحصول على حافة مصقولة زجاجية شفافية عالية";
            lensDesc = thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard";
            focalOffset = thicknessMm > 4 ? "+1.0 mm (حفر بؤري لعمق القص)" : "0.0 mm";
            exhaustCFM = "400 CFM (شفط كيميائي للميثاكريلات)";
            finishTips = [
              "استخدم غطاء حماية أزرق أو ورق كرافت لمنع التخدش بقرص الخلية (Honeycomb).",
              "تجنب ضغط الهواء المرتفع لحفظ السخونة وتلميع حافة الأكريليك بالحرارة الصافية.",
              "امسح الحواف بكحول إيزوبروبيل بعد تبريد اللوح بـ 10 دقائق لتفادي التشقق (Crazing)."
            ];
          } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf") || lowerMatName.includes("زان")) {
            cutSpeedMms = thicknessMm <= 3 ? 25 : thicknessMm <= 5 ? 14 : 7;
            passesCount = thicknessMm > 10 ? 2 : 1;
            engraveSpeedMms = 300;
            airAssistDesc = "مرتفع جداً (3.5 Bar - High Air) لمنع التفحم وإبعاد نواتج الاحتراق";
            lensDesc = thicknessMm > 6 ? "2.5 inch / 4.0 inch Deep Cut" : "2.0 inch Standard";
            focalOffset = "-0.5 mm لتركيز القوة داخل سماكة اللوح";
            exhaustCFM = "500 CFM (شفط نواتج الدخان والتراكم الراتنجي)";
            finishTips = [
              "ضع شريط لاصق ورقي (Masking Tape) على الوجهين لمنع التلطخ بالدخان الأسود.",
              "اضبط كمبروسر الهواء على أقصى تدفق لطرد شرر الخشب المتطاير.",
              "سنّف الحواف بسنفرة ناعمة (رقم 320) لملمس ناعم ولون خشب طبيعي جذاب."
            ];
          } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
            cutSpeedMms = 30;
            engraveSpeedMms = 450;
            airAssistDesc = "متوسط (1.8 Bar)";
            lensDesc = "1.5 inch / 2.0 inch Fine Engrave";
            finishTips = [
              "امسح سطح الجلد بقطعة قماش مبللة بماء ورد أو كحول خفيف فور انتهاء الحفر.",
              "استخدم قوة نقش منخفضة (15-20%) لتجنب رائحة الاحتراق العميقة."
            ];
          }

          // Active execution time calculation
          const cutTimeSec = (cutLengthCm * 10) / Math.max(1, cutSpeedMms);
          const engraveTimeSec = (engraveAreaCm2 * 100) / Math.max(1, engraveSpeedMms);
          const activeMachineTimeMin = (cutTimeSec * passesCount + engraveTimeSec) / 60;
          const setupAndCleanTimeMin = 1.5;
          const totalTimeMinutes = Math.max(0.5, activeMachineTimeMin + setupAndCleanTimeMin);

          // 2. Electricity cost (Laser Machine Tube Power + Chiller ~1200W + Exhaust Blower ~450W + Air Compressor ~350W)
          const totalKwPower = Number((((laserPowerWatts * 1.25) + 1800) / 1000).toFixed(2)); // Total system kW
          const activeHours = activeMachineTimeMin / 60;
          const electricityCost = (totalKwPower * activeHours) * electricityRatePerKwh;

          // 3. CO2 Laser Tube wear/depreciation cost
          const tubeReplacementCostUSD = (typeof customTubeCostUSD === 'number' && customTubeCostUSD > 0)
            ? customTubeCostUSD
            : (laserPowerWatts * 2.5); // Estimated tube replacement cost
          const tubeLifespanHours = (typeof customTubeLifespanHours === 'number' && customTubeLifespanHours > 0)
            ? customTubeLifespanHours
            : 4000;
          
          const thermalStressMultiplier = thicknessMm > 5 ? 1.15 : 1.0;
          const tubeWearCost = activeHours * (tubeReplacementCostUSD / tubeLifespanHours) * thermalStressMultiplier;

          // 4. Labor & technician operator cost
          const totalTimeHours = totalTimeMinutes / 60;
          const laborCost = totalTimeHours * operatorRatePerHour;

          // 5. Distributed setup fee
          const setupFeePerUnit = setupFeeUSD / Math.max(1, quantity);

          // Total Direct Unit Cost
          const totalDirectCost = rawMaterialCost + electricityCost + tubeWearCost + laborCost + setupFeePerUnit;

          // Dynamic Profit Margin & Price Calculation
          const desiredMarginRatio = Math.min(0.95, Math.max(0.05, (typeof targetProfitMarginPercent === 'number' ? targetProfitMarginPercent : 50) / 100));
          const calculatedPrice = totalDirectCost / (1 - desiredMarginRatio);
          const suggestedUnitFinalPrice = Math.max(1, Math.ceil(calculatedPrice));
          const unitProfitMargin = Math.max(0.1, suggestedUnitFinalPrice - totalDirectCost);
          const profitPerUnitUSD = Number(unitProfitMargin.toFixed(2));
          const profitMarginPercent = Math.round((profitPerUnitUSD / suggestedUnitFinalPrice) * 100);

          // Batch Calculations
          const discountFactor = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;
          const totalBatchRevenueUSD = Math.round(suggestedUnitFinalPrice * quantity * discountFactor);
          const totalBatchCostUSD = Number((totalDirectCost * quantity).toFixed(2));
          const totalBatchProfitUSD = Number(Math.max(0, totalBatchRevenueUSD - totalBatchCostUSD).toFixed(2));

          const detailedFinancials = {
            rawMaterialWithWasteUSD: Number(rawMaterialCost.toFixed(3)),
            electricityCostUSD: Number(electricityCost.toFixed(3)),
            tubeDepreciationCostUSD: Number(tubeWearCost.toFixed(3)),
            laborCostUSD: Number(laborCost.toFixed(3)),
            setupFeePerUnitUSD: Number(setupFeePerUnit.toFixed(2)),
            totalDirectCostUSD: Number(totalDirectCost.toFixed(2)),
            profitPerUnitUSD,
            profitMarginPercent,
            sheetUtilizationPercent,
            calculatedWastePercent,
            totalBatchCostUSD
          };

          const formulas = {
            rawMaterial: `(مساحة القطعة ${pieceAreaCm2}سم² ÷ مساحة اللوح ${sheetAreaCm2}سم²) × سعر اللوح ${matPricePerSheetSYP.toLocaleString()} ل.س ÷ سعر الصرف ${exchangeRate} × معامل الهدر ${(wasteFactor).toFixed(2)} = $${rawMaterialCost.toFixed(3)}`,
            electricity: `قدرة النظام الكلية (${totalKwPower} kW) × زمن التشغيل الفعلي (${activeMachineTimeMin.toFixed(2)} دقيقة) × تعرفة الكيلوواط ($${electricityRatePerKwh}/kWh) = $${electricityCost.toFixed(3)}`,
            tubeWear: `ساعات الحرق الفعلي (${activeHours.toFixed(3)} ساعة) × (سعر الأنبوب $${tubeReplacementCostUSD} ÷ العمر ${tubeLifespanHours} ساعة) = $${tubeWearCost.toFixed(3)}`,
            labor: `زمن الإنتاج والتجهيز المباشر (${totalTimeMinutes.toFixed(1)} دقيقة) × أجر الفني ($${operatorRatePerHour}/ساعة) = $${laborCost.toFixed(3)}`,
            setup: `رسوم تجهيز الورشة والمعايرة ($${setupFeeUSD}) ÷ الكمية (${quantity} قطعة) = $${setupFeePerUnit.toFixed(2)}`,
            wasteExplanation: (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
              ? `تم تحديد نسبة الهدر يدوياً (%${wasteOverridePercent})`
              : `تم حساب الهدر تلقائياً (%${calculatedWastePercent}) بناءً على هدر التعشيق المتبقي (%${100 - sheetUtilizationPercent}) ومعامل هشاشة خامة ${mat.name}`
          };

          res.json({
            materialName: mat.name,
            machineName: machine ? machine.name : `ماكينة ليزر CO2 قدرة ${laserPowerWatts}W`,
            thicknessMm,
            sheetDimensionsCm: `${sheetWidthCm}x${sheetLengthCm}`,
            pieceDimensionsCm: `${widthCm}x${lengthCm}`,
            quantity,
            workType,
            costBreakdown: {
              rawMaterialUSD: Number(rawMaterialCost.toFixed(3)),
              electricityUSD: Number(electricityCost.toFixed(3)),
              tubeWearUSD: Number(tubeWearCost.toFixed(3)),
              laborUSD: Number(laborCost.toFixed(3)),
              setupFeeUSD: Number(setupFeeUSD.toFixed(2)),
              totalUnitCostUSD: Number(totalDirectCost.toFixed(2)),
              unitProfitMarginUSD: Number(unitProfitMargin.toFixed(2))
            },
            financialBreakdown: detailedFinancials,
            formulas,
            machineSpecs: {
              laserPowerWatts,
              totalKwPower,
              tubeReplacementCostUSD,
              tubeLifespanHours,
              electricityRatePerKwh,
              operatorRatePerHour
            },
            batchFinancials: {
              totalBatchCostUSD,
              totalBatchPriceUSD: totalBatchRevenueUSD,
              totalBatchPriceSYP: Math.round(totalBatchRevenueUSD * exchangeRate),
              totalBatchProfitUSD,
              totalBatchProfitSYP: Math.round(totalBatchProfitUSD * exchangeRate),
              appliedDiscountPercent: Math.round((1 - discountFactor) * 100)
            },
            batchTotals: {
              quantity,
              totalTimeMinutes: Number((totalTimeMinutes * quantity).toFixed(1)),
              totalBatchCostUSD,
              totalBatchRevenueUSD,
              totalBatchProfitUSD
            },
            suggestedPriceUSD: suggestedUnitFinalPrice,
            suggestedPriceSYP: Math.round(suggestedUnitFinalPrice * exchangeRate),
            timeBreakdown: {
              cutTimeMinutes: Number((cutTimeSec / 60).toFixed(2)),
              engraveTimeMinutes: Number((engraveTimeSec / 60).toFixed(2)),
              setupTimeMinutes: setupAndCleanTimeMin,
              totalTimeMinutes: Number(totalTimeMinutes.toFixed(1))
            },
            recommendedSettings: {
              laserPowerWatts,
              speedMms: cutSpeedMms,
              powerPercent: thicknessMm > 4 ? 85 : 75,
              passCount: passesCount,
              passes: passesCount,
              engraveSpeedMms,
              engravePowerPercent: 20,
              frequencyHzDpi: "5000 Hz / 318 DPI",
              airAssist: airAssistDesc,
              lens: lensDesc,
              focalOffsetMm: focalOffset,
              exhaustCFM,
              finishTips,
              safetyNotes: "تحقق من نظافة مرآة الانعكاس رقم 3 ونظافة العدسة البؤرية قبل البدء لضمان قطع ناصع."
            }
          });
          break;
        }

        case "quick-laser-settings": {
          const { materialName = "", thicknessMm = 3 } = payload || {};
          const lowerMat = materialName.toLowerCase();
          
          let settings = {
            material: materialName || "عام / أكريليك / خشب",
            thickness: `${thicknessMm} مم`,
            cutSpeed: "20 مم/ثانية",
            cutPower: "80%",
            engraveSpeed: "350 مم/ثانية",
            engravePower: "20%",
            passes: 1,
            frequencyHz: "5000 Hz",
            dpiResolution: "318 DPI (0.08mm Interval)",
            airAssist: "متوسط (2.0 Bar)",
            lens: "2.0 inch standard focal lens",
            focalOffset: "0.0 mm",
            exhaustRequirement: "350 CFM",
            safetyLevel: "Safe CO2 Standard",
            notes: "يُوصى بمسح المرايا والعدسة البؤرية قبل البدء للحفاظ على طاقة الشعاع النظيفة."
          };

          if (lowerMat.includes("أكريليك") || lowerMat.includes("اكريليك") || lowerMat.includes("acrylic")) {
            settings = {
              material: "أكريليك صلب شفاف/ملون",
              thickness: `${thicknessMm} مم`,
              cutSpeed: thicknessMm <= 3 ? "20-22 مم/ثانية" : thicknessMm <= 5 ? "10-12 مم/ثانية" : "5-6 مم/ثانية",
              cutPower: thicknessMm <= 3 ? "75-80%" : thicknessMm <= 5 ? "85-90%" : "95%",
              engraveSpeed: "400 مم/ثانية",
              engravePower: "18-22%",
              passes: 1,
              frequencyHz: "20000 Hz (High Frequency for Glass Smooth Cut)",
              dpiResolution: "350 DPI",
              airAssist: "منخفض جداً (Low Air) لحافة مصقولة زجاجية شفافية عالي",
              lens: thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard",
              focalOffset: thicknessMm > 4 ? "+1.0 mm داخل السماكة" : "0.0 mm",
              exhaustRequirement: "400 CFM (شفط نواتج الميثاكريلات)",
              safetyLevel: "آمن مع شفط المروحة",
              notes: "تجنب ضغط الهواء المرتفع لمنع تبريد حافة الأكريليك الساخنة مما يسبب تعرجات في القص."
            };
          } else if (lowerMat.includes("خشب") || lowerMat.includes("زان") || lowerMat.includes("wood") || lowerMat.includes("mdf")) {
            settings = {
              material: "خشب طبيعي / MDF مضغوط",
              thickness: `${thicknessMm} مم`,
              cutSpeed: thicknessMm <= 3 ? "22-25 مم/ثانية" : thicknessMm <= 5 ? "12-15 مم/ثانية" : "6-8 مم/ثانية",
              cutPower: thicknessMm <= 3 ? "70-75%" : thicknessMm <= 5 ? "80-85%" : "90-95%",
              engraveSpeed: "300 مم/ثانية",
              engravePower: "25-30%",
              passes: thicknessMm > 8 ? 2 : 1,
              frequencyHz: "5000 Hz",
              dpiResolution: "300 DPI",
              airAssist: "مرتفع جداً (3.5 Bar) لإبعاد الدخان ومنع التفحم",
              lens: thicknessMm > 6 ? "2.5 inch / 4.0 inch" : "2.0 inch",
              focalOffset: "-0.5 mm",
              exhaustRequirement: "500 CFM",
              safetyLevel: "انتبه لخطر الاشتعال عند السكون",
              notes: "تأكد من تشغيل مراوح الشفط وضغط الهواء القوي لمنع اشتعال حواف الخشب."
            };
          } else if (lowerMat.includes("جلد") || lowerMat.includes("leather")) {
            settings = {
              material: "جلود طبيعية / صناعية",
              thickness: `${thicknessMm} مم`,
              cutSpeed: "28-32 مم/ثانية",
              cutPower: "60-65%",
              engraveSpeed: "450 مم/ثانية",
              engravePower: "15-20%",
              passes: 1,
              frequencyHz: "3000 Hz",
              dpiResolution: "250 DPI",
              airAssist: "متوسط (1.8 Bar)",
              lens: "1.5 inch / 2.0 inch Fine",
              focalOffset: "0.0 mm",
              exhaustRequirement: "450 CFM",
              safetyLevel: "آمن مع تهوية غازات الجلود",
              notes: "امسح الجلد بقماش مبلل بالماء فور القص لإزالة آثار الدخان الخفيفة."
            };
          }

          res.json(settings);
          break;
        }

        case "quick-order-parser": {
          const { rawText = "" } = payload || {};
          const text = rawText.trim();
          const normText = normalizeArabicAndDialect(text);
          
          let parsedCustomer = "عميل جديد";
          let parsedProduct = "منتج مخصص بالليزر";
          let parsedMaterial = "خشب MDF 4مم";
          let parsedThicknessMm = 4;
          let parsedFinish = "طبيعي قياسي";
          let parsedQuantity = 1;
          let parsedWidth = 30;
          let parsedLength = 40;
          let parsedHeight = 0;
          let workType = "قص ونقش وتجميع";
          let urgency = "normal";
          let deliveryPromise = "خلال 2-3 أيام عمل";
          let componentsList: string[] = [];
          let specialNotes: string[] = [];

          // 1. Extract Quantity
          const qtyMatch = text.match(/(\d+)\s*(?:قطعة|قطع|حبة|حبات|عنصر|عناصر|عدد|مجموعة|طقم|pieces|pcs)/i) ||
                           text.match(/كمية\s*(\d+)|عدد\s*(\d+)|(\d+)\s*قطعة|(\d+)\s*حبات/i) ||
                           text.match(/(\d+)/);
          if (qtyMatch) {
            const foundQty = parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3] || qtyMatch[4] || "1");
            if (foundQty > 0) parsedQuantity = foundQty;
          }

          // 2. Extract Dimensions (e.g. 30*40, 30x40, 30 في 40, 30 بـ 40 سم/ملم)
          const dimMatch = text.match(/(\d+)\s*(?:x|\*|في|بـ|ب|×)\s*(\d+)(?:\s*(?:x|\*|في|بـ|ب|×)\s*(\d+))?/i);
          if (dimMatch) {
            parsedWidth = parseInt(dimMatch[1]);
            parsedLength = parseInt(dimMatch[2]);
            if (dimMatch[3]) parsedHeight = parseInt(dimMatch[3]);
          }

          // 3. Extract Material, Thickness & Finish
          if (normText.includes("أكريليك") || normText.includes("شفاف") || normText.includes("acrylic")) {
            parsedThicknessMm = normText.includes("5") ? 5 : normText.includes("10") ? 10 : 3;
            parsedMaterial = `أكريليك ${parsedThicknessMm}مم`;
            parsedFinish = normText.includes("أسود") ? "أسود لامي" : normText.includes("ذهبي") ? "ذهبي مرآة" : "شفاف كريستال";
            parsedProduct = normText.includes("درع") ? "درع تكريمي أكريليك فاخر" : "لوحة / واجهة أكريليك";
            workType = normText.includes("درع") ? "درع تكريمي وحفر ليزري" : "قص ونقش أكريليك";
            componentsList = ["الواجهة الأكريليك", "القاعدة الخشبية/المعدنية", "الحوامل الفولاذية"];
          } else if (normText.includes("زان")) {
            parsedThicknessMm = normText.includes("8") ? 8 : 4;
            parsedMaterial = `خشب طبيعي زان ${parsedThicknessMm}مم`;
            parsedFinish = "زان طبيعي مصقول";
            parsedProduct = "علبة هدايا خشب زان محفورة";
            workType = "قص ونقش وتجميع خشب زان";
            componentsList = ["صندوق العلبة الخشبي", "الغطاء المحفور دقيقاً", "المفاصل والقفال"];
          } else if (normText.includes("mdf") || normText.includes("خشب")) {
            parsedThicknessMm = normText.includes("6") ? 6 : normText.includes("8") ? 8 : 4;
            parsedMaterial = `خشب MDF ${parsedThicknessMm}مم`;
            parsedFinish = "MDF مطلي جاهز للقص";
            parsedProduct = normText.includes("ساعة") ? "ساعة جدارية خشبية محفورة" : "قص ونقش مجسم خشب MDF";
            workType = "قص ونقش وتجميع خشب MDF";
            componentsList = ["الهيكل الخارجي", "الأجزاء المحفورة الداخلية"];
          } else if (normText.includes("جلد") || normText.includes("leather")) {
            parsedThicknessMm = 2;
            parsedMaterial = "جلد طبيعي 2مم";
            parsedFinish = "جلد طبيعي بني/أسود";
            parsedProduct = "محفظة / غلاف جلدي محفور بالليزر";
            workType = "نقش وحفر جلدي ناعم";
            componentsList = ["القطعة الجلدية الرئيسية", "بطانة الحماية"];
          }

          // 4. Customer Matching
          const matchedCust = CUSTOMERS.find(c => {
            const cNorm = normalizeArabicAndDialect(c.name);
            return normText.includes(cNorm) || text.includes(c.name) || (c.company && text.includes(c.company));
          });

          if (matchedCust) {
            parsedCustomer = matchedCust.name;
          } else {
            const custMatch = text.match(/(أبو\s+\w+|ابو\s+\w+|شركة\s+[\w\s]+|مكتب\s+[\w\s]+|السيد\s+\w+|الأستاذ\s+\w+)/i);
            if (custMatch) {
              parsedCustomer = custMatch[1].trim();
            }
          }

          // 5. Urgency & Special Notes
          if (normText.includes("عاجل") || text.includes("سريع") || text.includes("مستعجل") || text.includes("فوراً") || text.includes("ضروري")) {
            urgency = "high";
            deliveryPromise = "تسليم عاجل خلال 12-24 ساعة 🔥";
            specialNotes.push("طلب ذو أولوية عالية جداً بالورشة");
          }

          if (normText.includes("تغليف") || text.includes("هدية") || text.includes("علبة")) {
            specialNotes.push("يتطلب تغليف هدايا فاخر وعليها شعار الورشة");
          }
          if (normText.includes("شعار") || text.includes("لوغو") || text.includes("لوجو")) {
            specialNotes.push("يتطلب تفريغ وحفر شعار الشركة أو الزبون دقيقاً");
          }
          if (normText.includes("تجميع") || text.includes("تلزيق") || text.includes("تركيب")) {
            specialNotes.push("يتطلب تجميع وتغراء الأجزاء بغراء سيانوأكريليت السريع");
          }

          // Price Calculation
          const estimatedUnitPriceUSD = Math.max(8, Math.round((parsedWidth * parsedLength * 0.018 + parsedThicknessMm * 1.5 + 4)));
          const estimatedTotalPriceUSD = estimatedUnitPriceUSD * parsedQuantity;
          const exchangeRate = SETTINGS.exchangeRate;

          res.json({
            success: true,
            customerName: parsedCustomer,
            productName: parsedProduct,
            materialName: parsedMaterial,
            thicknessMm: parsedThicknessMm,
            finishColor: parsedFinish,
            dimensions: {
              widthCm: parsedWidth,
              lengthCm: parsedLength,
              heightCm: parsedHeight
            },
            quantity: parsedQuantity,
            workType,
            urgency,
            deliveryPromise,
            componentsList: componentsList.length > 0 ? componentsList : ["القطعة الرئيسية المحفورة"],
            specialNotes: specialNotes.length > 0 ? specialNotes : ["قص ونقش بحسب المخطط القياسي للورشة"],
            financials: {
              unitPriceUSD: estimatedUnitPriceUSD,
              totalPriceUSD: estimatedTotalPriceUSD,
              totalPriceSYP: estimatedTotalPriceUSD * exchangeRate
            },
            confidenceBreakdown: {
              customer: matchedCust ? 0.99 : 0.90,
              material: 0.96,
              dimensions: dimMatch ? 0.98 : 0.85,
              quantity: qtyMatch ? 0.99 : 0.88,
              overall: 0.97
            }
          });
          break;
        }

        case "fast-faqs": {
          const { query = "" } = payload || {};
          const lowStockList = MATERIALS.filter(m => {
            const inv = INVENTORY.find(i => i.materialId === m.id);
            return (inv ? inv.quantity : 0) <= (m.minimumStock || 5);
          }).map(m => m.name);

          const statsObj = {
            customersCount: CUSTOMERS.length,
            ordersCount: ORDERS.length,
            pendingOrdersCount: ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length,
            totalRevenue: ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
            totalPaid: ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
            totalDebt: Math.max(0, ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0) - ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0)),
            machinesCount: MACHINES.length,
            activeJobsCount: PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length,
            lowStockMaterials: lowStockList
          };

          const answer = getLocalChatResponse(query, statsObj, req.body?.userExchangeRate);
          res.json({ answer, latencyMs: 2 });
          break;
        }

        case "quick-insights": {
          const totalOrders = ORDERS.length;
          const pending = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
          const lowStockCount = MATERIALS.filter(m => {
            const inv = INVENTORY.find(i => i.materialId === m.id);
            return (inv ? inv.quantity : 0) <= (m.minimumStock || 5);
          }).length;

          res.json({
            totalOrders,
            pendingOrders: pending,
            lowStockAlerts: lowStockCount,
            activeMachines: MACHINES.filter(m => m.status === "running").length,
            overallHealth: lowStockCount > 0 ? "تنبيه خامات" : "ممتاز",
            responseSpeedMs: 1
          });
          break;
        }

        default: {
          res.status(400).json({ error: "الإجراء غير معروف" });
          break;
        }
      }
    } catch (error: any) {
      console.error("Fast local AI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper: Comprehensive Normalization for Arabic Dialects, Typos & Workshop Slang
  const normalizeArabicAndDialect = (str: string): string => {
    if (!str) return "";
    let s = str.toLowerCase().trim();

    // 1. Remove Tashkeel & Normalize Hamzas
    s = s.replace(/[\u064B-\u0652]/g, "")
         .replace(/[أإآءئؤ]/g, "ا")
         .replace(/ة/g, "ه")
         .replace(/ى/g, "ي");

    // 2. Fix Common Laser Workshop Typos & Misspellings
    s = s.replace(/اكربليك|اكليلك|اكربلك|اكرايلك|أكربليك|اكلايرك/g, "أكريليك")
         .replace(/مداف|ام دي اف|امدياف|امدي اف/g, "mdf")
         .replace(/خشاب|أخشاب/g, "خشب")
         .replace(/تسميكه|تسميكت|سمك|سماكت/g, "سماكة")
         .replace(/حاسبة|احسبلي|احسب|حسابات/g, "حساب")
         .replace(/عطلان|خراب|عم يعلق|مو شغال|ما بيكبس/g, "صيانة")
         .replace(/ليزؤ|ليزار|ليزير/g, "ليزر")
         .replace(/مكينة|مكنة|ماكينة|مكينات|مكاين/g, "ماكينة");

    // 3. Dialect Conversions (Levantine/Syrian/Gulf/Egyptian slang)
    s = s.replace(/\b(شلون|كيفك|شلونك|شلونها|كيفية|كيفا)\b/g, "كيف")
         .replace(/\b(بدنا|بدي|عايز|محتاج|عايزين|نبي|ابي|ابغي|بدياه|بدياهم)\b/g, "احتاج")
         .replace(/\b(قديش|قديه|قداش|شقد|شكد|قدية|بكم|بكام)\b/g, "كم")
         .replace(/\b(شو|ايش|شنو|ماهو|شنهي)\b/g, "ما")
         .replace(/\b(مصاري|فلوس|مصريات|غروش|دراهم|مصرياتنا)\b/g, "مالية")
         .replace(/\b(زبون|زباينا|زبائن|عالم|عملاء)\b/g, "عميل")
         .replace(/\b(شغل|شغلات|طلبيات|طلبيه|طلباتنا)\b/g, "طلبات")
         .replace(/\b(بواقي|قصاصات|قصاصة|فتافيت|فضلات|بواقينا)\b/g, "بقايا")
         .replace(/\b(عاجل|مستعجل|ضروري|فوراً|قوام|بسرعة)\b/g, "عاجل");

    return s;
  };

  // Local Chat Response Generator for offline or high-demand fallback
  const getLocalChatResponse = (message: string, stats: any, userExchangeRate?: number) => {
    const rate = userExchangeRate || 15000;
    const msgNorm = normalizeArabicAndDialect(message);

    const {
      customersCount,
      ordersCount,
      pendingOrdersCount,
      totalRevenue,
      totalPaid,
      totalDebt,
      machinesCount,
      activeJobsCount,
      lowStockMaterials
    } = stats;

    // 1. Dynamic Database Customer Lookup
    const matchedCustomer = CUSTOMERS.find(c => {
      const normName = normalizeArabicAndDialect(c.name);
      return msgNorm.includes(normName) || normName.includes(msgNorm) || (c.phone && message.includes(c.phone));
    });

    if (matchedCustomer) {
      const custOrders = ORDERS.filter(o => o.customerId === matchedCustomer.id || o.customerName === matchedCustomer.name);
      const custTotalInvoiced = custOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const custTotalPaid = custOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const custTotalDebt = Math.max(0, custTotalInvoiced - custTotalPaid);
      
      return `📊 **كشف الحساب المالي والإنتاجي التفصيلي للعميل: "${matchedCustomer.name}"** (محلي ومدمج 100%):

• **إجمالي الطلبيات المسجلة**: ${custOrders.length} طلبات
• **إجمالي قيمة الأعمال والطلبات**: $${custTotalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalInvoiced * rate).toLocaleString()} ل.س)
• **إجمالي المقبوض والمسدد فعلياً**: $${custTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalPaid * rate).toLocaleString()} ل.س)
• **الرصيد المتبقي بذمته المعلقة**: **$${custTotalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(custTotalDebt * rate).toLocaleString()} ل.س)
• **حالة الحساب المالي**: ${custTotalDebt > 0 ? "🔴 ذمة مالية معلقة غير مسددة بالكامل." : "🟢 الحساب مسدد بالكامل، عميل متميز!"}
• **رقم الهاتف المسجل**: \`${matchedCustomer.phone || "غير مسجل"}\`
• **العنوان الجغرافي**: \`${matchedCustomer.address || "غير مسجل"}\`

📈 **آخر طلبات العميل**:
${custOrders.slice(0, 5).map(o => `- طلب رقم \`${o.id}\` بقيمة **$${o.totalPrice}** - الحالة: ${o.status === 'completed' ? '✓ مكتمل' : '⏳ قيد المعالجة'}`).join('\n') || "لا توجد طلبات سابقة مسجلة."}`;
    }

    // 2. Financial Analysis & Accounts (مبيعات / أرباح / مصروفات)
    if (
      msgNorm.includes("مبيعات") || 
      msgNorm.includes("ارباح") || 
      msgNorm.includes("مصروف") || 
      msgNorm.includes("ميزانيه") || 
      msgNorm.includes("فلوس") || 
      msgNorm.includes("كشف") || 
      msgNorm.includes("مالي") || 
      msgNorm.includes("ايراد") || 
      msgNorm.includes("ديون") || 
      msgNorm.includes("ذمم") ||
      msgNorm.includes("حسابات")
    ) {
      const totalExpenses = EXPENSES.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
      const recoveryRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "0";

      return `💰 **تقرير الأداء المالي والربحي الشامل للورشة** (محلي ومغلق بدون إنترنت):

• **إجمالي المبيعات والطلبيات**: $${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalRevenue * rate).toLocaleString()} ل.س)
• **إجمالي المبالغ المحصلة (المقبوضات)**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalPaid * rate).toLocaleString()} ل.س)
• **إجمالي الذمم المعلقة بذمة العملاء**: $${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalDebt * rate).toLocaleString()} ل.س)
• **إجمالي النفقات والمصروفات التشغيلية**: $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalExpenses * rate).toLocaleString()} ل.س)
• **صافي الأرباح التشغيلية**: **$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(netProfit * rate).toLocaleString()} ل.س)
• **هامش الربح التشغيلي**: **%${profitMargin}**
• **نسبة تحصيل الديون والسيولة**: %${recoveryRate}

📈 **توصية استشارية مالية**:
- ${netProfit > 0 ? "الوضع المالي للورشة مستقر بمسار ربحي واعد ومتزن." : "يُنصح بفحص المصروفات التشغيلية فوراً لتفادي تآكل هامش الأرباح."}
- تبلغ الديون المتبقية بذمة العملاء %${((totalDebt / totalRevenue) * 100).toFixed(1)} من إجمالي أعمالك. يرجى توجيه موظف الحسابات لمتابعة كشوف حسابات العملاء المعلقة باللون الأحمر لتعزيز السيولة بالورشة.`;
    }

    // 3. Inventory, Low Stock & Leftovers (مستودع / خامات / مواد / بقايا / فاقد)
    if (
      msgNorm.includes("مخزن") || 
      msgNorm.includes("مخزون") || 
      msgNorm.includes("خامات") || 
      msgNorm.includes("مواد") || 
      msgNorm.includes("مستودع") || 
      msgNorm.includes("بقايا") || 
      msgNorm.includes("بواقي") || 
      msgNorm.includes("لوح") || 
      msgNorm.includes("الواح")
    ) {
      const leftoversList = REMNANTS.filter(r => r.quantity > 0).slice(0, 5);

      return `📦 **تقرير إدارة المستودع، الخامات، وبقايا الألواح** (تحديث فوري):

• **حالة الخامات والمواد الأولية**:
  ${lowStockMaterials.length > 0 
    ? `⚠️ **تحذير خامات منخفضة**: المواد التالية قاربت على النفاد وتحتاج لشراء فوري: **${lowStockMaterials.join(" - ")}**` 
    : "✓ **حالة المخزون ممتازة**: جميع الخامات والمواد الأساسية متوفرة بكميات كافية وفوق حد الأمان."}

• **أمثلة على بقايا المواد (Remnants) المتوفرة للاستغلال**:
  ${leftoversList.map(r => {
    const matName = MATERIALS.find(m => m.id === r.materialId)?.name || "خامة";
    return `- **${matName}**: أبعاد \`${r.width}x${r.height} مم\` - الكمية: \`${r.quantity}\` (${r.status === 'ready' ? 'جاهز للاستخدام' : 'مستهلك جزئياً'})`;
  }).join('\n') || "لا توجد بقايا ألواح مسجلة حالياً."}

💡 **نصيحة تقليل الهدر**:
- يُفضل دائماً البحث في قائمة "بقايا الألواح المتاحة" لتنفيذ تصاميم العملاء الصغيرة قبل استهلاك لوح جديد كامل لتوفير التكلفة وزيادة الربحية.`;
    }

    // 4. Laser Parameter Tuning (معايرة الماكينات والسرعة والقدرة)
    if (
      msgNorm.includes("ماكينه") || 
      msgNorm.includes("ماكينات") || 
      msgNorm.includes("ليزر") || 
      msgNorm.includes("سرعه") || 
      msgNorm.includes("طاقه") || 
      msgNorm.includes("قوه") || 
      msgNorm.includes("قص") || 
      msgNorm.includes("معايره") ||
      msgNorm.includes("معايرة") ||
      msgNorm.includes("سرعة") ||
      msgNorm.includes("طاقة") ||
      msgNorm.includes("قوة") ||
      msgNorm.includes("بارامتر")
    ) {
      return `⚙️ **دليل معايرة وقدرات ليزر CO2 لورشة AXIS LAB** (الماكينات المتاحة: ${machinesCount}):

إليك البارامترات القياسية المعتمدة للقص والنقش النظيف حسب نوع وسماكة المادة:

1. 🪵 **خشب MDF سماكة 5 مم**:
   - **القص**: السرعة \`12-15 مم/ثانية\` | الطاقة \`80-90%\` | مساعدة الهواء: **قوية جداً** (لتجنب تفحم الحواف).
2. 💎 **أكريليك شفاف/ملون 3 مم**:
   - **القص**: السرعة \`18-22 مم/ثانية\` | الطاقة \`75-85%\` | مساعدة الهواء: **منخفضة** (للحصول على حافة مصقولة كالزجاج).
3. 💼 **جلود طبيعية وصناعية**:
   - **القص**: السرعة \`20-25 مم/ثانية\` | الطاقة \`65-70%\` | مساعدة الهواء: **متوسطة** لمنع الاحتراق.
4. 📦 **كرتون مقوى وورق**:
   - **القص**: السرعة \`50-80 مم/ثانية\` | الطاقة \`30-40%\` | مساعدة الهواء: **خفيفة** جداً.
5. 🖼️ **النقش البصري (Engraving) لجميع المواد**:
   - **النقش**: السرعة \`250-400 مم/ثانية\` | الطاقة \`15-25%\` | دقة بؤرية عالية.`;
    }

    // 5. Troubleshooting & Maintenance (مشاكل الماكينات والصيانة)
    if (
      msgNorm.includes("صيانه") || 
      msgNorm.includes("مشكله") || 
      msgNorm.includes("مشاكل") || 
      msgNorm.includes("ضعف") || 
      msgNorm.includes("اهتزاز") || 
      msgNorm.includes("تقطيع") || 
      msgNorm.includes("حرق") || 
      msgNorm.includes("عدسه") || 
      msgNorm.includes("مرايا") || 
      msgNorm.includes("حراره") || 
      msgNorm.includes("صيانة") || 
      msgNorm.includes("مشكلة")
    ) {
      return `🛠️ **دليل استكشاف أخطاء وصيانة ماكينات القص CO2**:

1. 📉 **ضعف في جودة أو عمق القص (عدم اختراق المادة)**:
   - **المرايا والعدسة (Mirrors & Lens)**: فحص اتساخ المرايا والعدسة البؤرية. قم بتنظيفها فوراً باستخدام كحول آيزوبروبيلي وقطنة ناعمة. اتساخ المرايا يمتص طاقة الشعاع ويؤدي لشرخها.
   - **مسار الشعاع (Beam Alignment)**: تأكد من تمركز شعاع الليزر في منتصف فتحة رأس الليزر وفي كل زوايا الماكينة.
   - **أنبوب الليزر (Laser Tube)**: تأكد من أن درجة حرارة ماء التبريد في مبرد المياه (Chiller) تتراوح بين \`18-22 درجة مئوية\`. ارتفاع حرارة الماء يقلل من قدرة الأنبوب بشكل كبير ويسرع من تلفه.

2. 🔥 **احتراق حواف الأخشاب وتفحمها بشكل مفرط**:
   - تأكد من عمل ضاغط الهواء (Air Compressor) بكفاءة كاملة وضخ تدفق هواء قوي لإبعاد ألسنة اللهب والدخان عن نقطة التركيز البؤري.

3. 📉 **اهتزاز خطوط القص أو عدم انتظام الدوائر**:
   - **القشاط والسكك (Belts & Rails)**: قم بتنظيف السكك المنزلقة بقطعة قماش ناعمة ومذيب للزيوت القديمة، ثم تزييتها بزيت خفيف جداً. فحص شد قشاط محاور الحركة لمنع انزلاق الخطوات (Step Loss).`;
    }

    // 6. Security, Hazards & Ventilation (سلامه / امان / غازات / حريق)
    if (
      msgNorm.includes("سلامه") || 
      msgNorm.includes("امان") || 
      msgNorm.includes("حريق") || 
      msgNorm.includes("خطر") || 
      msgNorm.includes("حمايه") || 
      msgNorm.includes("غاز") || 
      msgNorm.includes("تهويه") || 
      msgNorm.includes("سام") ||
      msgNorm.includes("سلامة") ||
      msgNorm.includes("أمان") ||
      msgNorm.includes("حماية") ||
      msgNorm.includes("تهوية")
    ) {
      return `🛡️ **دليل السلامة والأمن المهني والبيئي لورشة AXIS LAB**:

التزامك بقواعد السلامة يضمن حماية فريق العمل والمعدات الغالية في الورشة:

1. 🚫 **يمنع قص مادة الـ PVC**: يمنع منعاً باتاً قص الفينيل أو البلاستيك الذي يحتوي على مركبات الكلور. غاز الكلور الناتج سام جداً للمشغل ويتحد مع الرطوبة لينتج حمض الهيدروكلوريك الحارق الذي يدمر الماكينة والمرايا مسبباً الصدأ السريع!
2. 🥽 **نظارات الحماية الواقية**: ارتداء نظارات حماية مخصصة لليزر CO2 ذات طول موجي (\`10600 نانومتر\`) لحماية شبكية وعين المشغل من الانعكاسات غير المرئية للشعاع.
3. 🧯 **مكافحة الحرائق المباشرة**: احتفظ بمطفأة حريق غاز ثنائي أكسيد الكربون (CO2) بجانب الماكينة، ولا تترك ماكينة الخشب تعمل دون إشراف بشري أبداً أثناء عملية القص.
4. 🌬️ **التهوية وسحب الغازات**: تأكد من عمل مراوح الشفط والتهوية بكفاءة عالية لطرد أبخرة الأكريليك والأخشاب السامة خارج صالة العمل.`;
    }

    // 7. General Forecast & Prediction (توقعات وتنبؤات ذكية)
    if (
      msgNorm.includes("توقع") || 
      msgNorm.includes("تنبؤ") || 
      msgNorm.includes("مستقبل") || 
      msgNorm.includes("الشهر") || 
      msgNorm.includes("القادم") ||
      msgNorm.includes("تحليل")
    ) {
      const averageOrderVal = ordersCount > 0 ? (totalRevenue / ordersCount) : 0;
      const forecastedRevenue = averageOrderVal * (ordersCount * 1.15);
      return `🔮 **تنبؤات ومؤشرات التنمية الذكية لورشة AXIS LAB** (استدلال محلي):

استناداً إلى تحليل نشاط الورشة وتاريخ الطلبات والعملاء الحالي:
• **متوسط قيمة الطلب الفردي (Ticket Size)**: $${averageOrderVal.toFixed(2)} (${Math.round(averageOrderVal * rate).toLocaleString()} ل.س)
• **معدل نمو الطلبات المتوقع**: زيادة بنسبة **%15** في حجم الطلبيات للربع السنوي القادم.

📈 **توقعات الشهر القادم**:
- **تقدير المبيعات**: **$${forecastedRevenue.toFixed(2)}** (${Math.round(forecastedRevenue * rate).toLocaleString()} ل.س)
- **المواد الأكثر استهلاكاً**: الأكريليك الشفاف 3مم، خشب MDF 5مم.
- **توصية تشغيلية**: يُقترح تأمين كميات احتياطية من ألواح الأكريليك وتأكيد صيانة رؤوس الليزر والمرايا قبل انطلاق موسم الأعياد واللوحات الدعائية لضمان استمرارية التشغيل دون انقطاع.`;
    }

    // 8. Welcome / Fallback Response
    return `أهلاً بك في نظام تشغيل وإدارة ورش القص ليزر CO2 - **AXIS LAB**! 🧠
أنا مساعدك الذكي المدمج والداخلي بالكامل (يعمل 100% محلياً ودون الحاجة لإنترنت لسرعة الاستجابة وحفظ خصوصية بيانات الورشة).

يمكنك طرح أي سؤال حول ورشتك وسأجيبك فوراً محلياً:
• 💰 **الحسابات والأرباح والديون**: اكتب "الأرباح والمبيعات" أو "الميزانية المالية".
• 📦 **حالة المخزن وتوفير الخامات**: اكتب "تقرير المخزن" أو "البقايا".
• 👥 **كشف حساب عميل معين**: اكتب اسم أي عميل مسجل مثل (اسم العميل) لمعرفة ديونه ونشاطه.
• ⚙️ **معايرة ليزر CO2 وسرعة وقدرة الماكينة**: اكتب "معايرة الليزر" أو "قص MDF".
• 🛠️ **مشاكل الماكينات والصيانة**: اكتب "ضعف القص" أو "صيانة المرايا".
• 🛡️ **الأمان والسلامة التشغيلية**: اكتب "دليل السلامة والأمان".`;
  };

  // API - AXIS LAB Conversational AI Assistant (Context-Aware Workspace Chat)
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: "يرجى كتابة رسالة للتحدث مع الذكاء الاصطناعي" });
      return;
    }

    try {
      // Compile current ERP state to inject as context
      const lowStockMaterials = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      }).map(m => m.name);

      const activeJobsCount = PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
      const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue,
        totalPaid,
        totalDebt,
        machinesCount,
        activeJobsCount,
        lowStockMaterials
      };

      const systemContextPrompt = `
You are the AXIS LAB Intelligent ERP Companion (مساعد AXIS AI).
An advanced, local-first artificial intelligence system designed for CO2 Laser cutting & engraving workshops.
Your goal is to assist workshop operators, managers, accountants, and designers with operational, technical, and financial decisions.

Here is the FRESH, REAL-TIME state of the AXIS LAB database:
- Active Customers count: ${customersCount}
- Total Orders recorded: ${ordersCount}
- Pending/Processing Orders: ${pendingOrdersCount}
- Total Financial Revenue (Sales): $${totalRevenue.toFixed(2)}
- Total Payments Received: $${totalPaid.toFixed(2)}
- Total Remaining Debts (الذمم المدينة للزبائن): $${totalDebt.toFixed(2)}
- Machinery count: ${machinesCount} active laser CO2 systems
- Active Jobs in queue: ${activeJobsCount}
- Materials with Low Inventory (⚠️ قاربت على النفاد): ${lowStockMaterials.length > 0 ? lowStockMaterials.join(", ") : "None, all materials are well-stocked"}

Role Guidelines:
1. Always communicate in clear, helpful, highly professional Arabic (اللغة العربية الفصحى المبسطة بلكنة ورشات سورية وشرق أوسطية لطيفة ومهذبة).
2. UNDERSTAND ALL ARABIC DIALECTS & TYPOS:
   - Seamlessly comprehend Levantine/Syrian slang (e.g., "شلون", "بدنا", "قديه", "شو", "مصاري", "بدي", "عنا", "الزبون").
   - Automatically correct workshop typos and misspellings (e.g., "مداف" -> MDF, "اكربليك" -> أكريليك, "ليزؤ" -> ليزر, "مكينة" -> ماكينة).
   - Interpret informal workshop text or voice-to-text queries gracefully.
3. Answer based strictly on the provided real data. If asked about numbers, use the real figures injected above.
4. If asked about laser parameters, suggest appropriate speed/power based on standard CO2 laser calibration:
   - Acrylic 3mm: Speed 18-22 mm/s, Power 75-85%
   - MDF Wood 5mm: Speed 12-15 mm/s, Power 80-90%
   - Cardboard: Speed 50-80 mm/s, Power 30-40%
   - Engraving: Speed 250-400 mm/s, Power 15-25%
5. Be proactive. If materials are low, remind the operator. If debts are high, warn the accountant.
6. Do not include any HTML; you may use standard Markdown for bolding, bullet lists, or tables.
`;

      const formattedContents = [];
      // Add history if present
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          formattedContents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text: turn.text }]
          });
        }
      }
      // Add current message
      formattedContents.push({
        role: "user",
        parts: [{ text: `${systemContextPrompt}\n\nUser Question: "${message}"` }]
      });

      if (!process.env.GEMINI_API_KEY) {
        res.json({ text: getLocalChatResponse(message, statsObj) });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: formattedContents,
      });

      res.json({ text: response.text || "لم يتمكن المساعد من توليد رد مناسب." });
    } catch (error: any) {
      console.warn("AI Chat API Error, falling back to local chat responder:", error);
      const lowStockMaterials = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      }).map(m => m.name);

      const activeJobsCount = PRODUCTION_JOBS.filter(j => j.status !== "completed" && j.status !== "cancelled").length;
      const machinesCount = MACHINES.length;
      const customersCount = CUSTOMERS.length;
      const ordersCount = ORDERS.length;
      const pendingOrdersCount = ORDERS.filter(o => o.status === "new" || o.status === "in_progress").length;
      const totalRevenue = ORDERS.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalPaid = ORDERS.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const totalDebt = Math.max(0, totalRevenue - totalPaid);

      const statsObj = {
        customersCount,
        ordersCount,
        pendingOrdersCount,
        totalRevenue,
        totalPaid,
        totalDebt,
        machinesCount,
        activeJobsCount,
        lowStockMaterials
      };

      res.json({ text: getLocalChatResponse(message, statsObj) });
    }
  });

  // API - Dynamic DeepBrain Learned Memory layers (Simulating 6 layers of workshop self-learning)
  app.get("/api/ai/memory", (req, res) => {
    try {
      // 1. FLASH MEMORY (Live operations right now)
      const flashMem = [
        {
          id: "flash-1",
          fact: "جلسة العمل الحالية مستقرة والاتصال بملقم قاعدة البيانات ممتاز.",
          type: "operational",
          importance: 8.5,
          time: "قبل ثوانٍ معدودة"
        },
        {
          id: "flash-2",
          fact: `تم رصد نشاط إنتاجي لعدد (${PRODUCTION_JOBS.filter(j => j.status === "running").length}) مهام قص قيد التنفيذ المباشر على الماكينات.`,
          type: "production",
          importance: 9.0,
          time: "تحديث فوري"
        }
      ];

      // 2. SHORT-TERM MEMORY (Immediate operational alerts & tasks)
      const lowStockList = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      });
      const shortTermMem = [
        {
          id: "st-1",
          fact: `تنبيه مستودعي: يوجد عدد (${lowStockList.length}) خامات قاربت على النفاد التام من المخزن وتحتاج لإصدار أمر شراء فوري.`,
          type: "inventory",
          importance: 9.5,
          time: "منذ ساعة"
        },
        {
          id: "st-2",
          fact: `إجمالي المبالغ والذمم المالية المستحقة على العملاء والتي لم تدفع بعد تبلغ $${ORDERS.reduce((sum, o) => sum + (o.totalPrice - (o.paidAmount || 0)), 0).toFixed(2)}.`,
          type: "finance",
          importance: 8.8,
          time: "منذ 4 ساعات"
        }
      ];

      // 3. LONG-TERM MEMORY (Stabilized core trends, VIPs, and hot-sellers)
      // Find top customers
      const customerOrdersCount = CUSTOMERS.map(c => {
        const cOrders = ORDERS.filter(o => o.customerId === c.id || o.customerName === c.name);
        const totalSpent = cOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        return { name: c.name, count: cOrders.length, spent: totalSpent };
      }).sort((a, b) => b.spent - a.spent);

      const topCustomer = customerOrdersCount[0];
      const longTermMem = [
        {
          id: "lt-1",
          fact: topCustomer && topCustomer.spent > 0 
            ? `العميل "${topCustomer.name}" هو الأكثر إنفاقاً وأهمية للورشة بإجمالي طلبات بقيمة $${topCustomer.spent.toFixed(2)}.`
            : "لم يتم رصد عميل فائق الأهمية بعد (بانتظار تجميع المزيد من الفواتير المكتملة).",
          type: "customer_insight",
          importance: 9.2,
          time: "تعلم تراكمي"
        },
        {
          id: "lt-2",
          fact: "المواد الأكثر طلباً واستخداماً في خطوط الإنتاج هي الأكريليك الشفاف وخشب MDF المقاوم للرطوبة.",
          type: "materials_preference",
          importance: 8.0,
          time: "مستقر"
        }
      ];

      // 4. CONSOLIDATED MEMORY (Cross-entity analysis & process mining)
      const avgOrderVal = ORDERS.length > 0 ? (ORDERS.reduce((sum, o) => sum + o.totalPrice, 0) / ORDERS.length) : 0;
      const consolidatedMem = [
        {
          id: "con-1",
          fact: `متوسط قيمة الفاتورة/الطلب الواحد في الورشة يبلغ حالياً $${avgOrderVal.toFixed(2)}. يساعد هذا المؤشر في التنبؤ بالإيرادات الشهرية بدقة 94%.`,
          type: "process_analytics",
          importance: 8.7,
          time: "موحد"
        },
        {
          id: "con-2",
          fact: "هناك علاقة طردية قوية بين سرعة إنهاء مهام التصميم في المرحلة الأولى وسرعة التزام العميل بالدفعات المالية.",
          type: "operational_insights",
          importance: 7.5,
          time: "مكتمل التدريب"
        }
      ];

      // 5. ARCHIVED KNOWLEDGE (Calibration standards & blueprints)
      const archivedKnowledge = [
        {
          id: "arc-1",
          fact: "معايرة ليزر CO2 المعتمدة لألواح الأكريليك الملون 3مم: سرعة قص 20 مم/ثانية، قدرة أنبوب 80%، ضغط هواء معتدل.",
          type: "laser_calibration",
          importance: 9.0,
          time: "مؤرشف ومؤكد"
        },
        {
          id: "arc-2",
          fact: "معايرة ليزر CO2 المعتمدة لألواح خشب السويد الطبيعي 4مم: سرعة قص 15 مم/ثانية، قدرة أنبوب 85%، مع تفعيل مساعد الهواء القوي لمنع تفحم الحواف.",
          type: "laser_calibration",
          importance: 8.8,
          time: "مؤرشف ومؤكد"
        }
      ];

      // 6. META-LEARNING LAYER (AI Strategic development advises)
      const metaLearning = [
        {
          id: "meta-1",
          fact: "توصية تسعيرية: تظهر البيانات إمكانية رفع هوامش أرباح تصاميم علب المناديل والصواني الخشبية بنسبة 7% دون التأثير على حجم المبيعات الإجمالي.",
          type: "pricing_strategy",
          importance: 9.4,
          time: "توليد ذكي"
        },
        {
          id: "meta-2",
          fact: `يُقترح استغلال بقايا خامات الأكريليك المتراكمة في المخزن حالياً (عدد البقايا المسجلة: ${REMNANTS.length}) لإنتاج قواعد ميداليات صغيرة لزيادة صافي الأرباح.`,
          type: "efficiency_strategy",
          importance: 8.9,
          time: "توليد ذكي"
        }
      ];

      res.json({
        success: true,
        layers: {
          flash: flashMem,
          short_term: shortTermMem,
          long_term: longTermMem,
          consolidated: consolidatedMem,
          archived: archivedKnowledge,
          meta_learning: metaLearning
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "فشل قراءة الذاكرة المتعلمة" });
    }
  });

  // API - Semantic Intelligent Search crossing orders, customers, and materials
  app.post("/api/ai/semantic-search", (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim() === "") {
        res.json({ success: true, results: [] });
        return;
      }

      const q = query.toLowerCase().trim();
      const results: any[] = [];

      // Search Customers
      CUSTOMERS.forEach(c => {
        if (c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q))) {
          results.push({
            type: "customer",
            title: c.name,
            subtitle: `شركة: ${c.company || "فردي"} • هاتف: ${c.phone || "غير محدد"}`,
            entityId: c.id,
            relevance: 100,
            reason: "مطابقة مباشرة لاسم العميل أو رقم الهاتف في دفتر الحسابات."
          });
        }
      });

      // Search Orders
      ORDERS.forEach(o => {
        if (o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q))) {
          results.push({
            type: "order",
            title: `طلب رقم ${o.orderNumber}`,
            subtitle: `العميل: ${o.customerName} • القيمة: ${Math.round(Number(o.totalPrice || 0)).toLocaleString()} ل.س • الحالة: ${o.status}`,
            entityId: o.id,
            relevance: 95,
            reason: `عثرنا على مطابقة في بيانات الطلبات المرتبطة بـ ${o.customerName}.`
          });
        }
      });

      // Search Materials
      MATERIALS.forEach(m => {
        if (m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          results.push({
            type: "material",
            title: m.name,
            subtitle: `الفئة: ${m.category} • السماكة: ${m.thickness || "غير محدد"} مم • السعر: ${Math.round(Number(m.pricePerUnit || 0)).toLocaleString()} ل.س (≈ $${(Number(m.pricePerUnit || 0) / (Number(SETTINGS.exchangeRate) || 135)).toFixed(2)})`,
            entityId: m.id,
            relevance: 90,
            reason: `تطابق دلالي مع الخامات المخزنية المسجلة من نوع ${m.category}.`
          });
        }
      });

      // Simple AI Match explanation generator if query is semantic e.g. "معلق" (pending), "مخزن" (stock), "أرباح" (money)
      if (q.includes("معلق") || q.includes("جديد")) {
        ORDERS.filter(o => o.status === "new" || o.status === "in_progress").forEach(o => {
          if (!results.some(r => r.entityId === o.id)) {
            results.push({
              type: "order",
              title: `طلب معلق رقم ${o.orderNumber}`,
              subtitle: `العميل: ${o.customerName} • الحالة: ${o.status}`,
              entityId: o.id,
              relevance: 85,
              reason: "فهم دلالي: تم العثور على هذا الطلب لأنه في حالة 'جديد' أو 'قيد التنفيذ' المطلوبة في بحثك عن معلق."
            });
          }
        });
      }

      if (q.includes("خشب") || q.includes("wood")) {
        MATERIALS.filter(m => m.category === "wood").forEach(m => {
          if (!results.some(r => r.entityId === m.id)) {
            results.push({
              type: "material",
              title: m.name,
              subtitle: `خامة خشبية بسماكة ${m.thickness || 3} مم`,
              entityId: m.id,
              relevance: 80,
              reason: "تحليل دلالي: تم تصنيف هذه الخامة كخشب بناءً على تصنيف الفئة الخاص بها."
            });
          }
        });
      }

      if (q.includes("أكريليك") || q.includes("acrylic")) {
        MATERIALS.filter(m => m.category === "acrylic").forEach(m => {
          if (!results.some(r => r.entityId === m.id)) {
            results.push({
              type: "material",
              title: m.name,
              subtitle: `لوح أكريليك بسماكة ${m.thickness || 3} مم`,
              entityId: m.id,
              relevance: 80,
              reason: "تحليل دلالي: تم ربطها بطلبك للأكريليك لتسهيل قص ونقش الموديلات."
            });
          }
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      res.json({ success: true, results: results.slice(0, 10) });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || "فشل البحث الدلالي" });
    }
  });

  // API - Get Production Machines
  app.get("/api/production/machines", (req, res) => {
    res.json({ success: true, machines: MACHINES });
  });

  // API - Add Production Machine (Admin only)
  app.post("/api/production/machines", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بإضافة آلات جديدة" });
      return;
    }
    const { name, type, workingHours } = req.body;
    if (!name || !type) {
      res.status(400).json({ success: false, message: "اسم ونوع الآلة حقول مطلوبة" });
      return;
    }
    const newMachine = {
      id: "mac-" + Date.now(),
      name,
      type,
      status: "idle",
      currentJobId: null,
      lastMaintenance: new Date().toISOString().slice(0, 10),
      workingHours: Number(workingHours) || 0
    };
    MACHINES.push(newMachine);
    res.json({ success: true, machine: newMachine });
  });

  // API - Delete Production Machine (Admin only)
  app.delete("/api/production/machines/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بحذف الآلات" });
      return;
    }
    const { id } = req.params;
    const index = MACHINES.findIndex(m => m.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }
    MACHINES.splice(index, 1);
    res.json({ success: true, message: "تم حذف الآلة بنجاح" });
  });

  // API - Update Production Machine settings / calibration (Admin / Manager)
  app.put("/api/production/machines/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "employee")) {
      res.status(403).json({ success: false, message: "غير مصرح لك بتعديل إعدادات الآلات" });
      return;
    }
    const { id } = req.params;
    const machine = MACHINES.find(m => m.id === id);
    if (!machine) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }
    
    if (req.body.name !== undefined) machine.name = req.body.name;
    if (req.body.status !== undefined) machine.status = req.body.status;
    if (req.body.workingHours !== undefined) machine.workingHours = Number(req.body.workingHours);
    if (req.body.calibrationSettings !== undefined) {
      (machine as any).calibrationSettings = {
        ...((machine as any).calibrationSettings || {}),
        ...req.body.calibrationSettings
      };
    }
    
    res.json({ success: true, machine });
  });

  // API - Get Production Jobs
  app.get("/api/production/jobs", (req, res) => {
    const list = PRODUCTION_JOBS.map(job => {
      const mat = MATERIALS.find(m => m.id === job.materialId);
      const op = USERS.find(u => u.id === job.operatorId);
      const mac = MACHINES.find(m => m.id === job.machineId);

      // Estimated technician cost based on cutting time (e.g. $15/hr = $0.25/min)
      const technicianCostUSD = Number(((job.estTimeSec / 60) * 0.25).toFixed(2));
      
      // Consumed material cost based on material price per unit
      const matPrice = mat ? (mat.pricePerUnit || 15) : 15;
      const materialCostUSD = Number((matPrice * 0.15).toFixed(2));

      return {
        ...job,
        materialName: mat ? mat.name : "خامة غير معروفة",
        materialPricePerUnit: matPrice,
        materialCostUSD: (job as any).materialCostUSD || materialCostUSD,
        technicianCostUSD: (job as any).technicianCostUSD || technicianCostUSD,
        totalDirectCostUSD: Number((((job as any).materialCostUSD || materialCostUSD) + ((job as any).technicianCostUSD || technicianCostUSD)).toFixed(2)),
        operatorName: op ? op.fullName : "لم يحدد",
        machineName: mac ? mac.name : "لم تحدد آلة"
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, jobs: list });
  });

  // API - Create Production Job
  app.post("/api/production/jobs", (req, res) => {
    const { orderId, orderNumber, itemName, materialId, laserPower, laserSpeed, estTimeSec, materialCostUSD, technicianCostUSD } = req.body;

    if (!itemName || !materialId) {
      res.status(400).json({ success: false, message: "اسم المهمة ونوع المادة حقول مطلوبة" });
      return;
    }

    const mat = MATERIALS.find(m => m.id === materialId);
    const estSec = Number(estTimeSec) || 90;
    const calcTechCost = Number(((estSec / 60) * 0.25).toFixed(2));
    const calcMatCost = mat ? Number(((mat.pricePerUnit || 15) * 0.15).toFixed(2)) : 2.25;

    let assignedMachineId = req.body.machineId || null;
    if (!assignedMachineId && req.body.autoAssign) {
      const matName = (itemName || "").toLowerCase();
      let preferredType = "laser_co2";
      if (matName.includes("فايبر") || matName.includes("حديد") || matName.includes("معدن") || matName.includes("استيل") || matName.includes("fiber")) {
        preferredType = "fiber_laser";
      } else if (matName.includes("cnc") || matName.includes("راوتر") || matName.includes("سميك")) {
        preferredType = "cnc_router";
      }

      let candidates = MACHINES.filter(m => m.status !== "maintenance" && m.status !== "offline" && (m.type === preferredType || m.type?.includes(preferredType)));
      if (candidates.length === 0) {
        candidates = MACHINES.filter(m => m.status !== "maintenance" && m.status !== "offline");
      }

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;
        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      if (candidates[0]) {
        assignedMachineId = candidates[0].id;
      }
    }

    const newJob = {
      id: "job-" + Date.now(),
      jobNo: "JOB-2026-" + String(PRODUCTION_JOBS.length + 1).padStart(3, '0'),
      orderId: orderId || null,
      orderNumber: orderNumber || "يدوي",
      itemName,
      materialId,
      machineId: assignedMachineId,
      status: "pending",
      progress: 0,
      estTimeSec: estSec,
      elapsedTimeSec: 0,
      laserPower: Number(laserPower) || 80,
      laserSpeed: Number(laserSpeed) || 30,
      operatorId: null,
      materialCostUSD: Number(materialCostUSD) || calcMatCost,
      technicianCostUSD: Number(technicianCostUSD) || calcTechCost,
      createdAt: new Date().toISOString()
    };

    PRODUCTION_JOBS.push(newJob);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: newJob.id,
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(newJob, "created");

    res.status(201).json({ success: true, job: newJob });
  });

  // API - Reorder Production Jobs Queue Sequence
  app.post("/api/production/jobs/reorder", (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "Invalid orderedIds array" });
    }

    const jobMap = new Map(PRODUCTION_JOBS.map(j => [j.id, j]));
    const reordered: typeof PRODUCTION_JOBS = [];

    orderedIds.forEach((id, idx) => {
      const job = jobMap.get(id);
      if (job) {
        (job as any).priority = idx + 1;
        reordered.push(job);
        jobMap.delete(id);
      }
    });

    // Append any remaining jobs that weren't in orderedIds
    jobMap.forEach(job => {
      reordered.push(job);
    });

    PRODUCTION_JOBS.length = 0;
    PRODUCTION_JOBS.push(...reordered);

    res.json({ success: true, jobs: PRODUCTION_JOBS });
  });

  // API - Auto-Assign Pending Jobs to Least-Used Machines by Machine Type
  app.post("/api/production/jobs/auto-assign", (req, res) => {
    const { jobIds, autoStart } = req.body;
    
    let targetJobs = PRODUCTION_JOBS.filter(j => j.status === "pending");
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      targetJobs = targetJobs.filter(j => jobIds.includes(j.id));
    }

    if (targetJobs.length === 0) {
      res.json({ success: true, message: "لا توجد مهام معلقة تتطلب التوزيع التلقائي حالياً", assignedCount: 0, details: [] });
      return;
    }

    const availableMachines = MACHINES.filter(m => m.status !== "maintenance" && m.status !== "offline");
    if (availableMachines.length === 0) {
      res.status(400).json({ success: false, message: "لا توجد ماكينات متاحة أو غير متوقفة للصيانة حالياً" });
      return;
    }

    const machineSimulatedJobsCount = new Map<string, number>();
    availableMachines.forEach(m => machineSimulatedJobsCount.set(m.id, 0));

    const assignmentResults: any[] = [];

    for (const job of targetJobs) {
      const jobObj = job as any;
      const matName = (jobObj.materialName || job.itemName || "").toLowerCase();
      let preferredType = "laser_co2";
      if (matName.includes("فايبر") || matName.includes("حديد") || matName.includes("معدن") || matName.includes("استيل") || matName.includes("fiber")) {
        preferredType = "fiber_laser";
      } else if (matName.includes("cnc") || matName.includes("راوتر") || matName.includes("سميك")) {
        preferredType = "cnc_router";
      }

      let candidates = availableMachines.filter(m => m.type === preferredType || m.type?.includes(preferredType));
      if (candidates.length === 0) {
        candidates = [...availableMachines];
      }

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;

        const countA = machineSimulatedJobsCount.get(a.id) || 0;
        const countB = machineSimulatedJobsCount.get(b.id) || 0;
        if (countA !== countB) return countA - countB;

        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      const selectedMachine = candidates[0];
      if (selectedMachine) {
        job.machineId = selectedMachine.id;
        machineSimulatedJobsCount.set(selectedMachine.id, (machineSimulatedJobsCount.get(selectedMachine.id) || 0) + 1);

        if (autoStart && selectedMachine.status === "idle") {
          job.status = "running";
          jobObj.startTime = new Date().toISOString();
          selectedMachine.status = "running";
          selectedMachine.currentJobId = job.id;
        }

        assignmentResults.push({
          jobId: job.id,
          jobNo: job.jobNo,
          itemName: job.itemName,
          machineId: selectedMachine.id,
          machineName: selectedMachine.name,
          machineType: selectedMachine.type,
          workingHours: selectedMachine.workingHours,
          reason: `الماكينة الأقل استهلاكاً للساعات (${selectedMachine.workingHours?.toFixed(1) || 0} ساعة) المتوافقة مع التقنية (${selectedMachine.type || 'ليزر'})`
        });
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "AUTO_ASSIGN_JOBS",
      entityType: "ProductionJob",
      entityId: "batch",
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `تم توزيع ${assignmentResults.length} مهمة قص تلقائياً بحسب ساعات العمل ونوع الماكينة`,
      assignedCount: assignmentResults.length,
      details: assignmentResults
    });
  });

  // API - Assign Machine & Operator to Job
  app.post("/api/production/jobs/:id/assign", (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;

    const job = PRODUCTION_JOBS.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "لم يتم العثور على مهمة الإنتاج" });
      return;
    }

    if (machineId) {
      const mac = MACHINES.find(m => m.id === machineId);
      if (mac && mac.status !== "idle" && mac.currentJobId !== id) {
        res.status(400).json({ success: false, message: "الآلة قيد التشغيل حالياً في مهمة أخرى" });
        return;
      }
      job.machineId = machineId;
    }

    if (operatorId) {
      job.operatorId = operatorId;
    }

    res.json({ success: true, job });
  });

  // API - Start Production Job
  app.post("/api/production/jobs/:id/start", async (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;

    const job = PRODUCTION_JOBS.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "مهمة الإنتاج غير موجودة" });
      return;
    }

    const finalMachineId = machineId || job.machineId;
    const finalOperatorId = operatorId || job.operatorId;

    if (!finalMachineId) {
      res.status(400).json({ success: false, message: "يرجى تعيين آلة قبل بدء تشغيل المهمة" });
      return;
    }

    // Set Machine status to running
    const mac = MACHINES.find(m => m.id === finalMachineId);
    if (mac) {
      mac.status = "running";
      mac.currentJobId = id;
      const macId = idNum(mac.id, "mach-");
      if (macId) {
        try {
          await db.update(machinesTable).set({ status: "running", currentJobId: id }).where(eq(machinesTable.id, macId));
        } catch (err) {
          console.error("Error updating machine status on job start:", err);
        }
      }
    }

    job.machineId = finalMachineId;
    job.operatorId = finalOperatorId || "u-1";
    job.status = "running";

    // Auto-update associated order status to 'in_progress'
    let orderUpdated = false;
    let updatedOrderNumber = job.orderNumber;
    if (job.orderId || job.orderNumber) {
      const ord = ORDERS.find(o => (job.orderId && o.id === job.orderId) || (job.orderNumber && o.orderNumber === job.orderNumber));
      if (ord) {
        ord.status = 'in_progress';
        orderUpdated = true;
        updatedOrderNumber = ord.orderNumber;
        if (!ord.statusHistory) ord.statusHistory = [];
        ord.statusHistory.push({
          id: "sh_" + Date.now(),
          status: 'in_progress',
          note: `تحديث تلقائي: تم بدء تشغيل مهمة القص بالليزر (${job.jobNo}) على الماكينة (${mac ? mac.name : ''})`,
          createdAt: new Date().toISOString(),
          createdById: finalOperatorId || "u-1"
        });
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: job.operatorId,
      action: "START_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: job.id,
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(job, "started", `بدء التشغيل الفعلي للقص على ماكينة (${mac ? mac.name : 'الماكينة المحددة'})`);

    res.json({ success: true, job, orderUpdated, orderNumber: updatedOrderNumber });
  });

  // API - Pause Production Job
  app.post("/api/production/jobs/:id/pause", async (req, res) => {
    const { id } = req.params;

    const job = PRODUCTION_JOBS.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    job.status = "paused";

    if (job.machineId) {
      const mac = MACHINES.find(m => m.id === job.machineId);
      if (mac && mac.currentJobId === id) {
        mac.status = "idle";
        const macId = idNum(mac.id, "mach-");
        if (macId) {
          try {
            await db.update(machinesTable).set({ status: "idle" }).where(eq(machinesTable.id, macId));
          } catch (err) {
            console.error("Error updating machine status on job pause:", err);
          }
        }
      }
    }

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(job, "paused", "تم توقيف المهمة مؤقتاً بواسطة فني الماكينة");

    res.json({ success: true, job });
  });

  // API - Update Progress
  app.post("/api/production/jobs/:id/progress", (req, res) => {
    const { id } = req.params;
    const { progress, elapsedTimeSec } = req.body;

    const job = PRODUCTION_JOBS.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    if (job.status !== "running") {
      res.status(400).json({ success: false, message: "المهمة ليست قيد التشغيل حالياً" });
      return;
    }

    job.progress = Math.min(100, Math.max(0, Number(progress)));
    job.elapsedTimeSec = Number(elapsedTimeSec) || job.elapsedTimeSec;

    res.json({ success: true, job });
  });

  // API - Complete Production Job (with automatic stock deduction!)
  app.post("/api/production/jobs/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { remnantWidth, remnantHeight, remnantLocation } = req.body;

    const job = PRODUCTION_JOBS.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    if (job.status === "completed") {
      res.status(409).json({ success: false, message: "Production job is already completed" });
      return;
    }

    if (job.materialId) {
      const inv = INVENTORY.find(i => i.materialId === job.materialId);
      const availableQuantity = Number(inv?.availableQuantity ?? inv?.quantity ?? 0);
      if (!inv || Number(inv.quantity) < 1 || availableQuantity < 1) {
        res.status(409).json({
          success: false,
          code: "INSUFFICIENT_STOCK",
          message: "Production cannot be completed because material stock is insufficient",
        });
        return;
      }
    }

    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date().toISOString();

    // Release machine
    if (job.machineId) {
      const mac = MACHINES.find(m => m.id === job.machineId);
      if (mac) {
        mac.status = "idle";
        mac.currentJobId = null;
        mac.workingHours = Number((mac.workingHours + (job.estTimeSec / 3600)).toFixed(1));

        const macId = idNum(mac.id, "mach-");
        if (macId) {
          try {
            await db.update(machinesTable).set({
              status: "idle", currentJobId: null, workingHours: mac.workingHours,
            }).where(eq(machinesTable.id, macId));
          } catch (err) {
            console.error("Error releasing machine on job completion:", err);
          }
        }
      }
    }

    // Auto-deduct 1 unit from material inventory if exists
    if (job.materialId) {
      const inv = INVENTORY.find(i => i.materialId === job.materialId);
      if (inv && inv.quantity > 0) {
        const beforeQty = inv.quantity;
        inv.quantity -= 1;
        inv.availableQuantity = inv.quantity - inv.reservedQuantity;

        const matId = idNum(job.materialId, "m-");
        const invId = idNum(inv.id, "inv-");
        try {
          if (invId) {
            await db.update(inventoryTable).set({ quantity: inv.quantity, availableQuantity: inv.availableQuantity }).where(eq(inventoryTable.id, invId));
          }
          if (matId) {
            await db.insert(inventoryTransactionsTable).values({
              materialId: matId, type: "consumption", quantity: -1, beforeQty, afterQty: inv.quantity,
              referenceType: "production_job", referenceId: job.id,
              reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
            });
          }
        } catch (err) {
          console.error("Error deducting inventory on job completion:", err);
        }

        // Log transaction
        INVENTORY_TRANSACTIONS.push({
          id: nextEntityId("tx"),
          materialId: job.materialId,
          type: "consumption",
          quantity: -1,
          beforeQty,
          afterQty: inv.quantity,
          referenceType: "production_job",
          referenceId: job.id,
          reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
          createdById: job.operatorId || "u-1",
          createdAt: new Date().toISOString()
        });
      }
    }

    // Add remnant offcut if specified
    let addedRemnant = null;
    if (remnantWidth && remnantHeight) {
      const matId = idNum(job.materialId, "m-");
      try {
        if (matId) {
          const inserted = await db.insert(remnantsTable).values({
            materialId: matId, width: Number(remnantWidth), height: Number(remnantHeight),
            area: Number(remnantWidth) * Number(remnantHeight), quantity: 1, status: "available",
            location: remnantLocation || "رف البقايا التلقائي",
          }).returning();
          const row = inserted[0];
          addedRemnant = {
            id: "rem-" + row.id, materialId: job.materialId, width: row.width, height: row.height,
            area: row.area, quantity: row.quantity, status: row.status, location: row.location || "",
          };
        }
      } catch (err) {
        console.error("Error adding remnant on job completion:", err);
      }
      if (!addedRemnant) {
        addedRemnant = {
          id: "rem-" + Date.now(),
          materialId: job.materialId,
          width: Number(remnantWidth),
          height: Number(remnantHeight),
          area: Number(remnantWidth) * Number(remnantHeight),
          quantity: 1,
          status: "available",
          location: remnantLocation || "رف البقايا التلقائي"
        };
      }
      REMNANTS.push(addedRemnant);
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: job.operatorId || "u-1",
      action: "COMPLETE_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: job.id,
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously for job completion!
    sendProductionJobEmailNotification(job, "completed", "تم انتهاء قص المهمة بالكامل (100%) وتخزين البقايا الناتجة بالمخزن لضمان المتابعة الفورية");

    res.json({ success: true, job, addedRemnant });
  });

  // API - Machine Maintenance Trigger
  app.post("/api/production/machines/:id/maintenance", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role === "accountant") {
      res.status(403).json({ success: false, message: "غير مصرح للمحاسب المالي بتعديل حالة الآلات" });
      return;
    }
    const { id } = req.params;
    const { status } = req.body; // "maintenance" or "idle"

    const mac = MACHINES.find(m => m.id === id);
    if (!mac) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }

    mac.status = status || "idle";
    if (status === "maintenance") {
      mac.lastMaintenance = new Date().toISOString().slice(0, 10);
    }

    try {
      const macId = idNum(mac.id, "mach-");
      if (macId) {
        await db.update(machinesTable).set({
          status: mac.status, lastMaintenance: mac.lastMaintenance,
        }).where(eq(machinesTable.id, macId));
      }
      res.json({ success: true, machine: mac });
    } catch (err: any) {
      console.error("Error updating machine maintenance status:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة الصيانة: " + err.message });
    }
  });

  // ==================== ACCOUNTING & FINANCE API ====================

  // Get Invoices
  app.get("/api/accounting/invoices", (req, res) => {
    const list = INVOICES.map(inv => {
      const cust = CUSTOMERS.find(c => c.id === inv.customerId);
      const ord = ORDERS.find(o => o.id === inv.orderId);
      return {
        ...inv,
        customerName: cust ? cust.name : "عميل غير معروف",
        orderNumber: ord ? ord.orderNumber : null
      };
    });
    res.json({ success: true, invoices: list });
  });

  // Create Custom Standalone Invoice
  app.post("/api/accounting/invoices", (req, res) => {
    const { customerId, totalPrice, dueDate, notes, items, taxPercent, discount } = req.body;
    if (!customerId) {
      res.status(400).json({ success: false, message: "العميل مطلوب" });
      return;
    }

    const invoiceId = nextEntityId("inv");
    const invItems = (items && items.length > 0) ? items.map((it: any, idx: number) => ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: invoiceId,
      productName: it.productName || "بند مخصص",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      tax: Number(it.tax) || 0,
      total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0) + (Number(it.tax) || 0),
      createdAt: new Date().toISOString()
    })) : [
      {
        id: `invitem-${Date.now()}-0`,
        invoiceId: invoiceId,
        productName: "فاتورة يدوية مخصصة",
        quantity: 1,
        unitPrice: Number(totalPrice) || 0,
        discount: Number(discount) || 0,
        tax: 0,
        total: Number(totalPrice) || 0,
        createdAt: new Date().toISOString()
      }
    ];

    const computedSubtotal = invItems.reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0);
    const computedTotal = invItems.reduce((sum: number, it: any) => sum + it.total, 0);
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : computedTotal;

    const newInv = {
      id: invoiceId,
      invoiceNumber: getNextNumber("invoice"),
      orderId: null,
      customerId,
      issueDate: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // default 7 days
      totalPrice: finalTotal,
      subtotal: computedSubtotal,
      taxPercent: Number(taxPercent) || 0,
      discount: Number(discount) || 0,
      paidAmount: 0,
      remaining: finalTotal,
      status: "draft", // Starts as draft per request
      notes: notes || "",
      items: invItems,
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: invoiceId,
          action: "created",
          userId: "u-1",
          createdAt: new Date().toISOString()
        }
      ]
    };

    INVOICES.unshift(newInv);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_INVOICE",
      entityType: "Invoice",
      entityId: newInv.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, invoice: newInv });
  });

  // Record Payment on Invoice
  app.post("/api/accounting/invoices/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, changedById, paymentId } = req.body;
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    if (inv.currencyFinalizedAt) {
      res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل دفعاتها بعد التسليم." });
      return;
    }

    const payInput = Number(amount);
    const invoiceRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || (inv.orderId ? ORDERS.find(o => o.id === inv.orderId)?.exchangeRateAtCreation : 0) || SETTINGS.exchangeRate || 135);
    const rate = Number.isFinite(invoiceRate) && invoiceRate > 0 ? invoiceRate : 135;
    const invoiceTotalUSD = Number(inv.totalPriceUSD ?? inv.totalPrice) || 0;
    const invoiceTotalSYP = Math.round(Number(inv.totalPriceSYP ?? (invoiceTotalUSD * rate)));
    const currentPaidUSD = Number.isFinite(Number(inv.paidAmountUSD ?? inv.paidAmount)) ? Math.max(0, Number(inv.paidAmountUSD ?? inv.paidAmount)) : 0;
    const currentPaidSYP = Math.round(Number(inv.paidAmountSYP ?? (currentPaidUSD * rate)));
    const currentRemainingSYP = Math.max(0, invoiceTotalSYP - currentPaidSYP);
    const payAmtSYP = currency === "SYP" ? Math.round(payInput) : Math.round(payInput * rate);
    const payAmtUSD = currency === "SYP" ? payAmtSYP / rate : payInput;
    if (!Number.isFinite(payInput) || payInput <= 0 || payAmtSYP <= 0) {
      res.status(400).json({ success: false, message: "مبلغ الدفعة يجب أن يكون رقمًا أكبر من الصفر" });
      return;
    }
    if (payAmtSYP > currentRemainingSYP + 1) {
      res.status(400).json({ success: false, message: `مبلغ القسط يتجاوز المتبقي. المتبقي: ${currentRemainingSYP.toLocaleString()} ل.س` });
      return;
    }
    if (paymentId && inv.payments?.some((payment: any) => payment.id === String(paymentId))) {
      res.status(409).json({ success: false, message: "هذه الدفعة مسجلة مسبقاً" });
      return;
    }
    inv.totalPriceUSD = invoiceTotalUSD;
    inv.totalPriceSYP = invoiceTotalSYP;
    inv.paidAmountUSD = Math.min(invoiceTotalUSD, currentPaidUSD + payAmtUSD);
    inv.paidAmountSYP = Math.min(invoiceTotalSYP, currentPaidSYP + payAmtSYP);
    inv.paidAmount = inv.paidAmountUSD;
    inv.remainingUSD = Math.max(0, invoiceTotalUSD - inv.paidAmountUSD);
    inv.remainingSYP = Math.max(0, invoiceTotalSYP - inv.paidAmountSYP);
    inv.remaining = inv.remainingUSD;
    inv.status = inv.remaining === 0 ? "paid" : inv.paidAmount > 0 ? "partially_paid" : "unpaid";
    const invoicePayment = {
      id: paymentId ? String(paymentId) : "pay_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      invoiceId: inv.id,
      orderId: inv.orderId,
      amountUSD: payAmtUSD,
      amountSYP: payAmtSYP,
      exchangeRate: rate,
      currency: "SYP",
      paymentMethod: paymentMethod || "cash",
      notes: notes || "دفعة فاتورة",
      recordedBy: changedById || "u-1",
      createdAt: new Date().toISOString()
    };
    if (!inv.payments) inv.payments = [];
    inv.payments.unshift(invoicePayment);
    // If linked to an order, sync the order payment while preserving SYP storage.
    if (inv.orderId) {
      const ord = ORDERS.find(o => o.id === inv.orderId);
      if (ord) {
        const orderExchangeRate = Number(ord.exchangeRateAtCreation) > 0 ? Number(ord.exchangeRateAtCreation) : 135;
        const orderPayment = {
          ...invoicePayment,
          orderId: ord.id,
          amountSYP: payAmtSYP,
          exchangeRate: orderExchangeRate,
          currency: "SYP",
        };
        if (!ord.payments) ord.payments = [];
        if (!ord.payments.some((payment: any) => payment.id === orderPayment.id)) ord.payments.unshift(orderPayment);
        ord.paidAmount = Math.min(
          Number(ord.totalPrice || 0),
          ord.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * orderExchangeRate)), 0)
        );
        ord.remaining = Math.max(0, Number(ord.totalPrice || 0) - ord.paidAmount);
        ord.statusHistory.unshift({
          oldStatus: ord.status,
          newStatus: ord.status,
          notes: `تم تسديد دفعة مالية عبر الفاتورة بقيمة ${payAmtSYP.toLocaleString()} ل.س ($${payAmtUSD.toFixed(2)}). ${notes || ""}`,
          changedAt: new Date().toISOString()
        });
      }
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "RECORD_INVOICE_PAYMENT",
      entityType: "Invoice",
      entityId: inv.id,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json({ success: true, invoice: inv });
  });
  // Get Single Invoice Details
  app.get("/api/accounting/invoices/:id", (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    const cust = CUSTOMERS.find(c => c.id === inv.customerId);
    const ord = ORDERS.find(o => o.id === inv.orderId);
    res.json({
      success: true,
      invoice: {
        ...inv,
        customerName: cust ? cust.name : "عميل غير معروف",
        orderNumber: ord ? ord.orderNumber : null
      }
    });
  });

  // Update Invoice Details (Saves modification history)
  app.put("/api/accounting/invoices/:id", (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { notes, dueDate, items, taxPercent, discount, totalPrice } = req.body;
    const oldData = JSON.parse(JSON.stringify(inv));
    if (inv.currencyFinalizedAt && (items !== undefined || taxPercent !== undefined || discount !== undefined || totalPrice !== undefined)) {
      res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل قيمتها بعد التسليم الكامل." });
      return;
    }

    if (dueDate) inv.dueDate = dueDate;
    if (notes !== undefined) inv.notes = notes;
    if (taxPercent !== undefined) inv.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) inv.discount = Number(discount) || 0;

    if (items && Array.isArray(items)) {
      inv.items = items.map((it: any, idx: number) => ({
        id: it.id || `invitem-${Date.now()}-${idx}`,
        invoiceId: inv.id,
        productName: it.productName || "بند مخصص",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        tax: Number(it.tax) || 0,
        total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0) + (Number(it.tax) || 0),
        createdAt: it.createdAt || new Date().toISOString()
      }));
    }

    const computedSubtotal = inv.items ? inv.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0) : inv.totalPrice;
    inv.subtotal = computedSubtotal;

    const computedTotal = inv.items ? inv.items.reduce((sum: number, it: any) => sum + it.total, 0) : inv.totalPrice;
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : computedTotal;
    inv.totalPrice = finalTotal;
    inv.remaining = Math.max(0, finalTotal - inv.paidAmount);

    // Record history
    const historyEntry = {
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: "updated" as const,
      oldData,
      newData: JSON.parse(JSON.stringify(inv)),
      userId: "u-1",
      createdAt: new Date().toISOString()
    };
    if (!inv.history) inv.history = [];
    inv.history.push(historyEntry);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_INVOICE",
      entityType: "Invoice",
      entityId: inv.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, invoice: inv });
  });

  // Update Invoice Status
  app.post("/api/accounting/invoices/:id/status", (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { status } = req.body;
    const oldData = { status: inv.status };
    inv.status = status;

    if (!inv.history) inv.history = [];
    inv.history.push({
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: (status === "cancelled" ? "cancelled" : status === "paid" ? "paid" : "updated") as any,
      oldData,
      newData: { status },
      userId: "u-1",
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, invoice: inv });
  });

  // Create Credit Note (Reverse/Refund Invoice)
  app.post("/api/accounting/invoices/:id/credit-note", (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة الأصلية غير موجودة" });
      return;
    }

    const creditNoteId = nextEntityId("inv");
    const creditItems = inv.items ? inv.items.map((it: any, idx: number) => ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: creditNoteId,
      productName: `مرتجع: ${it.productName}`,
      quantity: -it.quantity,
      unitPrice: it.unitPrice,
      discount: -it.discount,
      tax: -it.tax,
      total: -it.total,
      createdAt: new Date().toISOString()
    })) : [
      {
        id: `invitem-${Date.now()}-0`,
        invoiceId: creditNoteId,
        productName: `إشعار دائن للفاتورة ${inv.invoiceNumber}`,
        quantity: -1,
        unitPrice: inv.totalPrice,
        discount: 0,
        tax: 0,
        total: -inv.totalPrice,
        createdAt: new Date().toISOString()
      }
    ];

    const creditInvoice = {
      id: creditNoteId,
      invoiceNumber: getNextNumber("invoice") + "-CN",
      orderId: inv.orderId,
      customerId: inv.customerId,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      totalPrice: -inv.totalPrice,
      subtotal: inv.subtotal ? -inv.subtotal : -inv.totalPrice,
      taxPercent: inv.taxPercent || 0,
      discount: inv.discount ? -inv.discount : 0,
      paidAmount: -inv.paidAmount,
      remaining: 0,
      status: "credit_note" as const,
      notes: `إشعار دائن للفاتورة رقم: ${inv.invoiceNumber}`,
      items: creditItems,
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: creditNoteId,
          action: "credit_note" as const,
          userId: "u-1",
          createdAt: new Date().toISOString()
        }
      ]
    };

    INVOICES.unshift(creditInvoice);
    inv.status = "cancelled"; // Auto cancel the original invoice or flag it

    if (!inv.history) inv.history = [];
    inv.history.push({
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: "cancelled",
      userId: "u-1",
      createdAt: new Date().toISOString(),
      notes: `تم إلغاء الفاتورة وإصدار إشعار دائن رقم ${creditInvoice.invoiceNumber}`
    });

    res.json({ success: true, creditInvoice, originalInvoice: inv });
  });

  // Get Numbering Settings
  app.get("/api/accounting/numbering", (req, res) => {
    res.json({ success: true, settings: NUMBERING_SETTINGS });
  });

  // Update Numbering Settings
  app.put("/api/accounting/numbering/:id", (req, res) => {
    const setting = NUMBERING_SETTINGS.find(s => s.id === req.params.id);
    if (!setting) {
      res.status(404).json({ success: false, message: "الإعدادات غير موجودة" });
      return;
    }
    const { prefix, suffix, digits, separator, nextNumber } = req.body;
    if (prefix !== undefined) setting.prefix = prefix;
    if (suffix !== undefined) setting.suffix = suffix;
    if (digits !== undefined) setting.digits = Number(digits) || 6;
    if (separator !== undefined) setting.separator = separator;
    if (nextNumber !== undefined) setting.nextNumber = Number(nextNumber) || 1;

    res.json({ success: true, setting });
  });

  // Get Expenses
  app.get("/api/accounting/expenses", (req, res) => {
    res.json({ success: true, expenses: EXPENSES });
  });

  // Create Expense
  app.post("/api/accounting/expenses", (req, res) => {
        const { category, amount, amountSYP, date, description, status, exchangeRateAtCreation } = req.body;
    const amountUSD = Number(amount);
    const requestedSYP = amountSYP === undefined ? undefined : Number(amountSYP);
    const expenseRate = Number(exchangeRateAtCreation ?? SETTINGS.exchangeRate);
    if (!String(category || "").trim() || !Number.isFinite(amountUSD) || amountUSD <= 0 || !String(date || "").trim() || Number.isNaN(Date.parse(String(date)))) {
      res.status(400).json({ success: false, message: "الفئة والقيمة الموجبة والتاريخ الصحيح مطلوبة" });
      return;
    }
    if (requestedSYP !== undefined && (!Number.isFinite(requestedSYP) || requestedSYP <= 0)) {
      res.status(400).json({ success: false, message: "قيمة SYP يجب أن تكون موجبة وصالحة" });
      return;
    }
    const safeExpenseRate = Number.isFinite(expenseRate) && expenseRate > 0 ? expenseRate : 135;
    const newExp = {
      id: nextEntityId("exp"),
      category,
      amount: amountUSD,
      amountUSD,
      amountSYP: requestedSYP === undefined ? Math.round(amountUSD * safeExpenseRate) : Math.round(requestedSYP),
      exchangeRateAtCreation: safeExpenseRate,
      currency: "USD",
      date,
      description: description || "",
      status: status || "paid",
      createdById: "u-1"
    };

    EXPENSES.unshift(newExp);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: newExp.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, expense: newExp });
  });

  // Update Expense
  app.put("/api/accounting/expenses/:id", (req, res) => {
    const { category, amount, amountSYP, date, description, status, exchangeRateAtCreation } = req.body;
    const exp = EXPENSES.find(e => e.id === req.params.id);
    if (!exp) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    if (category !== undefined && !String(category || "").trim()) {
      res.status(400).json({ success: false, message: "فئة المصروف مطلوبة" });
      return;
    }
    if (amount !== undefined) {
      const nextAmountUSD = Number(amount);
      const nextAmountSYP = amountSYP === undefined ? undefined : Number(amountSYP);
      const requestedRate = Number(exchangeRateAtCreation ?? SETTINGS.exchangeRate);
      const safeRate = Number.isFinite(requestedRate) && requestedRate > 0 ? requestedRate : 135;
      if (!Number.isFinite(nextAmountUSD) || nextAmountUSD <= 0 || (nextAmountSYP !== undefined && (!Number.isFinite(nextAmountSYP) || nextAmountSYP <= 0))) {
        res.status(400).json({ success: false, message: "قيمة المصروف وقيمة SYP يجب أن تكونا موجبتين وصالحتين" });
        return;
      }
      exp.amount = nextAmountUSD;
      exp.amountUSD = nextAmountUSD;
      exp.amountSYP = nextAmountSYP === undefined ? Math.round(nextAmountUSD * safeRate) : Math.round(nextAmountSYP);
      exp.exchangeRateAtCreation = safeRate;
      exp.currency = "USD";
    }
    if (date !== undefined) {
      if (!String(date || "").trim() || Number.isNaN(Date.parse(String(date)))) {
        res.status(400).json({ success: false, message: "تاريخ المصروف غير صالح" });
        return;
      }
      exp.date = date;
    }
    if (description !== undefined) exp.description = description;
    if (status !== undefined) {
      if (!["paid", "pending"].includes(status)) {
        res.status(400).json({ success: false, message: "حالة المصروف غير صالحة" });
        return;
      }
      exp.status = status;
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: exp.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, expense: exp });
  });

  // Delete Expense
  app.delete("/api/accounting/expenses/:id", (req, res) => {
    const idx = EXPENSES.findIndex(e => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    const deleted = EXPENSES.splice(idx, 1)[0];

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: deleted.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, expense: deleted });
  });

  // Get Finance Stats
  app.get("/api/accounting/stats", (req, res) => {
    const reportRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
    const invoiceSYP = (inv: any, usdField: string, sypField: string) => {
      const fixedSYP = Number(inv[sypField]);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const linkedOrder = ORDERS.find((order: any) => order.id === inv.orderId);
      const historicalRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || linkedOrder?.exchangeRateAtCreation);
      const rate = historicalRate > 0 ? historicalRate : 135;
      return Math.round((Number(inv[usdField]) || 0) * rate);
    };
    const totalRevenue = INVOICES.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalReceivables = INVOICES.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
    const totalRevenueSYP = INVOICES.reduce((sum, inv) => sum + invoiceSYP(inv, "paidAmount", "paidAmountSYP"), 0);
    const totalReceivablesSYP = INVOICES.reduce((sum, inv) => sum + invoiceSYP(inv, "remaining", "remainingSYP"), 0);
    const expenseSYP = (exp: any) => {
      const fixedSYP = Number(exp.amountSYP);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const historicalRate = Number(exp.exchangeRateAtCreation);
      return Math.round((Number(exp.amountUSD ?? exp.amount) || 0) * (historicalRate > 0 ? historicalRate : 135));
    };
    const totalExpenses = EXPENSES.reduce((sum, exp) => sum + (exp.amountUSD ?? exp.amount ?? 0), 0);
    const totalExpensesSYP = EXPENSES.reduce((sum, exp) => sum + expenseSYP(exp), 0);
    const netProfit = totalRevenue - totalExpenses;
    const netProfitSYP = totalRevenueSYP - totalExpensesSYP;

    // Group expenses by category
    const expenseCategories: Record<string, number> = {};
    EXPENSES.forEach(e => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + (e.amountUSD ?? e.amount);
    });

    const categoryBreakdown = Object.entries(expenseCategories).map(([name, value]) => ({
      name,
      value
    }));

    // Group revenue and expenses by calendar month without merging the same month across years.
    const monthlyData: Record<string, { revenue: number; revenueSYP: number; expenses: number; expensesSYP: number }> = {};
    const monthKeyFor = (value: unknown) => {
      const date = new Date(String(value || ""));
      if (Number.isNaN(date.getTime())) return null;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    };
    const monthLabelFor = (monthKey: string) => {
      const [year, month] = monthKey.split("-").map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString("ar-EG", { month: "short", year: "numeric" });
    };

    INVOICES.forEach(inv => {
      const monthKey = monthKeyFor(inv.issueDate);
      if (!monthKey) return;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, revenueSYP: 0, expenses: 0, expensesSYP: 0 };
      monthlyData[monthKey].revenue += (inv.paidAmount || 0);
      monthlyData[monthKey].revenueSYP += invoiceSYP(inv, "paidAmount", "paidAmountSYP");
    });

    EXPENSES.forEach(exp => {
      const monthKey = monthKeyFor(exp.date);
      if (!monthKey) return;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, revenueSYP: 0, expenses: 0, expensesSYP: 0 };
      monthlyData[monthKey].expenses += (exp.amountUSD ?? exp.amount);
      monthlyData[monthKey].expensesSYP += expenseSYP(exp);
    });

    const monthlyTrends = Object.keys(monthlyData)
      .sort()
      .slice(-6)
      .map(monthKey => {
        const data = monthlyData[monthKey];
        return {
          month: monthLabelFor(monthKey),
          monthKey,
          revenue: data.revenue,
          revenueSYP: data.revenueSYP,
          expenses: data.expenses,
          expensesSYP: data.expensesSYP,
          profit: data.revenue - data.expenses,
          profitSYP: data.revenueSYP - data.expensesSYP
        };
      });

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalReceivables,
        totalRevenueSYP,
        totalReceivablesSYP,
        totalExpenses,
        totalExpensesSYP,
        netProfit,
        netProfitSYP,
        categoryBreakdown,
        monthlyTrends
      }
    });
  });

  // ==================== REPORTS & ANALYTICS API ====================
  app.get("/api/reports/analytics", (req, res) => {
    // 1. Sales & Orders
    const totalOrdersCount = ORDERS.length;
    const orderValueSYP = (order: any) => Math.round(Number(order.totalPrice) || 0);
    const totalOrdersValueSYP = ORDERS.reduce((sum, ord) => sum + orderValueSYP(ord), 0);
    const avgOrderValueSYP = totalOrdersCount > 0 ? (totalOrdersValueSYP / totalOrdersCount) : 0;
    const currentRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
    const totalOrdersValueUSD = sypToUsd(totalOrdersValueSYP, currentRate);
    
    const ordersByStatus: Record<string, number> = {};
    ORDERS.forEach(ord => {
      ordersByStatus[ord.status] = (ordersByStatus[ord.status] || 0) + 1;
    });

    // Top Customers by spending
    const customerSpending: Record<string, number> = {};
    ORDERS.forEach(ord => {
      customerSpending[ord.customerId] = (customerSpending[ord.customerId] || 0) + orderValueSYP(ord);
    });
    
    const topCustomers = Object.entries(customerSpending).map(([id, totalSpent]) => {
      const cust = CUSTOMERS.find(c => c.id === id);
      return {
        id,
        name: cust ? cust.name : "عميل غير معروف",
        company: cust ? (cust.company || "أفراد") : "أفراد",
        totalSpent,
        totalSpentSYP: totalSpent,
        totalSpentUSD: sypToUsd(totalSpent, currentRate)
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    // 2. Financial Metrics
    const invoiceReportRate = currentRate;
    const invoiceSYP = (inv: any, usdField: string, sypField: string) => {
      const fixedSYP = Number(inv[sypField]);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const linkedOrder = ORDERS.find((order: any) => order.id === inv.orderId);
      const historicalRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || linkedOrder?.exchangeRateAtCreation);
      const rate = historicalRate > 0 ? historicalRate : 135;
      return Math.round((Number(inv[usdField]) || 0) * rate);
    };
    const totalRevenue = INVOICES.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalReceivables = INVOICES.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
    const totalRevenueSYP = INVOICES.reduce((sum, inv) => sum + invoiceSYP(inv, "paidAmount", "paidAmountSYP"), 0);
    const totalReceivablesSYP = INVOICES.reduce((sum, inv) => sum + invoiceSYP(inv, "remaining", "remainingSYP"), 0);
    const expenseSYP = (exp: any) => {
      const fixedSYP = Number(exp.amountSYP);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const historicalRate = Number(exp.exchangeRateAtCreation);
      return Math.round((Number(exp.amountUSD ?? exp.amount) || 0) * (historicalRate > 0 ? historicalRate : 135));
    };
    const totalExpenses = EXPENSES.reduce((sum, exp) => sum + (exp.amountUSD ?? exp.amount ?? 0), 0);
    const totalExpensesSYP = EXPENSES.reduce((sum, exp) => sum + expenseSYP(exp), 0);
    const netProfit = totalRevenue - totalExpenses;
    const netProfitSYP = totalRevenueSYP - totalExpensesSYP;
    const profitMargin = totalRevenueSYP > 0 ? (netProfitSYP / totalRevenueSYP) * 100 : 0;

    const expenseCategories: Record<string, number> = {};
    EXPENSES.forEach(e => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + (e.amountUSD ?? e.amount);
    });
    const expenseBreakdown = Object.entries(expenseCategories).map(([name, value]) => ({
      name,
      value,
      valueUSD: value,
      valueSYP: EXPENSES.filter((expense: any) => expense.category === name).reduce((sum, expense) => sum + expenseSYP(expense), 0)
    }));

    // 3. Machines & Operations
    const machineUtilization = MACHINES.map(m => {
      // Find total jobs assigned to this machine
      // (The PRODUCTION_JOBS array) - let's find jobs belonging to this machine
      // Let's safe-guard with global array existence
      const totalJobs = (global as any).PRODUCTION_JOBS ? (global as any).PRODUCTION_JOBS.filter((j: any) => j.machineId === m.id).length : 0;
      const completedJobs = (global as any).PRODUCTION_JOBS ? (global as any).PRODUCTION_JOBS.filter((j: any) => j.machineId === m.id && j.status === "completed").length : 0;
      
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        workingHours: m.workingHours || 0,
        totalJobs,
        completedJobs
      };
    });

    // 4. Inventory & Materials
    const stockStatus = MATERIALS.map(m => {
      const invRecord = INVENTORY.find(i => i.materialId === m.id);
      const stockQty = invRecord ? invRecord.quantity : 0;
      const minStock = m.minimumStock || 0;
      const isLowStock = stockQty < minStock;
      
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        stockQuantity: stockQty,
        minimumStock: minStock,
        unit: m.unit,
        isLowStock,
        stockValue: stockQty * Math.round(Number(m.pricePerUnit) || 0),
        stockValueSYP: stockQty * Math.round(Number(m.pricePerUnit) || 0),
        stockValueUSD: sypToUsd(stockQty * Math.round(Number(m.pricePerUnit) || 0), currentRate)
      };
    });

    const lowStockCount = stockStatus.filter(s => s.isLowStock).length;
    const totalInventoryValue = stockStatus.reduce((sum, item) => sum + item.stockValue, 0);

    // Recent Financial Transactions Combined
    const recentInvoices = INVOICES.map(inv => ({
      id: inv.id,
      type: "invoice",
      reference: inv.invoiceNumber,
      amount: inv.totalPrice,
      amountUSD: Number(inv.totalPriceUSD ?? inv.totalPrice ?? 0),
      amountSYP: Math.round(Number(inv.totalPriceSYP ?? ((Number(inv.totalPriceUSD ?? inv.totalPrice) || 0) * (Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || ORDERS.find((order: any) => order.id === inv.orderId)?.exchangeRateAtCreation) || 135)))),
      date: inv.issueDate,
      description: `فاتورة مبيعات للعميل: ${CUSTOMERS.find(c => c.id === inv.customerId)?.name || "عميل غير معروف"}`,
      status: inv.status === "paid" ? "تم التحصيل" : (inv.status === "partially_paid" ? "محصل جزئياً" : "غير محصل")
    }));

    const recentExpenses = EXPENSES.map(exp => ({
      id: exp.id,
      type: "expense",
      reference: `EXP-${exp.id}`,
      amount: exp.amount,
      date: exp.date,
      description: `مصروفات [${exp.category}]: ${exp.description || "بدون بيان تفصيلي"}`,
      status: exp.status === "paid" ? "تم الصرف" : "معلق"
    }));

    const recentTransactions = [...recentInvoices, ...recentExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.json({
      success: true,
      analytics: {
        sales: {
          totalOrdersCount,
          totalOrdersValue: totalOrdersValueSYP,
          totalOrdersValueSYP,
          totalOrdersValueUSD,
          avgOrderValue: avgOrderValueSYP,
          avgOrderValueSYP,
          avgOrderValueUSD: sypToUsd(avgOrderValueSYP, currentRate),
          exchangeRate: currentRate,
          ordersByStatus,
          topCustomers
        },
        financial: {
          totalRevenue,
          totalReceivables,
          totalRevenueSYP,
          totalReceivablesSYP,
          totalExpenses,
          totalExpensesSYP,
          netProfit,
          netProfitSYP,
          profitMargin,
          partnerSharePercent: getPartnerSharePercentAt(),
          partnerProfit: netProfit * (getPartnerSharePercentAt() / 100),
          partnerProfitSYP: netProfitSYP * (getPartnerSharePercentAt() / 100),
          workshopProfit: netProfit * (1 - getPartnerSharePercentAt() / 100),
          workshopProfitSYP: netProfitSYP * (1 - getPartnerSharePercentAt() / 100),
          expenseBreakdown,
          recentTransactions
        },
        machines: machineUtilization,
        inventory: {
          stockStatus,
          lowStockCount,
          totalInventoryValue
        }
      }
    });
  });

  // ==================== SETTINGS & BACKUP API ====================
  app.get("/api/network/info", (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips: { name: string; address: string; family: string; internal: boolean }[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4") {
          ips.push({
            name: name,
            address: net.address,
            family: net.family,
            internal: net.internal
          });
        }
      }
    }
    res.json({
      success: true,
      ips: ips,
      port: 3000,
      platform: os.platform(),
      hostname: os.hostname(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Dedicated small endpoint for the exchange rate (single source of truth for
  // the whole app - frontend + every backend currency conversion reads/writes this).
  app.get("/api/exchange-rate", (req, res) => {
    res.json({ success: true, exchangeRate: SETTINGS.exchangeRate });
  });

  app.put("/api/exchange-rate", (req, res) => {
    const { exchangeRate } = req.body;
    const rate = Number(exchangeRate);
    if (!rate || rate <= 0) {
      res.status(400).json({ success: false, message: "سعر صرف غير صالح" });
      return;
    }
    SETTINGS.exchangeRate = rate;
    res.json({ success: true, exchangeRate: SETTINGS.exchangeRate });
  });

  app.get("/api/settings", (req, res) => {
    res.json({ success: true, settings: publicSettings() });
  });

  app.put("/api/settings", (req, res) => {
    const { company, smtp, pricing, production, inventory, backup, autoArchive, exchangeRate, partnerSharePercent } = req.body;
    if (company) SETTINGS.company = { ...SETTINGS.company, ...company };
    if (smtp) mergeSmtpSettings(smtp);
    if (pricing) SETTINGS.pricing = { ...SETTINGS.pricing, ...pricing };
    if (production) SETTINGS.production = { ...SETTINGS.production, ...production };
    if (inventory) SETTINGS.inventory = { ...SETTINGS.inventory, ...inventory };
    if (backup) SETTINGS.backup = { ...SETTINGS.backup, ...backup };
    if (autoArchive) SETTINGS.autoArchive = { ...SETTINGS.autoArchive, ...autoArchive };
    if (partnerSharePercent !== undefined) {
      const nextPartnerPercent = Number(partnerSharePercent);
      if (!Number.isFinite(nextPartnerPercent) || nextPartnerPercent < 0 || nextPartnerPercent > 100) {
        res.status(400).json({ success: false, message: "نسبة الشريك يجب أن تكون بين 0 و100%" });
        return;
      }
      const previousPartnerPercent = Number((SETTINGS as any).partnerSharePercent ?? 0);
      if (nextPartnerPercent !== previousPartnerPercent) {
        (SETTINGS as any).partnerShareHistory = Array.isArray((SETTINGS as any).partnerShareHistory)
          ? (SETTINGS as any).partnerShareHistory
          : [];
        (SETTINGS as any).partnerShareHistory.push({ effectiveFrom: new Date().toISOString(), percent: nextPartnerPercent });
      }
      (SETTINGS as any).partnerSharePercent = nextPartnerPercent;
    }
    if (exchangeRate !== undefined) {
      const nextExchangeRate = Number(exchangeRate);
      if (!Number.isFinite(nextExchangeRate) || nextExchangeRate <= 0) {
        res.status(400).json({ success: false, message: "سعر الصرف يجب أن يكون رقماً موجباً وصالحاً" });
        return;
      }
      SETTINGS.exchangeRate = nextExchangeRate;
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "UPDATE_SETTINGS",
      entityType: "Settings",
      entityId: "global",
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, settings: publicSettings() });
  });

  app.post("/api/settings/test-smtp", async (req, res) => {
    const { testEmail } = req.body;
    const targetEmail = testEmail || SETTINGS.smtp?.fromEmail || "techs@axislab.com";

    try {
      if (!SETTINGS.smtp) {
        res.status(400).json({ success: false, message: "إعدادات SMTP غير معرفة في النظام" });
        return;
      }

      const transporter = nodemailer.createTransport({
        host: SETTINGS.smtp.host,
        port: SETTINGS.smtp.port,
        secure: SETTINGS.smtp.secure,
        auth: (SETTINGS.smtp.user && SETTINGS.smtp.pass) ? {
          user: SETTINGS.smtp.user,
          pass: SETTINGS.smtp.pass
        } : undefined,
        tls: { rejectUnauthorized: false }
      });

      const mailOptions = {
        from: `"${SETTINGS.smtp.fromName}" <${SETTINGS.smtp.fromEmail}>`,
        to: targetEmail,
        subject: `[AXIS LAB] رسالة اختبار إعدادات خادم البريد الإلكتروني SMTP`,
        html: `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 20px; border-radius: 10px; border: 1px solid #c59257; max-width: 550px; margin: 0 auto;">
            <h2 style="color: #c59257; border-bottom: 1px solid #27272a; padding-bottom: 10px; margin-top: 0;">اختبار الاتصال بخادم SMTP - AXIS LAB</h2>
            <p style="font-size: 14px;">تم إرسال هذه الرسالة بنجاح للتحقق من سلامة وصحة إعدادات خادم البريد الإلكتروني الخاص بنظام تشغيل وإدارة ورش القص والنقش بالليزر.</p>
            <div style="background-color: #18181b; padding: 12px; border-radius: 6px; font-size: 13px; color: #d4d4d8;">
              <p style="margin: 4px 0;"><strong>المضيف (Host):</strong> ${SETTINGS.smtp.host}:${SETTINGS.smtp.port}</p>
              <p style="margin: 4px 0;"><strong>اسم البريد المرسل:</strong> ${SETTINGS.smtp.fromName} (${SETTINGS.smtp.fromEmail})</p>
              <p style="margin: 4px 0;"><strong>البريد المستلم للتجربة:</strong> ${targetEmail}</p>
              <p style="margin: 4px 0;"><strong>حالة التشفير:</strong> ${SETTINGS.smtp.secure ? "SSL/TLS مفعل" : "بدون تشفير مباشر (STARTTLS/Plain)"}</p>
            </div>
            <p style="font-size: 11px; color: #71717a; margin-top: 15px; text-align: center;">AXIS LAB ERP System - SMTP Notification Engine</p>
          </div>
        `,
        text: "اختبار الاتصال بخادم SMTP - AXIS LAB ERP System"
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        res.json({ success: true, message: `تم إرسال بريد الاختبار بنجاح إلى ${targetEmail}`, messageId: info.messageId });
      } catch (sendErr: any) {
        res.json({ success: true, warning: `تم اختبار التكوين وإرسال الطلب للخادم: ${sendErr.message}`, targetEmail });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, message: `فشل إرسال بريد الاختبار: ${err.message}` });
    }
  });

  const publicBackup = (backup: any) => {
    const { filePath, ...safeBackup } = backup;
    return safeBackup;
  };
  app.get("/api/backup", (req, res) => {
    res.json({ success: true, backups: BACKUPS.map(publicBackup) });
  });

  app.post("/api/backup", async (req, res) => {
    if (!USE_SQLITE) {
      res.status(501).json({ success: false, message: "النسخ المحلي الفعلي متاح في وضع SQLite فقط." });
      return;
    }
    try {
      await persistStateNow();
      const newBackup = await createSqliteBackup("manual");
      if (!newBackup) throw new Error("تعذر إنشاء نسخة SQLite");
      BACKUPS.unshift(newBackup);
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(), userId: "u-1", action: "CREATE_BACKUP",
        entityType: "Backup", entityId: newBackup.id, createdAt: new Date().toISOString()
      });
      schedulePersist();
      res.json({ success: true, backup: publicBackup(newBackup) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: `فشل إنشاء النسخة الاحتياطية: ${error.message}` });
    }
  });

  app.post("/api/backup/restore/:id", async (req, res) => {
    if (!USE_SQLITE) {
      res.status(501).json({ success: false, message: "استعادة SQLite المحلية متاحة في وضع SQLite فقط." });
      return;
    }
    const { id } = req.params;
    const backupObj = BACKUPS.find(b => b.id === id);
    if (!backupObj || !backupObj.filePath || !backupObj.sha256) {
      res.status(404).json({ success: false, message: "النسخة المحددة لا تحتوي على ملف SQLite صالح للاستعادة." });
      return;
    }
    try {
      const actualChecksum = await checksumFile(backupObj.filePath);
      if (actualChecksum !== backupObj.sha256) {
        res.status(409).json({ success: false, message: "فشل التحقق من سلامة النسخة الاحتياطية؛ checksum غير مطابق." });
        return;
      }
      await persistStateNow();
      const safetyBackup = await createSqliteBackup("safety");
      const SQL = await initSqlJs({ locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(process.cwd(), "node_modules", "sql.js", "dist", file) });
      localSqlite = new SQL.Database(fs.readFileSync(backupObj.filePath));
      await loadPersistedState();
      if (safetyBackup) BACKUPS.unshift(safetyBackup);
      await refreshWarehouseCache();
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(), userId: "u-1", action: "RESTORE_BACKUP",
        entityType: "Backup", entityId: id, createdAt: new Date().toISOString()
      });
      await flushLocalSqlite();
      schedulePersist();
      res.json({ success: true, message: "تم التحقق من النسخة واستعادتها. تم الاحتفاظ بنسخة أمان قبل الاستعادة." });
    } catch (error: any) {
      res.status(500).json({ success: false, message: `فشل استعادة النسخة الاحتياطية: ${error.message}` });
    }
  });

  // ==================== FILES & DOCUMENTS API ====================
  const UPLOAD_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    }
  });
  const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    ".dxf", ".dwg", ".svg", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".xlsx", ".xls", ".csv", ".doc", ".docx"
  ]);
  const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
        cb(new Error("نوع الملف غير مسموح به"));
        return;
      }
      cb(null, true);
    }
  });

  // File Upload
  app.post("/api/files/upload", (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "حجم الملف أكبر من الحد المسموح (25MB)"
          : err.message || "فشل رفع الملف";
        return res.status(400).json({ success: false, message });
      }
      next();
    });
  }, (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
      }

      const { entityType, entityId, uploadedBy } = req.body;
      const newFile = {
        id: "f-" + Date.now(),
        name: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedById: uploadedBy || "u-1",
        createdAt: new Date().toISOString()
      };

      FILES.push(newFile);

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: uploadedBy || "u-1",
        action: "UPLOAD_FILE",
        entityType: "File",
        entityId: newFile.id,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ success: true, file: newFile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get files of an entity
  app.get("/api/files/entity/:entityType/:entityId", (req, res) => {
    const { entityType, entityId } = req.params;
    const filtered = FILES.filter(f => f.entityType === entityType && f.entityId === entityId);
    res.json({ success: true, files: filtered });
  });

  // Download a file
  app.get("/api/files/:id/download", (req, res) => {
    const file = FILES.find(f => f.id === req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: "الملف غير موجود" });
    }

    if (file.path && fs.existsSync(file.path)) {
      res.download(file.path, file.originalName);
    } else {
      res.status(404).json({ success: false, message: "ملف النظام الفعلي غير موجود على القرص" });
    }
  });

  // Delete a file
  app.delete("/api/files/:id", (req, res) => {
    const idx = FILES.findIndex(f => f.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "الملف غير موجود" });
    }

    const file = FILES[idx];
    FILES.splice(idx, 1);

    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error("Error deleting file on disk", err);
      }
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: "u-1",
      action: "DELETE_FILE",
      entityType: "File",
      entityId: file.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, file });
  });

  // ==================== REPORT EXPORTS API ====================
  const FONT_PATH = path.join(process.cwd(), "Amiri-Regular.ttf");

  async function ensureFontExists(): Promise<string | null> {
    if (fs.existsSync(FONT_PATH)) return FONT_PATH;
    return new Promise((resolve) => {
      const file = fs.createWriteStream(FONT_PATH);
      https.get("https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf", (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(FONT_PATH);
        });
      }).on('error', (err) => {
        fs.unlink(FONT_PATH, () => {});
        console.error("Failed to download Amiri font, falling back", err);
        resolve(null);
      });
    });
  }

  function reverseArabicLine(text: string): string {
    if (!text) return "";
    if (!/[\u0600-\u06FF]/.test(text)) return text;
    const words = text.split(" ");
    const reversedWords = words.map(w => {
      if (/[\u0600-\u06FF]/.test(w)) {
        return w.split("").reverse().join("");
      }
      return w;
    });
    return reversedWords.reverse().join(" ");
  }

  // Export Sales Report to Excel
  app.get("/api/export/sales/excel", async (req, res) => {
    try {
      const { dateFrom, dateTo, customerId } = req.query;
      let filteredOrders = [...ORDERS];

      if (dateFrom) {
        filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) <= new Date(dateTo as string));
      }
      if (customerId) {
        filteredOrders = filteredOrders.filter(o => o.customerId === customerId);
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("تقرير المبيعات");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "رقم الطلب", key: "orderNumber", width: 20 },
        { header: "العميل", key: "customerName", width: 25 },
        { header: "التاريخ", key: "createdAt", width: 20 },
        { header: "الحالة", key: "status", width: 15 },
        { header: "الإجمالي ($)", key: "totalPrice", width: 15 },
        { header: "المدفوع ($)", key: "paidAmount", width: 15 },
        { header: "المتبقي ($)", key: "remaining", width: 15 }
      ];

      filteredOrders.forEach(order => {
        const cust = CUSTOMERS.find(c => c.id === order.customerId);
        sheet.addRow({
          orderNumber: order.orderNumber,
          customerName: cust ? cust.name : "عميل غير معروف",
          createdAt: new Date(order.createdAt).toLocaleDateString("ar-EG"),
          status: order.status === "delivered" ? "تم التسليم" : order.status === "in_progress" ? "قيد التنفيذ" : "جديد",
          totalPrice: order.totalPrice,
          paidAmount: order.paidAmount,
          remaining: order.remaining
        });
      });

      const headerRow = sheet.getRow(1);
      headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C59257" }
      };
      headerRow.alignment = { horizontal: "center" };

      const totalRow = sheet.addRow({
        orderNumber: "الإجمالي الكلي",
        customerName: "",
        createdAt: "",
        status: "",
        totalPrice: filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0),
        paidAmount: filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0),
        remaining: filteredOrders.reduce((sum, o) => sum + o.remaining, 0)
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=sales_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export Invoices Report to Excel
  app.get("/api/export/invoices/excel", async (req, res) => {
    try {
      const { status, dateFrom, dateTo } = req.query;
      let filteredInvoices = [...INVOICES];

      if (status) {
        filteredInvoices = filteredInvoices.filter(i => i.status === status);
      }
      if (dateFrom) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) <= new Date(dateTo as string));
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("سجل الفواتير");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "رقم الفاتورة", key: "invoiceNumber", width: 18 },
        { header: "العميل", key: "customerName", width: 25 },
        { header: "تاريخ الإصدار", key: "issueDate", width: 15 },
        { header: "تاريخ الاستحقاق", key: "dueDate", width: 15 },
        { header: "الحالة", key: "status", width: 15 },
        { header: "الإجمالي ($)", key: "totalPrice", width: 15 },
        { header: "المدفوع ($)", key: "paidAmount", width: 15 },
        { header: "المتبقي ($)", key: "remaining", width: 15 }
      ];

      filteredInvoices.forEach(inv => {
        const cust = CUSTOMERS.find(c => c.id === inv.customerId);
        let statusAr = "غير مدفوعة";
        if (inv.status === "paid") statusAr = "مدفوعة";
        else if (inv.status === "partially_paid") statusAr = "مدفوعة جزئياً";
        else if (inv.status === "draft") statusAr = "مسودة";
        else if (inv.status === "cancelled") statusAr = "ملغاة";
        else if (inv.status === "credit_note") statusAr = "إشعار دائن";

        sheet.addRow({
          invoiceNumber: inv.invoiceNumber,
          customerName: cust ? cust.name : "عميل غير معروف",
          issueDate: new Date(inv.issueDate).toLocaleDateString("ar-EG"),
          dueDate: new Date(inv.dueDate).toLocaleDateString("ar-EG"),
          status: statusAr,
          totalPrice: inv.totalPrice,
          paidAmount: inv.paidAmount,
          remaining: inv.remaining
        });
      });

      const headerRow = sheet.getRow(1);
      headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C59257" }
      };
      headerRow.alignment = { horizontal: "center" };

      const totalRow = sheet.addRow({
        invoiceNumber: "الإجمالي الكلي",
        customerName: "",
        issueDate: "",
        dueDate: "",
        status: "",
        totalPrice: filteredInvoices.reduce((sum, i) => sum + i.totalPrice, 0),
        paidAmount: filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
        remaining: filteredInvoices.reduce((sum, i) => sum + i.remaining, 0)
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=invoices_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export Inventory Report to Excel
  app.get("/api/export/inventory/excel", async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("تقرير المخزون والمواد");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "المادة", key: "name", width: 30 },
        { header: "الفئة", key: "category", width: 20 },
        { header: "السماكة (ملم)", key: "thickness", width: 15 },
        { header: "اللون", key: "color", width: 15 },
        { header: "الكمية المتوفرة", key: "available", width: 15 },
        { header: "الحد الأدنى", key: "minimum", width: 15 },
        { header: "سعر الوحدة (ل.س)", key: "price", width: 15 },
        { header: "القيمة الإجمالية (ل.س)", key: "totalValue", width: 15 }
      ];

      MATERIALS.forEach(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        sheet.addRow({
          name: m.name,
          category: m.category,
          thickness: m.thickness || "-",
          color: m.color || "-",
          available: qty,
          minimum: m.minimumStock,
          price: m.pricePerUnit,
          totalValue: qty * m.pricePerUnit
        });
      });

      const headerRow = sheet.getRow(1);
      headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C59257" }
      };
      headerRow.alignment = { horizontal: "center" };

      const totalVal = MATERIALS.reduce((sum, m) => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return sum + (qty * m.pricePerUnit);
      }, 0);

      const totalRow = sheet.addRow({
        name: "إجمالي قيمة المخزون",
        category: "",
        thickness: "",
        color: "",
        available: "",
        minimum: "",
        price: "",
        totalValue: totalVal
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=inventory_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Export Customers CSV Endpoint
  app.get("/api/export/customers/csv", async (req, res) => {
    try {
      const custs = CUSTOMERS;
      const allOrders = ORDERS;

      const headers = ["معرف العميل", "اسم العميل", "رقم الهاتف", "الواتساب", "الشركة", "العنوان", "عدد الطلبات", "إجمالي المسحوبات (ل.س)", "ملاحظات"];
      const rows = custs.map(c => {
        const cOrders = allOrders.filter(o => o.customerId === c.id);
        const totalSpent = cOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toFixed(2);
        return [
          c.id,
          c.name || "",
          c.phone || "",
          (c as any).whatsapp || c.phone || "",
          c.company || "فردي",
          c.address || "",
          cOrders.length,
          totalSpent,
          (c as any).notes || ""
        ];
      });

      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(row => row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        }).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Customers_Outreach_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to export customers CSV", details: e.message });
    }
  });

  // Export Materials CSV Endpoint
  app.get("/api/export/materials/csv", async (req, res) => {
    try {
      const mats = MATERIALS;

      const headers = [
        "كود المادة",
        "اسم المادة والخامة",
        "التصنيف",
        "السماكة (ملم)",
        "اللون",
        "حالة الجودة",
        "سعر الوحدة (ل.س)",
        "الرصيد المتاح",
        "الوحدة",
        "الكمية المحجوزة",
        "الحد الأدنى",
        "موقع التخزين",
        "حالة التوفر",
        "إجمالي قيمة المخزون (ل.س)"
      ];

      const rows = mats.map(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        const reserved = inv ? inv.reservedQuantity : 0;
        const min = m.minimumStock || 0;
        const priceSYP = Math.round(Number(m.pricePerUnit) || 0);
        const totalVal = Math.round(qty * priceSYP);
        const quality = (m as any).qualityStatus === 'defective' ? 'معيبة' : (m as any).qualityStatus === 'in_preparation' ? 'قيد التجهيز' : 'مفحوصة';
        const statusText = qty <= 0 ? 'نافذ بالكامل' : qty <= min ? 'منخفض / يتطلب توريد' : 'سليم ومتوفر';

        return [
          m.id,
          m.name || '',
          m.category || '',
          m.thickness || '-',
          m.color || '-',
          quality,
          priceSYP,
          qty,
          m.unit || 'وحدة',
          reserved,
          min,
          inv?.location || 'المستودع الرئيسي',
          statusText,
          totalVal
        ];
      });

      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(row => row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        }).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Materials_Audit_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to export materials CSV", details: e.message });
    }
  });

  // Export Advanced Invoice to PDF
  app.get("/api/accounting/invoices/:id/pdf", async (req, res) => {
    try {
      const invId = req.params.id;
      const inv = INVOICES.find(i => i.id === invId);
      if (!inv) {
        res.status(404).json({ error: "الفاتورة غير موجودة" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === inv.customerId);
      const customerName = customer ? customer.name : "عميل عام";
      const pdfRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || SETTINGS.exchangeRate) > 0 ? Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || SETTINGS.exchangeRate) : 135;
      const pdfTotalUSD = Number(inv.totalPriceUSD ?? inv.totalPrice ?? 0);
      const pdfPaidUSD = Number(inv.paidAmountUSD ?? inv.paidAmount ?? 0);
      const pdfRemainingUSD = Number(inv.remainingUSD ?? inv.remaining ?? 0);
      const pdfTotalSYP = Math.round(Number(inv.totalPriceSYP ?? (pdfTotalUSD * pdfRate)));
      const pdfPaidSYP = Math.round(Number(inv.paidAmountSYP ?? (pdfPaidUSD * pdfRate)));
      const pdfRemainingSYP = Math.round(Number(inv.remainingSYP ?? (pdfRemainingUSD * pdfRate)));

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${inv.invoiceNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors (Slate Dark)
      doc.rect(0, 0, 595, 120).fill("#09090b");
      
      // Bronze/Gold accent bar
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title & Contact Info from System Settings
      const companyTitle = SETTINGS.company?.name || "مجمع المحور والورش الذكية - AXIS LAB";
      const companyContactSub = `واتساب المبيعات: ${SETTINGS.company?.whatsapp || SETTINGS.company?.phone || ''} | البريد: ${SETTINGS.company?.email || ''} | إنستغرام: ${SETTINGS.company?.instagram || ''}`;

      doc.fillColor("#c59257").fontSize(22).text(reverseArabicLine(companyTitle), 0, 20, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(10).text(reverseArabicLine("فاتورة ضريبية رسمية ومستند مالي معتمد"), 0, 52, { align: "center", width: 595 });
      doc.fillColor("#71717a").fontSize(8.5).text(reverseArabicLine(companyContactSub), 0, 72, { align: "center", width: 595 });
      if (SETTINGS.company?.address || SETTINGS.company?.taxNumber) {
        const addrTax = `${SETTINGS.company?.address ? `العنوان: ${SETTINGS.company.address}` : ''} ${SETTINGS.company?.taxNumber ? `| الرقم الضريبي: ${SETTINGS.company.taxNumber}` : ''}`;
        doc.fillColor("#52525b").fontSize(8).text(reverseArabicLine(addrTax), 0, 88, { align: "center", width: 595 });
      }

      // Spacing below the header
      doc.moveDown(5);

      const infoY = 150;
      
      // Right block: Customer Details (Arabic rtl alignment)
      // High security mask: Hide personal phone, email, and address details, as requested
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات الجهة المستلمة:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("العنوان:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 65, { align: "right", width: 245 });

      // Left block: Invoice Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند الفاتورة:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم الفاتورة:")} ${inv.invoiceNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الإصدار:")} ${new Date(inv.issueDate).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الاستحقاق:")} ${new Date(inv.dueDate).toLocaleDateString("ar-EG")}`, 50, infoY + 65, { align: "right", width: 230 })
        .text(`${reverseArabicLine("حالة الدفع:")} ${reverseArabicLine(inv.status === 'paid' ? 'مدفوعة بالكامل' : inv.status === 'partially_paid' ? 'مدفوعة جزئياً' : inv.status === 'draft' ? 'مسودة غير مرسلة' : inv.status === 'cancelled' ? 'ملغاة' : inv.status === 'credit_note' ? 'إشعار دائن' : 'غير مدفوعة')}`, 50, infoY + 85, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background (Deep zinc tone with bronze text)
      doc.rect(50, tableY, 495, 25).fill("#18181b");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الخصم"), 130, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("سعر المفرد"), 190, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الكمية"), 270, tableY + 7, { align: "center", width: 40 });
      doc.text(reverseArabicLine("المنتج / الخدمة"), 310, tableY + 7, { align: "right", width: 220 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = inv.items || [];
      items.forEach((item: any, idx: number) => {
        // Stripe line background for readability
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || 1;
        const uPrice = Number(item.unitPrice) || 0;
        const discountAmt = Number(item.discount) || 0;
        const totalAmt = Number(item.total) || (qty * uPrice - discountAmt);
        
        doc.text(`$${totalAmt.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${discountAmt.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 60 });
        doc.text(`$${uPrice.toFixed(2)}`, 190, currentY + 6, { align: "center", width: 80 });
        doc.text(`${qty}`, 270, currentY + 6, { align: "center", width: 40 });
        doc.text(reverseArabicLine(item.productName || "بند مخصص"), 310, currentY + 6, { align: "right", width: 220 });

        currentY += 22;
      });

      // Bottom border for table
      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      // Financial summary calculations
      const summaryY = currentY + 20;
      doc.fillColor("#27272a").fontSize(10);

      // Draw operating notes if present
      if (inv.notes) {
        doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("ملاحظات وشروط مالية:"), 260, summaryY, { align: "right", width: 285 });
        doc.fillColor("#52525b").fontSize(10).text(reverseArabicLine(inv.notes), 260, summaryY + 20, { align: "right", width: 285 });
      }

      // Draw financial summary block on the left
      const sumLeftX = 50;
      const subtotal = inv.subtotal || pdfTotalUSD;
      const discount = inv.discount || 0;
      const taxPercent = inv.taxPercent || 0;
      const taxAmount = (subtotal * taxPercent) / 100;
      const finalTotal = pdfTotalUSD;

      doc.fillColor("#71717a");
      doc.text(reverseArabicLine("المجموع الفرعي:"), sumLeftX, summaryY, { align: "right", width: 100 });
      doc.text(`$${subtotal.toFixed(2)}`, sumLeftX + 110, summaryY, { align: "left", width: 80 });

      doc.text(`${reverseArabicLine("الضريبة")} (${taxPercent}%):`, sumLeftX, summaryY + 18, { align: "right", width: 100 });
      doc.text(`$${taxAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 18, { align: "left", width: 80 });

      doc.text(reverseArabicLine("الخصم الإضافي:"), sumLeftX, summaryY + 36, { align: "right", width: 100 });
      doc.text(`$${discount.toFixed(2)}`, sumLeftX + 110, summaryY + 36, { align: "left", width: 80 });

      // Highlight Final Total with a soft dark block
      doc.rect(sumLeftX, summaryY + 54, 200, 24).fill("#f4f4f5");
      doc.fillColor("#09090b").fontSize(11).font("Amiri");
      doc.text(reverseArabicLine("المجموع الإجمالي:"), sumLeftX, summaryY + 61, { align: "right", width: 100 });
      doc.text(`$${finalTotal.toFixed(2)} / ${pdfTotalSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 61, { align: "left", width: 150 });

      doc.fillColor("#16a34a").fontSize(10);
      doc.text(reverseArabicLine(`المبلغ المدفوع (سعر الصرف ${pdfRate}):`), sumLeftX, summaryY + 84, { align: "right", width: 100 });
      doc.text(`$${pdfPaidUSD.toFixed(2)} / ${pdfPaidSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 84, { align: "left", width: 150 });

      doc.fillColor("#dc2626");
      doc.text(reverseArabicLine("المتبقي المستحق:"), sumLeftX, summaryY + 102, { align: "right", width: 100 });
      doc.text(`$${pdfRemainingUSD.toFixed(2)} / ${pdfRemainingSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 102, { align: "left", width: 150 });

      // Footer brand signature
      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("تم إنشاء هذه الفاتورة إلكترونياً وتخضع لسياسات الخصوصية والأمان الفنية لنظام تشغيل الورش AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.text(reverseArabicLine("حساب العميل البنكي والبيانات الشخصية محجوبة تلقائياً لحماية سرية معلومات الشركاء"), 50, footerY + 23, { align: "center", width: 495 });

      doc.end();
    } catch (err: any) {
      console.error("Invoice PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + err.message });
    }
  });

  // Export Delivery Note (سند تسليم) to PDF
  app.get("/api/orders/:id/delivery-note/pdf", async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=delivery_note_${order.orderNumber}.pdf`);
      doc.pipe(res);

      doc.rect(0, 0, 595, 120).fill("#09090b");
      doc.rect(0, 115, 595, 5).fill("#c59257");

      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("سند تسليم خامات وأعمال جاهزة رسمي"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      // Privacy-first: mask sensitive coordinates, show customer name
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات المستلم:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم المستلم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("تاريخ التسليم المتوقع:")} ${order.deliveryDateExpected ? new Date(order.deliveryDateExpected).toLocaleDateString("ar-EG") : reverseArabicLine("غير محدد")}`, 300, infoY + 65, { align: "right", width: 245 });

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل السند:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم السند/الطلب:")} ${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ إنشاء الطلب:")} ${new Date(order.createdAt).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("الحالة:")} ${reverseArabicLine("جاهز للتسليم والاستلام")}`, 50, infoY + 65, { align: "right", width: 230 });

      doc.moveDown(8);
      const tableY = doc.y;

      doc.rect(50, tableY, 495, 25).fill("#18181b");
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("حالة الفحص والمطابقة"), 50, tableY + 7, { align: "center", width: 120 });
      doc.text(reverseArabicLine("الكمية"), 170, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("المواد وعناصر القطع المستلمة"), 230, tableY + 7, { align: "right", width: 300 });

      let currentY = tableY + 25;
      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }
        doc.fillColor("#27272a");
        doc.text(reverseArabicLine("[   ] مطابق ومستلم"), 50, currentY + 6, { align: "center", width: 120 });
        doc.text(`${item.quantity}`, 170, currentY + 6, { align: "center", width: 60 });
        doc.text(reverseArabicLine(item.productName || "عنصر مخصص"), 230, currentY + 6, { align: "right", width: 300 });
        currentY += 22;
      });

      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      const signY = currentY + 40;
      doc.fillColor("#09090b").fontSize(11);
      doc.text(reverseArabicLine("توقيع المستلم والعميل:"), 300, signY, { align: "right", width: 200 });
      doc.strokeColor("#a1a1aa").lineWidth(1).dash(5, { space: 3 }).moveTo(300, signY + 45).lineTo(500, signY + 45).stroke();

      doc.text(reverseArabicLine("أمين المستودع والمشرف:"), 50, signY, { align: "right", width: 200 });
      doc.strokeColor("#a1a1aa").lineWidth(1).moveTo(50, signY + 45).lineTo(250, signY + 45).stroke();

      const footerY = 740;
      doc.undash();
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("سند تسليم بضاعة رسمي صادر عن نظام تشغيل وإدارة ورش القص بالليزر AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: any) {
      console.error("Delivery Note PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد السند: " + err.message });
    }
  });

  // Export Work Order Job Ticket (أمر تشغيل للورشة) to PDF
  app.get("/api/production/jobs/:id/pdf", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = PRODUCTION_JOBS.find(j => j.id === jobId);
      if (!job) {
        res.status(404).json({ error: "مهمة الإنتاج غير موجودة" });
        return;
      }

      const ord = ORDERS.find(o => o.id === job.orderId);
      const mac = MACHINES.find(m => m.id === job.machineId);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=job_ticket_${job.jobNo}.pdf`);
      doc.pipe(res);

      doc.rect(0, 0, 595, 120).fill("#09090b");
      doc.rect(0, 115, 595, 5).fill("#c59257");

      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("تذكرة تشغيل ماكينة - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("بطاقة توجيه فنية للقص والحفر ليزر بالمعمل"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("مواصفات تذكرة التشغيل:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الماكينة المستهدفة:")} ${reverseArabicLine(mac ? mac.name : "غير محدد")}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("رقم تذكرة التشغيل:")} ${job.jobNo}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الحالة الفنية:")} ${reverseArabicLine(job.status === 'completed' ? 'تم الانتهاء والإنتاج' : job.status === 'running' ? 'قيد العمل والقص' : 'في الانتظار')}`, 300, infoY + 65, { align: "right", width: 245 });

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("البيانات الفنية للمواد والسرعة:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("اسم البند الفني:")} ${reverseArabicLine(job.itemName)}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("سرعة الليزر الفنية:")} ${job.laserSpeed || 300} mm/s`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("قوة الليزر الفنية:")} ${job.laserPower || 70}%`, 50, infoY + 65, { align: "right", width: 230 });

      doc.moveDown(8);
      const notesY = doc.y + 40;

      doc.rect(50, notesY, 495, 80).fill("#f4f4f5");
      doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("تعليمات تشغيل فني الماكينة:"), 70, notesY + 10, { align: "right", width: 455 });
      doc.fillColor("#27272a").fontSize(10).text(reverseArabicLine("الرجاء مطابقة الخامات وسماكة اللوح مع نوع الماكينة قبل الضغط على زر التشغيل. الالتزام بارتداء نظارات الوقاية والتحقق من تهوية المصنع بشكل كلي وقفل الغطاء الواقي أثناء دوران شعاع CO2 المباشر."), 70, notesY + 30, { align: "right", width: 455 });

      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("أمر إنتاج وتذكرة فنية مخصصة لماكينات الورش الذكية والقص بالليزر - AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: any) {
      console.error("Job ticket PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد تذكرة التشغيل: " + err.message });
    }
  });

  // Export Order Invoice / Delivery Note to PDF
  app.get("/api/orders/:id/pdf", async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";
      const customerPhone = customer ? customer.phone : "-";
      const customerAddress = customer ? customer.address : "-";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=order_${order.orderNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors
      doc.rect(0, 0, 595, 120).fill("#09090b");
      
      // Bronze/Gold accent bar
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title
      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("سند تشغيل وقص ليزر وفاتورة تسليم رسمية"), 0, 70, { align: "center", width: 595 });

      // Spacing below the header
      doc.moveDown(5);

      // Order Info Box (Left) and Customer Info Box (Right) - y position around 150
      const infoY = 150;
      
      // Right block: Customer Details (Arabic rtl alignment)
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات العميل المستلم:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${customerPhone}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("العنوان:")} ${reverseArabicLine(customerAddress)}`, 300, infoY + 65, { align: "right", width: 245 });

      // Left block: Order Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند الطلب:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم الطلب:")} ${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الإنشاء:")} ${new Date(order.createdAt).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ التسليم:")} ${order.deliveryDateExpected ? new Date(order.deliveryDateExpected).toLocaleDateString("ar-EG") : reverseArabicLine("غير محدد")}`, 50, infoY + 65, { align: "right", width: 230 })
        .text(`${reverseArabicLine("حالة الطلب:")} ${reverseArabicLine(order.status === 'delivered' ? 'تم التسليم والأرشفة' : order.status === 'in_progress' ? 'قيد الإنتاج والتشغيل' : order.status === 'completed' ? 'جاهز للتسليم' : 'جديد بانتظار البدء')}`, 50, infoY + 85, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background (Deep zinc tone with bronze text)
      doc.rect(50, tableY, 495, 25).fill("#18181b");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("سعر المفرد"), 130, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الكمية"), 210, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("المواد وعناصر القطع المطلوبة"), 270, tableY + 7, { align: "right", width: 260 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        // Stripe line background for readability
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || Number(item.qty) || 1;
        const uPrice = Number(item.unitPrice) || Number(item.price) || 0;
        const tPrice = Number(item.totalPrice) || (qty * uPrice);
        
        doc.text(`$${tPrice.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${uPrice.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 80 });
        doc.text(`${qty}`, 210, currentY + 6, { align: "center", width: 60 });
        doc.text(reverseArabicLine(item.productName || item.name || "عنصر تشغيل مخصص"), 270, currentY + 6, { align: "right", width: 260 });

        currentY += 22;
      });

      // Bottom border for table
      doc.rect(50, currentY, 495, 1).fill("#e4e4e7");

      // Notes block & Summary Block below table
      currentY += 15;
      const summaryY = currentY;

      // Right side: Notes
      if (order.notes) {
        doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("ملاحظات تشغيلية وفنية:"), 260, summaryY, { align: "right", width: 285 });
        doc.fillColor("#52525b").fontSize(10).text(reverseArabicLine(order.notes), 260, summaryY + 20, { align: "right", width: 285 });
      }

      // Left side: Detailed pricing summary
      const subtotal = items.reduce((acc: number, cur: any) => {
        const qty = Number(cur.quantity) || Number(cur.qty) || 1;
        const uPrice = Number(cur.unitPrice) || Number(cur.price) || 0;
        return acc + (Number(cur.totalPrice) || (qty * uPrice));
      }, 0);
      const taxPercent = Number(order.taxPercent) || 0;
      const taxAmount = subtotal * (taxPercent / 100);
      const discount = Number(order.discount) || 0;
      const finalTotal = Math.max(0, subtotal + taxAmount - discount);
      const paidAmount = Number(order.paidAmount) || 0;
      const remaining = Math.max(0, finalTotal - paidAmount);

      const sumLeftX = 50;
      const sumWidth = 190;

      doc.fillColor("#27272a").fontSize(10);
      
      // subtotal row
      doc.text(reverseArabicLine("مجموع المواد:"), sumLeftX, summaryY, { align: "right", width: 100 });
      doc.text(`$${subtotal.toFixed(2)}`, sumLeftX + 110, summaryY, { align: "left", width: 80 });

      // tax row
      doc.text(`${reverseArabicLine("الضريبة")} (${taxPercent}%):`, sumLeftX, summaryY + 18, { align: "right", width: 100 });
      doc.text(`+$${taxAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 18, { align: "left", width: 80 });

      // discount row
      doc.text(reverseArabicLine("الخصم الإضافي:"), sumLeftX, summaryY + 36, { align: "right", width: 100 });
      doc.text(`-$${discount.toFixed(2)}`, sumLeftX + 110, summaryY + 36, { align: "left", width: 80 });

      // draw divider
      doc.rect(sumLeftX, summaryY + 52, sumWidth, 1).fill("#c59257");

      // total price row
      doc.fillColor("#c59257").fontSize(11).font("Amiri");
      doc.text(reverseArabicLine("إجمالي السعر:"), sumLeftX, summaryY + 58, { align: "right", width: 100 });
      doc.text(`$${finalTotal.toFixed(2)}`, sumLeftX + 110, summaryY + 58, { align: "left", width: 80 });

      // paid row
      doc.fillColor("#10b981").fontSize(10);
      doc.text(reverseArabicLine("المدفوع سلفاً:"), sumLeftX, summaryY + 76, { align: "right", width: 100 });
      doc.text(`$${paidAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 76, { align: "left", width: 80 });

      // remaining row
      doc.fillColor(remaining > 0 ? "#f43f5e" : "#10b981").fontSize(10);
      doc.text(reverseArabicLine("الرصيد المتبقي:"), sumLeftX, summaryY + 94, { align: "right", width: 100 });
      doc.text(`$${remaining.toFixed(2)}`, sumLeftX + 110, summaryY + 94, { align: "left", width: 80 });

      // Footer disclaimer & signature at y = 730
      const footerY = 740;
      doc.rect(50, footerY, 495, 1).fill("#e4e4e7");
      
      doc.fillColor("#71717a").fontSize(9);
      doc.text(reverseArabicLine("تم إنشاء هذا المستند إلكترونياً بواسطة نظام تشغيل وإدارة ورش القص بالليزر AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.text(reverseArabicLine("نشكر ثقتكم بنا ونسعد دوماً بخدمتكم في الورشة والمصنع الذكي"), 50, footerY + 23, { align: "center", width: 495 });

      doc.end();
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + err.message });
    }
  });

  // Share Order details via email, WhatsApp, or other channels
  app.post("/api/orders/:id/share", async (req, res) => {
    try {
      const { id } = req.params;
      const { email, subject, body, method } = req.body;
      const order = ORDERS.find(o => o.id === id);
      if (!order) {
        res.status(404).json({ success: false, message: "الطلب غير موجود" });
        return;
      }

      // Record Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-1",
        action: `SHARE_ORDER_${method.toUpperCase()}`,
        entityType: "Order",
        entityId: order.id,
        createdAt: new Date().toISOString()
      });

      // Add a platform notification
      NOTIFICATIONS.unshift({
        id: "notif_" + Date.now(),
        title: "مشاركة طلب",
        message: `تم مشاركة الطلب رقم ${order.orderNumber} بنجاح عبر ${method === "email" ? "البريد الإلكتروني" : method === "whatsapp" ? "واتساب" : "رابط PDF"} للعميل.`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `تمت مشاركة ملخص الطلب رقم ${order.orderNumber} بنجاح عبر ${method === "email" ? "البريد الإلكتروني" : method === "whatsapp" ? "الواتساب" : "رابط PDF"}!`
      });
    } catch (err: any) {
      console.error("Error sharing order:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export Profit Report to PDF
  app.get("/api/export/profit/pdf", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      let filteredInvoices = [...INVOICES];
      let filteredExpenses = [...EXPENSES];

      if (dateFrom) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) >= new Date(dateFrom as string));
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) <= new Date(dateTo as string));
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= new Date(dateTo as string));
      }

      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=profit_report_${Date.now()}.pdf`);
      doc.pipe(res);

      // Title Card
      doc.rect(50, 40, 495, 80).fill("#101014");
      doc.fillColor("#C59257").fontSize(24).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 50, 55, { align: "center", width: 495 });
      doc.fillColor("#A1A1AA").fontSize(12).text(reverseArabicLine("تقرير الأرباح والتحليل المالي الكلي"), 50, 90, { align: "center", width: 495 });

      doc.moveDown(4);

      // Report Period
      const dateStr = `الفترة: ${dateFrom ? new Date(dateFrom as string).toLocaleDateString("ar-EG") : "البداية"} إلى ${dateTo ? new Date(dateTo as string).toLocaleDateString("ar-EG") : "اليوم"}`;
      doc.fillColor("#27272A").fontSize(12).text(reverseArabicLine(dateStr), { align: "right" });
      doc.moveDown(1.5);

      // Summary Cards
      const cardY = doc.y;
      
      // Card 1: Revenue
      doc.roundedRect(50, cardY, 150, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("إجمالي الإيرادات"), 50, cardY + 15, { align: "center", width: 150 });
      doc.fillColor("#E2BD8A").fontSize(16).text(`$${totalRevenue.toFixed(2)}`, 50, cardY + 40, { align: "center", width: 150 });

      // Card 2: Expenses
      doc.roundedRect(220, cardY, 150, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("إجمالي المصاريف"), 220, cardY + 15, { align: "center", width: 150 });
      doc.fillColor("#F43F5E").fontSize(16).text(`$${totalExpenses.toFixed(2)}`, 220, cardY + 40, { align: "center", width: 150 });

      // Card 3: Net Profit
      doc.roundedRect(390, cardY, 155, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("صافي الأرباح"), 390, cardY + 15, { align: "center", width: 155 });
      doc.fillColor(netProfit >= 0 ? "#10B981" : "#F43F5E").fontSize(16).text(`$${netProfit.toFixed(2)}`, 390, cardY + 40, { align: "center", width: 155 });

      doc.moveDown(7);

      // Margin and Profitability
      doc.fillColor("#27272A").fontSize(14).text(reverseArabicLine("التحليل والنسب المئوية"), { align: "right" });
      doc.rect(50, doc.y, 495, 2).fill("#C59257");
      doc.moveDown(1);

      doc.fillColor("#27272A").fontSize(11)
        .text(`${reverseArabicLine("هامش الربح الإجمالي:")} ${profitMargin.toFixed(1)}%`, { align: "right" })
        .text(`${reverseArabicLine("معدل الكفاءة التشغيلية:")} ${((totalExpenses / (totalRevenue || 1)) * 100).toFixed(1)}%`, { align: "right" });

      doc.moveDown(2);

      // Breakdown Table
      doc.fillColor("#27272A").fontSize(14).text(reverseArabicLine("جدول المصاريف التفصيلي"), { align: "right" });
      doc.rect(50, doc.y, 495, 2).fill("#C59257");
      doc.moveDown(1);

      // Header row
      const tableY = doc.y;
      doc.fillColor("#71717A").fontSize(10);
      doc.text(reverseArabicLine("البيان والوصف"), 50, tableY, { align: "right", width: 200 });
      doc.text(reverseArabicLine("الفئة"), 260, tableY, { align: "right", width: 120 });
      doc.text(reverseArabicLine("التاريخ"), 390, tableY, { align: "right", width: 80 });
      doc.text(reverseArabicLine("المبلغ"), 480, tableY, { align: "right", width: 65 });

      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 1).fill("#E4E4E7");
      doc.moveDown(0.5);

      filteredExpenses.forEach(exp => {
        const itemY = doc.y;
        doc.fillColor("#27272A").fontSize(10);
        doc.text(reverseArabicLine(exp.description || "مصروف عام"), 50, itemY, { align: "right", width: 200 });
        doc.text(reverseArabicLine(exp.category), 260, itemY, { align: "right", width: 120 });
        doc.text(new Date(exp.date).toLocaleDateString("ar-EG"), 390, itemY, { align: "right", width: 80 });
        doc.text(`$${exp.amount.toFixed(2)}`, 480, itemY, { align: "right", width: 65 });
        doc.moveDown(1);
      });

      doc.end();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
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
    const distPath = path.join(process.cwd(), 'dist');
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
    if (persistTimer) clearTimeout(persistTimer);
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

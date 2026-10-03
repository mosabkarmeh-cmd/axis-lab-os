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
import { materialPriceUSD } from "../lib/materials.ts";
import { sypToUsd } from "../lib/currency.ts";





import { db } from "../db/index.ts";
import { appState, customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable, suppliers as suppliersTable, supplyOrders as supplyOrdersTable, supplierQuotes as supplierQuotesTable, machines as machinesTable } from "../db/schema.ts";
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
const APP_RUNTIME_ROOT = process.env.AXIS_APP_ROOT || process.cwd();
const LOCAL_DATA_FILE = process.env.AXIS_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "AXIS LAB OS", "axis-data.sqlite");
const RESOURCE_FONT_PATH = process.env.AXIS_FONT_PATH || path.join(APP_RUNTIME_ROOT, "Amiri-Regular.ttf");
const LOCAL_LEGACY_DATA_FILE = process.env.AXIS_LEGACY_DATA_FILE || path.join(os.homedir(), "AppData", "Roaming", "Electron", "axis-data.json");
const LOCAL_SCHEMA_VERSION = 6;
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
const NORMALIZED_LOCAL_COLLECTIONS = ["CUSTOMERS", "PRODUCTS", "MATERIALS", "INVENTORY", "INVENTORY_TRANSACTIONS", "REMNANTS", "SUPPLIERS", "SUPPLY_ORDERS", "SUPPLIER_QUOTES", "MACHINES", "ORDERS", "ACTIVITY_LOGS", "NOTIFICATIONS", "PRODUCTION_JOBS"] as const;
const NORMALIZED_FINANCIAL_COLLECTIONS = ["INVOICES", "EXPENSES"] as const;
let localSqlite: any = null;

async function initLocalSqlite() {
  if (localSqlite) return localSqlite;
  const SQL = await initSqlJs({
    locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(APP_RUNTIME_ROOT, "node_modules", "sql.js", "dist", file),
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

function readFinancialTablesFromSqlite() {
  if (!USE_SQLITE || !localSqlite) return null;
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
  { id: "design_approved", name: "تم اعتماد التصميم", color: "#a78bfa", order: 3, isDefault: true },
  { id: "cutting", name: "قيد القص", color: "#60a5fa", order: 4, isDefault: true },
  { id: "cutting_complete", name: "انتهى القص", color: "#38bdf8", order: 5, isDefault: true },
  { id: "assembly", name: "قيد التجميع", color: "#f59e0b", order: 6, isDefault: true },
  { id: "assembly_complete", name: "انتهى التجميع", color: "#fbbf24", order: 7, isDefault: true },
  { id: "packaging", name: "قيد التغليف", color: "#fb923c", order: 8, isDefault: true },
  { id: "ready", name: "بانتظار التسليم", color: "#34d399", order: 9, isDefault: true },
  { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 10, isDefault: true },
  { id: "cancelled", name: "ملغي", color: "#f87171", order: 11, isDefault: true },
  { id: "in_progress", name: "قيد التنفيذ (قديم)", color: "#64748b", order: 99, isDefault: false }
];

function normalizeOrderStatuses() {
  const defaults = [
    { id: "new", name: "جديد", color: "#818cf8", order: 1, isDefault: true },
    { id: "design", name: "قيد التصميم", color: "#c084fc", order: 2, isDefault: true },
    { id: "design_approved", name: "تم اعتماد التصميم", color: "#a78bfa", order: 3, isDefault: true },
    { id: "cutting", name: "قيد القص", color: "#60a5fa", order: 4, isDefault: true },
    { id: "cutting_complete", name: "انتهى القص", color: "#38bdf8", order: 5, isDefault: true },
    { id: "assembly", name: "قيد التجميع", color: "#f59e0b", order: 6, isDefault: true },
    { id: "assembly_complete", name: "انتهى التجميع", color: "#fbbf24", order: 7, isDefault: true },
    { id: "packaging", name: "قيد التغليف", color: "#fb923c", order: 8, isDefault: true },
    { id: "ready", name: "بانتظار التسليم", color: "#34d399", order: 9, isDefault: true },
    { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 10, isDefault: true },
    { id: "cancelled", name: "ملغي", color: "#f87171", order: 11, isDefault: true },
    { id: "in_progress", name: "قيد التنفيذ (قديم)", color: "#64748b", order: 99, isDefault: false }
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

const WORKFLOW_NEXT_REMINDERS: Record<string, string> = {
  new: "اعتمد التصميم قبل تحويل الطلب للتنفيذ.",
  design: "بعد اكتمال التصميم، سجّل اعتماد التصميم.",
  design_approved: "التصميم معتمد؛ ابدأ مهمة القص من لوحة الإنتاج.",
  cutting_complete: "انتهى القص؛ ابدأ مرحلة التجميع.",
  assembly_complete: "انتهى التجميع؛ ابدأ مرحلة التغليف.",
  packaging: "بعد انتهاء التغليف، حوّل الطلب إلى بانتظار التسليم.",
  ready: "تواصل مع العميل وسجّل التسليم بعد استيفاء الدفعة المتبقية."
};

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

// Public runtime contract consumed by the extracted API route modules.
export { apiKey, ai, DB_MODE, USE_POSTGRES, USE_SQLITE, APP_RUNTIME_ROOT, LOCAL_DATA_FILE, RESOURCE_FONT_PATH, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, NORMALIZED_LOCAL_COLLECTIONS, NORMALIZED_FINANCIAL_COLLECTIONS, initLocalSqlite, setLocalSqlite, SQLITE_BUSY_RETRY_DELAYS_MS, withSqliteBusyRetry, flushLocalSqlite, syncNormalizedLocalEntities, assertFinancialStateInvariants, syncNormalizedFinancialEntities, readFinancialTablesFromSqlite, backupDirectory, checksumFile, createSqliteBackup, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, publicUser, generateJWT, getRequestUser, USERS, FILES, CUSTOMERS, PRODUCTS, ORDERS, ACTIVITY_LOGS, MATERIALS, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, normalizeLegacyMaterialPrices, INVENTORY, INVENTORY_TRANSACTIONS, normalizeInventoryState, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, ensureDemoLowPriceMaterials, MACHINES, EXPENSES, NUMBERING_SETTINGS, getNextNumber, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, normalizeOrderStatuses, createNotification, notifyOverdueOrders, WORKFLOW_NEXT_REMINDERS, INVOICES, SETTINGS, publicSettings, getPartnerSharePercentAt, mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification, BACKUPS, PRODUCTION_JOBS, PERSISTED_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS, idNum, refreshWarehouseCache, loadPersistedState, persistTimer, persistInFlight, persistAgainAfter, persistStateNow, persistMutationWithFastDurability, schedulePersist, RESETTABLE_BUSINESS_COLLECTIONS, resetBusinessData, sypToUsd };
export type { UserRecord, BenchmarkBucket };

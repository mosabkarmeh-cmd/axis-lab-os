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
import { createStatePersistence } from "./runtime/state-persistence.ts";
import { createLocalSqliteRuntime, localSqlite, setLocalSqlite } from "./runtime/local-sqlite.ts";
import { syncNormalizedLocalEntities as syncLocalEntities, assertFinancialStateInvariants as assertFinancialState, syncNormalizedFinancialEntities as syncFinancialEntities } from "./runtime/local-sqlite-sync.ts";

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
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
  readFinancialTablesFromSqlite,
} = localSqliteRuntime;
function syncNormalizedLocalEntities(database: Parameters<typeof syncLocalEntities>[0]) {
  return syncLocalEntities(database, NORMALIZED_LOCAL_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS);
}
function assertFinancialStateInvariants() {
  return assertFinancialState({ invoices: INVOICES, expenses: EXPENSES });
}
function syncNormalizedFinancialEntities(database: Parameters<typeof syncFinancialEntities>[0]) {
  return syncFinancialEntities(database, { invoices: INVOICES, expenses: EXPENSES, orders: ORDERS });
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

function getRequestUser(req: express.Request): UserRecord | null {
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

const FILES = [
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

const EXPENSES = [
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
    } catch (smtpErr: unknown) {
      const message = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      console.warn(`[SMTP WARN] Transport response for job ${job.jobNo}: ${message}`);
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId("log_smtp"),
        userId: job.operatorId || "u-1",
        action: "ATTEMPT_SMTP_NOTIFICATION",
        entityType: "ProductionJob",
        entityId: job.id,
        createdAt: new Date().toISOString(),
        details: `SMTP dispatch attempted for ${job.jobNo} (${eventType}) to ${recipients.join(", ")}. Transport note: ${message}`
      });
      return { success: true, warning: message, recipients };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SMTP ERROR] Error sending production job email:", err);
    return { success: false, error: message };
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
export { apiKey, ai, DB_MODE, USE_POSTGRES, USE_SQLITE, APP_RUNTIME_ROOT, LOCAL_DATA_FILE, RESOURCE_FONT_PATH, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, NORMALIZED_LOCAL_COLLECTIONS, NORMALIZED_FINANCIAL_COLLECTIONS, initLocalSqlite, SQLITE_BUSY_RETRY_DELAYS_MS, withSqliteBusyRetry, flushLocalSqlite, syncNormalizedLocalEntities, assertFinancialStateInvariants, syncNormalizedFinancialEntities, readFinancialTablesFromSqlite, backupDirectory, checksumFile, createSqliteBackup, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, publicUser, generateJWT, getRequestUser, USERS, FILES, CUSTOMERS, PRODUCTS, ORDERS, ACTIVITY_LOGS, MATERIALS, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, normalizeLegacyMaterialPrices, INVENTORY, INVENTORY_TRANSACTIONS, normalizeInventoryState, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, ensureDemoLowPriceMaterials, MACHINES, EXPENSES, NUMBERING_SETTINGS, getNextNumber, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, normalizeOrderStatuses, createNotification, notifyOverdueOrders, WORKFLOW_NEXT_REMINDERS, INVOICES, SETTINGS, publicSettings, getPartnerSharePercentAt, mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification, BACKUPS, PRODUCTION_JOBS, localSqlite, setLocalSqlite, PERSISTED_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS, idNum, refreshWarehouseCache, loadPersistedState, persistTimer, persistInFlight, persistAgainAfter, persistStateNow, persistMutationWithFastDurability, schedulePersist, RESETTABLE_BUSINESS_COLLECTIONS, resetBusinessData, sypToUsd };
export type { UserRecord, BenchmarkBucket };

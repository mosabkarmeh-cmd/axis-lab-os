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
import { createProductionEmailRuntime } from "./runtime/production-email.ts";
import { createNotificationRuntime, WORKFLOW_NEXT_REMINDERS } from "./runtime/notifications-runtime.ts";
import { createCurrencyRuntime } from "./runtime/currency-runtime.ts";
import { createSettingsRuntime } from "./runtime/settings-runtime.ts";
import { EXPENSES, NUMBERING_SETTINGS, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, BACKUPS, PRODUCTION_JOBS } from "./runtime/operational-seeds.ts";
import { createMasterDataNormalizationRuntime, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY } from "./runtime/master-data-normalization.ts";
import { createAuthRuntime, JWT_ISSUER_DEFAULT, JWT_AUDIENCE_DEFAULT, type UserRecord } from "./runtime/auth-runtime.ts";
import { createNumberingRuntime } from "./runtime/numbering-runtime.ts";
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
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { materialPriceUSD } from "../lib/materials.ts";





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

// Memory database states
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_ISSUER = JWT_ISSUER_DEFAULT;
const JWT_AUDIENCE = JWT_AUDIENCE_DEFAULT;

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

const MACHINES = [
  { id: "mac-1", name: "CO2 Laser Cutter 100W (جنوب)", type: "laser_co2", status: "idle", currentJobId: null, lastMaintenance: "2026-06-01", workingHours: 234.5 }
];

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

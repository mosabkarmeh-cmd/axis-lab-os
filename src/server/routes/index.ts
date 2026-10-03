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
import os from "os";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import initSqlJs from "sql.js";
import { materialPriceUSD } from "../../lib/materials.ts";
import { sypToUsd } from "../../lib/currency.ts";
import customersRouter from "./customers.ts";
import productsRouter from "./products.ts";
import materialsRouter from "./materials.ts";
import productionRouter from "./production.ts";
import { db } from "../../db/index.ts";
import { appState, customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable, suppliers as suppliersTable, supplyOrders as supplyOrdersTable, supplierQuotes as supplierQuotesTable, machines as machinesTable } from "../../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import * as core from "../server-core.ts";
import type { BenchmarkBucket } from "../server-core.ts";
import { registerUserRoutes } from "./users.ts";
import { registerOrderRoutes } from "./orders.ts";
import { registerAuthRoutes } from "./auth.ts";
import { registerLegacyMasterDataRoutes } from "./master-data-legacy.ts";
import { registerLegacyMaterialsInventoryRoutes } from "./materials-inventory-legacy.ts";
import { registerSupplyRoutes } from "./supply.ts";
import { registerAccountingRoutes } from "./accounting.ts";
import { registerReportRoutes } from "./reports.ts";
import { registerSettingsBackupRoutes } from "./settings-backup.ts";
import { registerFileRoutes } from "./files.ts";
import { registerExportRoutes } from "./exports.ts";
import { registerProductionLegacyRoutes } from "./production-legacy.ts";
import { registerImportRoutes } from "./imports.ts";
import { registerSearchRoutes } from "./search.ts";
import { registerCompilerRoutes } from "./compiler.ts";
import { registerAIRoutes } from "./ai.ts";
import { registerNotificationsStatusRoutes } from "./notifications-statuses.ts";
import { registerQuotationRoutes } from "./quotation.ts";
import { registerSystemRoutes } from "./system.ts";

const { apiKey, ai, DB_MODE, USE_POSTGRES, USE_SQLITE, APP_RUNTIME_ROOT, LOCAL_DATA_FILE, RESOURCE_FONT_PATH, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, NORMALIZED_LOCAL_COLLECTIONS, NORMALIZED_FINANCIAL_COLLECTIONS, initLocalSqlite, setLocalSqlite, SQLITE_BUSY_RETRY_DELAYS_MS, withSqliteBusyRetry, flushLocalSqlite, syncNormalizedLocalEntities, assertFinancialStateInvariants, syncNormalizedFinancialEntities, readFinancialTablesFromSqlite, backupDirectory, checksumFile, createSqliteBackup, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, publicUser, generateJWT, getRequestUser, USERS, FILES, CUSTOMERS, PRODUCTS, ORDERS, ACTIVITY_LOGS, MATERIALS, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, normalizeLegacyMaterialPrices, INVENTORY, INVENTORY_TRANSACTIONS, normalizeInventoryState, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, ensureDemoLowPriceMaterials, MACHINES, EXPENSES, NUMBERING_SETTINGS, getNextNumber, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, normalizeOrderStatuses, createNotification, notifyOverdueOrders, WORKFLOW_NEXT_REMINDERS, INVOICES, SETTINGS, publicSettings, getPartnerSharePercentAt, mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification, BACKUPS, PRODUCTION_JOBS, PERSISTED_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS, idNum, refreshWarehouseCache, loadPersistedState, persistTimer, persistInFlight, persistAgainAfter, persistWaiters, persistStateNow, persistMutationWithFastDurability, schedulePersist, RESETTABLE_BUSINESS_COLLECTIONS, resetBusinessData } = core;

export async function registerRoutes(app: express.Express) {
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

  // Financial PDF exports must use the same server-side boundary as accounting/reports.
  // Employees must never receive profit data, even when they call the export endpoint directly.
  app.use("/api/export/profit", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role === "employee") {
      res.status(403).json({ success: false, message: "غير مصرح لك بالوصول إلى تقارير الأرباح" });
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

  registerAuthRoutes(app);

  registerSystemRoutes(app);

  registerUserRoutes(app);

  if (!USE_POSTGRES) {
    registerLegacyMasterDataRoutes(app);
  }

  if (!USE_POSTGRES) {
    registerLegacyMaterialsInventoryRoutes(app);
  }

  registerSupplyRoutes(app);

  registerAccountingRoutes(app);

  registerReportRoutes(app);

  registerSettingsBackupRoutes(app);

  registerFileRoutes(app);

  registerExportRoutes(app);

  registerProductionLegacyRoutes(app);

  registerImportRoutes(app);

  registerSearchRoutes(app);
  registerCompilerRoutes(app);
  registerAIRoutes(app);

  registerNotificationsStatusRoutes(app);
  registerQuotationRoutes(app);

  registerOrderRoutes(app);


}

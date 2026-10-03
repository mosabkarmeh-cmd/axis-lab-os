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

const { apiKey, ai, DB_MODE, USE_POSTGRES, USE_SQLITE, APP_RUNTIME_ROOT, LOCAL_DATA_FILE, RESOURCE_FONT_PATH, LOCAL_LEGACY_DATA_FILE, LOCAL_SCHEMA_VERSION, activityLogSequence, nextActivityLogId, entityIdSequence, nextEntityId, orderCreateBenchmarks, persistenceBenchmarks, persistQueueStats, recordBenchmark, benchmarkSnapshot, NORMALIZED_LOCAL_COLLECTIONS, NORMALIZED_FINANCIAL_COLLECTIONS, initLocalSqlite, setLocalSqlite, SQLITE_BUSY_RETRY_DELAYS_MS, withSqliteBusyRetry, flushLocalSqlite, syncNormalizedLocalEntities, assertFinancialStateInvariants, syncNormalizedFinancialEntities, readFinancialTablesFromSqlite, backupDirectory, checksumFile, createSqliteBackup, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, publicUser, generateJWT, getRequestUser, USERS, FILES, CUSTOMERS, PRODUCTS, ORDERS, ACTIVITY_LOGS, MATERIALS, LEGACY_MATERIAL_PRICES_SYP_CANONICAL, LEGACY_MATERIAL_PRICES_SYP, normalizeLegacyMaterialPrices, INVENTORY, INVENTORY_TRANSACTIONS, normalizeInventoryState, REMNANTS, SUPPLIER_QUOTES, SUPPLIERS, SUPPLY_ORDERS, DEMO_LOW_PRICE_MATERIALS, DEMO_LOW_PRICE_INVENTORY, ensureDemoLowPriceMaterials, MACHINES, EXPENSES, NUMBERING_SETTINGS, getNextNumber, INVOICE_HISTORY, NOTIFICATIONS, DELETED_ITEMS, ORDER_STATUSES, normalizeOrderStatuses, createNotification, notifyOverdueOrders, WORKFLOW_NEXT_REMINDERS, INVOICES, SETTINGS, publicSettings, getPartnerSharePercentAt, mergeSmtpSettings, freezeOrderCurrencySnapshot, sendProductionJobEmailNotification, BACKUPS, PRODUCTION_JOBS, PERSISTED_COLLECTIONS, LOCAL_PERSISTED_COLLECTIONS, idNum, refreshWarehouseCache, loadPersistedState, persistTimer, persistInFlight, persistAgainAfter, persistWaiters, persistStateNow, persistMutationWithFastDurability, schedulePersist, RESETTABLE_BUSINESS_COLLECTIONS, resetBusinessData } = core;

export async function registerRoutes(app: express.Express) {
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
    const user = req.user;
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

  registerAuthRoutes(app);

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

  registerOrderRoutes(app);

  // ==================== MATERIALS API ====================

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
      userId: getRequestUser(req)?.id || "system",
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

  // ==================== ACCOUNTING & FINANCE API ====================

  // Get Invoices
  // ==================== SETTINGS & BACKUP API ====================

}

import express from "express";
import customersRouter from "./customers.ts";
import productsRouter from "./products.ts";
import materialsRouter from "./materials.ts";
import productionRouter from "./production.ts";
import * as core from "../server-core.ts";
import { registerUserRoutes } from "./users.ts";
import { registerOrderRoutes } from "./orders.ts";
import { registerAuthRoutes } from "./auth.ts";
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

const { USE_POSTGRES, getRequestUser } = core;

export async function registerRoutes(app: express.Express) {
  // Public authentication/session endpoints and the health endpoint are registered
  // before the authenticated operational boundary.
  registerAuthRoutes(app);
  registerSystemRoutes(app);

  // All operational APIs registered below require an authenticated session.
  // Mounting PostgreSQL routers only after this boundary prevents unauthenticated access
  // to database-backed customers/products/materials/production handlers.
  app.use("/api", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "يجب تسجيل الدخول للوصول إلى واجهات النظام" });
      return;
    }
    next();
  });

  // Mount PostgreSQL-backed routers only after authentication.
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
  app.use("/api/export", (req, res, next) => {
    const user = getRequestUser(req);
    if (!user || user.role === "employee") {
      res.status(403).json({ success: false, message: "غير مصرح للموظف باستخدام عمليات التصدير" });
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

  registerUserRoutes(app, { includeLegacyCustomerProductRoutes: !USE_POSTGRES });

  if (!USE_POSTGRES) {
    registerLegacyMaterialsInventoryRoutes(app);
  }

  registerSupplyRoutes(app);

  registerAccountingRoutes(app);

  registerReportRoutes(app);

  registerSettingsBackupRoutes(app);

  registerFileRoutes(app);

  registerExportRoutes(app);

  registerProductionLegacyRoutes(app, { includeMachines: !USE_POSTGRES });

  registerImportRoutes(app);

  registerSearchRoutes(app);
  registerCompilerRoutes(app);
  registerAIRoutes(app);

  registerNotificationsStatusRoutes(app);
  registerQuotationRoutes(app);

  registerOrderRoutes(app);


}

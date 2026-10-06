import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import * as core from "../server-core.ts";

const {
  FILES,
  nextEntityId,
  getRequestUser,
  ACTIVITY_LOGS,
  nextActivityLogId,
  DELETED_ITEMS,
  persistMutationWithFastDurability,
  uploadDirectory: getUploadDirectory,
} = core;

export function registerFileRoutes(app: express.Express) {
// ==================== FILES & DOCUMENTS API ====================
  const UPLOAD_DIR = getUploadDirectory();
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const TRASH_DIR = path.join(UPLOAD_DIR, ".trash");

  const isPathInsideUploadDir = (candidatePath: string) => {
    const root = path.resolve(UPLOAD_DIR) + path.sep;
    return path.resolve(candidatePath).startsWith(root);
  };

  const publicFile = (file: Record<string, unknown>) => {
    const { path: _privatePath, ...safeFile } = file;
    return safeFile;
  };

  const normalizeEntityType = (value: unknown): string => String(value || "").trim().toLowerCase();

  const entityExists = (entityType: string, entityId: string): boolean => {
    if (entityType === "order") return core.ORDERS.some(order => order.id === entityId);
    if (entityType === "customer") return core.CUSTOMERS.some(customer => customer.id === entityId);
    if (entityType === "design") {
      return core.ORDERS.some(order =>
        Array.isArray(order.items) && order.items.some((item: { id?: string }) => item.id === entityId)
      );
    }
    return false;
  };

  const canAccessFileEntity = (req: express.Request, file: Record<string, unknown>): boolean => {
    const user = getRequestUser(req);
    if (!user) return false;
    if (user.role === "admin") return true;

    const entityType = normalizeEntityType(file.entityType);
    const entityId = String(file.entityId || "");

    // Operational staff may access drawings/documents attached to a real order.
    // They may not use a guessed file ID to reach unlinked files or customer-private documents.
    if (entityType === "order") {
      return entityExists("order", entityId);
    }

    // Design files are only accessible when the design belongs to an existing order item.
    if (entityType === "design") {
      return entityExists("design", entityId);
    }

    // Customer attachments are treated as private customer data.
    if (entityType === "customer") {
      return user.role === "accountant" && entityExists("customer", entityId);
    }

    return false;
  };

  const validateUploadTarget = (req: express.Request): { entityType: string | null; entityId: string | null } | null => {
    const user = getRequestUser(req);
    if (!user) return null;

    const rawType = normalizeEntityType(req.body?.entityType);
    const rawId = String(req.body?.entityId || "").trim();

    // Unlinked files have no operational owner and therefore require admin access.
    if (!rawType && !rawId) {
      return user.role === "admin" ? { entityType: null, entityId: null } : null;
    }

    if (!rawType || !rawId || !entityExists(rawType, rawId)) return null;

    const target = { entityType: rawType, entityId: rawId };
    const probe = { entityType: rawType, entityId: rawId };

    // Reuse the exact same access boundary used for reads/downloads.
    return canAccessFileEntity(req, probe) ? target : null;
  };

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
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "حجم الملف أكبر من الحد المسموح (25MB)"
          : err instanceof Error ? err.message : "فشل رفع الملف";
        return res.status(400).json({ success: false, message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "لم يتم رفع أي ملف" });
      }

      const uploadTarget = validateUploadTarget(req);
      if (!uploadTarget) {
        try { if (isPathInsideUploadDir(file.path) && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch {}
        return res.status(403).json({
          success: false,
          message: "غير مصرح برفع ملف لهذا السجل.",
        });
      }

      const actorId = getRequestUser(req)?.id || "system";
      const newFile = {
        id: "f-" + Date.now(),
        name: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        entityType: uploadTarget.entityType,
        entityId: uploadTarget.entityId,
        uploadedById: actorId,
        createdAt: new Date().toISOString()
      };

      FILES.push(newFile);

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: actorId,
        action: "UPLOAD_FILE",
        entityType: "File",
        entityId: newFile.id,
        createdAt: new Date().toISOString()
      });

      try {
        await persistMutationWithFastDurability();
      } catch (persistError) {
        const logIndex = ACTIVITY_LOGS.findIndex(log => log.entityType === "File" && log.entityId === newFile.id && log.action === "UPLOAD_FILE");
        if (logIndex >= 0) ACTIVITY_LOGS.splice(logIndex, 1);
        const fileIndex = FILES.findIndex(item => item.id === newFile.id);
        if (fileIndex >= 0) FILES.splice(fileIndex, 1);
        try { if (isPathInsideUploadDir(newFile.path) && fs.existsSync(newFile.path)) fs.unlinkSync(newFile.path); } catch {}
        throw persistError;
      }
      res.locals.axisPersistScheduled = true;
      res.status(201).json({ success: true, file: publicFile(newFile) });
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get files of an entity
  app.get("/api/files/entity/:entityType/:entityId", (req, res) => {
    const entityType = normalizeEntityType(req.params.entityType);
    const entityId = req.params.entityId;
    const target = { entityType, entityId };

    if (!entityExists(entityType, entityId)) {
      return res.status(404).json({ success: false, message: "السجل المرتبط بالملفات غير موجود" });
    }

    if (!canAccessFileEntity(req, target)) {
      return res.status(403).json({ success: false, message: "غير مصرح بالوصول إلى ملفات هذا السجل" });
    }

    const filtered = FILES
      .filter(f => normalizeEntityType(f.entityType) === entityType && f.entityId === entityId)
      .map(publicFile);
    res.json({ success: true, files: filtered });
  });

  // Download a file
  app.get("/api/files/:id/download", (req, res) => {
    const file = FILES.find(f => f.id === req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: "الملف غير موجود" });
    }

    if (!canAccessFileEntity(req, file)) {
      return res.status(403).json({ success: false, message: "غير مصرح بالوصول إلى هذا الملف" });
    }

    if (file.path && isPathInsideUploadDir(file.path) && fs.existsSync(file.path)) {
      res.download(file.path, file.originalName);
    } else {
      res.status(404).json({ success: false, message: "ملف النظام الفعلي غير موجود على القرص" });
    }
  });

  // Delete a file
  app.delete("/api/files/:id", async (req, res) => {
    const currentUser = getRequestUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "حذف الملفات متاح لمدير النظام فقط" });
    }

    const idx = FILES.findIndex(f => f.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "الملف غير موجود" });
    }

    const file = FILES[idx];
    const originalPath = file.path;
    let trashPath: string | null = null;

    if (originalPath) {
      if (!isPathInsideUploadDir(originalPath)) {
        return res.status(409).json({ success: false, message: "مسار الملف غير صالح داخل مجلد الملفات." });
      }
      if (fs.existsSync(originalPath)) {
        fs.mkdirSync(TRASH_DIR, { recursive: true });
        trashPath = path.join(TRASH_DIR, `${file.id}-${path.basename(originalPath)}`);
        fs.renameSync(originalPath, trashPath);
      }
    }

    FILES.splice(idx, 1);
    const actorId = getRequestUser(req)?.id || "system";
    const activityLog = {
      id: nextActivityLogId(),
      userId: actorId,
      action: "DELETE_FILE",
      entityType: "File",
      entityId: file.id,
      createdAt: new Date().toISOString()
    };
    ACTIVITY_LOGS.unshift(activityLog);

    try {
      await persistMutationWithFastDurability();
    } catch (persistError) {
      FILES.splice(idx, 0, file);
      const logIndex = ACTIVITY_LOGS.findIndex(log => log.id === activityLog.id);
      if (logIndex >= 0) ACTIVITY_LOGS.splice(logIndex, 1);
      if (trashPath && fs.existsSync(trashPath)) {
        try { fs.renameSync(trashPath, originalPath); } catch (restoreError) {
          console.error("Error restoring deleted file after persistence failure", restoreError);
        }
      }
      throw persistError;
    }

    if (trashPath && fs.existsSync(trashPath)) {
      try { fs.unlinkSync(trashPath); } catch (err) {
        console.error("Error removing trashed file after successful persistence", err);
      }
    }

    res.locals.axisPersistScheduled = true;
    res.json({ success: true, file: publicFile(file) });
  });
}

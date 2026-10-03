import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import multer from "multer";
import * as core from "../server-core.ts";

const {
  FILES,
  nextEntityId,
  getRequestUser,
  ACTIVITY_LOGS,
  nextActivityLogId,
  DELETED_ITEMS,
  RESOURCE_FONT_PATH,
} = core;

export function registerFileRoutes(app: express.Express) {
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
}

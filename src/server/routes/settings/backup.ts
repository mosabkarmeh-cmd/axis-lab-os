import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import initSqlJs from "sql.js";
import * as core from "../../server-core.ts";

const {
  APP_RUNTIME_ROOT,
  setLocalSqlite,
  loadPersistedState,
  refreshWarehouseCache,
  flushLocalSqlite,
  USE_SQLITE,
  BACKUPS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  createSqliteBackup,
  checksumFile,
  persistStateNow,
  schedulePersist,
} = core;

export function registerBackupRoutes(app: express.Express) {
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
        id: nextActivityLogId(), userId: getActorId(req), action: "CREATE_BACKUP",
        entityType: "Backup", entityId: newBackup.id, createdAt: new Date().toISOString()
      });
      schedulePersist();
      res.json({ success: true, backup: publicBackup(newBackup) });
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: `فشل إنشاء النسخة الاحتياطية: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}` });
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
      const SQL = await initSqlJs({ locateFile: (file: string) => process.env.SQLITE_WASM_PATH || path.join(APP_RUNTIME_ROOT, "node_modules", "sql.js", "dist", file) });
      setLocalSqlite(new SQL.Database(fs.readFileSync(backupObj.filePath)));
      await loadPersistedState();
      if (safetyBackup) BACKUPS.unshift(safetyBackup);
      await refreshWarehouseCache();
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(), userId: getActorId(req), action: "RESTORE_BACKUP",
        entityType: "Backup", entityId: id, createdAt: new Date().toISOString()
      });
      await flushLocalSqlite();
      schedulePersist();
      res.json({ success: true, message: "تم التحقق من النسخة واستعادتها. تم الاحتفاظ بنسخة أمان قبل الاستعادة." });
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: `فشل استعادة النسخة الاحتياطية: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}` });
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
}
}

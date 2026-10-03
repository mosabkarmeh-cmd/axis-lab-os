import express from "express";
import os from "node:os";
import nodemailer from "nodemailer";
import * as core from "../server-core.ts";

const {
  SETTINGS,
  USE_SQLITE,
  BACKUPS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  publicSettings,
  mergeSmtpSettings,
  createSqliteBackup,
  checksumFile,
  persistStateNow,
} = core;

function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function registerSettingsBackupRoutes(app: express.Express) {
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
      const settingsRecord = SETTINGS as typeof SETTINGS & Record<string, unknown>;
      const previousPartnerPercent = Number(settingsRecord.partnerSharePercent ?? 0);
      if (nextPartnerPercent !== previousPartnerPercent) {
        const history = Array.isArray(settingsRecord.partnerShareHistory)
          ? settingsRecord.partnerShareHistory as Array<{ effectiveFrom: string; percent: number }>
          : [];
        history.push({ effectiveFrom: new Date().toISOString(), percent: nextPartnerPercent });
        settingsRecord.partnerShareHistory = history;
      }
      settingsRecord.partnerSharePercent = nextPartnerPercent;
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
      userId: getActorId(req),
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
      } catch (sendErr: unknown) {
        res.json({ success: true, warning: `تم اختبار التكوين وإرسال الطلب للخادم: ${sendErr instanceof Error ? sendErr instanceof Error ? sendErr.message : String(sendErr) : String(sendErr)}`, targetEmail });
      }
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: `فشل إرسال بريد الاختبار: ${err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err)}` });
    }
  });

  const publicBackup = (backup: Record<string, unknown>) => {
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

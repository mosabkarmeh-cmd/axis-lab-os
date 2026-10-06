import express from "express";
import * as core from "../../server-core.ts";

function requireAdmin(req: express.Request, res: express.Response): boolean {
  if (core.getRequestUser(req)?.role !== "admin") {
    res.status(403).json({ success: false, message: "إعدادات الترقيم متاحة لمدير النظام فقط" });
    return false;
  }
  return true;
}

const { NUMBERING_SETTINGS } = core;

export function registerAccountingNumberingRoutes(app: express.Express) {
app.get("/api/accounting/numbering", (req, res) => {
    res.json({ success: true, settings: NUMBERING_SETTINGS });
  });

  // Update Numbering Settings
  app.put("/api/accounting/numbering/:id", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const setting = NUMBERING_SETTINGS.find(s => s.id === req.params.id);
    if (!setting) {
      res.status(404).json({ success: false, message: "الإعدادات غير موجودة" });
      return;
    }
    const { prefix, suffix, digits, separator, nextNumber } = req.body;
    if (prefix !== undefined) setting.prefix = prefix;
    if (suffix !== undefined) setting.suffix = suffix;
    if (digits !== undefined) {
      const value = Number(digits);
      if (!Number.isInteger(value) || value < 1 || value > 12) { res.status(400).json({ success: false, message: "عدد الخانات يجب أن يكون بين 1 و12" }); return; }
      setting.digits = value;
    }
    if (separator !== undefined) setting.separator = String(separator).slice(0, 5);
    if (nextNumber !== undefined) {
      const value = Number(nextNumber);
      if (!Number.isInteger(value) || value < 1) { res.status(400).json({ success: false, message: "الرقم التالي يجب أن يكون عدداً صحيحاً موجباً" }); return; }
      setting.nextNumber = value;
    }

    res.json({ success: true, setting });
  });

  // Get Expenses
}

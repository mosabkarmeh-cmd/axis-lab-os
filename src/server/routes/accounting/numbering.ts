import express from "express";
import * as core from "../../server-core.ts";

const { NUMBERING_SETTINGS } = core;

export function registerAccountingNumberingRoutes(app: express.Express) {
app.get("/api/accounting/numbering", (req, res) => {
    res.json({ success: true, settings: NUMBERING_SETTINGS });
  });

  // Update Numbering Settings
  app.put("/api/accounting/numbering/:id", (req, res) => {
    const setting = NUMBERING_SETTINGS.find(s => s.id === req.params.id);
    if (!setting) {
      res.status(404).json({ success: false, message: "الإعدادات غير موجودة" });
      return;
    }
    const { prefix, suffix, digits, separator, nextNumber } = req.body;
    if (prefix !== undefined) setting.prefix = prefix;
    if (suffix !== undefined) setting.suffix = suffix;
    if (digits !== undefined) setting.digits = Number(digits) || 6;
    if (separator !== undefined) setting.separator = separator;
    if (nextNumber !== undefined) setting.nextNumber = Number(nextNumber) || 1;

    res.json({ success: true, setting });
  });

  // Get Expenses
}

import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../../server-core.ts";
import { asExportRecord } from "../utils.ts";

const { ORDERS, INVOICES, INVENTORY, CUSTOMERS, MATERIALS } = core;

export function registerInventoryExcelRoute(app: express.Express) {
  app.get("/api/export/inventory/excel", async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("تقرير المخزون والمواد");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "المادة", key: "name", width: 30 },
        { header: "الفئة", key: "category", width: 20 },
        { header: "السماكة (ملم)", key: "thickness", width: 15 },
        { header: "اللون", key: "color", width: 15 },
        { header: "الكمية المتوفرة", key: "available", width: 15 },
        { header: "الحد الأدنى", key: "minimum", width: 15 },
        { header: "سعر الوحدة (ل.س)", key: "price", width: 15 },
        { header: "القيمة الإجمالية (ل.س)", key: "totalValue", width: 15 }
      ];

      MATERIALS.forEach(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        sheet.addRow({
          name: m.name,
          category: m.category,
          thickness: m.thickness || "-",
          color: m.color || "-",
          available: qty,
          minimum: m.minimumStock,
          price: m.pricePerUnit,
          totalValue: qty * m.pricePerUnit
        });
      });

      const headerRow = sheet.getRow(1);
      headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "C59257" }
      };
      headerRow.alignment = { horizontal: "center" };

      const totalVal = MATERIALS.reduce((sum, m) => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return sum + (qty * m.pricePerUnit);
      }, 0);

      const totalRow = sheet.addRow({
        name: "إجمالي قيمة المخزون",
        category: "",
        thickness: "",
        color: "",
        available: "",
        minimum: "",
        price: "",
        totalValue: totalVal
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=inventory_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) : String(error) });
    }
  });
}

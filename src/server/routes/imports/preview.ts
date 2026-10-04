import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import * as core from "../../server-core.ts";
import { requireImportAdmin, importCell, inferImportSheet } from "./utils.ts";

export function registerImportPreviewRoutes(app: express.Express) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

app.post("/api/import/excel/preview", upload.single("file"), async (req: express.Request, res) => {
    if (!requireImportAdmin(req, res)) return;
    if (!req.file) { res.status(400).json({ success: false, message: "ملف Excel مطلوب" }); return; }
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheets = workbook.worksheets.map((worksheet) => {
        const name = worksheet.name;
        const matrix: unknown[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          const rawValues = row.values as unknown[];
          const values = rawValues.slice(1).map((value: unknown) => {
            if (value && typeof value === "object") {
              if ("text" in value) return value.text;
              if ("result" in value) return value.result;
              if (value instanceof Date) return value;
            }
            return value ?? "";
          });
          matrix.push(values);
        });
        const headers = (matrix[0] || []).map((value: unknown) => String(value ?? "").trim());
        const kind = inferImportSheet(name, headers);
        const rows = matrix.slice(1).filter((row) => row.some((value: unknown) => String(value ?? "").trim() !== "")).map((row) => {
          if (kind === "suppliers") return { code: importCell(row, headers, ["كود المورد*", "كود المورد", "supplier_code", "suppliercode"]), name: importCell(row, headers, ["اسم المورد*", "اسم المورد", "name"]), phone: importCell(row, headers, ["الهاتف", "phone"]), email: importCell(row, headers, ["البريد الإلكتروني", "email"]), address: importCell(row, headers, ["العنوان", "address"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          if (kind === "inventory") return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة (للمراجعة)", "اسم المادة", "name"]), warehouse: importCell(row, headers, ["اسم المستودع*", "اسم المستودع", "warehouse"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), openingQuantity: importCell(row, headers, ["الكمية الافتتاحية*", "الكمية الافتتاحية", "opening_quantity", "openingquantity"]), qualityStatus: importCell(row, headers, ["حالة الجودة*", "حالة الجودة", "quality_status", "qualitystatus"]), batchNumber: importCell(row, headers, ["رقم الدفعة", "batch_number", "batchnumber"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة*", "اسم المادة", "name"]), category: importCell(row, headers, ["التصنيف*", "التصنيف", "category"]), thickness: importCell(row, headers, ["السماكة (مم)", "السماكة", "thickness"]), unit: importCell(row, headers, ["الوحدة*", "الوحدة", "unit"]), pricePerUnit: importCell(row, headers, ["سعر الشراء (ل.س)*", "سعر الشراء", "price_per_unit", "priceperunit"]), minimumStock: importCell(row, headers, ["الحد الأدنى للمخزون", "minimum_stock", "minimumstock"]), supplierCode: importCell(row, headers, ["كود المورد", "supplier_code", "suppliercode"]), stock: importCell(row, headers, ["الكمية الافتتاحية", "stock"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), qualityStatus: importCell(row, headers, ["حالة الجودة", "quality_status", "qualitystatus"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
        });
        return { name, kind, headers, rows };
      });
      res.json({ success: true, fileName: req.file.originalname, sheets: sheets.filter((sheet) => sheet.kind !== "ignore") });
    } catch (error: unknown) {
      console.error("Excel preview failed:", error);
      res.status(400).json({ success: false, message: "تعذر قراءة ملف Excel: " + (error instanceof Error ? error.message : String(error)) });
    }
  });
}

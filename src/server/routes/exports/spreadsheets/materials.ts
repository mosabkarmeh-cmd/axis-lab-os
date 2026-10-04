import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../../server-core.ts";
import { asExportRecord } from "../utils.ts";

const { ORDERS, INVOICES, INVENTORY, CUSTOMERS, MATERIALS } = core;

export function registerMaterialsCsvRoute(app: express.Express) {
  app.get("/api/export/materials/csv", async (req, res) => {
    try {
      const mats = MATERIALS;

      const headers = [
        "كود المادة",
        "اسم المادة والخامة",
        "التصنيف",
        "السماكة (ملم)",
        "اللون",
        "حالة الجودة",
        "سعر الوحدة (ل.س)",
        "الرصيد المتاح",
        "الوحدة",
        "الكمية المحجوزة",
        "الحد الأدنى",
        "موقع التخزين",
        "حالة التوفر",
        "إجمالي قيمة المخزون (ل.س)"
      ];

      const rows = mats.map(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        const reserved = inv ? inv.reservedQuantity : 0;
        const min = m.minimumStock || 0;
        const priceSYP = Math.round(Number(m.pricePerUnit) || 0);
        const totalVal = Math.round(qty * priceSYP);
        const quality = asExportRecord(m).qualityStatus === 'defective' ? 'معيبة' : asExportRecord(m).qualityStatus === 'in_preparation' ? 'قيد التجهيز' : 'مفحوصة';
        const statusText = qty <= 0 ? 'نافذ بالكامل' : qty <= min ? 'منخفض / يتطلب توريد' : 'سليم ومتوفر';

        return [
          m.id,
          m.name || '',
          m.category || '',
          m.thickness || '-',
          m.color || '-',
          quality,
          priceSYP,
          qty,
          m.unit || 'وحدة',
          reserved,
          min,
          inv?.location || 'المستودع الرئيسي',
          statusText,
          totalVal
        ];
      });

      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(row => row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
        }).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Materials_Audit_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: unknown) {
      res.status(500).json({ error: "Failed to export materials CSV", details: e instanceof Error ? e instanceof Error ? e.message : String(e) : String(e) });
    }
  });
}

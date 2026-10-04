import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../../server-core.ts";
import { asExportRecord } from "../utils.ts";

const { ORDERS, INVOICES, INVENTORY, CUSTOMERS, MATERIALS } = core;

export function registerCustomersCsvRoute(app: express.Express) {
  app.get("/api/export/customers/csv", async (req, res) => {
    try {
      const custs = CUSTOMERS;
      const allOrders = ORDERS;

      const headers = ["معرف العميل", "اسم العميل", "رقم الهاتف", "الواتساب", "الشركة", "العنوان", "عدد الطلبات", "إجمالي المسحوبات (ل.س)", "ملاحظات"];
      const rows = custs.map(c => {
        const cOrders = allOrders.filter(o => o.customerId === c.id);
        const totalSpent = cOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toFixed(2);
        return [
          c.id,
          c.name || "",
          c.phone || "",
          asExportRecord(c).whatsapp || c.phone || "",
          c.company || "فردي",
          c.address || "",
          cOrders.length,
          totalSpent,
          asExportRecord(c).notes || ""
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
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Customers_Outreach_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: unknown) {
      res.status(500).json({ error: "Failed to export customers CSV", details: e instanceof Error ? e.message : String(e) });
    }
  });
}

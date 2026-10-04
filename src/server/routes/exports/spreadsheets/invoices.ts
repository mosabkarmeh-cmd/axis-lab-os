import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../../server-core.ts";
import { asExportRecord } from "../utils.ts";

const { ORDERS, INVOICES, INVENTORY, CUSTOMERS, MATERIALS } = core;

export function registerInvoicesExcelRoute(app: express.Express) {
  app.get("/api/export/invoices/excel", async (req, res) => {
    try {
      const { status, dateFrom, dateTo } = req.query;
      let filteredInvoices = [...INVOICES];

      if (status) {
        filteredInvoices = filteredInvoices.filter(i => i.status === status);
      }
      if (dateFrom) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) <= new Date(dateTo as string));
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("سجل الفواتير");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "رقم الفاتورة", key: "invoiceNumber", width: 18 },
        { header: "العميل", key: "customerName", width: 25 },
        { header: "تاريخ الإصدار", key: "issueDate", width: 15 },
        { header: "تاريخ الاستحقاق", key: "dueDate", width: 15 },
        { header: "الحالة", key: "status", width: 15 },
        { header: "الإجمالي ($)", key: "totalPrice", width: 15 },
        { header: "المدفوع ($)", key: "paidAmount", width: 15 },
        { header: "المتبقي ($)", key: "remaining", width: 15 }
      ];

      filteredInvoices.forEach(inv => {
        const cust = CUSTOMERS.find(c => c.id === inv.customerId);
        let statusAr = "غير مدفوعة";
        if (inv.status === "paid") statusAr = "مدفوعة";
        else if (inv.status === "partially_paid") statusAr = "مدفوعة جزئياً";
        else if (inv.status === "draft") statusAr = "مسودة";
        else if (inv.status === "cancelled") statusAr = "ملغاة";
        else if (inv.status === "credit_note") statusAr = "إشعار دائن";

        sheet.addRow({
          invoiceNumber: inv.invoiceNumber,
          customerName: cust ? cust.name : "عميل غير معروف",
          issueDate: new Date(inv.issueDate).toLocaleDateString("ar-EG"),
          dueDate: new Date(inv.dueDate).toLocaleDateString("ar-EG"),
          status: statusAr,
          totalPrice: inv.totalPrice,
          paidAmount: inv.paidAmount,
          remaining: inv.remaining
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

      const totalRow = sheet.addRow({
        invoiceNumber: "الإجمالي الكلي",
        customerName: "",
        issueDate: "",
        dueDate: "",
        status: "",
        totalPrice: filteredInvoices.reduce((sum, i) => sum + i.totalPrice, 0),
        paidAmount: filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
        remaining: filteredInvoices.reduce((sum, i) => sum + i.remaining, 0)
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=invoices_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) : String(error) });
    }
  });
}

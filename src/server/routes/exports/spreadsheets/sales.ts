import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../../server-core.ts";
import { asExportRecord } from "../utils.ts";

const { ORDERS, INVOICES, INVENTORY, CUSTOMERS, MATERIALS } = core;

export function registerSalesExcelRoute(app: express.Express) {
  app.get("/api/export/sales/excel", async (req, res) => {
    try {
      const { dateFrom, dateTo, customerId } = req.query;
      let filteredOrders = [...ORDERS];

      if (dateFrom) {
        filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredOrders = filteredOrders.filter(o => new Date(o.createdAt) <= new Date(dateTo as string));
      }
      if (customerId) {
        filteredOrders = filteredOrders.filter(o => o.customerId === customerId);
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("تقرير المبيعات");

      sheet.views = [{ rightToLeft: true }];

      sheet.columns = [
        { header: "رقم الطلب", key: "orderNumber", width: 20 },
        { header: "العميل", key: "customerName", width: 25 },
        { header: "التاريخ", key: "createdAt", width: 20 },
        { header: "الحالة", key: "status", width: 15 },
        { header: "الإجمالي ($)", key: "totalPrice", width: 15 },
        { header: "المدفوع ($)", key: "paidAmount", width: 15 },
        { header: "المتبقي ($)", key: "remaining", width: 15 }
      ];

      filteredOrders.forEach(order => {
        const cust = CUSTOMERS.find(c => c.id === order.customerId);
        sheet.addRow({
          orderNumber: order.orderNumber,
          customerName: cust ? cust.name : "عميل غير معروف",
          createdAt: new Date(order.createdAt).toLocaleDateString("ar-EG"),
          status: order.status === "delivered" ? "تم التسليم" : order.status === "in_progress" ? "قيد التنفيذ" : "جديد",
          totalPrice: order.totalPrice,
          paidAmount: order.paidAmount,
          remaining: order.remaining
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
        orderNumber: "الإجمالي الكلي",
        customerName: "",
        createdAt: "",
        status: "",
        totalPrice: filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0),
        paidAmount: filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0),
        remaining: filteredOrders.reduce((sum, o) => sum + o.remaining, 0)
      });
      totalRow.font = { name: "Arial", bold: true };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F4F4F7" }
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=sales_report_${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) : String(error) });
    }
  });
}

import express from "express";
import ExcelJS from "exceljs";
import * as core from "../../server-core.ts";
import { asExportRecord } from "./utils.ts";

const {
  ORDERS,
  INVOICES,
  INVENTORY,
  CUSTOMERS,
  MATERIALS,
} = core;

export function registerExportSpreadsheetRoutes(app: express.Express) {

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

  // Export Invoices Report to Excel
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

  // Export Inventory Report to Excel
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

  // Export Customers CSV Endpoint
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

  // Export Materials CSV Endpoint
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

  // Export Advanced Invoice to PDF
}

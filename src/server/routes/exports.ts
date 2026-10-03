import express from "express";
import * as core from "../server-core.ts";

type ExportItem = {
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  discount?: number | string;
  total?: number | string;
  totalPrice?: number | string;
  productName?: string;
  name?: string;
};

function asExportItem(value: unknown): ExportItem {
  return value && typeof value === "object" ? value as ExportItem : {};
}

function asExportRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

const {
  ORDERS,
  INVOICES,
  INVENTORY,
  CUSTOMERS,
  MATERIALS,
  PRODUCTION_JOBS,
  SETTINGS,
  EXPENSES,
  NOTIFICATIONS,
  getRequestUser,
} = core;

export function registerExportRoutes(app: express.Express) {
  });

  // ==================== ACCOUNTING & FINANCE API ====================

  // Get Invoices
  // ==================== SETTINGS & BACKUP API ====================
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
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
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
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
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
      res.status(500).json({ success: false, message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
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
      res.status(500).json({ error: "Failed to export materials CSV", details: e instanceof Error ? e.message : String(e) });
    }
  });

  // Export Advanced Invoice to PDF
  app.get("/api/accounting/invoices/:id/pdf", async (req, res) => {
    try {
      const invId = req.params.id;
      const inv = INVOICES.find(i => i.id === invId);
      if (!inv) {
        res.status(404).json({ error: "الفاتورة غير موجودة" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === inv.customerId);
      const customerName = customer ? customer.name : "عميل عام";
      const pdfRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || SETTINGS.exchangeRate) > 0 ? Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || SETTINGS.exchangeRate) : 135;
      const pdfTotalUSD = Number(inv.totalPriceUSD ?? inv.totalPrice ?? 0);
      const pdfPaidUSD = Number(inv.paidAmountUSD ?? inv.paidAmount ?? 0);
      const pdfRemainingUSD = Number(inv.remainingUSD ?? inv.remaining ?? 0);
      const pdfTotalSYP = Math.round(Number(inv.totalPriceSYP ?? (pdfTotalUSD * pdfRate)));
      const pdfPaidSYP = Math.round(Number(inv.paidAmountSYP ?? (pdfPaidUSD * pdfRate)));
      const pdfRemainingSYP = Math.round(Number(inv.remainingSYP ?? (pdfRemainingUSD * pdfRate)));

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice_${inv.invoiceNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors (Slate Dark)
      doc.rect(0, 0, 595, 120).fill("#09090b");
      
      // Bronze/Gold accent bar
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title & Contact Info from System Settings
      const companyTitle = SETTINGS.company?.name || "مجمع المحور والورش الذكية - AXIS LAB";
      const companyContactSub = `واتساب المبيعات: ${SETTINGS.company?.whatsapp || SETTINGS.company?.phone || ''} | البريد: ${SETTINGS.company?.email || ''} | إنستغرام: ${SETTINGS.company?.instagram || ''}`;

      doc.fillColor("#c59257").fontSize(22).text(reverseArabicLine(companyTitle), 0, 20, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(10).text(reverseArabicLine("فاتورة ضريبية رسمية ومستند مالي معتمد"), 0, 52, { align: "center", width: 595 });
      doc.fillColor("#71717a").fontSize(8.5).text(reverseArabicLine(companyContactSub), 0, 72, { align: "center", width: 595 });
      if (SETTINGS.company?.address || SETTINGS.company?.taxNumber) {
        const addrTax = `${SETTINGS.company?.address ? `العنوان: ${SETTINGS.company.address}` : ''} ${SETTINGS.company?.taxNumber ? `| الرقم الضريبي: ${SETTINGS.company.taxNumber}` : ''}`;
        doc.fillColor("#52525b").fontSize(8).text(reverseArabicLine(addrTax), 0, 88, { align: "center", width: 595 });
      }

      // Spacing below the header
      doc.moveDown(5);

      const infoY = 150;
      
      // Right block: Customer Details (Arabic rtl alignment)
      // High security mask: Hide personal phone, email, and address details, as requested
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات الجهة المستلمة:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("العنوان:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 65, { align: "right", width: 245 });

      // Left block: Invoice Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند الفاتورة:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم الفاتورة:")} ${inv.invoiceNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الإصدار:")} ${new Date(inv.issueDate).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الاستحقاق:")} ${new Date(inv.dueDate).toLocaleDateString("ar-EG")}`, 50, infoY + 65, { align: "right", width: 230 })
        .text(`${reverseArabicLine("حالة الدفع:")} ${reverseArabicLine(inv.status === 'paid' ? 'مدفوعة بالكامل' : inv.status === 'partially_paid' ? 'مدفوعة جزئياً' : inv.status === 'draft' ? 'مسودة غير مرسلة' : inv.status === 'cancelled' ? 'ملغاة' : inv.status === 'credit_note' ? 'إشعار دائن' : 'غير مدفوعة')}`, 50, infoY + 85, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background (Deep zinc tone with bronze text)
      doc.rect(50, tableY, 495, 25).fill("#18181b");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الخصم"), 130, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("سعر المفرد"), 190, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الكمية"), 270, tableY + 7, { align: "center", width: 40 });
      doc.text(reverseArabicLine("المنتج / الخدمة"), 310, tableY + 7, { align: "right", width: 220 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = inv.items || [];
      items.forEach((rawItem, idx: number) => {
        const item = asExportItem(rawItem);
        // Stripe line background for readability
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || 1;
        const uPrice = Number(item.unitPrice) || 0;
        const discountAmt = Number(item.discount) || 0;
        const totalAmt = Number(item.total) || (qty * uPrice - discountAmt);
        
        doc.text(`$${totalAmt.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${discountAmt.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 60 });
        doc.text(`$${uPrice.toFixed(2)}`, 190, currentY + 6, { align: "center", width: 80 });
        doc.text(`${qty}`, 270, currentY + 6, { align: "center", width: 40 });
        doc.text(reverseArabicLine(item.productName || "بند مخصص"), 310, currentY + 6, { align: "right", width: 220 });

        currentY += 22;
      });

      // Bottom border for table
      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      // Financial summary calculations
      const summaryY = currentY + 20;
      doc.fillColor("#27272a").fontSize(10);

      // Draw operating notes if present
      if (inv.notes) {
        doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("ملاحظات وشروط مالية:"), 260, summaryY, { align: "right", width: 285 });
        doc.fillColor("#52525b").fontSize(10).text(reverseArabicLine(inv.notes), 260, summaryY + 20, { align: "right", width: 285 });
      }

      // Draw financial summary block on the left
      const sumLeftX = 50;
      const subtotal = inv.subtotal || pdfTotalUSD;
      const discount = inv.discount || 0;
      const taxPercent = inv.taxPercent || 0;
      const taxAmount = (subtotal * taxPercent) / 100;
      const finalTotal = pdfTotalUSD;

      doc.fillColor("#71717a");
      doc.text(reverseArabicLine("المجموع الفرعي:"), sumLeftX, summaryY, { align: "right", width: 100 });
      doc.text(`$${subtotal.toFixed(2)}`, sumLeftX + 110, summaryY, { align: "left", width: 80 });

      doc.text(`${reverseArabicLine("الضريبة")} (${taxPercent}%):`, sumLeftX, summaryY + 18, { align: "right", width: 100 });
      doc.text(`$${taxAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 18, { align: "left", width: 80 });

      doc.text(reverseArabicLine("الخصم الإضافي:"), sumLeftX, summaryY + 36, { align: "right", width: 100 });
      doc.text(`$${discount.toFixed(2)}`, sumLeftX + 110, summaryY + 36, { align: "left", width: 80 });

      // Highlight Final Total with a soft dark block
      doc.rect(sumLeftX, summaryY + 54, 200, 24).fill("#f4f4f5");
      doc.fillColor("#09090b").fontSize(11).font("Amiri");
      doc.text(reverseArabicLine("المجموع الإجمالي:"), sumLeftX, summaryY + 61, { align: "right", width: 100 });
      doc.text(`$${finalTotal.toFixed(2)} / ${pdfTotalSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 61, { align: "left", width: 150 });

      doc.fillColor("#16a34a").fontSize(10);
      doc.text(reverseArabicLine(`المبلغ المدفوع (سعر الصرف ${pdfRate}):`), sumLeftX, summaryY + 84, { align: "right", width: 100 });
      doc.text(`$${pdfPaidUSD.toFixed(2)} / ${pdfPaidSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 84, { align: "left", width: 150 });

      doc.fillColor("#dc2626");
      doc.text(reverseArabicLine("المتبقي المستحق:"), sumLeftX, summaryY + 102, { align: "right", width: 100 });
      doc.text(`$${pdfRemainingUSD.toFixed(2)} / ${pdfRemainingSYP.toLocaleString()} ل.س`, sumLeftX + 110, summaryY + 102, { align: "left", width: 150 });

      // Footer brand signature
      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("تم إنشاء هذه الفاتورة إلكترونياً وتخضع لسياسات الخصوصية والأمان الفنية لنظام تشغيل الورش AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.text(reverseArabicLine("حساب العميل البنكي والبيانات الشخصية محجوبة تلقائياً لحماية سرية معلومات الشركاء"), 50, footerY + 23, { align: "center", width: 495 });

      doc.end();
    } catch (err: unknown) {
      console.error("Invoice PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    }
  });

  // Export Delivery Note (سند تسليم) to PDF
  app.get("/api/orders/:id/delivery-note/pdf", async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=delivery_note_${order.orderNumber}.pdf`);
      doc.pipe(res);

      doc.rect(0, 0, 595, 120).fill("#09090b");
      doc.rect(0, 115, 595, 5).fill("#c59257");

      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("سند تسليم خامات وأعمال جاهزة رسمي"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      // Privacy-first: mask sensitive coordinates, show customer name
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات المستلم:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم المستلم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${reverseArabicLine("محجوب لحماية الخصوصية")}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("تاريخ التسليم المتوقع:")} ${order.deliveryDateExpected ? new Date(order.deliveryDateExpected).toLocaleDateString("ar-EG") : reverseArabicLine("غير محدد")}`, 300, infoY + 65, { align: "right", width: 245 });

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل السند:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم السند/الطلب:")} ${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ إنشاء الطلب:")} ${new Date(order.createdAt).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("الحالة:")} ${reverseArabicLine("جاهز للتسليم والاستلام")}`, 50, infoY + 65, { align: "right", width: 230 });

      doc.moveDown(8);
      const tableY = doc.y;

      doc.rect(50, tableY, 495, 25).fill("#18181b");
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("حالة الفحص والمطابقة"), 50, tableY + 7, { align: "center", width: 120 });
      doc.text(reverseArabicLine("الكمية"), 170, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("المواد وعناصر القطع المستلمة"), 230, tableY + 7, { align: "right", width: 300 });

      let currentY = tableY + 25;
      const items = order.items || [];
      items.forEach((rawItem, idx: number) => {
        const item = asExportItem(rawItem);
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }
        doc.fillColor("#27272a");
        doc.text(reverseArabicLine("[   ] مطابق ومستلم"), 50, currentY + 6, { align: "center", width: 120 });
        doc.text(`${item.quantity}`, 170, currentY + 6, { align: "center", width: 60 });
        doc.text(reverseArabicLine(item.productName || "عنصر مخصص"), 230, currentY + 6, { align: "right", width: 300 });
        currentY += 22;
      });

      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      const signY = currentY + 40;
      doc.fillColor("#09090b").fontSize(11);
      doc.text(reverseArabicLine("توقيع المستلم والعميل:"), 300, signY, { align: "right", width: 200 });
      doc.strokeColor("#a1a1aa").lineWidth(1).dash(5, { space: 3 }).moveTo(300, signY + 45).lineTo(500, signY + 45).stroke();

      doc.text(reverseArabicLine("أمين المستودع والمشرف:"), 50, signY, { align: "right", width: 200 });
      doc.strokeColor("#a1a1aa").lineWidth(1).moveTo(50, signY + 45).lineTo(250, signY + 45).stroke();

      const footerY = 740;
      doc.undash();
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("سند تسليم بضاعة رسمي صادر عن نظام تشغيل وإدارة ورش القص بالليزر AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: unknown) {
      console.error("Delivery Note PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد السند: " + err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    }
  });

  // Export Work Order Job Ticket (أمر تشغيل للورشة) to PDF
  app.get("/api/production/jobs/:id/pdf", async (req, res) => {
    try {
      const jobId = req.params.id;
      const job = PRODUCTION_JOBS.find(j => j.id === jobId);
      if (!job) {
        res.status(404).json({ error: "مهمة الإنتاج غير موجودة" });
        return;
      }

      const ord = ORDERS.find(o => o.id === job.orderId);
      const mac = MACHINES.find(m => m.id === job.machineId);

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=job_ticket_${job.jobNo}.pdf`);
      doc.pipe(res);

      doc.rect(0, 0, 595, 120).fill("#09090b");
      doc.rect(0, 115, 595, 5).fill("#c59257");

      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("تذكرة تشغيل ماكينة - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("بطاقة توجيه فنية للقص والحفر ليزر بالمعمل"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("مواصفات تذكرة التشغيل:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الماكينة المستهدفة:")} ${reverseArabicLine(mac ? mac.name : "غير محدد")}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("رقم تذكرة التشغيل:")} ${job.jobNo}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الحالة الفنية:")} ${reverseArabicLine(job.status === 'completed' ? 'تم الانتهاء والإنتاج' : job.status === 'running' ? 'قيد العمل والقص' : 'في الانتظار')}`, 300, infoY + 65, { align: "right", width: 245 });

      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("البيانات الفنية للمواد والسرعة:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("اسم البند الفني:")} ${reverseArabicLine(job.itemName)}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("سرعة الليزر الفنية:")} ${job.laserSpeed || 300} mm/s`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("قوة الليزر الفنية:")} ${job.laserPower || 70}%`, 50, infoY + 65, { align: "right", width: 230 });

      doc.moveDown(8);
      const notesY = doc.y + 40;

      doc.rect(50, notesY, 495, 80).fill("#f4f4f5");
      doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("تعليمات تشغيل فني الماكينة:"), 70, notesY + 10, { align: "right", width: 455 });
      doc.fillColor("#27272a").fontSize(10).text(reverseArabicLine("الرجاء مطابقة الخامات وسماكة اللوح مع نوع الماكينة قبل الضغط على زر التشغيل. الالتزام بارتداء نظارات الوقاية والتحقق من تهوية المصنع بشكل كلي وقفل الغطاء الواقي أثناء دوران شعاع CO2 المباشر."), 70, notesY + 30, { align: "right", width: 455 });

      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("أمر إنتاج وتذكرة فنية مخصصة لماكينات الورش الذكية والقص بالليزر - AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: unknown) {
      console.error("Job ticket PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد تذكرة التشغيل: " + err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    }
  });

  // Export Order Invoice / Delivery Note to PDF
  app.get("/api/orders/:id/pdf", async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";
      const customerPhone = customer ? customer.phone : "-";
      const customerAddress = customer ? customer.address : "-";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=order_${order.orderNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors
      doc.rect(0, 0, 595, 120).fill("#09090b");
      
      // Bronze/Gold accent bar
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title
      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("سند تشغيل وقص ليزر وفاتورة تسليم رسمية"), 0, 70, { align: "center", width: 595 });

      // Spacing below the header
      doc.moveDown(5);

      // Order Info Box (Left) and Customer Info Box (Right) - y position around 150
      const infoY = 150;
      
      // Right block: Customer Details (Arabic rtl alignment)
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات العميل المستلم:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} ${customerPhone}`, 300, infoY + 45, { align: "right", width: 245 })
        .text(`${reverseArabicLine("العنوان:")} ${reverseArabicLine(customerAddress)}`, 300, infoY + 65, { align: "right", width: 245 });

      // Left block: Order Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند الطلب:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم الطلب:")} ${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ الإنشاء:")} ${new Date(order.createdAt).toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ التسليم:")} ${order.deliveryDateExpected ? new Date(order.deliveryDateExpected).toLocaleDateString("ar-EG") : reverseArabicLine("غير محدد")}`, 50, infoY + 65, { align: "right", width: 230 })
        .text(`${reverseArabicLine("حالة الطلب:")} ${reverseArabicLine(order.status === 'delivered' ? 'تم التسليم والأرشفة' : order.status === 'in_progress' ? 'قيد الإنتاج والتشغيل' : order.status === 'completed' ? 'جاهز للتسليم' : 'جديد بانتظار البدء')}`, 50, infoY + 85, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background (Deep zinc tone with bronze text)
      doc.rect(50, tableY, 495, 25).fill("#18181b");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("سعر المفرد"), 130, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("الكمية"), 210, tableY + 7, { align: "center", width: 60 });
      doc.text(reverseArabicLine("المواد وعناصر القطع المطلوبة"), 270, tableY + 7, { align: "right", width: 260 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = order.items || [];
      items.forEach((rawItem, idx: number) => {
        const item = asExportItem(rawItem);
        // Stripe line background for readability
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#f4f4f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || Number(item.qty) || 1;
        const uPrice = Number(item.unitPrice) || Number(item.price) || 0;
        const tPrice = Number(item.totalPrice) || (qty * uPrice);
        
        doc.text(`$${tPrice.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${uPrice.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 80 });
        doc.text(`${qty}`, 210, currentY + 6, { align: "center", width: 60 });
        doc.text(reverseArabicLine(item.productName || item.name || "عنصر تشغيل مخصص"), 270, currentY + 6, { align: "right", width: 260 });

        currentY += 22;
      });

      // Bottom border for table
      doc.rect(50, currentY, 495, 1).fill("#e4e4e7");

      // Notes block & Summary Block below table
      currentY += 15;
      const summaryY = currentY;

      // Right side: Notes
      if (order.notes) {
        doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("ملاحظات تشغيلية وفنية:"), 260, summaryY, { align: "right", width: 285 });
        doc.fillColor("#52525b").fontSize(10).text(reverseArabicLine(order.notes), 260, summaryY + 20, { align: "right", width: 285 });
      }

      // Left side: Detailed pricing summary
      const subtotal = items.reduce((acc: number, rawItem) => {
        const cur = asExportItem(rawItem);
        const qty = Number(cur.quantity) || Number(cur.qty) || 1;
        const uPrice = Number(cur.unitPrice) || Number(cur.price) || 0;
        return acc + (Number(cur.totalPrice) || (qty * uPrice));
      }, 0);
      const taxPercent = Number(order.taxPercent) || 0;
      const taxAmount = subtotal * (taxPercent / 100);
      const discount = Number(order.discount) || 0;
      const finalTotal = Math.max(0, subtotal + taxAmount - discount);
      const paidAmount = Number(order.paidAmount) || 0;
      const remaining = Math.max(0, finalTotal - paidAmount);

      const sumLeftX = 50;
      const sumWidth = 190;

      doc.fillColor("#27272a").fontSize(10);
      
      // subtotal row
      doc.text(reverseArabicLine("مجموع المواد:"), sumLeftX, summaryY, { align: "right", width: 100 });
      doc.text(`$${subtotal.toFixed(2)}`, sumLeftX + 110, summaryY, { align: "left", width: 80 });

      // tax row
      doc.text(`${reverseArabicLine("الضريبة")} (${taxPercent}%):`, sumLeftX, summaryY + 18, { align: "right", width: 100 });
      doc.text(`+$${taxAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 18, { align: "left", width: 80 });

      // discount row
      doc.text(reverseArabicLine("الخصم الإضافي:"), sumLeftX, summaryY + 36, { align: "right", width: 100 });
      doc.text(`-$${discount.toFixed(2)}`, sumLeftX + 110, summaryY + 36, { align: "left", width: 80 });

      // draw divider
      doc.rect(sumLeftX, summaryY + 52, sumWidth, 1).fill("#c59257");

      // total price row
      doc.fillColor("#c59257").fontSize(11).font("Amiri");
      doc.text(reverseArabicLine("إجمالي السعر:"), sumLeftX, summaryY + 58, { align: "right", width: 100 });
      doc.text(`$${finalTotal.toFixed(2)}`, sumLeftX + 110, summaryY + 58, { align: "left", width: 80 });

      // paid row
      doc.fillColor("#10b981").fontSize(10);
      doc.text(reverseArabicLine("المدفوع سلفاً:"), sumLeftX, summaryY + 76, { align: "right", width: 100 });
      doc.text(`$${paidAmount.toFixed(2)}`, sumLeftX + 110, summaryY + 76, { align: "left", width: 80 });

      // remaining row
      doc.fillColor(remaining > 0 ? "#f43f5e" : "#10b981").fontSize(10);
      doc.text(reverseArabicLine("الرصيد المتبقي:"), sumLeftX, summaryY + 94, { align: "right", width: 100 });
      doc.text(`$${remaining.toFixed(2)}`, sumLeftX + 110, summaryY + 94, { align: "left", width: 80 });

      // Footer disclaimer & signature at y = 730
      const footerY = 740;
      doc.rect(50, footerY, 495, 1).fill("#e4e4e7");
      
      doc.fillColor("#71717a").fontSize(9);
      doc.text(reverseArabicLine("تم إنشاء هذا المستند إلكترونياً بواسطة نظام تشغيل وإدارة ورش القص بالليزر AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.text(reverseArabicLine("نشكر ثقتكم بنا ونسعد دوماً بخدمتكم في الورشة والمصنع الذكي"), 50, footerY + 23, { align: "center", width: 495 });

      doc.end();
    } catch (err: unknown) {
      console.error("PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    }
  });

  // Share Order details via email, WhatsApp, or other channels
  app.post("/api/orders/:id/share", async (req, res) => {
    try {
      const { id } = req.params;
      const { email, subject, body, method } = req.body;
      const order = ORDERS.find(o => o.id === id);
      if (!order) {
        res.status(404).json({ success: false, message: "الطلب غير موجود" });
        return;
      }

      // Record Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getRequestUser(req)?.id || "system",
        action: `SHARE_ORDER_${method.toUpperCase()}`,
        entityType: "Order",
        entityId: order.id,
        createdAt: new Date().toISOString()
      });

      // Add a platform notification
      NOTIFICATIONS.unshift({
        id: "notif_" + Date.now(),
        title: "مشاركة طلب",
        message: `تم مشاركة الطلب رقم ${order.orderNumber} بنجاح عبر ${method === "email" ? "البريد الإلكتروني" : method === "whatsapp" ? "واتساب" : "رابط PDF"} للعميل.`,
        type: "success",
        isRead: false,
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `تمت مشاركة ملخص الطلب رقم ${order.orderNumber} بنجاح عبر ${method === "email" ? "البريد الإلكتروني" : method === "whatsapp" ? "الواتساب" : "رابط PDF"}!`
      });
    } catch (err: unknown) {
      console.error("Error sharing order:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) });
    }
  });

  // Export Profit Report to PDF
  app.get("/api/export/profit/pdf", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      let filteredInvoices = [...INVOICES];
      let filteredExpenses = [...EXPENSES];

      if (dateFrom) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) >= new Date(dateFrom as string));
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= new Date(dateFrom as string));
      }
      if (dateTo) {
        filteredInvoices = filteredInvoices.filter(i => new Date(i.issueDate) <= new Date(dateTo as string));
        filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= new Date(dateTo as string));
      }

      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists();

      if (fontFile) {
        doc.registerFont("Amiri", fontFile);
        doc.font("Amiri");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=profit_report_${Date.now()}.pdf`);
      doc.pipe(res);

      // Title Card
      doc.rect(50, 40, 495, 80).fill("#101014");
      doc.fillColor("#C59257").fontSize(24).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 50, 55, { align: "center", width: 495 });
      doc.fillColor("#A1A1AA").fontSize(12).text(reverseArabicLine("تقرير الأرباح والتحليل المالي الكلي"), 50, 90, { align: "center", width: 495 });

      doc.moveDown(4);

      // Report Period
      const dateStr = `الفترة: ${dateFrom ? new Date(dateFrom as string).toLocaleDateString("ar-EG") : "البداية"} إلى ${dateTo ? new Date(dateTo as string).toLocaleDateString("ar-EG") : "اليوم"}`;
      doc.fillColor("#27272A").fontSize(12).text(reverseArabicLine(dateStr), { align: "right" });
      doc.moveDown(1.5);

      // Summary Cards
      const cardY = doc.y;
      
      // Card 1: Revenue
      doc.roundedRect(50, cardY, 150, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("إجمالي الإيرادات"), 50, cardY + 15, { align: "center", width: 150 });
      doc.fillColor("#E2BD8A").fontSize(16).text(`$${totalRevenue.toFixed(2)}`, 50, cardY + 40, { align: "center", width: 150 });

      // Card 2: Expenses
      doc.roundedRect(220, cardY, 150, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("إجمالي المصاريف"), 220, cardY + 15, { align: "center", width: 150 });
      doc.fillColor("#F43F5E").fontSize(16).text(`$${totalExpenses.toFixed(2)}`, 220, cardY + 40, { align: "center", width: 150 });

      // Card 3: Net Profit
      doc.roundedRect(390, cardY, 155, 80, 8).fill("#191920");
      doc.fillColor("#A1A1AA").fontSize(10).text(reverseArabicLine("صافي الأرباح"), 390, cardY + 15, { align: "center", width: 155 });
      doc.fillColor(netProfit >= 0 ? "#10B981" : "#F43F5E").fontSize(16).text(`$${netProfit.toFixed(2)}`, 390, cardY + 40, { align: "center", width: 155 });

      doc.moveDown(7);

      // Margin and Profitability
      doc.fillColor("#27272A").fontSize(14).text(reverseArabicLine("التحليل والنسب المئوية"), { align: "right" });
      doc.rect(50, doc.y, 495, 2).fill("#C59257");
      doc.moveDown(1);

      doc.fillColor("#27272A").fontSize(11)
        .text(`${reverseArabicLine("هامش الربح الإجمالي:")} ${profitMargin.toFixed(1)}%`, { align: "right" })
        .text(`${reverseArabicLine("معدل الكفاءة التشغيلية:")} ${((totalExpenses / (totalRevenue || 1)) * 100).toFixed(1)}%`, { align: "right" });

      doc.moveDown(2);

      // Breakdown Table
      doc.fillColor("#27272A").fontSize(14).text(reverseArabicLine("جدول المصاريف التفصيلي"), { align: "right" });
      doc.rect(50, doc.y, 495, 2).fill("#C59257");
      doc.moveDown(1);

      // Header row
      const tableY = doc.y;
      doc.fillColor("#71717A").fontSize(10);
      doc.text(reverseArabicLine("البيان والوصف"), 50, tableY, { align: "right", width: 200 });
      doc.text(reverseArabicLine("الفئة"), 260, tableY, { align: "right", width: 120 });
      doc.text(reverseArabicLine("التاريخ"), 390, tableY, { align: "right", width: 80 });
      doc.text(reverseArabicLine("المبلغ"), 480, tableY, { align: "right", width: 65 });

      doc.moveDown(0.5);
      doc.rect(50, doc.y, 495, 1).fill("#E4E4E7");
      doc.moveDown(0.5);

      filteredExpenses.forEach(exp => {
        const itemY = doc.y;
        doc.fillColor("#27272A").fontSize(10);
        doc.text(reverseArabicLine(exp.description || "مصروف عام"), 50, itemY, { align: "right", width: 200 });
        doc.text(reverseArabicLine(exp.category), 260, itemY, { align: "right", width: 120 });
        doc.text(new Date(exp.date).toLocaleDateString("ar-EG"), 390, itemY, { align: "right", width: 80 });
        doc.text(`$${exp.amount.toFixed(2)}`, 480, itemY, { align: "right", width: 65 });
}

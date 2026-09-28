import { Router } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export function createDocumentsLocalRouter(deps: any) {
  const router = Router();
  const { ORDERS, CUSTOMERS, INVOICES, MATERIALS, INVENTORY, SETTINGS, PRODUCTION_JOBS, MACHINES, ACTIVITY_LOGS, NOTIFICATIONS, EXPENSES, authenticatedUserId, nextActivityLogId, requireFinanceRole, ensureFontExists, reverseArabicLine } = deps;

  router.get("/print/quotation/:id", async (req, res) => {
    if (!requireFinanceRole(req, res)) return;
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
      res.setHeader("Content-Disposition", `attachment; filename=quotation_${order.orderNumber}.pdf`);
      doc.pipe(res);

      // Top decorative border/header with AXIS LAB colors (Bronze Quotation Theme)
      doc.rect(0, 0, 595, 120).fill("#1e1b18"); // deep warm brown tone
      doc.rect(0, 115, 595, 5).fill("#c59257");

      // Brand Title
      doc.fillColor("#c59257").fontSize(26).text(reverseArabicLine("مجمع المحور والورش الذكية - AXIS LAB"), 0, 30, { align: "center", width: 595 });
      doc.fillColor("#a1a1aa").fontSize(12).text(reverseArabicLine("عرض سعر رسمي ومواصفات قطع فنية تقديرية"), 0, 70, { align: "center", width: 595 });

      doc.moveDown(5);
      const infoY = 150;

      // Right block: Customer Details
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("بيانات العميل المستهدف:"), 300, infoY, { align: "right", width: 245 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("الاسم:")} ${reverseArabicLine(customerName)}`, 300, infoY + 25, { align: "right", width: 245 })
        .text(`${reverseArabicLine("الهاتف:")} محجوب لحماية الخصوصية`, 300, infoY + 45, { align: "right", width: 245 });

      // Left block: Quotation Info
      doc.fillColor("#c59257").fontSize(14).text(reverseArabicLine("تفاصيل ومستند عرض السعر:"), 50, infoY, { align: "right", width: 230 });
      doc.fillColor("#27272a").fontSize(11)
        .text(`${reverseArabicLine("رقم العرض التقديري:")} QUO-${order.orderNumber}`, 50, infoY + 25, { align: "right", width: 230 })
        .text(`${reverseArabicLine("تاريخ التقديم:")} ${new Date().toLocaleDateString("ar-EG")}`, 50, infoY + 45, { align: "right", width: 230 })
        .text(`${reverseArabicLine("فترة الصلاحية:")} 15 يوماً من تاريخ التقديم`, 50, infoY + 65, { align: "right", width: 230 });

      // Table divider
      doc.moveDown(8);
      const tableY = doc.y;

      // Table Header Background
      doc.rect(50, tableY, 495, 25).fill("#1e1b18");
      
      doc.fillColor("#c59257").fontSize(10);
      doc.text(reverseArabicLine("المجموع الكلي ($)"), 50, tableY + 7, { align: "center", width: 80 });
      doc.text(reverseArabicLine("سعر المفرد التقديري"), 130, tableY + 7, { align: "center", width: 110 });
      doc.text(reverseArabicLine("الكمية"), 240, tableY + 7, { align: "center", width: 40 });
      doc.text(reverseArabicLine("تفاصيل وعناصر المواد والخامات المقترحة"), 280, tableY + 7, { align: "right", width: 250 });

      // Draw rows
      let currentY = tableY + 25;
      doc.fillColor("#27272a").fontSize(10);

      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#fcf9f5");
        }

        doc.fillColor("#27272a");
        const qty = Number(item.quantity) || Number(item.qty) || 1;
        const uPrice = Number(item.unitPrice) || Number(item.price) || 0;
        const tPrice = qty * uPrice;
        
        doc.text(`$${tPrice.toFixed(2)}`, 50, currentY + 6, { align: "center", width: 80 });
        doc.text(`$${uPrice.toFixed(2)}`, 130, currentY + 6, { align: "center", width: 110 });
        doc.text(`${qty}`, 240, currentY + 6, { align: "center", width: 40 });
        doc.text(reverseArabicLine(item.productName || "بند فني مخصص"), 280, currentY + 6, { align: "right", width: 250 });

        currentY += 22;
      });

      doc.strokeColor("#e4e4e7").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();

      // Total pricing block
      const subtotal = items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || Number(item.qty) || 1) * (Number(item.unitPrice) || Number(item.price) || 0)), 0);
      const tax = subtotal * 0.0; // 0%
      const total = subtotal + tax;

      currentY += 15;
      doc.fillColor("#c59257").fontSize(12).text(reverseArabicLine("الملخص المالي لعرض السعر التقديري:"), 50, currentY, { align: "right", width: 495 });
      currentY += 20;
      doc.fillColor("#27272a").fontSize(10)
        .text(`${reverseArabicLine("قيمة المواد الإجمالية:")} $${subtotal.toFixed(2)}`, 50, currentY, { align: "right", width: 495 })
        .text(`${reverseArabicLine("الضرائب والرسوم المقدرة (0%):")} $${tax.toFixed(2)}`, 50, currentY + 15, { align: "right", width: 495 })
        .text(`${reverseArabicLine("القيمة التقديرية الكلية المطلوبة:")} $${total.toFixed(2)}`, 50, currentY + 30, { align: "right", width: 495 });

      currentY += 60;
      doc.rect(50, currentY, 495, 60).fill("#fbfbfd");
      doc.fillColor("#c59257").fontSize(11).text(reverseArabicLine("ملاحظات وشروط هامة:"), 70, currentY + 8, { align: "right", width: 455 });
      doc.fillColor("#71717a").fontSize(9).text(reverseArabicLine("هذا المستند يعتبر عرض سعر تقديري فقط مبني على مدخلات التصميم والمواد في تاريخ اليوم، ولا يحمل صفة الفاتورة الرسمية الملزمة إلا بعد إتمام التعاقد وسداد الدفعة المقدمة والاتفاق على جدول الإنتاج ليزر CO2 المعتمد."), 70, currentY + 24, { align: "right", width: 455 });

      const footerY = 740;
      doc.strokeColor("#c59257").lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.fillColor("#a1a1aa").fontSize(8);
      doc.text(reverseArabicLine("عرض سعر ذكي صادر آلياً من نظام ورش القص ليزر CO2 والتحكم الإداري - AXIS LAB"), 50, footerY + 10, { align: "center", width: 495 });
      doc.end();
    } catch (err: unknown) {
      console.error("Quotation PDF generation failed:", err);
      res.status(500).json({ error: "فشل توليد عرض السعر: " + err.message });
    }
  });

  router.get("/orders/:id/quotation/pdf", async (req, res) => {
    if (!requireFinanceRole(req, res)) return;
    res.redirect(`/api/print/quotation/${req.params.id}`);
  });

  // API - G-Code & CNC Laser Blueprint Compiler (Using Gemini Model)
  // ==================== REPORTS & ANALYTICS API ====================

  router.get("/export/sales/excel", async (req, res) => {
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
      res.status(500).json({ success: false, message: error.message });
    }
  })

  router.get("/export/invoices/excel", async (req, res) => {
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
      res.status(500).json({ success: false, message: error.message });
    }
  })

  router.get("/export/inventory/excel", async (req, res) => {
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
      res.status(500).json({ success: false, message: error.message });
    }
  })

  router.get("/export/customers/csv", async (req, res) => {
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
          (c as any).whatsapp || c.phone || "",
          c.company || "فردي",
          c.address || "",
          cOrders.length,
          totalSpent,
          (c as any).notes || ""
        ];
      });

      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(row => row.map(safeCsvCell).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Customers_Outreach_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: unknown) {
      res.status(500).json({ error: "Failed to export customers CSV", details: e.message });
    }
  })

  router.get("/export/materials/csv", async (req, res) => {
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
        const quality = (m as any).qualityStatus === 'defective' ? 'معيبة' : (m as any).qualityStatus === 'in_preparation' ? 'قيد التجهيز' : 'مفحوصة';
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
        ...rows.map(row => row.map(safeCsvCell).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=AXIS_LAB_Materials_Audit_${Date.now()}.csv`);
      res.send(csvContent);
    } catch (e: unknown) {
      res.status(500).json({ error: "Failed to export materials CSV", details: e.message });
    }
  })

  router.get("/export/profit/pdf", async (req, res) => {
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
        doc.moveDown(1);
      });

      doc.end();
    } catch (error: unknown) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  })

  return router;
}

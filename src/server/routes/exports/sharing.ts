import express from "express";
import PDFDocument from "pdfkit";
import * as core from "../../server-core.ts";
import { ensureFontExists, reverseArabicLine } from "./utils.ts";

const {
  ORDERS,
  INVOICES,
  EXPENSES,
  NOTIFICATIONS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  RESOURCE_FONT_PATH,
  getRequestUser,
} = core;

export function registerExportShareRoutes(app: express.Express) {
  app.post("/api/orders/:id/share", async (req, res) => {
    try {
      const { id } = req.params;
      const { email, subject, body, method } = req.body;
      if (!["email", "whatsapp", "pdf"].includes(method)) {
        res.status(400).json({ success: false, message: "طريقة المشاركة غير صالحة" });
        return;
      }
      if (method === "email" && !String(email || "").includes("@")) {
        res.status(400).json({ success: false, message: "البريد الإلكتروني غير صالح" });
        return;
      }
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
        priority: "normal",
        isRead: false,
        createdAt: new Date().toISOString(),
        link: ""
      });

      res.json({
        success: true,
        message: `تمت مشاركة ملخص الطلب رقم ${order.orderNumber} بنجاح عبر ${method === "email" ? "البريد الإلكتروني" : method === "whatsapp" ? "الواتساب" : "رابط PDF"}!`
      });
    } catch (err: unknown) {
      console.error("Error sharing order:", err);
      res.status(500).json({ success: false, error: err instanceof Error ? err instanceof Error ? err instanceof Error ? err.message : String(err) : String(err) : String(err) });
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
      const fontFile = await ensureFontExists(RESOURCE_FONT_PATH);

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
      });
      
      doc.end();
    } catch (err: unknown) {
      console.error("Export profit PDF failed:", err);
      res.status(500).json({ error: "فشل توليد تقرير الأرباح", details: err instanceof Error ? err.message : String(err) });
    }
  });
}

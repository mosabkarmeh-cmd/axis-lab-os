import express from "express";
import fs from "fs";
import PDFDocument from "pdfkit";
import * as core from "../server-core.ts";

const { ORDERS, CUSTOMERS, RESOURCE_FONT_PATH, getRequestUser } = core;

function requireQuotationAccess(req: express.Request, res: express.Response): boolean {
  const user = getRequestUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "يجب تسجيل الدخول" });
    return false;
  }
  if (!["admin", "accountant"].includes(user.role)) {
    res.status(403).json({ success: false, message: "عروض الأسعار محجوبة عن حساب الموظف" });
    return false;
  }
  return true;
}

function reverseArabicLine(value: string): string {
  return value.split("\n").map(line => line.split(" ").reverse().join(" ")).join("\n");
}

async function ensureFontExists(): Promise<string | null> {
  try {
    await fs.promises.access(RESOURCE_FONT_PATH, fs.constants.R_OK);
    return RESOURCE_FONT_PATH;
  } catch {
    return null;
  }
}

type QuotationItem = {
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  productName?: string;
};

function asQuotationItem(value: unknown): QuotationItem {
  if (!value || typeof value !== "object") return {};
  return value as QuotationItem;
}

export function registerQuotationRoutes(app: express.Express) {
  app.get("/api/print/quotation/:id", async (req, res) => {
    if (!requireQuotationAccess(req, res)) return;
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

      const items = Array.isArray(order.items) ? order.items.map(asQuotationItem) : [];
      items.forEach((item, idx: number) => {
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
      const subtotal = items.reduce((sum: number, item) => sum + ((Number(item.quantity) || Number(item.qty) || 1) * (Number(item.unitPrice) || Number(item.price) || 0)), 0);
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
      res.status(500).json({ error: "فشل توليد عرض السعر: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.get("/api/orders/:id/quotation/pdf", async (req, res) => {
    if (!requireQuotationAccess(req, res)) return;
    res.redirect(`/api/print/quotation/${req.params.id}`);
  });



}

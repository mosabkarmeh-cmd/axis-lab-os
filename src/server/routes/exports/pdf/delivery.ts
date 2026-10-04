import express from "express";
import PDFDocument from "pdfkit";
import * as core from "../../../server-core.ts";
import { asExportItem, ensureFontExists, reverseArabicLine } from "../utils.ts";

const {
  ORDERS,
  INVOICES,
  CUSTOMERS,
  PRODUCTION_JOBS,
  SETTINGS,
  MACHINES,
  RESOURCE_FONT_PATH,
} = core;

export function registerDeliveryNotePdfRoute(app: express.Express) {
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
      const fontFile = await ensureFontExists(RESOURCE_FONT_PATH);

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
      res.status(500).json({ error: "فشل توليد السند: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

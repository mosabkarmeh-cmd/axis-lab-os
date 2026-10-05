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

export function registerOrderPdfRoute(app: express.Express) {
  app.get("/api/orders/:id/pdf", async (req, res) => {
    try {
      const user = core.getRequestUser(req);
      if (!user) {
        res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
        return;
      }
      if (user.role === "employee") {
        res.status(403).json({ success: false, error: "المستند المالي للطلب محجوب عن حساب الموظف" });
        return;
      }
      const orderId = req.params.id;
      const order = ORDERS.find(o => o.id === orderId);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود" });
        return;
      }

      const customer = CUSTOMERS.find(c => c.id === order.customerId);
      const customerName = customer ? customer.name : "عميل عام";
      const canViewCustomerPrivateData = user.role === "admin";
      const customerPhone = canViewCustomerPrivateData && customer ? customer.phone : "محجوب لحماية الخصوصية";
      const customerAddress = canViewCustomerPrivateData && customer ? customer.address : "محجوب لحماية الخصوصية";

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const fontFile = await ensureFontExists(RESOURCE_FONT_PATH);

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
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

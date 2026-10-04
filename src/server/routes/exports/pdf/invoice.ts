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

export function registerInvoicePdfRoute(app: express.Express) {
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
      const fontFile = await ensureFontExists(RESOURCE_FONT_PATH);

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
      res.status(500).json({ error: "فشل توليد ملف الـ PDF: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

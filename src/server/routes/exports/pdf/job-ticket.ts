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

export function registerJobTicketPdfRoute(app: express.Express) {
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
      const fontFile = await ensureFontExists(RESOURCE_FONT_PATH);

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
      res.status(500).json({ error: "فشل توليد تذكرة التشغيل: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

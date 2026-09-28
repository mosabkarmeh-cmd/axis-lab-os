import { AnimatePresence, motion } from "motion/react";
import { Instagram, Info, Layers, MessageCircle, Printer, QrCode, Users, Wrench, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export interface OrderPrintModalProps {
  printTicketOrder: any;
  companySettings?: { name?: string; whatsapp?: string; phone?: string; instagram?: string };
  customers: Array<{ id: string; name?: string; phone?: string; company?: string; address?: string }>;
  currentUser?: { role?: string; fullName?: string } | null;
  setPrintTicketOrder: (value: any) => void;
}

export default function OrderPrintModal({ printTicketOrder, companySettings, customers, currentUser, setPrintTicketOrder }: OrderPrintModalProps) {
  if (!printTicketOrder) return null;

  return (
    <>
{/* 🖨️ PRINT JOB TICKET / INVOICE OVERLAY */}
<AnimatePresence>
  {printTicketOrder && (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-xl shadow-2xl p-8 space-y-6 text-right font-sans text-xs print:bg-white print:text-black print:border-0 print:shadow-none print:max-h-full print:p-4 print:w-full print:text-[11px] print:space-y-4"
      >
        {/* Header section (Logo and Ticket identity) */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b border-zinc-800 pb-5 gap-4 print:border-black print:pb-3">
          <div className="text-center sm:text-left order-2 sm:order-1 print:text-left">
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest print:text-zinc-700">Laser Manufacturing Job Ticket</div>
            <h2 className="text-xl font-black font-mono text-indigo-400 mt-1 print:text-black">{companySettings?.name || "AXIS LAB OPERATING SYSTEM"}</h2>
            <p className="text-[10px] text-zinc-400 mt-0.5 print:text-zinc-600">أكسيس لاب - نظم التصنيع الرقمي وقص الليزر المتقدم</p>
            
            {/* WhatsApp & Instagram Contact Badge */}
            <div className="flex items-center gap-2.5 text-[10.5px] mt-2 font-mono text-zinc-300 print:text-black flex-wrap justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded print:bg-transparent print:border-black print:text-black font-bold">
                <MessageCircle className="w-3 h-3 text-emerald-400 print:text-black" />
                <span>واتساب: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-pink-950/40 text-pink-400 border border-pink-800/40 px-2 py-0.5 rounded print:bg-transparent print:border-black print:text-black font-bold">
                <Instagram className="w-3 h-3 text-pink-400 print:text-black" />
                <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
              </span>
            </div>
          </div>
          <div className="text-center sm:text-right order-1 sm:order-2 print:text-right">
            <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800 print:bg-transparent print:text-black print:border-black">
              مستند إنتاجي / مالي معتمد
            </span>
            <h3 className="text-lg font-black text-zinc-100 mt-2.5 print:text-black">
              تذكرة تشغيل وفاتورة رقم: <span className="font-mono text-indigo-400 font-black print:text-black">#{printTicketOrder.orderNumber}</span>
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono print:text-zinc-700">ID: {printTicketOrder.id}</p>
          </div>
        </div>

        {/* Informative notification box (screen-only) */}
        <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg flex items-center gap-2 justify-end text-indigo-300 print:hidden text-[10.5px]">
          <span>اضغط على زر الطباعة في الأسفل لبدء إرسال الأمر للطابعة الحرارية أو العادية للورشة. تم تنسيق هذا المستند خصيصاً للتوفير الفائق في الحبر والورق.</span>
          <Info className="w-4 h-4 shrink-0" />
        </div>

        {/* Meta Grid (Client & Manufacturing Specs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-5 print:border-black print:pb-3 text-xs print:text-[10px]">
          {/* Client Box */}
          {(() => {
            const cust = customers.find(c => c.id === printTicketOrder.customerId);
            return (
              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2 print:border-black print:bg-transparent print:p-2">
                <h4 className="text-indigo-400 font-bold border-b border-zinc-800/80 pb-1 flex items-center justify-end gap-1 print:text-black print:border-black">
                  <span>بيانات ومستند العميل</span>
                  <Users className="w-3.5 h-3.5" />
                </h4>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-200 print:text-black">{cust?.name || "عميل عام"}</span>
                  <span className="text-zinc-500 print:text-zinc-700">اسم العميل:</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-zinc-300 print:text-black">
                    {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.phone || "غير متوفر")}
                  </span>
                  <span className="text-zinc-500 print:text-zinc-700">رقم الاتصال:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-300 print:text-black">
                    {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.company || "لا يوجد")}
                  </span>
                  <span className="text-zinc-500 print:text-zinc-700">الجهة / الشركة:</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-300 print:text-black">
                    {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.address || "التسليم بالورشة")}
                  </span>
                  <span className="text-zinc-500 print:text-zinc-700">العنوان المستهدف:</span>
                </div>
              </div>
            );
          })()}

          {/* Machine / Timeline Box */}
          <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2 print:border-black print:bg-transparent print:p-2">
            <h4 className="text-rose-400 font-bold border-b border-zinc-800/80 pb-1 flex items-center justify-end gap-1 print:text-black print:border-black">
              <span>جدولة التصنيع والمواعيد</span>
              <Wrench className="w-3.5 h-3.5" />
            </h4>
            <div className="flex justify-between">
              <span className="font-mono text-zinc-300 print:text-black">
                {new Date(printTicketOrder.createdAt).toLocaleString('ar-EG')}
              </span>
              <span className="text-zinc-500 print:text-zinc-700">تاريخ تسجيل الطلب:</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-zinc-300 font-bold text-amber-400 print:text-black">
                {printTicketOrder.deliveryDateExpected ? new Date(printTicketOrder.deliveryDateExpected).toLocaleString('ar-EG') : "فوري"}
              </span>
              <span className="text-zinc-500 print:text-zinc-700">التسليم المتوقع:</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono uppercase font-black text-rose-500 print:text-black">
                {printTicketOrder.priority}
              </span>
              <span className="text-zinc-500 print:text-zinc-700">أولوية الاستعجال:</span>
            </div>
            <div className="flex justify-between">
              <span className="uppercase font-mono font-bold text-emerald-400 print:text-black">
                {printTicketOrder.status}
              </span>
              <span className="text-zinc-500 print:text-zinc-700">الحالة التشغيلية للطلب:</span>
            </div>
          </div>
        </div>

        {/* Items List (The absolute core of laser operators) */}
        <div className="space-y-2 print:space-y-1">
          <h4 className="text-xs font-bold text-zinc-300 flex items-center justify-end gap-1 print:text-black print:text-[10px]">
            <span>جدول مواد وخامات تفصيل القص المطلوب</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400 print:hidden" />
          </h4>
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden print:border-black print:rounded-none">
            <table className="w-full text-xs text-right print:text-[9.5px]">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 print:bg-zinc-100 print:text-black print:border-black">
                  <th className="p-3 text-right">المادة والسمك / تعليمات القص للفني</th>
                  <th className="p-3 text-center w-20">الكمية</th>
                  <th className="p-3 text-left w-28">السعر الفردي</th>
                  <th className="p-3 text-left w-28">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 print:divide-black">
                {printTicketOrder.items && printTicketOrder.items.map((it, idx) => (
                  <tr key={it.id || idx} className="text-zinc-300 print:text-black hover:bg-zinc-900/10">
                    <td className="p-3 text-right">
                      <div className="font-bold text-zinc-200 print:text-black">{it.productName}</div>
                      {it.notes && (
                        <div className="text-[10px] text-indigo-400 mt-1 font-sans leading-relaxed flex items-center gap-1 justify-end print:text-zinc-700 print:font-bold">
                          <span>{it.notes}</span>
                          <span className="text-zinc-600 select-none print:text-black">←</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{it.quantity}</td>
                    <td className="p-3 text-left font-mono">{Number(it.unitPrice || 0).toLocaleString()} ل.س</td>
                    <td className="p-3 text-left font-mono font-bold text-indigo-400 print:text-black">{Math.round(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toLocaleString()} ل.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* General Order notes if exists */}
        {printTicketOrder.notes && (
          <div className="bg-amber-950/10 border border-amber-900/20 p-3.5 rounded-lg text-right print:border-black print:rounded-none">
            <span className="text-[10.5px] text-amber-400 font-bold block mb-1 print:text-black">ملاحظات وتعليمات إنتاجية عامة:</span>
            <p className="text-xs text-zinc-300 leading-relaxed print:text-black print:text-[10px]">{printTicketOrder.notes}</p>
          </div>
        )}

        {/* Financial calculations block */}
        <div className="flex justify-end">
          <div className="w-full sm:w-80 bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2.5 print:border-black print:p-3 print:rounded-none print:w-64 text-xs print:text-[10px]">
            <div className="flex justify-between items-center">
              <span className="font-mono text-zinc-200 font-bold print:text-black">{Number(printTicketOrder.totalPrice || 0).toLocaleString()} ل.س</span>
              <span className="text-zinc-500 print:text-zinc-700">إجمالي قيمة الفاتورة:</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-850/80 pb-2 print:border-black">
              <span className="font-mono text-emerald-400 font-bold print:text-black">{Number(printTicketOrder.paidAmount || 0).toLocaleString()} ل.س</span>
              <span className="text-zinc-500 print:text-zinc-700">المبلغ المقبوض سلفاً:</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="font-mono text-lg font-black text-indigo-400 print:text-black print:text-xs">
                {Number(printTicketOrder.remaining || 0).toLocaleString()} ل.س
              </span>
              <span className="font-bold text-zinc-300 print:text-black">المبلغ المتبقي المستحق:</span>
            </div>
          </div>
        </div>

        {/* G-code metadata calibration if exists (so operator sees configuration) */}
        {orderGcodeResult && (
          <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg text-right print:border-black print:rounded-none">
            <span className="text-[10px] text-indigo-400 font-bold block mb-1 print:text-black">توجيه فني للقص الرقمي (G-Code):</span>
            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed print:text-black">{orderGcodeResult.calibrationAdvice}</p>
          </div>
        )}

        {/* Signature Lines for legal, employee accountability, and workshop verification */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 text-center text-xs print:text-[9.5px] print:pt-4 print:grid-cols-3">
          {/* 1. Employee Signature Field */}
          <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
            <div className="space-y-0.5">
              <span className="text-indigo-400 font-bold block print:text-black text-xs">
                توقيع الموظف المسؤول
              </span>
              <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                (منظم ومحرر الفاتورة)
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
              <span className="text-[10px] text-zinc-300 print:text-black font-bold mb-1">
                {currentUser?.fullName || "الموظف المختص"}
              </span>
              <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">توقيع واعتماد الموظف</span>
            </div>
          </div>

          {/* 2. Laser Workshop Engineer / Operator Signature */}
          <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
            <div className="space-y-0.5">
              <span className="text-rose-400 font-bold block print:text-black text-xs">
                اعتماد مهندس الورشة
              </span>
              <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                (فني تشغيل ليزر CO2)
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
              <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">توقيع مهندس التشغيل</span>
            </div>
          </div>

          {/* 3. Customer Signature */}
          <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-bold block print:text-black text-xs">
                توقيع واستلام العميل
              </span>
              <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                (المستلم المعتمد للطلبية)
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
              <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">اسم وتوقيع المستلم</span>
            </div>
          </div>
        </div>

        {/* 📱 DYNAMIC QR CODE FOR PUBLIC TRACKING & PDF ACCESS */}
        {(() => {
          const qrCodeUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/api/orders/${printTicketOrder.id}/pdf` 
            : `https://axislab-portal.sy/api/orders/${printTicketOrder.id}/pdf`;
          return (
            <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-4 print:bg-white print:border-black print:p-2 print:rounded-lg">
              <div className="space-y-1 text-right flex-1">
                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-indigo-400 print:text-black">
                  <span>تتبع الطلب وتحميل الفاتورة إلكترونياً (QR Code)</span>
                  <QrCode className="w-4 h-4 text-[#c59257] print:text-black" />
                </div>
                <p className="text-[10.5px] text-zinc-400 leading-relaxed print:text-zinc-700">
                  امسح الكود عبر كاميرا الهاتف لتتبع حالة قص وتصنيع الطلب بالورشة أو لاستعراض وتحميل وثيقة الفاتورة الرسمية (PDF).
                </p>
                <div className="text-[9px] font-mono text-zinc-500 truncate dir-ltr text-left print:text-black print:font-bold">
                  {qrCodeUrl}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-700 shadow-md print:border-black print:shadow-none shrink-0 flex items-center justify-center">
                <QRCodeSVG 
                  value={qrCodeUrl} 
                  size={84} 
                  bgColor="#ffffff" 
                  fgColor="#000000" 
                  level="M" 
                />
              </div>
            </div>
          );
        })()}

        {/* Document footer notice */}
        <div className="border-t border-zinc-900 pt-4 text-center text-[10px] text-zinc-400 print:border-black print:text-black space-y-1">
          <div className="flex items-center justify-center gap-4 text-xs font-bold flex-wrap">
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
              <span>واتساب المبيعات: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
              <span>إنستغرام الورشة: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 print:text-zinc-700 font-mono">
            AXIS LAB OS • Powered by Advanced CNC Laser Systems • تم توليد وحساب هذا المستند برمجياً بالكامل وهو مستند إنتاجي ومالي معتمد.
          </p>
        </div>

        {/* Actions Section (Hidden on Print) */}
        <div className="pt-4 flex gap-2 justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
          >
            <Printer className="w-4 h-4" />
            <span>تأكيد الطباعة الفعلية</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintTicketOrder(null)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
          >
            إغلاق المعاينة والعودة
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

    </>
  );
}

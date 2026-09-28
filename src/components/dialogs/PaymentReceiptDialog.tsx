import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function PaymentReceiptDialog(props: GlobalDialogProps) {
  const { currentUser, customers, exchangeRate, selectedPaymentReceipt, setSelectedPaymentReceipt } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {selectedPaymentReceipt && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-right font-sans dir-rtl flex flex-col max-h-[90vh]"
            >
              {/* Header bar */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentReceipt(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-100">سند قبض مالي معتمد</h3>
                </div>
              </div>

              {/* Printable receipt content */}
              <div id="payment-receipt-print-area" className="p-8 bg-zinc-950 text-zinc-200 overflow-y-auto space-y-6 print:bg-white print:text-black print:p-4">
                {/* Official Header */}
                <div className="border-b-2 border-amber-500/80 pb-4 flex justify-between items-start">
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">رقم سند القبض</span>
                    <strong className="text-sm text-amber-400 print:text-black block">{selectedPaymentReceipt.receipt.id}</strong>
                    <span className="text-[10px] text-zinc-400 print:text-gray-600 block mt-1">
                      {new Date(selectedPaymentReceipt.receipt.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-zinc-100 print:text-black flex items-center justify-end gap-2">
                      <span>AXIS LAB</span>
                      <Scissors className="w-5 h-5 text-amber-400" />
                    </h2>
                    <p className="text-[11px] text-amber-400 font-semibold print:text-black">ورش القص والنقش بالليزر وإدارة الورش الاحترافية</p>
                    <p className="text-[10px] text-zinc-500 print:text-gray-600">سند قبض مالي رسمي مقبوض من العميل</p>
                  </div>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-zinc-900/60 border border-zinc-800 print:border-gray-300 print:bg-gray-50 rounded-xl p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 print:border-gray-300 pb-3">
                    <div>
                      <span className="text-zinc-500 print:text-gray-600 block">اسم العميل:</span>
                      <strong className="text-zinc-100 print:text-black text-sm">
                        {customers.find(c => c.id === selectedPaymentReceipt.order.customerId)?.name || "عميل عام"}
                      </strong>
                    </div>
                    <div className="text-left">
                      <span className="text-zinc-500 print:text-gray-600 block">رقم الطلب المرتبط:</span>
                      <strong className="text-indigo-400 print:text-black font-mono text-sm">
                        {selectedPaymentReceipt.order.orderNumber}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Amount Display Box */}
                  <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 print:bg-emerald-50 print:border-emerald-300 rounded-lg flex justify-between items-center">
                    <div className="text-left font-mono">
                      <div className="text-base font-extrabold text-emerald-400 print:text-emerald-800">
                        ${selectedPaymentReceipt.receipt.amountUSD.toFixed(2)}
                      </div>
                      <div className="text-xs text-emerald-300/80 print:text-emerald-700 font-bold">
                        {(selectedPaymentReceipt.receipt.amountSYP || Math.round(selectedPaymentReceipt.receipt.amountUSD * exchangeRate)).toLocaleString()} ل.س
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 print:text-emerald-800 font-bold uppercase block">المبلغ المقبوض بالسند</span>
                      <span className="text-xs text-zinc-300 print:text-black">
                        طريقة الدفع: <strong className="text-emerald-400 print:text-black font-bold">
                          {selectedPaymentReceipt.receipt.paymentMethod === 'transfer' ? 'تحويل بنكي / سيريتل' : selectedPaymentReceipt.receipt.paymentMethod === 'card' ? 'بطاقة / شيك' : 'نقدي كاش بالورشة'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Notes / Statements */}
                  {selectedPaymentReceipt.receipt.notes && (
                    <div className="pt-1 text-[11px] text-zinc-400 print:text-gray-700">
                      <span className="font-bold text-zinc-300 print:text-black">البيان / ملاحظات المقبوضات: </span>
                      <span>{selectedPaymentReceipt.receipt.notes}</span>
                    </div>
                  )}
                </div>

                {/* Overall Order Status Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-zinc-900/40 border border-zinc-800 print:border-gray-300 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">إجمالي الطلب</span>
                    <strong className="font-mono text-zinc-200 print:text-black">${selectedPaymentReceipt.order.totalPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">إجمالي المقبوض حتى الآن</span>
                    <strong className="font-mono text-emerald-400 print:text-black">${selectedPaymentReceipt.order.paidAmount.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">المتبقي الحالي</span>
                    <strong className="font-mono text-rose-400 print:text-black">${selectedPaymentReceipt.order.remaining.toFixed(2)}</strong>
                  </div>
                </div>

              {/* Signatures */}
                <div className="pt-6 border-t border-zinc-800 print:border-gray-300 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">توقيع الموظف المسؤول</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5 font-mono">
                      {currentUser?.fullName || "أمين الصندوق / الموظف"}
                    </span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">اعتماد إدارة الورشة</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5">قسم المالية والمحاسبة</span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">توقيع واستلام العميل</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5">المستلم المعتمد</span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentReceipt(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cust = customers.find(c => c.id === selectedPaymentReceipt.order.customerId);
                      const msg = `إيصال قبض مالي رقم ${selectedPaymentReceipt.receipt.id}\nالعميل: ${cust?.name || 'محترم'}\nالطلب: ${selectedPaymentReceipt.order.orderNumber}\nالمبلغ المقبوض: $${selectedPaymentReceipt.receipt.amountUSD.toFixed(2)} (${(selectedPaymentReceipt.receipt.amountSYP || Math.round(selectedPaymentReceipt.receipt.amountUSD * exchangeRate)).toLocaleString()} ل.س)\nالمتبقي الحالي: $${selectedPaymentReceipt.order.remaining.toFixed(2)}\nشكراً لتعاملكم مع AXIS LAB.`;
                      const phone = cust?.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="px-3 py-2 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة عبر الواتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة سند القبض</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

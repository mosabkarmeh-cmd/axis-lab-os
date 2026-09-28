import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function LegacyShareOrderDialog(props: GlobalDialogProps) {
  const { customers, handleCopyText, handleSendEmailShare, isSharingEmail, orders, rows, selectedOrder, setShareBody, setShareEmail, setShareEmailSuccess, setShareMethod, setShareSubject, setShowShareModal, shareBody, shareEmail, shareEmailSuccess, shareMethod, shareMsgCopied, sharePdfCopied, shareSubject, showShareModal } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {showShareModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-sans text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl max-w-2xl w-full space-y-5 shadow-2xl relative overflow-hidden text-right"
            >
              {/* Header decor */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-[#c59257]"></div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmailSuccess(false);
                }}
                className="absolute top-4 left-4 p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Title */}
              <div className="flex items-center gap-2 justify-start mt-2">
                <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-900/30 flex items-center justify-center text-[#c59257]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">مشاركة وثائق ومستندات الطلب</h3>
                  <p className="text-[10px] text-zinc-500">رقم الطلب المرجعي: <span className="font-mono text-amber-500 font-bold">#{selectedOrder.orderNumber}</span></p>
                </div>
              </div>

              {/* Customer overview */}
              {(() => {
                const cust = customers.find(c => c.id === selectedOrder.customerId);
                return (
                  <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-300 text-right">
                    <div className="text-right">
                      <span className="text-zinc-500 block">العميل المستلم:</span>
                      <span className="font-bold text-zinc-200">{cust?.name || "عميل عام"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block">رقم الهاتف:</span>
                      <span className="font-mono text-zinc-200">{cust?.phone || "غير متوفر"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block">إجمالي المستحق:</span>
                      <span className="font-bold text-[#c59257]">{Number(selectedOrder.totalPrice || 0).toLocaleString()} ل.س</span>
                    </div>
                  </div>
                );
              })()}

              {/* Tabs selector */}
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShareMethod('email')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'email'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>البريد الإلكتروني</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('whatsapp')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'whatsapp'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب سريع</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('pdf')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'pdf'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ملف ورابط PDF</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[200px] flex flex-col justify-between text-right">
                {shareMethod === 'email' && (
                  <div className="space-y-3 text-right">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="text-right">
                        <label className="text-zinc-500 block mb-1">البريد الإلكتروني للعميل</label>
                        <input
                          type="email"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-[#c59257] focus:outline-none text-right"
                          placeholder="client@example.com"
                        />
                      </div>
                      <div className="text-right">
                        <label className="text-zinc-500 block mb-1">عنوان الرسالة</label>
                        <input
                          type="text"
                          value={shareSubject}
                          onChange={(e) => setShareSubject(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-[#c59257] focus:outline-none text-right"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <label className="text-zinc-500 block mb-1 text-xs">نص ومحتوى ملخص الفاتورة والطلب</label>
                      <textarea
                        rows={6}
                        value={shareBody}
                        onChange={(e) => setShareBody(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-300 font-sans text-[11px] leading-relaxed focus:border-[#c59257] focus:outline-none resize-none text-right"
                      />
                    </div>

                    {shareEmailSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-950/40 border border-emerald-900/30 p-3 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2 justify-start text-right"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>تم إرسال ملخص الطلب بنجاح، وتم تسجيل الحركة في سجل تتبع الورشة!</span>
                      </motion.div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSharingEmail}
                        onClick={handleSendEmailShare}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-[#c59257] hover:brightness-110 text-zinc-950 font-black rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        {isSharingEmail ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري إرسال البريد الإلكتروني للمستلم...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>إرسال ملخص الطلب الآن للعميل</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {shareMethod === 'whatsapp' && (
                  <div className="space-y-4 text-right">
                    <p className="text-[10px] text-zinc-500 leading-relaxed text-right">
                      يتيح لك هذا الخيار نسخ وتنسيق رسالة رسمية لتبادلها وتأكيدها مع العميل مباشرة عبر تطبيق واتساب لضمان أرشفة الاتفاقات والدفعات والملخص المالي للطلب.
                    </p>
                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-zinc-300 text-[11px] font-sans leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto text-right" dir="rtl">
                      {shareBody}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(shareBody, 'msg')}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{shareMsgCopied ? "تم نسخ النص!" : "نسخ نص الرسالة ورقم الاتصال"}</span>
                      </button>
                      
                      {(() => {
                        const cust = customers.find(c => c.id === selectedOrder.customerId);
                        const cleanPhone = cust?.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
                        const formattedPhone = cleanPhone ? (cleanPhone.startsWith('963') || cleanPhone.startsWith('00') ? cleanPhone : '963' + cleanPhone.replace(/^0/, '')) : '';
                        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(shareBody)}`;
                        return (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>مشاركة على واتساب العميل</span>
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {shareMethod === 'pdf' && (
                  <div className="space-y-4 text-center">
                    <div className="max-w-md mx-auto py-3">
                      <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-indigo-400 mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200 mb-1">تحميل ومشاركة رابط الـ PDF المباشر</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed px-4">
                        سند التشغيل والفاتورة متاحان دائماً كملف PDF رسمي مصمم بأسلوب متكامل يناسب الطباعة كمرجع مالي وفني.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                      <a
                        href={`/api/orders/${selectedOrder.id}/pdf`}
                        download={`order_${selectedOrder.orderNumber}.pdf`}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تحميل وتنزيل PDF مباشر</span>
                      </a>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const directLink = `${window.location.origin}/api/orders/${selectedOrder.id}/pdf`;
                          handleCopyText(directLink, 'pdf');
                        }}
                        className="flex-1 py-2 bg-[#c59257] hover:bg-[#b07e43] text-zinc-950 font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{sharePdfCopied ? "تم نسخ الرابط!" : "نسخ رابط الـ PDF للمشاركة"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmailSuccess(false);
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  إغلاق نافذة المشاركة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

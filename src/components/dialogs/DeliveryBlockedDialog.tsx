import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function DeliveryBlockedDialog(props: GlobalDialogProps) {
  const { deliveryBlockedOrder, exchangeRate, handleSettleRemainingAndDeliver, isProcessingQuickFullPay, selectedPaymentMethod, setDeliveryBlockedOrder, setOrderDetailsTab, setSelectedOrder, setSelectedPaymentMethod } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {deliveryBlockedOrder && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="bg-[#0c0a09] border border-amber-900/60 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-right font-sans dir-rtl"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-amber-950/40 border-b border-amber-900/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDeliveryBlockedOrder(null)}
                  className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">حظر تسليم الطلب للعميل</h3>
                    <p className="text-[10px] text-amber-400/80 font-mono">ORDER DELIVERY RESTRICTION • UNPAID BALANCE</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs">
                <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl text-amber-200/90 leading-relaxed space-y-2">
                  <p className="font-semibold text-sm text-amber-300">
                    ⚠️ يتطلب نظام الرقابة المالية بالورشة تسديد كامل مستحقات الطلب قبل تحويل الحالة إلى (تم التسليم).
                  </p>
                  <p className="text-zinc-400 text-xs">
                    الطلب رقم <strong className="text-zinc-200 font-mono">#{deliveryBlockedOrder.orderNumber}</strong> يتضمن مبالغ معلقة غير مدفوعة. يرجى استيفاء المبلغ المتبقي لتسليم القطع للعميل رسمياً.
                  </p>
                </div>

                {/* Balance breakdown card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-850">
                    <span className="text-[10px] text-zinc-500 block">إجمالي التكلفة</span>
                    <span className="text-xs font-bold text-zinc-200 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.totalPrice || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-zinc-500 font-mono">${(Number(deliveryBlockedOrder.totalPrice || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/30">
                    <span className="text-[10px] text-emerald-400 block">المقبوض سابقاً</span>
                    <span className="text-xs font-bold text-emerald-300 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.paidAmount || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-emerald-500 font-mono">${(Number(deliveryBlockedOrder.paidAmount || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900/40 animate-pulse">
                    <span className="text-[10px] text-rose-400 block font-bold">المتبقي المستحق</span>
                    <span className="text-sm font-extrabold text-rose-300 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.remaining || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-rose-400 font-bold font-mono">${(Number(deliveryBlockedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Choice */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 block">وسيلة تسديد المقبوضات:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: '💵 نقدي (كاش)' },
                      { id: 'transfer', label: '🏦 تحويل بنكي/سيريتل' },
                      { id: 'card', label: '💳 بطاقة / شيك' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.id as any)}
                        className={`p-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          selectedPaymentMethod === m.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSettleRemainingAndDeliver(deliveryBlockedOrder)}
                    disabled={isProcessingQuickFullPay}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingQuickFullPay ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري تسجيل الدفعة وتحويل الحالة إلى (تم التسليم)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبض المتبقي كاش ({Math.round(Number(deliveryBlockedOrder.remaining || 0)).toLocaleString()} ل.س / ${(Number(deliveryBlockedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)} USD) والتسليم فوراً</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(deliveryBlockedOrder);
                        setOrderDetailsTab('payments');
                        setDeliveryBlockedOrder(null);
                      }}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>تخصيص دفعة جزئية أولاً</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryBlockedOrder(null)}
                      className="py-2 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium rounded-xl text-[11px] transition-colors cursor-pointer"
                    >
                      إلغاء التغيير
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

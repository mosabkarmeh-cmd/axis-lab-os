import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function StandaloneCutProgressDialog(props: GlobalDialogProps) {
  const { customers, progressModalOrder, renderCutProgressInteractiveTable, setProgressModalOrder, setSelectedOrder } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {progressModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-zinc-950/90 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-100 flex items-center gap-2">
                      <span>جدول تفصيل إنجاز القص (شو يلي انقص وشو يلي لسا)</span>
                      <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 text-xs">
                        #{progressModalOrder.orderNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      تحديد كميات القطع المنجزة والمتبقية للقص بالليزر ليتم احتساب النسبة الإجمالية تلقائياً
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProgressModalOrder(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {renderCutProgressInteractiveTable(progressModalOrder)}
              </div>

              {/* Modal Footer */}
              <div className="bg-zinc-950/90 border-t border-zinc-800 px-6 py-3.5 flex items-center justify-between text-xs">
                <div className="text-zinc-400">
                  <span>العميل: <strong className="text-zinc-200">{customers.find(c => c.id === progressModalOrder.customerId)?.name || "عميل عام"}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(progressModalOrder);
                      setProgressModalOrder(null);
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    عرض كامل تفاصيل الطلب
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressModalOrder(null)}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-lg shadow-cyan-950/50"
                  >
                    تم الحفظ وإغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

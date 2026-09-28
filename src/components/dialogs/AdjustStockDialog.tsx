import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function AdjustStockDialog(props: GlobalDialogProps) {
  const { adjustQty, adjustReason, adjustType, setAdjustQty, setAdjustReason, setAdjustType, setShowAdjustStock, showAdjustStock, handleAdjustStockSubmit, rows } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {showAdjustStock && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustStock(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>تسجيل حركة مخزون: {showAdjustStock.name}</span>
                </span>
              </div>

              <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs text-zinc-300">
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">نوع الحركة المخزنية</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => setAdjustType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  >
                    <option value="purchase">شراء وتوريد خامات جديدة (زيادة الرصيد +)</option>
                    <option value="adjustment">تسوية جردية يدوي (تعديل مباشر)</option>
                    <option value="consumption">استهلاك في إنتاج (خصم رصيد -)</option>
                    <option value="waste">هدر وتلف ألواح (خصم رصيد -)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">الكمية بالألواح / الوحدات</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left focus:outline-none focus:border-[#c59257] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">ملاحظات وسبب الحركة</label>
                  <textarea
                    rows={3}
                    placeholder="ملاحظات توضيحية لعملية التعديل..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    تأكيد وتسجيل الحركة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdjustStock(null)}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

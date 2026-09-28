import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function AddRemnantDialog(props: GlobalDialogProps) {
  const { materials, handleCreateRemnant, remHeight, remLocation, remMatId, remQty, remWidth, setRemHeight, setRemLocation, setRemMatId, setRemQty, setRemWidth, setShowAddRemnant, showAddRemnant } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {showAddRemnant && (
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
                  onClick={() => setShowAddRemnant(false)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#c59257]" />
                  <span>تسجيل فضلة لوح جديدة يدوياً</span>
                </span>
              </div>

              <form onSubmit={handleCreateRemnant} className="space-y-4 text-xs text-zinc-300">
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">الخامة الأساسية المتبقي منها</label>
                  <select
                    required
                    value={remMatId}
                    onChange={(e) => setRemMatId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  >
                    <option value="">-- اختر نوع المادة --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.thickness} مم) - {m.color}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">عرض الفضلة (مم)</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 600"
                      value={remWidth}
                      onChange={(e) => setRemWidth(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">ارتفاع الفضلة (مم)</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 400"
                      value={remHeight}
                      onChange={(e) => setRemHeight(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">عدد الفضلات المطابقة</label>
                    <input
                      type="number"
                      required
                      placeholder="1"
                      value={remQty}
                      onChange={(e) => setRemQty(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">مكان تخزين الفضلة في الرف</label>
                    <input
                      type="text"
                      placeholder="مثال: رف B4"
                      value={remLocation}
                      onChange={(e) => setRemLocation(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    تسجيل وحفظ الفضلة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRemnant(false)}
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

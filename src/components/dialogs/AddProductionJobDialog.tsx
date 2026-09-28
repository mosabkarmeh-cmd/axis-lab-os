import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function AddProductionJobDialog(props: GlobalDialogProps) {
  const { materials, newJobEstTime, newJobItemName, newJobLaserPower, newJobLaserSpeed, newJobMaterialId, newJobOrderId, setNewJobEstTime, setNewJobItemName, setNewJobLaserPower, setNewJobLaserSpeed, setNewJobMaterialId, setNewJobOrderId, setShowAddJob, showAddJob, handleCreateProductionJob, orders } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {showAddJob && (
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
                  onClick={() => setShowAddJob(false)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>إدراج مهمة إنتاج وقص ليزر CO2</span>
                </span>
              </div>

              <form onSubmit={handleCreateProductionJob} className="space-y-4 text-xs text-zinc-350">
                <div>
                  <label className="text-zinc-500 block mb-1">اسم المهمة (مثال: قص حروف لوحة إعلانات)</label>
                  <input
                    type="text"
                    required
                    value={newJobItemName}
                    onChange={(e) => setNewJobItemName(e.target.value)}
                    placeholder="اكتب اسم الجزء أو عنصر التصميم المطلوب قصه..."
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-zinc-500 block mb-1">اربط المادة الخام المستهدفة (من المخزون)</label>
                    <select
                      required
                      value={newJobMaterialId}
                      onChange={(e) => setNewJobMaterialId(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="">-- اختر لوح الخامة من المخزن --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.thickness}مم - {m.color}) [متبقي: {m.quantity} {m.unit === 'sheet' ? 'ألواح' : 'وحدات'}]
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-zinc-600 block mt-1">
                      * عند إكمال عملية القص، سيتم تلقائياً خصم لوح واحد من رصيد هذه المادة وتسجيل العملية.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">شدة شعاع الليزر (Power %)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="100"
                      value={newJobLaserPower}
                      onChange={(e) => setNewJobLaserPower(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">سرعة القص (Speed mm/s)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="150"
                      value={newJobLaserSpeed}
                      onChange={(e) => setNewJobLaserSpeed(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 block mb-1">الطلب المرتبط بها (اختياري)</label>
                    <select
                      value={newJobOrderId}
                      onChange={(e) => setNewJobOrderId(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="">-- عمل إنتاجي يدوياً --</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>طلب #{o.orderNumber} [{o.status}]</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 font-sans">وقت التشغيل المقدر (ثانية)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      value={newJobEstTime}
                      onChange={(e) => setNewJobEstTime(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    إرسال إلى صالة الإنتاج
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddJob(false)}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs cursor-pointer"
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

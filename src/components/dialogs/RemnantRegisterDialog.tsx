import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function RemnantRegisterDialog(props: GlobalDialogProps) {
  const { jobRemHeight, jobRemLocation, jobRemWidth, setJobRemHeight, setJobRemLocation, setJobRemWidth, setShowRemnantRegister, showRemnantRegister, handleDirectCompleteJob, handleRegisterRemnantOnJobComplete } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {showRemnantRegister && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="text-center space-y-2 border-b border-zinc-900 pb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-black text-zinc-100">اكتملت عملية قص المتجهات بنجاح!</h3>
                <p className="text-xs text-zinc-500">تم إكمال المهمة {showRemnantRegister.jobNo} على ماكينات الورشة.</p>
              </div>

              <div className="bg-emerald-950/10 border border-emerald-900/20 p-3.5 rounded-lg text-xs text-emerald-300 leading-relaxed text-right">
                هل ترغب في تسجيل **فضلة لوح متبقية** متبقية من لوح القص؟ بتسجيلها، سيقوم نظام الورشة بإتاحتها للمهندسين فورياً عند قص أي تصاميم صغيرة الحجم لاحقاً بدلاً من هدر ألواح جديدة كاملة.
              </div>

              <form onSubmit={handleRegisterRemnantOnJobComplete} className="space-y-4 text-xs text-zinc-300">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">طول الفضلة (مم)</label>
                    <input
                      type="number"
                      placeholder="اختياري (مثال: 450)"
                      value={jobRemHeight}
                      onChange={(e) => setJobRemHeight(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">عرض الفضلة (مم)</label>
                    <input
                      type="number"
                      placeholder="اختياري (مثال: 600)"
                      value={jobRemWidth}
                      onChange={(e) => setJobRemWidth(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">مكان تخزين الفضلة بالورشة</label>
                  <input
                    type="text"
                    placeholder="مثال: درج الفضلات - الرف رقم 2"
                    value={jobRemLocation}
                    onChange={(e) => setJobRemLocation(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>تسجيل الفضلة وإتمام المهمة بنجاح</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDirectCompleteJob(showRemnantRegister.id);
                      setShowRemnantRegister(null);
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    تجاوز (قص عادي بدون بقايا ألواح)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

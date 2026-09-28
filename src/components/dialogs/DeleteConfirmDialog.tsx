import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function DeleteConfirmDialog(props: GlobalDialogProps) {
  const { deleteConfirmTarget, handleDeleteCustomer, handleDeleteProduct, setDeleteConfirmTarget } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-rose-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>تأكيد الحذف النهائي</span>
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف {deleteConfirmTarget.type === 'customer' ? 'العميل' : 'المنتج'}{" "}
                  <strong className="text-white font-semibold">"{deleteConfirmTarget.name}"</strong> نهائياً من النظام؟
                </p>
                <p className="text-[10px] text-zinc-500 bg-rose-950/20 border border-rose-950/40 p-2.5 rounded-lg leading-normal">
                  تنبيه: هذا الإجراء سيقوم بمسح السجل بشكل دائم من قاعدة البيانات، ولا يمكن التراجع عن هذه الخطوة بأي حال من الأحوال.
                </p>
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    if (deleteConfirmTarget.type === 'customer') {
                      await handleDeleteCustomer(deleteConfirmTarget.id, deleteConfirmTarget.name);
                    } else if (deleteConfirmTarget.type === 'product') {
                      await handleDeleteProduct(deleteConfirmTarget.id, deleteConfirmTarget.name);
                    }
                    setDeleteConfirmTarget(null);
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  نعم، تأكيد الحذف النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

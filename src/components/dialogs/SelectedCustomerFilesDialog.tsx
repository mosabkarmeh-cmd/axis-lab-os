import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function SelectedCustomerFilesDialog(props: GlobalDialogProps) {
  const { currentUser, selectedCustomerFiles, setSelectedCustomerFiles } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {selectedCustomerFiles && currentUser?.role !== 'accountant' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  onClick={() => setSelectedCustomerFiles(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#c59257] font-bold text-sm">ملفات ومستندات العميل: {selectedCustomerFiles.name}</span>
                  <FolderOpen className="w-4 h-4 text-[#c59257]" />
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                احتفظ بسجلات العقود أو فواتير العميل أو المتطلبات التشغيلية والتصميمية ليكون الوصول إليها سهلاً عند تنفيذ مهام قص الليزر للعميل.
              </p>
              <FileUploader entityType="customer" entityId={selectedCustomerFiles.id} />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedCustomerFiles(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

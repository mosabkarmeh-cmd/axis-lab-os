import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function HelpGuideDialog(props: GlobalDialogProps) {
  const { isHelpGuideOpen, setIsHelpGuideOpen } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
<AnimatePresence>
        {isHelpGuideOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHelpGuideOpen(false)}
                  className="px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
                >
                  إغلاق ×
                </button>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#c59257] animate-pulse" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    مركز المساعدة والتدريب والتشغيل السريع (10x UX Centre)
                  </h3>
                </div>
              </div>

              {/* Body Content */}
              <div className="overflow-y-auto flex-1">
                <HelpCenter />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
}

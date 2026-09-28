import { AnimatePresence, motion } from "motion/react";
import { Layers, PlusCircle, X, Zap } from "lucide-react";

export interface QuickActionsFabProps {
  isQuickActionsOpen: boolean;
  setIsQuickActionsOpen: (open: boolean) => void;
  setShowAddOrder: (open: boolean) => void;
  setShowAddJob: (open: boolean) => void;
  setShowAddProduct: (open: boolean) => void;
}

export default function QuickActionsFab({ isQuickActionsOpen, setIsQuickActionsOpen, setShowAddOrder, setShowAddJob, setShowAddProduct }: QuickActionsFabProps) {
  return (
    <>
{/* ⚡ FLOATING QUICK ACTIONS MENU */}
<div className="fixed bottom-6 right-6 z-40 font-sans text-right">
  <AnimatePresence>
    {isQuickActionsOpen && (
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.9 }}
        className="flex flex-col items-end gap-3 mb-4"
      >
        {/* Action 1: Add Order */}
        <motion.button
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAddOrder(true);
            setIsQuickActionsOpen(false);
          }}
          className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <span className="text-xs text-zinc-300 font-bold group-hover:text-emerald-400 transition-colors">صياغة طلب جديد</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-900/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <PlusCircle className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Action 2: Create Job */}
        <motion.button
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAddJob(true);
            setIsQuickActionsOpen(false);
          }}
          className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <span className="text-xs text-zinc-300 font-bold group-hover:text-indigo-400 transition-colors">إدراج مهمة إنتاج</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-900/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Activity className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Action 3: Add Material */}
        <motion.button
          whileHover={{ scale: 1.05, x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAddProduct(true);
            setIsQuickActionsOpen(false);
          }}
          className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-[#c59257]/50 transition-all cursor-pointer group"
        >
          <span className="text-xs text-zinc-300 font-bold group-hover:text-[#c59257] transition-colors">إضافة مادة / خامة قص</span>
          <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-900/40 flex items-center justify-center text-[#c59257] group-hover:bg-[#c59257] group-hover:text-zinc-950 transition-all">
            <Layers className="w-4 h-4" />
          </div>
        </motion.button>
      </motion.div>
    )}
  </AnimatePresence>

  {/* Primary Toggle FAB */}
  <motion.button
    onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.95 }}
    animate={{ rotate: isQuickActionsOpen ? 135 : 0 }}
    className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c59257] to-[#ffd166] text-zinc-950 flex items-center justify-center shadow-2xl cursor-pointer hover:shadow-gold-500/20 hover:brightness-110 transition-all"
    title="الإجراءات السريعة"
  >
    {isQuickActionsOpen ? <X className="w-5 h-5 font-bold" /> : <Zap className="w-5 h-5 font-bold" />}
  </motion.button>
</div>

    </>
  );
}

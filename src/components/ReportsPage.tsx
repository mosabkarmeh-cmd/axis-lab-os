import { motion } from "motion/react";
import type { Variants, Transition } from "motion/react";
import { Lock } from "lucide-react";
import ReportsView from "./ReportsView";

type ReportsPageProps = {
  isEmployee: boolean;
  pageVariants: Variants;
  pageTransition: Transition;
};

export default function ReportsPage({ isEmployee, pageVariants, pageTransition }: ReportsPageProps) {
  return (
    <motion.div
      key="reports"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 overflow-y-auto p-6 bg-zinc-950/20"
    >
      {isEmployee ? (
        <div className="flex flex-col justify-center items-center text-center p-12 min-h-[400px]">
          <Lock className="w-16 h-16 text-rose-500 mb-4" />
          <h3 className="text-lg font-bold text-zinc-100">قسم التقارير والتحليلات محمي</h3>
          <p className="text-sm text-zinc-500 mt-2 max-w-md leading-relaxed">
            غير مصرح لصلاحيات الموظف (Employee) بالاطلاع على التقارير أو كشوفات الأرباح والتحليلات التاريخية. يرجى مراجعة المسؤول.
          </p>
        </div>
      ) : (
        <ReportsView />
      )}
    </motion.div>
  );
}

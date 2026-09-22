import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Scissors, PenTool, Layers } from "lucide-react";

type EmployeeStat = {
  userId: string;
  fullName: string;
  role: string;
  design: { orders: number; avgRating: number | null };
  cutting: { orders: number; avgRating: number | null };
  assembly: { orders: number; avgRating: number | null };
};

function StarBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-zinc-600 text-xs">لا يوجد تقييم</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-400 text-sm font-bold">
      <Sparkles className="w-3.5 h-3.5 fill-amber-400" /> {value.toFixed(1)}
    </span>
  );
}

export default function EmployeeStatsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<EmployeeStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    fetch("/api/employees/stats")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل جلب إحصائيات الموظفين");
        setStats(data.employees || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> إحصائيات أداء الموظفين
              </h3>
              <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isLoading && <p className="text-center text-zinc-500 text-sm py-8">جارِ التحميل...</p>}
              {error && <p className="text-center text-rose-400 text-sm py-8">{error}</p>}
              {!isLoading && !error && stats && stats.length === 0 && (
                <p className="text-center text-zinc-500 text-sm py-8">لا يوجد عمال معيّنون على أي طلب بعد.</p>
              )}
              {!isLoading && !error && stats && stats.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                        <th className="text-right py-2 px-3">الموظف</th>
                        <th className="text-center py-2 px-3">
                          <span className="inline-flex items-center gap-1"><PenTool className="w-3.5 h-3.5" /> التصميم</span>
                        </th>
                        <th className="text-center py-2 px-3">
                          <span className="inline-flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> القص</span>
                        </th>
                        <th className="text-center py-2 px-3">
                          <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> التجميع</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((emp) => (
                        <tr key={emp.userId} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                          <td className="py-3 px-3 font-medium text-zinc-200">{emp.fullName}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="text-zinc-300">{emp.design.orders} طلب</div>
                            <StarBadge value={emp.design.avgRating} />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="text-zinc-300">{emp.cutting.orders} طلب</div>
                            <StarBadge value={emp.cutting.avgRating} />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="text-zinc-300">{emp.assembly.orders} طلب</div>
                            <StarBadge value={emp.assembly.avgRating} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

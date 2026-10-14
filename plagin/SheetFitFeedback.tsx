import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SheetFitFeedback = ({ utilization = 84.5, waste = 15.5, sheetsCount = 3 }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-right space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>تقرير مطابقة وكفاءة الألواح (Sheet Fit Feedback)</span>
        </h4>
        <span className="text-xs bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-500/20 font-mono">
          مطابق للمعايير المثلى
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-[11px] text-slate-400">نسبة استغلال الألواح</p>
            <p className="font-mono text-base font-bold text-emerald-400">{utilization}%</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-[11px] text-slate-400">نسبة الهدر المقدرة</p>
            <p className="font-mono text-base font-bold text-amber-400">{waste}%</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-cyan-400 shrink-0" />
          <div>
            <p className="text-[11px] text-slate-400">عدد الألواح المطلوبة</p>
            <p className="font-mono text-base font-bold text-cyan-400">{sheetsCount} ألواح</p>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Archive, Search, CheckCircle } from 'lucide-react';

export const OrdersArchive = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-right space-y-6" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Archive className="w-4 h-4 text-amber-400" />
          <span>أرشيف الطلبات والمشاريع المنفذة (Orders Archive)</span>
        </h3>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="بحث برقم الطلب أو اسم العميل..." className="bg-transparent focus:outline-none text-white text-xs" />
        </div>
      </div>

      <div className="space-y-3">
        {[
          { id: 'ORD-2026-001', client: 'شركة الإعمار الهندسية', material: 'أكريليك شفاف 5مم', date: '2026-09-28', status: 'منجز ومسلم' },
          { id: 'ORD-2026-002', client: 'استوديو التصميم الداخلي', material: 'خشب MDF 6مم', date: '2026-09-29', status: 'قيد القص' }
        ].map(order => (
          <div key={order.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400">{order.id}</span>
                <span className="text-white font-medium">{order.client}</span>
              </div>
              <p className="text-slate-400">المادة: {order.material} | التاريخ: {order.date}</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
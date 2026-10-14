import React from 'react';
import { Layers, X } from 'lucide-react';

export const BatchQuotationModal = ({ isOpen = true, onClose = () => {} }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-right" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>عروض أسعار الدفعات الجماعية (Batch Quotation)</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <p className="text-slate-400">حساب تكلفة الدفعات المجمعة لأوامر الإنتاج المتعددة في ورشة Axis Lab.</p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="flex justify-between">
              <span>إجمالي الطلبات في الدفعة:</span>
              <span className="text-amber-400">14 مشروع</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي الألواح المستهلكة:</span>
              <span className="text-cyan-400">9 ألواح</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white text-sm">
              <span>السعر الإجمالي بعد خصم الكميات:</span>
              <span className="text-emerald-400">3,420 ر.س</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
            إغلاق
          </button>
          <button onClick={() => { alert('تم اعتماد وتسعير الدفعة بنجاح!'); onClose(); }} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">
            اعتماد عرض سعر الدفعة
          </button>
        </div>
      </div>
    </div>
  );
};
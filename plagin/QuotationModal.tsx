import React from 'react';
import { FileText, X, Check } from 'lucide-react';

export const QuotationModal = ({ isOpen = true, onClose = () => {}, quotationData = { projectName: "مشروع قص ليزر", totalCost: 450, currency: "ر.س" } }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-right" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <span>إصدار عرض سعر رسمي - Axis Lab Pro</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">اسم المشروع:</span>
              <span className="font-bold text-white">{quotationData.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي التكلفة التقديرية:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{quotationData.totalCost} {quotationData.currency}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">ملاحظات العميل / الشروط:</label>
            <textarea 
              rows={3} 
              defaultValue="الأسعار تشمل خامات الأكريليك، القص بالليزر، والتسليم خلال يومين عمل."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition">
            إلغاء
          </button>
          <button onClick={() => { alert('تم حفظ وتصدير عرض السعر بنجاح!'); onClose(); }} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>تصدير عرض السعر (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
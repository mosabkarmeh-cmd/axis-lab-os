import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPanel = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-right" dir="rtl">
    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
      <Settings className="w-4 h-4 text-amber-400" />
      <span>إعدادات النظام والماكينات</span>
    </h3>
    <p className="text-xs text-slate-400">إعدادات طاقة الليزر، سرعات الحركة الافتراضية، ووحدات العملات.</p>
  </div>
);
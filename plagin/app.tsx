import React, { useState } from 'react';
import { NestingSimulator } from './components/NestingSimulator';
import { CamViewer3D } from './components/CamViewer3D';
import { MaterialManager } from './components/MaterialManager';
import { BatchManager } from './components/BatchManager';
import { SettingsPanel } from './components/SettingsPanel';
import { PricingDashboard } from './components/PricingDashboard';
import { Cpu, Box, Layers, Database, Settings, DollarSign } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'nesting' | 'viewer' | 'materials' | 'batch' | 'pricing' | 'settings'>('nesting');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6" dir="rtl">
      <header className="max-w-7xl mx-auto mb-8 pb-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-white">Axis Lab Pro</h1>
            <p className="text-xs text-slate-400">نظام إدارة الورشة الاحترافي وتحليل ملفات الـ CAM والتعشيش</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'nesting', label: 'التعشيش والألواح', icon: Box },
            { id: 'viewer', label: 'عارض الـ CAM', icon: Layers },
            { id: 'materials', label: 'المخزون والمواد', icon: Database },
            { id: 'batch', label: 'إدارة الدفعات', icon: Layers },
            { id: 'pricing', label: 'التسعير', icon: DollarSign },
            { id: 'settings', label: 'الإعدادات', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'nesting' && <NestingSimulator fileName="مشروع_اكريليك_احترافي.dxf" partW={600} partH={400} currency="ر.س" />}
        {activeTab === 'viewer' && <CamViewer3D />}
        {activeTab === 'materials' && <MaterialManager />}
        {activeTab === 'batch' && <BatchManager />}
        {activeTab === 'pricing' && <PricingDashboard />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}

export default App;
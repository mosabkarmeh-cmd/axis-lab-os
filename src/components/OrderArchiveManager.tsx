import React, { useState } from "react";
import { Order } from "../types";
import {
  Archive,
  ArchiveRestore,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Box,
  RotateCcw,
  Search,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrderArchiveManagerProps {
  orders: Order[];
  onRefreshOrders: () => void;
  orderTabFilter: "active" | "archived" | "all";
  setOrderTabFilter: (tab: "active" | "archived" | "all") => void;
  archiveDaysThreshold: number;
  setArchiveDaysThreshold: (days: number) => void;
  onRestoreOrder: (orderId: string) => Promise<void>;
  onArchiveOrder: (orderId: string) => Promise<void>;
  onRunAutoArchive: (days?: number) => Promise<void>;
}

export default function OrderArchiveManager({
  orders,
  onRefreshOrders,
  orderTabFilter,
  setOrderTabFilter,
  archiveDaysThreshold,
  setArchiveDaysThreshold,
  onRestoreOrder,
  onArchiveOrder,
  onRunAutoArchive,
}: OrderArchiveManagerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Compute stats
  const activeOrders = orders.filter((o) => !o.isArchived);
  const archivedOrders = orders.filter((o) => o.isArchived);

  // Calculate orders eligible for auto-archive (> threshold days and finished)
  const cutoffTime = Date.now() - archiveDaysThreshold * 24 * 60 * 60 * 1000;
  const eligibleForAutoArchive = activeOrders.filter((o) => {
    const isFinished =
      o.status === "delivered" || o.status === "ready" || (o as any).status === "completed";
    const createdTime = new Date(o.createdAt || Date.now()).getTime();
    return isFinished && createdTime < cutoffTime;
  });

  const handleTriggerAutoArchive = async () => {
    setIsProcessing(true);
    setNotificationMsg(null);
    try {
      await onRunAutoArchive(archiveDaysThreshold);
      setNotificationMsg(`تمت تشغيل الأرشفة التلقائية بنجاح!`);
      setTimeout(() => setNotificationMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setNotificationMsg("حدث خطأ أثناء تشغيل نظام الأرشفة التلقائية.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4 text-sans shadow-lg relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & System Indicator */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Archive className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 font-mono tracking-tight">
                نظام أرشفة الطلبات التلقائي (Auto-Archiving Engine)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                مفعّل ({archiveDaysThreshold} يوم)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              ينقل الطلبات المكتملة والمستلمة التي تجاوزت {archiveDaysThreshold} يوماً تلقائياً إلى الأرشيف لتخفيف واجهة الورشة وتسريع الأداء.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="تحديد مهلة الأرشفة التلقائية بالأيام"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>إعدادات المدة ({archiveDaysThreshold}d)</span>
          </button>

          <button
            onClick={handleTriggerAutoArchive}
            disabled={isProcessing}
            className={`px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 border border-amber-500 transition-all cursor-pointer shadow-md ${
              isProcessing ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-200" />
            )}
            <span>تشغيل الأرشفة التلقائية الآن</span>
            {eligibleForAutoArchive.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-900 text-amber-200 text-[10px] font-mono rounded-full font-bold">
                {eligibleForAutoArchive.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Threshold Config Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>مهلة نقل الطلبات المكتملة إلى الأرشيف:</span>
            </div>
            <div className="flex items-center gap-2">
              {[15, 30, 45, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setArchiveDaysThreshold(days);
                    setShowSettings(false);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all border ${
                    archiveDaysThreshold === days
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {days} يوم
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-950/90 border border-emerald-800/80 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Active Orders Card */}
        <div
          onClick={() => setOrderTabFilter("active")}
          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            orderTabFilter === "active"
              ? "bg-indigo-950/40 border-indigo-700/80 shadow-inner"
              : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase block mb-0.5">الطلبات النشطة (الورشة)</span>
            <div className="text-xl font-bold font-mono text-indigo-400">{activeOrders.length}</div>
            <span className="text-[10px] text-zinc-500 block mt-0.5">تظهر في جدول لوحة التحكم الرئيسية</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
            <Box className="w-4 h-4" />
          </div>
        </div>

        {/* Archived Orders Card */}
        <div
          onClick={() => setOrderTabFilter("archived")}
          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
            orderTabFilter === "archived"
              ? "bg-amber-950/40 border-amber-700/80 shadow-inner"
              : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-750"
          }`}
        >
          <div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase block mb-0.5">أرشيف الطلبات القديمة</span>
            <div className="text-xl font-bold font-mono text-amber-400">{archivedOrders.length}</div>
            <span className="text-[10px] text-amber-400/80 block mt-0.5 font-medium">مؤرشفة ومتاحة للاستعادة دائماً</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800/50 flex items-center justify-center text-amber-400">
            <Archive className="w-4 h-4" />
          </div>
        </div>

        {/* Auto Archive Candidates Card */}
        <div
          onClick={handleTriggerAutoArchive}
          className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:border-amber-700/50 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase block mb-0.5">طلبات مؤهلة للأرشفة (&gt; {archiveDaysThreshold}d)</span>
            <div className="text-xl font-bold font-mono text-emerald-400">{eligibleForAutoArchive.length}</div>
            <span className="text-[10px] text-zinc-500 block mt-0.5 group-hover:text-amber-400 transition-colors">
              {eligibleForAutoArchive.length > 0 ? "انقر لأرشفتها فورياً" : "لا توجد طلبات قديمة معلقة"}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400 group-hover:bg-amber-950 group-hover:text-amber-400 transition-all">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main View Filter Tabs */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setOrderTabFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              orderTabFilter === "active"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>⚡ الطلبات النشطة ({activeOrders.length})</span>
          </button>

          <button
            onClick={() => setOrderTabFilter("archived")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              orderTabFilter === "archived"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>📦 أرشيف الطلبات ({archivedOrders.length})</span>
          </button>

          <button
            onClick={() => setOrderTabFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              orderTabFilter === "all"
                ? "bg-zinc-750 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <span>📑 كل الطلبات ({orders.length})</span>
          </button>
        </div>

        {orderTabFilter === "archived" && (
          <span className="text-[11px] text-amber-400 font-medium font-mono hidden sm:inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            تصفح الطلبات المؤرشفة | يمكنك استعادة أي طلب بضغطة زر
          </span>
        )}
      </div>
    </div>
  );
}

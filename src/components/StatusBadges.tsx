import React from "react";
import { Activity, CheckCircle2, Clock, Coins, ShieldAlert, Sparkles, X } from "lucide-react";

export function getOrderStatusBadge(status: string) {
  switch (status) {
    case "new":
      return { icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />, text: "جديد", bg: "bg-indigo-950 text-indigo-400 border-indigo-900/30" };
    case "in_progress":
      return { icon: <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />, text: "قيد التنفيذ", bg: "bg-blue-950 text-blue-400 border-blue-900/30" };
    case "ready":
      return { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, text: "جاهز للتسليم", bg: "bg-emerald-950 text-emerald-400 border-emerald-900/30" };
    case "cancelled":
      return { icon: <X className="w-3.5 h-3.5 text-rose-400" />, text: "ملغي", bg: "bg-rose-950 text-rose-400 border-rose-900/30" };
    case "delivered":
      return { icon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />, text: "تم التسليم", bg: "bg-zinc-900 text-zinc-300 border-zinc-700/50" };
    default:
      return { icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />, text: status, bg: "bg-zinc-900 text-zinc-400 border-zinc-800" };
  }
}

export function getPaymentStatusBadge(paidAmount = 0, totalPrice = 0) {
  const remaining = Math.max(0, totalPrice - paidAmount);
  if (totalPrice > 0 && remaining <= 0.01) {
    return { status: "paid", text: "مسدد بالكامل (100%)", shortText: "مسدد 100%", bg: "bg-emerald-950/80 text-emerald-400 border-emerald-800/80", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> };
  }
  if (paidAmount > 0.01) {
    const pct = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 0;
    return { status: "partially_paid", text: `مدفوع جزئياً (${pct}% عربون)`, shortText: `عربون ${pct}%`, bg: "bg-amber-950/80 text-amber-300 border-amber-800/80", icon: <Coins className="w-3.5 h-3.5 text-amber-400" /> };
  }
  return { status: "unpaid", text: "غير مدفوع (0%)", shortText: "غير مدفوع ⚠️", bg: "bg-rose-950/80 text-rose-400 border-rose-800/80", icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> };
}

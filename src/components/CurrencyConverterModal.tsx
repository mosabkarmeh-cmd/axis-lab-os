import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Coins,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Check,
  Copy,
  DollarSign,
  RefreshCw,
  Clock,
  Sparkles,
  Calculator,
  Zap,
  Info,
  Share2,
  MessageSquare,
  Percent
} from "lucide-react";

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRate: number;
  onUpdateRate: (newRate: number) => void;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  isOpen,
  onClose,
  exchangeRate,
  onUpdateRate
}) => {
  const [rateInput, setRateInput] = useState<string>(exchangeRate.toString());
  const [usdVal, setUsdVal] = useState<string>("100");
  const [sypVal, setSypVal] = useState<string>(
    Math.round(100 * exchangeRate).toString()
  );
  
  const [copiedField, setCopiedField] = useState<"usd" | "syp" | "rate" | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<string>(() => {
    return localStorage.getItem("axislab_exchange_rate_updated_at") || "اليوم، " + new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  });

  // Sync rateInput when exchangeRate prop changes
  useEffect(() => {
    setRateInput(exchangeRate.toString());
    const usd = parseFloat(usdVal);
    if (!isNaN(usd)) {
      setSypVal(Math.round(usd * exchangeRate).toString());
    }
  }, [exchangeRate]);

  if (!isOpen) return null;

  const handleRateInputChange = (val: string) => {
    setRateInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onUpdateRate(num);
      saveUpdateTimestamp();
      
      // update SYP based on USD
      const usd = parseFloat(usdVal);
      if (!isNaN(usd)) {
        setSypVal(Math.round(usd * num).toString());
      }
    }
  };

  const saveUpdateTimestamp = () => {
    const timeStr = "اليوم، " + new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    setLastUpdateDate(timeStr);
    localStorage.setItem("axislab_exchange_rate_updated_at", timeStr);
  };

  const handleUsdChange = (val: string) => {
    setUsdVal(val);
    const usd = parseFloat(val);
    const currentRate = parseFloat(rateInput) || exchangeRate;
    if (!isNaN(usd) && currentRate > 0) {
      setSypVal(Math.round(usd * currentRate).toString());
    } else if (val === "") {
      setSypVal("");
    }
  };

  const handleSypChange = (val: string) => {
    // strip commas if user pasted
    const cleanVal = val.replace(/,/g, "");
    setSypVal(cleanVal);
    const syp = parseFloat(cleanVal);
    const currentRate = parseFloat(rateInput) || exchangeRate;
    if (!isNaN(syp) && currentRate > 0) {
      setUsdVal((syp / currentRate).toFixed(2));
    } else if (cleanVal === "") {
      setUsdVal("");
    }
  };

  const handleQuickRateAdjust = (delta: number) => {
    const current = parseFloat(rateInput) || exchangeRate;
    const nextRate = Math.max(100, current + delta);
    handleRateInputChange(nextRate.toString());
  };

  const handlePresetRate = (preset: number) => {
    handleRateInputChange(preset.toString());
  };

  const handlePresetUsd = (amount: number) => {
    handleUsdChange(amount.toString());
  };

  const handlePresetSyp = (amount: number) => {
    handleSypChange(amount.toString());
  };

  const copyToClipboard = (text: string, field: "usd" | "syp" | "rate") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const formatNumberWithCommas = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return valStr;
    return num.toLocaleString("en-US");
  };

  const currentRateNum = parseFloat(rateInput) || exchangeRate;

  // Preset market exchange rates (الليرة السورية الجديدة - حذف صفرين)
  const marketPresets = [133, 135, 138, 140, 142, 145, 150, 155];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-zinc-950 border border-[#c59257]/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800/80 flex items-center justify-between text-right" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c59257]/15 border border-[#c59257]/30 flex items-center justify-center text-[#c59257] shadow-inner">
                <Coins className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-sans flex items-center gap-2">
                  <span>نظام تحويل العملات وإدارة سعر الصرف</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c59257]/20 border border-[#c59257]/40 text-[#c59257] font-mono font-bold">
                    سعر السوق
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  تحويل فورس ومزدوج بين الدولار الأمريكي ($) والليرة السورية (ل.س) مع تعديل سعر الصرف
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-6 text-right max-h-[80vh] overflow-y-auto" dir="rtl">

            {/* 1. Market Rate Settings Banner */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-900/50 border border-amber-900/30 rounded-xl p-4 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-24 h-24 bg-[#c59257]/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-sans">
                  <TrendingUp className="w-4 h-4" />
                  <span>تحديد سعر صرف الدولار المعتمد في النظام</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-sans">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>آخر تحديث: {lastUpdateDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7 space-y-1.5">
                  <label className="text-[11px] text-zinc-300 font-bold block font-sans">
                    سعر السوق الحقيقي (ليرة سورية لكل 1 دولار):
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={rateInput}
                      onChange={(e) => handleRateInputChange(e.target.value)}
                      placeholder="أدخل سعر الصرف..."
                      className="w-full bg-zinc-950 border border-[#c59257]/50 rounded-xl py-2.5 px-3 pl-28 text-base font-mono font-bold text-[#c59257] text-left focus:border-[#c59257] focus:ring-1 focus:ring-[#c59257] focus:outline-none shadow-inner"
                    />
                    <div className="absolute left-2 flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[#c59257] font-sans">
                        ل.س / $
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-5 flex flex-col justify-end space-y-1.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">
                    تعديل سريع للسعر (+ / -):
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickRateAdjust(-5)}
                      className="py-1.5 px-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-rose-400 hover:text-rose-300 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRateAdjust(-1)}
                      className="py-1.5 px-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-rose-400 hover:text-rose-300 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRateAdjust(1)}
                      className="py-1.5 px-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRateAdjust(5)}
                      className="py-1.5 px-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>

              {/* Market presets */}
              <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-bold ml-1 font-sans">
                  أسعار السوق المتداولة:
                </span>
                {marketPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetRate(preset)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                      currentRateNum === preset
                        ? "bg-[#c59257]/20 border-[#c59257] text-[#c59257] font-bold shadow"
                        : "bg-zinc-950 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {preset.toLocaleString()} ل.س
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Interactive Bidirectional Converter */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 relative">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#c59257]" />
                  <h4 className="text-sm font-bold text-zinc-200 font-sans">
                    محول العملات المباشر (اتجاهين)
                  </h4>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  1 USD = {currentRateNum.toLocaleString()} SYP
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                {/* USD Input Card */}
                <div className="md:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 relative group focus-within:border-emerald-500/60 transition-all">
                  <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 font-sans">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      القيمة بالدولار الأمريكي ($)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(usdVal, "usd")}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900 transition-all cursor-pointer"
                      title="نسخ المبلغ بالدولار"
                    >
                      {copiedField === "usd" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={usdVal}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-xl font-mono font-bold text-emerald-400 pl-8 pr-2 py-1 text-left focus:outline-none"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-zinc-500">
                      $
                    </span>
                  </div>

                  {/* USD Preset Pills */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-900">
                    {[1, 5, 10, 50, 100, 250, 500, 1000].map((presetUsd) => (
                      <button
                        key={presetUsd}
                        type="button"
                        onClick={() => handlePresetUsd(presetUsd)}
                        className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-800 cursor-pointer transition-all"
                      >
                        ${presetUsd}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switch / Converter Arrow Icon */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-zinc-950 border border-[#c59257]/40 text-[#c59257] flex items-center justify-center shadow-md">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                </div>

                {/* SYP Input Card */}
                <div className="md:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 relative group focus-within:border-[#c59257]/60 transition-all">
                  <div className="flex justify-between items-center text-[11px] font-bold text-zinc-400 font-sans">
                    <span className="text-[#c59257] flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      المكافئ بالليرة السورية (ل.س)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sypVal, "syp")}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900 transition-all cursor-pointer"
                      title="نسخ المبلغ بالليرة"
                    >
                      {copiedField === "syp" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberWithCommas(sypVal)}
                      onChange={(e) => handleSypChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-xl font-mono font-bold text-[#c59257] pl-10 pr-2 py-1 text-left focus:outline-none"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-sans font-bold text-zinc-500">
                      ل.س
                    </span>
                  </div>

                  {/* SYP Preset Pills */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-900">
                    {[
                      { label: "100 ألف", val: 100000 },
                      { label: "500 ألف", val: 500000 },
                      { label: "1 مليون", val: 1000000 },
                      { label: "5 مليون", val: 5000000 },
                      { label: "10 مليون", val: 10000000 }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => handlePresetSyp(item.val)}
                        className="px-1.5 py-0.5 text-[9px] font-sans rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[#c59257] border border-zinc-800 cursor-pointer transition-all"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversion Math Summary Box */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs text-zinc-300 gap-2 font-sans">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c59257] shrink-0" />
                  <span>
                    النتيجة الحسابية:{" "}
                    <strong className="text-emerald-400 font-mono">${usdVal || "0"}</strong>{" "}
                    تساوي{" "}
                    <strong className="text-[#c59257] font-mono">
                      {formatNumberWithCommas(sypVal || "0")} ل.س
                    </strong>
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {usdVal || "0"} × {currentRateNum.toLocaleString()} = {formatNumberWithCommas(sypVal || "0")}
                </div>
              </div>
            </div>

            {/* 3. Quick Matrix table for reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400 font-sans">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Zap className="w-3.5 h-3.5 text-[#c59257]" />
                  جدول المرجعية السريعة للأسعار الشائعة
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  سعر الصرف: {currentRateNum.toLocaleString()} ل.س/$
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 5, 10, 20, 50, 100, 500, 1000].map((usd) => {
                  const syp = Math.round(usd * currentRateNum);
                  return (
                    <div
                      key={usd}
                      onClick={() => handlePresetUsd(usd)}
                      className="bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/80 hover:border-[#c59257]/40 p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        ${usd}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#c59257]">
                        {syp.toLocaleString()} ل.س
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Notice and Info */}
            <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed font-sans">
              <Info className="w-4 h-4 text-[#c59257] shrink-0 mt-0.5" />
              <div>
                <strong>تطبيق التغييرات تلقائياً:</strong> عند إدخال أو اختيار سعر صرف جديد في هذا النظام، يتم تحديث كافة المعاينات والتقارير المالية وفواتير الطلبات وحسابات تكاليف خامات الأكريليك والأخشاب فورياً عبر جميع شاشات AXIS LAB.
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-900/80 border-t border-zinc-800/80 flex items-center justify-between text-right" dir="rtl">
            <span className="text-[11px] text-zinc-400 font-sans">
              يتم حفظ سعر الصرف المعتمد تلقائياً في ذاكرة النظام المحلية.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#c59257] hover:bg-[#b07d44] text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-[#c59257]/10 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد السعر وإغلاق المحول</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CurrencyConverterModal;

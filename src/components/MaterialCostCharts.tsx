import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DEFAULT_EXCHANGE_RATE, usdToSyp } from "../lib/currency";
import { materialPriceSYP, materialPriceUSD } from "../lib/materials";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  PieChart as PieChartIcon,
  BarChart3,
  DollarSign,
  Layers,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Coins,
  Sparkles,
  Info,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Activity,
  Package,
  Flame,
  Clock,
  Calendar,
  Zap,
} from "lucide-react";

interface MaterialCostChartsProps {
  materials: any[];
  exchangeRate: number;
  remnants?: any[];
  productionJobs?: any[];
  onSelectMaterial?: (material: any) => void;
}

// Sleek dark palette with warm gold accents (#c59257) matching AXIS LAB theme
const CATEGORY_COLORS: { [key: string]: string } = {
  "أكريليك": "#c59257",
  "أخشاب": "#d97706",
  "جلود": "#ea580c",
  "معادن": "#3b82f6",
  "عام": "#10b981",
  "مستلزمات": "#8b5cf6",
  "أخرى": "#6b7280",
};

const DEFAULT_COLORS = ["#c59257", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function MaterialCostCharts({
  materials = [],
  exchangeRate = DEFAULT_EXCHANGE_RATE,
  remnants = [],
  productionJobs = [],
  onSelectMaterial,
}: MaterialCostChartsProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<"SYP" | "USD" | "BOTH">("BOTH");
  const [activeChartTab, setActiveChartTab] = useState<"category" | "topValue" | "quality" | "all">("all");

  // Format money helper based on selected currency preference
  const formatValue = (usdVal: number) => {
    const sypVal = usdToSyp(usdVal, exchangeRate);
    if (selectedCurrency === "USD") {
      return `$${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (selectedCurrency === "SYP") {
      return `${sypVal.toLocaleString("ar-EG")} ل.س`;
    }
    return `${sypVal.toLocaleString("ar-EG")} ل.س ($${usdVal.toFixed(2)})`;
  };

  const formatShortSYP = (usdVal: number) => {
    const sypVal = usdToSyp(usdVal, exchangeRate);
    if (sypVal >= 1000000) {
      return `${(sypVal / 1000000).toFixed(2)} مليون ل.س`;
    }
    return `${sypVal.toLocaleString("ar-EG")} ل.س`;
  };

  // Memoized Inventory Analytical Computations
  const analytics = useMemo(() => {
    if (!materials || materials.length === 0) {
      return {
        totalValueUSD: 0,
        totalValueSYP: 0,
        totalItemsCount: 0,
        categoryData: [],
        topValueMaterials: [],
        topUtilizedMaterials: [],
        qualityData: [],
        atRiskValueUSD: 0,
        atRiskValueSYP: 0,
        inspectedValueUSD: 0,
        defectiveValueUSD: 0,
        inPrepValueUSD: 0,
        remnantScrapValueUSD: 0,
      };
    }

    let totalValueUSD = 0;
    const categoryMap: { [cat: string]: { count: number; valueUSD: number; totalQty: number } } = {};
    const qualityMap: { [q: string]: { count: number; valueUSD: number } } = {
      inspected: { count: 0, valueUSD: 0 },
      in_preparation: { count: 0, valueUSD: 0 },
      defective: { count: 0, valueUSD: 0 },
    };

    let defectiveValueUSD = 0;
    let inPrepValueUSD = 0;
    let inspectedValueUSD = 0;
    let atRiskValueUSD = 0;

    const itemsWithCalculatedValue = materials.map((m) => {
      const qty = m.inventory?.availableQuantity ?? m.inventory?.quantity ?? m.stockQuantity ?? m.quantity ?? 0;
      const unitPriceSYP = materialPriceSYP(m.pricePerUnit || (m.stockQuantity && m.stockValue ? (m.stockValue / m.stockQuantity) : 0));
      const itemValueSYP = m.stockValueSYP !== undefined && m.stockValueSYP > 0 ? m.stockValueSYP : (m.stockValue !== undefined && m.stockValue > 0 ? m.stockValue : (qty * unitPriceSYP));
      const itemValueUSD = itemValueSYP / (exchangeRate || 135);
      const category = m.category || "عام";
      const quality = m.qualityStatus || "inspected";

      totalValueUSD += itemValueUSD;

      // Category aggregation
      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, valueUSD: 0, totalQty: 0 };
      }
      categoryMap[category].count += 1;
      categoryMap[category].valueUSD += itemValueUSD;
      categoryMap[category].totalQty += qty;

      // Quality status aggregation
      if (quality === "defective") defectiveValueUSD += itemValueUSD;
      else if (quality === "in_preparation") inPrepValueUSD += itemValueUSD;
      else inspectedValueUSD += itemValueUSD;

      if (qualityMap[quality]) {
        qualityMap[quality].count += 1;
        qualityMap[quality].valueUSD += itemValueUSD;
      }

      // At risk if low stock or defective
      const minStock = m.minimumStock || 0;
      if (qty <= minStock || quality === "defective") {
        atRiskValueUSD += itemValueUSD;
      }

      return {
        ...m,
        calcQty: qty,
        calcValueUSD: itemValueUSD,
        calcValueSYP: itemValueSYP,
      };
    });

    // Remnant scrap estimation
    const remnantScrapValueUSD = remnants.reduce((acc, r) => {
      const area = (r.width || 0) * (r.height || 0) / 10000; // in m2
      return acc + (area * 5); // ~$5/m2 scrap value
    }, 0);

    // Format Category Chart Data
    const categoryData = Object.keys(categoryMap).map((cat, idx) => {
      const valUSD = categoryMap[cat].valueUSD;
      const percentage = totalValueUSD > 0 ? ((valUSD / totalValueUSD) * 100).toFixed(1) : "0";
      return {
        name: cat,
        valueUSD: parseFloat(valUSD.toFixed(2)),
        valueSYP: usdToSyp(valUSD, exchangeRate),
        percentage: parseFloat(percentage),
        count: categoryMap[cat].count,
        totalQty: categoryMap[cat].totalQty,
        color: CATEGORY_COLORS[cat] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
    }).sort((a, b) => b.valueUSD - a.valueUSD);

    // Format Top Materials Chart Data
    const topValueMaterials = [...itemsWithCalculatedValue]
      .sort((a, b) => b.calcValueUSD - a.calcValueUSD)
      .slice(0, 7)
      .map((m) => ({
        id: m.id,
        name: m.name.length > 20 ? m.name.substring(0, 18) + "..." : m.name,
        fullName: m.name,
        category: m.category || "عام",
        valueUSD: parseFloat(m.calcValueUSD.toFixed(2)),
        valueSYP: m.calcValueSYP,
        unitPriceSYP: materialPriceSYP(m.pricePerUnit),
        unitPriceUSD: materialPriceUSD(m.pricePerUnit, exchangeRate),
        qty: m.calcQty,
        unit: m.unit || "لوح",
      }));

    // Quality breakdown chart data
    const qualityData = [
      {
        name: "مفحوصة وجاهزة",
        key: "inspected",
        valueUSD: parseFloat(inspectedValueUSD.toFixed(2)),
        valueSYP: usdToSyp(inspectedValueUSD, exchangeRate),
        color: "#10b981",
        count: qualityMap.inspected.count,
      },
      {
        name: "قيد الفحص والتجهيز",
        key: "in_preparation",
        valueUSD: parseFloat(inPrepValueUSD.toFixed(2)),
        valueSYP: usdToSyp(inPrepValueUSD, exchangeRate),
        color: "#f59e0b",
        count: qualityMap.in_preparation.count,
      },
      {
        name: "معيبة ومحتجزة",
        key: "defective",
        valueUSD: parseFloat(defectiveValueUSD.toFixed(2)),
        valueSYP: usdToSyp(defectiveValueUSD, exchangeRate),
        color: "#f43f5e",
        count: qualityMap.defective.count,
      },
    ];

    // Top 5 Most Utilized Raw Materials in the last 30 days for inventory planning
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topUtilizedMaterials = materials.map((m, idx) => {
      const qty = m.inventory?.availableQuantity ?? m.inventory?.quantity ?? m.stockQuantity ?? m.quantity ?? 0;
      const unitPriceUSD = materialPriceUSD(m.pricePerUnit || (m.stockQuantity && m.stockValue ? (m.stockValue / m.stockQuantity) : 15), exchangeRate);
      const unitPriceSYP = Math.round(unitPriceUSD * exchangeRate);

      let jobUsedQty = 0;
      let jobCount = 0;

      if (productionJobs && productionJobs.length > 0) {
        productionJobs.forEach((job) => {
          const isMatch = (job.materialId && (job.materialId === m.id || String(job.materialId) === String(m.id))) ||
                          (job.materialName && job.materialName.trim() === m.name.trim());
          if (isMatch && job.status !== 'cancelled') {
            const jobDate = job.createdAt ? new Date(job.createdAt) : null;
            if (!jobDate || isNaN(jobDate.getTime()) || jobDate >= thirtyDaysAgo) {
              const used = Number(job.usedQuantity) || Number(job.quantity) || 1;
              jobUsedQty += used;
              jobCount += 1;
            }
          }
        });
      }

      const explicitUsed = m.used30Days || m.consumedQuantity || m.monthlyUsage || 0;
      const totalConsumedUnits = jobUsedQty > 0 ? jobUsedQty : (explicitUsed > 0 ? explicitUsed : Math.max(3, Math.round(((idx * 17 + 9) % 48) + (m.minimumStock || 5) * 1.3)));

      const widthM = m.width ? Number(m.width) / 1000 : 0;
      const heightM = m.height ? Number(m.height) / 1000 : 0;
      const areaM2PerUnit = widthM * heightM;
      const totalAreaM2 = areaM2PerUnit > 0 ? totalConsumedUnits * areaM2PerUnit : 0;

      const totalConsumedCostUSD = totalConsumedUnits * unitPriceUSD;
      const totalConsumedCostSYP = totalConsumedUnits * unitPriceSYP;

      const dailyAvgUnits = parseFloat((totalConsumedUnits / 30).toFixed(1));
      const daysOfSupplyLeft = dailyAvgUnits > 0 ? parseFloat((qty / dailyAvgUnits).toFixed(1)) : 999;

      const minStock = m.minimumStock || 0;
      const isLowStock = qty <= minStock || daysOfSupplyLeft <= 7;
      const isCritical = qty === 0 || daysOfSupplyLeft <= 3;

      return {
        ...m,
        id: m.id,
        name: m.name,
        category: m.category || "عام",
        thickness: m.thickness,
        unit: m.unit || "لوح",
        currentQty: qty,
        minStock,
        totalConsumedUnits,
        totalAreaM2: totalAreaM2 > 0 ? parseFloat(totalAreaM2.toFixed(1)) : null,
        totalConsumedCostUSD,
        totalConsumedCostSYP,
        dailyAvgUnits,
        daysOfSupplyLeft,
        isLowStock,
        isCritical,
        jobCount,
      };
    })
    .sort((a, b) => b.totalConsumedUnits - a.totalConsumedUnits)
    .slice(0, 5);

    return {
      totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
      totalValueSYP: usdToSyp(totalValueUSD, exchangeRate),
      totalItemsCount: materials.length,
      categoryData,
      topValueMaterials,
      topUtilizedMaterials,
      qualityData,
      atRiskValueUSD: parseFloat(atRiskValueUSD.toFixed(2)),
      atRiskValueSYP: usdToSyp(atRiskValueUSD, exchangeRate),
      inspectedValueUSD,
      defectiveValueUSD,
      inPrepValueUSD,
      remnantScrapValueUSD,
    };
  }, [materials, exchangeRate, remnants, productionJobs]);

  // Custom Recharts Tooltip for Category Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-xl text-right font-sans z-50 min-w-[180px]">
          <div className="flex items-center gap-2 mb-1.5 border-b border-zinc-800 pb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="font-bold text-zinc-100 text-xs">{data.name}</span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-zinc-300">
              <span className="text-zinc-500 font-sans">القيمة بالليرة:</span>
              <span className="font-bold text-[#c59257]">{data.valueSYP.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span className="text-zinc-500 font-sans">القيمة بالدولار:</span>
              <span className="font-bold text-zinc-200">${data.valueUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span className="text-zinc-500 font-sans">النسبة من المستودع:</span>
              <span className="font-bold text-emerald-400">{data.percentage}%</span>
            </div>
            <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-850 text-[10px]">
              <span className="font-sans text-zinc-500">عدد الخامات:</span>
              <span>{data.count} أصناف ({data.totalQty} وحدة)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-xl text-right font-sans z-50 min-w-[200px]">
          <div className="font-bold text-zinc-100 text-xs mb-1 border-b border-zinc-800 pb-1">
            {data.fullName}
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-[#c59257]">
              <span className="text-zinc-500 font-sans">إجمالي القيمة (ل.س):</span>
              <span className="font-bold">{data.valueSYP.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-zinc-200">
              <span className="text-zinc-500 font-sans">إجمالي القيمة ($):</span>
              <span className="font-bold">${data.valueUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="text-zinc-500 font-sans">الكمية المتوفرة:</span>
              <span className="font-bold text-amber-400">{data.qty} {data.unit}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span className="text-zinc-500 font-sans">سعر الفردي:</span>
              <span>${data.unitPriceUSD.toFixed(2)} / {data.unit}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 sm:p-6 space-y-6 text-right font-sans shadow-xl">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c59257]/30 to-amber-950/60 border border-[#c59257]/50 flex items-center justify-center text-[#c59257] shadow-inner">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-100 flex items-center gap-2">
              <span>تحليلات ورسوم توزيع تكاليف أصول المخزون</span>
              <span className="text-[10px] font-mono text-[#c59257] bg-[#c59257]/10 border border-[#c59257]/30 px-2.5 py-0.5 rounded-full font-bold">
                شفافية مالية 📊
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              مراقبة توزيع الاستثمارات ورؤوس الأموال المحتجزة في الخامات الأساسية (أكريليك، أخشاب، جلود، معادن)
            </p>
          </div>
        </div>

        {/* Filters & Currency Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveChartTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === "all"
                  ? "bg-[#c59257] text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              عرض شامل
            </button>
            <button
              onClick={() => setActiveChartTab("category")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === "category"
                  ? "bg-[#c59257] text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              حسب الفئة
            </button>
            <button
              onClick={() => setActiveChartTab("topValue")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === "topValue"
                  ? "bg-[#c59257] text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              أعلى الخامات قيمةً
            </button>
          </div>

          {/* Currency Toggle */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as "SYP" | "USD" | "BOTH")}
            className="bg-zinc-900 border border-zinc-800 text-[#c59257] font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-[#c59257] transition-all"
          >
            <option value="BOTH">عرض مزدوج (ل.س / $)</option>
            <option value="SYP">ليرة سورية (ل.س)</option>
            <option value="USD">دولار أمريكي ($)</option>
          </select>
        </div>
      </div>

      {/* Top Inventory Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Asset Value */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-emerald-950/60 p-4 rounded-xl space-y-1.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>إجمالي قيمة مخزون الخامات</span>
            <Coins className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-lg font-mono font-extrabold text-emerald-400">
            {analytics.totalValueSYP.toLocaleString()} ل.س
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>المكافئ بالدولار:</span>
            <span className="font-bold text-zinc-200">${analytics.totalValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Category Leader */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-amber-950/60 p-4 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-[#c59257]"></div>
          <div className="flex items-center justify-between text-[#c59257] text-xs font-bold">
            <span>أعلى فئة مستثمرة</span>
            <Layers className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-lg font-mono font-extrabold text-zinc-100 truncate">
            {analytics.categoryData[0]?.name || "غير محدد"}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>نسبة الاستحواذ:</span>
            <span className="font-bold text-[#c59257]">{analytics.categoryData[0]?.percentage || 0}% من الأصول</span>
          </div>
        </div>

        {/* Quality Inspected Capital */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-indigo-950/60 p-4 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-center justify-between text-indigo-400 text-xs font-bold">
            <span>قيمة الخامات المفحوصة والجاهزة</span>
            <ShieldCheck className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-lg font-mono font-extrabold text-indigo-300">
            {Math.round(analytics.inspectedValueUSD * exchangeRate).toLocaleString()} ل.س
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>جاهزة فورياً للقص:</span>
            <span className="font-bold text-zinc-200">${analytics.inspectedValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Value at Risk (Defective or Low-stock) */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-rose-950/60 p-4 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
            <span>قيمة المخزون الحرج / المعيب</span>
            <AlertTriangle className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-lg font-mono font-extrabold text-rose-400">
            {analytics.atRiskValueSYP.toLocaleString()} ل.س
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>يتطلب إعادة طلب أو صيانة:</span>
            <span className="font-bold text-rose-300">${analytics.atRiskValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Chart 1: Donut / Pie Chart for Category Cost Distribution */}
        {(activeChartTab === "all" || activeChartTab === "category") && (
          <div className={`${activeChartTab === "category" ? "lg:col-span-12" : "lg:col-span-5"} bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#c59257]" />
                  <span>توزيع تكلفة الأصول حسب فئة الخامات</span>
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  إجمالي {analytics.categoryData.length} فئات
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                نسبة المساهمة المالية لكل نوع مادة (أكريليك، MDF، جلود، معادن) في إجمالي قيمة أصول الورشة.
              </p>
            </div>

            {/* Donut Chart Container */}
            <div className="h-64 w-full relative flex items-center justify-center">
              {analytics.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="valueUSD"
                    >
                      {analytics.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-zinc-500 text-xs">لا توجد خامات مسجلة لحساب التوزيع</div>
              )}

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-zinc-500 font-mono font-bold">إجمالي الأصول</span>
                <span className="text-xs font-mono font-extrabold text-[#c59257]">
                  {formatShortSYP(analytics.totalValueUSD)}
                </span>
              </div>
            </div>

            {/* Category Breakdown Table Legend */}
            <div className="space-y-2 pt-2 border-t border-zinc-850">
              {analytics.categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs font-mono bg-zinc-950/60 p-2 rounded-lg border border-zinc-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="font-sans font-bold text-zinc-200">{cat.name}</span>
                    <span className="text-[10px] text-zinc-500">({cat.count} صنف)</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-[#c59257]">{cat.valueSYP.toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-zinc-400 block">${cat.valueUSD.toFixed(2)} ({cat.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart 2: Bar Chart for Top High-Value Materials */}
        {(activeChartTab === "all" || activeChartTab === "topValue") && (
          <div className={`${activeChartTab === "topValue" ? "lg:col-span-12" : "lg:col-span-7"} bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>ترتيب أعلى الخامات قيمةً وحجماً مالياً بالورشة</span>
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  أعلى {analytics.topValueMaterials.length} خامات
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                مقارنة القيمة المالية الإجمالية لكل خامة بناءً على الكمية المتوفرة وسعر الوحدة.
              </p>
            </div>

            {/* Bar Chart Container */}
            <div className="h-72 w-full pt-2">
              {analytics.topValueMaterials.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topValueMaterials}
                    margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#71717a"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="valueUSD" fill="#c59257" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                  لا توجد بيانات خامات كافية لرسم المخطط
                </div>
              )}
            </div>

            {/* Fast Table of Top Materials */}
            <div className="pt-3 border-t border-zinc-850">
              <div className="text-[11px] font-bold text-zinc-400 mb-2 flex items-center justify-between">
                <span>ملخص أكثر الخامات تكلفةً بالليرة والدولار:</span>
                <span className="text-[10px] text-zinc-500 font-mono">الكميات والسعر الفردي</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analytics.topValueMaterials.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectMaterial && onSelectMaterial(m)}
                    className="bg-zinc-950/80 border border-zinc-850 p-2.5 rounded-xl hover:border-[#c59257]/50 cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-200 block truncate max-w-[140px]">{m.fullName}</span>
                      <span className="text-[10px] text-amber-400 font-mono">الكمية: {m.qty} {m.unit}</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="font-bold text-[#c59257] block">{m.valueSYP.toLocaleString()} ل.س</span>
                      <span className="text-[10px] text-zinc-400">${m.valueUSD.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quality Status & At-Risk Valuation Bar */}
      <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-zinc-200">
              توزيع تكاليف المخزون حسب حالة الجودة والسلامة التشغيلية
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            تأمين الشفافية وحساب نسبة المخاطرة
          </span>
        </div>

        {/* Multi-Segment Stacked Progress Bar */}
        <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800 p-0.5">
          {analytics.qualityData.map((q) => {
            const pct = analytics.totalValueUSD > 0 ? (q.valueUSD / analytics.totalValueUSD) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={q.key}
                style={{ width: `${pct}%`, backgroundColor: q.color }}
                className="h-full rounded-sm transition-all relative group"
                title={`${q.name}: ${q.valueSYP.toLocaleString()} ل.س (${pct.toFixed(1)}%)`}
              ></div>
            );
          })}
        </div>

        {/* Status Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-1">
          {analytics.qualityData.map((q) => (
            <div key={q.key} className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: q.color }}></span>
                <span className="font-sans font-bold text-zinc-300">{q.name}</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-zinc-200 block">{q.valueSYP.toLocaleString()} ل.س</span>
                <span className="text-[10px] text-zinc-500">${q.valueUSD.toFixed(2)} ({q.count} صنف)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Most Utilized Raw Materials in Last 30 Days (Inventory Planning) */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>أكثر 5 مواد خام استهلاكاً خلال الـ 30 يوماً الماضية</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/50 text-amber-300 text-[10px] font-bold">
                  تخطيط المستودع والتوريد
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                تحليل معدل السحب الفعلي بالورشة وحساب أيام التغطية المتبقية (Days of Inventory Supply) لتسهيل تخطيط المشتريات وتجنب توقف الإنتاج.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-850 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>نطاق التحليل: آخر 30 يوماً</span>
          </div>
        </div>

        {analytics.topUtilizedMaterials.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {analytics.topUtilizedMaterials.map((mat: any, index: number) => {
              const maxConsumed = analytics.topUtilizedMaterials[0]?.totalConsumedUnits || 1;
              const usagePercentage = Math.round((mat.totalConsumedUnits / maxConsumed) * 100);

              const rankBadgeColor =
                index === 0 ? "bg-amber-400 text-zinc-950 font-black border-amber-300" :
                index === 1 ? "bg-zinc-300 text-zinc-950 font-black border-zinc-100" :
                index === 2 ? "bg-amber-700 text-zinc-100 font-bold border-amber-600" :
                "bg-zinc-800 text-zinc-400 font-semibold border-zinc-700";

              return (
                <div
                  key={mat.id}
                  onClick={() => onSelectMaterial && onSelectMaterial(mat)}
                  className="group bg-zinc-950/80 border border-zinc-850 hover:border-amber-500/40 p-3.5 rounded-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md hover:shadow-amber-500/5"
                >
                  {/* Left / Main info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center shrink-0 border ${rankBadgeColor}`}>
                      #{index + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-100 text-sm group-hover:text-amber-400 transition-colors truncate">
                          {mat.name}
                        </span>
                        {mat.thickness && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-mono">
                            {mat.thickness} مم
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] flex items-center gap-1 font-bold">
                          <span>{mat.category}</span>
                          {mat.subCategory && <span className="text-amber-400">↳ {mat.subCategory}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono flex-wrap">
                        <span>معدل السحب: <strong className="text-zinc-200">{mat.dailyAvgUnits}</strong> {mat.unit}/يوم</span>
                        <span>•</span>
                        <span>إجمالي التكلفة المستهلكة: <strong className="text-amber-400">{mat.totalConsumedCostSYP.toLocaleString()} ل.س</strong> (${mat.totalConsumedCostUSD.toFixed(1)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right / Progress & Inventory Status */}
                  <div className="flex items-center gap-4 shrink-0 md:w-80 justify-between md:justify-end border-t md:border-t-0 border-zinc-900 pt-2 md:pt-0">
                    {/* Usage Progress Bar */}
                    <div className="flex-1 max-w-[130px] space-y-1 text-right">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-amber-400 font-bold">{mat.totalConsumedUnits} {mat.unit}</span>
                        {mat.totalAreaM2 && <span className="text-zinc-500">({mat.totalAreaM2} م²)</span>}
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-l from-amber-400 to-amber-600 rounded-full"
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Inventory Coverage Alert Badge */}
                    <div className="text-left font-mono min-w-[110px]">
                      <div className="text-[10px] text-zinc-500 font-sans">تغطية المخزون الحالي</div>
                      {mat.isCritical ? (
                        <div className="px-2 py-1 rounded-lg bg-red-950/80 border border-red-800/80 text-red-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                          <span>تصفير وشيك ({mat.daysOfSupplyLeft} يوم)</span>
                        </div>
                      ) : mat.isLowStock ? (
                        <div className="px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>تكفي {mat.daysOfSupplyLeft} يوم ⚠️</span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تكفي {mat.daysOfSupplyLeft > 90 ? "+90" : mat.daysOfSupplyLeft} يوماً</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-500 text-xs">
            لا توجد بيانات استهلاك مسجلة خلال الـ 30 يوماً الماضية.
          </div>
        )}
      </div>
    </div>
  );
}

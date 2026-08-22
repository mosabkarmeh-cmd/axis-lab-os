import React, { useState, useEffect, useRef } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine
} from "recharts";
import { 
  BarChart2, 
  Coins, 
  TrendingUp, 
  TrendingDown,
  Sparkles, 
  Calendar, 
  ArrowUpRight, 
  Activity, 
  Info, 
  Layers, 
  GitCommit,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp as TrendingUpIcon,
  ChevronLeft
} from "lucide-react";

interface DashboardChartsProps {
  chartData: any[];
  exchangeRate: number;
  updateRate: (rate: number) => void;
  onOpenCurrencyModal?: () => void;
  theme?: string;
  fastLocalDashboardTrends?: any;
  fastLocalInventoryPredictions?: any[];
  fastLocalProductionScheduling?: any;
}

export default function DashboardCharts({
  chartData,
  exchangeRate,
  updateRate,
  onOpenCurrencyModal,
  theme = "dark",
  fastLocalDashboardTrends,
  fastLocalInventoryPredictions,
  fastLocalProductionScheduling,
}: DashboardChartsProps) {
  const [calcUsd, setCalcUsd] = useState<string>("100");
  const [calcSyp, setCalcSyp] = useState<string>(() => {
    return Math.round(100 * exchangeRate).toString();
  });

  const [rateDraft, setRateDraft] = useState<string>(exchangeRate.toString());
  const committedRateRef = useRef<string>(exchangeRate.toString());
  const [activeMetric, setActiveMetric] = useState<"combined" | "revenue" | "orders">("combined");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");

  // Keep the editable rate and calculator synchronized with the committed server rate.
  useEffect(() => {
    const nextRate = exchangeRate.toString();
    committedRateRef.current = nextRate;
    setRateDraft(nextRate);
    const numUsd = parseFloat(calcUsd);
    if (!isNaN(numUsd)) {
      setCalcSyp(Math.round(numUsd * exchangeRate).toString());
    }
  }, [exchangeRate]);

  const handleUsdChange = (val: string) => {
    setCalcUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setCalcSyp(Math.round(num * exchangeRate).toString());
    } else {
      setCalcSyp("");
    }
  };

  const handleSypChange = (val: string) => {
    setCalcSyp(val);
    const num = parseFloat(val);
    if (!isNaN(num) && exchangeRate > 0) {
      setCalcUsd((num / exchangeRate).toFixed(2));
    } else {
      setCalcUsd("");
    }
  };

  const handleRateDraftChange = (value: string) => {
    const committed = committedRateRef.current;
    let nextValue = value;
    if (committed && value.startsWith(committed) && value.length > committed.length) {
      const suffix = value.slice(committed.length);
      const suffixNumber = Number(suffix);
      if (/^\d+(?:\.\d+)?$/.test(suffix) && Number.isFinite(suffixNumber) && suffixNumber >= 100) {
        nextValue = suffix;
      }
    }
    setRateDraft(nextValue);
  };

  const commitRateDraft = () => {
    const nextRate = Number(rateDraft);
    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      setRateDraft(committedRateRef.current);
      return;
    }
    const normalized = String(nextRate);
    committedRateRef.current = normalized;
    setRateDraft(normalized);
    updateRate(nextRate);
  };

  const handleQuickRateUpdate = (rate: number) => {
    committedRateRef.current = String(rate);
    setRateDraft(String(rate));
    updateRate(rate);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* Performance Trends Chart Card */}
      <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 text-right relative overflow-hidden">
        {/* Glow backdrop decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c59257]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          
          {/* Header Row */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60 font-sans">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-900/30">
                  <BarChart2 className="w-4 h-4 text-[#c59257]" />
                </span>
                <h3 className="text-sm font-black text-zinc-100">
                  مركز تحليل الأداء والتدفقات المالية
                </h3>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                تتبع الإنتاجية المالية وحجم الطلبيات عبر الأيام مع دعم التبديل التفاعلي للمخطط.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Chart Type Selector */}
              <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850/60 items-center">
                <button
                  onClick={() => setChartType("area")}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    chartType === "area"
                      ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/25"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  منحنى 📈
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    chartType === "bar"
                      ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/25"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  أعمدة 📊
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    chartType === "line"
                      ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/25"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  خطي 📉
                </button>
              </div>

              {/* Metric Toggle Buttons */}
              <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850/60 items-center">
                <button
                  onClick={() => setActiveMetric("combined")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    activeMetric === "combined"
                      ? "bg-[#c59257] text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  مدمج
                </button>
                <button
                  onClick={() => setActiveMetric("revenue")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    activeMetric === "revenue"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  إيرادات
                </button>
                <button
                  onClick={() => setActiveMetric("orders")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    activeMetric === "orders"
                      ? "bg-amber-600 text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  طلبات
                </button>
              </div>
            </div>
          </div>

          {/* Interactive KPI Micro-Widgets Banner */}
          {(() => {
            const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
            const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
            const peakRevenueDay = [...chartData].sort((a, b) => b.revenue - a.revenue)[0];
            const avgDailyRevenue = totalRevenue / (chartData.length || 1);

            return (
              <div className="grid grid-cols-3 gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/80 text-right">
                <div className="border-l border-zinc-800/40 pl-2">
                  <span className="text-[9px] text-zinc-500 block">قمة المبيعات الأسبوعية</span>
                  <span className="text-[11px] font-black text-[#c59257] block truncate">
                    {peakRevenueDay ? `${peakRevenueDay.day} (${Math.round(peakRevenueDay.revenue).toLocaleString()} ل.س)` : "---"}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-sans block">اليوم الأكثر إنتاجاً</span>
                </div>
                
                <div className="border-l border-zinc-800/40 pl-2">
                  <span className="text-[9px] text-zinc-500 block">المعدل اليومي للقص</span>
                  <span className="text-[11px] font-black text-emerald-400 block font-mono">
                    {Math.round(avgDailyRevenue).toLocaleString()} ل.س
                  </span>
                  <span className="text-[8px] text-zinc-400 block font-mono">
                    ≈ ${(avgDailyRevenue / exchangeRate).toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-zinc-500 block">مجموع التدفقات</span>
                  <span className="text-[11px] font-black text-indigo-400 block font-mono">
                    {Math.round(totalRevenue).toLocaleString()} ل.س
                  </span>
                  <span className="text-[8.5px] text-zinc-400 block font-sans">
                    {totalOrders} طلبيات مسجلة
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Chart Wrapper with Click Interaction */}
          <div className="h-64 w-full pt-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
                const avgDailyRevenue = totalRevenue / (chartData.length || 1);

                // Common props for charts
                const commonChartProps = {
                  data: chartData,
                  margin: { top: 10, right: 10, left: -10, bottom: 0 },
                  onClick: (nextState: any) => {
                    if (nextState && typeof nextState.activeTooltipIndex === "number") {
                      setSelectedDayIndex(nextState.activeTooltipIndex);
                    }
                  }
                };

                const renderDefs = () => (
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c59257" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#c59257" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                );

                const renderGrid = () => (
                  <CartesianGrid 
                    strokeDasharray="4 4" 
                    stroke={theme === "light" ? "#e2e8f0" : "#141417"} 
                    vertical={false}
                  />
                );

                const renderXAxis = () => (
                  <XAxis 
                    dataKey="day" 
                    stroke={theme === "light" ? "#64748b" : "#52525b"}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                );

                const renderLeftYAxis = () => {
                  const isRevenueActive = activeMetric === "combined" || activeMetric === "revenue";
                  const strokeColor = isRevenueActive ? "#10b981" : "#c59257";
                  const formatter = isRevenueActive ? (val: any) => `${Math.round(Number(val)).toLocaleString()} ل.س` : (val: any) => `${val} ط`;
                  return (
                    <YAxis 
                      yAxisId="left"
                      stroke={strokeColor}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatter}
                    />
                  );
                };

                const renderRightYAxis = () => {
                  if (activeMetric !== "combined") return null;
                  return (
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#c59257"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value} ط`}
                    />
                  );
                };

                const renderReferenceLines = () => {
                  if (activeMetric === "combined" || activeMetric === "revenue") {
                    return (
                      <ReferenceLine 
                        yAxisId="left" 
                        y={avgDailyRevenue} 
                        stroke="#10b981" 
                        strokeDasharray="4 4" 
                        strokeWidth={1}
                        label={{ 
                          value: `متوسط المبيعات (${Math.round(avgDailyRevenue).toLocaleString()} ل.س)`, 
                          fill: "#10b981", 
                          fontSize: 8, 
                          position: "insideBottomLeft",
                          dy: -5
                        }} 
                      />
                    );
                  }
                  return null;
                };

                const renderTooltip = () => (
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const ordersList = data.orderDetails || [];
                        return (
                          <div className={`p-4 border rounded-2xl shadow-2xl text-right space-y-3 w-[320px] backdrop-blur-md ${
                            theme === "light" 
                              ? "bg-white/95 border-slate-200 text-slate-800" 
                              : "bg-zinc-950/95 border-zinc-850/90 text-zinc-100"
                          }`}>
                            <div className="flex justify-between items-center border-b pb-2 border-zinc-800/40">
                              <span className="text-[9.5px] text-zinc-500 font-mono">{data.date}</span>
                              <span className="font-bold text-xs text-[#c59257]">{data.day}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                              <div>
                                <span className="text-zinc-500 block text-[9px]">حجم المبيعات</span>
                                <span className="font-mono font-bold text-indigo-400">{data.orders} طلبات</span>
                              </div>
                              <div className="text-left">
                                <span className="text-zinc-500 block text-[9px] text-right">إجمالي الإيرادات</span>
                                <span className="font-mono font-bold text-emerald-400 block">
                                  {Math.round(data.revenue).toLocaleString()} ل.س
                                </span>
                                <span className="text-[9.5px] text-zinc-500 block font-mono">
                                  ≈ ${(data.revenue / exchangeRate).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold text-[#c59257] border-r-2 border-[#c59257] pr-1.5 leading-none">
                                ملخص الطلبيات السريعة:
                              </h4>
                              {ordersList.length === 0 ? (
                                <p className="text-[10px] text-zinc-500 text-center py-1">لا توجد طلبات لهذا اليوم</p>
                              ) : (
                                <div className="text-[9.5px] text-zinc-400 space-y-0.5 max-h-24 overflow-y-auto">
                                  {ordersList.slice(0, 3).map((ord: any, oIdx: number) => (
                                    <div key={oIdx} className="flex justify-between items-center gap-1">
                                      <span className="font-mono text-zinc-500">{Math.round(ord.totalPrice).toLocaleString()} ل.س</span>
                                      <span className="truncate max-w-[150px]">{ord.customerName} ({ord.orderNumber})</span>
                                    </div>
                                  ))}
                                  {ordersList.length > 3 && (
                                    <p className="text-[9px] text-indigo-400 text-center pt-1 font-bold">
                                      + بالإضافة إلى {ordersList.length - 3} طلبات أخرى (انقر للتفاصيل)
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                );

                const renderLegend = () => (
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className={`text-[10px] ${theme === "light" ? "text-slate-600" : "text-zinc-400"}`}>
                        {value === "revenue" ? "الإيرادات المالية المباشرة ($)" : "عدد الطلبات المستلمة"}
                      </span>
                    )}
                  />
                );

                if (chartType === "bar") {
                  return (
                    <BarChart {...commonChartProps}>
                      {renderGrid()}
                      {renderXAxis()}
                      {renderLeftYAxis()}
                      {renderRightYAxis()}
                      {renderTooltip()}
                      {renderLegend()}
                      {renderReferenceLines()}
                      
                      {(activeMetric === "combined" || activeMetric === "revenue") && (
                        <Bar 
                          yAxisId="left"
                          dataKey="revenue" 
                          name="revenue"
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]}
                        />
                      )}

                      {activeMetric === "combined" && (
                        <Bar 
                          yAxisId="right"
                          dataKey="orders" 
                          name="orders"
                          fill="#c59257" 
                          radius={[4, 4, 0, 0]}
                        />
                      )}

                      {activeMetric === "orders" && (
                        <Bar 
                          yAxisId="left"
                          dataKey="orders" 
                          name="orders"
                          fill="#c59257" 
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  );
                }

                if (chartType === "line") {
                  return (
                    <LineChart {...commonChartProps}>
                      {renderGrid()}
                      {renderXAxis()}
                      {renderLeftYAxis()}
                      {renderRightYAxis()}
                      {renderTooltip()}
                      {renderLegend()}
                      {renderReferenceLines()}
                      
                      {(activeMetric === "combined" || activeMetric === "revenue") && (
                        <Line 
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue" 
                          name="revenue"
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
                          activeDot={{ r: 6 }}
                        />
                      )}

                      {activeMetric === "combined" && (
                        <Line 
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders" 
                          name="orders"
                          stroke="#c59257" 
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 0, fill: "#c59257" }}
                          activeDot={{ r: 6 }}
                        />
                      )}

                      {activeMetric === "orders" && (
                        <Line 
                          yAxisId="left"
                          type="monotone"
                          dataKey="orders" 
                          name="orders"
                          stroke="#c59257" 
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 0, fill: "#c59257" }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                    </LineChart>
                  );
                }

                // Default: Area Chart
                return (
                  <AreaChart {...commonChartProps}>
                    {renderDefs()}
                    {renderGrid()}
                    {renderXAxis()}
                    {renderLeftYAxis()}
                    {renderRightYAxis()}
                    {renderTooltip()}
                    {renderLegend()}
                    {renderReferenceLines()}
                    
                    {(activeMetric === "combined" || activeMetric === "revenue") && (
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="revenue" 
                        name="revenue"
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    )}

                    {activeMetric === "combined" && (
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="orders" 
                        name="orders"
                        stroke="#c59257" 
                        strokeWidth={2.5}
                        activeDot={{ r: 6, strokeWidth: 0, fill: "#c59257" }}
                        fillOpacity={1} 
                        fill="url(#colorOrders)" 
                      />
                    )}

                    {activeMetric === "orders" && (
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="orders" 
                        name="orders"
                        stroke="#c59257" 
                        strokeWidth={2.5}
                        activeDot={{ r: 6, strokeWidth: 0, fill: "#c59257" }}
                        fillOpacity={1} 
                        fill="url(#colorOrders)" 
                      />
                    )}
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>

          {/* Interactive Day Button Row Selector */}
          <div className="flex flex-row-reverse items-center justify-start gap-1.5 overflow-x-auto py-2.5 pt-3 border-t border-zinc-850/60 scrollbar-thin">
            <span className="text-[10px] text-zinc-500 font-sans ml-1.5 shrink-0">اختر اليوم:</span>
            {chartData.map((d, idx) => (
              <button
                key={d.day + idx}
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  selectedDayIndex === idx
                    ? "bg-[#c59257] text-zinc-950 font-black shadow-md shadow-amber-600/15"
                    : "bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border border-zinc-850/80"
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>

          {/* Detailed Selected Day Inspector Section */}
          {(() => {
            const selectedDay = chartData[selectedDayIndex];
            if (!selectedDay) return null;
            const ordersList = selectedDay.orderDetails || [];
            
            // Calculate some analytics
            const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
            const avgDailyRevenue = totalRevenue / (chartData.length || 1);
            const deviationPct = avgDailyRevenue > 0 
              ? ((selectedDay.revenue - avgDailyRevenue) / avgDailyRevenue) * 100 
              : 0;

            const isAboveAverage = deviationPct >= 0;

            // Status counts for selected day
            const statusCounts = ordersList.reduce((acc: any, o: any) => {
              const displayStatus = o.status === "delivered" || o.status === "تم التسليم" ? "تم التسليم" : 
                                   o.status === "ready" || o.status === "جاهز للتسليم" ? "جاهز للتسليم" : 
                                   o.status === "in_progress" || o.status === "قيد الإنتاج" ? "قيد الإنتاج" : "جديد";
              acc[displayStatus] = (acc[displayStatus] || 0) + 1;
              return acc;
            }, {});

            return (
              <div className="bg-zinc-950/60 border border-zinc-850/60 p-4 rounded-xl space-y-3.5 mt-1 text-right relative overflow-hidden">
                {/* Background soft glow based on performance */}
                <div className={`absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20 ${
                  isAboveAverage ? "bg-emerald-500" : "bg-amber-500"
                }`} />

                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isAboveAverage ? "bg-emerald-400" : "bg-amber-400"
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        isAboveAverage ? "bg-emerald-500" : "bg-amber-500"
                      }`} />
                    </span>
                    <h4 className="text-xs font-black text-zinc-100 font-sans">
                      تقرير الأداء التفصيلي لـ {selectedDay.day}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">({selectedDay.date})</span>
                  </div>

                  {/* Growth Badge relative to Average */}
                  {avgDailyRevenue > 0 && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isAboveAverage 
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" 
                        : "bg-rose-950/40 text-rose-400 border border-rose-900/50"
                    }`}>
                      {isAboveAverage ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {isAboveAverage ? "+" : ""}
                        {deviationPct.toFixed(0)}% مقارنة بالمتوسط اليومي
                      </span>
                    </div>
                  )}
                </div>

                {/* Day stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
                  <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-850/30">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">إيراد اليوم</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs block">
                      ${selectedDay.revenue.toFixed(1)}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono block">
                      {Math.round(selectedDay.revenue * exchangeRate).toLocaleString()} ل.س
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-850/30">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">الطلبات الكلية</span>
                    <span className="font-bold text-indigo-400 text-xs block">
                      {selectedDay.orders} طلبات
                    </span>
                    <span className="text-[8px] text-zinc-500 block">منها {statusCounts["تم التسليم"] || 0} مكتمل</span>
                  </div>

                  <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-850/30">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">قيد العمل</span>
                    <span className="font-bold text-blue-400 text-xs block">
                      {(statusCounts["قيد الإنتاج"] || 0) + (statusCounts["جاهز للتسليم"] || 0)} إنتاج
                    </span>
                    <span className="text-[8px] text-zinc-500 block">جاهز للتسليم: {statusCounts["جاهز للتسليم"] || 0}</span>
                  </div>

                  <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-850/30">
                    <span className="text-[9px] text-zinc-500 block mb-0.5">معدل قيمة الطلب</span>
                    <span className="font-mono font-bold text-amber-400 text-xs block">
                      ${selectedDay.orders > 0 ? (selectedDay.revenue / selectedDay.orders).toFixed(1) : "0"}
                    </span>
                    <span className="text-[8px] text-zinc-500 block">للقص أو الحفر بالليزر</span>
                  </div>
                </div>

                {ordersList.length === 0 ? (
                  <p className="text-center py-4 text-xs text-zinc-600 font-sans">
                    لا توجد طلبيات مسجلة في هذا اليوم. يمكنك الضغط على أيام أخرى لمعاينتها.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-400 font-bold block">سجل طلبيات اليوم:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {ordersList.map((ord: any, idx: number) => {
                        const isDelivered = ord.status === "تم التسليم" || ord.status === "delivered";
                        const isReady = ord.status === "جاهز للتسليم" || ord.status === "ready";
                        const isInProgress = ord.status === "قيد الإنتاج" || ord.status === "in_progress";
                        const displayStatus = ord.status === "delivered" ? "تم التسليم" : ord.status === "ready" ? "جاهز للتسليم" : ord.status === "new" ? "جديد" : ord.status === "in_progress" ? "قيد الإنتاج" : ord.status;

                        return (
                          <div 
                            key={ord.orderNumber + idx}
                            className="bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-850/40 p-2 rounded-lg flex flex-col justify-between space-y-1 transition-all"
                          >
                            <div className="flex justify-between items-center gap-1.5">
                              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                                ${ord.totalPrice.toFixed(0)}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-200 font-medium text-[10.5px] truncate max-w-[100px]">{ord.customerName}</span>
                                <span className="font-mono text-[8px] text-[#c59257] bg-amber-950/25 border border-amber-900/40 px-1 py-0.5 rounded">
                                  {ord.orderNumber}
                                </span>
                              </div>
                            </div>

                            <p className="text-[9.5px] text-zinc-500 truncate text-right">
                              {ord.itemsSummary}
                            </p>

                            <div className="flex justify-between items-center text-[8.5px] border-t border-zinc-900/40 pt-1">
                              <span className="font-mono text-zinc-500">
                                {Math.round(Number(ord.totalPrice || 0)).toLocaleString()} ل.س
                              </span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] ${
                                isDelivered 
                                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-950" 
                                  : isReady
                                  ? "bg-amber-950/40 text-amber-400 border border-amber-950"
                                  : isInProgress
                                  ? "bg-blue-950/40 text-blue-400 border border-blue-950"
                                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                              }`}>
                                {displayStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* Side Column: Workshop Assistant + Currency Converter (Stacked on Left) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* ⚡ FAST LOCAL AI PREDICTIVE HUD */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-xl flex flex-col justify-between space-y-4 text-right font-sans">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
              <span className="text-[9px] text-[#c59257]/80 font-mono">Offline Heuristics</span>
              <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#c59257] animate-pulse" />
                <span>مساعد ورشة ليزر CO2 الذكي</span>
              </h3>
            </div>

            {/* Financial Trends / Anomaly Section */}
            {fastLocalDashboardTrends ? (
              <div className="space-y-2.5">
                <span className="text-[10px] text-zinc-500 font-bold block">📊 تحليلات ومؤشرات الإنتاجية والمالية:</span>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-850/40">
                    <span className="text-zinc-500 block mb-0.5">اتجاه الإيرادات</span>
                    <span className="font-bold text-emerald-400 font-mono">{fastLocalDashboardTrends.incomeTrend}</span>
                  </div>
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-850/40">
                    <span className="text-zinc-500 block mb-0.5">معدل كفاءة القص</span>
                    <span className="font-bold text-indigo-400 font-mono">{fastLocalDashboardTrends.efficiencyRate}</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-zinc-950/40 border border-[#c59257]/10 text-[10px] space-y-1">
                  <span className="text-[#c59257] font-semibold block">🏆 المنتج الأعلى مبيعاً وجدوى:</span>
                  <p className="text-zinc-300 leading-tight">{fastLocalDashboardTrends.bestSellerProduct}</p>
                </div>

                {fastLocalDashboardTrends.expenseAnomaly && (
                  <div className="p-2 rounded bg-amber-950/10 border border-amber-900/30 text-[9px] text-amber-300 flex items-start gap-1">
                    <span>⚠️</span>
                    <p className="leading-tight">{fastLocalDashboardTrends.expenseAnomaly}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-[11px] text-zinc-600 font-light">جاري تحميل المؤشرات والتحليلات...</div>
            )}

            {/* Inventory Depletion Predictions Section */}
            {fastLocalInventoryPredictions && fastLocalInventoryPredictions.length > 0 && (
              <div className="space-y-2 border-t border-zinc-800/60 pt-2.5">
                <span className="text-[10px] text-zinc-500 font-bold block">⏳ توقعات ذكية لنفاد الخامات (المخزن):</span>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-0.5 scrollbar-thin">
                  {fastLocalInventoryPredictions.slice(0, 3).map((pred, pIdx) => (
                    <div key={pIdx} className="p-1.5 rounded bg-zinc-950/30 border border-zinc-900 flex flex-col gap-0.5 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500 font-mono">متوفر: {pred.currentQty} ألواح</span>
                        <span className="font-bold text-zinc-300">{pred.materialName}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 justify-end">
                        <p className={`text-[8px] leading-tight ${pred.status === 'danger' ? 'text-rose-400 font-bold' : pred.status === 'warning' ? 'text-amber-400' : 'text-zinc-400'}`}>
                          {pred.message}
                        </p>
                        <span className={`w-1 h-1 rounded-full shrink-0 ${pred.status === 'danger' ? 'bg-rose-500 animate-pulse' : pred.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Machine Scheduling Optimization */}
            {fastLocalProductionScheduling && (
              <div className="space-y-1.5 border-t border-zinc-800/60 pt-2.5 text-[9px]">
                <span className="text-[10px] text-zinc-500 font-bold block">💡 الترتيب الذكي المقترح لطابور العمل:</span>
                <div className="p-2 rounded bg-indigo-950/10 border border-indigo-900/20 text-zinc-300 leading-tight flex items-start gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                  <p className="text-[8px] text-zinc-400">{fastLocalProductionScheduling.adviceMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Currency Converter */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 p-5 rounded-xl flex flex-col justify-between space-y-4 text-right">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3 font-sans">
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#c59257]" />
                محول العملات الذكي ولوحة الصرف
              </h3>
              {onOpenCurrencyModal && (
                <button
                  type="button"
                  onClick={onOpenCurrencyModal}
                  className="px-2 py-0.5 bg-[#c59257]/15 hover:bg-[#c59257]/30 border border-[#c59257]/40 text-[#c59257] text-[9px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                  title="فتح المحول المتقدم والموسع"
                >
                  <span>شاشة موسعة 💱</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mb-4 font-sans leading-relaxed text-right">
              حساب أسعار المواد وعقود القص بالدولار ($) والليرة السورية (ل.س) فورياً بناءً على سعر الصرف المحدد في النظام.
            </p>

            <div className="space-y-3 text-right">
              {/* Exchange Rate Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block font-sans">
                  سعر صرف الدولار الحالي مقابل الليرة السورية:
                </label>
                <div className="relative">
                  <input
                      type="number"
                      value={rateDraft}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => handleRateDraftChange(e.target.value)}
                      onBlur={commitRateDraft}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRateDraft();
                        }
                      }}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-xs font-mono font-bold text-[#c59257] pl-16 text-left focus:border-[#c59257]/50 focus:outline-none font-sans"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-950/40 text-[#c59257] border border-amber-900/20 font-sans">
                    ل.س / دولار
                  </span>
                </div>
              </div>

              {/* Quick adjustment buttons (الليرة السورية الجديدة) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1" dir="rtl">
                <button
                  onClick={() => handleQuickRateUpdate(133)}
                  className="px-2 py-1 text-[9px] font-mono rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all shrink-0 cursor-pointer"
                >
                  133 ل.س
                </button>
                <button
                  onClick={() => handleQuickRateUpdate(135)}
                  className="px-2 py-1 text-[9px] font-mono rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all shrink-0 cursor-pointer"
                >
                  135 ل.س
                </button>
                <button
                  onClick={() => handleQuickRateUpdate(145)}
                  className="px-2 py-1 text-[9px] font-mono rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all shrink-0 cursor-pointer"
                >
                  145 ل.س
                </button>
              </div>

              <div className="h-[1px] bg-zinc-800/40 my-2"></div>

              {/* Currency conversion fields */}
              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block font-mono">
                    دولار ($)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={calcUsd}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-xs font-mono font-bold text-emerald-400 pl-6 text-left focus:border-emerald-500/50 focus:outline-none"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 font-bold">
                      $
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block font-sans">
                    ليرة (ل.س)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={calcSyp}
                      onChange={(e) => handleSypChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2 text-xs font-mono font-bold text-[#c59257] pl-8 text-left focus:border-[#c59257]/50 focus:outline-none"
                    />
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-sans text-zinc-500 font-bold">
                      ل.س
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informative Rate Panel */}
          <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-lg space-y-1.5 mt-auto">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider block font-sans text-center">
              معدل التحويل التلقائي المطبق بالنظام
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-zinc-400 pt-1" dir="rtl">
              <span className="font-bold text-emerald-400">1.00 USD</span>
              <span className="text-zinc-600">⇌</span>
              <span className="font-bold text-[#c59257]">{exchangeRate.toLocaleString()} SYP</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

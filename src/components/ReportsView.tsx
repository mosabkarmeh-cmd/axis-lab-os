import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Printer, 
  Download, 
  Percent, 
  Cpu, 
  Layers, 
  Activity, 
  FileText, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  ArrowUpRight, 
  BarChart2,
  RefreshCw
} from "lucide-react";
import MaterialCostCharts from "./MaterialCostCharts";
import { DEFAULT_EXCHANGE_RATE, fetchExchangeRate, sanitizeExchangeRate, usdToSyp } from "../lib/currency";

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<"financial" | "sales" | "inventory" | "machines">("financial");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all"); // all, month, year
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch report analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/analytics");
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load reports analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const [exchangeRate, setExchangeRate] = useState<number>(() => sanitizeExchangeRate(localStorage.getItem("axislab_exchange_rate"), DEFAULT_EXCHANGE_RATE));

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate).catch(() => {});
    const handleRateChange = (event: Event) => setExchangeRate(sanitizeExchangeRate((event as CustomEvent<number>).detail));
    window.addEventListener("axislab:exchange-rate-changed", handleRateChange);
    return () => window.removeEventListener("axislab:exchange-rate-changed", handleRateChange);
  }, []);

  // Format Helper - Primary in SYP (Syrian Pounds)
  const formatMoney = (val: number, includeUSD = true) => {
    const syp = usdToSyp(val, exchangeRate).toLocaleString("en-US") + " ل.س";
    if (!includeUSD) return syp;
    const usd = "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${syp} (${usd})`;
  };

  // CSV Exporter helper
  const exportToCSV = (data: any[], fileName: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-24">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-sm font-sans">جاري سحب البيانات ومزامنة التقارير الذكية...</span>
      </div>
    );
  }

  const COLORS = ["#c59257", "#f43f5e", "#10b981", "#f59e0b", "#a855f7", "#6b7280"];

  return (
    <div className="space-y-6 text-right font-sans max-w-7xl mx-auto pb-12 print:bg-white print:text-black">
      
      {/* Upper Navigation and Print Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-850 pb-4 gap-4 print:hidden">
        
        {/* Actions Button */}
        <div className="flex gap-2 order-2 md:order-1 w-full md:w-auto">
          <button
            onClick={fetchAnalytics}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer"
          >
            <Printer className="w-4 h-4 text-zinc-400" />
            <span>طباعة التقرير الحالي</span>
          </button>
          <button
            onClick={() => {
              if (activeTab === "financial") {
                window.open("/api/export/profit/pdf", "_blank");
              } else if (activeTab === "sales") {
                window.open("/api/export/sales/excel", "_blank");
              } else if (activeTab === "inventory") {
                window.open("/api/export/inventory/excel", "_blank");
              } else {
                exportToCSV(analytics.machines, "machines_utilization");
              }
            }}
            className="px-4 py-2 bg-[#c59257]/20 border border-[#c59257]/40 hover:bg-[#c59257]/30 text-zinc-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#c59257]" />
            <span>تصدير تقرير {activeTab === "financial" ? "الأرباح (PDF)" : activeTab === "sales" ? "المبيعات (Excel)" : activeTab === "inventory" ? "المخزون (Excel)" : "الآلات (CSV)"}</span>
          </button>
        </div>

        {/* Title */}
        <div className="order-1 md:order-2">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 justify-end">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            <span>مركز التقارير المتقدم والتحليلات البيانية</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">تقارير فورية وديناميكية لأداء الورشة الإنتاجي والمالي والمخزني</p>
        </div>
      </div>

      {/* KPI Cards section (Hides during printing of clean tables if needed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        
        {/* KPI 1 */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col justify-between min-h-[110px] print:border-black print:bg-white print:text-black">
          <div className="flex justify-between items-start">
            <span className="p-2 bg-indigo-950/20 text-indigo-400 border border-indigo-900/30 rounded-xl print:hidden">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">صافي هامش الربح</span>
              <strong className="text-xl font-mono text-zinc-100 print:text-black">
                {analytics.financial.profitMargin.toFixed(1)}%
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 justify-end">
            <span>معدل الأرباح التشغيلية المحققة</span>
            <Percent className="w-3 h-3 text-emerald-500" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col justify-between min-h-[110px] print:border-black print:bg-white print:text-black">
          <div className="flex justify-between items-start">
            <span className="p-2 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-xl print:hidden">
              <DollarSign className="w-4 h-4" />
            </span>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">صافي التدفق المالي</span>
              <strong className={`text-xl font-mono ${analytics.financial.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} print:text-black`}>
                {formatMoney(analytics.financial.netProfit)}
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 justify-end">
            <span>الأرباح بعد خصم المصروفات الإدارية</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col justify-between min-h-[110px] print:border-black print:bg-white print:text-black">
          <div className="flex justify-between items-start">
            <span className="p-2 bg-amber-950/20 text-amber-400 border border-amber-900/30 rounded-xl print:hidden">
              <Layers className="w-4 h-4" />
            </span>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">المخزون تحت حد الأمان</span>
              <strong className={`text-xl font-mono ${analytics.inventory.lowStockCount > 0 ? "text-amber-500 font-black" : "text-zinc-100"} print:text-black`}>
                {analytics.inventory.lowStockCount} مادة
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 justify-end">
            <span>تتطلب توريد مستعجل من الموردين</span>
            {analytics.inventory.lowStockCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden flex flex-col justify-between min-h-[110px] print:border-black print:bg-white print:text-black">
          <div className="flex justify-between items-start">
            <span className="p-2 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded-xl print:hidden">
              <Users className="w-4 h-4" />
            </span>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">إجمالي المبيعات النشطة</span>
              <strong className="text-xl font-mono text-zinc-100 print:text-black">
                {analytics.sales.totalOrdersCount} طلبات
              </strong>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 justify-end">
            <span>بمعدل قيمة {formatMoney(analytics.sales.avgOrderValue)} للطلب</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        </div>

      </div>

      {/* Tabs Controller */}
      <div className="flex flex-wrap gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-850 print:hidden">
        <button
          onClick={() => setActiveTab("machines")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "machines" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-center">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>تقرير الإنتاج والآلات</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "inventory" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-center">
            <Layers className="w-3.5 h-3.5 text-pink-400" />
            <span>جرد المستودعات والمواد</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "sales" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-center">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>المبيعات والعملاء الأكثر طلباً</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("financial")}
          className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "financial" ? "bg-zinc-900 text-zinc-100 border border-zinc-800" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-center">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>التقرير المالي التدقيقي</span>
          </div>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      <div className="space-y-6">
        
        {/* Tab 1: FINANCIALS */}
        {activeTab === "financial" && (
          <motion.div
            key="financial"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Charts & Graphs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
              
              {/* Left Column: Financial table */}
              <div className="lg:col-span-8 bg-zinc-950 border border-zinc-850 rounded-2xl p-5 print:bg-white print:text-black print:border-black">
                <div className="flex justify-between items-center mb-4">
                  <div className="relative w-64 print:hidden">
                    <input
                      type="text"
                      placeholder="ابحث بالبيان أو رقم القيد..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg py-1.5 pr-8 pl-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-600 font-sans text-right"
                    />
                    <Search className="w-3.5 h-3.5 text-zinc-600 absolute top-2.5 right-2.5" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-300 print:text-black print:text-sm">سجل الحركة المالية للدفاتر المحاسبية</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs print:text-[10px]">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold print:border-black print:bg-gray-100 print:text-black">
                        <th className="p-3">حالة القيد</th>
                        <th className="p-3">القيمة المالية</th>
                        <th className="p-3">التاريخ والوقت</th>
                        <th className="p-3">البيان والشرح التفصيلي</th>
                        <th className="p-3">الرقم المرجعي</th>
                        <th className="p-3">نوع الحركة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40 print:divide-gray-300">
                      {analytics.financial.recentTransactions
                        .filter((tx: any) => tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || tx.reference.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((tx: any) => {
                          const isInvoice = tx.type === "invoice";
                          return (
                            <tr key={`${tx.type}-${tx.id}`} className="hover:bg-zinc-900/20 transition-all font-sans print:hover:bg-transparent">
                              <td className="p-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                                  isInvoice ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/20" : "bg-rose-950/30 text-rose-400 border-rose-900/20"
                                } print:text-black print:bg-transparent`}>
                                  {isInvoice ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                                  <span>{tx.status}</span>
                                </span>
                              </td>
                              <td className={`p-3 font-mono font-bold ${isInvoice ? "text-emerald-400" : "text-rose-400"} print:text-black`}>
                                {isInvoice ? "+" : "-"}{formatMoney(tx.amount)}
                              </td>
                              <td className="p-3 text-zinc-400 font-mono print:text-black">
                                {new Date(tx.date).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="p-3 text-zinc-300 font-sans print:text-black max-w-[240px] truncate" title={tx.description}>
                                {tx.description}
                              </td>
                              <td className="p-3 text-zinc-500 font-mono font-bold print:text-black">
                                {tx.reference}
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] font-bold ${isInvoice ? "text-emerald-400" : "text-rose-400"}`}>
                                  {isInvoice ? "مبيعات محصلة" : "مصروفات تشغيل"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Expense breakdown chart */}
              <div className="lg:col-span-4 bg-zinc-950 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between print:hidden">
                <h4 className="text-xs font-bold text-zinc-300 mb-4 block">هيكل النفقات الجارية والمصاريف</h4>
                
                <div className="h-56 w-full flex items-center justify-center">
                  {analytics.financial.expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.financial.expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analytics.financial.expenseBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", color: "#f4f4f5" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-zinc-600 text-xs">لا تتوفر حركة للمصاريف حالياً</div>
                  )}
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pt-3 border-t border-zinc-900 text-xs text-zinc-400">
                  {analytics.financial.expenseBreakdown.map((item: any, i: number) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <span className="font-mono font-bold text-zinc-200">{formatMoney(item.value)}</span>
                      <div className="flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Tab 2: SALES & CLIENTS */}
        {activeTab === "sales" && (
          <motion.div
            key="sales"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
              
              {/* Chart of Top Customers */}
              <div className="lg:col-span-6 bg-zinc-950 border border-zinc-850 rounded-2xl p-5 print:hidden">
                <h4 className="text-xs font-bold text-zinc-300 mb-4">العملاء الأكثر شراءً وحجماً للمبيعات</h4>
                <div className="h-64 w-full text-xs font-mono">
                  {analytics.sales.topCustomers.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.sales.topCustomers} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <XAxis type="number" stroke="#52525b" tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#52525b" tickLine={false} width={100} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", color: "#f4f4f5" }}
                        />
                        <Bar name="إجمالي المشتريات ($)" dataKey="totalSpent" fill="#c59257" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600">
                      لا تتوفر مبيعات كافية لعرض حركة العملاء.
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Top Customers */}
              <div className="lg:col-span-6 bg-zinc-950 border border-zinc-850 rounded-2xl p-5 print:bg-white print:text-black print:border-black">
                <h4 className="text-xs font-bold text-zinc-300 mb-4 text-right print:text-black print:text-sm">قائمة كبار العملاء وحجم مبيعاتهم</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold print:border-black print:bg-gray-100 print:text-black">
                        <th className="p-3">حجم الشراء الإجمالي</th>
                        <th className="p-3">الشركة أو الجهة</th>
                        <th className="p-3">اسم العميل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40 print:divide-gray-300">
                      {analytics.sales.topCustomers.map((cust: any, index: number) => (
                        <tr key={cust.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                          <td className="p-3 font-mono font-bold text-indigo-400 print:text-black">
                            {formatMoney(cust.totalSpent)}
                          </td>
                          <td className="p-3 text-zinc-400 print:text-black">
                            {cust.company}
                          </td>
                          <td className="p-3 font-bold text-zinc-200 print:text-black flex items-center gap-2 justify-end">
                            <span>{cust.name}</span>
                            <span className="w-4.5 h-4.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400 flex items-center justify-center font-bold print:hidden">
                              {index + 1}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Tab 3: INVENTORY */}
        {activeTab === "inventory" && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Raw Material Cost Distribution & Asset Charts */}
            <div className="print:hidden">
              <MaterialCostCharts
                materials={analytics?.inventory?.stockStatus || []}
                exchangeRate={exchangeRate}
              />
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 print:bg-white print:text-black print:border-black">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <span className="text-xs font-mono text-emerald-400 print:text-black">
                  إجمالي قيمة المخزون الحالية: <strong className="text-sm font-bold text-zinc-200 print:text-black">{formatMoney(analytics.inventory.totalInventoryValue)}</strong>
                </span>
                <h4 className="text-xs font-bold text-zinc-300 print:text-black print:text-sm">حالة جرد المواد الخام وحدود الأمان للمخازن</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold print:border-black print:bg-gray-100 print:text-black">
                      <th className="p-3">حالة المخزون</th>
                      <th className="p-3">قيمة مخزون المادة</th>
                      <th className="p-3">حد الطلب الأدنى</th>
                      <th className="p-3">الكمية المتوفرة بالمستودع</th>
                      <th className="p-3">التصنيف الرئيسي</th>
                      <th className="p-3">اسم المادة الخام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 print:divide-gray-300">
                    {analytics.inventory.stockStatus.map((m: any) => (
                      <tr key={m.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            m.isLowStock 
                              ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" 
                              : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                          } print:text-black print:bg-transparent`}>
                            {m.isLowStock ? "مخزون منخفض ⚠️" : "مخزون آمن ✓"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-zinc-300 print:text-black font-bold">
                          {formatMoney(m.stockValue)}
                        </td>
                        <td className="p-3 font-mono text-zinc-500 print:text-black">
                          {m.minimumStock} {m.unit}
                        </td>
                        <td className="p-3 font-mono font-bold text-zinc-100 print:text-black">
                          {m.stockQuantity} {m.unit}
                        </td>
                        <td className="p-3 text-zinc-400 print:text-black">
                          {m.category}
                        </td>
                        <td className="p-3 font-bold text-zinc-200 print:text-black">
                          {m.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: MACHINES */}
        {activeTab === "machines" && (
          <motion.div
            key="machines"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 print:bg-white print:text-black print:border-black">
              <h4 className="text-xs font-bold text-zinc-300 mb-4 text-right print:text-black print:text-sm">معدل تشغيل الآلات والمعدات (Laser Machine Utilization)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:hidden">
                {analytics.machines.map((mac: any) => (
                  <div key={mac.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-850 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        mac.status === "working" ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" : 
                        mac.status === "maintenance" ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" : 
                        "bg-zinc-950 text-zinc-400 border border-zinc-800"
                      }`}>
                        {mac.status === "working" ? "قيد التشغيل" : mac.status === "maintenance" ? "صيانة جارية" : "جاهزة / خاملة"}
                      </span>
                      <strong className="text-xs text-zinc-200">{mac.name}</strong>
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span className="font-mono text-zinc-200">{mac.workingHours.toFixed(1)} ساعة</span>
                        <span>إجمالي ساعات العمل التراكمية:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono text-zinc-200">{mac.totalJobs} مهام</span>
                        <span>إجمالي مهام الإنتاج المجدولة:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono text-emerald-400">{mac.completedJobs} مهام</span>
                        <span>مهام منجزة ومسلمة:</span>
                      </div>
                    </div>

                    {/* Simple status bar */}
                    <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${Math.min((mac.workingHours / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Operations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-500 font-bold print:border-black print:bg-gray-100 print:text-black">
                      <th className="p-3">نسبة الإنجاز %</th>
                      <th className="p-3">المهام المنجزة</th>
                      <th className="p-3">إجمالي المهام المجدولة</th>
                      <th className="p-3">ساعات التشغيل</th>
                      <th className="p-3">حالة الآلة حالياً</th>
                      <th className="p-3">نوع مصدر الليزر</th>
                      <th className="p-3">اسم الآلة والمعدات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 print:divide-gray-300">
                    {analytics.machines.map((mac: any) => {
                      const pct = mac.totalJobs > 0 ? (mac.completedJobs / mac.totalJobs) * 100 : 100;
                      return (
                        <tr key={mac.id} className="hover:bg-zinc-900/20 transition-all font-sans">
                          <td className="p-3 font-mono font-bold text-zinc-200 print:text-black">
                            {pct.toFixed(0)}%
                          </td>
                          <td className="p-3 font-mono text-emerald-400 print:text-black">
                            {mac.completedJobs}
                          </td>
                          <td className="p-3 font-mono text-zinc-400 print:text-black">
                            {mac.totalJobs}
                          </td>
                          <td className="p-3 font-mono text-zinc-100 print:text-black">
                            {mac.workingHours.toFixed(1)} ساعة
                          </td>
                          <td className="p-3 text-zinc-400 print:text-black">
                            {mac.status === "working" ? "قيد التشغيل" : mac.status === "maintenance" ? "صيانة" : "خامل / جاهز"}
                          </td>
                          <td className="p-3 text-zinc-500 font-mono print:text-black">
                            {mac.type}
                          </td>
                          <td className="p-3 font-bold text-zinc-200 print:text-black">
                            {mac.name}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </motion.div>
        )}

      </div>

      {/* Hidden print header only shown during print */}
      <div className="hidden print:block text-center space-y-2 pb-6 border-b border-black mb-6">
        <h1 className="text-xl font-bold">مجمع المعامل والورش الذكية - AxisLab ERP</h1>
        <h2 className="text-md font-semibold">تقرير رسمي صادر ومصدق من الإدارة المالية</h2>
        <div className="flex justify-between text-[11px] pt-2">
          <span>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</span>
          <span>توقيع المحاسب المالي: __________________</span>
          <span>توقيع المدير العام: __________________</span>
        </div>
      </div>

    </div>
  );
}

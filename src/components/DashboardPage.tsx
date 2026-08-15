import { motion, AnimatePresence } from "motion/react";
import { Activity, AlertTriangle, Briefcase, Calendar, CheckCircle2, ChevronDown, Clock, Coins, Download, Edit3, Eye, Filter, FolderOpen, Layers, MessageSquare, Plus, PlusCircle, RefreshCw, Scissors, Search, SlidersHorizontal, Trash2, TrendingUp, UserIcon, Users, X, Zap } from "lucide-react";
import DashboardCharts from "./DashboardCharts";

export default function DashboardPage(props: Record<string, any>) {
  const {
    Customer,
    Machine,
    activeOrderFiltersCount,
    activeView,
    c,
    calculateOrderProgress,
    currentUser,
    remnants,
    productionJobs,
    theme,
    setActiveProductSubTab,
    setIsCurrencyConverterOpen,
    custAddress,
    custCategory,
    custCompany,
    custName,
    custNotes,
    custPhone,
    customerCategoryFilter,
    customers,
    exchangeRate,
    fastLocalDashboardTrends,
    fastLocalInventoryPredictions,
    fastLocalProductionScheduling,
    filteredOrders,
    getSevenDaysChartData,
    handleAddCustomer,
    handleExportCustomersCSV,
    handleOpenEditCustomer,
    handleUpdateOrderStatus,
    items,
    laserMachines,
    laserUtilizationPercent,
    lowStockCount,
    min,
    orderFilterCustomer,
    orderFilterEndDate,
    orderFilterPriority,
    orderFilterSearch,
    orderFilterStartDate,
    orderFilterStatus,
    orders,
    pageTransition,
    pageVariants,
    pendingOrders,
    qty,
    resetOrderFilters,
    role,
    runningLasersCount,
    setActiveView,
    setCustAddress,
    setCustCategory,
    setCustCompany,
    setCustName,
    setCustNotes,
    setCustPhone,
    setCustomerCategoryFilter,
    setDeleteConfirmTarget,
    setEditOrderItems,
    setEditingOrder,
    setOrderDetailsTab,
    setOrderFilterCustomer,
    setOrderFilterEndDate,
    setOrderFilterPriority,
    setOrderFilterSearch,
    setOrderFilterStartDate,
    setOrderFilterStatus,
    setOrderGcodeResult,
    setProgressModalOrder,
    setSelectedCustomerFiles,
    setSelectedCustomerIdForOrder,
    setSelectedOrder,
    setShowAddCustomer,
    setShowAddOrder,
    showAddCustomer,
    updateRate
  } = props;

  return (
    <>
      {true && (
                      <motion.div
                        key="dashboard"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                        className="p-6 space-y-6"
                      >
                        {/* Top Stats Metric Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Metric 1: Pending Orders */}
                          <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between transition-all hover:border-zinc-700">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">الطلبات قيد الانتظار</span>
                              <div className="text-2xl font-mono text-zinc-100 font-bold">{pendingOrders.length}</div>
                              <span className="text-[10px] text-zinc-400 font-sans block mt-1">
                                جديد: {orders.filter(o => o.status === "new").length} | قيد التنفيذ: {orders.filter(o => o.status === "in_progress").length}
                              </span>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-indigo-400" />
                            </div>
                          </div>
      
                          {/* Metric 2: Low-stock Materials Alert */}
                          <div className={`bg-zinc-900/50 border p-4 rounded-xl flex items-center justify-between transition-all hover:border-zinc-700 ${lowStockCount > 0 ? "border-rose-900/30" : "border-zinc-800/80"}`}>
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">إنذار انخفاض المخزون</span>
                              <div className={`text-2xl font-mono font-bold ${lowStockCount > 0 ? "text-rose-400" : "text-zinc-100"}`}>
                                {lowStockCount}
                              </div>
                              <span className={`text-[10px] font-sans block mt-1 ${lowStockCount > 0 ? "text-rose-400 animate-pulse font-medium" : "text-emerald-400"}`}>
                                {lowStockCount > 0 ? `⚠️ ${lowStockCount} خامات تحت حد الأمان` : "✓ المخزون آمن بالكامل"}
                              </span>
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                              lowStockCount > 0 
                                ? "bg-rose-950/40 border-rose-900/30 text-rose-400" 
                                : "bg-emerald-950/40 border-emerald-900/30 text-emerald-400"
                            }`}>
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                          </div>
      
                          {/* Metric 3: Laser Machine Utilization */}
                          <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between transition-all hover:border-zinc-700">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">معدل تشغيل الليزر اليوم</span>
                              <div className="text-2xl font-mono text-emerald-400 font-bold">{laserUtilizationPercent}%</div>
                              <span className="text-[10px] text-zinc-400 font-sans block mt-1 flex items-center gap-1">
                                {runningLasersCount > 0 && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                )}
                                نشط حالياً: {runningLasersCount}/{laserMachines.length} ماكينات
                              </span>
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                              runningLasersCount > 0 
                                ? "bg-emerald-950/40 border-emerald-900/30 text-emerald-400 animate-pulse" 
                                : "bg-zinc-950 border-zinc-800 text-zinc-400"
                            }`}>
                              <Activity className="w-5 h-5" />
                            </div>
                          </div>
      
                          {/* Metric 4: Pipeline Value / Remnants Count based on role */}
                          {currentUser.role === "employee" ? (
                            <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between transition-all hover:border-zinc-700">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">إجمالي فضلات الألواح بالمخزن</span>
                                <div className="text-lg font-mono text-indigo-400 font-bold">{remnants.length} فضلات</div>
                                <span className="text-[10px] text-zinc-400 font-sans block mt-1 font-bold">
                                  ألواح وقصاصات متاحة للقص والتشغيل
                                </span>
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center">
                                <Layers className="w-5 h-5 text-indigo-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between transition-all hover:border-zinc-700">
                              <div>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono block mb-1">قيمة الطلبات قيد الانتظار</span>
                                <div className="text-lg font-mono text-amber-400 font-bold">
                                  {(pendingOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0) * exchangeRate).toLocaleString()} ل.س
                                </div>
                                <span className="text-[10px] text-zinc-400 font-sans block mt-1 font-medium">
                                  المكافئ بالدولار: ${pendingOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-900/30 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-amber-400" />
                              </div>
                            </div>
                          )}
                        </div>
      
                        {/* v0.3.0: Daily focus actions for the most common operational tasks */}
                        <section className="rounded-2xl border border-[#c59257]/20 bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-[#1a1510]/70 p-4 shadow-lg shadow-black/10">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-[#c59257]" />
                                <h2 className="text-sm font-bold text-zinc-100">إجراءات اليوم</h2>
                              </div>
                              <p className="mt-1 text-[11px] text-zinc-500">انتقل مباشرة إلى أكثر المهام احتياجًا بدل البحث داخل القوائم.</p>
                            </div>
                            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${lowStockCount > 0 ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${lowStockCount > 0 ? "bg-rose-400" : "bg-emerald-400"}`} />
                              {lowStockCount > 0 ? `${lowStockCount} تنبيه مخزون` : "المخزون ضمن الحدود"}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <button
                              onClick={() => { setActiveView("database"); setActiveProductSubTab("materials"); }}
                              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-right transition hover:border-rose-500/40 hover:bg-rose-500/5"
                            >
                              <span><span className="block text-xs font-semibold text-zinc-200">مراجعة المخزون</span><span className="mt-0.5 block text-[10px] text-zinc-500">{lowStockCount > 0 ? "ابدأ بالخامات المنخفضة" : "فحص سريع للمواد"}</span></span>
                              <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-rose-400" : "text-zinc-500 group-hover:text-emerald-400"}`} />
                            </button>
                            <button
                              onClick={() => { setActiveView("database"); }}
                              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-right transition hover:border-indigo-500/40 hover:bg-indigo-500/5"
                            >
                              <span><span className="block text-xs font-semibold text-zinc-200">متابعة الطلبات</span><span className="mt-0.5 block text-[10px] text-zinc-500">{pendingOrders.length} طلب قيد المتابعة</span></span>
                              <Briefcase className="h-4 w-4 text-indigo-400" />
                            </button>
                            <button
                              onClick={() => setIsCurrencyConverterOpen(true)}
                              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-right transition hover:border-[#c59257]/50 hover:bg-[#c59257]/5"
                            >
                              <span><span className="block text-xs font-semibold text-zinc-200">تحديث سعر الصرف</span><span className="mt-0.5 block text-[10px] text-zinc-500">1$ = {exchangeRate.toLocaleString()} ل.س</span></span>
                              <Coins className="h-4 w-4 text-[#c59257]" />
                            </button>
                          </div>
                        </section>
      
                        {/* Orders, Customers, and operational actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          
                          {/* Orders Board */}
                          <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-400" />
                                جدول مهام ورشة الليزر والقص
                              </h3>
                              {currentUser.role !== 'accountant' && (
                                <button
                                  onClick={() => setShowAddOrder(true)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg border border-indigo-500 font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  طلب تشغيل جديد
                                </button>
                              )}
                            </div>
      
                            {/* Advanced Filter Bar for Orders */}
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3 shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-[#c59257]/10 border border-[#c59257]/30 flex items-center justify-center text-[#c59257]">
                                    <SlidersHorizontal className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                                      <span>شريط الفلترة المتقدم للطلبات</span>
                                      {activeOrderFiltersCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#c59257] text-zinc-950 shadow-sm">
                                          {activeOrderFiltersCount} فلاتر نشطة
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-[10px] text-zinc-400 font-sans">
                                      تصفية سريعة حسب التاريخ، الأولوية، والعميل لسهولة متابعة الإنتاج بالورشة
                                    </p>
                                  </div>
                                </div>
      
                                <div className="flex items-center gap-2">
                                  {activeOrderFiltersCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={resetOrderFilters}
                                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-900/40 hover:border-rose-700/60 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                      title="إعادة ضبط وتفريغ جميع خيارات الفلترة"
                                    >
                                      <X className="w-3.5 h-3.5 text-rose-400" />
                                      <span>تفريغ الفلاتر</span>
                                    </button>
                                  )}
                                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                                    يعرض: <strong className="text-[#c59257]">{filteredOrders.length}</strong> من <span className="text-zinc-300">{orders.length}</span> طلب
                                  </span>
                                </div>
                              </div>
      
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
                                {/* 1. Search Box */}
                                <div className="relative">
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <Search className="w-3 h-3 text-[#c59257]" />
                                    <span>بحث رقم/عميل</span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={orderFilterSearch}
                                      onChange={(e) => setOrderFilterSearch(e.target.value)}
                                      placeholder="رقم الطلب، العميل..."
                                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-100 pr-7 pl-2.5 py-1.5 focus:outline-none focus:border-[#c59257] transition-all font-sans placeholder:text-zinc-600"
                                    />
                                    <Search className="w-3 h-3 text-zinc-500 absolute right-2 top-2.5 pointer-events-none" />
                                    {orderFilterSearch && (
                                      <button
                                        type="button"
                                        onClick={() => setOrderFilterSearch("")}
                                        className="absolute left-2 top-2 text-zinc-500 hover:text-zinc-200"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
      
                                {/* 2. Customer Select */}
                                <div>
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <UserIcon className="w-3 h-3 text-indigo-400" />
                                    <span>العميل</span>
                                  </label>
                                  <select
                                    value={orderFilterCustomer}
                                    onChange={(e) => setOrderFilterCustomer(e.target.value)}
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-indigo-500 transition-all font-sans cursor-pointer"
                                  >
                                    <option value="all">جميع العملاء ({customers.length})</option>
                                    {customers.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
      
                                {/* 3. Priority Select */}
                                <div>
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    <span>درجة الأولوية</span>
                                  </label>
                                  <select
                                    value={orderFilterPriority}
                                    onChange={(e) => setOrderFilterPriority(e.target.value)}
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500 transition-all font-sans cursor-pointer font-bold"
                                  >
                                    <option value="all">جميع الأولويات</option>
                                    <option value="urgent" className="text-rose-400 font-bold">⚡ طارئة / عاجلة</option>
                                    <option value="high" className="text-amber-400 font-bold">🔥 عالية</option>
                                    <option value="normal" className="text-blue-300">🔵 عادية</option>
                                    <option value="low" className="text-zinc-400">⚪ منخفضة</option>
                                  </select>
                                </div>
      
                                {/* 4. Status Select */}
                                <div>
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>حالة الطلب</span>
                                  </label>
                                  <select
                                    value={orderFilterStatus}
                                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-emerald-500 transition-all font-sans cursor-pointer"
                                  >
                                    <option value="all">جميع الحالات</option>
                                    <option value="new">✨ جديد</option>
                                    <option value="in_progress">⚙️ قيد التنفيذ</option>
                                    <option value="ready">✅ جاهز للتسليم</option>
                                    <option value="delivered">📦 تم التسليم</option>
                                    <option value="cancelled">❌ ملغي</option>
                                  </select>
                                </div>
      
                                {/* 5. Start Date */}
                                <div>
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-cyan-400" />
                                    <span>من تاريخ</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={orderFilterStartDate}
                                    onChange={(e) => setOrderFilterStartDate(e.target.value)}
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-1.5 py-1.5 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                                  />
                                </div>
      
                                {/* 6. End Date */}
                                <div>
                                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-cyan-400" />
                                    <span>إلى تاريخ</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={orderFilterEndDate}
                                    onChange={(e) => setOrderFilterEndDate(e.target.value)}
                                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 px-1.5 py-1.5 focus:outline-none focus:border-cyan-500 transition-all font-mono"
                                  />
                                </div>
                              </div>
      
                              {/* Quick date presets */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-zinc-400">
                                <span className="font-bold text-zinc-500">اختصارات زمنية سريعة:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const today = new Date().toISOString().slice(0, 10);
                                    setOrderFilterStartDate(today);
                                    setOrderFilterEndDate(today);
                                  }}
                                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold cursor-pointer transition-colors"
                                >
                                  طلبات اليوم
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curr = new Date();
                                    const first = new Date(curr.setDate(curr.getDate() - curr.getDay()));
                                    const last = new Date();
                                    setOrderFilterStartDate(first.toISOString().slice(0, 10));
                                    setOrderFilterEndDate(last.toISOString().slice(0, 10));
                                  }}
                                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold cursor-pointer transition-colors"
                                >
                                  هذا الأسبوع
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const date = new Date();
                                    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
                                    const today = new Date().toISOString().slice(0, 10);
                                    setOrderFilterStartDate(firstDay);
                                    setOrderFilterEndDate(today);
                                  }}
                                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold cursor-pointer transition-colors"
                                >
                                  هذا الشهر
                                </button>
                              </div>
                            </div>
      
                            {/* Orders table */}
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-x-auto shadow-md">
                              <table className="w-full text-left border-collapse font-sans text-xs min-w-[800px]">
                                <thead>
                                  <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-500 font-mono">
                                    <th className="p-3 text-right">رقم الطلب / العميل</th>
                                    <th className="p-3">حالة الطلب (تعديل مباشر)</th>
                                    <th className="p-3 text-right min-w-[150px]">نسبة الإكتمال والإنتاج</th>
                                    <th className="p-3 text-center">أولية</th>
                                    <th className="p-3 text-right">السعر الإجمالي</th>
                                    <th className="p-3 text-right">المتبقي</th>
                                    <th className="p-3 text-right">إجراءات الحالة</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                  {orders.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="p-6 text-center text-zinc-600 font-light">
                                        لا يوجد طلبات تشغيل مسجلة حالياً.
                                      </td>
                                    </tr>
                                  ) : filteredOrders.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                          <Filter className="w-8 h-8 text-[#c59257]/60 stroke-[1.5]" />
                                          <p className="font-bold text-zinc-200 text-sm">لا توجد طلبات تطابق الفلاتر المحددة.</p>
                                          <p className="text-xs text-zinc-400">جرب تغيير التاريخ، إزالة فلتر العميل، أو تعديل حالة الأولوية.</p>
                                          <button
                                            type="button"
                                            onClick={resetOrderFilters}
                                            className="mt-2 px-3 py-1 bg-[#c59257]/20 hover:bg-[#c59257] text-[#c59257] hover:text-zinc-950 border border-[#c59257]/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                          >
                                            إعادة ضبط جميع الفلاتر
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredOrders.map((ord) => {
                                      const cust = customers.find(c => c.id === ord.customerId);
                                      return (
                                        <tr key={ord.id} className="hover:bg-zinc-900/30 transition-colors">
                                          <td className="p-3 text-right">
                                            <div className="font-mono font-bold text-zinc-100">{ord.orderNumber}</div>
                                            <div className="text-[11px] text-zinc-400">{cust?.name || "عميل عام"}</div>
                                          </td>
                                          <td className="p-3">
                                            <div className="relative inline-flex items-center">
                                              <select
                                                value={ord.status}
                                                onChange={(e) => {
                                                  const newStatus = e.target.value;
                                                  const statusMap: Record<string, string> = {
                                                    new: "جديد",
                                                    in_progress: "قيد التنفيذ (جاري القص والإنتاج)",
                                                    ready: "جاهز للتسليم",
                                                    delivered: "تم التسليم للعميل",
                                                    cancelled: "ملغي"
                                                  };
                                                  handleUpdateOrderStatus(
                                                    ord.id,
                                                    newStatus,
                                                    `تحديث حالة الطلب إلى (${statusMap[newStatus] || newStatus}) مباشرة من جدول لوحة التحكم`
                                                  );
                                                }}
                                                className={`appearance-none text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#c59257] pr-6 pl-2.5 transition-all ${
                                                  ord.status === "new"
                                                    ? "bg-indigo-950/90 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900"
                                                    : ord.status === "in_progress"
                                                    ? "bg-blue-950/90 text-blue-300 border-blue-800/80 hover:bg-blue-900 font-extrabold animate-pulse"
                                                    : ord.status === "ready"
                                                    ? "bg-emerald-950/90 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900 font-extrabold"
                                                    : ord.status === "delivered"
                                                    ? "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                                                    : "bg-rose-950/90 text-rose-300 border-rose-800/80"
                                                }`}
                                                title="انقر لتغيير حالة الطلب فورياً"
                                              >
                                                <option value="new" className="bg-zinc-950 text-indigo-300 font-bold">✨ جديد</option>
                                                <option value="in_progress" className="bg-zinc-950 text-blue-300 font-bold">⚙️ قيد التنفيذ</option>
                                                <option value="ready" className="bg-zinc-950 text-emerald-300 font-bold">✅ جاهز للتسليم</option>
                                                <option value="delivered" className="bg-zinc-950 text-zinc-300 font-bold">📦 تم التسليم</option>
                                                <option value="cancelled" className="bg-zinc-950 text-rose-300 font-bold">❌ ملغي</option>
                                              </select>
                                              <ChevronDown className="w-3 h-3 text-zinc-400 absolute left-1.5 pointer-events-none" />
                                            </div>
                                          </td>
                                          <td className="p-3 text-right">
                                            {(() => {
                                              const prog = calculateOrderProgress(ord, productionJobs);
                                              const isComplete = prog.percentage === 100;
                                              const isInProgress = prog.percentage > 0 && prog.percentage < 100;
                                              
                                              return (
                                                <div className="w-36 sm:w-44 space-y-1.5 font-sans" title={`نسبة الإنجاز الفني: ${prog.percentage}% (${prog.label})`}>
                                                  <div 
                                                    onClick={(e) => { e.stopPropagation(); setProgressModalOrder(ord); }}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                  >
                                                    <div className="flex items-center justify-between text-[10px]">
                                                      <span className="text-zinc-400 text-[10px] font-medium flex items-center gap-1">
                                                        {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                                                        {isInProgress && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />}
                                                        {!isComplete && !isInProgress && <Clock className="w-3 h-3 text-zinc-500 shrink-0" />}
                                                        <span className="truncate">{prog.label}</span>
                                                      </span>
                                                      <span className={`font-mono font-bold text-[11px] ${
                                                        isComplete ? "text-emerald-400" : isInProgress ? "text-cyan-300" : "text-zinc-500"
                                                      }`}>
                                                        {prog.percentage}%
                                                      </span>
                                                    </div>
                                                    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5 relative shadow-inner mt-1">
                                                      <div
                                                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                          isComplete
                                                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                                            : isInProgress
                                                            ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                                                            : "bg-zinc-800"
                                                        }`}
                                                        style={{ width: `${Math.max(prog.percentage, 4)}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setProgressModalOrder(ord);
                                                    }}
                                                    className="w-full py-1 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/60 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                                                    title="فتح جدول تحديد كمية ما انقص وما لسا من قطع الطلب"
                                                  >
                                                    <Scissors className="w-3 h-3 text-cyan-400" />
                                                    <span>جدول القص (شو انقص وشو لسا)</span>
                                                  </button>
                                                </div>
                                              );
                                            })()}
                                          </td>
                                          <td className="p-3 text-center">
                                            <span className={`text-[10px] font-mono font-bold uppercase ${
                                              ord.priority === "urgent" || ord.priority === "high" ? "text-rose-400" : "text-zinc-500"
                                            }`}>
                                              {ord.priority}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right font-mono">
                                            <div className="font-bold text-[#c59257]">
                                              {(ord.totalPrice * exchangeRate).toLocaleString()} ل.س
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-normal">
                                              ${ord.totalPrice.toFixed(2)}
                                            </div>
                                          </td>
                                          <td className="p-3 text-right font-mono">
                                            {ord.remaining > 0 ? (
                                              <>
                                                <div className="font-bold text-rose-400">
                                                  {(ord.remaining * exchangeRate).toLocaleString()} ل.س
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-normal">
                                                  ${ord.remaining.toFixed(2)}
                                                </div>
                                              </>
                                            ) : (
                                              <span className="text-emerald-500 text-[11px] font-sans font-bold">مسدد بالكامل</span>
                                            )}
                                          </td>
                                          <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1.5 items-center">
                                              <button
                                                onClick={() => {
                                                  setSelectedOrder(ord);
                                                  setOrderDetailsTab("items");
                                                  setOrderGcodeResult(null);
                                                }}
                                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[10px] text-zinc-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                              >
                                                <Eye className="w-3 h-3 text-indigo-400" />
                                                عرض
                                              </button>
                                              {currentUser.role !== 'employee' && (
                                                <button
                                                  onClick={() => {
                                                    setEditingOrder(ord);
                                                    setEditOrderItems(ord.items.map(it => ({ name: it.productName, qty: it.quantity, price: it.unitPrice, notes: it.notes || "" })));
                                                  }}
                                                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[10px] text-zinc-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                  تعديل
                                                </button>
                                              )}
                                              <div className="w-[1px] h-3.5 bg-zinc-850"></div>
                                              {ord.status === 'new' && (
                                                <button
                                                  onClick={() => handleUpdateOrderStatus(ord.id, 'in_progress', 'تم بدء العمل وقص المواد بالليزر')}
                                                  className="px-2 py-1 bg-blue-950 text-blue-400 hover:bg-blue-900 border border-blue-900/50 rounded text-[10px] font-medium"
                                                >
                                                  ابدأ القص
                                                </button>
                                              )}
                                              {ord.status === 'in_progress' && (
                                                <button
                                                  onClick={() => handleUpdateOrderStatus(ord.id, 'ready', 'تم الانتهاء تماماً وتصديق القطع')}
                                                  className="px-2 py-1 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-900/50 rounded text-[10px] font-medium"
                                                >
                                                  جاهز للتسليم
                                                </button>
                                              )}
                                              {ord.status === 'ready' && (
                                                <button
                                                  onClick={() => handleUpdateOrderStatus(ord.id, 'delivered', 'تم تسليم القطع للعميل وقبض المتبقي')}
                                                  className="px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-medium"
                                                >
                                                  تم التسليم
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
      
                          {/* Customer side register */}
                          <div className="lg:col-span-4 space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-400" />
                                دليل العملاء المسجلين
                              </h3>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleExportCustomersCSV(customers)}
                                  title="تصدير بيانات العملاء الحالية كملف CSV منسق لتسويق والتواصل والتدقيق الخارجي"
                                  className="bg-zinc-900 hover:bg-zinc-850 text-[#c59257] border border-zinc-800 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#c59257]" />
                                  <span>تصدير CSV</span>
                                </button>
                                {currentUser?.role !== 'accountant' && (
                                  <button
                                    onClick={() => setShowAddCustomer(true)}
                                    className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-xs px-2.5 py-1 rounded-lg border border-emerald-900/50 font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> إضافة عميل
                                  </button>
                                )}
                              </div>
                            </div>
      
                            {/* Add customer form box */}
                            <AnimatePresence>
                              {showAddCustomer && currentUser?.role !== 'accountant' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                  className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl space-y-3 font-sans text-xs overflow-hidden"
                                >
                                  <span className="text-[11px] font-bold text-zinc-200 block border-b border-zinc-800 pb-1">بيانات العميل الجديد</span>
                                  <form onSubmit={handleAddCustomer} className="space-y-3">
                                    <div>
                                      <label className="text-zinc-500 block mb-0.5">الاسم الإجباري</label>
                                      <input
                                        type="text"
                                        required
                                        value={custName}
                                        onChange={(e) => setCustName(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-zinc-500 block mb-0.5">رقم الهاتف أو الموبايل</label>
                                      <input
                                        type="text"
                                        required
                                        value={custPhone}
                                        onChange={(e) => setCustPhone(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200 font-mono"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-zinc-500 block mb-0.5">الشركة</label>
                                        <input
                                          type="text"
                                          value={custCompany}
                                          onChange={(e) => setCustCompany(e.target.value)}
                                          className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-zinc-500 block mb-0.5 font-semibold">تصنيف العميل</label>
                                        <select
                                          value={custCategory}
                                          onChange={(e) => setCustCategory(e.target.value)}
                                          className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
                                        >
                                          <option value="شركة">🏢 شركة / مؤسسة</option>
                                          <option value="أفراد">👤 أفراد / شخصي</option>
                                          <option value="مقاول">👷 مقاول / مكتب هندسي</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-zinc-500 block mb-0.5">العنوان</label>
                                      <input
                                        type="text"
                                        value={custAddress}
                                        onChange={(e) => setCustAddress(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-zinc-500 block mb-0.5">ملاحظات العميل</label>
                                      <input
                                        type="text"
                                        value={custNotes}
                                        onChange={(e) => setCustNotes(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-200"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="submit" className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer">إضافة للائحة</button>
                                      <button type="button" onClick={() => setShowAddCustomer(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded cursor-pointer">إلغاء</button>
                                    </div>
                                  </form>
                                </motion.div>
                              )}
                            </AnimatePresence>
      
                            {/* Customer category filter bar */}
                            <div className="flex items-center justify-between gap-2 bg-zinc-900/60 p-2 rounded-xl border border-zinc-850 text-xs">
                              <span className="text-zinc-400 font-bold text-[11px] flex items-center gap-1">
                                <span>تصنيف العملاء:</span>
                              </span>
                              <div className="flex items-center gap-1">
                                {['الكل', 'شركة', 'أفراد', 'مقاول'].map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCustomerCategoryFilter(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                      customerCategoryFilter === cat
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80"
                                    }`}
                                  >
                                    {cat === 'شركة' && '🏢 '}
                                    {cat === 'أفراد' && '👤 '}
                                    {cat === 'مقاول' && '👷 '}
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>
      
                            {/* Customers List card */}
                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-[400px] overflow-y-auto">
                              {customers.filter(c => customerCategoryFilter === 'الكل' || (c.category || 'شركة') === customerCategoryFilter).length === 0 ? (
                                <div className="text-center py-6 text-xs text-zinc-600 font-light">لا يوجد عملاء يطابقون التصنيف المحدد.</div>
                              ) : (
                                customers
                                  .filter(c => customerCategoryFilter === 'الكل' || (c.category || 'شركة') === customerCategoryFilter)
                                  .map(c => (
                                    <div key={c.id} className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850/60 hover:border-zinc-800 flex items-center justify-between transition-colors">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs font-bold text-zinc-200">{c.name}</h4>
                                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${
                                            (c.category || 'شركة') === 'شركة'
                                              ? 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                                              : (c.category || 'شركة') === 'أفراد'
                                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                                              : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                                          }`}>
                                            {(c.category || 'شركة') === 'شركة' && '🏢 شركة'}
                                            {(c.category || 'شركة') === 'أفراد' && '👤 أفراد'}
                                            {(c.category || 'شركة') === 'مقاول' && '👷 مقاول'}
                                            {(c.category || 'شركة') !== 'شركة' && (c.category || 'شركة') !== 'أفراد' && (c.category || 'شركة') !== 'مقاول' && (c.category || 'شركة')}
                                          </span>
                                        </div>
                                      {currentUser?.role !== 'accountant' ? (
                                        <>
                                          <span className="text-[10px] text-zinc-500 block font-mono">{c.phone} {c.company ? `| ${c.company}` : ""}</span>
                                          {c.notes && <p className="text-[10px] text-zinc-400 mt-1 italic font-sans">{c.notes}</p>}
                                        </>
                                      ) : (
                                        <span className="text-[10px] text-zinc-600 block italic">البيانات الشخصية محجوبة (للمحاسبة والتدقيق فقط)</span>
                                      )}
                                    </div>
                                    {currentUser?.role !== 'accountant' && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setSelectedCustomerIdForOrder(c.id);
                                            setShowAddOrder(true);
                                          }}
                                          title={`إنشاء طلب جديد فوري للعميل (${c.name}) دون الانتقال لصفحة الطلبات`}
                                          className="px-2 py-1 text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-500 rounded transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                        >
                                          <PlusCircle className="w-3 h-3" />
                                          <span>طلب جديد</span>
                                        </button>
                                        <button
                                          onClick={() => handleOpenEditCustomer(c)}
                                          title="تعديل ملف وتفاصيل العميل"
                                          className="p-1 text-indigo-400 hover:bg-indigo-950/40 border border-indigo-900/30 rounded transition-all cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setSelectedCustomerFiles(c)}
                                          title="ملفات ومستندات العميل"
                                          className="p-1 text-[#c59257] hover:bg-indigo-950/40 border border-[#c59257]/20 rounded transition-all cursor-pointer"
                                        >
                                          <FolderOpen className="w-3.5 h-3.5" />
                                        </button>
                                        <a
                                          href={`https://wa.me/${c.whatsapp}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="فتح محادثة واتساب"
                                          className="p-1 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/20 rounded transition-all"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                          onClick={() => setDeleteConfirmTarget({ id: c.id, name: c.name, type: 'customer' })}
                                          className="p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
      
                            
                          </div>
      
                        </div>
      
                        {/* Performance & Finance Grid (Chart + Converter + Assistant) */}
                        {currentUser.role !== "employee" && (
                          <DashboardCharts 
                            chartData={getSevenDaysChartData()} 
                            exchangeRate={exchangeRate} 
                            updateRate={updateRate} 
                            onOpenCurrencyModal={() => setIsCurrencyConverterOpen(true)}
                            theme={theme}
                            fastLocalDashboardTrends={fastLocalDashboardTrends}
                            fastLocalInventoryPredictions={fastLocalInventoryPredictions}
                            fastLocalProductionScheduling={fastLocalProductionScheduling}
                          />
                        )}
                      </motion.div>
                    )}
      
                    {/* DATABASE MERGE VISUALIZER & ORDER ARCHIVE MANAGER */}
      
      
    </>
  );
}

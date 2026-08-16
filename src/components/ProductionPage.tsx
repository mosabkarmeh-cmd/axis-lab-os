import { motion, AnimatePresence } from "motion/react";
import { Activity, Cpu, LayoutGrid, List, Plus, Search, Wrench, X } from "lucide-react";
import MachineCalibration from "./MachineCalibration";
import ProductionJobView from "./ProductionJobView";
import { materialPriceSYP, materialPriceUSD } from "../lib/materials";

export default function ProductionPage(props: Record<string, any>) {
  const {
    pageVariants,
    pageTransition,
    currentUser,
    showAddJob, showAddMachine,
    setShowAddJob,
    setShowAddMachine,
    activeProductionSubTab,
    setActiveProductionSubTab,
    newMachineName,
    setNewMachineName,
    newMachineType,
    setNewMachineType,
    newMachineHours,
    setNewMachineHours,
    machineSearchQuery,
    setMachineSearchQuery,
    machineStatusFilter,
    setMachineStatusFilter,
    machineLayout,
    setMachineLayout,
    newJobItemName,
    setNewJobItemName,
    newJobMaterialId,
    setNewJobMaterialId,
    newJobLaserPower,
    setNewJobLaserPower,
    newJobLaserSpeed,
    setNewJobLaserSpeed,
    newJobEstTime,
    setNewJobEstTime,
    newJobOrderId,
    setNewJobOrderId,
    activeRunningJob,
    laserX,
    laserY,
    liveLogLines,
    machines,
    productionJobs,
    materials,
    remnants,
    orders,
    exchangeRate,
    addTerminalLog,
    handleAddMachine,
    handleChangeMachineMaintenance,
    handleCreateProductionJob,
    handleDeleteMachine,
    handleDirectCompleteJob,
    handlePauseProductionJob,
    handleReorderProductionJobs,
    handleStartProductionJob,
    handleUpdateMachineCalibration,
    handleUpdateOrderStatus,
    handleUpdateProductionJob
  } = props;

  return (
<>
              {true && (
                <motion.div
                  key="production"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="p-6 space-y-6 font-sans overflow-y-auto h-full flex-1"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-850 pb-4 gap-4 text-right">
                    <div className="flex gap-2 order-2 sm:order-1 w-full sm:w-auto">
                      {currentUser?.role !== 'accountant' && (
                        <button
                          onClick={() => setShowAddJob(true)}
                          className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 flex-1 sm:flex-none"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>إدراج مهمة قص جديدة</span>
                        </button>
                      )}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => setShowAddMachine(true)}
                          className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg flex-1 sm:flex-none"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#c59257]" />
                          <span>إضافة ماكينة جديدة</span>
                        </button>
                      )}
                    </div>
                    <div className="text-right order-1 sm:order-2">
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 justify-end">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        <span>صالة الإنتاج والتحكم الرقمي بالماكينات (CNC Console)</span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">راقب عمليات القص المباشرة وجدولة مهام الإنتاج على أجهزة الليزر CO2 والألياف البصرية</p>
                    </div>
                  </div>

                  {/* Sub-Tabs Navigation */}
                  <div className="flex border-b border-zinc-850 gap-2 justify-end overflow-x-auto no-scrollbar py-0.5">
                    <button
                      onClick={() => setActiveProductionSubTab('calibration')}
                      className={`px-3 py-2 sm:px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeProductionSubTab === 'calibration'
                          ? "border-[#c59257] text-[#c59257]"
                          : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span>معايرة الآلات وضبط البؤرة (Calibration)</span>
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveProductionSubTab('console')}
                      className={`px-3 py-2 sm:px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                        activeProductionSubTab === 'console'
                          ? "border-[#c59257] text-[#c59257]"
                          : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span>لوحة التشغيل والتحكم (CNC Console)</span>
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>

                  {activeProductionSubTab === 'console' ? (
                    <>
                      {/* Add Machine form */}
                      <AnimatePresence>
                        {showAddJob && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-right overflow-hidden mb-4"
                          >
                            <h4 className="text-xs font-bold text-[#c59257] uppercase tracking-wider mb-4 font-mono flex items-center justify-between">
                              <span>إدراج مهمة قص ونقش جديدة في طابور الماكينة</span>
                              <span className="text-[10px] text-zinc-400 font-sans normal-case">حساب تلقائي لتكاليف الفني والخامة</span>
                            </h4>
                            <form onSubmit={handleCreateProductionJob} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">اسم المهمة/المنتج:</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="مثال: علبة هدايا خشبية محفورة"
                                    value={newJobItemName}
                                    onChange={(e) => setNewJobItemName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] font-sans text-right"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">الخامة المستخدمة:</label>
                                  <select
                                    required
                                    value={newJobMaterialId}
                                    onChange={(e) => setNewJobMaterialId(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257] font-sans text-right"
                                  >
                                    <option value="">-- اختر الخامة من المخزن --</option>
                                    {materials.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name} ({Math.round(materialPriceSYP(m.pricePerUnit)).toLocaleString()} ل.س/لوح)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">مرتبطة بطلب زبون (اختياري):</label>
                                  <select
                                    value={newJobOrderId}
                                    onChange={(e) => setNewJobOrderId(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257] font-sans text-right"
                                  >
                                    <option value="">مهمة نموذجية / بدون طلب مباشر</option>
                                    {orders.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        طلب رقم #{o.orderNumber}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">شدة شعار الليزر (%):</label>
                                  <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={newJobLaserPower}
                                    onChange={(e) => setNewJobLaserPower(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-center"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">سرعة القص (مم/ثانية):</label>
                                  <input
                                    type="number"
                                    min={5}
                                    max={500}
                                    value={newJobLaserSpeed}
                                    onChange={(e) => setNewJobLaserSpeed(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-center"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] text-zinc-400 block font-sans">الزمن التقديري للقص (ثانية):</label>
                                  <input
                                    type="number"
                                    min={5}
                                    value={newJobEstTime}
                                    onChange={(e) => setNewJobEstTime(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-center"
                                  />
                                </div>
                              </div>

                              {/* Dynamic Financial Estimation Preview */}
                              {newJobMaterialId && (
                                <div className="bg-zinc-950 border border-indigo-900/40 p-3 rounded-xl flex flex-wrap justify-between items-center text-xs text-right gap-3">
                                  <div className="flex gap-4 items-center">
                                    <div>
                                      <span className="text-[10px] text-zinc-500 block">أجر الفني المقدر (بناءً على {newJobEstTime} ث):</span>
                                      <span className="font-bold text-indigo-400 font-mono">
                                        {Math.round((newJobEstTime / 60) * 0.25 * (exchangeRate || 135)).toLocaleString()} ل.س <span className="text-[9px] text-zinc-500">(${((newJobEstTime / 60) * 0.25).toFixed(2)})</span>
                                      </span>
                                    </div>
                                    <div className="border-r border-zinc-850 pr-4">
                                      <span className="text-[10px] text-zinc-500 block">تكلفة الخامة المستهلكة:</span>
                                      <span className="font-bold text-amber-400 font-mono">
                                        {Math.round(materialPriceSYP(materials.find(m => m.id === newJobMaterialId)?.pricePerUnit ?? 15) * 0.15).toLocaleString()} ل.س <span className="text-[9px] text-zinc-500">(${(materialPriceUSD(materials.find(m => m.id === newJobMaterialId)?.pricePerUnit ?? 15, exchangeRate) * 0.15).toFixed(2)})</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-zinc-400 block font-bold">إجمالي التكلفة المباشرة المتوقعة:</span>
                                    <span className="font-extrabold text-[#c59257] text-sm font-mono">
                                      {Math.round(((newJobEstTime / 60) * 0.25 * (exchangeRate || 135)) + (materialPriceSYP(materials.find(m => m.id === newJobMaterialId)?.pricePerUnit ?? 15) * 0.15)).toLocaleString()} ل.س
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddJob(false)}
                                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-[11px] font-bold text-zinc-400 cursor-pointer"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  إدراج المهمة في الطابور ⚡
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}

                        {showAddMachine && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-right overflow-hidden mb-4"
                          >
                            <h4 className="text-xs font-bold text-[#c59257] uppercase tracking-wider mb-4 font-mono">إضافة ماكينة CNC جديدة للصالة</h4>
                            <form onSubmit={handleAddMachine} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <div className="space-y-1.5">
                                <label className="text-[11px] text-zinc-400 block font-sans">اسم الماكينة والوصف:</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مثال: CO2 Laser Cutter 130W (شرق)"
                                  value={newMachineName}
                                  onChange={(e) => setNewMachineName(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] font-sans text-right"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] text-zinc-400 block font-sans">نوع الماكينة (التقنية):</label>
                                <select
                                  value={newMachineType}
                                  onChange={(e) => setNewMachineType(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257] font-sans text-right"
                                >
                                  <option value="laser_co2">CO2 Laser Cutter (ليزر غازي)</option>
                                  <option value="cnc_router">CNC Router (حفر راوتر)</option>
                                  <option value="fiber_laser">Fiber Laser (ليزر فايبر للمعادن)</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] text-zinc-400 block font-sans">ساعات التشغيل البدئية:</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={newMachineHours}
                                  onChange={(e) => setNewMachineHours(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257] font-mono text-left"
                                />
                              </div>
                              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddMachine(false)}
                                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-[11px] font-bold text-zinc-400 cursor-pointer"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-[#c59257] hover:bg-[#b07e43] text-zinc-950 rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  تأكيد الإضافة
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>

                  {/* Machine Filter & Layout Control Bar */}
                  {(() => {
                    const idleCount = machines.filter(m => m.status === 'idle').length;
                    const runningCount = machines.filter(m => m.status === 'running').length;
                    const maintenanceCount = machines.filter(m => m.status === 'maintenance').length;
                    const offlineCount = machines.filter(m => m.status === 'offline').length;

                    const filteredMachines = machines.filter((mac) => {
                      if (machineStatusFilter !== 'all' && mac.status !== machineStatusFilter) {
                        return false;
                      }
                      if (!machineSearchQuery.trim()) return true;
                      const q = machineSearchQuery.toLowerCase().trim();
                      const nameMatch = (mac.name || "").toLowerCase().includes(q);
                      const typeMatch = (mac.type || "").toLowerCase().includes(q);
                      const statusMatch = (mac.status || "").toLowerCase().includes(q);
                      return nameMatch || typeMatch || statusMatch;
                    });

                    return (
                      <div className="space-y-4">
                        {/* Status Filter Tabs & Search & Layout Switcher */}
                        <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl space-y-3 shadow-md">
                          {/* Top Row: Status Filter Tabs */}
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-zinc-900">
                            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                              <span className="text-[11px] text-zinc-500 font-bold ml-1 shrink-0">فلترة الحالة:</span>
                              
                              <button
                                onClick={() => setMachineStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  machineStatusFilter === 'all'
                                    ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                                    : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-850 hover:bg-zinc-850"
                                }`}
                              >
                                <span>الكل</span>
                                <span className="px-1.5 py-0.2 text-[10px] bg-zinc-950 text-zinc-300 rounded-full font-mono">{machines.length}</span>
                              </button>

                              <button
                                onClick={() => setMachineStatusFilter('running')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  machineStatusFilter === 'running'
                                    ? "bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-sm"
                                    : "bg-zinc-900/60 text-zinc-400 hover:text-indigo-300 border border-zinc-850 hover:bg-zinc-850"
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                <span>قيد التشغيل</span>
                                <span className="px-1.5 py-0.2 text-[10px] bg-indigo-950/60 text-indigo-300 rounded-full font-mono border border-indigo-900/50">{runningCount}</span>
                              </button>

                              <button
                                onClick={() => setMachineStatusFilter('idle')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  machineStatusFilter === 'idle'
                                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm"
                                    : "bg-zinc-900/60 text-zinc-400 hover:text-emerald-300 border border-zinc-850 hover:bg-zinc-850"
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span>جاهز للعمل</span>
                                <span className="px-1.5 py-0.2 text-[10px] bg-emerald-950/60 text-emerald-300 rounded-full font-mono border border-emerald-900/50">{idleCount}</span>
                              </button>

                              <button
                                onClick={() => setMachineStatusFilter('maintenance')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  machineStatusFilter === 'maintenance'
                                    ? "bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm"
                                    : "bg-zinc-900/60 text-zinc-400 hover:text-amber-300 border border-zinc-850 hover:bg-zinc-850"
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                <span>تحت الصيانة</span>
                                <span className="px-1.5 py-0.2 text-[10px] bg-amber-950/60 text-amber-300 rounded-full font-mono border border-amber-900/50">{maintenanceCount}</span>
                              </button>

                              {offlineCount > 0 && (
                                <button
                                  onClick={() => setMachineStatusFilter('offline')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                    machineStatusFilter === 'offline'
                                      ? "bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm"
                                      : "bg-zinc-900/60 text-zinc-400 hover:text-rose-300 border border-zinc-850 hover:bg-zinc-850"
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                                  <span>غير متصل</span>
                                  <span className="px-1.5 py-0.2 text-[10px] bg-rose-950/60 text-rose-300 rounded-full font-mono border border-rose-900/50">{offlineCount}</span>
                                </button>
                              )}
                            </div>

                            {(machineStatusFilter !== 'all' || machineSearchQuery) && (
                              <button
                                onClick={() => {
                                  setMachineStatusFilter('all');
                                  setMachineSearchQuery('');
                                }}
                                className="text-[10px] text-zinc-400 hover:text-[#c59257] font-bold underline transition-colors cursor-pointer shrink-0"
                              >
                                إعادة الفلترة
                              </button>
                            )}
                          </div>

                          {/* Bottom Row: Search Bar & View Mode Toggle */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            {/* Search Bar */}
                            <div className="relative w-full sm:w-80">
                              <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={machineSearchQuery}
                                onChange={(e) => setMachineSearchQuery(e.target.value)}
                                placeholder="البحث عن ماكينة بالاسم أو النوع أو الحالة..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pr-9 pl-8 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#c59257] transition-all text-right font-sans"
                              />
                              {machineSearchQuery && (
                                <button
                                  onClick={() => setMachineSearchQuery("")}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                                  title="مسح البحث"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Layout Switcher & Machine Stats */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                              <span className="text-[11px] text-zinc-400 font-mono">
                                عرض <strong className="text-[#c59257]">{filteredMachines.length}</strong> من إجمالي <strong className="text-zinc-200">{machines.length}</strong> ماكينة
                              </span>

                              <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800 gap-1">
                                <button
                                  onClick={() => setMachineLayout('grid')}
                                  className={`p-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                                    machineLayout === 'grid'
                                      ? "bg-[#c59257] text-zinc-950 font-bold shadow-sm"
                                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                  }`}
                                  title="عرض شبكي (Grid View)"
                                >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                  <span className="text-[11px] hidden md:inline">شبكة</span>
                                </button>
                                <button
                                  onClick={() => setMachineLayout('list')}
                                  className={`p-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                                    machineLayout === 'list'
                                      ? "bg-[#c59257] text-zinc-950 font-bold shadow-sm"
                                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                  }`}
                                  title="عرض قائمة تفصيلية (List View)"
                                >
                                  <List className="w-3.5 h-3.5" />
                                  <span className="text-[11px] hidden md:inline">قائمة</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CNC Machines List / Grid */}
                        {filteredMachines.length === 0 ? (
                          <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 space-y-2">
                            <Cpu className="w-8 h-8 text-zinc-600 mx-auto" />
                            <p className="text-xs font-bold text-zinc-300">
                              لم يتم العثور على ماكينات مطابقة
                              {machineStatusFilter !== 'all' && ` بحالة "${machineStatusFilter === 'idle' ? 'جاهز للعمل' : machineStatusFilter === 'running' ? 'قيد التشغيل' : machineStatusFilter === 'maintenance' ? 'تحت الصيانة' : 'غير متصل'}"`}
                              {machineSearchQuery && ` ونص البحث "${machineSearchQuery}"`}
                            </p>
                            <p className="text-[11px] text-zinc-500">جرب تغيير حالة الفلترة أو مسح حقل البحث</p>
                            <button
                              onClick={() => {
                                setMachineSearchQuery("");
                                setMachineStatusFilter("all");
                              }}
                              className="mt-2 px-3 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[#c59257] rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>إعادة ضبط الفلاتر</span>
                            </button>
                          </div>
                        ) : machineLayout === 'grid' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredMachines.map((mac) => {
                              const isRunning = mac.status === "running";
                              const isMaintenance = mac.status === "maintenance";
                              const statusColor = 
                                mac.status === "idle" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" :
                                mac.status === "running" ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/40 animate-pulse" :
                                mac.status === "maintenance" ? "bg-amber-950/40 text-amber-400 border-amber-900/40" :
                                "bg-zinc-950 text-zinc-400 border-zinc-800";
                              
                              const statusLabel = 
                                mac.status === "idle" ? "جاهز للعمل (Idle)" :
                                mac.status === "running" ? "قيد التشغيل (Running)" :
                                mac.status === "maintenance" ? "تحت الصيانة (Maintenance)" :
                                "غير متصل (Offline)";

                              return (
                                <div key={mac.id} className="bg-zinc-950 border border-zinc-850/80 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[160px] text-right hover:border-zinc-700 transition-all shadow-md">
                                  <div>
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full flex items-center gap-1.5 ${statusColor}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {statusLabel}
                                      </span>
                                      <div className="text-right">
                                        <h4 className="text-sm font-bold text-zinc-100">{mac.name}</h4>
                                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{mac.type}</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs border-t border-zinc-900/60 pt-3">
                                      <div className="flex justify-between">
                                        <span className="font-mono text-zinc-300">{mac.workingHours.toFixed(1)} ساعة</span>
                                        <span className="text-zinc-500">إجمالي ساعات التشغيل:</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-zinc-300">
                                          {mac.currentJobId ? (
                                            <span className="font-mono text-indigo-400 font-bold">
                                              {productionJobs.find(j => j.id === mac.currentJobId)?.jobNo || "جاري..."}
                                            </span>
                                          ) : (
                                            "لا يوجد"
                                          )}
                                        </span>
                                        <span className="text-zinc-500">المهمة النشطة الحالية:</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 pt-4 mt-3 border-t border-zinc-900/60 text-xs">
                                    <button
                                      disabled={currentUser?.role === 'accountant'}
                                      onClick={() => handleChangeMachineMaintenance(mac.id, mac.status)}
                                      className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                        isMaintenance 
                                          ? "bg-amber-950/20 text-amber-400 border-amber-900/30 hover:bg-amber-950/40"
                                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
                                      } ${currentUser?.role === 'accountant' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {isMaintenance ? "تنشيط الآلة" : "وضع الصيانة 🛠️"}
                                    </button>
                                    {currentUser?.role === 'admin' && (
                                      <button
                                        onClick={() => handleDeleteMachine(mac.id)}
                                        className="px-3 py-1.5 bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-900/20 rounded-lg font-bold text-[11px] cursor-pointer transition-colors"
                                        title="حذف الماكينة"
                                      >
                                        حذف 🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Detailed List View */
                          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-md">
                            <div className="overflow-x-auto w-full">
                              <table className="w-full min-w-[650px] text-right text-xs">
                                <thead>
                                  <tr className="border-b border-zinc-850 bg-zinc-900/60 text-zinc-400 font-bold text-[11px]">
                                    <th className="p-2.5 sm:p-3 text-right">اسم الماكينة</th>
                                    <th className="p-2.5 sm:p-3 text-right">التقنية / النوع</th>
                                    <th className="p-2.5 sm:p-3 text-center">الحالة التشغيلية</th>
                                    <th className="p-2.5 sm:p-3 text-center font-mono">ساعات التشغيل</th>
                                    <th className="p-2.5 sm:p-3 text-right">المهمة الحالية</th>
                                    <th className="p-2.5 sm:p-3 text-center">الإجراءات</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                  {filteredMachines.map((mac) => {
                                    const isMaintenance = mac.status === "maintenance";
                                    const statusColor = 
                                      mac.status === "idle" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40" :
                                      mac.status === "running" ? "bg-[#c59257]/20 text-[#c59257] border-[#c59257]/30 animate-pulse" :
                                      mac.status === "maintenance" ? "bg-amber-950/40 text-amber-400 border-amber-900/40" :
                                      "bg-zinc-950 text-zinc-400 border-zinc-800";
                                    
                                    const statusLabel = 
                                      mac.status === "idle" ? "جاهز للعمل" :
                                      mac.status === "running" ? "قيد التشغيل" :
                                      mac.status === "maintenance" ? "صيانة" :
                                      "غير متصل";

                                    const currentJob = productionJobs.find(j => j.id === mac.currentJobId);

                                    return (
                                      <tr key={mac.id} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="p-2.5 sm:p-3 font-bold text-zinc-100 flex items-center gap-2">
                                          <Cpu className="w-4 h-4 text-[#c59257] shrink-0" />
                                          <span>{mac.name}</span>
                                        </td>
                                        <td className="p-2.5 sm:p-3 text-zinc-400 font-mono">{mac.type}</td>
                                        <td className="p-2.5 sm:p-3 text-center">
                                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border px-2 sm:px-2.5 py-0.5 rounded-full ${statusColor}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                            {statusLabel}
                                          </span>
                                        </td>
                                        <td className="p-2.5 sm:p-3 text-center font-mono text-zinc-300 font-semibold">
                                          {mac.workingHours.toFixed(1)} ساعة
                                        </td>
                                        <td className="p-2.5 sm:p-3">
                                          {currentJob ? (
                                            <span className="font-mono text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 rounded text-[11px]">
                                              #{currentJob.jobNo} - {currentJob.itemName}
                                            </span>
                                          ) : (
                                            <span className="text-zinc-600 text-[11px]">لا توجد مهمة نشطة</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 sm:p-3 text-center">
                                          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                            <button
                                              disabled={currentUser?.role === 'accountant'}
                                              onClick={() => handleChangeMachineMaintenance(mac.id, mac.status)}
                                              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border text-[9.5px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                                                isMaintenance 
                                                  ? "bg-amber-950/20 text-amber-400 border-amber-900/30 hover:bg-amber-950/40"
                                                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
                                              } ${currentUser?.role === 'accountant' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                              {isMaintenance ? "تنشيط الآلة" : "صيانة 🛠️"}
                                            </button>
                                            {currentUser?.role === 'admin' && (
                                              <button
                                                onClick={() => handleDeleteMachine(mac.id)}
                                                className="px-1.5 py-1 sm:px-2 sm:py-1 bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-900/20 rounded-lg font-bold text-[9.5px] sm:text-[10px] cursor-pointer transition-colors"
                                                title="حذف الماكينة"
                                              >
                                                حذف
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Active Cutting CNC Live Simulation Simulator */}
                  {activeRunningJob && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#09090b] border border-indigo-950 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
                      {/* Laser simulation visual canvas */}
                      <div className="lg:col-span-5 flex flex-col justify-between items-center bg-[#030305] border border-zinc-900 rounded-xl p-5 min-h-[300px] relative overflow-hidden order-2 lg:order-1">
                        <div className="flex justify-between items-center w-full shrink-0 mb-4">
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/30 border border-indigo-900/40 px-2 py-0.5 rounded uppercase select-none">
                            LASER COORDINATE SPEED: {(activeRunningJob.laserSpeed || 30)} mm/s
                          </span>
                          <span className="text-xs font-bold text-zinc-400">معاينة مسار شعاع CO2 المباشر</span>
                        </div>

                        {/* Interactive Grid with Cutting Pointer */}
                        <div className="w-52 h-52 border border-zinc-900 rounded bg-[#010102] relative flex items-center justify-center overflow-hidden">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:16px_16px]" />
                          
                          {/* SVG paths showing cut geometry */}
                          <svg className="w-full h-full absolute inset-0 stroke-indigo-500/10 fill-none" viewBox="0 0 200 200">
                            {/* Star / Gear representation */}
                            <polygon 
                              points="100,30 124,76 176,80 136,114 148,166 100,140 52,166 64,114 24,80 76,76" 
                              stroke="#6366f1" 
                              strokeWidth="0.8" 
                              strokeDasharray="4,4" 
                            />
                            {/* Outer Circle representation */}
                            <circle cx="100" cy="100" r="85" stroke="#f43f5e" strokeWidth="0.8" />
                          </svg>

                          {/* Dynamic Laser Travel Trails */}
                          <svg className="w-full h-full absolute inset-0 stroke-indigo-500 fill-none" viewBox="0 0 200 200">
                            {/* Continuous cutting effect trail */}
                            <path 
                              d={`M100 30 L${laserX} ${laserY}`} 
                              stroke="#a855f7" 
                              strokeWidth="1.5" 
                              className="opacity-40" 
                            />
                          </svg>

                          {/* Pulsing Red Laser Point */}
                          <div 
                            style={{ left: `${(laserX / 200) * 100}%`, top: `${(laserY / 200) * 100}%` }}
                            className="absolute w-3 h-3 bg-rose-500 rounded-full -ml-1.5 -mt-1.5 flex items-center justify-center shadow-lg shadow-rose-500/80 transition-all duration-300 ease-out"
                          >
                            <span className="absolute w-6 h-6 rounded-full bg-rose-500/40 animate-ping" />
                            <span className="w-1 h-1 bg-white rounded-full" />
                          </div>
                        </div>

                        <div className="text-center w-full mt-4 shrink-0">
                          <span className="text-[10px] text-zinc-600 font-mono block">CO2 FOCUS LENS CALIBRATION: X:{laserX} Y:{laserY}</span>
                        </div>
                      </div>

                      {/* Job Metadata & Console Terminal Outputs */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-6 order-1 lg:order-2 text-right">
                        <div>
                          <div className="flex justify-between items-start border-b border-zinc-900 pb-3 gap-3">
                            <span className="text-xs text-zinc-400 font-mono font-bold bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                              رقم المهمة: {activeRunningJob.jobNo}
                            </span>
                            <div className="space-y-0.5">
                              <h4 className="text-sm font-black text-zinc-100">{activeRunningJob.itemName}</h4>
                              <p className="text-xs text-zinc-500">
                                مرتبطة بالطلب: <strong className="text-indigo-400 font-mono">#{activeRunningJob.orderNumber}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                            <div className="bg-zinc-900/40 border border-zinc-850/80 p-2 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">شدة الليزر (Power)</span>
                              <strong className="text-xs font-mono text-zinc-200">{(activeRunningJob.laserPower || 80)}%</strong>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-850/80 p-2 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">سرعة التغذية (Speed)</span>
                              <strong className="text-xs font-mono text-zinc-200">{(activeRunningJob.laserSpeed || 30)} mm/s</strong>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-850/80 p-2 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">الوقت المنقضي</span>
                              <strong className="text-xs font-mono text-indigo-400">{(activeRunningJob.elapsedTimeSec || 0)} ثانية</strong>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-850/80 p-2 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">الوقت المتوقع</span>
                              <strong className="text-xs font-mono text-amber-500">{(activeRunningJob.estTimeSec || 90)} ثانية</strong>
                            </div>
                          </div>
                        </div>

                        {/* Real-time Scrolling G-Code commands stream */}
                        <div className="bg-black border border-zinc-900/80 rounded-xl p-4 font-mono text-[10px] text-zinc-500 h-40 overflow-y-auto space-y-1.5 flex flex-col justify-end">
                          {liveLogLines.map((ln, i) => (
                            <div key={i} className="leading-relaxed text-left truncate">
                              <span className="text-indigo-500/80 mr-1.5">●</span>
                              <span>{ln}</span>
                            </div>
                          ))}
                        </div>

                        {/* Progress and control actions */}
                        <div className="space-y-3.5">
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                              <span className="text-indigo-400 font-bold">{activeRunningJob.progress}%</span>
                              <span className="text-zinc-500">جاري قص المتجهات ونقش المادة...</span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-850">
                              <div 
                                style={{ width: `${activeRunningJob.progress}%` }}
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handlePauseProductionJob(activeRunningJob.id)}
                              className="px-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-850 text-rose-400 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              إيقاف مؤقت للماكينة ⏸️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Production Jobs and Waste Cost View */}
                  <ProductionJobView
                    productionJobs={productionJobs}
                    materials={materials}
                    machines={machines}
                    orders={orders}
                    exchangeRate={exchangeRate}
                    onUpdateJob={handleUpdateProductionJob}
                    onStartJob={handleStartProductionJob}
                    onPauseJob={handlePauseProductionJob}
                    onCompleteJob={handleDirectCompleteJob}
                    onReorderJobs={handleReorderProductionJobs}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                  />
                    </>
                  ) : (
                    <MachineCalibration
                      machines={machines}
                      onLogCalibration={(msg) => addTerminalLog("SYSTEM", msg)}
                      currentUser={currentUser}
                      remnants={remnants}
                      materials={materials}
                      onUpdateMachineCalibration={handleUpdateMachineCalibration}
                    />
                  )}
                </motion.div>
              )}

</>

  );
}

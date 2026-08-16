import { motion } from "motion/react";
import { Activity, Archive, Box, ChevronRight, Database, Download, Edit3, PlusCircle, RefreshCw, RotateCcw } from "lucide-react";
import OrderArchiveManager from "./OrderArchiveManager";

export default function DatabasePage(props: Record<string, any>) {
  const {
    USERS,
    activeView,
    addTerminalLog,
    archiveDaysThreshold,
    c,
    calculateOrderProgress,
    currentUser,
    customers,
    d,
    databaseTab,
    exchangeRate,
    executeTerminalCommand,
    fetchCustomers,
    fetchLogs,
    fetchOrders,
    getOrderStatusBadge,
    productionJobs,
    handleArchiveOrder,
    handleExportCustomersCSV,
    handleOpenEditCustomer,
    handleRestoreOrder,
    handleRunAutoArchive,
    logs,
    orderTabFilter,
    orders,
    pageTransition,
    pageVariants,
    products,
    setArchiveDaysThreshold,
    setDatabaseTab,
    setOrderTabFilter,
    setSelectedCustomerIdForOrder,
    setShowAddOrder
  } = props;

  return (
    <>
              {true && (
                <motion.div
                  key="database"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="p-6 space-y-6 font-sans"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-3 gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        سجل الطلبات والعملاء وأرشيف الورشة (AXIS Order & Customer Database)
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">إدارة الطلبات النشطة، سجل العملاء، وأرشيف الطلبات القديمة مع إمكانية الاستعادة التلقائية واليدوية</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          addTerminalLog("PRISMA", "Initializing dynamic SQL sync schema...");
                          fetchCustomers();
                          fetchOrders();
                          fetchLogs();
                        }}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded text-xs flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> مزامنة وتحديث
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tab Navigation Bar */}
                  <div className="flex items-center justify-between bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDatabaseTab("active");
                          setOrderTabFilter("active");
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          databaseTab === "active"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        <Box className="w-4 h-4 text-indigo-300" />
                        <span>⚡ الطلبات النشطة والعملاء ({orders.filter(o => !o.isArchived).length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setDatabaseTab("archived");
                          setOrderTabFilter("archived");
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          databaseTab === "archived"
                            ? "bg-amber-600 text-white shadow-md"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        <Archive className="w-4 h-4 text-amber-300" />
                        <span>📦 الأرشيف (الطلبات المؤرشفة) ({orders.filter(o => o.isArchived).length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setDatabaseTab("all");
                          setOrderTabFilter("all");
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          databaseTab === "all"
                            ? "bg-zinc-800 text-white shadow-md"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span>📑 جميع البيانات والجداول ({orders.length})</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono px-2 hidden lg:block">
                      تصفح وسجل الطلبات بتباين عالي وسرعة فائقة
                    </div>
                  </div>

                  {/* Top Order Archive Manager Component */}
                  <OrderArchiveManager
                    orders={orders}
                    onRefreshOrders={fetchOrders}
                    orderTabFilter={orderTabFilter}
                    setOrderTabFilter={(tab) => {
                      setOrderTabFilter(tab);
                      if (tab === "archived") setDatabaseTab("archived");
                      else if (tab === "active") setDatabaseTab("active");
                      else setDatabaseTab("all");
                    }}
                    archiveDaysThreshold={archiveDaysThreshold}
                    setArchiveDaysThreshold={setArchiveDaysThreshold}
                    onRestoreOrder={handleRestoreOrder}
                    onArchiveOrder={handleArchiveOrder}
                    onRunAutoArchive={handleRunAutoArchive}
                  />

                  {/* DEDICATED ARCHIVE TAB VIEW */}
                  {databaseTab === "archived" ? (
                    <div className="space-y-4">
                      <div className="bg-zinc-950 border border-amber-800/40 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-amber-950/40 px-4 py-3 border-b border-amber-800/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Archive className="w-4 h-4 text-amber-400" />
                            <span className="font-mono text-amber-300 font-bold text-sm">أرشيف الطلبات القديمة (Archived Orders Directory)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-900/80 text-amber-200 border border-amber-700/60">
                              {orders.filter(o => o.isArchived).length} طلبات مؤرشفة
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-400/80 font-medium">
                            يمكنك إعادة أي طلب إلى قائمة الطلبات النشطة في الورشة بضغطة زر
                          </p>
                        </div>

                        <div className="p-4 overflow-x-auto">
                          <table className="w-full text-right text-xs text-zinc-300 border-collapse min-w-[750px]">
                            <thead>
                              <tr className="border-b border-zinc-800 font-mono text-[11px] text-zinc-400 bg-zinc-900/60">
                                <th className="p-3">رقم الطلب / الكود</th>
                                <th className="p-3">اسم العميل</th>
                                <th className="p-3 text-center">حالة الطلب وقت الأرشفة</th>
                                <th className="p-3 text-right">السعر الإجمالي</th>
                                <th className="p-3 text-right">المتبقي</th>
                                <th className="p-3 text-center">تاريخ الأرشفة</th>
                                <th className="p-3 text-center">إجراء الاستعادة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {orders.filter(o => o.isArchived).length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                      <Archive className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
                                      <p className="font-bold text-zinc-300 text-sm">لا توجد طلبات مؤرشفة حالياً في الأرشيف.</p>
                                      <p className="text-xs text-zinc-500">الطلبات المكتملة القديمة ستنتقل تلقائياً هنا بعد مرور {archiveDaysThreshold} يوماً، أو يمكنك أرشفة أي طلب يدوياً.</p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                orders.filter(o => o.isArchived).map(o => {
                                  const cust = customers.find(c => c.id === o.customerId);
                                  return (
                                    <tr key={o.id} className="hover:bg-amber-950/10 transition-colors">
                                      <td className="p-3 font-mono font-bold text-amber-400">{o.orderNumber}</td>
                                      <td className="p-3 font-bold text-zinc-100">{cust?.name || "عميل غير مسمى"}</td>
                                      <td className="p-3 text-center">
                                        {(() => {
                                          const badge = getOrderStatusBadge(o.status);
                                          return (
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1.5 ${badge.bg}`}>
                                              {badge.icon}
                                              <span>{badge.text}</span>
                                            </span>
                                          );
                                        })()}
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        <div className="font-bold text-[#c59257]">
                                          {Math.round(Number(o.totalPrice || 0)).toLocaleString()} ل.س
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-normal">
                                          ${(Number(o.totalPrice || 0) / (exchangeRate || 135)).toFixed(2)}
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-mono">
                                        {o.remaining > 0 ? (
                                          <span className="text-rose-400 font-bold">{Math.round(Number(o.remaining || 0)).toLocaleString()} ل.س</span>
                                        ) : (
                                          <span className="text-emerald-400 font-bold">مسدد بالكامل</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-center font-mono text-[11px] text-zinc-400">
                                        {o.archivedAt ? new Date(o.archivedAt).toLocaleDateString("ar-SY") : (o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-SY") : "مؤرشف")}
                                      </td>
                                      <td className="p-3 text-center">
                                        <button
                                          onClick={() => handleRestoreOrder(o.id)}
                                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                          title="إعادة هذا الطلب إلى قائمة الطلبات النشطة في الورشة"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-amber-400 hover:text-white" />
                                          <span>استعادة للطلبات النشطة</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                      {/* Database schemas structure representation */}
                      <div className="xl:col-span-8 space-y-6">
                        
                        {/* Customers Table */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                          <div className="bg-zinc-900/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-400 font-bold">model Customer [PostgreSQL Table]</span>
                              <span className="text-[10px] text-zinc-500">{customers.length} Rows</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleExportCustomersCSV(customers)}
                              title="تصدير جدول العملاء كملف CSV لتسويق والتواصل والتدقيق الخارجي"
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-[#c59257] border border-zinc-800 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-[#c59257]" />
                              <span>تصدير CSV (Outreach)</span>
                            </button>
                          </div>
                          <div className="p-3 overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-400 border-collapse min-w-[680px]">
                              <thead>
                                <tr className="border-b border-zinc-850 font-mono text-[10px] text-zinc-500">
                                  <th className="p-2">ID (uuid)</th>
                                  <th className="p-2">Name (String)</th>
                                  <th className="p-2">Category (تصنيف)</th>
                                  <th className="p-2 font-mono">phone / whatsapp</th>
                                  <th className="p-2">Address</th>
                                  <th className="p-2 text-center">إجراء سريع</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customers.map(c => (
                                  <tr key={c.id} className="hover:bg-zinc-900/20 border-b border-zinc-900 last:border-0 text-[11px]">
                                    <td className="p-2 font-mono text-indigo-400">{c.id}</td>
                                    <td className="p-2 font-bold text-zinc-200">{c.name}</td>
                                    <td className="p-2">
                                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${
                                        (c.category || 'شركة') === 'شركة'
                                          ? 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                                          : (c.category || 'شركة') === 'أفراد'
                                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                                          : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                                      }`}>
                                        {c.category || 'شركة'}
                                      </span>
                                    </td>
                                    <td className="p-2 font-mono text-zinc-500">
                                      {currentUser?.role === 'accountant' ? "🔒 محمي" : `${c.phone} ${c.whatsapp ? `| ${c.whatsapp}` : ""}`}
                                    </td>
                                    <td className="p-2 truncate max-w-[150px]">
                                      {currentUser?.role === 'accountant' ? "🔒 محمي" : (c.address || "غير مسجل")}
                                    </td>
                                    <td className="p-2 text-center">
                                      {currentUser?.role !== 'accountant' && (
                                        <button
                                          onClick={() => handleOpenEditCustomer(c)}
                                          className="px-2 py-0.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ml-1"
                                          title="تعديل بيانات وتفاصيل العميل"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>تعديل</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedCustomerIdForOrder(c.id);
                                          setShowAddOrder(true);
                                        }}
                                        className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                        title="إنشاء طلب جديد فوري للعميل"
                                      >
                                        <PlusCircle className="w-3 h-3" />
                                        <span>طلب جديد</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Orders Table */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                          <div className="bg-zinc-900/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs">
                            <span className="font-mono text-indigo-400 font-bold">model Order [PostgreSQL Table]</span>
                            <span className="text-[10px] text-zinc-500">
                              {databaseTab === "active" ? orders.filter(o => !o.isArchived).length : orders.length} Rows
                            </span>
                          </div>
                          <div className="p-3 overflow-x-auto">
                            <table className="w-full text-left text-xs text-zinc-400 border-collapse min-w-[720px]">
                              <thead>
                                <tr className="border-b border-zinc-850 font-mono text-[10px] text-zinc-500">
                                  <th className="p-2">ID (uuid)</th>
                                  <th className="p-2">orderNumber</th>
                                  <th className="p-2">customerId</th>
                                  <th className="p-2 text-right">totalPrice</th>
                                  <th className="p-2">status</th>
                                  <th className="p-2 min-w-[120px]">progress</th>
                                  <th className="p-2 text-center">الأرشفة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(databaseTab === "active" ? orders.filter(o => !o.isArchived) : orders).map(o => (
                                  <tr key={o.id} className="hover:bg-zinc-900/20 border-b border-zinc-900 last:border-0 text-[11px]">
                                    <td className="p-2 font-mono text-zinc-600">{o.id}</td>
                                    <td className="p-2 font-mono font-bold text-zinc-200">{o.orderNumber}</td>
                                    <td className="p-2 font-mono text-indigo-400">{o.customerId}</td>
                                    <td className="p-2 text-right font-mono text-emerald-400">{Math.round(Number(o.totalPrice || 0)).toLocaleString()} ل.س</td>
                                    <td className="p-2">
                                      {(() => {
                                        const badge = getOrderStatusBadge(o.status);
                                        return (
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1.5 ${badge.bg}`}>
                                            {badge.icon}
                                            <span>{badge.text}</span>
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="p-2">
                                      {(() => {
                                        const prog = calculateOrderProgress(o, productionJobs);
                                        return (
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 bg-zinc-900 border border-zinc-800 rounded-full h-1.5 overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${
                                                  prog.percentage === 100
                                                    ? "bg-emerald-500"
                                                    : prog.percentage > 0
                                                    ? "bg-cyan-400 animate-pulse"
                                                    : "bg-zinc-800"
                                                }`}
                                                style={{ width: `${prog.percentage}%` }}
                                              />
                                            </div>
                                            <span className="font-mono text-[10px] text-zinc-400">{prog.percentage}%</span>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="p-2 text-center">
                                      {o.isArchived ? (
                                        <button
                                          onClick={() => handleRestoreOrder(o.id)}
                                          className="px-2 py-0.5 bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800/80 rounded text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                                        >
                                          <RotateCcw className="w-3 h-3 text-amber-400" />
                                          <span>استعادة</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleArchiveOrder(o.id)}
                                          className="px-2 py-0.5 bg-zinc-900 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] font-medium flex items-center gap-1 mx-auto cursor-pointer"
                                        >
                                          <Archive className="w-3 h-3" />
                                          <span>أرشفة</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      {/* Products Table */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-zinc-900/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between text-xs">
                          <span className="font-mono text-pink-400 font-bold">model Product [PostgreSQL Table]</span>
                          <span className="text-[10px] text-zinc-500">{products.length} Rows</span>
                        </div>
                        <div className="p-3 overflow-x-auto">
                          <table className="w-full text-left text-xs text-zinc-400 border-collapse min-w-[600px]">
                            <thead>
                              <tr className="border-b border-zinc-850 font-mono text-[10px] text-zinc-500">
                                <th className="p-2">ID (uuid)</th>
                                <th className="p-2">Name (String)</th>
                                <th className="p-2">Code (String)</th>
                                <th className="p-2 text-right">Price</th>
                                <th className="p-2 text-right">Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-900/20 border-b border-zinc-900 last:border-0 text-[11px]">
                                  <td className="p-2 font-mono text-pink-400">{p.id}</td>
                                  <td className="p-2 font-bold text-zinc-200">{p.name}</td>
                                  <td className="p-2 font-mono text-zinc-500">{p.code}</td>
                                  <td className="p-2 text-right font-mono text-emerald-400">${p.price.toFixed(2)}</td>
                                  <td className="p-2 text-right font-mono text-zinc-400">{p.stock || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>

                    {/* Right DB side tools & activity logs */}
                    <div className="xl:col-span-4 space-y-6">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#c59257]" />
                            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide">سجل الشفافية والعمليات (Audit Logs)</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{logs.length} سجلات</span>
                        </div>

                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {logs.map((lg) => {
                            const user = USERS.find(u => u.id === lg.userId);
                            const isOrderEdit = lg.action === "UPDATE_ORDER" || lg.action === "RECORD_PAYMENT" || lg.action === "DELETE_PAYMENT";
                            return (
                              <div key={lg.id} className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800 text-[11px] space-y-1.5 shadow-sm">
                                <div className="flex justify-between items-center text-zinc-400 font-mono text-[9px]">
                                  <span className="font-bold text-zinc-300">{user?.fullName || "نظام الورشة"}</span>
                                  <span>{new Date(lg.createdAt).toLocaleString('ar-EG')}</span>
                                </div>
                                <div className="font-bold text-zinc-200 flex items-center justify-between gap-2">
                                  <span className={`text-xs ${isOrderEdit ? "text-[#c59257]" : "text-indigo-400"}`}>
                                    {lg.action === "UPDATE_ORDER" ? "تعديل ماليات/بيانات طلب" :
                                     lg.action === "RECORD_PAYMENT" ? "تسجيل دفعة مالية" :
                                     lg.action === "DELETE_PAYMENT" ? "إلغاء سند قبض" :
                                     lg.action === "UPDATE_ORDER_STATUS" ? "تغيير حالة طلب" :
                                     lg.action === "CREATE_ORDER" ? "إنشاء طلب جديد" :
                                     lg.action}
                                  </span>
                                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                    {lg.entityType} #{lg.entityId.length > 8 ? lg.entityId.substring(0, 8) + '...' : lg.entityId}
                                  </span>
                                </div>
                                {lg.details && (
                                  <div className="text-[10px] text-amber-200/90 bg-amber-950/20 p-2 rounded-lg border border-amber-900/30 font-sans leading-relaxed text-right space-y-1">
                                    {lg.details.split(" | ").map((d, dIdx) => (
                                      <div key={dIdx} className="flex items-start gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#c59257] shrink-0 mt-1" />
                                        <span className="font-medium">{d}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prisma Quick Actions */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
                        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-mono block border-b border-zinc-900 pb-2">Prisma CLI Helpers</span>
                        <p className="text-zinc-500 text-[11px] leading-relaxed">بإمكانك ترحيل أو توليد الأكواد البرمجية مباشرة عبر إرسال الأوامر الآتية لنظام التشغيل:</p>
                        
                        <div className="space-y-1.5 font-mono text-[11px]">
                          <button
                            onClick={() => executeTerminalCommand("npx prisma generate")}
                            className="w-full text-left p-2 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-indigo-400 transition-colors flex items-center justify-between"
                          >
                            <span>npx prisma generate</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => executeTerminalCommand("npx prisma migrate dev")}
                            className="w-full text-left p-2 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors flex items-center justify-between"
                          >
                            <span>npx prisma migrate dev</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </motion.div>
              )}

              {/* PRODUCTS DIRECTORY VIEW */}

    </>
  );
}

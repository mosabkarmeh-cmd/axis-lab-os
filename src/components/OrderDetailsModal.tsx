import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Box,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileDown,
  FolderOpen,
  History,
  Info,
  Layers,
  List,
  Play,
  Printer,
  Receipt,
  RefreshCw,
  Scissors,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { FileUploader } from "./FileUploader";

export default function OrderDetailsModal(props: Record<string, any>) {
  const {
    USERS,
    activeView,
    addTerminalLog,
    appendEditOrderDraftItem,
    calculateOrderProgress,
    companySettings,
    currentUser,
    customers,
    deleteConfirmTarget,
    deliveryBlockedOrder,
    editCustAddress,
    editCustCategory,
    editCustCompany,
    editCustEmail,
    editCustName,
    editCustNotes,
    editCustPhone,
    editCustWhatsapp,
    editFocusedItemIdx,
    editOrderDiscountAmountVal,
    editOrderItems,
    editOrderRemaining,
    editOrderSubtotal,
    editOrderTaxAmount,
    editOrderTaxPercentVal,
    editOrderTotalPrice,
    editingCustomer,
    editingOrder,
    editingProduct,
    adjustQty,
    adjustReason,
    adjustType,
    aiClassificationResult,
    editingMaterial,
    getPaymentStatusBadge,
    isAiClassifying,
    isCurrencyConverterOpen,
    isSubmittingSmartSupply,
    jobRemHeight,
    jobRemLocation,
    jobRemWidth,
    matCategory,
    matColor,
    matHeight,
    matLocation,
    matMinStock,
    matNotes,
    matPrice,
    matSubCategory,
    matSupplierId,
    matThickness,
    matUnit,
    matWidth,
    materials,
    newJobEstTime,
    newJobItemName,
    newJobLaserPower,
    newJobLaserSpeed,
    newJobMaterialId,
    newJobOrderId,
    priceComparisonMaterial,
    productionJobs,
    setAdjustQty,
    setAdjustReason,
    setAdjustType,
    setAiClassificationResult,
    setEditingMaterial,
    setIsCurrencyConverterOpen,
    setJobRemHeight,
    setJobRemLocation,
    setJobRemWidth,
    setMatCategory,
    setMatColor,
    setMatHeight,
    setMatLocation,
    setMatMinStock,
    setMatName,
    setMatNotes,
    setMatPrice,
    setMatSubCategory,
    setMatSupplierId,
    setMatThickness,
    setMatUnit,
    setMatWidth,
    setNewJobEstTime,
    setNewJobItemName,
    setNewJobLaserPower,
    setNewJobLaserSpeed,
    setNewJobMaterialId,
    setNewJobOrderId,
    setPriceComparisonMaterial,
    setShowAddJob,
    setShowAddMaterial,
    setShowAdjustStock,
    setShowRemnantRegister,
    setShowSmartSupplyModal,
    setSmartSupplyItems,
    showAddJob,
    showAddMaterial,
    showAdjustStock,
    showRemnantRegister,
    showSmartSupplyModal,
    smartSupplyItems,
    suppliers,
    err,
    exchangeRate,
    fetchCustomers,
    fetchLogs,
    fetchOrders,
    handleAdjustStockSubmit,
    handleAiClassifyMaterial,
    handleAssignOrderWorkers,
    handleRateOrder,
    handleCompileOrderGCode,
    handleCopyText,
    handleCreateDirectSupplyOrder,
    handleCreateMaterial,
    handleCreateProduct,
    handleCreateProductionJob,
    handleCreateRemnant,
    handleDeleteCustomer,
    handleDeletePayment,
    handleDeleteProduct,
    handleDirectCompleteJob,
    handleEditOrderSubmit,
    handleExecuteSmartSupplyOrders,
    handleRecordPaymentSubmit,
    handleRegisterRemnantOnJobComplete,
    handleSaveEditCustomer,
    handleSendEmailShare,
    handleSettleRemainingAndDeliver,
    handleUpdateItemProgress,
    handleUpdateMaterial,
    handleUpdateProduct,
    isCompilingOrderGcode,
    isHelpGuideOpen,
    isProcessingQuickFullPay,
    isQuickActionsOpen,
    isSearchPaletteOpen,
    isSearching,
    isSharingEmail,
    matName,
    newPaymentAmount,
    newPaymentNotes,
    newPaymentSYPAmount,
    orderDetailsTab,
    orderGcodeResult,
    orders,
    pageTransition,
    pageVariants,
    paymentInputCurrency,
    printTicketOrder,
    prodCategory,
    prodCode,
    prodDescription,
    prodName,
    prodPrice,
    prodStock,
    products,
    progressModalOrder,
    qty,
    refreshInventoryData,
    remHeight,
    remLocation,
    remMatId,
    remQty,
    remWidth,
    removeEditOrderDraftItem,
    renderCutProgressInteractiveTable,
    reserved,
    rows,
    searchQuery,
    searchResults,
    selectedCustomerFiles,
    selectedCustomerIdForOrder,
    selectedMaterialFiles,
    selectedOrder,
    selectedPaymentMethod,
    selectedPaymentReceipt,
    selectedProductFiles,
    setActiveView,
    setDeleteConfirmTarget,
    setDeliveryBlockedOrder,
    setEditCustAddress,
    setEditCustCategory,
    setEditCustCompany,
    setEditCustEmail,
    setEditCustName,
    setEditCustNotes,
    setEditCustPhone,
    setEditCustWhatsapp,
    setEditFocusedItemIdx,
    setEditOrderItems,
    setEditingCustomer,
    setEditingOrder,
    setEditingProduct,
    setIsHelpGuideOpen,
    setIsQuickActionsOpen,
    setIsSearchPaletteOpen,
    setNewPaymentAmount,
    setNewPaymentNotes,
    setNewPaymentSYPAmount,
    setOrderDetailsTab,
    setPaymentInputCurrency,
    setPrintTicketOrder,
    setProdCategory,
    setProdCode,
    setProdDescription,
    setProdName,
    setProdPrice,
    setProdStock,
    setProgressModalOrder,
    setRemHeight,
    setRemLocation,
    setRemMatId,
    setRemQty,
    setRemWidth,
    setSearchQuery,
    setSearchResults,
    setSelectedCustomerFiles,
    setSelectedCustomerIdForOrder,
    setSelectedMaterialFiles,
    setSelectedOrder,
    setSelectedPaymentMethod,
    setSelectedPaymentReceipt,
    setSelectedProductFiles,
    setShareBody,
    setShareEmail,
    setShareEmailSuccess,
    setShareMethod,
    setShareSubject,
    setShowAddOrder,
    setShowAddProduct,
    setShowAddRemnant,
    setShowHelpModal,
    setShowShareModal,
    shareBody,
    shareEmail,
    shareEmailSuccess,
    shareMethod,
    shareMsgCopied,
    sharePdfCopied,
    shareSubject,
    showAddOrder,
    showAddProduct,
    showAddRemnant,
    showHelpModal,
    showShareModal,
    time,
    updateEditOrderDraftItem,
    updateRate
  } = props;

  const [ratingNotesDraft, setRatingNotesDraft] = useState("");
  const orderPaymentRate = Number(selectedOrder?.exchangeRateAtFinalization || selectedOrder?.exchangeRateAtIssue || exchangeRate || 135);
  const orderRemainingSYP = Math.max(0, Math.round(Number(selectedOrder?.remainingSYP ?? selectedOrder?.remaining ?? 0)));
  const orderRemainingUSD = Math.max(0, Number(selectedOrder?.remainingUSD ?? (orderRemainingSYP / orderPaymentRate)));

  return (
    <>
      {/* 👁️ ORDER DETAILS MODAL (WITH TABS) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900 text-[10px] font-mono font-bold">
                    {selectedOrder.status.toUpperCase()}
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    تفاصيل ومستندات الطلب: <span className="font-mono text-indigo-400">{selectedOrder.orderNumber}</span>
                  </h3>
                </div>
              </div>

              {/* Dual Progress Indicator Bar */}
              {(() => {
                const prog = calculateOrderProgress(selectedOrder, productionJobs);
                const isComplete = prog.percentage === 100;
                const isInProgress = prog.percentage > 0 && prog.percentage < 100;
                const payBadge = getPaymentStatusBadge(selectedOrder.paidAmount, selectedOrder.totalPrice);

                return (
                  <div className="bg-zinc-950/90 border-b border-zinc-900 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Payment badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-medium text-[11px]">حالة الدفع المالي:</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${payBadge.bg}`}>
                        {payBadge.icon}
                        <span>{payBadge.text}</span>
                        {selectedOrder.remaining > 0.01 && (
                          <span className="font-mono text-rose-300 mr-1">
                            (متبقي ${(Number(selectedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Production progress gauge */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-zinc-400 font-medium">نسبة إنجاز القص:</span>
                        <span className={`font-mono font-bold ${isComplete ? "text-emerald-400" : isInProgress ? "text-cyan-300 font-extrabold" : "text-zinc-500"}`}>
                          {prog.percentage}% ({prog.completedUnits}/{prog.totalUnits} قطعة)
                        </span>
                      </div>
                      <div className="w-28 sm:w-40 bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5 relative shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                              : isInProgress
                              ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                              : "bg-zinc-800"
                          }`}
                          style={{ width: `${Math.max(prog.percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tabs selector */}
              <div className="px-6 bg-zinc-950 border-b border-zinc-900 flex items-center justify-end gap-1.5 shrink-0 overflow-x-auto text-xs py-1">
                {[
                  { id: "timeline", label: "سجل العمليات والنشاط", icon: Clock },
                  { id: "gcode", label: "كود القص G-Code الذكي", icon: Scissors },
                  ...(currentUser?.role !== "employee" ? [{ id: "payments", label: "المدفوعات والحالة المالية", icon: DollarSign }] : []),
                  { id: "files", label: "الملفات والوثائق الملحقة", icon: FolderOpen },
                  { id: "items", label: "المواد وعناصر القطع", icon: Info },
                  { id: "team", label: "الفريق والتقييم", icon: Users }
                ].map((tb) => {
                  const Icon = tb.icon;
                  const isSel = orderDetailsTab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setOrderDetailsTab(tb.id as any)}
                      className={`px-3 py-2 border-b-2 flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                        isSel
                          ? "border-indigo-500 text-indigo-400 bg-indigo-950/10"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span>{tb.label}</span>
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Content Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* 1. Items & Client details Tab */}
                {orderDetailsTab === "items" && (
                  <div className="space-y-6">
                    {/* Customer overview card */}
                    {(() => {
                      const cust = customers.find(c => c.id === selectedOrder.customerId);
                      return (
                        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-2">
                            <h4 className="text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex items-center justify-end gap-1.5">
                              <span>بيانات العميل</span>
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                            </h4>
                            <div className="flex justify-between">
                              <span className="font-semibold text-zinc-200">{cust?.name || "عميل عام"}</span>
                              <span className="text-zinc-500">اسم العميل:</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-zinc-300">{cust?.phone || "غير متوفر"}</span>
                              <span className="text-zinc-500">رقم الهاتف:</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-300">{cust?.company || "لا يوجد"}</span>
                              <span className="text-zinc-500">الشركة / الورشة:</span>
                            </div>
                          </div>

                          <div className="space-y-2 col-span-1">
                            <h4 className="text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex items-center justify-end gap-1.5">
                              <span>جدولة وتفاصيل التصنيع</span>
                              <Wrench className="w-3.5 h-3.5 text-rose-400" />
                            </h4>
                            <div className="flex justify-between">
                              <span className="font-mono uppercase font-semibold text-rose-400">{selectedOrder.priority}</span>
                              <span className="text-zinc-500">أولوية التشغيل:</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-mono text-zinc-300">
                                {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}
                              </span>
                              <span className="text-zinc-500">تاريخ الإدخال:</span>
                            </div>
                            {selectedOrder.deliveryDateExpected && (
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                                  {(() => {
                                    const diff = new Date(selectedOrder.deliveryDateExpected).getTime() - Date.now();
                                    if (selectedOrder.status === "delivered") {
                                      return <span className="text-emerald-400 font-sans font-semibold">تم التسليم بنجاح</span>;
                                    }
                                    if (diff < 0) {
                                      return <span className="text-rose-500 font-sans font-semibold">متأخر عن موعده!</span>;
                                    }
                                    const hours = Math.floor(diff / 3600000);
                                    const days = Math.floor(hours / 24);
                                    const remHours = hours % 24;
                                    return (
                                      <span className="text-amber-400 font-sans font-medium">
                                        متبقي {days > 0 ? `${days} يوم و ` : ""}{remHours} ساعة
                                      </span>
                                    );
                                  })()}
                                  <span className="text-zinc-700">|</span>
                                  <span>{new Date(selectedOrder.deliveryDateExpected).toLocaleDateString('ar-EG')}</span>
                                </span>
                                <span className="text-zinc-500">تاريخ التسليم المتوقع:</span>
                              </div>
                            )}
                            {selectedOrder.deliveryDateActual && (
                              <div className="flex justify-between">
                                <span className="font-mono text-emerald-400">
                                  {new Date(selectedOrder.deliveryDateActual).toLocaleString('ar-EG')}
                                </span>
                                <span className="text-zinc-500">تاريخ التسليم الفعلي:</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Order Items & Materials Production Progress (توسيع متابعة وإنجاز أجزاء ومواد الطلب والتكرارات) */}
                    {(() => {
                      const prog = calculateOrderProgress(selectedOrder, productionJobs);
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono">
                                Multi-Material Precision Engine
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                              <span>متابعة وتفصيل نسبة الإنتاج حسب المواد والقطع والتكرارات</span>
                              <Scissors className="w-4 h-4 text-cyan-400" />
                            </h4>
                          </div>

                          {/* Top Production Overview Card */}
                          <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-1.5">
                                <div className="text-zinc-200 font-bold flex items-center gap-2">
                                  <span>نسبة إنجاز الطلب الإجمالية:</span>
                                  <span className="text-cyan-400 font-mono font-extrabold text-base bg-cyan-950/60 px-2.5 py-0.5 border border-cyan-800/60 rounded-lg">
                                    {prog.percentage}%
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-300 flex flex-wrap items-center gap-2 font-sans">
                                  <span>عدد الخامات: <strong className="text-indigo-300 font-mono">{prog.materialsBreakdown.length}</strong></span>
                                  <span>•</span>
                                  <span>المنجز: <strong className="text-emerald-400 font-mono">{prog.completedUnits} / {prog.totalUnits}</strong> قطعة</span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 bg-amber-950/70 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded-md font-bold">
                                    <Scissors className="w-3 h-3 text-amber-400" />
                                    <span>المتبقي للقص: <strong className="font-mono text-white">{prog.remainingUnits}</strong> قطعة</span>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemProgress(selectedOrder.id, { setAllCompleted: true })}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                                  title="تحديد كافة الخامات والأجزاء كمكتملة بنسبة 100%"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>إنجاز كافة المواد والقطع (100%)</span>
                                </button>
                              </div>
                            </div>

                            {/* Overall Progress Gauge */}
                            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5 relative shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  prog.percentage === 100 
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" 
                                    : prog.percentage > 0 
                                    ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                                    : "bg-zinc-800"
                                }`}
                                style={{ width: `${Math.max(prog.percentage, 2)}%` }}
                              />
                            </div>
                          </div>

                          {/* Section 1: Breakdown by Materials (تفصيل حسب نوع وسماكة المادة) */}
                          {prog.materialsBreakdown.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 font-mono">Material-Wise Production Gauge</span>
                                <span className="flex items-center gap-1">
                                  <span>توزيع المنجز والمتبقي حسب نوع وسماكة المواد الخام</span>
                                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                                </span>
                              </h5>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {prog.materialsBreakdown.map((m: any, mIdx: number) => {
                                  const isAcrylic = /أكريليك|اكريليك/i.test(m.materialName);
                                  const isWood = /خشب|mdf/i.test(m.materialName);
                                  const isLeather = /جلد/i.test(m.materialName);

                                  return (
                                    <div
                                      key={mIdx}
                                      className={`p-3 rounded-xl border transition-all ${
                                        m.isCompleted
                                          ? "bg-emerald-950/20 border-emerald-800/60"
                                          : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          {isAcrylic && <Sparkles className="w-4 h-4 text-pink-400" />}
                                          {isWood && <Layers className="w-4 h-4 text-amber-400" />}
                                          {isLeather && <Scissors className="w-4 h-4 text-orange-400" />}
                                          {!isAcrylic && !isWood && !isLeather && <Layers className="w-4 h-4 text-cyan-400" />}
                                          <span className="font-bold text-xs text-zinc-200">{m.materialName}</span>
                                        </div>
                                        <span className={`font-mono text-xs font-bold ${m.isCompleted ? "text-emerald-400" : "text-cyan-300"}`}>
                                          {m.percentage}%
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 font-sans">
                                        <div className="flex items-center gap-2">
                                          <span>المنجز: <strong className="text-zinc-200 font-mono">{m.completedUnits}/{m.totalUnits}</strong></span>
                                          {m.remainingUnits > 0 ? (
                                            <span className="text-amber-400 font-bold bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded text-[10px]">
                                              متبقي {m.remainingUnits} قطعة
                                            </span>
                                          ) : (
                                            <span className="text-emerald-400 font-bold text-[10px]">مكتمل ✓</span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          disabled={m.isCompleted}
                                          onClick={() => handleUpdateItemProgress(selectedOrder.id, { materialName: m.materialName, completedQuantity: m.totalUnits })}
                                          className="px-2 py-0.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded text-[9px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
                                        >
                                          إنجاز المادة (100%)
                                        </button>
                                      </div>

                                      <div className="w-full bg-zinc-900 border border-zinc-850 rounded-full h-2 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            m.isCompleted ? "bg-emerald-500" : m.percentage > 0 ? "bg-cyan-400" : "bg-zinc-800"
                                          }`}
                                          style={{ width: `${Math.max(m.percentage, 3)}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section 2: Interactive Table - شو يلي انقص وشو يلي لسا */}
                          {renderCutProgressInteractiveTable(selectedOrder)}
                        </div>
                      );
                    })()}

                    {/* Notes Box */}
                    {selectedOrder.notes && (
                      <div className="bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-lg">
                        <span className="text-[11px] text-amber-400 font-bold block mb-1">تعليمات التصنيع والقص العامة:</span>
                        <p className="text-xs text-zinc-300 leading-relaxed">{selectedOrder.notes}</p>
                      </div>
                    )}

                    {/* 🧠 الذكاء السياقي ومساحة العمل الديناميكية */}
                    <div className="border-t border-zinc-800 pt-5 mt-4 space-y-4 font-sans text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-mono">Dynamic Contextual Assistance (10x UX Engine)</span>
                        <h4 className="text-xs font-bold text-[#c59257] flex items-center gap-1.5 justify-end">
                          <span>الذكاء السياقي للعميل والمخزون</span>
                          <Sparkles className="w-4 h-4 text-[#c59257] animate-pulse" />
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Right column: Customer Order History (آخر 5 طلبات للعميل) */}
                        <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl space-y-3">
                          <h5 className="text-[11px] font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/30 px-1.5 py-0.5 rounded">
                              {orders.filter(o => o.customerId === selectedOrder.customerId && o.id !== selectedOrder.id).length} طلبات سابقة
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span>سجل طلبات العميل الأخيرة</span>
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            </span>
                          </h5>

                          {(() => {
                            const customerOrders = orders
                              .filter(o => o.customerId === selectedOrder.customerId && o.id !== selectedOrder.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .slice(0, 3);

                            if (customerOrders.length === 0) {
                              return (
                                <p className="text-[10px] text-zinc-500 text-center py-4">
                                  لا توجد طلبات سابقة مسجلة لهذا العميل. هذا هو الطلب الأول له!
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {customerOrders.map((o) => (
                                  <div key={o.id} className="p-2 rounded bg-zinc-900/40 border border-zinc-900 flex justify-between items-center text-[11px]">
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono ${
                                        o.status === 'delivered' || o.status === 'ready'
                                          ? 'bg-emerald-950/40 text-emerald-400'
                                          : 'bg-amber-950/40 text-amber-400'
                                      }`}>
                                        {o.status === 'delivered' ? 'تم التسليم' : o.status === 'ready' ? 'جاهز' : 'قيد المعالجة'}
                                      </span>
                                      <span className="text-zinc-500">|</span>
                                      <span className="text-zinc-300 font-bold font-mono">${o.totalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-semibold text-zinc-300 block">{o.orderNumber}</span>
                                      <span className="text-[9px] text-zinc-500 font-mono">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Left column: Material stock level (حالة المخزون المتوقع لخامات الطلب) */}
                        <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl space-y-3">
                          <h5 className="text-[11px] font-bold text-zinc-300 border-b border-zinc-900 pb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#c59257] bg-amber-950/30 px-1.5 py-0.5 rounded">
                              مزامنة حية لعدد الألواح
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span>مخزون خامات التصنيع المطلوبة</span>
                              <Layers className="w-3.5 h-3.5 text-[#c59257]" />
                            </span>
                          </h5>

                          {(() => {
                            // Find materials matching products in the order
                            const matchedMaterials = selectedOrder.items.flatMap(item => {
                              const pName = item.productName.toLowerCase();
                              return materials.filter(m => {
                                const mName = m.name.toLowerCase();
                                return mName.includes(pName) || pName.includes(mName) || 
                                       (m.category && pName.includes(m.category.toLowerCase()));
                              });
                            });

                            // Remove duplicates
                            const uniqueMatched = Array.from(new Set(matchedMaterials.map(m => m.id)))
                              .map(id => matchedMaterials.find(m => m.id === id))
                              .filter(Boolean)
                              .slice(0, 3);

                            if (uniqueMatched.length === 0) {
                              return (
                                <p className="text-[10px] text-zinc-500 text-center py-4">
                                  لا تتوفر تفاصيل مخزون دقيقة مطابقة مباشرة لاسم الصنف. يرجى مراجعة قسم "المنتجات والمستودع" للتأكد يدويًا.
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {uniqueMatched.map((m: any) => {
                                  const inv = m.inventory || { quantity: 0, reserved: 0, location: "غير محدد" };
                                  const avail = inv.quantity - inv.reserved;
                                  const isLow = avail <= (m.minimumStock || 0);

                                  return (
                                    <div key={m.id} className="p-2 rounded bg-zinc-900/40 border border-zinc-900 flex justify-between items-center text-[11px]">
                                      <div className="text-left">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                          isLow ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' : 'bg-emerald-950/40 text-emerald-400'
                                        }`}>
                                          {avail} لوح متوفر
                                        </span>
                                        {inv.location && (
                                          <span className="text-[9px] text-zinc-500 block mt-1">الرف: {inv.location}</span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <span className="font-semibold text-zinc-300 block">{m.name}</span>
                                        <span className="text-[9px] text-zinc-500">{m.thickness} مم | {m.color}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team assignment & manager rating Tab */}
                {orderDetailsTab === "team" && selectedOrder && (() => {
                  const assignableUsers = (USERS || []).filter((u: any) => u.role === "admin" || u.role === "employee");
                  const isAdmin = currentUser?.role === "admin";
                  const stages: { key: "designerId" | "cutterId" | "assemblerId"; label: string; ratingKey: "designRating" | "cuttingRating" | "assemblyRating" }[] = [
                    { key: "designerId", label: "المصمم", ratingKey: "designRating" },
                    { key: "cutterId", label: "عامل القص", ratingKey: "cuttingRating" },
                    { key: "assemblerId", label: "عامل التجميع", ratingKey: "assemblyRating" },
                  ];
                  return (
                    <div className="space-y-6">
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-400" /> تعيين فريق العمل على الطلب
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {stages.map((stage) => (
                            <div key={stage.key}>
                              <label className="text-xs text-zinc-500 mb-1.5 block">{stage.label}</label>
                              <select
                                value={selectedOrder[stage.key] || ""}
                                onChange={(e) => handleAssignOrderWorkers(selectedOrder.id, { [stage.key]: e.target.value || null })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">بدون تعيين</option>
                                {assignableUsers.map((u: any) => (
                                  <option key={u.id} value={u.id}>{u.fullName}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="bg-zinc-900/50 border border-amber-900/30 rounded-xl p-5">
                          <h4 className="text-sm font-bold text-zinc-200 mb-1 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" /> تقييم المدير (خاص بالمدير فقط)
                          </h4>
                          <p className="text-xs text-zinc-500 mb-4">تقييم جودة الأداء بكل مرحلة، من 1 إلى 5 نجوم.</p>
                          <div className="space-y-4">
                            {stages.map((stage) => {
                              const currentValue = Number(selectedOrder[stage.ratingKey] || 0);
                              return (
                                <div key={stage.ratingKey} className="flex items-center justify-between">
                                  <span className="text-sm text-zinc-300">{stage.label}</span>
                                  <div className="flex items-center gap-1" dir="ltr">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRateOrder(selectedOrder.id, { [stage.ratingKey]: star === currentValue ? null : star, ratingNotes: ratingNotesDraft || selectedOrder.ratingNotes })}
                                        className="p-0.5"
                                        title={`${star} نجوم`}
                                      >
                                        <Sparkles className={`w-5 h-5 ${star <= currentValue ? "text-amber-400 fill-amber-400" : "text-zinc-700"}`} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4">
                            <label className="text-xs text-zinc-500 mb-1.5 block">ملاحظات التقييم</label>
                            <textarea
                              defaultValue={selectedOrder.ratingNotes || ""}
                              onChange={(e) => setRatingNotesDraft(e.target.value)}
                              onBlur={(e) => { if (e.target.value !== (selectedOrder.ratingNotes || "")) handleRateOrder(selectedOrder.id, { ratingNotes: e.target.value }); }}
                              rows={2}
                              placeholder="ملاحظات حول جودة التصميم أو القص أو التجميع..."
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-600"
                            />
                          </div>
                          {selectedOrder.ratedAt && (
                            <p className="text-[11px] text-zinc-600 mt-3">
                              آخر تقييم: {new Date(selectedOrder.ratedAt).toLocaleString("ar-EG")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 text-center text-xs text-zinc-500">
                          تقييم أداء الطلب متاح للمدير فقط.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Payments Tab */}
                {orderDetailsTab === "payments" && (
                  <div className="space-y-6">
                    {/* Delivery Enforcement Alert Banner */}
                    {selectedOrder.remaining > 0.01 ? (
                      <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-center justify-between gap-3 text-right">
                        <div className="flex items-center gap-2 text-rose-300">
                          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                          <div>
                            <span className="font-bold text-xs block text-rose-200">حظر تسليم الطلب غير المسدد</span>
                            <span className="text-[11px] text-rose-300/80 block">
                              يتبقى رصيد معلق قدره <strong className="font-mono text-rose-200 font-extrabold">{Math.round(Number(selectedOrder.remaining || 0)).toLocaleString()} ل.س (${(Number(selectedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)} USD)</strong>. النظام يمنع تحويل الحالة إلى (تم التسليم) لحين استيفاء كامل المبلغ.
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPaymentAmount((Number(selectedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2));
                            setNewPaymentSYPAmount(Math.round(Number(selectedOrder.remaining || 0)).toString());
                            setNewPaymentNotes("تسديد كامل المتبقي لاستيفاء الشروط وتسليم الطلب");
                          }}
                          className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-100 rounded-lg text-[10px] font-bold border border-rose-700/60 transition-all cursor-pointer shrink-0"
                        >
                          تعبئة المتبقي فورياً
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl flex items-center gap-3 text-right">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-xs block text-emerald-200">حالة الدفعات: مكتملة وسليمة 100%</span>
                          <span className="text-[11px] text-emerald-300/80 block">
                            تم استيفاء كامل القيمة الماليّة للطلب. لا يوجد أي مانع مالي لتسليم الطلب للعميل.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Financial Metrics & Progress Bar */}
                    {(() => {
                      const paidPct = Math.min(100, Math.round((selectedOrder.paidAmount / selectedOrder.totalPrice) * 100)) || 0;
                      return (
                        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl space-y-3">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
                              <span className="text-[10px] text-zinc-500 block mb-0.5">إجمالي التكلفة</span>
                              <strong className="text-base font-mono text-zinc-200 block">{Math.round(Number(selectedOrder.totalPrice || 0)).toLocaleString()} ل.س</strong>
                              <span className="text-[10px] text-zinc-500 font-mono block">${(Number(selectedOrder.totalPrice || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                            </div>
                            <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
                              <span className="text-[10px] text-zinc-500 block mb-0.5">المبلغ المقبوض</span>
                              <strong className="text-base font-mono text-emerald-400 block">{Math.round(Number(selectedOrder.paidAmount || 0)).toLocaleString()} ل.س</strong>
                              <span className="text-[10px] text-emerald-500 font-mono font-bold block">${(Number(selectedOrder.paidAmount || 0) / (exchangeRate || 135)).toFixed(2)} USD ({paidPct}%)</span>
                            </div>
                            <div className="bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg">
                              <span className="text-[10px] text-zinc-500 block mb-0.5">المتبقي المستحق</span>
                              <strong className="text-base font-mono text-rose-400 block">{Math.round(Number(selectedOrder.remaining || 0)).toLocaleString()} ل.س</strong>
                              <span className="text-[10px] text-rose-500 font-mono font-bold block">${(Number(selectedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Progress gauge */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                              <span>نسبة التسديد المالي: {paidPct}%</span>
                              <span>سعر الصرف المعتمد: $1 = {exchangeRate.toLocaleString()} ل.س</span>
                            </div>
                            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  paidPct === 100
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    : paidPct > 0
                                    ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                    : "bg-rose-600"
                                }`}
                                style={{ width: `${Math.max(paidPct, 3)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Payment Form */}
                    {selectedOrder.remaining > 0.01 ? (
                      <form onSubmit={handleRecordPaymentSubmit} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-400 ml-1">عملة الإدخال:</span>
                            <button
                              type="button"
                              onClick={() => setPaymentInputCurrency("USD")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                paymentInputCurrency === "USD"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              $ USD (دولار)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentInputCurrency("SYP")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                paymentInputCurrency === "SYP"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              ل.س SYP (ليرة سورية)
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                            <span>تسجيل إيصال مقبوضات جديد</span>
                            <Coins className="w-4 h-4 text-emerald-400" />
                          </h4>
                        </div>

                        {/* Presets Shortcuts Bar */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px]">
                          <span className="text-zinc-400 ml-1">اختصارات المبالغ:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const remSYP = orderRemainingSYP;
                              setNewPaymentAmount((remSYP / orderPaymentRate).toFixed(2));
                              setNewPaymentSYPAmount(remSYP.toString());
                            }}
                            className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 rounded font-mono font-bold cursor-pointer"
                          >
                            ⚡ كامل المتبقي ({orderRemainingSYP.toLocaleString()} ل.س)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.round(orderRemainingSYP * 0.5);
                              setNewPaymentAmount((half / orderPaymentRate).toFixed(2));
                              setNewPaymentSYPAmount(half.toString());
                            }}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded font-mono cursor-pointer"
                          >
                            🪙 50% من المتبقي ({Math.round(orderRemainingSYP * 0.5).toLocaleString()} ل.س)
                          </button>
                          {[500000, 1000000, 2000000].map(sypVal => (
                            <button
                              key={sypVal}
                              type="button"
                              onClick={() => {
                                const usdVal = (sypVal / orderPaymentRate).toFixed(2);
                                setNewPaymentAmount(usdVal);
                                setNewPaymentSYPAmount(sypVal.toString());
                              }}
                              className="px-2 py-1 bg-zinc-850 hover:bg-zinc-750 border border-zinc-750 text-emerald-400 rounded font-mono cursor-pointer"
                            >
                              {(sypVal / 1000).toLocaleString()} ألف ل.س
                            </button>
                          ))}
                        </div>

                        {/* Payment Method Radio Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-zinc-400 block">وسيلة الدفع والقبض:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'cash', label: '💵 نقدي (كاش)' },
                              { id: 'transfer', label: '🏦 تحويل بنكي / سيريتل' },
                              { id: 'card', label: '💳 بطاقة / شيك' }
                            ].map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelectedPaymentMethod(m.id as any)}
                                className={`p-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                  selectedPaymentMethod === m.id
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="text-zinc-400 block mb-1 text-right font-medium">
                              {paymentInputCurrency === "USD" ? "قيمة الدفعة بالدولار ($)" : "قيمة الدفعة بالليرة السورية (ل.س)"}
                            </label>
                            {paymentInputCurrency === "USD" ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  required
                                  min="0.01"
                                  step="0.01"
                                  max={orderRemainingUSD}
                                  value={newPaymentAmount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewPaymentAmount(val);
                                    if (val && !isNaN(Number(val))) {
                                      setNewPaymentSYPAmount(Math.round(Number(val) * orderPaymentRate).toString());
                                    } else {
                                      setNewPaymentSYPAmount("");
                                    }
                                  }}
                                  placeholder={`الحد الأقصى $${orderRemainingUSD.toFixed(2)}`}
                                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-right font-mono font-bold focus:border-emerald-500 focus:outline-none"
                                />
                                {newPaymentAmount && Number(newPaymentAmount) > 0 && (
                                  <span className="absolute left-2 top-2.5 text-[10px] font-mono text-emerald-400 font-bold bg-zinc-900 px-1.5 py-0.5 rounded">
                                    ≈ {Math.round(Number(newPaymentAmount) * exchangeRate).toLocaleString()} ل.س
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  step="1"
                                  max={orderRemainingSYP}
                                  value={newPaymentSYPAmount}
                                  onChange={(e) => {
                                    const syp = e.target.value;
                                    setNewPaymentSYPAmount(syp);
                                    if (syp && !isNaN(Number(syp))) {
                                      const usdVal = (Number(syp) / orderPaymentRate).toFixed(2);
                                      setNewPaymentAmount(usdVal);
                                    } else {
                                      setNewPaymentAmount("");
                                    }
                                  }}
                                  placeholder={`المبلغ بالليرة السورية...`}
                                  className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-right font-mono font-bold focus:border-amber-500 focus:outline-none"
                                />
                                {newPaymentAmount && Number(newPaymentAmount) > 0 && (
                                  <span className="absolute left-2 top-2.5 text-[10px] font-mono text-amber-300 font-bold bg-zinc-900 px-1.5 py-0.5 rounded">
                                    ≈ ${Number(newPaymentAmount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-zinc-400 block mb-1 text-right font-medium">ملاحظات / بيان المقبوضات</label>
                            <input
                              type="text"
                              value={newPaymentNotes}
                              onChange={(e) => setNewPaymentNotes(e.target.value)}
                              placeholder="مثال: عربون أولي كاش من العميل"
                              className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-zinc-200 text-right focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>إصدار سند القبض وتحديث المتبقي فورياً</span>
                        </button>
                      </form>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-xl text-center space-y-1">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                        <h4 className="text-sm font-bold text-zinc-200">الطلب مسدد بالكامل</h4>
                        <p className="text-xs text-zinc-500">تم قبض كامل القيمة المستحقة لهذا الطلب بنجاح ($0.00 متبقي).</p>
                      </div>
                    )}

                    {/* Payments History List & Printable Receipts */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          عدد المقبوضات: {selectedOrder.payments?.length || 0} سند
                        </span>
                        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                          <span>سجل وإيصالات الدفعات المقبوضة</span>
                          <Receipt className="w-4 h-4 text-indigo-400" />
                        </h4>
                      </div>

                      {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                        <div className="space-y-2">
                          {selectedOrder.payments.map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-3 bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                            >
                              {/* Action buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPaymentReceipt({ receipt: p, order: selectedOrder })}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-900/40 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة سند</span>
                                </button>
                                {currentUser?.role === "admin" || currentUser?.role === "accountant" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(p.id)}
                                    title="حذف/إلغاء سند القبض"
                                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 rounded-lg text-[10px] transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                              </div>

                              {/* Details */}
                              <div className="text-right flex-1">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-mono text-[10px] text-zinc-500">
                                    {new Date(p.createdAt).toLocaleString('ar-EG')}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-[9px] font-bold">
                                    {p.paymentMethod === 'transfer' ? '🏦 تحويل بنكي' : p.paymentMethod === 'card' ? '💳 بطاقة' : '💵 كاش نقدي'}
                                  </span>
                                  <strong className="font-mono text-emerald-400 text-sm font-extrabold">
                                    +${p.amountUSD.toFixed(2)}
                                  </strong>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-mono">
                                    #{selectedOrder.payments!.length - idx}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end gap-3 text-[10px] text-zinc-400 mt-1">
                                  {p.notes && <span className="text-zinc-300">البيان: {p.notes}</span>}
                                  <span className="font-mono text-emerald-500">
                                    ({(p.amountSYP || Math.round(p.amountUSD * exchangeRate)).toLocaleString()} ل.س)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-zinc-900/20 border border-zinc-800/60 rounded-xl text-center text-[11px] text-zinc-500">
                          لا توجد إيصالات دفع مفصلة مسجلة سابقاً بهذا الطلب (تم التحصيل مسبقاً قبل تحديث النظام).
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. G-Code Tab */}
                {orderDetailsTab === "gcode" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 leading-normal max-w-md text-right">
                        يقوم المترجم بقراءة عناصر الطلب ومواصفاتها لتوليد ملفات G-Code فورية متوافقة مع ماكينات الورشة عبر طراز الذكاء الاصطناعي Gemini.
                      </span>
                      <button
                        type="button"
                        onClick={handleCompileOrderGCode}
                        disabled={isCompilingOrderGcode}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer"
                      >
                        {isCompilingOrderGcode ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            جاري فحص المسارات وتوليد الكود...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            توليد كود الـ G-Code فورياً
                          </>
                        )}
                      </button>
                    </div>

                    {orderGcodeResult && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0 text-xs">
                          <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">الوقت التقديري للقص</span>
                            <strong className="text-xs font-mono text-zinc-200">{orderGcodeResult.estimatedTime}</strong>
                          </div>
                          <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">إجمالي المسارات</span>
                            <strong className="text-xs font-mono text-indigo-400">{orderGcodeResult.totalPaths} vectors</strong>
                          </div>
                          <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">طاقة CO2 المطلوبة</span>
                            <strong className="text-xs font-mono text-emerald-400">{orderGcodeResult.beamDutyCycle}</strong>
                          </div>
                          <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">فاقد الخام الكيرف</span>
                            <strong className="text-xs font-mono text-rose-400">{orderGcodeResult.materialLossPercent}%</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mt-3">
                          {/* Raw GCode terminal snippet */}
                          <div className="flex flex-col border border-zinc-850 rounded bg-black p-3 font-mono text-[10.5px] text-zinc-300 max-h-[200px] overflow-y-auto text-left">
                            <span className="text-[9px] text-zinc-600 border-b border-zinc-900 pb-1 mb-1 block uppercase font-sans text-right">مخرجات آلة القص (G-Code Terminal)</span>
                            <pre className="leading-5 whitespace-pre-wrap">{orderGcodeResult.gcodeSnippet}</pre>
                          </div>

                          {/* SVG Simulation Graphic */}
                          <div className="border border-zinc-850 rounded bg-black/60 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                            <span className="text-[9px] text-zinc-600 absolute top-2 right-2 uppercase font-mono select-none">المحاكاة البصرية للمتجهات</span>
                            
                            <svg className="w-24 h-24 stroke-indigo-500 fill-none stroke-2" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" stroke="#4f46e5" strokeWidth="0.8" strokeDasharray="3,3" />
                              <polygon points="50,18 61,39 85,41 67,56 72,80 50,68 28,80 33,56 15,41 39,39" stroke="#10b981" strokeWidth="1.2" className="animate-pulse" />
                              <circle cx="50" cy="50" r="1.5" fill="#10b981" />
                            </svg>

                            <p className="text-[10px] text-zinc-500 text-center font-sans mt-3 leading-relaxed">
                              {orderGcodeResult.calibrationAdvice}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-900 text-[10.5px] leading-relaxed text-zinc-400">
                          <strong>شرح التعليمات البرمجية للقص:</strong>
                          <p className="text-[10px] text-zinc-500 mt-1">{orderGcodeResult.gcodeExplanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Timeline Tab */}
                {orderDetailsTab === "timeline" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-zinc-300">سجل تطور وتتبع حالة الطلب في الورشة</h4>
                    <div className="relative border-r border-zinc-800 pr-4 space-y-6 font-sans">
                      {/* Created log item */}
                      <div className="relative">
                        <div className="absolute top-1.5 -right-[23px] w-3.5 h-3.5 rounded-full bg-indigo-500 border-4 border-[#09090b]" />
                        <div className="bg-zinc-900/30 border border-zinc-850 p-3 rounded-lg text-xs space-y-1 text-right">
                          <div className="flex justify-between items-center text-[10px] text-zinc-500">
                            <span>بواسطة: {USERS.find(u => u.id === selectedOrder.createdById)?.fullName || "المدير العام"}</span>
                            <span>{new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}</span>
                          </div>
                          <h5 className="font-bold text-indigo-400">إنشاء وتثبيت الطلب في نظام الورشة</h5>
                          <p className="text-zinc-400">تم تسجيل تفاصيل المواد وألواح القص وترحيل الفاتورة لحساب العميل بنجاح.</p>
                        </div>
                      </div>

                      {/* Map through transitions & edits */}
                      {selectedOrder.statusHistory && selectedOrder.statusHistory.map((hist, idx) => {
                        const isFinancialEdit = hist.notes && hist.notes.includes("[تعديل ماليات وبيانات الطلب");
                        const isPaymentEvent = hist.notes && (hist.notes.includes("تسديد دفعة") || hist.notes.includes("سند قبض"));

                        return (
                          <div key={idx} className="relative">
                            <div className={`absolute top-1.5 -right-[23px] w-3.5 h-3.5 rounded-full border-4 border-[#09090b] ${
                              isFinancialEdit ? "bg-amber-500" : isPaymentEvent ? "bg-emerald-500" : "bg-indigo-500"
                            }`} />
                            <div className="bg-zinc-900/40 border border-zinc-800 p-3.5 rounded-xl text-xs space-y-2 text-right shadow-sm">
                              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                                <span className="font-bold text-zinc-300">بواسطة: {USERS.find(u => u.id === selectedOrder.createdById)?.fullName || "مدير الورشة / الفني"}</span>
                                <span>{new Date(hist.changedAt).toLocaleString('ar-EG')}</span>
                              </div>

                              {isFinancialEdit ? (
                                <div className="space-y-1.5">
                                  <h5 className="font-bold text-[#c59257] flex items-center gap-1.5 justify-end text-xs">
                                    <span>تعديل تفاصيل وماليات الطلب</span>
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                                  </h5>
                                  <div className="bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg text-[11px] text-amber-200/90 leading-relaxed space-y-1 font-sans">
                                    {hist.notes.replace(/^\[.*?\]\s*/, '').split(" | ").map((diffItem, dIdx) => (
                                      <div key={dIdx} className="flex items-start gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#c59257] shrink-0 mt-1" />
                                        <span>{diffItem}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <h5 className="font-bold text-emerald-400 flex items-center gap-2 justify-end">
                                    {hist.oldStatus && hist.oldStatus !== hist.newStatus && (
                                      <span className="text-[10px] text-zinc-500 font-normal">(من {hist.oldStatus})</span>
                                    )}
                                    <span>تحديث حالة الطلب: <span className="uppercase font-mono font-bold text-emerald-300">{hist.newStatus}</span></span>
                                  </h5>
                                  <p className="text-zinc-300 text-[11px] mt-1 leading-relaxed">{hist.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Files & Documents Tab */}
                {orderDetailsTab === "files" && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-zinc-300">الملفات والوثائق المرفقة بالطلب</h4>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      ارفع صور التصاميم، ملفات DXF، أو كود الماكينة المولد والمستندات الفنية لتكون مرتبطة بهذا الطلب بشكل دائم ومتاحة للتنزيل لكافة الفنيين.
                    </p>
                    <FileUploader entityType="order" entityId={selectedOrder.id} />
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex justify-between shrink-0 items-center">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintTicketOrder(selectedOrder)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 border border-zinc-750"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-400" />
                    <span>تذكرة التشغيل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 border border-zinc-750"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>مشاركة الطلب</span>
                  </button>
                  <a
                    href={`/api/orders/${selectedOrder.id}/pdf`}
                    download={`order_${selectedOrder.orderNumber}.pdf`}
                    className="px-4 py-1.5 bg-[#c59257] hover:bg-[#b07e43] text-zinc-950 font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40 transform active:scale-95"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>تنزيل الفاتورة وسند التسليم (PDF)</span>
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  إغلاق مستند الطلب
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}

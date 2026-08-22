import { motion, AnimatePresence } from "motion/react";
import * as Lucide from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AddOrderModal from "./AddOrderModal";
import CurrencyConverterModal from "./CurrencyConverterModal";
import { FileUploader } from "./FileUploader";
import HelpCenter from "./HelpCenter";
import HelpModal from "./HelpModal";
import SupplierPriceComparisonModal from "./SupplierPriceComparisonModal";
import { materialPriceSYP, materialPriceUSD } from "../lib/materials";

const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;

export default function GlobalDialogs(props: Record<string, any>) {
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

  const orderPaymentRate = Number(selectedOrder?.exchangeRateAtFinalization || selectedOrder?.exchangeRateAtIssue || exchangeRate || 135);
  const orderRemainingSYP = Math.max(0, Math.round(Number(selectedOrder?.remainingSYP ?? selectedOrder?.remaining ?? 0)));
  const orderRemainingUSD = Math.max(0, Number(selectedOrder?.remainingUSD ?? (orderRemainingSYP / orderPaymentRate)));

  return (
    <>
      {/* ➕ CREATE NEW ORDER MODAL (REFACTORED WITH CLEAR STATE AND VALIDATIONS) */}
      <AnimatePresence>
        {showAddOrder && (
          <AddOrderModal
            isOpen={showAddOrder}
            onClose={() => {
              setShowAddOrder(false);
              setSelectedCustomerIdForOrder("");
            }}
            initialCustomerId={selectedCustomerIdForOrder}
            customers={customers}
            products={products}
            currentUser={currentUser}
            fetchOrders={fetchOrders}
            fetchLogs={fetchLogs}
            fetchCustomers={fetchCustomers}
            addTerminalLog={addTerminalLog}
            exchangeRate={exchangeRate}
          />
        )}
      </AnimatePresence>

      {/* ✏️ EDIT CUSTOMER MODAL (نافذة تعديل ملف وتفاصيل العميل) */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 dir-rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 15 }}
              className="bg-[#0c0a09] border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden font-sans text-right"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 justify-end">
                      <span>تعديل ملف العميل</span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 rounded-md">
                        {editingCustomer.id}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">تحديث المعلومات الشخصية والتواصل وملاحظات الورشة والطلبات</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSaveEditCustomer} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      اسم العميل <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      placeholder="اسم العميل الكامل..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      رقم الهاتف / الموبايل <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value)}
                      placeholder="+9627..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      رقم الواتساب (للمراسلة الفورية)
                    </label>
                    <input
                      type="text"
                      value={editCustWhatsapp}
                      onChange={(e) => setEditCustWhatsapp(e.target.value)}
                      placeholder="رقم الواتساب..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={editCustEmail}
                      onChange={(e) => setEditCustEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 font-mono focus:outline-none text-right dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      الشركة / المكتب الهندسي / الجهة
                    </label>
                    <input
                      type="text"
                      value={editCustCompany}
                      onChange={(e) => setEditCustCompany(e.target.value)}
                      placeholder="اسم المؤسسة..."
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-semibold">
                      تصنيف العميل (نوع الحساب)
                    </label>
                    <select
                      value={editCustCategory}
                      onChange={(e) => setEditCustCategory(e.target.value)}
                      className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none font-sans cursor-pointer"
                    >
                      <option value="شركة">🏢 شركة / مؤسسة تجارية</option>
                      <option value="أفراد">👤 أفراد / عميل شخصي</option>
                      <option value="مقاول">👷 مقاول / مكتب هندسي / مصمم</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    العنوان / الورشة / المدينة
                  </label>
                  <input
                    type="text"
                    value={editCustAddress}
                    onChange={(e) => setEditCustAddress(e.target.value)}
                    placeholder="مكان الإقامة أو العمل..."
                    className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">
                    ملاحظات العميل والتفاصيل الخاصة بالعمل
                  </label>
                  <textarea
                    rows={3}
                    value={editCustNotes}
                    onChange={(e) => setEditCustNotes(e.target.value)}
                    placeholder="تعليمات خاصة، تفضيلات سماكة الأكريليك أو حفر الخشب، الشحنات، الدفعات أو تفضيلات التسليم..."
                    className="w-full bg-black border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-900/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ DELIVERY BLOCKED MODAL (حظر تسليم الطلب قبل إكمال تسديد كافة المتبقي) */}
      <AnimatePresence>
        {deliveryBlockedOrder && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="bg-[#0c0a09] border border-amber-900/60 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-right font-sans dir-rtl"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-amber-950/40 border-b border-amber-900/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDeliveryBlockedOrder(null)}
                  className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-200">حظر تسليم الطلب للعميل</h3>
                    <p className="text-[10px] text-amber-400/80 font-mono">ORDER DELIVERY RESTRICTION • UNPAID BALANCE</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs">
                <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl text-amber-200/90 leading-relaxed space-y-2">
                  <p className="font-semibold text-sm text-amber-300">
                    ⚠️ يتطلب نظام الرقابة المالية بالورشة تسديد كامل مستحقات الطلب قبل تحويل الحالة إلى (تم التسليم).
                  </p>
                  <p className="text-zinc-400 text-xs">
                    الطلب رقم <strong className="text-zinc-200 font-mono">#{deliveryBlockedOrder.orderNumber}</strong> يتضمن مبالغ معلقة غير مدفوعة. يرجى استيفاء المبلغ المتبقي لتسليم القطع للعميل رسمياً.
                  </p>
                </div>

                {/* Balance breakdown card */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-850">
                    <span className="text-[10px] text-zinc-500 block">إجمالي التكلفة</span>
                    <span className="text-xs font-bold text-zinc-200 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.totalPrice || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-zinc-500 font-mono">${(Number(deliveryBlockedOrder.totalPrice || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/30">
                    <span className="text-[10px] text-emerald-400 block">المقبوض سابقاً</span>
                    <span className="text-xs font-bold text-emerald-300 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.paidAmount || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[9px] text-emerald-500 font-mono">${(Number(deliveryBlockedOrder.paidAmount || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                  <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900/40 animate-pulse">
                    <span className="text-[10px] text-rose-400 block font-bold">المتبقي المستحق</span>
                    <span className="text-sm font-extrabold text-rose-300 font-mono block mt-0.5">{Math.round(Number(deliveryBlockedOrder.remaining || 0)).toLocaleString()} ل.س</span>
                    <span className="text-[10px] text-rose-400 font-bold font-mono">${(Number(deliveryBlockedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Choice */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 block">وسيلة تسديد المقبوضات:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: '💵 نقدي (كاش)' },
                      { id: 'transfer', label: '🏦 تحويل بنكي/سيريتل' },
                      { id: 'card', label: '💳 بطاقة / شيك' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.id as any)}
                        className={`p-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          selectedPaymentMethod === m.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSettleRemainingAndDeliver(deliveryBlockedOrder)}
                    disabled={isProcessingQuickFullPay}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingQuickFullPay ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري تسجيل الدفعة وتحويل الحالة إلى (تم التسليم)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبض المتبقي كاش ({Math.round(Number(deliveryBlockedOrder.remaining || 0)).toLocaleString()} ل.س / ${(Number(deliveryBlockedOrder.remaining || 0) / (exchangeRate || 135)).toFixed(2)} USD) والتسليم فوراً</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(deliveryBlockedOrder);
                        setOrderDetailsTab('payments');
                        setDeliveryBlockedOrder(null);
                      }}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>تخصيص دفعة جزئية أولاً</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryBlockedOrder(null)}
                      className="py-2 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium rounded-xl text-[11px] transition-colors cursor-pointer"
                    >
                      إلغاء التغيير
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📄 PRINTABLE PAYMENT RECEIPT MODAL (سند قبض مالي معتمد للطلب) */}
      <AnimatePresence>
        {selectedPaymentReceipt && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-right font-sans dir-rtl flex flex-col max-h-[90vh]"
            >
              {/* Header bar */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentReceipt(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-zinc-100">سند قبض مالي معتمد</h3>
                </div>
              </div>

              {/* Printable receipt content */}
              <div id="payment-receipt-print-area" className="p-8 bg-zinc-950 text-zinc-200 overflow-y-auto space-y-6 print:bg-white print:text-black print:p-4">
                {/* Official Header */}
                <div className="border-b-2 border-amber-500/80 pb-4 flex justify-between items-start">
                  <div className="text-left font-mono">
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">رقم سند القبض</span>
                    <strong className="text-sm text-amber-400 print:text-black block">{selectedPaymentReceipt.receipt.id}</strong>
                    <span className="text-[10px] text-zinc-400 print:text-gray-600 block mt-1">
                      {new Date(selectedPaymentReceipt.receipt.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-zinc-100 print:text-black flex items-center justify-end gap-2">
                      <span>AXIS LAB</span>
                      <Scissors className="w-5 h-5 text-amber-400" />
                    </h2>
                    <p className="text-[11px] text-amber-400 font-semibold print:text-black">ورش القص والنقش بالليزر وإدارة الورش الاحترافية</p>
                    <p className="text-[10px] text-zinc-500 print:text-gray-600">سند قبض مالي رسمي مقبوض من العميل</p>
                  </div>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-zinc-900/60 border border-zinc-800 print:border-gray-300 print:bg-gray-50 rounded-xl p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 print:border-gray-300 pb-3">
                    <div>
                      <span className="text-zinc-500 print:text-gray-600 block">اسم العميل:</span>
                      <strong className="text-zinc-100 print:text-black text-sm">
                        {customers.find(c => c.id === selectedPaymentReceipt.order.customerId)?.name || "عميل عام"}
                      </strong>
                    </div>
                    <div className="text-left">
                      <span className="text-zinc-500 print:text-gray-600 block">رقم الطلب المرتبط:</span>
                      <strong className="text-indigo-400 print:text-black font-mono text-sm">
                        {selectedPaymentReceipt.order.orderNumber}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Amount Display Box */}
                  <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 print:bg-emerald-50 print:border-emerald-300 rounded-lg flex justify-between items-center">
                    <div className="text-left font-mono">
                      <div className="text-base font-extrabold text-emerald-400 print:text-emerald-800">
                        ${selectedPaymentReceipt.receipt.amountUSD.toFixed(2)}
                      </div>
                      <div className="text-xs text-emerald-300/80 print:text-emerald-700 font-bold">
                        {(selectedPaymentReceipt.receipt.amountSYP || Math.round(selectedPaymentReceipt.receipt.amountUSD * exchangeRate)).toLocaleString()} ل.س
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 print:text-emerald-800 font-bold uppercase block">المبلغ المقبوض بالسند</span>
                      <span className="text-xs text-zinc-300 print:text-black">
                        طريقة الدفع: <strong className="text-emerald-400 print:text-black font-bold">
                          {selectedPaymentReceipt.receipt.paymentMethod === 'transfer' ? 'تحويل بنكي / سيريتل' : selectedPaymentReceipt.receipt.paymentMethod === 'card' ? 'بطاقة / شيك' : 'نقدي كاش بالورشة'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Notes / Statements */}
                  {selectedPaymentReceipt.receipt.notes && (
                    <div className="pt-1 text-[11px] text-zinc-400 print:text-gray-700">
                      <span className="font-bold text-zinc-300 print:text-black">البيان / ملاحظات المقبوضات: </span>
                      <span>{selectedPaymentReceipt.receipt.notes}</span>
                    </div>
                  )}
                </div>

                {/* Overall Order Status Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-zinc-900/40 border border-zinc-800 print:border-gray-300 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">إجمالي الطلب</span>
                    <strong className="font-mono text-zinc-200 print:text-black">${selectedPaymentReceipt.order.totalPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">إجمالي المقبوض حتى الآن</span>
                    <strong className="font-mono text-emerald-400 print:text-black">${selectedPaymentReceipt.order.paidAmount.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block">المتبقي الحالي</span>
                    <strong className="font-mono text-rose-400 print:text-black">${selectedPaymentReceipt.order.remaining.toFixed(2)}</strong>
                  </div>
                </div>

              {/* Signatures */}
                <div className="pt-6 border-t border-zinc-800 print:border-gray-300 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">توقيع الموظف المسؤول</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5 font-mono">
                      {currentUser?.fullName || "أمين الصندوق / الموظف"}
                    </span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">اعتماد إدارة الورشة</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5">قسم المالية والمحاسبة</span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-bold print:text-black block mb-1">توقيع واستلام العميل</span>
                    <span className="text-[10px] text-zinc-500 print:text-gray-600 block mb-5">المستلم المعتمد</span>
                    <div className="border-b border-dashed border-zinc-700 print:border-gray-400 w-28 mx-auto"></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentReceipt(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cust = customers.find(c => c.id === selectedPaymentReceipt.order.customerId);
                      const msg = `إيصال قبض مالي رقم ${selectedPaymentReceipt.receipt.id}\nالعميل: ${cust?.name || 'محترم'}\nالطلب: ${selectedPaymentReceipt.order.orderNumber}\nالمبلغ المقبوض: $${selectedPaymentReceipt.receipt.amountUSD.toFixed(2)} (${(selectedPaymentReceipt.receipt.amountSYP || Math.round(selectedPaymentReceipt.receipt.amountUSD * exchangeRate)).toLocaleString()} ل.س)\nالمتبقي الحالي: $${selectedPaymentReceipt.order.remaining.toFixed(2)}\nشكراً لتعاملكم مع AXIS LAB.`;
                      const phone = cust?.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="px-3 py-2 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة عبر الواتساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة سند القبض</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  { id: "items", label: "المواد وعناصر القطع", icon: Info }
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

      {/* ✏️ EDIT ORDER MODAL */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span>تعديل تفاصيل طلب التشغيل: <span className="font-mono text-indigo-400">{editingOrder.orderNumber}</span></span>
                </span>
              </div>

              <form onSubmit={handleEditOrderSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 block mb-1">تحديد العميل</label>
                    <select
                      value={editingOrder.customerId}
                      onChange={(e) => setEditingOrder({ ...editingOrder, customerId: e.target.value })}
                      required
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="">-- اختر عميل من القائمة --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1">أولية التشغيل</label>
                    <select
                      value={editingOrder.priority}
                      onChange={(e: any) => setEditingOrder({ ...editingOrder, priority: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="low">منخفضة (Low)</option>
                      <option value="normal">عادية (Normal)</option>
                      <option value="high">عالية (High)</option>
                      <option value="urgent">مستعجلة جداً (Urgent)</option>
                    </select>
                  </div>
                </div>

                {/* Edit Order Items list editor */}
                <div className="border border-zinc-800 p-4 rounded-lg bg-black/30 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={appendEditOrderDraftItem}
                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> إضافة مادة يدوياً
                      </button>
                      {products.length > 0 && (
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const found = products.find(p => p.id === val);
                              if (found) {
                                setEditOrderItems(prev => [...prev, { name: found.name, qty: 1, price: found.price }]);
                              }
                              e.target.value = "";
                            }
                          }}
                          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-indigo-400 focus:outline-none"
                        >
                          <option value="">-- إضافة مادة من دليل المنتجات --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.price.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-bold">عناصر ومواد القص المعتمدة</span>
                  </div>

                  {editOrderItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 border-b border-zinc-900 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => removeEditOrderDraftItem(idx)}
                          className="text-rose-500 p-1 hover:bg-zinc-800 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          required
                          placeholder="السعر"
                          value={item.price}
                          onChange={(e) => updateEditOrderDraftItem(idx, 'price', Number(e.target.value))}
                          className="w-20 bg-black border border-zinc-800 rounded p-1.5 text-zinc-300 text-center font-mono"
                        />
                        <input
                          type="number"
                          required
                          placeholder="الكمية"
                          value={item.qty}
                          onChange={(e) => updateEditOrderDraftItem(idx, 'qty', Number(e.target.value))}
                          className="w-16 bg-black border border-zinc-800 rounded p-1.5 text-zinc-300 text-center font-mono"
                        />
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            required
                            placeholder="مادة القص (مثال: أكريليك شفاف 4ملم)"
                            value={item.name}
                            onChange={(e) => {
                              updateEditOrderDraftItem(idx, 'name', e.target.value);
                              setEditFocusedItemIdx(idx + 1000);
                            }}
                            onFocus={() => setEditFocusedItemIdx(idx + 1000)}
                            className="w-full bg-black border border-zinc-800 rounded p-1.5 text-zinc-300 text-right text-xs"
                          />
                          {editFocusedItemIdx === (idx + 1000) && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={() => setEditFocusedItemIdx(null)} 
                              />
                              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto shadow-2xl divide-y divide-zinc-900/60 font-sans">
                                {(() => {
                                  const query = (item.name || "").toLowerCase();
                                  const prodWeights = (() => {
                                    try {
                                      const r = localStorage.getItem("popular_products");
                                      return r ? JSON.parse(r) : {};
                                    } catch { return {}; }
                                  })();
                                  const sortedProds = [...products].sort((a, b) => {
                                    const wA = prodWeights[a.id] || 0;
                                    const wB = prodWeights[b.id] || 0;
                                    return wB - wA;
                                  });
                                  const matches = sortedProds.filter(p => 
                                    p.name.toLowerCase().includes(query) || 
                                    p.category.toLowerCase().includes(query)
                                  );
                                  if (matches.length === 0) {
                                    return <div className="p-2.5 text-zinc-600 text-center text-[10px]">لا توجد مواد تطابق البحث</div>;
                                  }
                                  return matches.slice(0, 10).map(p => {
                                    const weight = prodWeights[p.id] || 0;
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          updateEditOrderDraftItem(idx, 'name', p.name);
                                          updateEditOrderDraftItem(idx, 'price', p.price);
                                          try {
                                            const weights = { ...prodWeights, [p.id]: weight + 1 };
                                            localStorage.setItem("popular_products", JSON.stringify(weights));
                                          } catch(err){}
                                          setEditFocusedItemIdx(null);
                                        }}
                                        className="w-full text-right px-3 py-2 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {weight > 0 && (
                                            <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-1 rounded flex items-center gap-0.5">
                                              🔥 مكرر {weight}x
                                            </span>
                                          )}
                                          <span className="font-mono text-indigo-400">${p.price.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span>{p.name}</span>
                                          <span className="text-[9px] text-zinc-500">{p.category}</span>
                                        </div>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pr-8">
                        <span className="text-[10px] text-zinc-500 select-none shrink-0">ملاحظات العنصر:</span>
                        <input
                          type="text"
                          placeholder="مواصفات الفني للقص أو الحفر لهذا اللوح (اختياري)..."
                          value={item.notes || ""}
                          onChange={(e) => updateEditOrderDraftItem(idx, 'notes', e.target.value)}
                          className="flex-1 bg-transparent border-b border-zinc-850/60 focus:border-indigo-500/60 text-[10px] text-zinc-400 outline-none pb-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🧮 الحاسبة المالية لتعديل الطلب */}
                <div className="border border-zinc-850 bg-zinc-950/45 p-4 rounded-lg space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-[9px] text-zinc-500 font-mono">Calculates instantly from edited items, tax rate, and discounts</span>
                    <h4 className="text-xs font-bold text-[#c59257] flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[#c59257]" />
                      <span>الحاسبة المالية وإعدادات الضريبة والخصم للطلب المعدل</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[11px]">نسبة الضريبة (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editingOrder.taxPercent !== undefined ? editingOrder.taxPercent : 0}
                        onChange={(e) => setEditingOrder({ ...editingOrder, taxPercent: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[11px]">الخصم الإضافي ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingOrder.discount !== undefined ? editingOrder.discount : 0}
                        onChange={(e) => setEditingOrder({ ...editingOrder, discount: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[11px]">المبلغ المقبوض ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingOrder.paidAmount}
                        onChange={(e) => setEditingOrder({ ...editingOrder, paidAmount: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-center text-xs focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[11px]">تاريخ التسليم المتوقع</label>
                      <input
                        type="datetime-local"
                        required
                        value={editingOrder.deliveryDateExpected ? editingOrder.deliveryDateExpected.slice(0, 16) : ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, deliveryDateExpected: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 font-sans text-right text-xs focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block mb-1 text-[11px]">ملاحظات فنية وتشغيلية عامة</label>
                      <input
                        type="text"
                        value={editingOrder.notes || ""}
                        onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                        placeholder="مثال: يرجى شحذ الحواف جيداً بعد القص"
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 text-right text-xs focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                  </div>

                  {/* Real-time Summary Sheet for Edit Order */}
                  <div className="bg-black/40 border border-zinc-900 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center items-center divide-x divide-x-reverse divide-zinc-900">
                    <div className="px-1">
                      <div className="text-[10px] text-zinc-500 font-sans">مجموع المواد</div>
                      <div className="text-xs font-bold text-zinc-300 font-mono mt-0.5">{editOrderSubtotal.toFixed(2)} $</div>
                    </div>
                    <div className="px-1">
                      <div className="text-[10px] text-zinc-500 font-sans">الضريبة ({editOrderTaxPercentVal}%)</div>
                      <div className="text-xs font-bold text-rose-300/80 font-mono mt-0.5">+{editOrderTaxAmount.toFixed(2)} $</div>
                    </div>
                    <div className="px-1">
                      <div className="text-[10px] text-zinc-500 font-sans">الخصم الإضافي</div>
                      <div className="text-xs font-bold text-emerald-400/80 font-mono mt-0.5">-{editOrderDiscountAmountVal.toFixed(2)} $</div>
                    </div>
                    <div className="px-1">
                      <div className="text-[10px] text-[#c59257] font-semibold font-sans">إجمالي السعر</div>
                      <div className="text-sm font-extrabold text-[#c59257] font-mono mt-0.5">{editOrderTotalPrice.toFixed(2)} $</div>
                    </div>
                    <div className="px-1 col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-zinc-400 font-sans">الرصيد المتبقي</div>
                      <span className={`text-xs font-bold font-mono mt-0.5 block ${editOrderRemaining > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {editOrderRemaining.toFixed(2)} $
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    حفظ التغييرات وترحيل الملف المعدل
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏭 ADD PRODUCTION JOB MODAL */}
      <AnimatePresence>
        {showAddJob && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setShowAddJob(false)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>إدراج مهمة إنتاج وقص ليزر CO2</span>
                </span>
              </div>

              <form onSubmit={handleCreateProductionJob} className="space-y-4 text-xs text-zinc-350">
                <div>
                  <label className="text-zinc-500 block mb-1">اسم المهمة (مثال: قص حروف لوحة إعلانات)</label>
                  <input
                    type="text"
                    required
                    value={newJobItemName}
                    onChange={(e) => setNewJobItemName(e.target.value)}
                    placeholder="اكتب اسم الجزء أو عنصر التصميم المطلوب قصه..."
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-zinc-500 block mb-1">اربط المادة الخام المستهدفة (من المخزون)</label>
                    <select
                      required
                      value={newJobMaterialId}
                      onChange={(e) => setNewJobMaterialId(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="">-- اختر لوح الخامة من المخزن --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.thickness}مم - {m.color}) [متبقي: {m.quantity} {m.unit === 'sheet' ? 'ألواح' : 'وحدات'}]
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-zinc-600 block mt-1">
                      * عند إكمال عملية القص، سيتم تلقائياً خصم لوح واحد من رصيد هذه المادة وتسجيل العملية.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">شدة شعاع الليزر (Power %)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="100"
                      value={newJobLaserPower}
                      onChange={(e) => setNewJobLaserPower(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">سرعة القص (Speed mm/s)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="150"
                      value={newJobLaserSpeed}
                      onChange={(e) => setNewJobLaserSpeed(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 block mb-1">الطلب المرتبط بها (اختياري)</label>
                    <select
                      value={newJobOrderId}
                      onChange={(e) => setNewJobOrderId(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-indigo-500 text-right"
                    >
                      <option value="">-- عمل إنتاجي يدوياً --</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>طلب #{o.orderNumber} [{o.status}]</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 font-sans">وقت التشغيل المقدر (ثانية)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      value={newJobEstTime}
                      onChange={(e) => setNewJobEstTime(Number(e.target.value))}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    إرسال إلى صالة الإنتاج
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddJob(false)}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🧩 SALVAGE SHEET REMNANT REGISTER MODAL (AFTER JOB COMPLETION) */}
      <AnimatePresence>
        {showRemnantRegister && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="text-center space-y-2 border-b border-zinc-900 pb-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-black text-zinc-100">اكتملت عملية قص المتجهات بنجاح!</h3>
                <p className="text-xs text-zinc-500">تم إكمال المهمة {showRemnantRegister.jobNo} على ماكينات الورشة.</p>
              </div>

              <div className="bg-emerald-950/10 border border-emerald-900/20 p-3.5 rounded-lg text-xs text-emerald-300 leading-relaxed text-right">
                هل ترغب في تسجيل **فضلة لوح متبقية** متبقية من لوح القص؟ بتسجيلها، سيقوم نظام الورشة بإتاحتها للمهندسين فورياً عند قص أي تصاميم صغيرة الحجم لاحقاً بدلاً من هدر ألواح جديدة كاملة.
              </div>

              <form onSubmit={handleRegisterRemnantOnJobComplete} className="space-y-4 text-xs text-zinc-300">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">طول الفضلة (مم)</label>
                    <input
                      type="number"
                      placeholder="اختياري (مثال: 450)"
                      value={jobRemHeight}
                      onChange={(e) => setJobRemHeight(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">عرض الفضلة (مم)</label>
                    <input
                      type="number"
                      placeholder="اختياري (مثال: 600)"
                      value={jobRemWidth}
                      onChange={(e) => setJobRemWidth(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">مكان تخزين الفضلة بالورشة</label>
                  <input
                    type="text"
                    placeholder="مثال: درج الفضلات - الرف رقم 2"
                    value={jobRemLocation}
                    onChange={(e) => setJobRemLocation(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>تسجيل الفضلة وإتمام المهمة بنجاح</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDirectCompleteJob(showRemnantRegister.id);
                      setShowRemnantRegister(null);
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    تجاوز (قص عادي بدون بقايا ألواح)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ SMART SUPPLY ORDER PROPOSAL & APPROVAL MODAL */}
      <AnimatePresence>
        {showSmartSupplyModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-amber-900/50 w-full max-w-4xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-5 text-right font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <button
                  type="button"
                  onClick={() => setShowSmartSupplyModal(false)}
                  className="p-1.5 text-zinc-500 hover:text-white rounded-lg cursor-pointer bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-base font-black text-zinc-100 flex items-center gap-2 justify-end">
                      <span>مولّد طلبات التوريد الذكية</span>
                      <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400/20 animate-pulse" />
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      توليد مقترحات إعادة الشحن بناءً على الحدود الدنيا المحددة مسبقاً وبشرط موافقة المسؤول
                    </span>
                  </div>
                  <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400 shrink-0 shadow-inner">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Manager Approval Notice Banner */}
              <div className="bg-gradient-to-r from-amber-950/40 via-zinc-950 to-indigo-950/40 border border-amber-800/40 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300 block">
                      {currentUser?.role !== "employee" && currentUser?.role !== "accountant"
                        ? "صلاحية الاعتماد الفوري (مسؤول الورشة):"
                        : "يتطلب موافقة المسؤول المباشر:"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {currentUser?.role !== "employee" && currentUser?.role !== "accountant"
                        ? "بصفتك مديراً/مسؤولاً، يمكنك مراجعة وتعديل كميات الشراء الموصى بها ثم اعتماد وإصدار الطلبات فوراً."
                        : "سيتم رفع مقترح الشراء الذكي لإدارة الورشة للمراجعة والاعتماد النهائي قبل الإرسال للموردين."}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-950/80 text-amber-400 border border-amber-700/60 rounded-md text-[10px] font-mono font-bold shrink-0">
                  {currentUser?.fullName || "المسؤول"} ({currentUser?.role || "admin"})
                </span>
              </div>

              {/* Items Table */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-900/80 border-b border-zinc-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = smartSupplyItems.every(i => i.selected);
                        setSmartSupplyItems(smartSupplyItems.map(i => ({ ...i, selected: !allSelected })));
                      }}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold rounded cursor-pointer transition-colors"
                    >
                      {smartSupplyItems.every(i => i.selected) ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </button>
                    <span className="text-zinc-500 text-[11px]">
                      محدد: ({smartSupplyItems.filter(i => i.selected).length} من {smartSupplyItems.length}) خامات
                    </span>
                  </div>
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    جدول مقترحات إعادة التوريد الذكي
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-zinc-900/40 text-zinc-400 border-b border-zinc-850 text-[11px]">
                        <th className="p-3 text-center w-10">تحديد</th>
                        <th className="p-3">اسم الخامة والتصنيف</th>
                        <th className="p-3 text-center">المخزون الحالي / الأدنى</th>
                        <th className="p-3 text-center">الكمية المقترحة</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3">المورد المعتمد</th>
                        <th className="p-3 text-center">التكلفة التقديرية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-mono">
                      {smartSupplyItems.map((item, idx) => {
                        const estCost = item.suggestedQty * item.unitPrice;

                        return (
                          <tr
                            key={item.materialId}
                            className={`transition-colors ${
                              item.selected ? "bg-amber-950/10 hover:bg-amber-950/20" : "bg-zinc-950/40 opacity-50"
                            }`}
                          >
                            {/* Select checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={(e) => {
                                  const updated = [...smartSupplyItems];
                                  updated[idx].selected = e.target.checked;
                                  setSmartSupplyItems(updated);
                                }}
                                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                              />
                            </td>

                            {/* Material info */}
                            <td className="p-3 font-sans">
                              <div className="font-bold text-zinc-100 text-xs">{item.materialName}</div>
                              <span className="text-[10px] text-zinc-500">{item.category} ({item.unit})</span>
                            </td>

                            {/* Current vs Min stock */}
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-rose-400 font-bold text-xs">
                                  {item.currentStock} {item.unit}
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  حد أمان: {item.minimumStock}
                                </span>
                              </div>
                            </td>

                            {/* Editable Suggested Qty */}
                            <td className="p-3 text-center font-sans">
                              <input
                                type="number"
                                min="1"
                                value={item.suggestedQty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  const updated = [...smartSupplyItems];
                                  updated[idx].suggestedQty = val;
                                  setSmartSupplyItems(updated);
                                }}
                                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                              />
                            </td>

                            {/* Unit Price */}
                            <td className="p-3 text-center">
                              <span className="text-zinc-200 font-bold">${item.unitPrice.toFixed(2)}</span>
                            </td>

                            {/* Supplier Selector */}
                            <td className="p-3 font-sans">
                              <select
                                value={item.supplierId}
                                onChange={(e) => {
                                  const updated = [...smartSupplyItems];
                                  updated[idx].supplierId = e.target.value;
                                  const sup = suppliers.find(s => s.id === e.target.value);
                                  updated[idx].supplierName = sup ? sup.name : "المورد الرئيسي";
                                  setSmartSupplyItems(updated);
                                }}
                                className="w-full max-w-[160px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                              >
                                {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Est Total */}
                            <td className="p-3 text-center font-bold text-[#c59257]">
                              ${estCost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer summary inside table */}
                <div className="p-3.5 bg-zinc-900/90 border-t border-zinc-850 flex items-center justify-between font-sans">
                  <div className="text-xs text-zinc-400">
                    <span>عدد الخامات المقترحة المحددة: </span>
                    <strong className="text-amber-400 font-mono">
                      {smartSupplyItems.filter(i => i.selected).length}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">إجمالي التكلفة المقدرة للتوريد الذكي:</span>
                    <span className="text-base font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg">
                      ${smartSupplyItems.filter(i => i.selected).reduce((sum, i) => sum + (i.suggestedQty * i.unitPrice), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowSmartSupplyModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer w-full sm:w-auto"
                >
                  إلغاء التوليد الذكي
                </button>

                <button
                  type="button"
                  disabled={isSubmittingSmartSupply || smartSupplyItems.filter(i => i.selected).length === 0}
                  onClick={handleExecuteSmartSupplyOrders}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-[#c59257] to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-xl hover:shadow-amber-900/50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 w-full sm:w-auto"
                >
                  {isSubmittingSmartSupply ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>جاري تسجيل وإصدار طلبات التوريد...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                      <span>
                        {currentUser?.role !== "employee" && currentUser?.role !== "accountant"
                          ? "اعتماد وإصدار طلبات التوريد فوراً ✨"
                          : "إرسال طلبات التوريد بانتظار موافقة المسؤول ✨"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 STOCK ADJUSTMENT MODAL */}
      <AnimatePresence>
        {showAdjustStock && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustStock(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>تسجيل حركة مخزون: {showAdjustStock.name}</span>
                </span>
              </div>

              <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs text-zinc-300">
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">نوع الحركة المخزنية</label>
                  <select
                    value={adjustType}
                    onChange={(e: any) => setAdjustType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  >
                    <option value="purchase">شراء وتوريد خامات جديدة (زيادة الرصيد +)</option>
                    <option value="adjustment">تسوية جردية يدوي (تعديل مباشر)</option>
                    <option value="consumption">استهلاك في إنتاج (خصم رصيد -)</option>
                    <option value="waste">هدر وتلف ألواح (خصم رصيد -)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">الكمية بالألواح / الوحدات</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 5"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left focus:outline-none focus:border-[#c59257] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">ملاحظات وسبب الحركة</label>
                  <textarea
                    rows={3}
                    placeholder="ملاحظات توضيحية لعملية التعديل..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    تأكيد وتسجيل الحركة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdjustStock(null)}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📊 SUPPLIER PRICE COMPARISON MODAL */}
      <SupplierPriceComparisonModal
        isOpen={!!priceComparisonMaterial}
        onClose={() => setPriceComparisonMaterial(null)}
        material={priceComparisonMaterial}
        materials={materials}
        suppliers={suppliers}
        exchangeRate={exchangeRate}
        onSelectMaterial={(m) => setPriceComparisonMaterial(m)}
        onCreateSupplyOrder={handleCreateDirectSupplyOrder}
        onMaterialUpdated={refreshInventoryData}
      />

      {/* 💱 DUAL CURRENCY CONVERTER & MARKET EXCHANGE RATE MODAL */}
      <CurrencyConverterModal
        isOpen={isCurrencyConverterOpen}
        onClose={() => setIsCurrencyConverterOpen(false)}
        exchangeRate={exchangeRate}
        onUpdateRate={updateRate}
      />

      {/* 🧩 ADD NEW REMNANT MODAL */}
      <AnimatePresence>
        {showAddRemnant && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setShowAddRemnant(false)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#c59257]" />
                  <span>تسجيل فضلة لوح جديدة يدوياً</span>
                </span>
              </div>

              <form onSubmit={handleCreateRemnant} className="space-y-4 text-xs text-zinc-300">
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">الخامة الأساسية المتبقي منها</label>
                  <select
                    required
                    value={remMatId}
                    onChange={(e) => setRemMatId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                  >
                    <option value="">-- اختر نوع المادة --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.thickness} مم) - {m.color}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">عرض الفضلة (مم)</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 600"
                      value={remWidth}
                      onChange={(e) => setRemWidth(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">ارتفاع الفضلة (مم)</label>
                    <input
                      type="number"
                      required
                      placeholder="مثال: 400"
                      value={remHeight}
                      onChange={(e) => setRemHeight(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">عدد الفضلات المطابقة</label>
                    <input
                      type="number"
                      required
                      placeholder="1"
                      value={remQty}
                      onChange={(e) => setRemQty(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 text-left font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">مكان تخزين الفضلة في الرف</label>
                    <input
                      type="text"
                      placeholder="مثال: رف B4"
                      value={remLocation}
                      onChange={(e) => setRemLocation(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    تسجيل وحفظ الفضلة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRemnant(false)}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📥 ADD / EDIT MATERIAL MODAL */}
      <AnimatePresence>
        {(showAddMaterial || editingMaterial) && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMaterial(false);
                    setEditingMaterial(null);
                    setAiClassificationResult(null);
                  }}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#c59257]" />
                  <span>
                    {editingMaterial ? "تعديل بيانات مادة خام" : "إضافة مادة خام جديدة للمستودع"}
                  </span>
                </span>
              </div>

              <form
                onSubmit={editingMaterial ? handleUpdateMaterial : handleCreateMaterial}
                className="space-y-4 text-xs text-zinc-300"
              >
                {/* Name field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-400 block mb-1 font-bold">اسم المادة الخام</label>
                    <span className="text-[10px] text-[#c59257] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      تصنيف تلقائي متزامن
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingMaterial ? editingMaterial.name : matName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (editingMaterial) {
                        setEditingMaterial({ ...editingMaterial, name: val });
                      } else {
                        setMatName(val);
                      }
                    }}
                    onBlur={() => {
                      const name = editingMaterial ? editingMaterial.name : matName;
                      const thickness = editingMaterial ? (editingMaterial.thickness?.toString() || "") : matThickness;
                      const color = editingMaterial ? (editingMaterial.color || "") : matColor;
                      const notes = editingMaterial ? (editingMaterial.notes || "") : matNotes;
                      if (name && name.trim().length >= 2) {
                        handleAiClassifyMaterial(name, thickness, color, notes, !!editingMaterial, true);
                      }
                    }}
                    placeholder="مثال: لوح أكريليك شفاف مميز 3مم"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                {/* AI Auto-Classify Widget & Proposal Preview */}
                <div className="bg-zinc-900/60 border border-[#c59257]/30 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isAiClassifying}
                      onClick={() => {
                        const name = editingMaterial ? editingMaterial.name : matName;
                        const thickness = editingMaterial ? (editingMaterial.thickness?.toString() || "") : matThickness;
                        const color = editingMaterial ? (editingMaterial.color || "") : matColor;
                        const notes = editingMaterial ? (editingMaterial.notes || "") : matNotes;
                        handleAiClassifyMaterial(name, thickness, color, notes, !!editingMaterial, false);
                      }}
                      className="px-3 py-1.5 bg-[#c59257]/15 hover:bg-[#c59257]/25 border border-[#c59257]/40 text-[#c59257] font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isAiClassifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري التصنيف بالذكاء الاصطناعي...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تصنيف ذكي تلقائي (AI Classification)</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#c59257]" />
                      التصنيف المعتمد للخامة
                    </span>
                  </div>

                  {aiClassificationResult ? (
                    <div className="bg-[#c59257]/10 border border-[#c59257]/30 p-3 rounded-lg text-right text-[11px] leading-relaxed space-y-2 animate-fadeIn">
                      <div className="flex justify-between items-center text-[#c59257]">
                        <span className="font-mono text-[10px] bg-[#c59257]/20 border border-[#c59257]/35 px-2 py-0.5 rounded-full font-bold">
                          دقة التنبؤ: {Math.round(aiClassificationResult.confidence * 100)}%
                        </span>
                        <span className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>التصنيف المقترح من الذكاء الاصطناعي قبل الحفظ</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-zinc-950/80 p-2.5 rounded-md border border-zinc-800">
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">الفئة الرئيسية المقترحة:</span>
                          <strong className="text-xs text-[#c59257] font-bold">{aiClassificationResult.category}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">التصنيف الفرعي المقترح:</span>
                          <span className="text-xs text-amber-300 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 inline-block">
                            {aiClassificationResult.subCategory}
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-300 text-[10.5px]">
                        <strong>التفسير والتحليل الفيزيائي:</strong> {aiClassificationResult.explanation}
                      </p>

                      <div className="pt-1 text-[10px] text-emerald-400 font-bold flex items-center gap-1 border-t border-[#c59257]/20">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>تم تطبيق التصنيف المقترح تلقائياً على النموذج أدناه، ويمكنك اعتماده أو تعديله يدوياً قبل الحفظ.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-500 bg-zinc-950/40 p-2.5 rounded-md border border-zinc-850 flex items-center justify-between">
                      <span>اكتب اسم المادة وسيتم اقتراح الفئة وتعبئة حقول التصنيف تلقائياً قبل الحفظ.</span>
                      {isAiClassifying && (
                        <span className="text-[#c59257] font-bold flex items-center gap-1 shrink-0">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          جاري التحليل...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Classification Category & SubCategory */}
                <div className="space-y-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#c59257]" />
                        <span>تصنيف المادة الرئيسي</span>
                      </label>
                      <select
                        value={editingMaterial ? editingMaterial.category : matCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editingMaterial) {
                            setEditingMaterial({ ...editingMaterial, category: val });
                          } else {
                            setMatCategory(val);
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                      >
                        <option value="الأكريليك">الأكريليك</option>
                        <option value="الأخشاب">الأخشاب</option>
                        <option value="الجلود">الجلود</option>
                        <option value="عام">عام</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>التصنيف الفرعي (Sub-Category)</span>
                      </label>
                      <input
                        type="text"
                        value={editingMaterial ? (editingMaterial.subCategory || "") : matSubCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editingMaterial) {
                            setEditingMaterial({ ...editingMaterial, subCategory: val });
                          } else {
                            setMatSubCategory(val);
                          }
                        }}
                        placeholder="مثال: شفاف، ملون، مرآة، MDF، طبيعي..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons for Sub-Category */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400 font-bold ml-1">اقتراحات سريعة:</span>
                    {(() => {
                      const activeCat = editingMaterial ? editingMaterial.category : matCategory;
                      let presets = ["شفاف", "ملون", "مرآة", "معتم", "ثلجي"];
                      if (activeCat === "الأخشاب") {
                        presets = ["MDF", "طبيعي", "معاكس (Plywood)", "قشور زان", "سويدي"];
                      } else if (activeCat === "الجلود") {
                        presets = ["طبيعي", "صناعي", "معالج بالليزر", "مقوى"];
                      } else if (activeCat === "عام") {
                        presets = ["معدن", "ورق مقوى", "زجاج", "قماش", "إسفنج"];
                      }

                      const currentSub = editingMaterial ? (editingMaterial.subCategory || "") : matSubCategory;

                      return presets.map((preset) => {
                        const isSelected = currentSub === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (editingMaterial) {
                                setEditingMaterial({ ...editingMaterial, subCategory: preset });
                              } else {
                                setMatSubCategory(preset);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#c59257] text-zinc-950 border-[#c59257] shadow-sm"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Thickness & Color */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1 font-sans text-right">السمك / السماكة (مم)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMaterial ? (editingMaterial.thickness ?? "") : matThickness}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, thickness: e.target.value ? parseFloat(e.target.value) : null });
                        } else {
                          setMatThickness(e.target.value);
                        }
                      }}
                      placeholder="مثال: 3"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1 font-sans text-right">اللون الفني</label>
                    <input
                      type="text"
                      value={editingMaterial ? (editingMaterial.color || "") : matColor}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, color: e.target.value });
                        } else {
                          setMatColor(e.target.value);
                        }
                      }}
                      placeholder="مثال: شفاف، أسود، طبيعي"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257] font-sans"
                    />
                  </div>
                </div>

                {/* Dimensions (Width x Height) */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1 font-sans text-right">عرض اللوح الكامل (مم)</label>
                    <input
                      type="number"
                      value={editingMaterial ? (editingMaterial.width ?? "") : matWidth}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, width: e.target.value ? parseFloat(e.target.value) : null });
                        } else {
                          setMatWidth(e.target.value);
                        }
                      }}
                      placeholder="مثال: 1220"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1 font-sans text-right">ارتفاع اللوح الكامل (مم)</label>
                    <input
                      type="number"
                      value={editingMaterial ? (editingMaterial.height ?? "") : matHeight}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, height: e.target.value ? parseFloat(e.target.value) : null });
                        } else {
                          setMatHeight(e.target.value);
                        }
                      }}
                      placeholder="مثال: 2440"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                {/* Price & Min Stock */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">سعر شراء اللوح/الوحدة بالليرة السورية الجديدة (ل.س)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={editingMaterial ? materialPriceSYP(editingMaterial.pricePerUnit) : matPrice}
                      onChange={(e) => {
                        const valueSYP = e.target.value ? parseFloat(e.target.value) : 0;
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, pricePerUnit: valueSYP });
                        } else {
                          setMatPrice(e.target.value);
                        }
                      }}
                      placeholder="مثال: 1,350"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono focus:outline-none focus:border-[#c59257]"
                    />
                    <div className="text-[10px] text-zinc-400 font-mono text-left">
                      ≈ ${(editingMaterial ? materialPriceUSD(editingMaterial.pricePerUnit, exchangeRate) : (Number(matPrice) || 0) / exchangeRate).toFixed(2)} عند سعر صرف {exchangeRate} ل.س/دولار
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">الحد الأدنى للتنبيه بالمستودع</label>
                    <input
                      type="number"
                      value={editingMaterial ? (editingMaterial.minimumStock ?? "") : matMinStock}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, minimumStock: e.target.value ? parseFloat(e.target.value) : 0 });
                        } else {
                          setMatMinStock(e.target.value);
                        }
                      }}
                      placeholder="مثال: 10"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono focus:outline-none focus:border-[#c59257]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1 font-bold">وحدة القياس</label>
                    <select
                      value={editingMaterial ? (editingMaterial.unit || "sheet") : matUnit}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, unit: e.target.value });
                        } else {
                          setMatUnit(e.target.value);
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                    >
                      <option value="sheet">لوح (sheet)</option>
                      <option value="piece">قطعة (piece)</option>
                      <option value="meter">متر (meter)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 block mb-1">المورد المعتمد</label>
                    <select
                      value={editingMaterial ? (editingMaterial.supplierId || "") : matSupplierId}
                      onChange={(e) => {
                        if (editingMaterial) {
                          setEditingMaterial({ ...editingMaterial, supplierId: e.target.value || null });
                        } else {
                          setMatSupplierId(e.target.value);
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                    >
                      <option value="">-- بدون مورد مخصص --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Storage Location */}
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">موقع التخزين المادي</label>
                  <input
                    type="text"
                    value={editingMaterial ? (editingMaterial.inventory?.location || "") : matLocation}
                    onChange={(e) => {
                      if (editingMaterial) {
                        setEditingMaterial({
                          ...editingMaterial,
                          inventory: {
                            ...(editingMaterial.inventory || {}),
                            location: e.target.value
                          }
                        });
                      } else {
                        setMatLocation(e.target.value);
                      }
                    }}
                    placeholder="مثال: رف 4B - مستودع المواد الأساسية"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-zinc-400 block mb-1">ملاحظات تشغيلية وفنية للمادة</label>
                  <textarea
                    value={editingMaterial ? (editingMaterial.notes || "") : matNotes}
                    onChange={(e) => {
                      if (editingMaterial) {
                        setEditingMaterial({ ...editingMaterial, notes: e.target.value });
                      } else {
                        setMatNotes(e.target.value);
                      }
                    }}
                    placeholder="مثال: سرعة قص 15 مم/ث، طاقة ليزر 65%، تجنب تعريض السطح للحرارة العالية لتجنب الاسوداد..."
                    className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer text-center"
                  >
                    {editingMaterial ? "حفظ التغييرات المعتمدة" : "إضافة الخامة للمستودع"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMaterial(false);
                      setEditingMaterial(null);
                      setAiClassificationResult(null);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 ADD / EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {(showAddProduct || editingProduct) && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-zinc-100">
                  {editingProduct ? "تعديل بيانات مادة / منتج" : "إضافة مادة أو خامة قص جديدة"}
                </span>
              </div>

              <form
                onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="text-zinc-500 block mb-1">اسم المنتج / الخامة</label>
                  <input
                    type="text"
                    required
                    value={editingProduct ? editingProduct.name : prodName}
                    onChange={(e) => {
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, name: e.target.value });
                      } else {
                        setProdName(e.target.value);
                      }
                    }}
                    placeholder="مثال: أكريليك شفاف 3 ملم مميز"
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-500 block mb-1">تصنيف المادة</label>
                    <select
                      value={editingProduct ? editingProduct.category : prodCategory}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, category: e.target.value });
                        } else {
                          setProdCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 text-right focus:outline-none focus:border-pink-500"
                    >
                      <option value="الأكريليك">الأكريليك</option>
                      <option value="الأخشاب">الأخشاب</option>
                      <option value="الجلود">الجلود</option>
                      <option value="عام">عام</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1">الرمز / الكود المميز</label>
                    <input
                      type="text"
                      value={editingProduct ? editingProduct.code : prodCode}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, code: e.target.value });
                        } else {
                          setProdCode(e.target.value);
                        }
                      }}
                      placeholder="مثال: ACR-3TR"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">الكمية بالمخزن (وحدة)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct ? (editingProduct.stock ?? "") : prodStock}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, stock: Number(e.target.value) });
                        } else {
                          setProdStock(e.target.value);
                        }
                      }}
                      placeholder="مثال: 100"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 block mb-1 text-right font-sans">سعر البيع الافتراضي ($)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={editingProduct ? editingProduct.price : prodPrice}
                      onChange={(e) => {
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, price: Number(e.target.value) });
                        } else {
                          setProdPrice(e.target.value);
                        }
                      }}
                      placeholder="مثال: 25.00"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-500 block mb-1">وصف المادة ومواصفاتها فنية</label>
                  <textarea
                    value={editingProduct ? (editingProduct.description ?? "") : prodDescription}
                    onChange={(e) => {
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, description: e.target.value });
                      } else {
                        setProdDescription(e.target.value);
                      }
                    }}
                    placeholder="مثال: ألواح أكريليك شفافة بمقاس 120x240 سم ممتازة للأحرف البارزة وقص ليزر CO2"
                    className="w-full h-20 bg-black border border-zinc-800 rounded p-2 text-zinc-200 text-right focus:outline-none focus:border-pink-500 font-sans"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    {editingProduct ? "حفظ التعديلات المعتمدة" : "إضافة إلى دليل الورشة"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProduct(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🖨️ PRINT JOB TICKET / INVOICE OVERLAY */}
      <AnimatePresence>
        {printTicketOrder && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-xl shadow-2xl p-8 space-y-6 text-right font-sans text-xs print:bg-white print:text-black print:border-0 print:shadow-none print:max-h-full print:p-4 print:w-full print:text-[11px] print:space-y-4"
            >
              {/* Header section (Logo and Ticket identity) */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b border-zinc-800 pb-5 gap-4 print:border-black print:pb-3">
                <div className="text-center sm:text-left order-2 sm:order-1 print:text-left">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest print:text-zinc-700">Laser Manufacturing Job Ticket</div>
                  <h2 className="text-xl font-black font-mono text-indigo-400 mt-1 print:text-black">{companySettings?.name || "AXIS LAB OPERATING SYSTEM"}</h2>
                  <p className="text-[10px] text-zinc-400 mt-0.5 print:text-zinc-600">أكسيس لاب - نظم التصنيع الرقمي وقص الليزر المتقدم</p>
                  
                  {/* WhatsApp & Instagram Contact Badge */}
                  <div className="flex items-center gap-2.5 text-[10.5px] mt-2 font-mono text-zinc-300 print:text-black flex-wrap justify-center sm:justify-start">
                    <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded print:bg-transparent print:border-black print:text-black font-bold">
                      <MessageCircle className="w-3 h-3 text-emerald-400 print:text-black" />
                      <span>واتساب: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-pink-950/40 text-pink-400 border border-pink-800/40 px-2 py-0.5 rounded print:bg-transparent print:border-black print:text-black font-bold">
                      <Instagram className="w-3 h-3 text-pink-400 print:text-black" />
                      <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                    </span>
                  </div>
                </div>
                <div className="text-center sm:text-right order-1 sm:order-2 print:text-right">
                  <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800 print:bg-transparent print:text-black print:border-black">
                    مستند إنتاجي / مالي معتمد
                  </span>
                  <h3 className="text-lg font-black text-zinc-100 mt-2.5 print:text-black">
                    تذكرة تشغيل وفاتورة رقم: <span className="font-mono text-indigo-400 font-black print:text-black">#{printTicketOrder.orderNumber}</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono print:text-zinc-700">ID: {printTicketOrder.id}</p>
                </div>
              </div>

              {/* Informative notification box (screen-only) */}
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg flex items-center gap-2 justify-end text-indigo-300 print:hidden text-[10.5px]">
                <span>اضغط على زر الطباعة في الأسفل لبدء إرسال الأمر للطابعة الحرارية أو العادية للورشة. تم تنسيق هذا المستند خصيصاً للتوفير الفائق في الحبر والورق.</span>
                <Info className="w-4 h-4 shrink-0" />
              </div>

              {/* Meta Grid (Client & Manufacturing Specs) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-900 pb-5 print:border-black print:pb-3 text-xs print:text-[10px]">
                {/* Client Box */}
                {(() => {
                  const cust = customers.find(c => c.id === printTicketOrder.customerId);
                  return (
                    <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2 print:border-black print:bg-transparent print:p-2">
                      <h4 className="text-indigo-400 font-bold border-b border-zinc-800/80 pb-1 flex items-center justify-end gap-1 print:text-black print:border-black">
                        <span>بيانات ومستند العميل</span>
                        <Users className="w-3.5 h-3.5" />
                      </h4>
                      <div className="flex justify-between">
                        <span className="font-bold text-zinc-200 print:text-black">{cust?.name || "عميل عام"}</span>
                        <span className="text-zinc-500 print:text-zinc-700">اسم العميل:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-mono text-zinc-300 print:text-black">
                          {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.phone || "غير متوفر")}
                        </span>
                        <span className="text-zinc-500 print:text-zinc-700">رقم الاتصال:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-300 print:text-black">
                          {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.company || "لا يوجد")}
                        </span>
                        <span className="text-zinc-500 print:text-zinc-700">الجهة / الشركة:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-300 print:text-black">
                          {currentUser?.role === 'accountant' ? "🔒 محمي" : (cust?.address || "التسليم بالورشة")}
                        </span>
                        <span className="text-zinc-500 print:text-zinc-700">العنوان المستهدف:</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Machine / Timeline Box */}
                <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2 print:border-black print:bg-transparent print:p-2">
                  <h4 className="text-rose-400 font-bold border-b border-zinc-800/80 pb-1 flex items-center justify-end gap-1 print:text-black print:border-black">
                    <span>جدولة التصنيع والمواعيد</span>
                    <Wrench className="w-3.5 h-3.5" />
                  </h4>
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-300 print:text-black">
                      {new Date(printTicketOrder.createdAt).toLocaleString('ar-EG')}
                    </span>
                    <span className="text-zinc-500 print:text-zinc-700">تاريخ تسجيل الطلب:</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-zinc-300 font-bold text-amber-400 print:text-black">
                      {printTicketOrder.deliveryDateExpected ? new Date(printTicketOrder.deliveryDateExpected).toLocaleString('ar-EG') : "فوري"}
                    </span>
                    <span className="text-zinc-500 print:text-zinc-700">التسليم المتوقع:</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono uppercase font-black text-rose-500 print:text-black">
                      {printTicketOrder.priority}
                    </span>
                    <span className="text-zinc-500 print:text-zinc-700">أولوية الاستعجال:</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase font-mono font-bold text-emerald-400 print:text-black">
                      {printTicketOrder.status}
                    </span>
                    <span className="text-zinc-500 print:text-zinc-700">الحالة التشغيلية للطلب:</span>
                  </div>
                </div>
              </div>

              {/* Items List (The absolute core of laser operators) */}
              <div className="space-y-2 print:space-y-1">
                <h4 className="text-xs font-bold text-zinc-300 flex items-center justify-end gap-1 print:text-black print:text-[10px]">
                  <span>جدول مواد وخامات تفصيل القص المطلوب</span>
                  <Layers className="w-3.5 h-3.5 text-indigo-400 print:hidden" />
                </h4>
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden print:border-black print:rounded-none">
                  <table className="w-full text-xs text-right print:text-[9.5px]">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 print:bg-zinc-100 print:text-black print:border-black">
                        <th className="p-3 text-right">المادة والسمك / تعليمات القص للفني</th>
                        <th className="p-3 text-center w-20">الكمية</th>
                        <th className="p-3 text-left w-28">السعر الفردي</th>
                        <th className="p-3 text-left w-28">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 print:divide-black">
                      {printTicketOrder.items && printTicketOrder.items.map((it, idx) => (
                        <tr key={it.id || idx} className="text-zinc-300 print:text-black hover:bg-zinc-900/10">
                          <td className="p-3 text-right">
                            <div className="font-bold text-zinc-200 print:text-black">{it.productName}</div>
                            {it.notes && (
                              <div className="text-[10px] text-indigo-400 mt-1 font-sans leading-relaxed flex items-center gap-1 justify-end print:text-zinc-700 print:font-bold">
                                <span>{it.notes}</span>
                                <span className="text-zinc-600 select-none print:text-black">←</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-3 text-left font-mono">{Number(it.unitPrice || 0).toLocaleString()} ل.س</td>
                          <td className="p-3 text-left font-mono font-bold text-indigo-400 print:text-black">{Math.round(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toLocaleString()} ل.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Order notes if exists */}
              {printTicketOrder.notes && (
                <div className="bg-amber-950/10 border border-amber-900/20 p-3.5 rounded-lg text-right print:border-black print:rounded-none">
                  <span className="text-[10.5px] text-amber-400 font-bold block mb-1 print:text-black">ملاحظات وتعليمات إنتاجية عامة:</span>
                  <p className="text-xs text-zinc-300 leading-relaxed print:text-black print:text-[10px]">{printTicketOrder.notes}</p>
                </div>
              )}

              {/* Financial calculations block */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-2.5 print:border-black print:p-3 print:rounded-none print:w-64 text-xs print:text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-zinc-200 font-bold print:text-black">{Number(printTicketOrder.totalPrice || 0).toLocaleString()} ل.س</span>
                    <span className="text-zinc-500 print:text-zinc-700">إجمالي قيمة الفاتورة:</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-850/80 pb-2 print:border-black">
                    <span className="font-mono text-emerald-400 font-bold print:text-black">{Number(printTicketOrder.paidAmount || 0).toLocaleString()} ل.س</span>
                    <span className="text-zinc-500 print:text-zinc-700">المبلغ المقبوض سلفاً:</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-mono text-lg font-black text-indigo-400 print:text-black print:text-xs">
                      {Number(printTicketOrder.remaining || 0).toLocaleString()} ل.س
                    </span>
                    <span className="font-bold text-zinc-300 print:text-black">المبلغ المتبقي المستحق:</span>
                  </div>
                </div>
              </div>

              {/* G-code metadata calibration if exists (so operator sees configuration) */}
              {orderGcodeResult && (
                <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg text-right print:border-black print:rounded-none">
                  <span className="text-[10px] text-indigo-400 font-bold block mb-1 print:text-black">توجيه فني للقص الرقمي (G-Code):</span>
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed print:text-black">{orderGcodeResult.calibrationAdvice}</p>
                </div>
              )}

              {/* Signature Lines for legal, employee accountability, and workshop verification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 text-center text-xs print:text-[9.5px] print:pt-4 print:grid-cols-3">
                {/* 1. Employee Signature Field */}
                <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
                  <div className="space-y-0.5">
                    <span className="text-indigo-400 font-bold block print:text-black text-xs">
                      توقيع الموظف المسؤول
                    </span>
                    <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                      (منظم ومحرر الفاتورة)
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
                    <span className="text-[10px] text-zinc-300 print:text-black font-bold mb-1">
                      {currentUser?.fullName || "الموظف المختص"}
                    </span>
                    <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">توقيع واعتماد الموظف</span>
                  </div>
                </div>

                {/* 2. Laser Workshop Engineer / Operator Signature */}
                <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
                  <div className="space-y-0.5">
                    <span className="text-rose-400 font-bold block print:text-black text-xs">
                      اعتماد مهندس الورشة
                    </span>
                    <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                      (فني تشغيل ليزر CO2)
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
                    <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">توقيع مهندس التشغيل</span>
                  </div>
                </div>

                {/* 3. Customer Signature */}
                <div className="space-y-8 bg-zinc-900/30 border border-zinc-850 p-3 rounded-xl print:bg-transparent print:border-black print:p-1">
                  <div className="space-y-0.5">
                    <span className="text-emerald-400 font-bold block print:text-black text-xs">
                      توقيع واستلام العميل
                    </span>
                    <span className="text-[9.5px] text-zinc-500 print:text-zinc-700 block">
                      (المستلم المعتمد للطلبية)
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-[10px] text-zinc-400 print:text-black font-mono">
                    <span className="border-t border-dashed border-zinc-700 pt-1.5 w-32 print:border-black">اسم وتوقيع المستلم</span>
                  </div>
                </div>
              </div>

              {/* 📱 DYNAMIC QR CODE FOR PUBLIC TRACKING & PDF ACCESS */}
              {(() => {
                const qrCodeUrl = typeof window !== 'undefined' 
                  ? `${window.location.origin}/api/orders/${printTicketOrder.id}/pdf` 
                  : `https://axislab-portal.sy/api/orders/${printTicketOrder.id}/pdf`;
                return (
                  <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-4 print:bg-white print:border-black print:p-2 print:rounded-lg">
                    <div className="space-y-1 text-right flex-1">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-indigo-400 print:text-black">
                        <span>تتبع الطلب وتحميل الفاتورة إلكترونياً (QR Code)</span>
                        <QrCode className="w-4 h-4 text-[#c59257] print:text-black" />
                      </div>
                      <p className="text-[10.5px] text-zinc-400 leading-relaxed print:text-zinc-700">
                        امسح الكود عبر كاميرا الهاتف لتتبع حالة قص وتصنيع الطلب بالورشة أو لاستعراض وتحميل وثيقة الفاتورة الرسمية (PDF).
                      </p>
                      <div className="text-[9px] font-mono text-zinc-500 truncate dir-ltr text-left print:text-black print:font-bold">
                        {qrCodeUrl}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-zinc-700 shadow-md print:border-black print:shadow-none shrink-0 flex items-center justify-center">
                      <QRCodeSVG 
                        value={qrCodeUrl} 
                        size={84} 
                        bgColor="#ffffff" 
                        fgColor="#000000" 
                        level="M" 
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Document footer notice */}
              <div className="border-t border-zinc-900 pt-4 text-center text-[10px] text-zinc-400 print:border-black print:text-black space-y-1">
                <div className="flex items-center justify-center gap-4 text-xs font-bold flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                    <span>واتساب المبيعات: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
                    <span>إنستغرام الورشة: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500 print:text-zinc-700 font-mono">
                  AXIS LAB OS • Powered by Advanced CNC Laser Systems • تم توليد وحساب هذا المستند برمجياً بالكامل وهو مستند إنتاجي ومالي معتمد.
                </p>
              </div>

              {/* Actions Section (Hidden on Print) */}
              <div className="pt-4 flex gap-2 justify-end print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
                >
                  <Printer className="w-4 h-4" />
                  <span>تأكيد الطباعة الفعلية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTicketOrder(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق المعاينة والعودة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Product Files Modal */}
      <AnimatePresence>
        {selectedProductFiles && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  onClick={() => setSelectedProductFiles(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#c59257] font-bold text-sm">ملفات ووثائق المنتج: {selectedProductFiles.name}</span>
                  <FolderOpen className="w-4 h-4 text-[#c59257]" />
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                ارفع رسومات المتجهات أو صور التصاميم أو كود G-Code النموذجي المرتبط بهذا المنتج لتسريع معايرة التشغيل عند الطلب.
              </p>
              <FileUploader entityType="product" entityId={selectedProductFiles.id} />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedProductFiles(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Customer Files Modal */}
      <AnimatePresence>
        {selectedCustomerFiles && currentUser?.role !== 'accountant' && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  onClick={() => setSelectedCustomerFiles(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#c59257] font-bold text-sm">ملفات ومستندات العميل: {selectedCustomerFiles.name}</span>
                  <FolderOpen className="w-4 h-4 text-[#c59257]" />
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                احتفظ بسجلات العقود أو فواتير العميل أو المتطلبات التشغيلية والتصميمية ليكون الوصول إليها سهلاً عند تنفيذ مهام قص الليزر للعميل.
              </p>
              <FileUploader entityType="customer" entityId={selectedCustomerFiles.id} />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedCustomerFiles(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Material Files Modal */}
      <AnimatePresence>
        {selectedMaterialFiles && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl p-6 space-y-4 text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  onClick={() => setSelectedMaterialFiles(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[#c59257] font-bold text-sm">وثائق وملفات الخامة: {selectedMaterialFiles.name}</span>
                  <FolderOpen className="w-4 h-4 text-[#c59257]" />
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                ارفق شهادات الجودة الفنية للخامة أو كتالوجات السلامة والحرارة المناسبة لتشغيل ليزر CO2 على هذه الخامة لتلافي الأخطاء التشغيلية.
              </p>
              <FileUploader entityType="material" entityId={selectedMaterialFiles.id} />
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedMaterialFiles(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Command Palette / Search Modal */}
      <AnimatePresence>
        {isSearchPaletteOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-[10vh] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -20 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden font-sans text-right flex flex-col"
            >
              {/* Search Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-3 bg-zinc-900/20">
                <button
                  onClick={() => {
                    setIsSearchPaletteOpen(false);
                    setSearchQuery("");
                    setSearchResults(null);
                  }}
                  className="px-2 py-1 text-[10px] text-zinc-500 hover:text-white rounded bg-zinc-900 border border-zinc-800 transition-colors"
                >
                  إغلاق (Esc)
                </button>
                <div className="flex-1 relative">
                  <input
                    autoFocus
                    type="text"
                    placeholder="البحث الشامل في الورشة... (رقم طلب، عميل، منتج، خامة)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#c59257]/50 focus:ring-1 focus:ring-[#c59257]/30 text-right"
                  />
                  {isSearching && (
                    <div className="absolute left-3 top-3">
                      <span className="w-4 h-4 border-2 border-[#c59257] border-t-transparent rounded-full animate-spin block"></span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[#c59257]">
                  <span className="text-xs font-bold font-mono">CTRL + K</span>
                  <Search className="w-4 h-4" />
                </div>
              </div>

              {/* Search Results Area */}
              <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4">
                {!searchQuery.trim() ? (
                  <div className="text-center py-10 text-zinc-500 space-y-2">
                    <Command className="w-8 h-8 text-zinc-700 mx-auto animate-pulse" />
                    <p className="text-xs">اكتب أي كلمة مفتاحية للبحث الفوري في كافة كيانات نظام AXIS LAB</p>
                    <p className="text-[10px] text-zinc-600 font-mono">تبحث هذه الأداة في الطلبات والعملاء والمنتجات والمواد والفواتير</p>
                  </div>
                ) : searchResults && (
                  Object.values(searchResults as Record<string, unknown[]>).every((arr) => arr.length === 0) ? (
                    <div className="text-center py-12 text-zinc-500 font-sans">
                      لا توجد نتائج مطابقة لـ "<span className="text-zinc-200 font-semibold">{searchQuery}</span>"
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Orders Results */}
                      {searchResults.orders && searchResults.orders.length > 0 && (
                        <div className="space-y-1.5 text-right">
                          <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-indigo-500">الطلبات الفنية</h4>
                          <div className="grid grid-cols-1 gap-1">
                            {searchResults.orders.map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveView("orders");
                                  setIsSearchPaletteOpen(false);
                                  setSearchQuery("");
                                  setSearchResults(null);
                                }}
                                className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                              >
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  item.status === 'new' ? 'bg-indigo-950 text-indigo-400' : 'bg-emerald-950 text-emerald-400'
                                }`}>
                                  {item.status === 'new' ? 'جديد' : 'مكتمل'}
                                </span>
                                <div className="text-right">
                                  <div className="font-semibold text-zinc-200">طلب #{item.orderNumber || item.id}</div>
                                  <div className="text-[10px] text-zinc-500">العميل: {item.customerName || "غير محدد"} • القيمة: ${item.totalPrice}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Customers Results */}
                      {searchResults.customers && searchResults.customers.length > 0 && (
                        <div className="space-y-1.5 text-right">
                          <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-emerald-500">قاعدة بيانات العملاء</h4>
                          <div className="grid grid-cols-1 gap-1">
                            {searchResults.customers.map((item: any) => (
                              <div
                                key={item.id}
                                className="w-full p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomerIdForOrder(item.id);
                                      setShowAddOrder(true);
                                      setIsSearchPaletteOpen(false);
                                      setSearchQuery("");
                                      setSearchResults(null);
                                    }}
                                    className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="إنشاء طلب جديد فوري لهذا العميل"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>طلب جديد</span>
                                  </button>
                                  <span className="text-[10px] text-zinc-500 font-mono">{item.phone}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveView("database");
                                    setIsSearchPaletteOpen(false);
                                    setSearchQuery("");
                                    setSearchResults(null);
                                  }}
                                  className="text-right hover:underline cursor-pointer"
                                >
                                  <div className="font-semibold text-zinc-200">{item.name}</div>
                                  <div className="text-[10px] text-zinc-500">{item.email} • {item.address}</div>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Products Results */}
                      {searchResults.products && searchResults.products.length > 0 && (
                        <div className="space-y-1.5 text-right">
                          <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-[#c59257]">مكتبة المنتجات والتصاميم</h4>
                          <div className="grid grid-cols-1 gap-1">
                            {searchResults.products.map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveView("products");
                                  setIsSearchPaletteOpen(false);
                                  setSearchQuery("");
                                  setSearchResults(null);
                                }}
                                className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                              >
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{item.category}</span>
                                <div className="text-right">
                                  <div className="font-semibold text-zinc-200">{item.name}</div>
                                  <div className="text-[10px] text-zinc-500">كود المنتج: {item.code || "N/A"}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Materials Results */}
                      {searchResults.materials && searchResults.materials.length > 0 && (
                        <div className="space-y-1.5 text-right">
                          <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-amber-500">المخازن والمواد الأولية</h4>
                          <div className="grid grid-cols-1 gap-1">
                            {searchResults.materials.map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveView("database");
                                  setIsSearchPaletteOpen(false);
                                  setSearchQuery("");
                                  setSearchResults(null);
                                }}
                                className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                              >
                                <span className="text-[10px] text-zinc-400 font-mono">{item.thickness} مم</span>
                                <div className="text-right">
                                  <div className="font-semibold text-zinc-200">{item.name}</div>
                                  <div className="text-[10px] text-zinc-500">الفئة: {item.category} • السعر: ${item.unitPrice}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Invoices Results */}
                      {searchResults.invoices && searchResults.invoices.length > 0 && (
                        <div className="space-y-1.5 text-right">
                          <h4 className="text-[11px] font-bold text-zinc-500 px-1 border-r-2 border-purple-500">الفواتير والدفعات المالية</h4>
                          <div className="grid grid-cols-1 gap-1">
                            {searchResults.invoices.map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveView("accounting");
                                  setIsSearchPaletteOpen(false);
                                  setSearchQuery("");
                                  setSearchResults(null);
                                }}
                                className="w-full text-right p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700 transition-colors flex items-center justify-between text-xs"
                              >
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  item.status === 'paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                                }`}>
                                  {item.status === 'paid' ? 'مدفوعة' : 'مستحقة'}
                                </span>
                                <div className="text-right">
                                  <div className="font-semibold text-zinc-200">فاتورة #{item.invoiceNumber || item.id}</div>
                                  <div className="text-[10px] text-zinc-500">الإجمالي: ${item.amount} • الضريبة: {item.taxAmount || 0}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Search Footer */}
              <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                <span>تكامل ذكي فوري لنظام AXIS LAB</span>
                <span>اضغط على أي نتيجة للانتقال التلقائي للقسم والفلترة</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🛑 DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-right font-sans space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-rose-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>تأكيد الحذف النهائي</span>
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف {deleteConfirmTarget.type === 'customer' ? 'العميل' : 'المنتج'}{" "}
                  <strong className="text-white font-semibold">"{deleteConfirmTarget.name}"</strong> نهائياً من النظام؟
                </p>
                <p className="text-[10px] text-zinc-500 bg-rose-950/20 border border-rose-950/40 p-2.5 rounded-lg leading-normal">
                  تنبيه: هذا الإجراء سيقوم بمسح السجل بشكل دائم من قاعدة البيانات، ولا يمكن التراجع عن هذه الخطوة بأي حال من الأحوال.
                </p>
              </div>

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={async () => {
                    if (deleteConfirmTarget.type === 'customer') {
                      await handleDeleteCustomer(deleteConfirmTarget.id, deleteConfirmTarget.name);
                    } else if (deleteConfirmTarget.type === 'product') {
                      await handleDeleteProduct(deleteConfirmTarget.id, deleteConfirmTarget.name);
                    }
                    setDeleteConfirmTarget(null);
                  }}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  نعم، تأكيد الحذف النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold rounded-lg transition-colors cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📘 HELP & SHORTCUTS ONBOARDING GUIDE MODAL */}
      <AnimatePresence>
        {isHelpGuideOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] border border-zinc-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right font-sans"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-850 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHelpGuideOpen(false)}
                  className="px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
                >
                  إغلاق ×
                </button>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#c59257] animate-pulse" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    مركز المساعدة والتدريب والتشغيل السريع (10x UX Centre)
                  </h3>
                </div>
              </div>

              {/* Body Content */}
              <div className="overflow-y-auto flex-1">
                <HelpCenter />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ❓ CONTEXT-SENSITIVE QUICK HELP MODAL */}
      <HelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
        currentView={activeView}
        onOpenFullGuide={() => setIsHelpGuideOpen(true)}
      />

      {/* 📤 SHARE ORDER MODAL */}
      <AnimatePresence>
        {showShareModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-sans text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl max-w-2xl w-full space-y-5 shadow-2xl relative overflow-hidden text-right"
            >
              {/* Header decor */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-[#c59257]"></div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmailSuccess(false);
                }}
                className="absolute top-4 left-4 p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Title */}
              <div className="flex items-center gap-2 justify-start mt-2">
                <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-900/30 flex items-center justify-center text-[#c59257]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">مشاركة وثائق ومستندات الطلب</h3>
                  <p className="text-[10px] text-zinc-500">رقم الطلب المرجعي: <span className="font-mono text-amber-500 font-bold">#{selectedOrder.orderNumber}</span></p>
                </div>
              </div>

              {/* Customer overview */}
              {(() => {
                const cust = customers.find(c => c.id === selectedOrder.customerId);
                return (
                  <div className="bg-zinc-900/40 border border-zinc-850 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-300 text-right">
                    <div className="text-right">
                      <span className="text-zinc-500 block">العميل المستلم:</span>
                      <span className="font-bold text-zinc-200">{cust?.name || "عميل عام"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block">رقم الهاتف:</span>
                      <span className="font-mono text-zinc-200">{cust?.phone || "غير متوفر"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block">إجمالي المستحق:</span>
                      <span className="font-bold text-[#c59257]">{Number(selectedOrder.totalPrice || 0).toLocaleString()} ل.س</span>
                    </div>
                  </div>
                );
              })()}

              {/* Tabs selector */}
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShareMethod('email')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'email'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>البريد الإلكتروني</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('whatsapp')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'whatsapp'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب سريع</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMethod('pdf')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    shareMethod === 'pdf'
                      ? "bg-[#c59257] text-zinc-950 font-black"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ملف ورابط PDF</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[200px] flex flex-col justify-between text-right">
                {shareMethod === 'email' && (
                  <div className="space-y-3 text-right">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="text-right">
                        <label className="text-zinc-500 block mb-1">البريد الإلكتروني للعميل</label>
                        <input
                          type="email"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono focus:border-[#c59257] focus:outline-none text-right"
                          placeholder="client@example.com"
                        />
                      </div>
                      <div className="text-right">
                        <label className="text-zinc-500 block mb-1">عنوان الرسالة</label>
                        <input
                          type="text"
                          value={shareSubject}
                          onChange={(e) => setShareSubject(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-200 focus:border-[#c59257] focus:outline-none text-right"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <label className="text-zinc-500 block mb-1 text-xs">نص ومحتوى ملخص الفاتورة والطلب</label>
                      <textarea
                        rows={6}
                        value={shareBody}
                        onChange={(e) => setShareBody(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-zinc-300 font-sans text-[11px] leading-relaxed focus:border-[#c59257] focus:outline-none resize-none text-right"
                      />
                    </div>

                    {shareEmailSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-950/40 border border-emerald-900/30 p-3 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2 justify-start text-right"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>تم إرسال ملخص الطلب بنجاح، وتم تسجيل الحركة في سجل تتبع الورشة!</span>
                      </motion.div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSharingEmail}
                        onClick={handleSendEmailShare}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-[#c59257] hover:brightness-110 text-zinc-950 font-black rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        {isSharingEmail ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري إرسال البريد الإلكتروني للمستلم...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>إرسال ملخص الطلب الآن للعميل</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {shareMethod === 'whatsapp' && (
                  <div className="space-y-4 text-right">
                    <p className="text-[10px] text-zinc-500 leading-relaxed text-right">
                      يتيح لك هذا الخيار نسخ وتنسيق رسالة رسمية لتبادلها وتأكيدها مع العميل مباشرة عبر تطبيق واتساب لضمان أرشفة الاتفاقات والدفعات والملخص المالي للطلب.
                    </p>
                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-zinc-300 text-[11px] font-sans leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto text-right" dir="rtl">
                      {shareBody}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(shareBody, 'msg')}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{shareMsgCopied ? "تم نسخ النص!" : "نسخ نص الرسالة ورقم الاتصال"}</span>
                      </button>
                      
                      {(() => {
                        const cust = customers.find(c => c.id === selectedOrder.customerId);
                        const cleanPhone = cust?.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
                        const formattedPhone = cleanPhone ? (cleanPhone.startsWith('963') || cleanPhone.startsWith('00') ? cleanPhone : '963' + cleanPhone.replace(/^0/, '')) : '';
                        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(shareBody)}`;
                        return (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>مشاركة على واتساب العميل</span>
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {shareMethod === 'pdf' && (
                  <div className="space-y-4 text-center">
                    <div className="max-w-md mx-auto py-3">
                      <div className="w-12 h-12 bg-indigo-950/40 border border-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-indigo-400 mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200 mb-1">تحميل ومشاركة رابط الـ PDF المباشر</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed px-4">
                        سند التشغيل والفاتورة متاحان دائماً كملف PDF رسمي مصمم بأسلوب متكامل يناسب الطباعة كمرجع مالي وفني.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                      <a
                        href={`/api/orders/${selectedOrder.id}/pdf`}
                        download={`order_${selectedOrder.orderNumber}.pdf`}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تحميل وتنزيل PDF مباشر</span>
                      </a>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const directLink = `${window.location.origin}/api/orders/${selectedOrder.id}/pdf`;
                          handleCopyText(directLink, 'pdf');
                        }}
                        className="flex-1 py-2 bg-[#c59257] hover:bg-[#b07e43] text-zinc-950 font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{sharePdfCopied ? "تم نسخ الرابط!" : "نسخ رابط الـ PDF للمشاركة"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-850 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmailSuccess(false);
                  }}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  إغلاق نافذة المشاركة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ FLOATING QUICK ACTIONS MENU */}
      <div className="fixed bottom-6 right-6 z-40 font-sans text-right">
        <AnimatePresence>
          {isQuickActionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-3 mb-4"
            >
              {/* Action 1: Add Order */}
              <motion.button
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowAddOrder(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-emerald-500/50 transition-all cursor-pointer group"
              >
                <span className="text-xs text-zinc-300 font-bold group-hover:text-emerald-400 transition-colors">صياغة طلب جديد</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-900/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <PlusCircle className="w-4 h-4" />
                </div>
              </motion.button>

              {/* Action 2: Create Job */}
              <motion.button
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowAddJob(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer group"
              >
                <span className="text-xs text-zinc-300 font-bold group-hover:text-indigo-400 transition-colors">إدراج مهمة إنتاج</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-900/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Activity className="w-4 h-4" />
                </div>
              </motion.button>

              {/* Action 3: Add Material */}
              <motion.button
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowAddProduct(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl hover:border-[#c59257]/50 transition-all cursor-pointer group"
              >
                <span className="text-xs text-zinc-300 font-bold group-hover:text-[#c59257] transition-colors">إضافة مادة / خامة قص</span>
                <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-900/40 flex items-center justify-center text-[#c59257] group-hover:bg-[#c59257] group-hover:text-zinc-950 transition-all">
                  <Layers className="w-4 h-4" />
                </div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Toggle FAB */}
        <motion.button
          onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isQuickActionsOpen ? 135 : 0 }}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c59257] to-[#ffd166] text-zinc-950 flex items-center justify-center shadow-2xl cursor-pointer hover:shadow-gold-500/20 hover:brightness-110 transition-all"
          title="الإجراءات السريعة"
        >
          {isQuickActionsOpen ? <X className="w-5 h-5 font-bold" /> : <Zap className="w-5 h-5 font-bold" />}
        </motion.button>
      </div>

      {/* Standalone Cut Progress Modal (جدول شو يلي انقص وشو يلي لسا) */}
      <AnimatePresence>
        {progressModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-zinc-950/90 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-100 flex items-center gap-2">
                      <span>جدول تفصيل إنجاز القص (شو يلي انقص وشو يلي لسا)</span>
                      <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 text-xs">
                        #{progressModalOrder.orderNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      تحديد كميات القطع المنجزة والمتبقية للقص بالليزر ليتم احتساب النسبة الإجمالية تلقائياً
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProgressModalOrder(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {renderCutProgressInteractiveTable(progressModalOrder)}
              </div>

              {/* Modal Footer */}
              <div className="bg-zinc-950/90 border-t border-zinc-800 px-6 py-3.5 flex items-center justify-between text-xs">
                <div className="text-zinc-400">
                  <span>العميل: <strong className="text-zinc-200">{customers.find(c => c.id === progressModalOrder.customerId)?.name || "عميل عام"}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(progressModalOrder);
                      setProgressModalOrder(null);
                    }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    عرض كامل تفاصيل الطلب
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressModalOrder(null)}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-lg shadow-cyan-950/50"
                  >
                    تم الحفظ وإغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </>
  );
}

// Generated decomposition boundary: AccountingModals

export default function AccountingModals({ ctx }: { ctx: Record<string, any> }) {
  const { AccountingView, Activity, AlertCircle, AnimatePresence, ArrowDown, ArrowUp, Bar, BarChart, COLORS, Calculator, Calendar, Cell, Check, CheckCircle, Clock, Copy, CreditCard, Customer, DEFAULT_EXCHANGE_RATE, DollarSign, Download, EXCHANGE_RATE_STORAGE_KEY, Edit, Expense, FileText, Filter, Hash, Instagram, Invoice, Legend, MessageCircle, MessageSquare, Pie, PieChart, Plus, Printer, QRCodeSVG, QrCode, React, RechartsTooltip, ReportsView, ResponsiveContainer, Search, Send, Share2, Sparkles, Trash2, TrendingUp, User, Wallet, X, XAxis, YAxis, activeTab, companySettings, currentUserRole, customerCategoryFilter, customerSearch, customers, editedInvoiceDiscount, editedInvoiceDueDate, editedInvoiceItems, editedInvoiceNotes, editedInvoiceTaxPercent, editingExpense, exchangeRate, expenseAmount, expenseCategories, expenseCategory, expenseDate, expenseDesc, expenseFilter, expenseSearch, expenseStatus, expenses, fetchData, fetchExchangeRate, filteredExpenses, filteredInvoices, formatMoney, formatMoneyString, handleChangeInvoiceStatus, handleCopyReportText, handleCreateInvoice, handleDeleteExpense, handleExchangeRateUpdate, handleExpenseSubmit, handleExportCSV, handleIssueCreditNote, handlePrintReport, handleRecordPayment, handleSelectInvoice, handleShareInvoiceWhatsApp, handleUpdateSelectedInvoice, initialCompanySettings, initialTab, invoiceFilter, invoicePaymentIdempotencyKeyRef, invoiceSearch, invoiceToPrint, invoices, isEditingSelectedInvoice, isLoading, isSubmittingInvoicePaymentRef, modalFilter, motion, newInvCustomer, newInvDueDate, newInvNotes, newInvTotal, onRefreshOrders, paymentAmount, paymentCurrency, paymentError, paymentNotes, printedPaidSYP, printedPaidUSD, printedRate, printedRemainingSYP, printedRemainingUSD, printedTotalSYP, printedTotalUSD, recordingPaymentInvoice, sanitizeExchangeRate, selectedCurrency, selectedInvoice, setActiveTab, setCompanySettings, setCustomerCategoryFilter, setCustomerSearch, setEditedInvoiceDiscount, setEditedInvoiceDueDate, setEditedInvoiceItems, setEditedInvoiceNotes, setEditedInvoiceTaxPercent, setEditingExpense, setExchangeRate, setExpenseAmount, setExpenseCategory, setExpenseDate, setExpenseDesc, setExpenseFilter, setExpenseSearch, setExpenseStatus, setExpenses, setInvoiceFilter, setInvoiceSearch, setInvoiceToPrint, setInvoices, setIsEditingSelectedInvoice, setIsLoading, setModalFilter, setNewInvCustomer, setNewInvDueDate, setNewInvNotes, setNewInvTotal, setPaymentAmount, setPaymentCurrency, setPaymentError, setPaymentNotes, setRecordingPaymentInvoice, setSelectedCurrency, setSelectedInvoice, setShowAddExpense, setShowAddInvoice, setShowSummaryReportModal, setStats, setSummaryReportCopied, showAddExpense, showAddInvoice, showSummaryReportModal, stats, summaryReportCopied, updateExchangeRate, usdToSyp, useEffect, useRef, useState } = ctx;
  return (
<AnimatePresence>

        {/* Modal: Simple Financial Summary Report */}
        {showSummaryReportModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-4xl relative text-right shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSummaryReportModal(false)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="border-b border-zinc-900 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 justify-end order-2 sm:order-1">
                  <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-1 rounded text-zinc-500 font-mono">
                    سعر الصرف: {exchangeRate.toLocaleString()} ل.س/$
                  </span>
                </div>
                <h4 className="text-base font-black text-zinc-100 flex items-center gap-2 justify-end order-1 sm:order-2">
                  <FileText className="w-5 h-5 text-[#c59257]" />
                  <span>التقرير المالي المبسط ومطابقة الحسابات</span>
                </h4>
              </div>

              {/* Modal Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">إجمالي المطالبات</span>
                  <div className="text-sm font-mono text-zinc-300 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.totalPrice, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">إجمالي المقبوضات</span>
                  <div className="text-sm font-mono text-emerald-400 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">الذمم المعلقة</span>
                  <div className="text-sm font-mono text-amber-500 font-bold">
                    ${invoices.reduce((sum, inv) => sum + inv.remaining, 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-zinc-900/60">
                  <span className="text-[9px] text-zinc-500 font-bold block mb-1">الذمم بالليرة السورية</span>
                  <div className="text-sm font-mono text-[#c59257] font-bold">
                    {Math.round(invoices.reduce((sum, inv) => sum + Number(inv.remaining || 0), 0)).toLocaleString()} ل.س
                  </div>
                </div>
              </div>

              {/* Toolbar & Filter Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-black/60 border border-zinc-900/80 p-2.5 rounded-xl mb-4 gap-3">
                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 bg-[#c59257]/10 hover:bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/20 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير CSV / Excel</span>
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-400" />
                    <span>طباعة التقرير</span>
                  </button>
                  <button
                    onClick={handleCopyReportText}
                    className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-400 border border-indigo-900/50 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    {summaryReportCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ النص للواتساب</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-zinc-900 border border-zinc-850 p-0.5 rounded-lg w-full sm:w-auto">
                  <button
                    onClick={() => setModalFilter("cleared")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "cleared" ? "bg-black text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    المسددة بالكامل
                  </button>
                  <button
                    onClick={() => setModalFilter("remaining")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "remaining" ? "bg-black text-amber-500" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    ذمم معلقة فقط
                  </button>
                  <button
                    onClick={() => setModalFilter("all")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      modalFilter === "all" ? "bg-black text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    الكل ({customers.length})
                  </button>
                </div>
              </div>

              {/* Data Table Container */}
              <div className="flex-1 overflow-y-auto border border-zinc-900 rounded-xl bg-black/20">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-900">
                    <tr className="text-zinc-500 font-bold bg-zinc-950/80">
                      <th className="p-3 text-center">حالة الحساب</th>
                      {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                        <th className="p-3 text-left">الرصيد بالليرة السورية</th>
                      )}
                      {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                        <th className="p-3 text-left">الرصيد المتبقي ($)</th>
                      )}
                      <th className="p-3 text-left">إجمالي المقبوض ($)</th>
                      <th className="p-3 text-left">إجمالي المطالبات ($)</th>
                      <th className="p-3 text-right">اسم العميل</th>
                      <th className="p-3 text-center" style={{ width: "40px" }}>#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40">
                    {customers.filter(c => {
                      const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                      const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                      if (modalFilter === "remaining") return totalRemaining > 0;
                      if (modalFilter === "cleared") return totalRemaining <= 0;
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={selectedCurrency === "BOTH" ? 7 : 6} className="p-12 text-center text-zinc-600 font-sans">
                          لا توجد حسابات تطابق خيار التصفية المختار.
                        </td>
                      </tr>
                    ) : (
                      customers
                        .filter(c => {
                          const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                          const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                          if (modalFilter === "remaining") return totalRemaining > 0;
                          if (modalFilter === "cleared") return totalRemaining <= 0;
                          return true;
                        })
                        .map((c, index) => {
                          const custInvoices = invoices.filter(inv => inv.customerId === c.id);
                          const totalInvoiced = custInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
                          const totalPaid = custInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
                          const totalRemaining = custInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
                          const isCleared = totalRemaining <= 0;

                          return (
                            <tr key={c.id} className="hover:bg-zinc-900/20 transition-all">
                              {/* Status Badge */}
                              <td className="p-3 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCleared 
                                    ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/20" 
                                    : "bg-amber-950/30 text-amber-400 border border-amber-900/20"
                                }`}>
                                  {isCleared ? "مسدد بالكامل" : "ذمة معلقة"}
                                </span>
                              </td>

                              {/* Remaining SYP */}
                              {(selectedCurrency === "BOTH" || selectedCurrency === "SYP") && (
                                <td className={`p-3 font-mono font-bold text-left ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                  {totalRemaining > 0 
                                    ? `${usdToSyp(totalRemaining, exchangeRate).toLocaleString()} ل.س` 
                                    : "-"
                                  }
                                </td>
                              )}

                              {/* Remaining USD */}
                              {(selectedCurrency === "BOTH" || selectedCurrency === "USD") && (
                                <td className={`p-3 font-mono font-bold text-left ${totalRemaining > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                                  {totalRemaining > 0 ? `$${totalRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                                </td>
                              )}

                              {/* Paid USD */}
                              <td className="p-3 font-mono text-emerald-400 text-left">
                                {formatMoney(totalPaid)}
                              </td>

                              {/* Invoiced USD */}
                              <td className="p-3 font-mono text-zinc-500 text-left">
                                {formatMoney(totalInvoiced)}
                              </td>

                              {/* Name Only */}
                              <td className="p-3 font-bold text-zinc-300 text-right">
                                {c.name}
                              </td>

                              {/* Serial Number */}
                              <td className="p-3 text-center text-zinc-600 font-mono">
                                {index + 1}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Note / Info */}
              <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-sans">
                ⚠️ التقرير أعلاه آمن تماماً، ولا يتضمن أي تفاصيل تعريفية حساسة مثل البريد الإلكتروني أو أرقام الهواتف أو العناوين.
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Create manual standalone invoice */}
        {showAddInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-md relative text-right shadow-2xl"
            >
              <button
                onClick={() => setShowAddInvoice(false)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-4 border-b border-zinc-900 pb-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span>إصدار فاتورة عمل يدوية جديدة</span>
              </h4>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 font-bold block mb-1">العميل المستهدف *</label>
                  <select
                    required
                    value={newInvCustomer}
                    onChange={(e) => setNewInvCustomer(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">-- اختر عميلاً مسجلاً --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {currentUserRole === 'accountant' ? "" : (c.company ? `(${c.company})` : "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      value={newInvDueDate}
                      onChange={(e) => setNewInvDueDate(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">إجمالي قيمة الفاتورة ($) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={newInvTotal}
                      onChange={(e) => setNewInvTotal(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-indigo-600 font-mono text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">ملاحظات الفاتورة والتفاصيل</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب بنود أو غرض الفاتورة..."
                    value={newInvNotes}
                    onChange={(e) => setNewInvNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                  >
                    إصدار الفاتورة وإدراجها بالدفاتر
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddInvoice(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Record Invoice Payment */}
        {recordingPaymentInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm relative text-right shadow-2xl"
            >
              <button
                onClick={() => { setPaymentError(""); setRecordingPaymentInvoice(null); }}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-1">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>تسجيل دفعة مالية مقبوضة</span>
              </h4>
              <span className="text-[11px] text-zinc-500 font-mono block mb-4">
                تعديل رصيد الفاتورة رقم: {recordingPaymentInvoice.invoiceNumber}
              </span>

              <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3 mb-4 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-zinc-300">{formatMoneyString(recordingPaymentInvoice.totalPrice)}</span>
                  <span className="text-zinc-500">قيمة الفاتورة الإجمالية:</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-emerald-400">{formatMoneyString(recordingPaymentInvoice.paidAmount)}</span>
                  <span className="text-zinc-500">إجمالي المقبوض سابقاً:</span>
                </div>
                <div className="flex justify-between border-t border-zinc-850/60 pt-1.5 mt-1 font-bold">
                  <span className="font-mono text-amber-500">{formatMoneyString(recordingPaymentInvoice.remaining)}</span>
                  <span className="text-zinc-400">الحد الأقصى المتبقي للتحصيل:</span>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                {paymentError && (
                  <div role="alert" className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-300">
                    {paymentError}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-zinc-500 font-bold">مبلغ القسط *</label>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setPaymentCurrency("SYP"); setPaymentAmount(""); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${paymentCurrency === "SYP" ? "bg-amber-500/20 text-amber-300 border border-amber-500/50" : "bg-zinc-800 text-zinc-400"}`}>ل.س</button>
                      <button type="button" onClick={() => { setPaymentCurrency("USD"); setPaymentAmount(""); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${paymentCurrency === "USD" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" : "bg-zinc-800 text-zinc-400"}`}>$</button>
                    </div>
                  </div>
                  <input
                    type="number"
                    required
                    min={paymentCurrency === "SYP" ? "1" : "0.01"}
                    max={paymentCurrency === "SYP" ? (Number(recordingPaymentInvoice.remainingSYP ?? Math.round((Number(recordingPaymentInvoice.remaining) || 0) * (Number(recordingPaymentInvoice.exchangeRateAtFinalization || recordingPaymentInvoice.exchangeRateAtIssue || exchangeRate || 135)))) || 0) : (Number(recordingPaymentInvoice.remainingUSD ?? recordingPaymentInvoice.remaining) || 0)}
                    step={paymentCurrency === "SYP" ? "1" : "0.01"}
                    placeholder={paymentCurrency === "SYP" ? "0" : "0.00"}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-emerald-600 font-mono text-left"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">شرح القيد أو رقم التحويلة البنكية</label>
                  <input
                    type="text"
                    placeholder="مثال: حوالة كليك أو دفعة نقدية بالمعرض..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
                  >
                    تثبيت الدفعة المقبوضة
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordingPaymentInvoice(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Insert / Edit Expense */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-md relative text-right shadow-2xl"
            >
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setEditingExpense(null);
                }}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-zinc-100 flex items-center gap-2 justify-end mb-4 border-b border-zinc-900 pb-3">
                <ArrowUp className="w-5 h-5 text-rose-500" />
                <span>{editingExpense ? "تعديل مستند الصرف المالي" : "إدراج قيد مصروف جديد"}</span>
              </h4>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">الفئة المصنفة *</label>
                    <select
                      required
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">-- اختر فئة الصرف --</option>
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">القيمة المالية المصروفة ($) *</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-rose-500 font-mono text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">حالة السداد *</label>
                    <select
                      value={expenseStatus}
                      onChange={(e: any) => setExpenseStatus(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
                    >
                      <option value="paid">تم الصرف بالكامل</option>
                      <option value="pending">مستحق / معلق بالذمة</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold block mb-1">تاريخ مستند الصرف *</label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">شرح تفصيلي للمصروف والغرض منه</label>
                  <textarea
                    rows={2}
                    placeholder="مثال: فاتورة صيانة عدسة رأس الليزر CO2 للماكينة الرئيسية..."
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full bg-black border border-zinc-850 rounded-lg p-2 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="pt-3 border-t border-zinc-900 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/10"
                  >
                    {editingExpense ? "حفظ وتعديل القيود المالية" : "تسجيل المصروف وإصدار القيد"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpense(false);
                      setEditingExpense(null);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal: Detailed Invoice Auditor, Printer, and Editor */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-4xl relative text-right shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 left-4 p-1 text-zinc-600 hover:text-zinc-400 bg-zinc-900 rounded-full border border-zinc-850 cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="border-b border-zinc-900 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-1 rounded text-zinc-400 font-mono">
                    الحالة: {selectedInvoice.status === "paid" ? "مدفوعة بالكامل" : selectedInvoice.status === "partially_paid" ? "مدفوعة جزئياً" : selectedInvoice.status === "cancelled" ? "ملغاة" : "غير مدفوعة"}
                  </span>
                  {selectedInvoice.orderId && (
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-2 py-1 rounded">
                      مرتبط بالطلب: #{selectedInvoice.orderNumber}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#c59257]" />
                  <span>تفاصيل وإدارة الفاتورة رقم: {selectedInvoice.invoiceNumber}</span>
                </h4>
              </div>

              {/* Main Content Layout (Grid) */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                
                {/* General Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">العميل المستهدف</span>
                    <span className="text-xs font-bold text-zinc-200">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">تاريخ الإصدار</span>
                    <span className="text-xs font-mono text-zinc-300">{new Date(selectedInvoice.issueDate).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 block">تاريخ الاستحقاق</span>
                    {isEditingSelectedInvoice ? (
                      <input
                        type="date"
                        value={editedInvoiceDueDate}
                        onChange={(e) => setEditedInvoiceDueDate(e.target.value)}
                        className="bg-black border border-zinc-850 rounded-lg p-1 text-xs text-zinc-200 font-mono w-full"
                      />
                    ) : (
                      <span className="text-xs font-mono text-zinc-300">
                        {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString("ar-EG") : "غير محدد"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items & Editor Area */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    {isEditingSelectedInvoice && (
                      <button
                        type="button"
                        onClick={() => setEditedInvoiceItems([...editedInvoiceItems, { name: "عنصر جديد", quantity: 1, unitPrice: 10 }])}
                        className="bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/40 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
                      >
                        + إضافة بند جديد للعمل
                      </button>
                    )}
                    <h5 className="text-xs font-bold text-[#c59257]">📋 بنود وعناصر الفاتورة الحالية</h5>
                  </div>

                  <div className="bg-black/40 border border-zinc-900 rounded-xl overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950/80 text-zinc-500 font-bold border-b border-zinc-900">
                          {isEditingSelectedInvoice && <th className="p-2.5 text-center" style={{ width: "60px" }}>إجراء</th>}
                          <th className="p-2.5 text-left">الإجمالي ($)</th>
                          <th className="p-2.5 text-left">سعر المفرد ($)</th>
                          <th className="p-2.5 text-left">الكمية</th>
                          <th className="p-2.5 text-right">بيان البند والخدمة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {editedInvoiceItems.length === 0 ? (
                          <tr>
                            <td colSpan={isEditingSelectedInvoice ? 5 : 4} className="p-6 text-center text-zinc-600">
                              لا توجد بنود مدخلة لهذه الفاتورة. تظهر بقيمتها الإجمالية فقط.
                            </td>
                          </tr>
                        ) : (
                          editedInvoiceItems.map((item, idx) => {
                            const totalVal = (item.quantity || 1) * (item.unitPrice || 0);
                            return (
                              <tr key={idx} className="hover:bg-zinc-900/10">
                                {isEditingSelectedInvoice && (
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setEditedInvoiceItems(editedInvoiceItems.filter((_, i) => i !== idx))}
                                      className="text-[10px] text-rose-500 hover:text-rose-400 bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-900/30 cursor-pointer"
                                    >
                                      حذف
                                    </button>
                                  </td>
                                )}
                                
                                <td className="p-2 font-mono text-zinc-300 text-left">
                                  {formatMoneyString(totalVal)}
                                </td>
                                
                                <td className="p-2 text-left">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 font-mono w-20 text-left"
                                    />
                                  ) : (
                                    <span className="font-mono">{formatMoneyString(item.unitPrice || 0)}</span>
                                  )}
                                </td>

                                <td className="p-2 text-left">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].quantity = parseInt(e.target.value) || 1;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 font-mono w-16 text-left"
                                    />
                                  ) : (
                                    <span className="font-mono">{item.quantity || 1}</span>
                                  )}
                                </td>

                                <td className="p-2 text-right">
                                  {isEditingSelectedInvoice ? (
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => {
                                        const updated = [...editedInvoiceItems];
                                        updated[idx].name = e.target.value;
                                        setEditedInvoiceItems(updated);
                                      }}
                                      className="bg-black border border-zinc-800 rounded p-1 text-xs text-zinc-200 w-full text-right"
                                    />
                                  ) : (
                                    <span className="text-zinc-200">{item.name}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary math block */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900/60 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 text-xs">
                    <div className="space-y-1 text-left">
                      <span className="text-zinc-500 block">الإجمالي المتبقي المستحق</span>
                      <span className="font-mono text-amber-400 font-bold text-sm">
                        {formatMoneyString(selectedInvoice.totalPrice - selectedInvoice.paidAmount)}
                      </span>
                    </div>

                    <div className="flex gap-4 items-center font-mono">
                      <div className="text-left">
                        <span className="text-zinc-500 text-[10px] block font-sans">الخصم الإضافي</span>
                        {isEditingSelectedInvoice ? (
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editedInvoiceDiscount}
                              onChange={(e) => setEditedInvoiceDiscount(parseFloat(e.target.value) || 0)}
                              className="bg-black border border-zinc-800 rounded p-0.5 text-xs text-zinc-200 font-mono w-16 text-left"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-bold">{formatMoneyString(selectedInvoice.discount || 0)}</span>
                        )}
                      </div>

                      <div className="text-left">
                        <span className="text-zinc-500 text-[10px] block font-sans">الضريبة (%)</span>
                        {isEditingSelectedInvoice ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editedInvoiceTaxPercent}
                              onChange={(e) => setEditedInvoiceTaxPercent(parseFloat(e.target.value) || 0)}
                              className="bg-black border border-zinc-800 rounded p-0.5 text-xs text-zinc-200 font-mono w-14 text-left"
                            />
                            <span className="text-zinc-500">%</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-bold">{selectedInvoice.taxPercent || 0}%</span>
                        )}
                      </div>

                      <div className="text-left border-l border-zinc-900 pl-4">
                        <span className="text-zinc-500 text-[10px] block font-sans">صافي السعر النهائي</span>
                        <span className="text-zinc-200 font-black text-sm">
                          {formatMoneyString(selectedInvoice.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Block */}
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">ملاحظات وشروط الفاتورة</span>
                  {isEditingSelectedInvoice ? (
                    <textarea
                      rows={2}
                      value={editedInvoiceNotes}
                      onChange={(e) => setEditedInvoiceNotes(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-zinc-200"
                    />
                  ) : (
                    <p className="text-xs bg-black/30 p-2.5 rounded border border-zinc-900 text-zinc-400 text-right">
                      {selectedInvoice.notes || "لا توجد ملاحظات مسجلة."}
                    </p>
                  )}
                </div>

                {/* History Timeline */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-zinc-500">📜 السجل الزمني للفاتورة والمطابقة الحسابية</h5>
                  <div className="bg-black/50 border border-zinc-900 p-4 rounded-xl space-y-3 font-sans text-right max-h-44 overflow-y-auto">
                    {selectedInvoice.history && selectedInvoice.history.length > 0 ? (
                      selectedInvoice.history.map((h: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start justify-end text-[11px] border-r-2 border-zinc-800 pr-2.5 mr-1">
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {new Date(h.timestamp).toLocaleString("ar-EG")}
                              </span>
                              <span className="font-bold text-zinc-300">
                                {h.action === "draft" ? "إنشاء الفاتورة (مسودة)" : 
                                 h.action === "sent" ? "إرسال للعميل" : 
                                 h.action === "paid" ? "تثبيت سداد مالي" : 
                                 h.action === "cancelled" ? "إلغاء الفاتورة" : 
                                 h.action === "updated" ? "تعديل محتويات الفاتورة" : 
                                 h.action === "credit_note" ? "إصدار إشعار دائن" : h.action}
                              </span>
                            </div>
                            <p className="text-zinc-500 leading-relaxed text-right">
                              {h.notes || "-"} {h.user && <span className="text-indigo-400 font-mono">({h.user})</span>}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-zinc-600 text-center">لا توجد سجلات تاريخية سابقة لهذه الفاتورة.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="border-t border-zinc-900 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Print & Download / External Actions */}
                <div className="flex flex-wrap gap-2 justify-end order-2 sm:order-1">
                  <button
                    onClick={() => setInvoiceToPrint(selectedInvoice)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-600 hover:to-[#c59257] text-zinc-950 font-black border border-[#c59257] text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-sans shadow-md shadow-amber-950/30"
                  >
                    <Printer className="w-4 h-4 text-zinc-950" />
                    <span>طباعة الفاتورة</span>
                  </button>

                  <a
                    href={`/api/accounting/invoices/${selectedInvoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    <Download className="w-4 h-4 text-[#c59257]" />
                    <span>تنزيل PDF</span>
                  </a>
                  
                  <button
                    onClick={() => handleShareInvoiceWhatsApp(selectedInvoice)}
                    className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans font-bold"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>مشاركة عبر واتساب 📱</span>
                  </button>

                  {selectedInvoice.orderId && (
                    <a
                      href={`/api/orders/${selectedInvoice.orderId}/delivery-note/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                    >
                      <Printer className="w-4 h-4 text-zinc-500" />
                      <span>سند التسليم (Delivery Note)</span>
                    </a>
                  )}
                  {selectedInvoice.status !== "cancelled" && (
                    <button
                      onClick={handleIssueCreditNote}
                      className="flex items-center gap-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                    >
                      <span>إصدار إشعار دائن 🔻</span>
                    </button>
                  )}
                </div>

                {/* Edit & Status transitions */}
                <div className="flex gap-2 justify-end order-1 sm:order-2">
                  {isEditingSelectedInvoice ? (
                    <>
                      <button
                        onClick={handleUpdateSelectedInvoice}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                      >
                        حفظ التعديلات الحسابية
                      </button>
                      <button
                        onClick={() => setIsEditingSelectedInvoice(false)}
                        className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditingSelectedInvoice(true)}
                        className="bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-900/40 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                      >
                        تعديل البنود والتسعير ✏️
                      </button>
                      
                      {selectedInvoice.status !== "paid" && (
                        <button
                          onClick={() => handleChangeInvoiceStatus("paid")}
                          className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-bold font-sans"
                        >
                          تثبيت دفع الفاتورة 💵
                        </button>
                      )}

                      {selectedInvoice.status === "draft" && (
                        <button
                          onClick={() => handleChangeInvoiceStatus("sent")}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer font-sans"
                        >
                          إرسال للعميل 🚀
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* Modal: Print-Friendly Invoice Preview */}
        {invoiceToPrint && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[100] overflow-y-auto print:p-0 print:m-0 print:static print:bg-white">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:bg-white print:text-black flex flex-col max-h-[96vh] print:max-h-none"
            >
              {/* Top Action Control Bar (Hidden on Print) */}
              <div className="bg-zinc-900/90 border-b border-zinc-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#c59257]/20 border border-[#c59257]/40 flex items-center justify-center text-[#c59257]">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>معاينة طباعة الفاتورة</span>
                      <span className="text-[10px] font-mono text-[#c59257] bg-[#c59257]/10 border border-[#c59257]/30 px-2 py-0.5 rounded-full">
                        #{invoiceToPrint.invoiceNumber || invoiceToPrint.id}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      تنسيق مبسط (Print-friendly) مع شعار الورشة وإخفاء اللوحات الجانبية والأزرار تلقائياً
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-600 hover:to-[#c59257] text-zinc-950 font-black rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    <Printer className="w-4 h-4 text-zinc-950" />
                    <span>تأكيد الطباعة الفعلية</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setInvoiceToPrint(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>

              {/* Printable Document Area */}
              <div className="p-6 sm:p-10 overflow-y-auto font-sans bg-zinc-950 print:bg-white print:text-black print:p-6 print:overflow-visible text-right space-y-6">
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6 sm:p-8 space-y-6 print:bg-white print:border-black print:text-black print:shadow-none print:p-0">
                  
                  {/* Header & Workshop Logo */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-zinc-800/80 pb-6 print:border-black">
                    {/* Workshop Brand Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c59257] to-amber-700 flex items-center justify-center text-zinc-950 shadow-md print:bg-black print:text-white print:shadow-none">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h1 className="text-xl font-extrabold text-zinc-100 print:text-black font-sans tracking-tight">
                            {companySettings?.name || "AXIS LAB"}
                          </h1>
                          <p className="text-xs font-bold text-[#c59257] print:text-black">
                            ورشة القص والنقش المتقدم بالليزر CO2 / CNC
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 print:text-zinc-700 font-sans mt-0.5">
                        {companySettings?.address || "عمان، الأردن"} | البريد: {companySettings?.email || "info@axislab.sy"}
                      </p>

                      {/* WhatsApp & Instagram Contact Info */}
                      <div className="flex items-center gap-2.5 text-[11px] pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 font-mono font-bold print:bg-transparent print:border-black print:text-black print:p-0">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                          <span>واتساب المبيعات: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-950/50 text-pink-300 border border-pink-800/40 font-mono font-bold print:bg-transparent print:border-black print:text-black print:p-0">
                          <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
                          <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Invoice Meta Box */}
                    <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl text-right space-y-1 min-w-[230px] print:bg-white print:border-black print:text-black">
                      <div className="text-xs font-black text-[#c59257] print:text-black uppercase font-mono">
                        فاتورة ماليـة معتمدة
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-200 print:text-black">
                        رقم الفاتورة: #{invoiceToPrint.invoiceNumber || invoiceToPrint.id}
                      </div>
                      <div className="text-[11px] text-zinc-400 print:text-zinc-800 font-mono">
                        تاريخ الإصدار: {new Date(invoiceToPrint.issueDate).toLocaleDateString("ar-EG")}
                      </div>
                      <div className="text-[11px] text-zinc-400 print:text-zinc-800 font-mono">
                        تاريخ الاستحقاق: {invoiceToPrint.dueDate ? new Date(invoiceToPrint.dueDate).toLocaleDateString("ar-EG") : "فوري عند التسليم"}
                      </div>
                      <div className="pt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          invoiceToPrint.status === "paid"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400 print:border-black print:text-black"
                            : invoiceToPrint.status === "partially_paid"
                            ? "bg-amber-950/60 border-amber-800 text-amber-400 print:border-black print:text-black"
                            : "bg-rose-950/60 border-rose-800 text-rose-400 print:border-black print:text-black"
                        }`}>
                          {invoiceToPrint.status === "paid" ? "مدفوعة بالكامل" : invoiceToPrint.status === "partially_paid" ? "مدفوعة جزئياً" : "غير مدفوعة"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Order Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    {/* Customer Info Box */}
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-1.5 print:bg-white print:border-black print:text-black">
                      <h4 className="font-bold text-[#c59257] print:text-black text-xs border-b border-zinc-800 pb-1 print:border-black">
                        بيانات العميل المستلم
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">اسم العميل:</span>
                        <span className="font-bold text-zinc-200 print:text-black">{invoiceToPrint.customerName || "عميل الورشة"}</span>
                      </div>
                      {invoiceToPrint.orderNumber && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400 print:text-zinc-700">رقم الطلب المرتبط:</span>
                          <span className="font-mono font-bold text-indigo-400 print:text-black">#{invoiceToPrint.orderNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Workshop Order Summary Box */}
                    <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-1.5 print:bg-white print:border-black print:text-black">
                      <h4 className="font-bold text-[#c59257] print:text-black text-xs border-b border-zinc-800 pb-1 print:border-black">
                        معلومات التوثيق والاعتماد
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">مرجع النظام:</span>
                        <span className="font-mono text-zinc-300 print:text-black">{invoiceToPrint.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 print:text-zinc-700">جهة الإصدار:</span>
                        <span className="font-bold text-zinc-300 print:text-black">قسم المحاسبة والمالية - AXIS LAB</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-300 print:text-black text-xs">
                      تفاصيل البنود والمشغولات المشحونة:
                    </h4>
                    <div className="border border-zinc-800 rounded-xl overflow-hidden print:border-black">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono print:bg-zinc-100 print:text-black print:border-black">
                            <th className="p-3 text-center w-10">#</th>
                            <th className="p-3 text-right">وصف البند / المادة والمنتج</th>
                            <th className="p-3 text-center w-20">الكمية</th>
                            <th className="p-3 text-right w-28">السعر الفردي ($)</th>
                            <th className="p-3 text-right w-28">الإجمالي ($)</th>
                            <th className="p-3 text-right w-36">المكافئ (ل.س)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850 print:divide-zinc-300">
                          {invoiceToPrint.items && invoiceToPrint.items.length > 0 ? (
                            invoiceToPrint.items.map((item: any, idx: number) => {
                              const lineTotalUSD = (item.quantity || 1) * (item.unitPrice || 0);
                              const lineTotalSYP = Math.round(lineTotalUSD * exchangeRate);
                              return (
                                <tr key={idx} className="hover:bg-zinc-900/40 print:hover:bg-transparent">
                                  <td className="p-3 text-center font-mono text-zinc-500 print:text-black">{idx + 1}</td>
                                  <td className="p-3 font-semibold text-zinc-200 print:text-black">{item.name}</td>
                                  <td className="p-3 text-center font-mono text-zinc-300 print:text-black">{item.quantity}</td>
                                  <td className="p-3 font-mono text-zinc-300 print:text-black">${item.unitPrice?.toFixed(2)}</td>
                                  <td className="p-3 font-mono font-bold text-zinc-200 print:text-black">${lineTotalUSD.toFixed(2)}</td>
                                  <td className="p-3 font-mono text-[#c59257] print:text-black font-bold">{lineTotalSYP.toLocaleString()} ل.س</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="p-3 text-center font-mono text-zinc-500 print:text-black">1</td>
                              <td className="p-3 font-semibold text-zinc-200 print:text-black">
                                خدمة قص ونقش بالليزر وتنفيذ طلبية #{invoiceToPrint.orderNumber || invoiceToPrint.invoiceNumber}
                              </td>
                              <td className="p-3 text-center font-mono text-zinc-300 print:text-black">1</td>
                              <td className="p-3 font-mono text-zinc-300 print:text-black">${printedTotalUSD.toFixed(2)}</td>
                              <td className="p-3 font-mono font-bold text-zinc-200 print:text-black">${printedTotalUSD.toFixed(2)}</td>
                              <td className="p-3 font-mono text-[#c59257] print:text-black font-bold">{printedTotalSYP.toLocaleString()} ل.س</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Totals Breakdown Box */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-t border-zinc-800 pt-4 print:border-black">
                    <div className="text-xs text-zinc-400 print:text-zinc-800 max-w-sm space-y-1">
                      <span className="font-bold text-zinc-300 print:text-black block">ملاحظات وتعليمات الفاتورة:</span>
                      <p className="leading-relaxed">
                        {invoiceToPrint.notes || "لا توجد ملاحظات إضافية مسجلة على هذه الفاتورة."}
                      </p>
                    </div>

                    <div className="w-full sm:w-80 bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2 text-xs font-sans print:bg-white print:border-black print:text-black">
                      <div className="flex justify-between text-zinc-400 print:text-zinc-700">
                        <span>الخصم الممنوح:</span>
                        <span className="font-mono font-bold">${Number(invoiceToPrint.discount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400 print:text-zinc-700">
                        <span>نسبة الضريبة:</span>
                        <span className="font-mono font-bold">{invoiceToPrint.taxPercent || 0}%</span>
                      </div>
                      <div className="border-t border-zinc-850 pt-2 flex justify-between items-center print:border-black">
                        <span className="font-bold text-zinc-200 print:text-black">المبلغ الإجمالي بالدولار:</span>
                        <span className="text-base font-mono font-extrabold text-zinc-100 print:text-black">${printedTotalUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#c59257] print:text-black">
                        <span className="font-extrabold text-xs">المبلغ الإجمالي بالليرة السورية:</span>
                        <span className="text-base font-mono font-black">{printedTotalSYP.toLocaleString()} ل.س</span>
                      </div>
                      <div className="border-t border-zinc-850 pt-2 flex justify-between text-emerald-400 print:text-black">
                        <span>المبلغ المقبوض:</span>
                        <span className="font-mono font-bold">{printedPaidSYP.toLocaleString()} ل.س (${printedPaidUSD.toFixed(2)})</span>
                      </div>
                      <div className="flex justify-between text-rose-400 print:text-black font-bold">
                        <span>المبلغ المتبقي للتحصيل:</span>
                        <span className="font-mono">{printedRemainingSYP.toLocaleString()} ل.س (${printedRemainingUSD.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Signatures */}
                  <div className="pt-6 border-t border-zinc-800 space-y-6 print:border-black">
                    <div className="text-[10px] text-zinc-500 print:text-zinc-800 leading-relaxed bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black">
                      <span className="font-bold text-zinc-400 print:text-black block mb-0.5">الشروط والأحكام المالية:</span>
                      البضائع والمشغولات الخاصة المقصوصة بالليزر تصنع حسب الطلب خصيصاً وهي غير قابلة للإرجاع بعد القص والتسليم. تعد هذه الفاتورة سنداً مالياً وتصميمياً معتمداً من الورشة.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 text-center text-xs print:grid-cols-3">
                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          توقيع الموظف المسؤول
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4 font-mono">
                          (منظم الفاتورة)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>

                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          اعتماد قسم المحاسبة والمالية
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4">
                          (الختم المالي)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>

                      <div className="space-y-6 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 print:bg-white print:border-black print:p-1">
                        <span className="text-xs font-bold text-zinc-300 print:text-black block">
                          توقيع واستلام الزبون المستلم
                        </span>
                        <span className="text-[10px] text-zinc-500 print:text-zinc-700 block -mt-4">
                          (المستلم المعتمد)
                        </span>
                        <div className="border-b border-dashed border-zinc-700 w-32 mx-auto print:border-black"></div>
                      </div>
                    </div>
                  </div>

                  {/* 📱 DYNAMIC QR CODE FOR PUBLIC INVOICE PDF ACCESS */}
                  {(() => {
                    const qrUrl = typeof window !== 'undefined'
                      ? `${window.location.origin}/api/orders/${invoiceToPrint.orderId || invoiceToPrint.id}/pdf`
                      : `https://axislab-portal.sy/api/orders/${invoiceToPrint.orderId || invoiceToPrint.id}/pdf`;
                    return (
                      <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-4 print:bg-white print:border-black print:p-2 print:rounded-lg">
                        <div className="space-y-1 text-right flex-1">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-amber-400 print:text-black">
                            <span>التحقق من الفاتورة وتحميل نسخة PDF (QR Code)</span>
                            <QrCode className="w-4 h-4 text-[#c59257] print:text-black" />
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed print:text-zinc-700">
                            امسح الرمز ضوئياً للتحقق من صحة الفاتورة المالية واستعراض النسخة الإلكترونية المعتمدة.
                          </p>
                          <div className="text-[9px] font-mono text-zinc-500 truncate dir-ltr text-left print:text-black print:font-bold">
                            {qrUrl}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-zinc-700 shadow-md print:border-black print:shadow-none shrink-0 flex items-center justify-center">
                          <QRCodeSVG 
                            value={qrUrl} 
                            size={76} 
                            bgColor="#ffffff" 
                            fgColor="#000000" 
                            level="M" 
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Footer Branding & Social Contact */}
                  <div className="text-center text-[10px] text-zinc-400 print:text-black pt-3 border-t border-zinc-900 print:border-black space-y-1">
                    <div className="flex items-center justify-center gap-4 text-xs font-bold flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                        <span>واتساب: {companySettings?.whatsapp || companySettings?.phone || "+962790000000"}</span>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Instagram className="w-3.5 h-3.5 text-pink-400 print:text-black" />
                        <span>إنستغرام: {companySettings?.instagram ? (companySettings.instagram.includes('/') ? `@${companySettings.instagram.split('/').filter(Boolean).pop()}` : companySettings.instagram) : "@axislab_laser"}</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600 print:text-zinc-700 font-mono">
                      AXIS LAB OS • Powered by CNC Laser Technologies • تم إنشاء وطباعة الفاتورة برمجياً بواسطة النظام المالي
                    </p>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
  );
}

import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function SmartSupplyDialog(props: GlobalDialogProps) {
  const { currentUser, isSubmittingSmartSupply, setShowSmartSupplyModal, setSmartSupplyItems, showSmartSupplyModal, smartSupplyItems, suppliers, handleExecuteSmartSupplyOrders } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
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
  );
}

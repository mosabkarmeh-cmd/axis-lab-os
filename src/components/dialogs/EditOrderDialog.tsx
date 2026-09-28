import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function EditOrderDialog(props: GlobalDialogProps) {
  const { appendEditOrderDraftItem, customers, editFocusedItemIdx, editOrderDiscountAmountVal, editOrderItems, editOrderRemaining, editOrderSubtotal, editOrderTaxAmount, editOrderTaxPercentVal, editOrderTotalPrice, editingOrder, err, handleEditOrderSubmit, products, qty, removeEditOrderDraftItem, setEditFocusedItemIdx, setEditOrderItems, setEditingOrder, time, updateEditOrderDraftItem } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
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
  );
}

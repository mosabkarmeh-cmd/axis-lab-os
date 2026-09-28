import { GlobalDialogProps, motion, AnimatePresence, Lucide, QRCodeSVG, FileUploader, HelpCenter, HelpModal, SupplierPriceComparisonModal, OrderTeamRatingPanel, OrderPrintModal, ShareOrderModal, CommandPalette, EntityFilesModals, QuickActionsFab, CutProgressModal, CurrencyConverterModal, AddOrderModal, materialPriceSYP, materialPriceUSD } from "./shared";

export default function MaterialDialog(props: GlobalDialogProps) {
  const { aiClassificationResult, editingMaterial, isAiClassifying, matCategory, matColor, matHeight, matLocation, matMinStock, matNotes, matPrice, matSubCategory, matSupplierId, matThickness, matUnit, matWidth, setAiClassificationResult, setEditingMaterial, setMatCategory, setMatColor, setMatHeight, setMatLocation, setMatMinStock, setMatName, setMatNotes, setMatPrice, setMatSubCategory, setMatSupplierId, setMatThickness, setMatUnit, setMatWidth, setShowAddMaterial, showAddMaterial, suppliers, exchangeRate, handleAiClassifyMaterial, handleCreateMaterial, handleUpdateMaterial, matName } = props;
  const { Activity, AlertTriangle, Calculator, Check, CheckCircle2, Clock, Coins, Command, Copy, DollarSign, Edit3, ExternalLink, FileDown, FileText, FolderOpen, HelpCircle, Info, Instagram, Layers, Mail, MessageCircle, Play, Plus, PlusCircle, Printer, QrCode, Receipt, RefreshCw, Scissors, Search, Share2, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, Truck, Users, Wrench, X, Zap } = Lucide as any;
  return (
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
  );
}

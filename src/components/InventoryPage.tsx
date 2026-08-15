import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, DollarSign, Download, FileCode, FolderOpen, GitCompare, GripVertical, History, Info, Layers, Play, Plus, RefreshCw, Scissors, Search, Sparkles, Truck, XCircle, Zap } from "lucide-react";
import MaterialCostCharts from "./MaterialCostCharts";
import VectorCompilerUploader from "./VectorCompilerUploader";

export default function InventoryPage(props: Record<string, any>) {
  const {
    pageVariants,
    pageTransition,
    activeView,
    currentUser,
    activeProductSubTab,
    setActiveProductSubTab,
    materials,
    setMaterials,
    draggedMaterialId,
    setDraggedMaterialId,
    dragOverMaterialId,
    setDragOverMaterialId,
    materialCategories,
    remnants,
    setRemnants,
    suppliers,
    setSuppliers,
    supplyOrders,
    setSupplyOrders,
    materialStats,
    setMaterialStats,
    supplyOrdersFilterStatus,
    setSupplyOrdersFilterStatus,
    supplyOrdersSearch,
    setSupplyOrdersSearch,
    materialSortBy,
    setMaterialSortBy,
    materialQualityFilter,
    setMaterialQualityFilter,
    showSmartSupplyModal,
    setShowSmartSupplyModal,
    smartSupplyItems,
    setSmartSupplyItems,
    isSubmittingSmartSupply,
    setIsSubmittingSmartSupply,
    showAddMaterial,
    setShowAddMaterial,
    matName,
    setMatName,
    matCategory,
    setMatCategory,
    matSubCategory,
    setMatSubCategory,
    matThickness,
    setMatThickness,
    matColor,
    setMatColor,
    matWidth,
    setMatWidth,
    matHeight,
    setMatHeight,
    matUnit,
    setMatUnit,
    matPrice,
    setMatPrice,
    matMinStock,
    setMatMinStock,
    matSupplierId,
    setMatSupplierId,
    matNotes,
    setMatNotes,
    matLocation,
    setMatLocation,
    matQualityStatus,
    setMatQualityStatus,
    editingMaterial,
    setEditingMaterial,
    isAiClassifying,
    setIsAiClassifying,
    aiClassificationResult,
    setAiClassificationResult,
    showAdjustStock,
    setShowAdjustStock,
    adjustQty,
    setAdjustQty,
    adjustType,
    setAdjustType,
    adjustReason,
    setAdjustReason,
    priceComparisonMaterial,
    setPriceComparisonMaterial,
    isCurrencyConverterOpen,
    setIsCurrencyConverterOpen,
    selectedDashboardSupplierId,
    setSelectedDashboardSupplierId,
    newSupplyMaterialId,
    setNewSupplyMaterialId,
    newSupplyQty,
    setNewSupplyQty,
    newSupplyPrice,
    setNewSupplyPrice,
    newSupplyExpectedDate,
    setNewSupplyExpectedDate,
    newSupplyNotes,
    setNewSupplyNotes,
    isSubmittingSupplyOrder,
    setIsSubmittingSupplyOrder,
    showAddRemnant,
    setShowAddRemnant,
    remMatId,
    setRemMatId,
    remWidth,
    setRemWidth,
    remHeight,
    setRemHeight,
    remQty,
    setRemQty,
    remLocation,
    setRemLocation,
    findSuitableMatId,
    setFindSuitableMatId,
    findSuitableW,
    setFindSuitableW,
    findSuitableH,
    setFindSuitableH,
    suitableRemnantResult,
    setSuitableRemnantResult,
    searchQuery,
    setSearchQuery,
    selectedProductFiles,
    setSelectedProductFiles,
    selectedMaterialFiles,
    setSelectedMaterialFiles,
    deleteConfirmTarget,
    setDeleteConfirmTarget,
    showAddProduct,
    setShowAddProduct,
    editingProduct,
    setEditingProduct,
    prodName,
    setProdName,
    prodCode,
    setProdCode,
    prodCategory,
    setProdCategory,
    prodPrice,
    setProdPrice,
    prodDescription,
    setProdDescription,
    prodStock,
    setProdStock,
    products,
    productSearch,
    setProductSearch,
    productFilter,
    setProductFilter,
    orders,
    productionJobs,
    exchangeRate,
    lowStockAlertItems,
    lowStockItems,
    refreshInventoryData,
    addTerminalLog,
    handleAiClassifyMaterial,
    handleCompileGCode,
    handleConsumeRemnant,
    handleCreateSupplyOrder,
    handleDeleteMaterial,
    handleDuplicateSupplyOrder,
    handleExportMaterialsCSV,
    handleFindSuitableRemnantSubmit,
    handleOpenSmartSupplyModal,
    handleQuickSupplyRequest,
    handleReorderMaterials,
    handleUpdateMaterialQualityStatus,
    handleUpdateSupplyOrderStatus,
    handleWasteRemnant,
    isCompilingGCode,
    gcodeTabMode,
    setGcodeTabMode,
    gcodePrompt,
    setGcodePrompt,
    gcodeMaterial,
    setGcodeMaterial,
    gcodePower,
    setGcodePower,
    gcodeSpeed,
    setGcodeSpeed,
    gcodeResult,
    setGcodeResult
  } = props;

  return (
    <>
      {true && (
                <motion.div
                  key="products"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="p-6 space-y-6 font-sans text-right"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div className="text-right">
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 justify-end">
                        <span>مستودع الخامات والمواد والألواح</span>
                        <Layers className="w-5 h-5 text-indigo-400" />
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">تتبع مستويات مخزون الألواح وسماكاتها، وحساب الهدر، واستغلال البقايا لزيادة كفاءة ورشة القص</p>
                    </div>

                    <div className="flex gap-2">
                      {activeProductSubTab === 'materials' && currentUser.role !== "employee" && (
                        <button
                          onClick={() => {
                            setEditingMaterial(null);
                            setShowAddMaterial(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> إضافة مادة خام جديدة
                        </button>
                      )}
                      {activeProductSubTab === 'remnants' && currentUser.role !== "employee" && (
                        <button
                          onClick={() => {
                            setShowAddRemnant(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> تسجيل بقايا جديدة
                        </button>
                      )}
                      {activeProductSubTab === 'products' && currentUser.role !== "employee" && (
                        <button
                          onClick={() => {
                            setEditingProduct(null);
                            setProdName("");
                            setProdCode("");
                            setProdCategory("الأكريليك");
                            setProdPrice("");
                            setProdDescription("");
                            setProdStock("");
                            setShowAddProduct(true);
                          }}
                          className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> إضافة منتج للكتالوج
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-Tab Switcher */}
                  <div className="flex border-b border-zinc-850 pb-2 justify-end gap-2 text-xs flex-wrap">
                    <button
                      onClick={() => setActiveProductSubTab('supply_orders')}
                      className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeProductSubTab === 'supply_orders'
                          ? "bg-amber-600/15 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/5"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850"
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>طلبات توريد المواد ({supplyOrders.length})</span>
                      {supplyOrders.filter(o => o.status === 'pending').length > 0 && (
                        <span className="bg-amber-500 text-zinc-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
                          {supplyOrders.filter(o => o.status === 'pending').length} معلقة
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveProductSubTab('suppliers')}
                      className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        activeProductSubTab === 'suppliers'
                          ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/30"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850"
                      }`}
                    >
                      لوحة تحكم الموردين ({suppliers.length})
                    </button>
                    <button
                      onClick={() => setActiveProductSubTab('products')}
                      className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        activeProductSubTab === 'products'
                          ? "bg-pink-600/10 text-pink-400 border border-pink-500/30"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850"
                      }`}
                    >
                      كتالوج المنتجات والمكونات ({products.length})
                    </button>
                    <button
                      onClick={() => setActiveProductSubTab('remnants')}
                      className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        activeProductSubTab === 'remnants'
                          ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850"
                      }`}
                    >
                      بقايا وقصاصات الألواح ({remnants.length})
                    </button>
                    <button
                      onClick={() => setActiveProductSubTab('materials')}
                      className={`px-4 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        activeProductSubTab === 'materials'
                          ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850"
                      }`}
                    >
                      المواد والمخزون ({materials.length})
                    </button>
                  </div>

                  {/* SUB-TAB CONTENTS */}
                  {activeProductSubTab === 'materials' && (
                    <div className="space-y-6">
                      {/* Metric Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between text-right">
                          <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">المواد الأساسية</span>
                            <div className="text-xl font-mono text-zinc-100 font-bold">{materials.length} نوع</div>
                          </div>
                        </div>

                        {currentUser.role !== "employee" ? (
                          <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between text-right">
                            <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center shrink-0">
                              <DollarSign className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">قيمة أصول المستودع</span>
                              <div className="text-xl font-mono text-emerald-400 font-bold">${(materialStats.totalValue || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between text-right">
                            <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">إجمالي قطع البقايا والفضلات</span>
                              <div className="text-xl font-mono text-indigo-400 font-bold">{remnants.length} قطع</div>
                            </div>
                          </div>
                        )}

                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between text-right">
                          <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-900/30 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">تنبيه انخفاض المخزون</span>
                            <div className="text-xl font-mono text-amber-400 font-bold">{materialStats.lowStock || 0} خامات</div>
                          </div>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between text-right">
                          <div className="w-10 h-10 rounded-lg bg-rose-950/40 border border-rose-900/30 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">نافذ بالكامل</span>
                            <div className="text-xl font-mono text-rose-500 font-bold">{materialStats.outOfStock || 0} خامات</div>
                          </div>
                        </div>
                      </div>

                      {/* Low-Stock Alert Banner for Minimum Thresholds */}
                      {(() => {
                        const lowStockAlertItems = materials.filter(m => (m.inventory?.quantity ?? 0) <= (m.minimumStock || 0));
                        if (lowStockAlertItems.length === 0) return null;

                        return (
                          <div className="bg-gradient-to-r from-rose-950/40 via-zinc-950 to-amber-950/40 border border-rose-900/60 p-4 rounded-xl space-y-3 shadow-lg text-right">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-900/40 pb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                                <h4 className="text-xs font-bold text-rose-200">
                                  تنبيه هامة: يوجد ({lowStockAlertItems.length}) خامات وصلت أو قلت عن حد الطلب الأدنى المطلوب للورشة
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveProductSubTab('supply_orders')}
                                className="text-[11px] text-amber-300 hover:text-amber-100 font-bold bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded cursor-pointer self-start sm:self-auto flex items-center gap-1"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>متابعة مركز طلبات التوريد ←</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {lowStockAlertItems.map(m => {
                                const qty = m.inventory?.quantity ?? 0;
                                const min = m.minimumStock || 0;
                                const activeOrder = supplyOrders.find(o => o.materialId === m.id && o.status === 'pending');

                                return (
                                  <div key={m.id} className="bg-zinc-900/90 border border-rose-900/40 p-3 rounded-lg space-y-2 text-right">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-zinc-400 font-mono">{m.category}</span>
                                      <span className="font-bold text-zinc-100 text-xs">{m.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-rose-400 font-mono font-bold">المخزون الحالي: {qty} {m.unit || 'وحدة'}</span>
                                      <span className="text-zinc-400 font-mono">الحد الأدنى: {min}</span>
                                    </div>
                                    <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-2">
                                      {activeOrder ? (
                                        <span className="text-[9px] text-amber-400 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded font-bold">
                                          طلب شحن معلق #{activeOrder.id}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-rose-400 font-bold">يتطلب توريد عاجل</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleQuickSupplyRequest(m)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                      >
                                        <Truck className="w-3 h-3" />
                                        <span>طلب توريد سريع</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Material Cost Distribution & Asset Transparency Charts */}
                      <MaterialCostCharts 
                        materials={materials} 
                        exchangeRate={exchangeRate} 
                        remnants={remnants}
                        productionJobs={productionJobs}
                        onSelectMaterial={(mat) => {
                          setSearchQuery(mat.fullName || mat.name);
                        }} 
                      />

                      {/* Materials List Table */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            <button 
                              onClick={refreshInventoryData}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                              <RefreshCw className="w-3 h-3" /> تحديث مرئي
                            </button>
                            
                             {/* Sort Selector & Drag Tip */}
                             <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80">
                               <button
                                 onClick={() => setMaterialSortBy('default')}
                                 className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                                   materialSortBy === 'default'
                                     ? "bg-[#c59257] text-zinc-950 font-black shadow"
                                     : "text-zinc-500 hover:text-zinc-300"
                                 }`}
                                 title="الترتيب المخصص بالسحب والإفلات حسب تفضيلات العمل بالورشة"
                               >
                                 <GripVertical className="w-3 h-3 text-zinc-950 shrink-0" />
                                 <span>ترتيب مخصص (سحب وإفلات)</span>
                               </button>
                               <button
                                 onClick={() => setMaterialSortBy('most_used')}
                                 className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                                   materialSortBy === 'most_used'
                                     ? "bg-[#c59257] text-zinc-950 font-black shadow"
                                     : "text-zinc-500 hover:text-zinc-300"
                                 }`}
                               >
                                 <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                 <span>الأكثر استخداماً</span>
                               </button>
                             </div>

                             {/* Drag Banner Hint */}
                             <div className="text-[10px] text-amber-300/90 font-mono flex items-center gap-1 bg-amber-950/30 px-2.5 py-1 rounded border border-amber-900/40 shrink-0">
                               <GripVertical className="w-3.5 h-3.5 text-[#c59257] shrink-0" />
                               <span>امسك مقبض السحب (⋮⋮) واسحب صف الخامة لأعلى أو لأسفل لترتيب المواد حسب الأولوية في الورشة</span>
                             </div>

                             {/* Quality Status Filter Buttons */}
                             <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80">
                               <button
                                 onClick={() => setMaterialQualityFilter('all')}
                                 className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                                   materialQualityFilter === 'all'
                                     ? "bg-zinc-700 text-zinc-100 font-black shadow"
                                     : "text-zinc-500 hover:text-zinc-300"
                                 }`}
                               >
                                 الكل ({materials.length})
                               </button>
                               <button
                                 onClick={() => setMaterialQualityFilter('inspected')}
                                 className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                                   materialQualityFilter === 'inspected'
                                     ? "bg-emerald-600 text-white font-black shadow"
                                     : "text-emerald-500/80 hover:text-emerald-300"
                                 }`}
                               >
                                 ✨ مفحوصة ({materials.filter(m => (m.qualityStatus || 'inspected') === 'inspected').length})
                               </button>
                               <button
                                 onClick={() => setMaterialQualityFilter('in_preparation')}
                                 className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                                   materialQualityFilter === 'in_preparation'
                                     ? "bg-amber-600 text-white font-black shadow"
                                     : "text-amber-500/80 hover:text-amber-300"
                                 }`}
                               >
                                 ⏳ قيد التجهيز ({materials.filter(m => (m.qualityStatus || 'inspected') === 'in_preparation').length})
                               </button>
                               <button
                                 onClick={() => setMaterialQualityFilter('defective')}
                                 className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                                   materialQualityFilter === 'defective'
                                     ? "bg-rose-600 text-white font-black shadow"
                                     : "text-rose-500/80 hover:text-rose-300"
                                 }`}
                               >
                                 ⚠️ معيبة ({materials.filter(m => (m.qualityStatus || 'inspected') === 'defective').length})
                               </button>
                             </div>

                             {/* Compare Supplier Prices Button */}
                             <button
                               type="button"
                               onClick={() => setPriceComparisonMaterial(materials[0] || null)}
                               className="px-2.5 py-1 bg-[#c59257]/20 hover:bg-[#c59257]/30 border border-[#c59257]/40 text-[#c59257] text-[10px] font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
                               title="فتح مركز مقارنة أسعار الموردين المختلفة والتحليل المالي"
                             >
                               <GitCompare className="w-3.5 h-3.5 text-[#c59257]" />
                               <span>مقارنة أسعار الموردين</span>
                             </button>
                           </div>
                           
                           <div className="flex items-center gap-2">
                             <button
                               type="button"
                               onClick={() => {
                                 const filtered = materials.filter(m => {
                                   if (materialQualityFilter !== 'all') {
                                     const status = m.qualityStatus || 'inspected';
                                     if (status !== materialQualityFilter) return false;
                                   }
                                   return true;
                                 });
                                 handleExportMaterialsCSV(filtered);
                               }}
                               className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-[10px] font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0"
                               title="تصدير جدول المواد والمخزون الحالية كملف CSV للتدقيق الخارجي وحصر المستودع"
                             >
                               <Download className="w-3.5 h-3.5 text-emerald-400" />
                               <span>تصدير CSV (تدقيق المخزون)</span>
                             </button>
                             <span className="text-zinc-200 font-sans font-bold">قائمة المواد والخامات المعتمدة</span>
                           </div>
                         </div>
                         <div className="overflow-x-auto">
                           <table className="w-full text-right text-xs text-zinc-400 border-collapse">
                             <thead>
                               <tr className="bg-zinc-900/20 border-b border-zinc-850 text-zinc-500 font-sans">
                                 <th className="p-3 w-12 text-center text-amber-500 font-bold" title="إعادة ترتيب صفوف المواد بالسحب والإفلات">سحب</th>
                                 <th className="p-3">المادة والرمز</th>
                                 <th className="p-3">التصنيف</th>
                                 <th className="p-3">المواصفات الفنية</th>
                                 <th className="p-3 text-center">حالة الجودة</th>
                                 <th className="p-3 text-center">سعر اللوح / القطعة</th>
                                 <th className="p-3 text-center bg-amber-950/30 text-amber-300 border-x border-amber-800/40 font-bold">تكلفة المتر المربع الفعالة (م²)</th>
                                 <th className="p-3">مستودع / موقع</th>
                                 <th className="p-3 text-center">المستوى الحالي</th>
                                 <th className="p-3 text-center">محجوز / متاح</th>
                                 <th className="p-3">الحالة والطلب</th>
                                 <th className="p-3 text-left">العمليات</th>
                               </tr>
                             </thead>
                             <tbody>
                               {materials.length === 0 ? (
                                 <tr>
                                   <td colSpan={12} className="p-8 text-center text-zinc-600">
                                     <Layers className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                                     لا يوجد مواد مسجلة حالياً في قاعدة البيانات.
                                   </td>
                                 </tr>
                               ) : (
                                 (() => {
                                   const filtered = materials.filter(m => {
                                     if (materialQualityFilter !== 'all') {
                                       const status = m.qualityStatus || 'inspected';
                                       if (status !== materialQualityFilter) return false;
                                     }
                                     return true;
                                   });

                                   if (filtered.length === 0) {
                                     return (
                                       <tr>
                                         <td colSpan={12} className="p-8 text-center text-zinc-500 font-sans">
                                           لا توجد مواد تطابق حالة الجودة المحددة: <span className="font-bold text-[#c59257]">
                                             {materialQualityFilter === 'inspected' ? 'مفحوصة' : materialQualityFilter === 'in_preparation' ? 'قيد التجهيز' : 'معيبة'}
                                           </span>
                                         </td>
                                       </tr>
                                     );
                                   }

                                   const sorted = [...filtered].sort((a, b) => {
                                     if (materialSortBy === 'most_used') {
                                       const aCount = productionJobs.filter(job => job.materialId === a.id).length;
                                       const bCount = productionJobs.filter(job => job.materialId === b.id).length;
                                       return bCount - aCount;
                                     }
                                     return 0;
                                   });
                                   
                                   return sorted.map((m, index) => {
                                     const inv = m.inventory || { quantity: 0, reserved: 0, location: "غير محدد" };
                                     const isCritical = inv.quantity === 0;
                                     const isWarning = !isCritical && inv.quantity <= (m.minimumStock || 0);
                                     const availableStock = inv.quantity - inv.reserved;
                                     const quality = m.qualityStatus || 'inspected';

                                     const isDragging = draggedMaterialId === m.id;
                                     const isDragOver = dragOverMaterialId === m.id;

                                     return (
                                       <tr 
                                         key={m.id} 
                                         draggable={true}
                                         onDragStart={(e) => {
                                           e.dataTransfer.setData("text/plain", m.id);
                                           e.dataTransfer.effectAllowed = "move";
                                           setDraggedMaterialId(m.id);
                                         }}
                                         onDragOver={(e) => {
                                           e.preventDefault();
                                           e.dataTransfer.dropEffect = "move";
                                           if (dragOverMaterialId !== m.id) {
                                             setDragOverMaterialId(m.id);
                                           }
                                         }}
                                         onDragLeave={() => {
                                           if (dragOverMaterialId === m.id) {
                                             setDragOverMaterialId(null);
                                           }
                                         }}
                                         onDrop={(e) => {
                                           e.preventDefault();
                                           const sourceId = e.dataTransfer.getData("text/plain") || draggedMaterialId;
                                           if (sourceId && sourceId !== m.id) {
                                             handleReorderMaterials(sourceId, m.id);
                                           }
                                           setDraggedMaterialId(null);
                                           setDragOverMaterialId(null);
                                         }}
                                         onDragEnd={() => {
                                           setDraggedMaterialId(null);
                                           setDragOverMaterialId(null);
                                         }}
                                         className={`border-b border-zinc-900 transition-all text-right select-none ${
                                           isDragging 
                                             ? "opacity-30 bg-amber-950/30 border-2 border-dashed border-[#c59257] scale-[0.99]" 
                                             : isDragOver 
                                             ? "border-t-4 border-[#c59257] bg-amber-950/40 shadow-xl scale-[1.005]" 
                                             : index % 2 === 1 ? "bg-zinc-900/20 hover:bg-zinc-900/40" : "bg-black/10 hover:bg-zinc-900/30"
                                         }`}
                                       >
                                         {/* Drag Handle Column */}
                                         <td 
                                           className="p-3 text-center cursor-grab active:cursor-grabbing hover:bg-amber-950/40 rounded transition-colors group"
                                           title="اضغط واسحب الصف لأعلى أو لأسفل لإعادة الترتيب"
                                         >
                                           <div className="flex flex-col items-center justify-center gap-0.5">
                                             <GripVertical className="w-4 h-4 text-amber-500/70 group-hover:text-amber-400 group-hover:scale-125 transition-all" />
                                             <span className="text-[8.5px] font-mono text-zinc-500 group-hover:text-amber-300 font-bold">#{index + 1}</span>
                                           </div>
                                         </td>
                                         <td className="p-3">
                                          <div className="font-bold text-zinc-200 flex items-center gap-1.5 justify-start">
                                            <span>{m.name}</span>
                                            {(() => {
                                              const count = productionJobs.filter(job => job.materialId === m.id).length;
                                              if (count > 0) {
                                                return (
                                                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-950/40 text-amber-500 border border-amber-900/30 rounded-md flex items-center gap-0.5">
                                                    <Zap className="w-2 h-2 text-amber-500" />
                                                    <span>استخدمت {count}</span>
                                                  </span>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{m.id.slice(0, 8)}</div>
                                        </td>
                                      <td className="p-3 text-zinc-400">
                                        {(() => {
                                          const cat = m.category || "عام";
                                          const sub = m.subCategory;
                                          const isAcrylic = cat === "الأكريليك";
                                          const isWood = cat === "الأخشاب";
                                          const isLeather = cat === "الجلود";

                                          let badgeStyle = "bg-zinc-900 text-zinc-400 border-zinc-800";
                                          let icon = <Info className="w-3 h-3" />;

                                          if (isAcrylic) {
                                            badgeStyle = "bg-pink-950/40 text-pink-400 border-pink-900/30";
                                            icon = <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
                                          } else if (isWood) {
                                            badgeStyle = "bg-amber-950/40 text-amber-400 border-amber-900/30";
                                            icon = <Layers className="w-3.5 h-3.5 text-amber-500" />;
                                          } else if (isLeather) {
                                            badgeStyle = "bg-orange-950/40 text-orange-400 border-orange-900/30";
                                            icon = <Scissors className="w-3.5 h-3.5 text-orange-400" />;
                                          }

                                          return (
                                            <div className="flex flex-wrap items-center justify-start gap-1.5">
                                              <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border inline-flex items-center gap-1.5 shadow-sm ${badgeStyle}`}>
                                                {icon}
                                                <span>{cat}</span>
                                              </span>
                                              {sub && (
                                                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-zinc-900/90 text-amber-200/90 border border-amber-800/40 inline-flex items-center gap-1 shadow-sm">
                                                  <span className="text-[#c59257] text-[10px] font-mono">↳</span>
                                                  <span>{sub}</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="p-3 font-mono text-[11px] text-zinc-300">
                                        <div className="flex flex-col gap-1">
                                          {m.thickness && <span>سماكة: {m.thickness} مم</span>}
                                          {m.color && <span className="text-zinc-500">لون: {m.color}</span>}
                                          {m.width && m.height && <span className="text-[10px] text-zinc-500">{m.width}x{m.height} مم</span>}
                                        </div>
                                      </td>

                                      {/* Quality Status Column */}
                                      <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <select
                                            value={quality}
                                            onChange={(e) => handleUpdateMaterialQualityStatus(m.id, e.target.value)}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer focus:outline-none transition-all shadow-sm ${
                                              quality === "inspected"
                                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900"
                                                : quality === "defective"
                                                ? "bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900"
                                                : "bg-amber-950/80 text-amber-300 border-amber-800/80 hover:bg-amber-900"
                                            }`}
                                            title="تغيير حالة جودة المادة الخام فورياً"
                                          >
                                            <option value="inspected" className="bg-zinc-950 text-emerald-300 font-bold">✨ مفحوصة</option>
                                            <option value="in_preparation" className="bg-zinc-950 text-amber-300 font-bold">⏳ قيد التجهيز</option>
                                            <option value="defective" className="bg-zinc-950 text-rose-300 font-bold">⚠️ معيبة</option>
                                          </select>
                                          <span className="text-[9px] text-zinc-500 font-mono">
                                            {quality === "inspected"
                                              ? "جاهزة للقص"
                                              : quality === "defective"
                                              ? "تستوجب الاستبدال"
                                              : "تحت المعاينة"}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Unit Cost Column */}
                                      <td className="p-3 text-center font-mono">
                                        {(() => {
                                          const priceVal = Number(m.pricePerUnit) || 0;
                                          const isSYP = priceVal >= 10000 || priceVal === 0;
                                          const sypPrice = isSYP ? Math.round(priceVal) : Math.round(priceVal * exchangeRate);
                                          const usdPrice = isSYP ? (priceVal / exchangeRate) : priceVal;

                                          return (
                                            <div className="flex flex-col items-center justify-center gap-0.5">
                                              <div className="text-zinc-100 font-bold text-[12px] flex items-center gap-1">
                                                <span className="text-[#c59257] font-extrabold">{sypPrice.toLocaleString()} ل.س</span>
                                              </div>
                                              <div className="text-[10px] text-zinc-400 font-mono">
                                                ≈ ${usdPrice.toFixed(2)}
                                              </div>
                                              <div className="text-[9px] text-zinc-500 font-sans">
                                                لكل {m.unit || "لوح"}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* Effective Cost per m2 Column */}
                                      <td className="p-3 text-center font-mono bg-amber-950/10 border-x border-amber-900/20">
                                        {(() => {
                                          const priceVal = Number(m.pricePerUnit) || 0;
                                          const isSYP = priceVal >= 10000 || priceVal === 0;
                                          const sypPrice = isSYP ? Math.round(priceVal) : Math.round(priceVal * exchangeRate);
                                          const usdPrice = isSYP ? (priceVal / exchangeRate) : priceVal;

                                          const widthM = m.width ? Number(m.width) / 1000 : 0;
                                          const heightM = m.height ? Number(m.height) / 1000 : 0;
                                          const areaM2 = widthM * heightM;

                                          if (areaM2 > 0) {
                                            const costPerM2SYP = Math.round(sypPrice / areaM2);
                                            const costPerM2USD = usdPrice / areaM2;

                                            return (
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                <div className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60 font-black text-[11px] shadow-sm flex items-center gap-1">
                                                  <span>{costPerM2SYP.toLocaleString()} ل.س / م²</span>
                                                </div>
                                                <div className="text-[10px] text-zinc-400 font-mono">
                                                  ≈ ${costPerM2USD.toFixed(2)} / م²
                                                </div>
                                                <div className="text-[9px] text-zinc-500 font-sans">
                                                  (مساحة اللوح: {areaM2.toFixed(2)} م²)
                                                </div>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div className="flex flex-col items-center justify-center text-zinc-500 text-[10px] font-sans">
                                              <span>غير محدد الأبعاد</span>
                                              <span className="text-[9px] text-zinc-600">(تكلفة ثابتة للقطعة)</span>
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="p-3 text-zinc-400">
                                        <div className="text-[11px]">{inv.location || "الرف الرئيسي"}</div>
                                        {m.supplier && <div className="text-[10px] text-indigo-400 mt-0.5">{m.supplier.name}</div>}
                                      </td>
                                      <td className="p-3 text-center">
                                        <div className="font-mono font-bold text-zinc-100">{inv.quantity} {m.unit || "وحدة"}</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">الحد الأدنى: {m.minimumStock || 0}</div>
                                      </td>
                                      <td className="p-3 text-center font-mono">
                                        <div className="text-amber-500 text-[11px]">محجوز: {inv.reserved}</div>
                                        <div className="text-emerald-400 font-bold mt-0.5">متاح: {availableStock}</div>
                                      </td>
                                      <td className="p-3">
                                        <div className="space-y-1.5">
                                          <div>
                                            {isCritical ? (
                                              <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/30 text-[10px] font-bold">نفذ بالكامل</span>
                                            ) : isWarning ? (
                                              <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-900/30 text-[10px] font-bold">شبه نافذ</span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[10px] font-bold">آمن</span>
                                            )}
                                          </div>

                                          {/* Inline Supply Order Status Modifier */}
                                          {(() => {
                                            const matOrders = supplyOrders.filter(o => o.materialId === m.id);
                                            const pendingOrd = matOrders.find(o => o.status === 'pending');
                                            const latestOrd = pendingOrd || matOrders[0];

                                            if (!latestOrd) {
                                              return null;
                                            }

                                            return (
                                              <div className="flex flex-col gap-1 bg-zinc-900/80 p-1.5 rounded border border-zinc-800 text-[10px]">
                                                <div className="flex items-center justify-between text-zinc-400">
                                                  <span className="font-mono text-[#c59257]">#{latestOrd.id}</span>
                                                  <span className="font-bold">{latestOrd.quantity} قطعة</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                  <span className="text-[9px] text-zinc-500 shrink-0">حالة الطلب:</span>
                                                  <select
                                                    value={latestOrd.status}
                                                    onChange={(e) => handleUpdateSupplyOrderStatus(latestOrd.id, e.target.value as any)}
                                                    className={`p-0.5 rounded text-[9px] font-bold border bg-black cursor-pointer w-full ${
                                                      latestOrd.status === 'pending'
                                                        ? 'text-amber-400 border-amber-800'
                                                        : latestOrd.status === 'completed' || latestOrd.status === 'received'
                                                          ? 'text-emerald-400 border-emerald-800'
                                                          : 'text-rose-400 border-rose-800'
                                                    }`}
                                                  >
                                                    <option value="pending">⏳ معلقة</option>
                                                    <option value="completed">✓ مستلمة</option>
                                                    <option value="cancelled">✕ ملغاة</option>
                                                  </select>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex gap-1.5 items-center justify-start">
                                          <button
                                            onClick={() => {
                                              setShowAdjustStock(m);
                                              setAdjustQty("");
                                              setAdjustReason("");
                                            }}
                                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                                          >
                                            حركة مخزون
                                          </button>
                                          {currentUser.role !== "employee" && (
                                            <button
                                              onClick={() => {
                                                setEditingMaterial(m);
                                                setAiClassificationResult(null);
                                                handleAiClassifyMaterial(
                                                  m.name,
                                                  m.thickness ? m.thickness.toString() : "",
                                                  m.color || "",
                                                  m.notes || "",
                                                  true,
                                                  true
                                                );
                                              }}
                                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] text-zinc-300 cursor-pointer"
                                            >
                                              تعديل
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleQuickSupplyRequest(m)}
                                            title="تعبئة نموذج طلب التوريد تلقائياً بالبيانات الحالية"
                                            className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-emerald-200 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                          >
                                            <Truck className="w-3 h-3 text-emerald-400" />
                                            <span>طلب توريد سريع</span>
                                          </button>
                                          <button
                                            onClick={() => setSelectedMaterialFiles(m)}
                                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-[10px] text-[#c59257] hover:text-[#ffd166] cursor-pointer flex items-center gap-1"
                                          >
                                            <FolderOpen className="w-3 h-3" />
                                            الملفات
                                          </button>
                                          {currentUser.role !== "employee" && (
                                            <button
                                              onClick={async () => {
                                                const confirmed = await window.showConfirm?.(`هل أنت متأكد من أرشفة وإلغاء تفعيل الخامة "${m.name}"؟`, "تأكيد الأرشفة");
                                                if (confirmed) {
                                                  handleDeleteMaterial(m.id, m.name);
                                                }
                                              }}
                                              className="px-2 py-1 bg-zinc-900 hover:bg-rose-950/20 border border-zinc-800 text-zinc-500 hover:text-rose-400 rounded text-[10px] cursor-pointer"
                                            >
                                              أرشفة
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                  })
                                })()
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeProductSubTab === 'remnants' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Left side: Smart Remnant Locator Tool */}
                      <div className="lg:col-span-5 border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-xs font-bold text-zinc-200">محدد ومطابق البقايا الذكي (Remnant Matcher)</h4>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            أدخل أبعاد الجزء المطلوب قصه حالياً، وسيقوم النظام فوراً بالبحث في فضلات وقصاصات الألواح لتحديد أصغر قطعة كافية للعمل، مما يوفر استهلاك الألواح الكاملة!
                          </p>

                          <form onSubmit={handleFindSuitableRemnantSubmit} className="space-y-3 text-xs">
                            <div>
                              <label className="text-zinc-400 block mb-1">اختر المادة الخام الأساسية</label>
                              <select
                                value={findSuitableMatId}
                                onChange={(e) => setFindSuitableMatId(e.target.value)}
                                className="w-full bg-black border border-zinc-850 rounded p-2 text-zinc-300 focus:border-indigo-500"
                              >
                                <option value="">-- اختر نوع المادة --</option>
                                {materials.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-zinc-400 block mb-1">العرض المطلوب (مم)</label>
                                <input
                                  type="number"
                                  placeholder="العرض بالمليمتر"
                                  value={findSuitableW}
                                  onChange={(e) => setFindSuitableW(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-zinc-400 block mb-1">الارتفاع المطلوب (مم)</label>
                                <input
                                  type="number"
                                  placeholder="الارتفاع بالمليمتر"
                                  value={findSuitableH}
                                  onChange={(e) => setFindSuitableH(e.target.value)}
                                  className="w-full bg-black border border-zinc-850 rounded p-2 text-zinc-200 text-right focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Search className="w-3.5 h-3.5" /> البحث عن أقرب قطعة بقايا مناسبة
                            </button>
                          </form>

                          {/* Match Result Display */}
                          {suitableRemnantResult !== undefined && (
                            <div className="mt-4 pt-4 border-t border-zinc-900">
                              {suitableRemnantResult ? (
                                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-right space-y-2">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>تم العثور على قطعة بقايا متطابقة!</span>
                                  </div>
                                  <div className="text-xs text-zinc-300 space-y-1">
                                    <p>• المقاس المتاح: <strong className="text-white font-mono">{suitableRemnantResult.width} x {suitableRemnantResult.height} مم</strong></p>
                                    <p>• مساحة الفضلات: <strong className="text-white font-mono">{(suitableRemnantResult.width * suitableRemnantResult.height).toLocaleString()} مم²</strong></p>
                                    <p>• موقع الرف: <strong className="text-zinc-200">{suitableRemnantResult.location || "غير محدد"}</strong></p>
                                    <p className="text-[10px] text-zinc-500 mt-1">كود المادة: {suitableRemnantResult.id.slice(0, 8)}</p>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const confirmed = await window.showConfirm?.("هل تريد تسجيل استهلاك هذه القطعة الناتجة الآن وحذفها من سجل البقايا؟", "تأكيد استهلاك بقايا");
                                      if (confirmed) {
                                        handleConsumeRemnant(suitableRemnantResult.id);
                                        setSuitableRemnantResult(null);
                                      }
                                    }}
                                    className="w-full mt-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                                  >
                                    استهلاك هذه القطعة للقص فوراً
                                  </button>
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-right">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>لا توجد بقايا مستعملة متطابقة!</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                                    لم نجد أي قطعة فضلات بالأبعاد الكافية لهذا التصميم. يجب استهلاك لوح خام كامل جديد من المخزن الأساسي لإتمام العملية.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Remnants Active Directory */}
                      <div className="lg:col-span-7 bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-zinc-900/60 px-4 py-3 border-b border-zinc-850 flex items-center justify-between text-xs">
                          <span className="text-zinc-500 font-mono">Active Sheet Offcuts</span>
                          <span className="text-zinc-200 font-bold">سجل فضلات وقصاصات الألواح المتاحة</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs text-zinc-400 border-collapse">
                            <thead>
                              <tr className="bg-zinc-900/20 border-b border-zinc-850 text-zinc-500 font-sans">
                                <th className="p-3">اسم الخامة الأساسية</th>
                                <th className="p-3">الأبعاد والمقاس</th>
                                <th className="p-3 text-center">المساحة الإجمالية</th>
                                <th className="p-3">موقع التخزين</th>
                                <th className="p-3 text-center">الكمية</th>
                                <th className="p-3 text-left">العمليات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {remnants.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-zinc-600">
                                    <Layers className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                                    لا توجد أي فضلات أو بقايا ألواح مسجلة حالياً.
                                  </td>
                                </tr>
                              ) : (
                                remnants.map((r, index) => (
                                  <tr 
                                    key={r.id} 
                                    className={`border-b border-zinc-900 hover:bg-zinc-900/20 transition-colors ${
                                      index % 2 === 1 ? "bg-zinc-900/20" : "bg-black/10"
                                    }`}
                                  >
                                    <td className="p-3">
                                      <div className="font-bold text-zinc-200">{r.material?.name || "خامة عامة"}</div>
                                      <div className="text-[10px] text-zinc-500 mt-0.5">رمز: {r.id.slice(0, 8)}</div>
                                    </td>
                                    <td className="p-3 font-mono text-zinc-300 font-semibold">
                                      {r.width} x {r.height} مم
                                    </td>
                                    <td className="p-3 text-center font-mono text-[11px] text-zinc-400">
                                      {(r.width * r.height).toLocaleString()} مم²
                                    </td>
                                    <td className="p-3 text-zinc-300">
                                      {r.location || "رف الفضلات الرئيسي"}
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-indigo-400">
                                      {r.quantity} قطع
                                    </td>
                                    <td className="p-3">
                                      <div className="flex gap-1.5 items-center justify-start">
                                        <button
                                          onClick={async () => {
                                             const confirmed = await window.showConfirm?.("هل تريد استهلاك قطعة واحدة من هذه البقايا؟", "تأكيد استهلاك بقايا");
                                             if (confirmed) {
                                               handleConsumeRemnant(r.id, 1);
                                             }
                                           }}
                                          className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                        >
                                          قص واستهلاك
                                        </button>
                                        <button
                                          onClick={async () => {
                                             const confirmed = await window.showConfirm?.("هل تود وسم هذه القطعة كتالفة (هدر بالكامل) والتخلص منها؟", "تأكيد هدر قطعة");
                                             if (confirmed) {
                                               handleWasteRemnant(r.id);
                                             }
                                           }}
                                          className="px-2 py-1 bg-zinc-900 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 rounded text-[10px] cursor-pointer"
                                        >
                                          هدر وتالف
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeProductSubTab === 'products' && (
                    <div className="space-y-6">
                      {/* Search and Category Filter Row */}
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
                        <div className="flex gap-2 w-full sm:w-auto">
                          {["الكل", "الأكريليك", "الأخشاب", "الجلود", "عام"].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setProductFilter(cat)}
                              className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                                productFilter === cat 
                                  ? "bg-pink-600/10 border-pink-500/30 text-pink-400" 
                                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        <div className="relative w-full sm:w-72">
                          <input
                            type="text"
                            placeholder="ابحث عن مادة، كود، أو تصنيف..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-zinc-200 focus:outline-none focus:border-pink-500 text-right text-xs"
                          />
                          <Search className="w-4 h-4 text-zinc-500 absolute top-2.5 right-2.5" />
                        </div>
                      </div>

                      {/* Products Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {products.filter(p => {
                          const matchesSearch = productSearch === "" || 
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            p.code.toLowerCase().includes(productSearch.toLowerCase()) || 
                            p.category.toLowerCase().includes(productSearch.toLowerCase());
                            
                          const matchesCategory = productFilter === "الكل" || p.category === productFilter;
                          return matchesSearch && matchesCategory;
                        }).length === 0 ? (
                          <div className="col-span-full py-12 text-center text-zinc-600 bg-zinc-950 rounded-xl border border-dashed border-zinc-850 space-y-2">
                            <Layers className="w-10 h-10 text-zinc-700 mx-auto" />
                            <p className="text-xs">لا يوجد مواد أو منتجات تطابق معايير البحث والفلترة حالياً.</p>
                          </div>
                        ) : (
                          products.filter(p => {
                            const matchesSearch = productSearch === "" || 
                              p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                              p.code.toLowerCase().includes(productSearch.toLowerCase()) || 
                              p.category.toLowerCase().includes(productSearch.toLowerCase());
                              
                            const matchesCategory = productFilter === "الكل" || p.category === productFilter;
                            return matchesSearch && matchesCategory;
                          }).map((p) => {
                            const isAcrylic = p.category === "الأكريليك";
                            const isWood = p.category === "الأخشاب";
                            const isLeather = p.category === "الجلود";

                            const categoryColor = isAcrylic 
                              ? "bg-pink-950/40 text-pink-400 border-pink-900/30"
                              : isWood 
                              ? "bg-amber-950/40 text-amber-400 border-amber-900/30"
                              : isLeather
                              ? "bg-orange-950/40 text-orange-400 border-orange-900/30"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800";

                            const cardBorder = isAcrylic
                              ? "hover:border-pink-900/50"
                              : isWood
                              ? "hover:border-amber-900/50"
                              : isLeather
                              ? "hover:border-orange-900/50"
                              : "hover:border-zinc-800";

                            const isLowStock = (p.stock || 0) <= 20;
                            const isOutOfStock = (p.stock || 0) === 0;

                            return (
                              <div
                                key={p.id}
                                className={`bg-zinc-950 p-5 rounded-2xl border border-zinc-850/80 hover:shadow-xl transition-all space-y-4 text-right flex flex-col justify-between ${cardBorder}`}
                              >
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-mono font-bold text-zinc-400">${p.price.toFixed(2)}</span>
                                    <div className="text-right">
                                      <h4 className="text-sm font-bold text-zinc-200">{p.name}</h4>
                                      <div className="flex gap-1.5 items-center justify-end mt-1">
                                        <span className="text-[9px] font-mono bg-zinc-900 text-zinc-500 border border-zinc-850 px-1.5 py-0.2 rounded">
                                          {p.code}
                                        </span>
                                        <span className={`text-[9px] font-bold border px-1.5 py-0.2 rounded-full inline-flex items-center gap-1 ${categoryColor}`}>
                                          {isAcrylic && <Sparkles className="w-2.5 h-2.5" />}
                                          {isWood && <Layers className="w-2.5 h-2.5" />}
                                          {isLeather && <Scissors className="w-2.5 h-2.5" />}
                                          <span>{p.category}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-xs text-zinc-500 leading-relaxed text-right min-h-[36px]">
                                    {p.description || "لا يوجد وصف مسجل لهذه المادة."}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
                                  <div className="flex gap-2">
                                    {currentUser.role !== "employee" && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingProduct(p);
                                          setShowAddProduct(false);
                                        }}
                                        className="text-[10px] bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white px-2.5 py-1 rounded border border-zinc-850 transition-colors cursor-pointer"
                                      >
                                        تعديل
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProductFiles(p)}
                                      className="text-[10px] bg-zinc-900 hover:bg-zinc-850 text-[#c59257] hover:text-[#ffd166] px-2.5 py-1 rounded border border-zinc-850 transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <FolderOpen className="w-3 h-3" />
                                      الملفات
                                    </button>
                                    {currentUser.role !== "employee" && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteConfirmTarget({ id: p.id, name: p.name, type: 'product' })}
                                        className="text-[10px] bg-zinc-900 hover:bg-rose-950/30 text-zinc-500 hover:text-rose-400 px-2.5 py-1 rounded border border-zinc-850 transition-colors cursor-pointer"
                                      >
                                        حذف
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500"}`} />
                                    <span className="text-[11px] font-mono text-zinc-400">
                                      مخزون: <strong className="text-zinc-200 font-bold">{p.stock || 0} وحدة</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeProductSubTab === 'suppliers' && (
                    <div className="space-y-6 text-right animate-fadeIn">
                      {/* Supplier Selector List */}
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3">
                        <span className="text-xs font-bold text-zinc-400 block">اختر المورد لعرض لوحة تحكمه الخاصة:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {suppliers.map((s) => {
                            const isSelected = (selectedDashboardSupplierId || (suppliers[0]?.id || "")) === s.id;
                            const pendingForSupplier = supplyOrders.filter(o => o.supplierId === s.id && o.status === 'pending');
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDashboardSupplierId(s.id);
                                  // Default the material to the first material belonging to this supplier, if any
                                  const supplierMats = materials.filter(m => m.supplierId === s.id);
                                  if (supplierMats.length > 0) {
                                    setNewSupplyMaterialId(supplierMats[0].id);
                                    setNewSupplyPrice(supplierMats[0].pricePerUnit?.toString() || "");
                                  } else {
                                    setNewSupplyMaterialId("");
                                    setNewSupplyPrice("");
                                  }
                                }}
                                className={`p-3.5 rounded-lg border text-right transition-all flex flex-col justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-[#c59257]/15 border-[#c59257] shadow-lg shadow-[#c59257]/5"
                                    : "bg-zinc-900 border-zinc-800/80 hover:bg-zinc-850"
                                }`}
                              >
                                <div className="flex items-center gap-2 w-full justify-between mb-1.5">
                                  {pendingForSupplier.length > 0 ? (
                                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                      {pendingForSupplier.length} معلقة
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px]">مستقر</span>
                                  )}
                                  <span className={`text-xs font-bold ${isSelected ? "text-[#c59257]" : "text-zinc-200"}`}>{s.name}</span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono truncate w-full" style={{ direction: 'ltr' }}>{s.phone || "بدون هاتف"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dashboard Content for Selected Supplier */}
                      {(() => {
                        const activeSupId = selectedDashboardSupplierId || (suppliers[0]?.id || "");
                        const s = suppliers.find(sup => sup.id === activeSupId);
                        if (!s) {
                          return (
                            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs">
                              يرجى إضافة موردين أولاً لعرض لوحة التحكم.
                            </div>
                          );
                        }

                        const supplierMaterials = materials.filter(m => m.supplierId === s.id);
                        const sOrders = supplyOrders.filter(o => o.supplierId === s.id);
                        const pendingOrders = sOrders.filter(o => o.status === "pending");
                        const completedOrders = sOrders.filter(o => o.status === "completed");
                        const cancelledOrders = sOrders.filter(o => o.status === "cancelled");

                        const totalSpend = completedOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
                        const pendingValue = pendingOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);

                        return (
                          <div className="space-y-6">
                            {/* Supplier stats cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                                <div className="w-10 h-10 rounded-lg bg-blue-950/40 border border-blue-900/30 flex items-center justify-center shrink-0">
                                  <Truck className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block mb-1">طلبات معلقة للتوريد</span>
                                  <div className="text-lg font-mono text-amber-400 font-bold">{pendingOrders.length} طلبية</div>
                                </div>
                              </div>

                              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                                <div className="w-10 h-10 rounded-lg bg-[#c59257]/10 border border-[#c59257]/20 flex items-center justify-center shrink-0">
                                  <DollarSign className="w-5 h-5 text-[#c59257]" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block mb-1">قيمة الطلبيات المعلقة</span>
                                  <div className="text-lg font-mono text-[#c59257] font-bold">${pendingValue.toLocaleString()}</div>
                                </div>
                              </div>

                              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                                <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center shrink-0">
                                  <History className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block mb-1">قيمة التوريد المستلم</span>
                                  <div className="text-lg font-mono text-emerald-400 font-bold">${totalSpend.toLocaleString()}</div>
                                </div>
                              </div>

                              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                                <div className="w-10 h-10 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center shrink-0">
                                  <Layers className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block mb-1">خامات مرتبطة بالمورد</span>
                                  <div className="text-lg font-mono text-indigo-300 font-bold">{supplierMaterials.length} خامة</div>
                                </div>
                              </div>
                            </div>

                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                              {/* Left column: Pending supply orders & supply history */}
                              <div className="lg:col-span-8 space-y-6">
                                {/* 1. PENDING ORDERS FOR THIS SUPPLIER */}
                                <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-850 space-y-4">
                                  <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2 justify-end border-b border-zinc-900 pb-2.5">
                                    <span>الطلبيات المعلقة قيد الشحن والتوصيل ({pendingOrders.length})</span>
                                    <Truck className="w-4 h-4 text-amber-500" />
                                  </h4>

                                  {pendingOrders.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 text-center py-6">لا توجد طلبيات توريد معلقة حالياً لهذا المورد.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-zinc-300 text-right">
                                        <thead>
                                          <tr className="border-b border-zinc-900 text-zinc-500">
                                            <th className="pb-2 font-medium">الرمز</th>
                                            <th className="pb-2 font-medium">الخامة المطلوبة</th>
                                            <th className="pb-2 font-medium text-center">الكمية</th>
                                            <th className="pb-2 font-medium text-center">سعر الوحدة</th>
                                            <th className="pb-2 font-medium text-center">الإجمالي</th>
                                            <th className="pb-2 font-medium">تاريخ الطلب / المتوقع</th>
                                            <th className="pb-2 font-medium text-center">الإجراءات التشغيلية</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900/50">
                                          {pendingOrders.map((o) => (
                                            <tr key={o.id} className="hover:bg-zinc-900/30">
                                              <td className="py-3 font-mono font-bold text-[#c59257]">{o.id}</td>
                                              <td className="py-3 font-medium">{o.materialName}</td>
                                              <td className="py-3 text-center font-mono">{o.quantity}</td>
                                              <td className="py-3 text-center font-mono">${o.unitPrice}</td>
                                              <td className="py-3 text-center font-mono font-bold text-emerald-400">${o.totalPrice}</td>
                                              <td className="py-3">
                                                <div className="text-[10px] text-zinc-400">طلب: {o.orderDate}</div>
                                                <div className="text-[10px] text-amber-500 font-bold">متوقع: {o.expectedDeliveryDate}</div>
                                              </td>
                                              <td className="py-3 text-center">
                                                <div className="flex gap-1.5 justify-center flex-wrap">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDuplicateSupplyOrder(o)}
                                                    className="px-2 py-1 bg-[#c59257]/20 hover:bg-[#c59257]/30 text-[#c59257] border border-[#c59257]/40 text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                                    title="نسخ هذه الطلبية مباشرة بنفس الخامة والكمية والمورد"
                                                  >
                                                    <Copy className="w-3 h-3 text-[#c59257]" />
                                                    <span>نسخ</span>
                                                  </button>
                                                  <button
                                                    onClick={() => handleUpdateSupplyOrderStatus(o.id, 'completed')}
                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1"
                                                  >
                                                    <Check className="w-3 h-3" />
                                                    <span>تأكيد الاستلام</span>
                                                  </button>
                                                  <button
                                                    onClick={() => handleUpdateSupplyOrderStatus(o.id, 'cancelled')}
                                                    className="px-2 py-1 bg-zinc-900 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 text-[10px] font-bold rounded transition-colors cursor-pointer border border-zinc-850"
                                                  >
                                                    إلغاء
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                {/* 2. SUPPLY HISTORY FOR THIS SUPPLIER */}
                                <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-850 space-y-4">
                                  <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2 justify-end border-b border-zinc-900 pb-2.5">
                                    <span>سجل التوريد السابق والتاريخ المالي ({completedOrders.length + cancelledOrders.length})</span>
                                    <History className="w-4 h-4 text-[#c59257]" />
                                  </h4>

                                  {sOrders.filter(o => o.status !== 'pending').length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 text-center py-6">لا توجد عمليات توريد مؤرشفة مسبقاً لهذا المورد.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-zinc-300 text-right">
                                        <thead>
                                          <tr className="border-b border-zinc-900 text-zinc-500">
                                            <th className="pb-2 font-medium">رمز الشحنة</th>
                                            <th className="pb-2 font-medium">المادة الخام</th>
                                            <th className="pb-2 font-medium text-center">الكمية</th>
                                            <th className="pb-2 font-medium text-center">الإجمالي</th>
                                            <th className="pb-2 font-medium">تاريخ الاستلام الفعلي</th>
                                            <th className="pb-2 font-medium">ملاحظات التوريد</th>
                                            <th className="pb-2 font-medium text-center">حالة الدفعة</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900/50">
                                          {sOrders.filter(o => o.status !== 'pending').map((o, idx) => {
                                            const isSuccess = o.status === "completed";
                                            return (
                                              <tr key={o.id} className={`hover:bg-zinc-900/20 ${idx % 2 === 0 ? 'bg-zinc-900/10' : ''}`}>
                                                <td className="py-2.5 font-mono text-[11px] text-zinc-400">{o.id}</td>
                                                <td className="py-2.5 font-medium">{o.materialName}</td>
                                                <td className="py-2.5 text-center font-mono">{o.quantity}</td>
                                                <td className="py-2.5 text-center font-mono font-bold">${o.totalPrice}</td>
                                                <td className="py-2.5 font-mono text-[11px] text-zinc-400">
                                                  {isSuccess ? o.actualDeliveryDate : "ملغاة"}
                                                </td>
                                                <td className="py-2.5 text-zinc-500 text-[11px] truncate max-w-[150px]" title={o.notes}>
                                                  {o.notes || "--"}
                                                </td>
                                                <td className="py-2.5 text-center">
                                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isSuccess 
                                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                  }`}>
                                                    {isSuccess ? "تم الاستلام" : "ملغي"}
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right column: Supplier contact card & new order form */}
                              <div className="lg:col-span-4 space-y-6">
                                {/* 1. Supplier Details Card */}
                                <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-850 space-y-4">
                                  <h4 className="text-xs font-bold text-zinc-200 border-b border-zinc-900 pb-2.5 text-right">
                                    بيانات المورد الرسمية والاتصال
                                  </h4>
                                  <div className="space-y-3 text-xs">
                                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                                      <span className="font-bold text-zinc-100">{s.name}</span>
                                      <span className="text-zinc-500">الاسم</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                                      <span className="font-mono text-[#c59257]" style={{ direction: 'ltr' }}>{s.phone || "لا يوجد"}</span>
                                      <span className="text-zinc-500">الهاتف</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                                      <span className="font-mono text-zinc-300 truncate max-w-[180px]">{s.email || "لا يوجد"}</span>
                                      <span className="text-zinc-500">البريد الإلكتروني</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 rounded border border-zinc-900">
                                      <span className="text-zinc-300 text-right">{s.address || "غير مسجل"}</span>
                                      <span className="text-zinc-500">العنوان</span>
                                    </div>
                                    {s.notes && (
                                      <div className="bg-[#c59257]/5 p-3 rounded border border-[#c59257]/15 leading-relaxed text-zinc-400 text-[11px]">
                                        <strong>ملاحظات:</strong> {s.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 2. Create Supply Order Form */}
                                <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-850 space-y-4">
                                  <h4 className="text-xs font-bold text-zinc-200 border-b border-zinc-900 pb-2.5 text-right flex items-center gap-1.5 justify-end">
                                    <span>إنشاء أمر توريد جديد</span>
                                    <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                  </h4>

                                  <form onSubmit={handleCreateSupplyOrder} className="space-y-3.5 text-xs">
                                    {/* Material selection */}
                                    <div className="space-y-1 text-right">
                                      <label className="text-zinc-400 font-medium block">الخامة المطلوبة للتوريد</label>
                                      <select
                                        required
                                        value={newSupplyMaterialId}
                                        onChange={(e) => {
                                          setNewSupplyMaterialId(e.target.value);
                                          const mat = materials.find(m => m.id === e.target.value);
                                          if (mat) {
                                            setNewSupplyPrice(mat.pricePerUnit?.toString() || "");
                                          }
                                        }}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-[#c59257] text-right"
                                      >
                                        <option value="">-- اختر خامة --</option>
                                        {/* List materials associated with this supplier first, then others */}
                                        {materials.map(m => (
                                          <option key={m.id} value={m.id}>
                                            {m.name} ({m.category} {m.thickness ? `${m.thickness}مم` : ""}) {m.supplierId === s.id ? "⭐ خامة المورد" : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      {/* Quantity */}
                                      <div className="space-y-1 text-right">
                                        <label className="text-zinc-400 font-medium block">الكمية المطلوبة</label>
                                        <input
                                          type="number"
                                          min="1"
                                          required
                                          value={newSupplyQty}
                                          onChange={(e) => setNewSupplyQty(e.target.value)}
                                          placeholder="عدد الألواح/القطع"
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 font-mono focus:outline-none focus:border-[#c59257] text-right"
                                        />
                                      </div>

                                      {/* Price per unit */}
                                      <div className="space-y-1 text-right">
                                        <label className="text-zinc-400 font-medium block">سعر الوحدة المتفق عليه ($)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          required
                                          value={newSupplyPrice}
                                          onChange={(e) => setNewSupplyPrice(e.target.value)}
                                          placeholder="0.00"
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 font-mono focus:outline-none focus:border-[#c59257] text-right"
                                        />
                                      </div>
                                    </div>

                                    {/* Expected Date */}
                                    <div className="space-y-1 text-right">
                                      <label className="text-zinc-400 font-medium block">تاريخ التوصيل المتوقع</label>
                                      <input
                                        type="date"
                                        value={newSupplyExpectedDate}
                                        onChange={(e) => setNewSupplyExpectedDate(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-[#c59257] text-right font-mono"
                                      />
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1 text-right">
                                      <label className="text-zinc-400 font-medium block">ملاحظات أمر التوريد</label>
                                      <textarea
                                        value={newSupplyNotes}
                                        onChange={(e) => setNewSupplyNotes(e.target.value)}
                                        placeholder="مثال: يرجى التغليف بكرتون سميك لحماية أطراف الألواح من الكسر..."
                                        className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-[#c59257] text-right font-sans"
                                      />
                                    </div>

                                    {/* Estimated Total */}
                                    {newSupplyQty && newSupplyPrice && (
                                      <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-850 flex justify-between items-center text-xs">
                                        <span className="font-mono text-emerald-400 font-bold">${(parseFloat(newSupplyQty) * parseFloat(newSupplyPrice)).toLocaleString()}</span>
                                        <span className="text-zinc-400">إجمالي تقديري لأمر الشراء:</span>
                                      </div>
                                    )}

                                    <button
                                      type="submit"
                                      disabled={isSubmittingSupplyOrder}
                                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      {isSubmittingSupplyOrder ? (
                                        <span>جاري إرسال أمر التوريد...</span>
                                      ) : (
                                        <>
                                          <Plus className="w-4 h-4" />
                                          <span>تسجيل وإرسال أمر الشراء للمورد</span>
                                        </>
                                      )}
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SUPPLY ORDERS MANAGEMENT TAB */}
                  {activeProductSubTab === 'supply_orders' && (
                    <div className="space-y-6 text-right animate-fadeIn">
                      {/* Top Smart Supply Header Action Banner */}
                      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-amber-900/40 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-950/80 border border-amber-700/60 rounded-xl text-amber-400 shrink-0 shadow-inner">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-zinc-100">سجل ونظام طلبات التوريد وإعادات الشحن</h3>
                              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md font-mono font-bold">
                                Smart Auto-Replenish Engine
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              إدارة التوريد المباشر مع خاصية <span className="text-amber-400 font-semibold">طلب التوريد الذكي التلقائي</span> بناءً على المستويات الدنيا للمخزون وموافقة المسؤول.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={handleOpenSmartSupplyModal}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-[#c59257] to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg hover:shadow-amber-900/40 transition-all cursor-pointer flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                            <span>طلب توريد ذكي ✨</span>
                          </button>
                        </div>
                      </div>

                      {/* Summary Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Pending */}
                        <div className="bg-zinc-950 border border-amber-900/40 p-4 rounded-xl flex items-center justify-between">
                          <div className="w-10 h-10 rounded-lg bg-amber-950/50 border border-amber-800/40 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">طلبات توريد معلقة</span>
                            <div className="text-xl font-mono text-amber-400 font-bold">
                              {supplyOrders.filter(o => o.status === 'pending').length} طلبية
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              بقيمة: ${supplyOrders.filter(o => o.status === 'pending').reduce((acc, o) => acc + (o.totalPrice || 0), 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* 2. Received / Completed */}
                        <div className="bg-zinc-950 border border-emerald-900/40 p-4 rounded-xl flex items-center justify-between">
                          <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">طلبات مستلمة ومكتملة</span>
                            <div className="text-xl font-mono text-emerald-400 font-bold">
                              {supplyOrders.filter(o => o.status === 'completed' || o.status === 'received').length} طلبية
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              إجمالي المستلم: ${supplyOrders.filter(o => o.status === 'completed' || o.status === 'received').reduce((acc, o) => acc + (o.totalPrice || 0), 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* 3. Cancelled */}
                        <div className="bg-zinc-950 border border-rose-900/40 p-4 rounded-xl flex items-center justify-between">
                          <div className="w-10 h-10 rounded-lg bg-rose-950/50 border border-rose-800/40 flex items-center justify-center shrink-0">
                            <XCircle className="w-5 h-5 text-rose-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">طلبات ملغاة</span>
                            <div className="text-xl font-mono text-rose-400 font-bold">
                              {supplyOrders.filter(o => o.status === 'cancelled').length} طلبية
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">ملغاة مسبقاً</div>
                          </div>
                        </div>

                        {/* 4. Total Orders & Quick Action */}
                        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                          <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">إجمالي سجل الشراء</span>
                            <div className="text-xl font-mono text-zinc-200 font-bold">
                              {supplyOrders.length} طلبية
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveProductSubTab('suppliers')}
                              className="text-[10px] text-[#c59257] hover:underline font-bold mt-0.5 flex items-center gap-1 cursor-pointer justify-end"
                            >
                              <span>لوحة الموردين والتسجيل</span>
                              <ArrowLeft className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Low-Stock Alert Section */}
                      {(() => {
                        const lowStockItems = materials.filter(m => (m.inventory?.quantity ?? 0) <= (m.minimumStock || 0));
                        if (lowStockItems.length === 0) return null;

                        return (
                          <div className="bg-gradient-to-r from-rose-950/30 via-zinc-950 to-amber-950/30 border border-rose-900/50 p-4 rounded-xl space-y-3 shadow-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-900/40 pb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                                <h4 className="text-xs font-bold text-rose-200">
                                  تنبيه حرج: يوجد ({lowStockItems.length}) خامات وصلت أو تجاوزت حد الطلب الأدنى
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                                <button
                                  type="button"
                                  onClick={handleOpenSmartSupplyModal}
                                  className="text-[11px] text-amber-300 hover:text-amber-100 font-bold bg-amber-950/80 border border-amber-700/80 px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm transition-all hover:border-amber-500"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  <span>توليد طلبات توريد ذكية لهذه الخامات ✨</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveProductSubTab('materials')}
                                  className="text-[11px] text-rose-300 hover:text-rose-100 font-bold bg-rose-950/60 border border-rose-800/60 px-3 py-1 rounded-lg cursor-pointer"
                                >
                                  عرض بالمستودع ←
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {lowStockItems.map(m => {
                                const qty = m.inventory?.quantity ?? 0;
                                const min = m.minimumStock || 0;
                                const activeOrder = supplyOrders.find(o => o.materialId === m.id && o.status === 'pending');

                                return (
                                  <div key={m.id} className="bg-zinc-900/80 border border-rose-900/40 p-3 rounded-lg space-y-2 text-right">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-zinc-400 font-mono">{m.category}</span>
                                      <span className="font-bold text-zinc-100 text-xs">{m.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-rose-400 font-mono font-bold">المتاح: {qty} {m.unit || 'وحدة'}</span>
                                      <span className="text-zinc-500 font-mono">الحد الأدنى: {min}</span>
                                    </div>
                                    <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-2">
                                      {activeOrder ? (
                                        <span className="text-[9px] text-amber-400 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded font-bold">
                                          طلب قيد الشحن #{activeOrder.id}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-rose-400 font-bold">يحتاج طلب توريد الآن</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleQuickSupplyRequest(m)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                                      >
                                        <Truck className="w-3 h-3" />
                                        <span>طلب توريد سريع</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Supply Orders Main Table Panel */}
                      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg space-y-4 p-4">
                        {/* Filter and Search Toolbar */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                          {/* Status Filter Tabs */}
                          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80">
                            <button
                              type="button"
                              onClick={() => setSupplyOrdersFilterStatus('all')}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                                supplyOrdersFilterStatus === 'all'
                                  ? 'bg-[#c59257] text-zinc-950'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              الكل ({supplyOrders.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupplyOrdersFilterStatus('pending')}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                supplyOrdersFilterStatus === 'pending'
                                  ? 'bg-amber-500 text-zinc-950'
                                  : 'text-zinc-400 hover:text-amber-400'
                              }`}
                            >
                              <span>⏳ معلقة</span>
                              <span className="font-mono text-[10px]">
                                ({supplyOrders.filter(o => o.status === 'pending').length})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupplyOrdersFilterStatus('completed')}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                supplyOrdersFilterStatus === 'completed'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-zinc-400 hover:text-emerald-400'
                              }`}
                            >
                              <span>✓ مستلمة</span>
                              <span className="font-mono text-[10px]">
                                ({supplyOrders.filter(o => o.status === 'completed' || o.status === 'received').length})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupplyOrdersFilterStatus('cancelled')}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                supplyOrdersFilterStatus === 'cancelled'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-zinc-400 hover:text-rose-400'
                              }`}
                            >
                              <span>✕ ملغاة</span>
                              <span className="font-mono text-[10px]">
                                ({supplyOrders.filter(o => o.status === 'cancelled').length})
                              </span>
                            </button>
                          </div>

                          {/* Search Bar */}
                          <div className="relative w-full md:w-72">
                            <input
                              type="text"
                              value={supplyOrdersSearch}
                              onChange={(e) => setSupplyOrdersSearch(e.target.value)}
                              placeholder="بحث باسم الخامة أو المورد..."
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#c59257]"
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5" />
                          </div>
                        </div>

                        {/* Supply Orders Table */}
                        {(() => {
                          const filtered = supplyOrders.filter(o => {
                            if (supplyOrdersFilterStatus === 'pending' && o.status !== 'pending') return false;
                            if (supplyOrdersFilterStatus === 'completed' && o.status !== 'completed' && o.status !== 'received') return false;
                            if (supplyOrdersFilterStatus === 'cancelled' && o.status !== 'cancelled') return false;

                            if (supplyOrdersSearch.trim()) {
                              const q = supplyOrdersSearch.toLowerCase();
                              const matName = (o.materialName || '').toLowerCase();
                              const supName = (o.supplierName || '').toLowerCase();
                              const idStr = (o.id || '').toLowerCase();
                              if (!matName.includes(q) && !supName.includes(q) && !idStr.includes(q)) return false;
                            }
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-12 text-center text-zinc-500 text-xs space-y-2">
                                <Truck className="w-10 h-10 text-zinc-700 mx-auto" />
                                <p>لا توجد طلبات توريد مطابقة للشروط الحالية.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-zinc-300 text-right border-collapse">
                                <thead>
                                  <tr className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-850">
                                    <th className="p-3">رمز الطلب</th>
                                    <th className="p-3">المورد والشركة</th>
                                    <th className="p-3">الخامة والتصنيف</th>
                                    <th className="p-3 text-center">الكمية وسعر الوحدة</th>
                                    <th className="p-3 text-center">الإجمالي ($)</th>
                                    <th className="p-3">تواريخ الطلب / التسليم</th>
                                    <th className="p-3 text-center">تعديل حالة الطلب مباشرة</th>
                                    <th className="p-3 text-center">العمليات التشغيلية</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                  {filtered.map((o, idx) => {
                                    const supplier = suppliers.find(s => s.id === o.supplierId);
                                    const isPending = o.status === 'pending';
                                    const isCompleted = o.status === 'completed' || o.status === 'received';

                                    return (
                                      <tr key={o.id} className={`hover:bg-zinc-900/40 transition-colors ${idx % 2 === 1 ? 'bg-zinc-900/20' : ''}`}>
                                        <td className="p-3 font-mono font-bold text-[#c59257]">{o.id}</td>
                                        <td className="p-3">
                                          <div className="font-bold text-zinc-200">{o.supplierName}</div>
                                          {supplier?.phone && <div className="text-[10px] font-mono text-zinc-500" style={{ direction: 'ltr' }}>{supplier.phone}</div>}
                                        </td>
                                        <td className="p-3">
                                          <div className="font-bold text-zinc-200">{o.materialName}</div>
                                          <span className="text-[10px] text-zinc-500 font-mono">{o.materialCategory || 'عام'}</span>
                                        </td>
                                        <td className="p-3 text-center font-mono">
                                          <div className="font-bold text-zinc-100">{o.quantity} قطعة</div>
                                          <div className="text-[10px] text-zinc-500">${o.unitPrice} / قطعة</div>
                                        </td>
                                        <td className="p-3 text-center font-mono font-bold text-emerald-400">
                                          ${o.totalPrice?.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right">
                                          <div className="text-[10px] text-zinc-400">طلب: {o.orderDate}</div>
                                          {isPending && <div className="text-[10px] text-amber-400 font-bold">متوقع: {o.expectedDeliveryDate}</div>}
                                          {isCompleted && <div className="text-[10px] text-emerald-400 font-bold">استلام: {o.actualDeliveryDate || o.expectedDeliveryDate}</div>}
                                        </td>
                                        <td className="p-3 text-center">
                                          <select
                                            value={isCompleted ? 'completed' : o.status}
                                            onChange={(e) => handleUpdateSupplyOrderStatus(o.id, e.target.value as any)}
                                            className={`px-2 py-1 rounded text-xs font-bold border bg-black cursor-pointer shadow-sm transition-all ${
                                              isPending
                                                ? 'text-amber-400 border-amber-700 bg-amber-950/30'
                                                : isCompleted
                                                  ? 'text-emerald-400 border-emerald-700 bg-emerald-950/30'
                                                  : 'text-rose-400 border-rose-700 bg-rose-950/30'
                                            }`}
                                          >
                                            <option value="pending">⏳ معلقة (Pending)</option>
                                            <option value="completed">✓ مستلمة (Received)</option>
                                            <option value="cancelled">✕ ملغاة (Cancelled)</option>
                                          </select>
                                        </td>
                                        <td className="p-3 text-center">
                                          <div className="flex gap-1.5 justify-center flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => handleDuplicateSupplyOrder(o)}
                                              className="px-2 py-1 bg-[#c59257]/20 hover:bg-[#c59257]/30 text-[#c59257] border border-[#c59257]/40 font-bold rounded text-[10px] cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                                              title="نسخ سريع لطلب التوريد بنفس الخامة والكمية والمورد كطلبية جديدة بضغطة زر"
                                            >
                                              <Copy className="w-3 h-3 text-[#c59257]" />
                                              <span>نسخ سريع</span>
                                            </button>
                                            {isPending && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateSupplyOrderStatus(o.id, 'completed')}
                                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] cursor-pointer flex items-center gap-1"
                                                >
                                                  <Check className="w-3 h-3" />
                                                  <span>استلام</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateSupplyOrderStatus(o.id, 'cancelled')}
                                                  className="px-2 py-1 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 rounded text-[10px] cursor-pointer"
                                                >
                                                  إلغاء
                                                </button>
                                              </>
                                            )}
                                            {!isPending && (
                                              <span className="text-[10px] text-zinc-500 font-mono">
                                                {isCompleted ? "مؤكد ومكتمل" : "ملغي"}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* LASER G-CODE COMPILER WORKSPACE */}
              {activeView === "gcode" && (
                <motion.div
                  key="gcode"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="p-6 space-y-6 font-sans overflow-y-auto h-full flex-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-5 h-5 text-rose-500" />
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100">مترجم أوامر ليزر CO2 الذكي (G-Code Compiler)</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">تحليل ملفات المتجهات DXF/SVG وربطها بالطلبات، وتحويل التصاميم للغة آلة حقيقية متوافقة مع ماكينات CNC</p>
                      </div>
                    </div>

                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-bold gap-1">
                      <button
                        onClick={() => setGcodeTabMode("vector")}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
                          gcodeTabMode === "vector"
                            ? "bg-rose-600 text-white shadow"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        رفع وتحليل متجهات DXF/SVG
                      </button>
                      <button
                        onClick={() => setGcodeTabMode("prompt")}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
                          gcodeTabMode === "prompt"
                            ? "bg-rose-600 text-white shadow"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        وصف نصي ومحاكاة آلي
                      </button>
                    </div>
                  </div>

                  {gcodeTabMode === "vector" ? (
                    <div className="space-y-6">
                      <VectorCompilerUploader
                        orders={orders}
                        laserSpeed={gcodeSpeed}
                        laserPower={gcodePower}
                        gcodeMaterial={gcodeMaterial}
                        onCompileVectorGcode={(data) => setGcodeResult(data)}
                        onTerminalLog={addTerminalLog}
                      />

                      {/* Display Compiled Output if available */}
                      {gcodeResult && (
                        <div className="border border-zinc-800 p-5 rounded-xl bg-[#09090c] space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                              <Play className="w-4 h-4 text-emerald-400" />
                              مخرجات كود G-Code البرمجي المترجم من المتجه
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Compiled CNC Code</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono block">وقت العمل التقريبي</span>
                              <strong className="text-sm font-mono text-zinc-200">{gcodeResult.estimatedTime}</strong>
                            </div>
                            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono block">إجمالي مسارات المتجه</span>
                              <strong className="text-sm font-mono text-indigo-400">{gcodeResult.totalPaths} vectors</strong>
                            </div>
                            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono block">كفاءة الأنبوب CO2</span>
                              <strong className="text-sm font-mono text-emerald-400">{gcodeResult.beamDutyCycle}</strong>
                            </div>
                            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono block">نسبة فاقد الخام كيرف</span>
                              <strong className="text-sm font-mono text-rose-400">{gcodeResult.materialLossPercent}%</strong>
                            </div>
                          </div>

                          <div className="border border-zinc-850 rounded bg-black p-3 font-mono text-[10.5px] text-zinc-300 max-h-[220px] overflow-y-auto">
                            <pre className="leading-5 whitespace-pre-wrap">{gcodeResult.gcodeSnippet}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Prompt input details */}
                      <div className="lg:col-span-5 border border-zinc-800 p-5 rounded-xl bg-zinc-950/40 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-zinc-400 font-bold block mb-1.5">اكتب تفاصيل الشكل الهندسي المطلوب قصه:</label>
                            <textarea
                              value={gcodePrompt}
                              onChange={(e) => setGcodePrompt(e.target.value)}
                              placeholder="مثال: قص لوحة دائرية بقطر 100ملم وحفر أحرف الاسم بمركز اللوحة بالخط الكوفي"
                              className="w-full h-24 bg-black border border-zinc-850 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-rose-500 font-sans"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-zinc-500 block mb-1">المادة الخام المستهدفة</label>
                              <select
                                value={gcodeMaterial}
                                onChange={(e) => setGcodeMaterial(e.target.value)}
                                className="w-full bg-black border border-zinc-850 rounded p-2 text-zinc-300"
                              >
                                <option value="Acrylic 3mm">أكريليك شفاف 3ملم</option>
                                <option value="Acrylic 5mm">أكريليك أسود 5ملم</option>
                                <option value="Beech Wood 4mm">خشب زان طبيعي 4ملم</option>
                                <option value="MDF 6mm">خشب مضغوط MDF 6ملم</option>
                                <option value="Leather 2mm">جلد طبيعي 2ملم</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-zinc-500 block mb-1">نسبة طاقة أنبوب CO2</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="20"
                                  max="100"
                                  value={gcodePower}
                                  onChange={(e) => setGcodePower(Number(e.target.value))}
                                  className="w-full accent-rose-500 cursor-pointer"
                                />
                                <span className="font-mono text-zinc-200 font-bold shrink-0">{gcodePower}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-xs">
                            <label className="text-zinc-500 block mb-1">سرعة تحرك رأس القص ({gcodeSpeed} mm/s)</label>
                            <input
                              type="range"
                              min="5"
                              max="150"
                              value={gcodeSpeed}
                              onChange={(e) => setGcodeSpeed(Number(e.target.value))}
                              className="w-full accent-rose-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-900 mt-4">
                          <button
                            onClick={handleCompileGCode}
                            disabled={isCompilingGCode || !gcodePrompt}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                              isCompilingGCode || !gcodePrompt
                                ? "bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed"
                                : "bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white shadow-lg shadow-rose-600/10 cursor-pointer"
                            }`}
                          >
                            {isCompilingGCode ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                جاري ترجمة المسارات وحساب الإحداثيات...
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                ترجمة التصميم وإخراج كود G-Code
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Path results preview & simulation */}
                      <div className="lg:col-span-7 flex flex-col justify-between border border-zinc-800 p-5 rounded-xl bg-[#09090c]">
                        {gcodeResult ? (
                          <div className="space-y-4 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
                              <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 uppercase font-mono block">وقت العمل التقريبي</span>
                                <strong className="text-sm font-mono text-zinc-200">{gcodeResult.estimatedTime}</strong>
                              </div>
                              <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 uppercase font-mono block">إجمالي مسارات المتجه</span>
                                <strong className="text-sm font-mono text-indigo-400">{gcodeResult.totalPaths} vectors</strong>
                              </div>
                              <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 uppercase font-mono block">كفاءة الأنبوب CO2</span>
                                <strong className="text-sm font-mono text-emerald-400">{gcodeResult.beamDutyCycle}</strong>
                              </div>
                              <div className="bg-zinc-900 p-2.5 rounded border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 uppercase font-mono block">نسبة فاقد الخام كيرف</span>
                                <strong className="text-sm font-mono text-rose-400">{gcodeResult.materialLossPercent}%</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-stretch mt-3">
                              {/* Raw GCode terminal snippet */}
                              <div className="flex flex-col border border-zinc-850 rounded bg-black p-3 font-mono text-[10.5px] text-zinc-300 max-h-[250px] overflow-y-auto">
                                <span className="text-[9px] text-zinc-600 border-b border-zinc-900 pb-1 mb-1 block uppercase">Compiled G-Code</span>
                                <pre className="leading-5 whitespace-pre-wrap">{gcodeResult.gcodeSnippet}</pre>
                              </div>

                              {/* SVG Simulation Graphic */}
                              <div className="border border-zinc-850 rounded bg-black/60 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                                <span className="text-[9px] text-zinc-600 absolute top-2 left-2 uppercase font-mono select-none">Vector simulator</span>
                                
                                {/* SVG graphic matching star/circle layout */}
                                <svg className="w-36 h-36 stroke-indigo-500 fill-none stroke-2" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="45" stroke="#4f46e5" strokeWidth="0.8" strokeDasharray="3,3" />
                                  <polygon points="50,15 62,38 88,40 68,57 74,83 50,70 26,83 32,57 12,40 38,38" stroke="#f43f5e" strokeWidth="1.2" className="animate-pulse" />
                                  <circle cx="50" cy="50" r="1.5" fill="#f43f5e" />
                                </svg>

                                <p className="text-[10px] text-zinc-500 text-center font-sans mt-3 leading-relaxed">
                                  {gcodeResult.calibrationAdvice}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-zinc-900 text-[10.5px] leading-relaxed text-zinc-400">
                              <strong>شرح الهيكل الهندسي للمسارات:</strong>
                              <p className="text-[10px] text-zinc-500 mt-1">{gcodeResult.gcodeExplanation}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 min-h-[300px]">
                            <Scissors className="w-12 h-12 text-zinc-800 mb-4 animate-bounce" />
                            <h4 className="text-sm font-bold text-zinc-400">مترجم الليزر بانتظار الإدخال</h4>
                            <p className="text-xs text-zinc-600 max-w-sm mt-1.5 leading-relaxed">
                              قم بكتابة التصميم المطلوب للقص في الجانب الأيسر، ثم اضغط على &quot;ترجمة التصميم&quot; لتوليد إحداثيات ماكينة الليزر فورياً ومحاكاة مسارات الحركة.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
    </>
  );
}

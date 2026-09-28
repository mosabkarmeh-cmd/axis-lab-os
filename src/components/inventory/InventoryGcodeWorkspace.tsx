// Generated decomposition boundary: InventoryGcodeWorkspace

export default function InventoryGcodeWorkspace({ ctx }: { ctx: Record<string, any> }) {
  const { AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, DollarSign, Download, FileCode, FolderOpen, GitCompare, GripVertical, History, Info, InventoryPage, Layers, MaterialCostCharts, Play, Plus, RefreshCw, Scissors, Search, Sparkles, Truck, VectorCompilerUploader, XCircle, Zap, activeProductSubTab, activeView, addTerminalLog, adjustQty, adjustReason, adjustType, aiClassificationResult, currentUser, deleteConfirmTarget, dragOverMaterialId, draggedMaterialId, editingMaterial, editingProduct, exchangeRate, findSuitableH, findSuitableMatId, findSuitableW, gcodeMaterial, gcodePower, gcodePrompt, gcodeResult, gcodeSpeed, gcodeTabMode, handleAiClassifyMaterial, handleCompileGCode, handleConsumeRemnant, handleCreateSupplyOrder, handleDeleteMaterial, handleDuplicateSupplyOrder, handleExportMaterialsCSV, handleFindSuitableRemnantSubmit, handleOpenSmartSupplyModal, handleQuickSupplyRequest, handleReorderMaterials, handleUpdateMaterialQualityStatus, handleUpdateSupplyOrderStatus, handleWasteRemnant, isAiClassifying, isCompilingGCode, isCurrencyConverterOpen, isSubmittingSmartSupply, isSubmittingSupplyOrder, matCategory, matColor, matHeight, matLocation, matMinStock, matName, matNotes, matPrice, matQualityStatus, matSubCategory, matSupplierId, matThickness, matUnit, matWidth, materialCategories, materialPriceSYP, materialPriceUSD, materialQualityFilter, materialSortBy, materialStats, materials, motion, newSupplyExpectedDate, newSupplyMaterialId, newSupplyNotes, newSupplyPrice, newSupplyQty, orders, pageTransition, pageVariants, priceComparisonMaterial, prodCategory, prodCode, prodDescription, prodName, prodPrice, prodStock, productFilter, productSearch, productionJobs, products, props, refreshInventoryData, remHeight, remLocation, remMatId, remQty, remWidth, remnants, searchQuery, selectedDashboardSupplierId, selectedMaterialFiles, selectedProductFiles, setActiveProductSubTab, setAdjustQty, setAdjustReason, setAdjustType, setAiClassificationResult, setDeleteConfirmTarget, setDragOverMaterialId, setDraggedMaterialId, setEditingMaterial, setEditingProduct, setFindSuitableH, setFindSuitableMatId, setFindSuitableW, setGcodeMaterial, setGcodePower, setGcodePrompt, setGcodeResult, setGcodeSpeed, setGcodeTabMode, setIsAiClassifying, setIsCurrencyConverterOpen, setIsSubmittingSmartSupply, setIsSubmittingSupplyOrder, setMatCategory, setMatColor, setMatHeight, setMatLocation, setMatMinStock, setMatName, setMatNotes, setMatPrice, setMatQualityStatus, setMatSubCategory, setMatSupplierId, setMatThickness, setMatUnit, setMatWidth, setMaterialQualityFilter, setMaterialSortBy, setMaterialStats, setMaterials, setNewSupplyExpectedDate, setNewSupplyMaterialId, setNewSupplyNotes, setNewSupplyPrice, setNewSupplyQty, setPriceComparisonMaterial, setProdCategory, setProdCode, setProdDescription, setProdName, setProdPrice, setProdStock, setProductFilter, setProductSearch, setRemHeight, setRemLocation, setRemMatId, setRemQty, setRemWidth, setRemnants, setSearchQuery, setSelectedDashboardSupplierId, setSelectedMaterialFiles, setSelectedProductFiles, setShowAddMaterial, setShowAddProduct, setShowAddRemnant, setShowAdjustStock, setShowSmartSupplyModal, setSmartSupplyItems, setSuitableRemnantResult, setSuppliers, setSupplyOrders, setSupplyOrdersFilterStatus, setSupplyOrdersSearch, showAddMaterial, showAddProduct, showAddRemnant, showAdjustStock, showSmartSupplyModal, smartSupplyItems, suitableRemnantResult, suppliers, supplyOrders, supplyOrdersFilterStatus, supplyOrdersSearch } = ctx;
  return (
    <>
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

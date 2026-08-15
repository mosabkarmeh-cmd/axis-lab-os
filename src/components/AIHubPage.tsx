import { motion } from "motion/react";
import { Brain, CheckCircle2, FileText, Plus, RefreshCw, Search, Send, Sparkles, Zap } from "lucide-react";

export default function AIHubPage(props: Record<string, any>) {
  const {
    activeAiTab,
    activeView,
    aiMemoryLayers,
    aiSearchQuery,
    aiSearchResults,
    calcAutoWaste,
    calcCutLengthCm,
    calcElectricityRate,
    calcEngraveAreaCm2,
    calcLaserPowerWatts,
    calcLengthCm,
    calcMachineId,
    calcMatId,
    calcOperatorRate,
    calcQuantity,
    calcResult,
    calcSetupFeeUSD,
    calcTargetProfitMargin,
    calcThicknessMm,
    calcTubeCostUSD,
    calcTubeLifespanHours,
    calcWasteOverridePercent,
    calcWidthCm,
    calcWorkType,
    chatInput,
    chatMessages,
    currentUser,
    machines,
    materials,
    fastResponseMode,
    fetchAiMemory,
    handleAiSearch,
    handleRunFastCalculator,
    handleRunFastParser,
    handleSelectCalcMachine,
    handleSelectCalcMaterial,
    handleSendChatMessage,
    isCalculatingFast,
    isLoadingAiMemory,
    isParsingFast,
    isSearchingAi,
    isSendingChatMessage,
    lastResponseLatencyMs,
    msg,
    orders,
    pageTransition,
    pageVariants,
    parserInputText,
    parserResult,
    rows,
    selectedMemoryLayer,
    setActiveAiTab,
    setAiSearchQuery,
    setCalcAutoWaste,
    setCalcCutLengthCm,
    setCalcElectricityRate,
    setCalcEngraveAreaCm2,
    setCalcLaserPowerWatts,
    setCalcLengthCm,
    setCalcOperatorRate,
    setCalcQuantity,
    setCalcSetupFeeUSD,
    setCalcTargetProfitMargin,
    setCalcThicknessMm,
    setCalcTubeCostUSD,
    setCalcTubeLifespanHours,
    setCalcWasteOverridePercent,
    setCalcWidthCm,
    setCalcWorkType,
    setChatInput,
    setFastResponseMode,
    setParserInputText,
    setSelectedMemoryLayer,
    setShowAddOrder,
    terminalLogs
  } = props;

  return (
    <>
              {true && (
                <motion.div
                  key="ai_hub"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="flex-1 flex flex-col h-full bg-[#0a0a0c] overflow-hidden"
                >
                  {/* Top Header Banner */}
                  <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 select-none">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-950/40 rounded-lg border border-indigo-500/30">
                        <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <span>مركز الذكاء الاصطناعي الذكي — AXIS AI</span>
                          <span className="bg-indigo-600/20 text-indigo-300 text-[9px] font-mono px-1.5 py-0.5 rounded border border-indigo-500/10">qwen2.5 & gemini-3.6-flash</span>
                          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            <span>استجابة فائقة السرعة ({lastResponseLatencyMs || 4}ms)</span>
                          </span>
                        </h2>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          نظام مدمج يتعلم دلالياً من نشاط الورشة، يقترح بارامترات القص، ويفحص دقة حسابات الفواتير وتوفر الخامات.
                        </p>
                      </div>
                    </div>

                    {/* AI Navigation Tabs */}
                    <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/80 self-start sm:self-center overflow-x-auto max-w-full">
                      <button
                        onClick={() => setActiveAiTab("chat")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          activeAiTab === "chat"
                            ? "bg-[#c59257] text-black"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        الرفيق الحواري الذكي
                      </button>
                      <button
                        onClick={() => setActiveAiTab("fast_calc")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          activeAiTab === "fast_calc"
                            ? "bg-[#c59257] text-black"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>الحاسبة والبارامترات الفورية</span>
                      </button>
                      <button
                        onClick={() => setActiveAiTab("parser")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          activeAiTab === "parser"
                            ? "bg-[#c59257] text-black"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <FileText className="w-3 h-3 text-emerald-400" />
                        <span>استخراج نصوص الطلبيات</span>
                      </button>
                      <button
                        onClick={() => setActiveAiTab("memory")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          activeAiTab === "memory"
                            ? "bg-[#c59257] text-black"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <span>الذاكرة المتعلمة (DeepBrain)</span>
                        <span className="text-[8px] bg-indigo-950/50 text-indigo-300 px-1 rounded font-mono">6L</span>
                      </button>
                      <button
                        onClick={() => setActiveAiTab("search")}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          activeAiTab === "search"
                            ? "bg-[#c59257] text-black"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        البحث الدلالي المتكامل
                      </button>
                    </div>
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 overflow-hidden">
                    {/* TAB 1: Conversational Chat Companion */}
                    {activeAiTab === "chat" && (
                      <div className="h-full flex flex-col md:flex-row overflow-hidden">
                        
                        {/* Right / Side Panel: Quick Prompts & Context Summary */}
                        <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-zinc-800 bg-zinc-950/40 p-4 overflow-y-auto shrink-0 space-y-4 font-sans">
                          
                          {/* Fast Response Mode Switcher */}
                          <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                                <Zap className={`w-3.5 h-3.5 ${fastResponseMode ? "text-amber-400 animate-pulse" : "text-zinc-500"}`} />
                                <span>وضع الرد اللحظي الفائق</span>
                              </span>
                              <button
                                onClick={() => setFastResponseMode(!fastResponseMode)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  fastResponseMode
                                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                                }`}
                              >
                                {fastResponseMode ? "مفعل ⚡" : "معطل"}
                              </button>
                            </div>
                            <p className="text-[9px] text-zinc-400 leading-snug">
                              {fastResponseMode
                                ? "استجابة استدلالية محددة خالية من التأخير عبر المحرك المحلي المحسّن (<10ms)."
                                : "استجابة ذكية توليدية هجينة عبر خادم الورشة وGemini 3.6 Flash."}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">💡 أسئلة وتوجيهات سريعة</span>
                            <div className="flex flex-col gap-1.5">
                              {[
                                "حلل كفاءة استهلاك خامات الأكريليك والأخشاب",
                                "اقترح إعدادات قص خشب MDF بسماكة 5 مم وبلاستيك",
                                "توقع مبيعات وأرباح ورشة AXIS LAB للشهر القادم",
                                "كيف يمكنني تحسين طابور الماكينات وزمن الإنتاج؟",
                                "هل أسعار المنتجات والطلبات تغطي تكلفة المواد حالياً؟",
                                "هل يوجد عملاء VIP لديهم ذمم مالية معلقة؟"
                              ].map((pText, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => {
                                    if (!isSendingChatMessage) {
                                      handleSendChatMessage(pText);
                                    }
                                  }}
                                  disabled={isSendingChatMessage}
                                  className="w-full text-right p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-[#c59257]/30 text-zinc-300 hover:text-white transition-all text-[11px] leading-snug cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {pText}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Dialect & Typos Fast Testing Section */}
                          <div className="bg-gradient-to-br from-amber-950/20 to-zinc-900 p-3 rounded-xl border border-amber-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                <span>🗣️ اختبر فهم العامية والأخطاء (رد فوري)</span>
                              </span>
                              <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">&lt;3ms</span>
                            </div>
                            <p className="text-[9px] text-zinc-400 leading-snug">
                              المحرك يفهم اللهجة السورية/الشامية ويستوعب الأخطاء المطبعية تلقائياً:
                            </p>
                            <div className="flex flex-col gap-1.5 pt-1">
                              {[
                                "شلون المعايرة لخشب المداف 5 ملي؟",
                                "قديه أرباحنا ومصاريفنا المتبقية بذمة الزبائن؟",
                                "ليش الماكينة مو عم تقص الأكربليك؟",
                                "بدي كشف حساب للزبون أبو صبحي",
                                "شو البواقي اللي عنا بالمستودع للألواح؟"
                              ].map((dText, dIdx) => (
                                <button
                                  key={dIdx}
                                  onClick={() => {
                                    if (!isSendingChatMessage) {
                                      handleSendChatMessage(dText);
                                    }
                                  }}
                                  disabled={isSendingChatMessage}
                                  className="w-full text-right p-2 rounded-lg bg-zinc-950 hover:bg-amber-950/40 border border-amber-900/40 hover:border-amber-500/50 text-amber-200/90 hover:text-amber-100 transition-all text-[10.5px] leading-snug cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-1"
                                >
                                  <span className="truncate">{dText}</span>
                                  <span className="text-[9px] text-amber-500/70 font-mono shrink-0">⚡</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850 space-y-2">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">📊 حالة الوعي السياقي الحالي</span>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                              يتلقى المساعد الذكي تحديثات فورية حول جداول **الحسابات والمبيعات**، **طابور الإنتاج**، و**تغيرات المخزون**. جميع حساباتك آمنة ومحلية.
                            </p>
                            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-center">
                              <div className="bg-zinc-950 p-1.5 rounded border border-zinc-900">
                                <span className="text-[8px] text-zinc-500 block">إيرادات الورشة</span>
                                <span className="text-xs font-mono font-bold text-emerald-400">${orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0).toFixed(1)}</span>
                              </div>
                              <div className="bg-zinc-950 p-1.5 rounded border border-zinc-900">
                                <span className="text-[8px] text-zinc-500 block">طلبات معلقة</span>
                                <span className="text-xs font-mono font-bold text-amber-500">{orders.filter(o => o.status === "new" || o.status === "in_progress").length}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Center / Chat Message Flow & Input */}
                        <div className="flex-1 flex flex-col bg-[#0b0b0d] overflow-hidden relative">
                          {/* Messages list */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {chatMessages.map((msg) => {
                              const isAi = msg.sender === "ai";
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex ${isAi ? "justify-start" : "justify-end"} items-start gap-2.5 max-w-4xl ${isAi ? "mr-0 ml-auto" : "ml-0 mr-auto"}`}
                                >
                                  {isAi && (
                                    <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0">
                                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                  )}
                                  <div className="space-y-1 max-w-[85%]">
                                    <div
                                      className={`rounded-xl p-3 text-xs leading-relaxed ${
                                        isAi
                                          ? "bg-zinc-900/90 text-zinc-200 border border-zinc-800/70"
                                          : "bg-indigo-600 text-white rounded-br-none"
                                      }`}
                                    >
                                      {/* Parse simple boldings or bullet lines */}
                                      {msg.text.split("\n").map((line, lIdx) => {
                                        let cleanedLine = line;
                                        let isBullet = false;
                                        if (line.trim().startsWith("•") || line.trim().startsWith("*") || line.trim().startsWith("-")) {
                                          isBullet = true;
                                          cleanedLine = line.replace(/^[•*\-\s]+/, "");
                                        }

                                        // Render bold markdown segments
                                        const parts = cleanedLine.split("**");
                                        const renderedLine = parts.map((part, pIdx) => {
                                          if (pIdx % 2 === 1) {
                                            return <strong key={pIdx} className="font-extrabold text-white">{part}</strong>;
                                          }
                                          return part;
                                        });

                                        if (isBullet) {
                                          return (
                                            <div key={lIdx} className="flex items-start gap-1.5 my-1 text-right">
                                              <span className="text-[#c59257] mt-1 shrink-0">•</span>
                                              <span>{renderedLine}</span>
                                            </div>
                                          );
                                        }

                                        return <p key={lIdx} className="my-1.5 text-right">{renderedLine}</p>;
                                      })}
                                    </div>
                                    <span className="text-[8px] text-zinc-500 font-mono block text-right px-1">
                                      {msg.time} {isAi ? "— مساعد AXIS AI" : ""}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {isSendingChatMessage && (
                              <div className="flex justify-start items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0 animate-pulse">
                                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-indigo-300 animate-pulse">
                                  جاري تحليل الاستفسار واستخلاص حقائق الورشة وتوليد رد ملائم...
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Chat Input form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendChatMessage();
                            }}
                            className="p-3 border-t border-zinc-800 bg-zinc-950 shrink-0 flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="اسأل المساعد عن: بارامترات ليزر معينة، حالة الخامات المخزنية، فحص أرباح..."
                              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2 px-3 text-xs text-white outline-none placeholder-zinc-500 text-right"
                              disabled={isSendingChatMessage}
                            />
                            <button
                              type="submit"
                              disabled={isSendingChatMessage || !chatInput.trim()}
                              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
                              title="إرسال"
                            >
                              <Send className="w-4 h-4 transform rotate-180" />
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Fast Calculator & Laser Settings Advisor */}
                    {activeAiTab === "fast_calc" && (
                      <div className="h-full overflow-y-auto p-6 bg-[#09090b] font-sans space-y-6">
                        <div className="max-w-5xl mx-auto space-y-6">
                          <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800/80 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-950/40 rounded-xl border border-amber-500/30">
                                  <Zap className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>حاسبة القص والتسعير الفورية وتوصيات بارامترات الليزر</span>
                                    <span className="bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">&lt;5ms Latency</span>
                                  </h3>
                                  <p className="text-[11px] text-zinc-400 mt-0.5">
                                    خوارزمية تسعير دقيقة تحسب استهلاك الكهرباء، إهلاك أنبوب CO2، أجور العمالة، ونسبة الهدر تلقائياً بناءً على مواصفات الماكينة والخامة.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                              {/* Machine Selector */}
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">الماكينة المستخدمة</label>
                                <select
                                  value={calcMachineId}
                                  onChange={(e) => handleSelectCalcMachine(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-medium cursor-pointer"
                                >
                                  <option value="">-- ماكينة ليزر CO2 عامة (100W) --</option>
                                  {machines.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.type || 'CO2 Laser'})</option>
                                  ))}
                                </select>
                              </div>

                              {/* Material Selector */}
                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">نوع الخامة</label>
                                <select
                                  value={calcMatId}
                                  onChange={(e) => handleSelectCalcMaterial(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-medium cursor-pointer"
                                >
                                  {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} (${m.price}/لوح)</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">السماكة (مم)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={calcThicknessMm}
                                  onChange={(e) => setCalcThicknessMm(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">نوع العملية</label>
                                <select
                                  value={calcWorkType}
                                  onChange={(e) => setCalcWorkType(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-medium cursor-pointer"
                                >
                                  <option value="cut_engrave">قص وحفر/نقش معاُ</option>
                                  <option value="cut_only">قص خارجي فقط</option>
                                  <option value="engrave_only">حفر ونقش سطحي فقط</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">أبعاد القطعة (سم)</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    value={calcWidthCm}
                                    onChange={(e) => setCalcWidthCm(Number(e.target.value))}
                                    placeholder="عرض"
                                    className="w-1/2 bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono text-center"
                                  />
                                  <span className="text-zinc-600 text-xs">x</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={calcLengthCm}
                                    onChange={(e) => setCalcLengthCm(Number(e.target.value))}
                                    placeholder="طول"
                                    className="w-1/2 bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono text-center"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">مسار القص الصافي (سم)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={calcCutLengthCm}
                                  onChange={(e) => setCalcCutLengthCm(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">مساحة النقش والحفر (سم²)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={calcEngraveAreaCm2}
                                  onChange={(e) => setCalcEngraveAreaCm2(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">الكمية المطلوبة (قطعة)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={calcQuantity}
                                  onChange={(e) => setCalcQuantity(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">قدرة أنبوب الليزر (واط)</label>
                                <input
                                  type="number"
                                  min="40"
                                  max="300"
                                  value={calcLaserPowerWatts}
                                  onChange={(e) => setCalcLaserPowerWatts(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">سعر استبدال أنبوب الليزر ($)</label>
                                <input
                                  type="number"
                                  min="50"
                                  value={calcTubeCostUSD}
                                  onChange={(e) => setCalcTubeCostUSD(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-rose-300 text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">العمر الافتراضي للأنبوب (ساعة)</label>
                                <input
                                  type="number"
                                  min="500"
                                  step="500"
                                  value={calcTubeLifespanHours}
                                  onChange={(e) => setCalcTubeLifespanHours(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">تعرفة الكهرباء ($ / ك.و.س)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={calcElectricityRate}
                                  onChange={(e) => setCalcElectricityRate(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-blue-300 text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">أجر الفني والعمالة ($ / ساعة)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={calcOperatorRate}
                                  onChange={(e) => setCalcOperatorRate(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-indigo-300 text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400">نسبة الهدر (%)</label>
                                  <button
                                    type="button"
                                    onClick={() => setCalcAutoWaste(!calcAutoWaste)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${calcAutoWaste ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-zinc-800 text-zinc-400'}`}
                                  >
                                    {calcAutoWaste ? "تلقائي 🤖" : "يدوي ✏️"}
                                  </button>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  disabled={calcAutoWaste}
                                  value={calcAutoWaste ? (calcResult?.financialBreakdown?.calculatedWastePercent ?? 10) : calcWasteOverridePercent}
                                  onChange={(e) => setCalcWasteOverridePercent(Number(e.target.value))}
                                  className={`w-full bg-zinc-900 border border-zinc-800 text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right ${calcAutoWaste ? 'opacity-60 text-amber-400' : 'text-white focus:border-amber-500'}`}
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">نسبة الربح المستهدفة (%)</label>
                                <input
                                  type="number"
                                  min="5"
                                  max="90"
                                  value={calcTargetProfitMargin}
                                  onChange={(e) => setCalcTargetProfitMargin(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-zinc-400 block mb-1.5">أجور التجهيز والمعايرة ($)</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={calcSetupFeeUSD}
                                  onChange={(e) => setCalcSetupFeeUSD(Number(e.target.value))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white text-xs rounded-xl p-2.5 outline-none font-mono font-bold text-right"
                                />
                              </div>

                              <div className="col-span-1 sm:col-span-2 md:col-span-4 flex items-end pt-2">
                                <button
                                  onClick={handleRunFastCalculator}
                                  disabled={isCalculatingFast}
                                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                                >
                                  {isCalculatingFast ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                                  ) : (
                                    <Zap className="w-4 h-4 text-black fill-black" />
                                  )}
                                  <span>⚡ حساب التكاليف التفصيلية والبارامترات فوراً</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Detailed Calculation Result Display */}
                          {calcResult && (
                            <div className="bg-zinc-950 p-5 rounded-2xl border border-amber-500/30 space-y-6 animate-fadeIn">
                              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                  <span className="text-xs font-bold text-amber-400">
                                    نتائج التسعير والتحليل المالي لـ {calcResult.materialName} ({calcResult.thicknessMm}مم)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                    {calcResult.machineName}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                    ⚡ الاستجابة: {lastResponseLatencyMs || 3}ms
                                  </span>
                                </div>
                              </div>

                              {/* Price and Profit Banner */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-right">
                                <div className="bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/40 col-span-1 md:col-span-2">
                                  <span className="text-[10px] font-bold text-amber-300 block mb-1">السعر المقترح للقطعة الواحدة</span>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-amber-400 font-mono">${calcResult.suggestedPriceUSD}</span>
                                    <span className="text-xs text-amber-500 font-mono">({calcResult.suggestedPriceSYP?.toLocaleString()} ل.س)</span>
                                  </div>
                                  <p className="text-[10px] text-amber-300/70 mt-1">يتضمن الأرباح ومصاريف الكهرباء، الأنبوب، العمالة، والهدر.</p>
                                </div>

                                <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/30">
                                  <span className="text-[10px] font-bold text-emerald-300 block mb-1">هامش وصافي الربح / قطعة</span>
                                  <span className="text-xl font-bold text-emerald-400 font-mono">${calcResult.financialBreakdown?.profitPerUnitUSD}</span>
                                  <span className="text-[10px] text-emerald-400/80 font-mono block mt-0.5">نسبة الربح: %{calcResult.financialBreakdown?.profitMarginPercent}</span>
                                </div>

                                <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                                  <span className="text-[10px] font-bold text-zinc-400 block mb-1">زمن تشغيل القطعة الواحدة</span>
                                  <span className="text-xl font-bold text-white font-mono">{calcResult.timeBreakdown?.totalTimeMinutes || calcResult.estimatedTimeMinutes} دقيقة</span>
                                  <span className="text-[10px] text-zinc-500 block mt-0.5">إجمالي الدفعة: {calcResult.batchTotals?.totalTimeMinutes} دقيقة</span>
                                </div>
                              </div>

                              {/* Visual Cost Structure Progress Bar */}
                              {calcResult.costBreakdown && (
                                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300">
                                    <span>مخطط توزيع عناصر التكلفة والربح للقطعة الواحدة</span>
                                    <span className="text-amber-400 font-mono">الإجمالي: ${calcResult.suggestedPriceUSD}</span>
                                  </div>
                                  
                                  {(() => {
                                    const raw = calcResult.costBreakdown.rawMaterialUSD || 0.1;
                                    const elec = calcResult.costBreakdown.electricityUSD || 0.05;
                                    const tube = calcResult.costBreakdown.tubeWearUSD || 0.05;
                                    const labor = calcResult.costBreakdown.laborUSD || 0.1;
                                    const setup = calcResult.costBreakdown.setupFeeUSD || 0.1;
                                    const profit = calcResult.costBreakdown.unitProfitMarginUSD || 0.5;
                                    const total = raw + elec + tube + labor + setup + profit;

                                    const pRaw = Math.max(3, (raw / total) * 100);
                                    const pElec = Math.max(3, (elec / total) * 100);
                                    const pTube = Math.max(3, (tube / total) * 100);
                                    const pLabor = Math.max(3, (labor / total) * 100);
                                    const pSetup = Math.max(3, (setup / total) * 100);
                                    const pProfit = Math.max(3, (profit / total) * 100);

                                    return (
                                      <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-zinc-800">
                                        <div style={{ width: `${pRaw}%` }} className="bg-emerald-500 h-full rounded-s" title={`الخامة والهدر: $${raw}`} />
                                        <div style={{ width: `${pElec}%` }} className="bg-blue-500 h-full" title={`الكهرباء: $${elec}`} />
                                        <div style={{ width: `${pTube}%` }} className="bg-rose-500 h-full" title={`أنبوب الليزر: $${tube}`} />
                                        <div style={{ width: `${pLabor}%` }} className="bg-indigo-500 h-full" title={`أجر الفني: $${labor}`} />
                                        <div style={{ width: `${pSetup}%` }} className="bg-purple-500 h-full" title={`التجهيز: $${setup}`} />
                                        <div style={{ width: `${pProfit}%` }} className="bg-amber-400 h-full rounded-e" title={`الربح: $${profit}`} />
                                      </div>
                                    );
                                  })()}

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-zinc-400 pt-1">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>خامة + هدر (${calcResult.costBreakdown.rawMaterialUSD})</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>كهرباء (${calcResult.costBreakdown.electricityUSD})</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>إهلاك الأنبوب (${calcResult.costBreakdown.tubeWearUSD})</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>أجر الفني (${calcResult.costBreakdown.laborUSD})</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>تجهيز (${calcResult.costBreakdown.setupFeeUSD})</span>
                                    <span className="flex items-center gap-1 font-bold text-amber-300"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>صافي الربح (${calcResult.costBreakdown.unitProfitMarginUSD})</span>
                                  </div>
                                </div>
                              )}

                              {/* Detailed Financial Breakdown Cards */}
                              {calcResult.financialBreakdown && (
                                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                    <span className="text-xs font-bold text-zinc-200">📊 تفكيك المعادلات الرياضية المباشرة للقطعة</span>
                                    <span className="text-[10px] text-zinc-400">إجمالي التكلفة المباشرة: <strong className="text-amber-400 font-mono">${calcResult.financialBreakdown.totalDirectCostUSD}</strong></span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-right">
                                    {/* Material & Waste */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-400">الخامة الأساسية والهدر</span>
                                        <span className="text-xs font-mono font-bold text-white">${calcResult.financialBreakdown.rawMaterialWithWasteUSD}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        {calcResult.formulas?.rawMaterial || `حساب نسبة المساحة المستهلكة مع إضافة عامل الهدر.`}
                                      </p>
                                      <span className="text-[9px] text-amber-400/90 block font-sans">
                                        {calcResult.formulas?.wasteExplanation || `استغلال اللوح: %${calcResult.financialBreakdown.sheetUtilizationPercent}`}
                                      </span>
                                    </div>

                                    {/* Electricity */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-400">استهلاك الكهرباء الكلي</span>
                                        <span className="text-xs font-mono font-bold text-white">${calcResult.financialBreakdown.electricityCostUSD}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        {calcResult.formulas?.electricity || `حساب كيلوواط الماكينة + الشيلر + المشفط × تعرفة الكيلوواط.`}
                                      </p>
                                    </div>

                                    {/* Tube Wear */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-rose-400">إهلاك أنبوب الليزر CO2</span>
                                        <span className="text-xs font-mono font-bold text-white">${calcResult.financialBreakdown.tubeDepreciationCostUSD}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        {calcResult.formulas?.tubeWear || `تكلفة ساعات التشغيل بناءً على سعر الأنبوب والعمر الافتراضي.`}
                                      </p>
                                    </div>

                                    {/* Technician Labor */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-indigo-400">أجور الفني والعمالة</span>
                                        <span className="text-xs font-mono font-bold text-white">${calcResult.financialBreakdown.laborCostUSD}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        {calcResult.formulas?.labor || `زمن التشغيل الفعلي + أوقات التجهيز والتنظيف × أجر الساعة.`}
                                      </p>
                                    </div>

                                    {/* Setup Fee */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-purple-400">رسوم التجهيز والمعايرة</span>
                                        <span className="text-xs font-mono font-bold text-white">${calcResult.financialBreakdown.setupFeePerUnitUSD}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        {calcResult.formulas?.setup || `توزيع أجور تجهيز الورشة والمعايرة على أجزاء الدفعة.`}
                                      </p>
                                    </div>

                                    {/* Sheet Utilization */}
                                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-amber-300">استغلال اللوح الكامل</span>
                                        <span className="text-xs font-mono font-bold text-amber-300">%{calcResult.financialBreakdown.sheetUtilizationPercent}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                                        نسبة مساحة القطع الصافية مقارنة بمساحة اللوح الإجمالية ({calcResult.sheetDimensionsCm}سم).
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Recommended Laser Settings & Technical Details */}
                              {calcResult.recommendedSettings && (
                                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                                  <div className="flex items-center justify-between border-b border-zinc-880 pb-2">
                                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                                      <span>⚙️ إعدادات تشغيل ماكينة الليزر الموصى بها</span>
                                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">قدرة الأنبوب: {calcResult.recommendedSettings.laserPowerWatts}W</span>
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs font-mono">
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">السرعة</span>
                                      <span className="font-bold text-white">{calcResult.recommendedSettings.speedMms} mm/s</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">القدرة</span>
                                      <span className="font-bold text-amber-400">{calcResult.recommendedSettings.powerPercent}%</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">عدد الممرات</span>
                                      <span className="font-bold text-purple-400">{calcResult.recommendedSettings.passCount} Pass</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">ضغط الهواء</span>
                                      <span className="font-bold text-indigo-300">{calcResult.recommendedSettings.airAssist}</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">العدسة البؤرية</span>
                                      <span className="font-bold text-emerald-400">{calcResult.recommendedSettings.lens}</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">التردد / DPI</span>
                                      <span className="font-bold text-amber-300">{calcResult.recommendedSettings.frequencyHzDpi}</span>
                                    </div>
                                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850">
                                      <span className="text-[8px] text-zinc-500 block">إزاحة البؤرة</span>
                                      <span className="font-bold text-blue-300">{calcResult.recommendedSettings.focalOffsetMm} mm</span>
                                    </div>
                                  </div>

                                  {calcResult.recommendedSettings.safetyNotes && (
                                    <div className="p-2.5 bg-amber-950/20 rounded-lg border border-amber-800/30 text-[11px] text-amber-300 flex items-start gap-2">
                                      <span className="text-amber-400 font-bold shrink-0">⚠️ ملاحظة السلامة والصيانة:</span>
                                      <span>{calcResult.recommendedSettings.safetyNotes}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Batch Summary Footer & Actions */}
                              {calcResult.batchTotals && (
                                <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-300 gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-400">إجمالي الدفعة ({calcResult.batchTotals.quantity} قطعة):</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span>التكلفة: <strong className="text-rose-400">${calcResult.financialBreakdown?.totalBatchCostUSD}</strong></span>
                                    <span>الإيراد: <strong className="text-amber-400">${calcResult.batchTotals.totalBatchRevenueUSD}</strong></span>
                                    <span>صافي أرباح الدفعة: <strong className="text-emerald-400 font-bold">${calcResult.batchTotals.totalBatchProfitUSD}</strong></span>
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => setShowAddOrder(true)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <span>+ اعتماد وإنشاء طلب جديد</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Natural Language Order Parser */}
                    {activeAiTab === "parser" && (
                      <div className="h-full overflow-y-auto p-6 bg-[#09090b] font-sans space-y-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                          <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-zinc-850 pb-3">
                              <div className="p-2 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                                <FileText className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>مستخرج نصوص الطلبات الذكي (Order Text Parser)</span>
                                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">NLP Fast Parser</span>
                                </h3>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  انسخ والفق أي رسالة طلبية شفهية من الزبون بالعامية أو الإملائيات الضعيفة، وسيقوم المحرك بتفكيك العميل، الأبعاد، الكمية والخامات والمكونات فوراً.
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <textarea
                                rows={4}
                                value={parserInputText}
                                onChange={(e) => setParserInputText(e.target.value)}
                                placeholder="مثال: طلب عاجل من أبو صبحي 10 قطع درع أكريليك شفاف 3مم قياس 30بـ20 سم تسليم عاجل مع حفر اسم الشعار وتغطية زوايا خشب..."
                                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-xs rounded-xl p-3 outline-none resize-none placeholder-zinc-500 text-right leading-relaxed font-semibold"
                              />

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                  <span className="text-zinc-500">أمثلة سريعة للنسخ:</span>
                                  <button
                                    onClick={() => setParserInputText("طلب عاجل من أبو صبحي 10 قطع درع أكريليك شفاف 3مم قياس 30بـ20 سم تسليم عاجل")}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 text-[9px] cursor-pointer"
                                  >
                                    طلب درع أكريليك
                                  </button>
                                  <button
                                    onClick={() => setParserInputText("علبة هدايا خشب زان كمية 5 قطع أبعاد 40 في 30 مع غطاء أكريليك شفاف وحفر ليزر")}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 text-[9px] cursor-pointer"
                                  >
                                    علبة خشب زان + أكريليك
                                  </button>
                                </div>

                                <button
                                  onClick={handleRunFastParser}
                                  disabled={isParsingFast || !parserInputText.trim()}
                                  className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                                >
                                  {isParsingFast ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Zap className="w-3.5 h-3.5" />
                                  )}
                                  <span>⚡ تفكيك وتحليل نص الطلب فوراً</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Parser Result Card */}
                          {parserResult && (
                            <div className="bg-zinc-950 p-5 rounded-2xl border border-emerald-500/30 space-y-5 animate-fadeIn">
                              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>البيانات والمكونات المستخرجة دلالياً</span>
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">معدل الثقة: %{Math.round((parserResult.confidence || 0.95) * 100)}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-right text-xs">
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">العميل المقترن</span>
                                  <span className="font-bold text-white">{parserResult.customerName}</span>
                                </div>
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">الخامة الرئيسة</span>
                                  <span className="font-bold text-amber-400">{parserResult.materialName} ({parserResult.thicknessMm}مم)</span>
                                </div>
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">الكمية</span>
                                  <span className="font-bold text-emerald-400 font-mono">{parserResult.quantity} قطعة</span>
                                </div>
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">الأبعاد (سم)</span>
                                  <span className="font-bold text-white font-mono">{parserResult.widthCm} x {parserResult.lengthCm}</span>
                                </div>
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">درجة الاستعجال</span>
                                  <span className={`font-bold ${parserResult.urgency === 'high' ? 'text-rose-400' : 'text-zinc-300'}`}>
                                    {parserResult.urgency === 'high' ? 'عاجل جداً 🔥' : 'عادي'}
                                  </span>
                                </div>
                                <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                                  <span className="text-[9px] text-zinc-500 block">السعر التقديري</span>
                                  <span className="font-bold text-amber-400 font-mono">${parserResult.estimatedPriceUSD}</span>
                                </div>
                              </div>

                              {/* Components Table */}
                              {parserResult.extractedComponents && parserResult.extractedComponents.length > 0 && (
                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">🧩 المكونات والأجزاء المفككة تلقائياً:</span>
                                  <div className="space-y-1.5">
                                    {parserResult.extractedComponents.map((comp: any, idx: number) => (
                                      <div key={idx} className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                                          <span className="font-bold text-white">{comp.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 font-mono text-[11px]">
                                          <span className="text-amber-400">{comp.material}</span>
                                          <span className="text-zinc-400">{comp.dimensions}</span>
                                          <span className="text-emerald-400 font-bold">{comp.qty}x</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-zinc-900 flex justify-end">
                                <button
                                  onClick={() => {
                                    setShowAddOrder(true);
                                    window.showAlert?.(`تم تحضير بيانات الطلب للعميل "${parserResult.customerName}". يرجى تأكيد الحفظ.`);
                                  }}
                                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>إنشاء طلب رسمي فوراً بهذه البيانات والمكونات</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 4: DeepBrain Learned Memory Layers */}
                    {activeAiTab === "memory" && (
                      <div className="h-full flex flex-col md:flex-row overflow-hidden font-sans">
                        {/* Left sidebar: Layers Selector */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-zinc-800 bg-zinc-950/60 p-4 overflow-y-auto shrink-0 flex flex-row md:flex-col gap-1 md:space-y-1">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5 hidden md:block">🧬 طبقات الذاكرة الـ 6</span>
                          {[
                            { id: "flash", label: "الذاكرة الوميضية", desc: "أنشطة تشغيلية لحظية", icon: "⚡" },
                            { id: "short_term", label: "الذاكرة قصيرة المدى", desc: "تنبيهات وملاحظات آنية", icon: "⏱️" },
                            { id: "long_term", label: "الذاكرة طويلة المدى", desc: "أنماط تراكمية مستقرة", icon: "🏛️" },
                            { id: "consolidated", label: "المعرفة الموحدة", desc: "تحليلات الأنماط المتقاطعة", icon: "🔮" },
                            { id: "archived", label: "المعرفة المؤرشفة", desc: "معايرات وقوانين الخامات", icon: "📦" },
                            { id: "meta_learning", label: "طبقة التعلم التلوي", desc: "توصيات استراتيجية للنمو", icon: "🧠" }
                          ].map((layer) => (
                            <button
                              key={layer.id}
                              onClick={() => setSelectedMemoryLayer(layer.id)}
                              className={`w-full text-right p-2.5 rounded-lg border flex flex-col transition-all cursor-pointer ${
                                selectedMemoryLayer === layer.id
                                  ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                                  : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                <span>{layer.icon}</span>
                                <span>{layer.label}</span>
                              </div>
                              <span className="text-[9px] text-zinc-500 text-right mt-0.5 block hidden md:block">{layer.desc}</span>
                            </button>
                          ))}
                        </div>

                        {/* Right Area: Memory Cards */}
                        <div className="flex-1 overflow-y-auto p-6 bg-[#09090b] space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                            <div>
                              <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                                <span>الحقائق والمعرفة المستخلصة دلالياً</span>
                                <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">تحديث مستمر</span>
                              </h3>
                              <p className="text-[10px] text-zinc-500 mt-1">
                                يقوم محرك DeepBrain في AXIS LAB بقراءة وتحديث هذه المؤشرات تلقائياً بناءً على العمليات.
                              </p>
                            </div>

                            <button
                              onClick={fetchAiMemory}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer font-bold"
                            >
                              <RefreshCw className={`w-3 h-3 ${isLoadingAiMemory ? "animate-spin" : ""}`} />
                              <span>تحديث الذاكرة</span>
                            </button>
                          </div>

                          {isLoadingAiMemory ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                              <RefreshCw className="w-6 h-6 text-[#c59257] animate-spin" />
                              <span className="text-xs text-zinc-400 font-bold animate-pulse">جاري سحب وتوحيد طبقات الذاكرة المتعلمة من قاعدة البيانات...</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {aiMemoryLayers && aiMemoryLayers[selectedMemoryLayer] ? (
                                aiMemoryLayers[selectedMemoryLayer].map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between hover:scale-[1.01] duration-200 space-y-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                                        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{item.type}</span>
                                      </div>
                                      <div className="bg-amber-950/20 text-[#c59257] border border-amber-500/10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                                        الأهمية: {item.importance.toFixed(1)} / 10
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-zinc-200 leading-relaxed text-right font-semibold">
                                      {item.fact}
                                    </p>

                                    <div className="pt-2 border-t border-zinc-900/60 flex items-center justify-between text-[9px] text-zinc-500">
                                      <span>نظام التعلم الذاتي</span>
                                      <span>{item.time}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 text-center py-12 text-zinc-600 text-xs font-light">
                                  لا توجد حقائق مسجلة في هذه الطبقة حالياً. بانتظار تجميع المزيد من الأنشطة التشغيلية في الورشة لتنشيط التعلم.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Semantic Intelligent Search */}
                    {activeAiTab === "search" && (
                      <div className="h-full flex flex-col p-6 overflow-y-auto space-y-5 font-sans bg-[#09090b]">
                        <div className="max-w-2xl mx-auto w-full text-center space-y-1">
                          <h3 className="text-xs font-bold text-[#c59257] uppercase tracking-wider">محرك البحث الدلالي الذكي</h3>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            ابحث في العملاء، طلبات القص، الخامات، الماكينات بلغة طبيعية. سنقوم بربط الاستعلام بالمطابقة الأفضل دلالياً.
                          </p>
                        </div>

                        {/* Search Bar Container */}
                        <div className="max-w-2xl mx-auto w-full">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAiSearch();
                            }}
                            className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800"
                          >
                            <input
                              type="text"
                              value={aiSearchQuery}
                              onChange={(e) => setAiSearchQuery(e.target.value)}
                              placeholder="أدخل استعلامك (مثال: 'أبو أحمد'، 'طلب معلق'، 'خشب'، 'أكريليك')..."
                              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-3.5 text-xs text-white outline-none placeholder-zinc-500 text-right font-semibold"
                            />
                            <button
                              type="submit"
                              disabled={isSearchingAi || !aiSearchQuery.trim()}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              {isSearchingAi ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                              <span>بحث ذكي</span>
                            </button>
                          </form>
                        </div>

                        {/* Search Results */}
                        <div className="max-w-2xl mx-auto w-full space-y-3">
                          {isSearchingAi ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                              <span className="text-xs text-zinc-400 animate-pulse">جاري مسح فهارس المتجهات والمطابقة الدلالية في جداول AXIS LAB...</span>
                            </div>
                          ) : aiSearchResults.length > 0 ? (
                            <div className="space-y-3">
                              <div className="text-[10px] text-zinc-500 font-bold px-1">
                                تم العثور على ({aiSearchResults.length}) نتائج مطابقة دلالياً مرتبة حسب درجة الصلة:
                              </div>

                              <div className="space-y-2.5">
                                {aiSearchResults.map((result, idx) => {
                                  // Determine type badge color
                                  let badgeStyle = "bg-indigo-950 text-indigo-300 border-indigo-500/20";
                                  if (result.type === "customer") badgeStyle = "bg-amber-950/20 text-[#c59257] border-amber-500/10";
                                  if (result.type === "material") badgeStyle = "bg-emerald-950/20 text-emerald-400 border-emerald-500/10";

                                  return (
                                    <div
                                      key={idx}
                                      className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-900/80 hover:border-zinc-800 transition-all flex flex-col space-y-2 hover:scale-[1.005] duration-150"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                                            {result.type === "customer" ? "زبون" : result.type === "order" ? "طلب قص ليزر" : "خامة / مستودع"}
                                          </span>
                                          <span className="text-xs font-bold text-white text-right">{result.title}</span>
                                        </div>

                                        <div className="text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                                          Relevance: {result.relevance}%
                                        </div>
                                      </div>

                                      <p className="text-[10px] text-zinc-400 text-right leading-relaxed">
                                        {result.subtitle}
                                      </p>

                                      <div className="pt-2 border-t border-zinc-900/80 flex items-start gap-1.5 text-[9px] text-indigo-400/95 leading-relaxed bg-indigo-950/5 p-2 rounded-lg border border-indigo-950/20">
                                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                                        <span className="text-right">
                                          <strong>تفسير الذكاء الاصطناعي:</strong> {result.reason}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : aiSearchQuery.trim() !== "" ? (
                            <div className="text-center py-12 text-zinc-600 text-xs font-light">
                              لا توجد نتائج مطابقة دلالياً لاستعلامك. جرب البحث عن خامات مثل "خشب" أو زبائن مثل "أحمد".
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* REPORTS & ANALYTICS VIEW */}

    </>
  );
}

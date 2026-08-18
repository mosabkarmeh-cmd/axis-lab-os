import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, BookOpen, HelpCircle, Keyboard, Filter, ChevronDown, ChevronUp, 
  ExternalLink, Play, Layers, AlertCircle, FileText, Settings, Sparkles, Award,
  Video, Youtube, Tv
} from "lucide-react";
import { HELP_TOPICS, FAQ_DATA, HelpTopic, FAQItem } from "../data/helpData";
import TaskTrainer from "./TaskTrainer";
import InteractiveVideoPlayer from "./InteractiveVideoPlayer";

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"articles" | "videos" | "faq" | "shortcuts" | "trainer">("articles");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(HELP_TOPICS[0]?.id || "login-and-access");
  const [inlinePlaying, setInlinePlaying] = useState<boolean>(false);
  const [useEmbeddedSimulator, setUseEmbeddedSimulator] = useState<boolean>(true);

  // Reset inline playing whenever selected article changes
  useEffect(() => {
    setInlinePlaying(false);
  }, [selectedArticleId]);

  // List of categories
  const categories = [
    { id: "all", name: "جميع المواضيع", icon: "📚" },
    { id: "basics", name: "الأساسيات", icon: "🔑" },
    { id: "customers", name: "العملاء", icon: "👥" },
    { id: "orders", name: "الطلبات", icon: "📄" },
    { id: "products", name: "مكتبة المنتجات", icon: "📦" },
    { id: "inventory", name: "المواد والمخزون", icon: "🪵" },
    { id: "production", name: "الإنتاج والماكينات", icon: "⚡" },
    { id: "accounting", name: "المحاسبة والفواتير", icon: "💰" },
    { id: "settings", name: "التثبيت والشبكة", icon: "🖥️" }
  ];

  // Filter topics based on search query and category
  const filteredTopics = useMemo(() => {
    return HELP_TOPICS.filter((topic) => {
      const matchesCategory = selectedCategory === "all" || topic.category === selectedCategory;
      const matchesSearch = 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (topic.steps && topic.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (topic.tips && topic.tips.some(tip => tip.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Keyboard Shortcuts List
  const KEYBOARD_SHORTCUTS = [
    { key: "Ctrl + K", desc: "فتح محرك البحث السريع والمستكشف اللحظي بالبرنامج" },
    { key: "Ctrl + N", desc: "فتح نافذة إنشاء طلب قص جديدة مباشرة" },
    { key: "Ctrl + P", desc: "توليد وطباعة الفاتورة الحالية أو أمر القص للماكينات" },
    { key: "Ctrl + S", desc: "حفظ التغييرات / البيانات في النافذة النشطة" },
    { key: "Esc", desc: "إغلاق النوافذ المنبثقة أو إلغاء الإجراء الحالي" },
    { key: "Ctrl + Alt + L", desc: "معايرة الماكينة المتصلة وتصفير الإحداثيات" },
    { key: "Ctrl + Shift + F", desc: "تصفية وفرز قائمة المخزون الحالية" }
  ];

  const selectedArticle = HELP_TOPICS.find(t => t.id === selectedArticleId);

  return (
    <div className="bg-zinc-950/60 rounded-xl border border-zinc-900 overflow-hidden font-sans">
      {/* Banner */}
      <div className="bg-[radial-gradient(ellipse_at_top,#c59257/15,transparent)] border-b border-zinc-900 p-6 md:p-8 text-center relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c59257]/5 rounded-full blur-3xl pointer-events-none" />
        <BookOpen className="w-10 h-10 text-[#c59257] mx-auto mb-3" />
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">مرجع الدعم والتدريب المدمج — AXIS LAB</h1>
        <p className="text-zinc-400 text-xs mt-1 max-w-xl mx-auto leading-relaxed">
          دليل التشغيل الكامل الموجه لعمال وماكينات الورشة لمساعدتك على إنجاز الطلبات، معايرة الليزر والمحاسبة بإنتاجية فائقة.
        </p>

        {/* Global Help Search Input */}
        <div className="max-w-md mx-auto mt-6 relative">
          <input
            id="help-search-input"
            type="text"
            placeholder="ابحث عن أي موضوع (مثال: قص الأكريليك، الفواتير، البقايا)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0e10] border border-zinc-800 focus:border-[#c59257] text-white placeholder-zinc-500 rounded-xl pr-10 pl-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#c59257] transition-all text-right"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute top-3.5 right-3.5 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute left-3 top-3.5 text-[10px] text-zinc-500 hover:text-white"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-zinc-900 bg-zinc-950/40 p-2 flex items-center justify-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("articles"); setSelectedArticleId(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "articles" ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> أدلة التشغيل التفصيلية
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "videos" ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Play className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" /> الفيديوهات التوضيحية والدروس
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "faq" ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> الأسئلة الشائعة FAQ
        </button>
        <button
          onClick={() => setActiveTab("shortcuts")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "shortcuts" ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" /> اختصارات لوحة المفاتيح
        </button>
        <button
          onClick={() => setActiveTab("trainer")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "trainer" ? "bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <Award className="w-3.5 h-3.5 animate-pulse" /> مدرب مهام ليزر التفاعلي
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 min-h-[400px]">
        
        {/* TAB 1: ARTICLES */}
        {activeTab === "articles" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left/Main Column: Selected Article or List */}
            <div className="md:col-span-8 order-2 md:order-1">
              {selectedArticle ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0b0c0e] p-6 rounded-xl border border-zinc-900 text-right space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <button 
                      onClick={() => setSelectedArticleId(null)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold rounded border border-zinc-850 cursor-pointer"
                    >
                      ← العودة لجميع المواضيع
                    </button>
                    <span className="text-[10px] px-2 py-0.5 bg-[#c59257]/15 text-[#c59257] rounded border border-[#c59257]/25 font-bold">
                      {categories.find(c => c.id === selectedArticle.category)?.name}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-white">{selectedArticle.title}</h2>
                  <p className="text-zinc-300 text-xs leading-relaxed">{selectedArticle.content}</p>

                  {/* Video Tutorial Player */}
                  {selectedArticle.youtubeId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
                        <span className="text-[10px] text-zinc-400">تفضيلات مشغل الدليل التعليمي:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setUseEmbeddedSimulator(true)}
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              useEmbeddedSimulator 
                                ? "bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/30" 
                                : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Tv className="w-3.5 h-3.5" />
                            محاكي تفاعلي مدمج (موصى به)
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseEmbeddedSimulator(false)}
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              !useEmbeddedSimulator 
                                ? "bg-red-950/40 text-red-400 border border-red-900/40" 
                                : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            بث يوتيوب (يتطلب إنترنت)
                          </button>
                        </div>
                      </div>

                      {useEmbeddedSimulator ? (
                        <InteractiveVideoPlayer topicId={selectedArticle.id} />
                      ) : (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-900 bg-black">
                          {inlinePlaying ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${selectedArticle.youtubeId}?autoplay=1&rel=0`}
                              title={selectedArticle.title}
                              className="w-full h-full absolute inset-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div 
                              onClick={() => setInlinePlaying(true)}
                              className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 cursor-pointer group bg-zinc-950/85 hover:bg-black/95 transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,146,87,0.12),transparent_70%)] pointer-events-none" />
                              <div className="p-4 bg-[#c59257]/10 border border-[#c59257]/20 group-hover:border-[#c59257]/50 group-hover:bg-[#c59257]/20 rounded-full text-[#c59257] mb-3 transition-all duration-300 transform group-hover:scale-110 shadow-lg shadow-[#c59257]/10">
                                <Play className="w-5 h-5 fill-[#c59257] translate-x-[1px]" />
                              </div>
                              <span className="text-xs font-bold text-zinc-200 group-hover:text-[#c59257] transition-colors">تشغيل الدليل المرئي السريع</span>
                              <span className="text-[9px] text-zinc-500 mt-1 max-w-xs">اضغط لتشغيل فيديو شرح تفاعلي حي ومباشر لطريقة العمل بالورشة</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedArticle.steps && (
                    <div className="space-y-2.5 mt-4">
                      <h3 className="text-xs font-bold text-[#c59257] flex items-center gap-1.5">
                        <span>📋</span> خطوات التنفيذ الموصى بها:
                      </h3>
                      <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-400 leading-normal">
                        {selectedArticle.steps.map((step, idx) => (
                          <li key={idx} className="pr-1"><span className="text-zinc-300">{step}</span></li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {selectedArticle.tips && (
                    <div className="bg-amber-950/15 border border-amber-900/35 p-3.5 rounded-lg space-y-1.5 mt-4">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> إرشادات لتفادي الهدر:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                        {selectedArticle.tips.map((tip, idx) => (
                          <li key={idx} className="pr-1">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {filteredTopics.length > 0 ? (
                    filteredTopics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedArticleId(topic.id)}
                        className="w-full text-right p-4 rounded-xl bg-[#090a0c] border border-zinc-900/80 hover:border-[#c59257]/30 hover:bg-[#0c0d10] transition-all duration-200 cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start w-full mb-1">
                          <span className="text-[10px] text-zinc-500 font-bold">
                            {categories.find(c => c.id === topic.category)?.name}
                          </span>
                          <h3 className="text-xs font-bold text-white hover:text-[#c59257] transition-colors">{topic.title}</h3>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">{topic.summary}</p>
                        <div className="flex justify-between items-center w-full mt-3 border-t border-zinc-900/50 pt-2 text-[10px] text-[#c59257] font-semibold">
                          <span>اقرأ التفاصيل ←</span>
                          <span className="text-zinc-600 font-mono text-[9px]">أدلة الورشة</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-[#090a0c] border border-zinc-900 rounded-xl">
                      <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">لم يتم العثور على أي أدلة تشغيل مطابقة لمعايير البحث.</p>
                      <button 
                        onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                        className="mt-3 text-[10px] text-[#c59257] font-bold underline"
                      >
                        إعادة تعيين مرشحات البحث
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Category Filter Selector */}
            <div className="md:col-span-4 order-1 md:order-2">
              <div className="bg-[#0b0c0e] p-4 rounded-xl border border-zinc-900 space-y-4">
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-bold">فئات الدليل</span>
                <div className="space-y-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.id); setSelectedArticleId(null); }}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        selectedCategory === cat.id 
                          ? "bg-[#c59257]/15 text-[#c59257] border border-[#c59257]/25" 
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-zinc-600">
                        {cat.id === "all" ? HELP_TOPICS.length : HELP_TOPICS.filter(t => t.category === cat.id).length}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-zinc-900 pt-4 text-center">
                  <span className="text-[9px] text-zinc-500 block mb-2">هل تحتاج لمعاينة تفاعلية حية؟</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("trainer")}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" /> تشغيل محاكي مدرب الليزر
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: VIDEOS GALLERY & PLAYBACK THEATER */}
        {activeTab === "videos" && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <Play className="w-8 h-8 text-[#c59257] fill-[#c59257]/15 mx-auto mb-2" />
              <h2 className="text-sm font-bold text-white">الدروس التعليمية والدليل المرئي بالورشة</h2>
              <p className="text-[10px] text-zinc-500 mt-1">تصفح الفيديوهات التوضيحية لجميع مهام نظام AXIS LAB لتتعلم كيفية تشغيل الماكينات واستغلال البقايا بدقة عالية.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Theater Player & Description */}
              <div className="lg:col-span-8 space-y-4">
                {(() => {
                  const currentVideoTopic = HELP_TOPICS.find(v => v.id === selectedVideoId) || HELP_TOPICS[0];
                  return (
                    <div className="bg-[#0b0c0e] rounded-xl border border-zinc-900 overflow-hidden shadow-2xl">
                      <div className="p-3 bg-zinc-900/60 border-b border-zinc-900/60 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">تفضيلات مشغل الدليل التعليمي:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setUseEmbeddedSimulator(true)}
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              useEmbeddedSimulator 
                                ? "bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/30" 
                                : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Tv className="w-3.5 h-3.5" />
                            محاكي تفاعلي مدمج (موصى به)
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseEmbeddedSimulator(false)}
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              !useEmbeddedSimulator 
                                ? "bg-red-950/40 text-red-400 border border-red-900/40" 
                                : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Youtube className="w-3.5 h-3.5" />
                            بث يوتيوب (يتطلب إنترنت)
                          </button>
                        </div>
                      </div>

                      <div className="p-3">
                        {useEmbeddedSimulator ? (
                          <InteractiveVideoPlayer topicId={currentVideoTopic.id} />
                        ) : (
                          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-850">
                            {currentVideoTopic.youtubeId ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${currentVideoTopic.youtubeId}?autoplay=1&rel=0&showinfo=0`}
                                title={currentVideoTopic.title}
                                className="w-full h-full absolute inset-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs">
                                عذراً، هذا الفيديو غير متوفر حالياً
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Video details metadata */}
                      <div className="p-5 text-right space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] px-2 py-0.5 bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20 rounded font-bold uppercase tracking-wider">
                            {categories.find(c => c.id === currentVideoTopic.category)?.name}
                          </span>
                          <h3 className="text-sm font-bold text-white">{currentVideoTopic.title}</h3>
                        </div>
                        <p className="text-zinc-400 text-xs leading-relaxed">{currentVideoTopic.summary}</p>
                        
                        {currentVideoTopic.steps && (
                          <div className="border-t border-zinc-900/80 pt-4 space-y-2">
                            <h4 className="text-[11px] font-bold text-[#c59257] flex items-center gap-1">
                              <span>📍</span> خطوات الشرح المطبقة في الفيديو:
                            </h4>
                            <ul className="space-y-1.5 text-[11px] text-zinc-400">
                              {currentVideoTopic.steps.map((step, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1.5 justify-end text-right">
                                  <span className="text-right w-full">{step}</span>
                                  <span className="text-[#c59257] font-mono shrink-0 font-bold">[{sIdx + 1}]</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Interactive Playlist Sidebar */}
              <div className="lg:col-span-4 bg-[#0a0a0c] p-4 rounded-xl border border-zinc-900 space-y-3 max-h-[550px] overflow-y-auto">
                <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-bold block pb-2 border-b border-zinc-900">قائمة دروس الورشة</span>
                <div className="space-y-2">
                  {HELP_TOPICS.filter(t => t.youtubeId).map((topic) => {
                    const isActive = topic.id === selectedVideoId;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedVideoId(topic.id)}
                        className={`w-full text-right p-2.5 rounded-lg text-xs transition-all flex gap-3 cursor-pointer border ${
                          isActive 
                            ? "bg-[#c59257]/15 border-[#c59257]/30 text-[#c59257]" 
                            : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {/* Thumbnail or Video indicator */}
                        <div className="w-20 aspect-video rounded bg-black border border-zinc-800 shrink-0 relative overflow-hidden group">
                          <img
                            src={`https://img.youtube.com/vi/${topic.youtubeId}/hqdefault.jpg`}
                            alt={topic.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play className={`w-3.5 h-3.5 ${isActive ? "text-[#c59257] fill-[#c59257]" : "text-white fill-white"} opacity-80`} />
                          </div>
                        </div>

                        {/* Title and Category */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <h4 className="font-bold text-[11px] truncate leading-tight text-right text-zinc-200">{topic.title}</h4>
                          <span className="text-[9px] text-zinc-500 font-medium text-right block">
                            {categories.find(c => c.id === topic.category)?.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FAQ ACCORDION */}
        {activeTab === "faq" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <HelpCircle className="w-8 h-8 text-[#c59257] mx-auto mb-2" />
              <h2 className="text-sm font-bold text-white">الأسئلة الشائعة من عمال وموظفي الورشة</h2>
              <p className="text-[10px] text-zinc-500 mt-1">مجموعة من الإجابات الفورية على أكثر المشاكل والأسئلة تكراراً في تشغيل AXIS LAB.</p>
            </div>

            <div className="space-y-3">
              {FAQ_DATA.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="bg-[#090a0c] border border-zinc-900 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-right px-4 py-3.5 flex items-center justify-between text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-900/40 transition-colors cursor-pointer"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4 text-[#c59257]" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-1.5 py-0.5 rounded-full">{faq.category}</span>
                        <span>{faq.question}</span>
                      </div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-zinc-900 bg-zinc-950/40 px-4 py-3 text-right"
                        >
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: KEYBOARD SHORTCUTS */}
        {activeTab === "shortcuts" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <Keyboard className="w-8 h-8 text-[#c59257] mx-auto mb-2" />
              <h2 className="text-sm font-bold text-white">اختصارات لوحة المفاتيح والتحكم السريع</h2>
              <p className="text-[10px] text-zinc-500 mt-1">استخدم الاختصارات للتنقل بسرعة وإنجاز مهام الورشة وتعديل إعدادات الماكينات.</p>
            </div>

            <div className="bg-[#090a0c] border border-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-900">
              {KEYBOARD_SHORTCUTS.map((sc, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-zinc-900/30 transition-all">
                  <span className="text-[10px] text-zinc-400 text-left">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[#c59257] font-bold text-[10px] font-mono rounded-lg shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: INTERACTIVE TASK TRAINER */}
        {activeTab === "trainer" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TaskTrainer />
          </motion.div>
        )}

      </div>
    </div>
  );
}

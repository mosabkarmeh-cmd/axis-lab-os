import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, 
  Cpu, User, FileText, Sparkles, Layers, Settings, 
  Activity, CheckCircle2, DollarSign, Flame, Clock, 
  UserCheck, Plus, ShoppingCart, HelpCircle, ArrowRight, ArrowLeft
} from "lucide-react";

interface InteractiveVideoPlayerProps {
  topicId: string;
  onStepComplete?: (stepIndex: number) => void;
}

export default function InteractiveVideoPlayer({ topicId, onStepComplete }: InteractiveVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(30); // 30 seconds default
  
  // Controls reference for intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define video stages per topic
  const TOPIC_STAGES: Record<string, { title: string; desc: string; duration: number }[]> = {
    "login-and-access": [
      { title: "إدخال بيانات المسؤول", desc: "محاكاة كتابة البريد الإلكتروني وكلمة المرور المشفرة", duration: 8 },
      { title: "التحقق من التراخيص والأمن", desc: "التحقق من مفتاح الورشة والجدار الناري المحلي", duration: 8 },
      { title: "منح إذن الدخول", desc: "فتح القفل وتوجيه المستخدم للوحة الإدارة بنجاح", duration: 10 },
    ],
    "dashboard-overview": [
      { title: "تحميل المؤشرات الفورية", desc: "تحديث أرباح اليوم والمبيعات وقيمة المخزون الإجمالية", duration: 8 },
      { title: "طابور ماكينات الليزر", desc: "مراقبة نشاط وحالة ماكينات CO2 وماكينات الفايبر ليزر", duration: 10 },
      { title: "تنبيهات انخفاض المواد", desc: "مستشعرات المخازن تطلق تحذيراً فورياً للمواد المنخفضة", duration: 8 },
    ],
    "customer-add": [
      { title: "فتح نموذج الإضافة السريع", desc: "النقر على إضافة عميل وتجهيز حقول الإدخال الذكية", duration: 8 },
      { title: "كتابة بيانات الاتصال والتفضيلات", desc: "إدخال الاسم والهاتف والشركة وملاحظات القص الخاصة", duration: 10 },
      { title: "الحفظ والأرشفة الأمنية", desc: "إصدار المعرف الفريد وتأمين البيانات الحساسة فورياً", duration: 8 },
    ],
    "order-create": [
      { title: "اختيار العميل وتحديد الأولوية", desc: "ربط العميل وضبط أولوية التسليم (مستعجل جداً ⚠️)", duration: 8 },
      { title: "إدخال مواصفات لوح القص", desc: "تحديد الطول والعرض بالمليمتر ونوع الأكريليك/الخشب", duration: 10 },
      { title: "مستشار التسعير وحساب التكلفة", desc: "توليد السعر العادل تلقائياً وإرفاق ملف DXF الهندسي", duration: 10 },
    ],
    "product-versions": [
      { title: "اختيار المنتج من المكتبة", desc: "استعراض الهدايا والعلب وسماكات المواد المتوفرة", duration: 8 },
      { title: "معاينة الملف الهندسي DXF", desc: "قراءة مسارات القص ونقاط التماس لليزر دورياً", duration: 10 },
      { title: "تعديل وحفظ إصدار جديد v2.0", desc: "تحديث المسارات لتقليل زمن القص وحفظ الأرشيف لجميع العمال", duration: 10 },
    ],
    "inventory-remnants": [
      { title: "حساب المساحة المستهلكة", desc: "تحديد الجزء المقصوص من لوح الأكريليك الأساسي للعميل", duration: 8 },
      { title: "اكتشاف وتسجيل قطعة البقايا", desc: "تحديد أبعاد الجزء المتبقي وتخزينه كـ 'قطعة بقايا' ذكية", duration: 10 },
      { title: "الاستدعاء التلقائي والمطابقة", desc: "محرك الذكاء الاصطناعي يقترح القطعة لطلب مستقبلي لتفادي الهدر", duration: 10 },
    ],
    "production-laser-queue": [
      { title: "توزيع المهام على الماكينات", desc: "سحب طلب القص وتوجيهه لماكينة الأكريليك الشاغرة", duration: 8 },
      { title: "محاكاة حركة رأس الليزر", desc: "انطلاق شعاع الليزر CO2 لقص التصميم بدقة 100% وتطاير الشرر", duration: 12 },
      { title: "فحص الجودة والتشطيب", desc: "إنهاء المهمة ونقلها إلى خط التجميع والجاهزية للتسليم", duration: 8 },
    ],
    "accounting-invoices": [
      { title: "توليد الفاتورة التلقائية", desc: "سحب تكلفة المواد والقص وتطبيق نسب الضرائب والخصم", duration: 8 },
      { title: "سند القبض والدفع الجزئي", desc: "تسجيل دفعة مقدمة (العربون) وتحديث المتبقي في ذمة العميل", duration: 10 },
      { title: "الختم الذهبي وتصدير الحسابات", desc: "تطبيق الختم المعتمد وتجهيز ملف التصدير للمحاسب القانوني", duration: 10 },
    ]
  };

  const stages = TOPIC_STAGES[topicId] || TOPIC_STAGES["login-and-access"];
  const totalDuration = stages.reduce((acc, stage) => acc + stage.duration, 0);

  // Calculate current stage index based on progress time
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < stages.length; i++) {
      accumulatedTime += stages[i].duration;
      if (currentTime <= accumulatedTime) {
        setCurrentStepIndex(i);
        break;
      }
    }
  }, [currentTime, stages]);

  // Handle timeline progression
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            return 0; // Loop or stop
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Handle manual tab/topic changes
  useEffect(() => {
    setCurrentTime(0);
    setCurrentStepIndex(0);
    setIsPlaying(true);
  }, [topicId]);

  const percentage = (currentTime / totalDuration) * 100;

  // Render simulated screens based on step
  const renderSimulatedCanvas = () => {
    switch (topicId) {
      case "login-and-access":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <AnimatePresence mode="wait">
              {currentStepIndex === 0 && (
                <motion.div 
                  key="step0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-xs bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-right space-y-3 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <span className="text-[10px] text-zinc-500 font-mono">SECURE LOGIN</span>
                    <span className="text-xs font-bold text-white">تسجيل الدخول</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] text-zinc-400 block mb-1">البريد الإلكتروني للورشة</span>
                      <div className="bg-black/40 border border-zinc-800 p-2 rounded text-left font-mono text-[10px] text-zinc-200">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 3 }}
                          className="inline-block overflow-hidden whitespace-nowrap"
                        >
                          admin@axislab.com
                        </motion.span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block mb-1">كلمة المرور الشخصية</span>
                      <div className="bg-black/40 border border-zinc-800 p-2 rounded text-left font-mono text-[10px] text-zinc-300">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 3, duration: 2 }}
                          className="inline-block overflow-hidden whitespace-nowrap font-bold"
                        >
                          ••••••••••••
                        </motion.span>
                      </div>
                    </div>
                  </div>
                  <motion.button 
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-full py-2 bg-[#c59257]/15 hover:bg-[#c59257]/35 border border-[#c59257]/30 text-[#c59257] font-bold rounded text-[10px] transition-colors"
                  >
                    جاري التحقق والمصادقة...
                  </motion.button>
                </motion.div>
              )}

              {currentStepIndex === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-xs bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-xl text-center space-y-4"
                >
                  <Activity className="w-8 h-8 text-[#c59257] animate-pulse mx-auto" />
                  <span className="text-xs font-bold text-zinc-200 block">فحص جدار الحماية المحلي للورشة</span>
                  <div className="space-y-1 text-[9px] text-zinc-500 font-mono">
                    <div>[API] CONTACTING LOCAL DB SERVER... OK</div>
                    <div>[AUTH] COMPARING CRYPTO KEY... VALID</div>
                    <div>[JWT] COPPING WEB TOKEN... OK</div>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: "100%" }} 
                      transition={{ duration: 7 }} 
                      className="bg-emerald-500 h-full" 
                    />
                  </div>
                </motion.div>
              )}

              {currentStepIndex === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3"
                >
                  <div className="w-14 h-14 bg-emerald-950/40 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                    <CheckCircle2 className="w-8 h-8 animate-bounce" />
                  </div>
                  <h4 className="text-sm font-bold text-white">مرحباً بك! تم منح إذن الدخول بنجاح</h4>
                  <p className="text-[10px] text-zinc-400 max-w-xs mx-auto">دورك الحالي: <span className="text-[#c59257] font-bold">المدير العام (Admin)</span>. تم تمكين كافة لوحات التحكم والمخازن والصلاحيات.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "dashboard-overview":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right font-sans">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
              <span className="text-[9px] font-mono text-zinc-600">LIVE MONITORING</span>
              <span className="text-xs font-bold text-[#c59257] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                لوحة المراقبة الفورية للورشة
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 text-right">
                <span className="text-[9px] text-zinc-500 block">طلبات اليوم المكتملة</span>
                <motion.span 
                  animate={{ textShadow: ["0 0 0px rgba(197,146,87,0)", "0 0 8px rgba(197,146,87,0.4)", "0 0 0px rgba(197,146,87,0)"] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-sm font-extrabold text-white font-mono"
                >
                  {currentStepIndex >= 0 ? "14 طلب" : "0"}
                </motion.span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 text-right">
                <span className="text-[9px] text-zinc-500 block">إيرادات الخزنة اللحظية</span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono block">
                  {currentStepIndex >= 0 ? "+4,850 ل.س" : "0"}
                </span>
              </div>
              <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 text-right relative overflow-hidden">
                <span className="text-[9px] text-zinc-500 block">التنبيهات النشطة</span>
                <span className="text-xs font-extrabold text-rose-500 font-mono block">
                  {currentStepIndex === 2 ? "⚠️ 3 تنبيهات" : "0 تنبيهات"}
                </span>
                {currentStepIndex === 2 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: [0.1, 0.3, 0.1] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute inset-0 bg-rose-950/20 pointer-events-none" 
                  />
                )}
              </div>
            </div>

            <div className="mt-3 bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 flex-1 flex flex-col justify-center space-y-2">
              <span className="text-[9px] text-zinc-400 block font-bold">نشاط طابور الماكينات المتصلة بالإنترنت:</span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] bg-black/40 p-1.5 rounded border border-zinc-850">
                  <span className="text-emerald-500 font-mono font-bold">85% قيد القص</span>
                  <span className="text-zinc-300">ماكينة الليزر CO2 #1 (ألواح أكريليك)</span>
                </div>
                <div className="flex items-center justify-between text-[10px] bg-black/40 p-1.5 rounded border border-zinc-850">
                  <span className="text-[#c59257] font-mono font-bold">جاهزة للعمل (Idle)</span>
                  <span className="text-zinc-300">ماكينة الحفر فايبر ليزر #2 (نحاس ومعادن)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case "customer-add":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono">CUSTOMER REGISTRATION</span>
              <span className="text-xs font-bold text-white">محاكاة إضافة عميل مميز</span>
            </div>

            <div className="space-y-2 my-2 flex-1 flex flex-col justify-center max-w-xs mx-auto w-full">
              <div className="space-y-1 text-right">
                <span className="text-[9px] text-zinc-400 block">الاسم الكريم</span>
                <div className="bg-[#0b0c0e] border border-zinc-800 p-2 rounded text-xs text-zinc-200">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 4 }}
                    className="inline-block overflow-hidden whitespace-nowrap"
                  >
                    {currentStepIndex >= 1 ? "أبو أحمد الحمصي (شركة الشام الفنية)" : ""}
                  </motion.span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[9px] text-zinc-400 block">رقم الواتساب الفوري</span>
                <div className="bg-[#0b0c0e] border border-zinc-800 p-2 rounded text-xs text-zinc-300 text-left font-mono" dir="ltr">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 3, duration: 3 }}
                    className="inline-block overflow-hidden whitespace-nowrap"
                  >
                    {currentStepIndex >= 1 ? "+963 933 456 789" : ""}
                  </motion.span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[9px] text-zinc-400 block">ملاحظات وخصائص القص المفضلة</span>
                <div className="bg-[#0b0c0e]/60 border border-zinc-850 p-1.5 rounded text-[10px] text-zinc-400">
                  {currentStepIndex >= 1 ? "يفضل الأكريليك الذهبي اللامع 3 ملم، ويطلب تسليماً مستعجلاً دوماً." : "قيد الإدخال..."}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {currentStepIndex === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  className="bg-emerald-950/50 border border-emerald-900/30 p-2 rounded-lg text-center text-emerald-400 text-[10px] font-bold"
                >
                  ✓ تم إصدار الكود الموحد: <span className="font-mono underline">CUST-382</span> وإدراجه في لوحة المحاسبة!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "order-create":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono">ORDER CONFIGURATOR</span>
              <span className="text-xs font-bold text-white">مفصل ومعاير الطلبات والقص</span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center flex-1 my-2">
              {/* Graphic container showing measured block */}
              <div className="bg-black border border-zinc-850 rounded-lg aspect-square relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-1 left-1 text-[8px] text-zinc-600 font-mono">MATERIAL CANVAS</div>
                
                {currentStepIndex >= 1 ? (
                  <motion.div 
                    initial={{ width: 0, height: 0 }}
                    animate={{ width: "70%", height: "50%" }}
                    transition={{ duration: 4 }}
                    className="bg-[#c59257]/10 border-2 border-[#c59257] rounded relative flex items-center justify-center"
                  >
                    <span className="text-[10px] text-[#c59257] font-mono font-bold">500 × 300 mm</span>
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-red-500 rounded-full" />
                  </motion.div>
                ) : (
                  <span className="text-[10px] text-zinc-700">تحديد الخامة أولاً...</span>
                )}
              </div>

              {/* Specs metadata */}
              <div className="space-y-2">
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 block">نوع الخامة المطلوب قصها</span>
                  <span className="text-xs font-bold text-white">أكريليك ذهبي مرآة (سماكة 3 ملم)</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 block">الكمية الإجمالية المطلوبة</span>
                  <span className="text-xs font-bold text-white font-mono">15 قطعة دقيقة</span>
                </div>
                
                <AnimatePresence>
                  {currentStepIndex === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#c59257]/10 border border-[#c59257]/20 p-2 rounded"
                    >
                      <span className="text-[9px] text-[#c59257] block font-bold">سعر التكلفة المقدر:</span>
                      <span className="text-xs font-extrabold text-[#c59257] font-mono">45,250 ل.س</span>
                      <span className="text-[8px] text-zinc-500 block mt-0.5">شاملاً ضريبة القيمة وهدر اللوح</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 text-center">
              * يقوم محرك التسعير بمزامنة أسعار المواد الخام من السوق السورية لحظياً وتحديث الهامش.
            </div>
          </div>
        );

      case "product-versions":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono">CAD LIBRARY & VERSIONS</span>
              <span className="text-xs font-bold text-[#c59257]">مستعرض المخططات وإصدارات التصميم</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 items-center flex-1 my-2">
              {/* Product Card */}
              <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-lg text-right h-full flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 block">اسم المنتج الفني</span>
                  <span className="text-[11px] font-bold text-white block">علبة مناديل خشبية</span>
                </div>
                <div className="bg-black/50 p-1 rounded border border-zinc-850 text-center mt-2">
                  <span className="text-[9px] text-zinc-500 block">إصدار خط الإنتاج</span>
                  <motion.span 
                    key={currentStepIndex}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`text-xs font-mono font-bold block ${currentStepIndex === 2 ? "text-amber-500" : "text-zinc-400"}`}
                  >
                    {currentStepIndex === 2 ? "v2.0 (التصميم الأسرع)" : "v1.0 (القديم)"}
                  </motion.span>
                </div>
              </div>

              {/* Vector Wireframe Viewer */}
              <div className="col-span-2 bg-black border border-zinc-850 rounded-lg h-full relative overflow-hidden flex items-center justify-center">
                {/* Simulated Laser Drawing Lines */}
                <div className="absolute inset-0 bg-radial-gradient from-zinc-950 to-black pointer-events-none" />
                
                <svg className="w-24 h-24 text-zinc-800" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  {/* Outer box */}
                  <rect x="15" y="15" width="70" height="70" strokeWidth="1" strokeDasharray={currentStepIndex === 1 ? "1 1" : "none"} />
                  {/* Decorative Islamic Mandala Pattern */}
                  <circle cx="50" cy="50" r="20" strokeWidth="1" stroke="gray" />
                  <polygon points="50,30 62,42 50,54 38,42" strokeWidth="0.5" stroke="#c59257" />
                  <polygon points="50,46 59,50 50,54 41,50" strokeWidth="0.5" stroke="#c59257" />
                </svg>

                {currentStepIndex === 1 && (
                  <motion.div 
                    animate={{ x: [-30, 30, -30], y: [-20, 20, -20] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute w-2 h-2 bg-red-500 rounded-full blur-xs shadow-lg shadow-red-500" 
                  />
                )}
              </div>
            </div>

            <div className="text-[9.5px] text-zinc-400 text-center bg-zinc-900/40 p-1.5 rounded border border-zinc-850">
              {currentStepIndex === 2 ? "✓ تم حفظ التعديل! تفادينا تكسير الزوايا بتدوير المنحنيات بمقدار 0.5 ملم." : "جاري فحص دقة المسارات الهندسية للماكينة..."}
            </div>
          </div>
        );

      case "inventory-remnants":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono">REMNANT DETECTION ENGINE</span>
              <span className="text-xs font-bold text-white">محاكي كشف واستغلال بقايا الألواح</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 flex-1 my-2 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(197,146,87,0.06),transparent_60%)]" />
              
              <div className="flex gap-4 items-center">
                {/* Visual remnant board */}
                <div className="w-32 h-20 bg-zinc-900 border border-zinc-800 rounded relative overflow-hidden shrink-0">
                  {/* Cut-out region represented by dark hole */}
                  <div className="absolute top-0 left-0 w-16 h-12 bg-black border-r border-b border-zinc-850" />
                  <span className="absolute bottom-1 right-2 text-[8px] text-zinc-600 font-mono">REMAINING AREA</span>
                  
                  {/* Suggested mini-cut in remnant space */}
                  {currentStepIndex === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-2 left-2 w-10 h-6 bg-emerald-500/10 border border-emerald-500/50 rounded flex items-center justify-center text-[7px] text-emerald-400"
                    >
                      FIT TEST OK
                    </motion.div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-right">
                  <div>
                    <span className="text-[9px] text-zinc-500 block">اللوح الأصلي المقصوص منه</span>
                    <span className="text-[10px] text-white font-bold block">أكريليك شفاف 3 مم</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">أبعاد قطعة البقايا الصالحة</span>
                    <span className="text-[10px] text-zinc-200 font-mono font-bold block">750 × 400 mm</span>
                  </div>
                  {currentStepIndex === 2 && (
                    <span className="text-[9px] text-emerald-500 font-bold block">✓ تم حجزها للطلب القادم لـ "أبو أحمد"!</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[9.5px] text-[#c59257] font-semibold text-center bg-[#c59257]/5 p-2 rounded border border-[#c59257]/10">
              * يقلل هذا الأسلوب الذكي الهدر بالورشة بنسبة تصل لـ 25% ويعظم الأرباح من المواد المستهلكة.
            </div>
          </div>
        );

      case "production-laser-queue":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right relative overflow-hidden">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center relative z-10">
              <span className="text-[9px] text-zinc-500 font-mono">LASER JOB SIMULATION</span>
              <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                ماكينة الليزر CO2 - البث المباشر المحاكي
              </span>
            </div>

            <div className="bg-black border border-zinc-900 rounded-lg flex-1 my-2.5 relative flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-zinc-950 to-black pointer-events-none" />
              
              {/* Simulated Grid lines */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-5 pointer-events-none">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border-t border-r border-white" />
                ))}
              </div>

              {currentStepIndex === 1 ? (
                <div className="relative text-center">
                  {/* Laser sparks */}
                  <motion.div 
                    animate={{ 
                      boxShadow: ["0 0 10px #ff3b30", "0 0 40px #ff3b30", "0 0 10px #ff3b30"],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-10 h-10 bg-red-600 rounded-full blur-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" 
                  />
                  <div className="text-[10px] text-zinc-400 font-mono">
                    <span className="text-red-500 font-bold block animate-pulse">⚡ LASER ACTIVE ⚡</span>
                    <div>FEED SPEED: 24 mm/s</div>
                    <div>LASER POWER: 80W</div>
                  </div>
                </div>
              ) : currentStepIndex === 2 ? (
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                    ✓
                  </div>
                  <span className="text-[11px] text-zinc-200 block font-bold">اكتمل قص وتجميع المنتج الفني بنجاح!</span>
                  <span className="text-[9px] text-zinc-500 block">تم الترحيل لشاشة فحص الجودة والتعبئة</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">في انتظار بدء إشارة تشغيل الليزر...</span>
              )}
            </div>

            <div className="flex justify-between items-center text-[9px] text-zinc-500 relative z-10">
              <span>زمن التشغيل الفعلي: 14 ثانية</span>
              <span>الماكينة: AXIS LASER-1</span>
            </div>
          </div>
        );

      case "accounting-invoices":
        return (
          <div className="p-4 h-full flex flex-col justify-between text-right">
            <div className="border-b border-zinc-900 pb-1.5 flex justify-between items-center">
              <span className="text-[9px] text-zinc-500 font-mono">FINANCIAL GENERAL LEDGER</span>
              <span className="text-xs font-bold text-white">أرشفة الحسابات وطباعة الفواتير</span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center flex-1 my-2">
              {/* Miniature receipt/invoice */}
              <div className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-lg text-[9px] text-zinc-400 font-mono text-right relative overflow-hidden aspect-[4/3] flex flex-col justify-between">
                <div>
                  <div className="border-b border-zinc-800 pb-1 flex justify-between text-[10px] font-bold text-white">
                    <span>AXIS LAB ERP</span>
                    <span>فاتورة مبيعات</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    <div>العميل: شركة الشام الفنية</div>
                    <div>المادة: قص علب أكريليك مرآة</div>
                    <div>القيمة الإجمالية: 45,250 ل.س</div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-1 border-t border-zinc-800 text-[10px] font-bold text-white">
                  <span>الصافي المطلوب:</span>
                  <span className="text-emerald-400">45,250 ل.س</span>
                </div>

                {/* Simulated copper stamp */}
                {currentStepIndex === 2 && (
                  <motion.div 
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.8 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="border-4 border-amber-600/60 rounded-full w-16 h-16 flex items-center justify-center rotate-12 bg-black/80">
                      <span className="text-[8px] font-extrabold text-amber-500 text-center uppercase tracking-wider">
                        PAID<br/>مدفوع
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Accounting details */}
              <div className="space-y-1.5">
                <div>
                  <span className="text-[9px] text-zinc-500 block">قيمة ضريبة المبيعات 15%</span>
                  <span className="text-[10px] text-zinc-300 font-bold font-mono">6,787 ل.س</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block">طريقة السداد المسجلة</span>
                  <span className="text-[10px] text-emerald-400 font-bold block">نقدي بالخزنة (Cash)</span>
                </div>
                {currentStepIndex === 2 && (
                  <div className="bg-emerald-950/40 border border-emerald-900/30 p-1.5 rounded">
                    <span className="text-[9px] text-emerald-400 font-bold block">✓ تم تسجيل سند القبض المالي</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 text-center">
              * يقوم النظام بحجب أرقام الهواتف وعناوين السكن تلقائياً بالتقارير لحماية خصوصية بيانات عملائنا.
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
            اختر درساً تعليمياً لتشغيل المحاكاة المرئية المدمجة
          </div>
        );
    }
  };

  return (
    <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-900/80 shadow-2xl relative">
      {/* Top Header of Simulated Player */}
      <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-900/60">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="text-[10px] text-zinc-400 font-semibold">محاكي الفيديو المدمج والدروس العملية لـ AXIS LAB</span>
          <Cpu className="w-3.5 h-3.5 text-[#c59257]" />
        </div>
      </div>

      {/* Main Playback Area Canvas (Aspect Ratio 16:9) */}
      <div className="relative aspect-video bg-[#050506] border-b border-zinc-900 flex flex-col justify-between overflow-hidden">
        {/* Dynamic visual overlay depending on current simulation state */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-zinc-800 text-[9px] font-mono text-zinc-400 z-20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c59257] animate-pulse" />
          <span>SIMULATOR {playbackSpeed}x</span>
        </div>

        {/* The main rendering node */}
        <div className="flex-1 w-full h-full">
          {renderSimulatedCanvas()}
        </div>

        {/* Dynamic subtitle banner in Arabic reflecting current stage */}
        <div className="bg-black/90 px-4 py-2.5 border-t border-zinc-900 flex items-center justify-between text-right gap-4 z-10">
          <div className="text-[10px] text-zinc-500 font-mono shrink-0">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
          </div>
          <div className="flex-1 text-right">
            <span className="text-[10px] px-1.5 py-0.5 bg-[#c59257]/10 text-[#c59257] border border-[#c59257]/20 rounded font-bold ml-1.5">
              خطوة {currentStepIndex + 1}/{stages.length}
            </span>
            <span className="text-xs font-bold text-white inline-block">
              {stages[currentStepIndex]?.title}:
            </span>
            <span className="text-[11px] text-zinc-300 block font-normal mt-0.5">
              {stages[currentStepIndex]?.desc}
            </span>
          </div>
        </div>
      </div>

      {/* Video timeline track */}
      <div 
        className="w-full bg-zinc-900 h-1 relative cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = clickX / rect.width;
          setCurrentTime(Math.floor(ratio * totalDuration));
        }}
      >
        <div 
          className="bg-[#c59257] h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        {/* Segments marks */}
        {(() => {
          let currentAcc = 0;
          return stages.map((stage, sIdx) => {
            currentAcc += stage.duration;
            const posPct = (currentAcc / totalDuration) * 100;
            return (
              <div 
                key={sIdx} 
                className="absolute top-0 w-[2px] h-full bg-black/60" 
                style={{ left: `${posPct}%` }}
              />
            );
          });
        })()}
      </div>

      {/* Controls panel */}
      <div className="bg-[#0b0c0e] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Playback rate */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500">سرعة العرض:</span>
          {[1, 1.5, 2].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                playbackSpeed === speed 
                  ? "bg-[#c59257] text-black font-extrabold" 
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Main interactive step pills */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          {stages.map((stage, idx) => {
            const isPassed = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  let accumTime = 0;
                  for (let i = 0; i < idx; i++) accumTime += stages[i].duration;
                  setCurrentTime(accumTime + 1);
                }}
                className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isCurrent 
                    ? "bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/40 shadow"
                    : isPassed
                    ? "bg-zinc-900/60 text-zinc-400 border border-zinc-800"
                    : "bg-zinc-950/20 text-zinc-600 border border-transparent"
                }`}
              >
                {idx + 1}. {stage.title}
              </button>
            );
          })}
        </div>

        {/* Buttons: Play, Pause, restart */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentTime(0)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            title="إعادة تشغيل الدرس التعليمي من البداية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-[#c59257]/10 hover:bg-[#c59257]/20 text-[#c59257] border border-[#c59257]/20 rounded-full transition-all cursor-pointer transform hover:scale-105"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-[#c59257]" /> : <Play className="w-4 h-4 fill-[#c59257]" />}
          </button>
        </div>
      </div>
    </div>
  );
}

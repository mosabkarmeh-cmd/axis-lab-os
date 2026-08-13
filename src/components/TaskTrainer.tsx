import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Layers, Settings, Play, CheckCircle, RefreshCw, Award, ArrowLeft, ArrowRight, ShieldAlert, Sparkles, HelpCircle, Flame, Gauge, Check
} from "lucide-react";
import { TRAINING_STAGES, TrainingStage } from "../data/helpData";
import { DEFAULT_EXCHANGE_RATE, fetchExchangeRate, sanitizeExchangeRate } from "../lib/currency";

interface TaskTrainerProps {
  onClose?: () => void;
}

export default function TaskTrainer({ onClose }: TaskTrainerProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedCust, setSelectedCust] = useState<string>("");
  const [materialType, setMaterialType] = useState<"acrylic" | "wood" | "leather">("acrylic");
  const [thickness, setThickness] = useState<number>(3); // mm
  const [laserSpeed, setLaserSpeed] = useState<number>(10); // mm/s
  const [laserPower, setLaserPower] = useState<number>(50); // %
  const [airAssist, setAirAssist] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [simStatus, setSimStatus] = useState<string>("جاهز للبدء");
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [cutPoints, setCutPoints] = useState<{ x: number; y: number }[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate).catch(() => {});
    const handleRateChange = (event: Event) => setExchangeRate(sanitizeExchangeRate((event as CustomEvent<number>).detail));
    window.addEventListener("axislab:exchange-rate-changed", handleRateChange);
    return () => window.removeEventListener("axislab:exchange-rate-changed", handleRateChange);
  }, []);

  // Score calculation
  const getOptimalRange = () => {
    switch (materialType) {
      case "acrylic":
        return { speed: { min: 15, max: 20 }, power: { min: 70, max: 80 }, air: true, label: "أكريليك 3 مم" };
      case "wood":
        return { speed: { min: 10, max: 15 }, power: { min: 80, max: 90 }, air: true, label: "خشب MDF 4 مم" };
      case "leather":
        return { speed: { min: 25, max: 35 }, power: { min: 40, max: 50 }, air: false, label: "جلود طبيعية" };
    }
  };

  const calculateScore = () => {
    const optimal = getOptimalRange();
    let score = 100;
    
    // speed deviation
    if (laserSpeed < optimal.speed.min || laserSpeed > optimal.speed.max) {
      const dev = Math.min(Math.abs(laserSpeed - (optimal.speed.min + optimal.speed.max) / 2), 30);
      score -= Math.round(dev * 1.5);
    }
    // power deviation
    if (laserPower < optimal.power.min || laserPower > optimal.power.max) {
      const dev = Math.min(Math.abs(laserPower - (optimal.power.min + optimal.power.max) / 2), 30);
      score -= Math.round(dev * 1.5);
    }
    // air assist
    if (airAssist !== optimal.air) {
      score -= 15;
    }
    return Math.max(score, 40);
  };

  // Generate laser path points for drawing a beautiful gear shape or logo
  useEffect(() => {
    const points: { x: number; y: number }[] = [];
    const centerX = 150;
    const centerY = 150;
    const innerRadius = 40;
    const outerRadius = 80;
    const teeth = 12;

    // Build gear outline path
    for (let i = 0; i < teeth * 4; i++) {
      const angle = (i * 2 * Math.PI) / (teeth * 4);
      const isOuter = (i % 4 === 0 || i % 4 === 1);
      const r = isOuter ? outerRadius : innerRadius;
      points.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      });
    }
    // Close the path
    points.push(points[0]);
    setCutPoints(points);
  }, []);

  // Laser cutting animator
  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      setSimStatus("جاري تحمية تيوب ليزر الـ CO2... 🔥");
      timer = setTimeout(() => {
        setSimStatus("شعاع الليزر نشط - جاري قص اللوح... ⚡");
        const interval = setInterval(() => {
          setActivePointIndex((prev) => {
            if (prev >= cutPoints.length - 1) {
              clearInterval(interval);
              setIsSimulating(false);
              setSimulationProgress(100);
              setSimStatus("تم اكتمال عملية القص بنجاح! 🎉");
              // Move to certification
              setTimeout(() => {
                setShowCertificate(true);
              }, 1200);
              return prev;
            }
            const nextIdx = prev + 1;
            setSimulationProgress(Math.round((nextIdx / cutPoints.length) * 100));
            return nextIdx;
          });
        }, 80);
      }, 1500);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isSimulating, cutPoints]);

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedCust) {
      alert("يرجى اختيار العميل أولاً لإتمام المحاكاة!");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetTrainer = () => {
    setCurrentStep(1);
    setSelectedCust("");
    setMaterialType("acrylic");
    setThickness(3);
    setLaserSpeed(10);
    setLaserPower(50);
    setAirAssist(false);
    setIsSimulating(false);
    setSimulationProgress(0);
    setActivePointIndex(0);
    setShowCertificate(false);
    setSimStatus("جاهز للبدء");
  };

  const optimal = getOptimalRange();
  const calculatedScore = calculateScore();

  return (
    <div id="task-trainer-container" className="bg-[#0b0c0e]/95 text-zinc-100 p-6 rounded-2xl border border-zinc-800/80 shadow-2xl max-w-4xl mx-auto my-4 overflow-hidden relative font-sans">
      {/* Visual background lights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#c59257]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#c59257]/10 rounded-lg border border-[#c59257]/20 text-[#c59257]">
            <Award className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-md font-bold tracking-tight text-white flex items-center gap-1.5">
              مدرب المهام التفاعلي والتشبيهي بالورشة
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">محاكاة CO2 Laser</span>
            </h2>
            <p className="text-[10px] text-zinc-400 mt-0.5">تدريب الموظفين والعمال على دورة الطلبات والقص بدون هدر حقيقي للمواد.</p>
          </div>
        </div>
        {onClose && (
          <button 
            id="close-trainer-btn"
            onClick={onClose} 
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
          >
            إغلاق المدرب ×
          </button>
        )}
      </div>

      {!showCertificate ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          {/* Progress Tracker (Right Column) */}
          <div className="lg:col-span-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-900/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-[#c59257] uppercase font-mono tracking-wider font-bold">خطوات التدريب</span>
              <h3 className="text-xs font-bold text-zinc-300 mb-4 mt-0.5">مراحل التدريب العملي</h3>
              
              <div className="space-y-3.5">
                {TRAINING_STAGES.map((stage) => {
                  const isCompleted = currentStep > stage.step;
                  const isActive = currentStep === stage.step;
                  return (
                    <div 
                      key={stage.step} 
                      className={`p-3 rounded-lg border transition-all ${
                        isActive 
                          ? "bg-zinc-900 border-[#c59257]/40 shadow-sm" 
                          : isCompleted 
                            ? "bg-emerald-950/10 border-emerald-900/30 text-zinc-400" 
                            : "bg-transparent border-zinc-900 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold ${isActive ? "text-[#c59257]" : isCompleted ? "text-emerald-400" : "text-zinc-500"}`}>
                          الخطوة {stage.step}
                        </span>
                        {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#c59257] animate-ping" />}
                      </div>
                      <h4 className={`text-xs font-bold ${isActive ? "text-white" : "text-zinc-300"}`}>{stage.title}</h4>
                      {isActive && <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{stage.instruction}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="mt-6 p-3 bg-[#c59257]/5 border border-[#c59257]/15 rounded-lg">
              <span className="text-[9px] text-[#c59257] font-bold flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> نصيحة الورشة الذكية:
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                كل مادة تتطلب إعدادات طاقة وسرعة مختلفة؛ خفض السرعة الكبيرة يزيد عمق الحفر، وزيادة طاقة الليزر فوق 85% تقصر العمر الافتراضي لتيوب الليزر (CO2 Laser Tube).
              </p>
            </div>
          </div>

          {/* Training Interactive Panel (Left Column) */}
          <div className="lg:col-span-8 flex flex-col justify-between min-h-[420px]">
            {/* Step Content */}
            <div className="bg-zinc-950/30 p-5 rounded-xl border border-zinc-900 flex-1 flex flex-col justify-center">
              
              {/* STEP 1: SELECT CUSTOMER */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <User className="w-8 h-8 text-[#c59257] mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white">اختيار وتعيين العميل للطلب</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">البحث واختيار العميل الصحيح يحفظ سجل الدفعات والذمم في نظام المحاسبة.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { id: "cust-1", name: "أحمد الكرمي (شركة الديكور الدمشقية)", count: 14, popular: true },
                      { id: "cust-2", name: "رامي الحلبي (مكتبة الفنون الجميلة)", count: 6, popular: true },
                      { id: "cust-3", name: "منى الصالح (ورشة تصميم الهدايا)", count: 2, popular: false },
                      { id: "cust-4", name: "سعيد الحموي (للإعلانات الطرقية)", count: 0, popular: false }
                    ].map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => setSelectedCust(cust.name)}
                        className={`p-3 text-right rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                          selectedCust === cust.name 
                            ? "bg-zinc-900 border-[#c59257] text-white shadow" 
                            : "bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs">{cust.name}</span>
                          {selectedCust === cust.name && <Check className="w-4 h-4 text-[#c59257]" />}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {cust.popular && (
                            <span className="text-[8px] bg-[#c59257]/10 text-[#c59257] px-1.5 py-0.5 rounded">🌟 مفضل</span>
                          )}
                          <span className="text-[9px] text-zinc-500 font-mono">طلبات سابقة: {cust.count}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedCust && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-center text-[10px] text-emerald-400 font-bold">
                      ✓ ممتاز! تم تحديد {selectedCust}. يمكنك الانتقال الآن للخطوة التالية.
                    </motion.div>
                  )}
                </div>
              )}

              {/* STEP 2: SELECT MATERIAL */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Layers className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white">تحديد خامة لوح القص وسماكته</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">تحديد المادة بشكل خاطئ في الورشة يؤدي لتلف العدسة أو عدم اختراق الليزر للوح.</p>
                  </div>

                  <div className="flex justify-center gap-3 mt-4">
                    {[
                      { id: "acrylic", label: "أكريليك ملون", icon: "💎", desc: "بلاستيك صلب للعلب والميداليات" },
                      { id: "wood", label: "خشب MDF سوري", icon: "🪵", desc: "خشب ألياف لعلب الهدايا والتصميم" },
                      { id: "leather", label: "جلود طبيعية", icon: "👞", desc: "للحفر والقص الفني" }
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setMaterialType(mat.id as any)}
                        className={`flex-1 p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          materialType === mat.id
                            ? "bg-zinc-900 border-[#c59257] text-white shadow"
                            : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        <span className="text-lg block mb-1">{mat.icon}</span>
                        <span className="text-xs font-bold block text-zinc-200">{mat.label}</span>
                        <span className="text-[9px] text-zinc-500 mt-1 block">{mat.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dimension inputs */}
                  <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900 mt-4">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">سماكة اللوح (بالمليمتر)</label>
                      <select 
                        value={thickness} 
                        onChange={(e) => setThickness(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs rounded p-1.5 text-zinc-300 focus:outline-none focus:border-[#c59257]"
                      >
                        <option value={2}>2 ملم</option>
                        <option value={3}>3 ملم (شائع)</option>
                        <option value={5}>5 ملم (يتطلب طاقة عالية)</option>
                        <option value={8}>8 ملم (يتطلب قص بطيء جداً)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">أبعاد القطعة</label>
                      <div className="text-xs text-[#c59257] font-bold p-1.5 bg-zinc-900/50 rounded border border-zinc-850 text-center">
                        300 × 300 ملم (لوح متوسط)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LASER SPEED & POWER CALIBRATION */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Settings className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white">معايرة سرعة وقدرة شعاع الليزر</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">اضبط المنزلقات أدناه لتناسب الخامة المحددة: <span className="text-[#c59257] font-bold">({optimal.label})</span></p>
                  </div>

                  <div className="space-y-4 mt-4">
                    {/* Speed Calibration */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-blue-400" /> سرعة حركة رأس القص (Speed):</span>
                        <span className="text-white font-bold font-mono">{laserSpeed} مم/ثانية</span>
                      </div>
                      <input 
                        type="range" 
                        min={1} 
                        max={100} 
                        value={laserSpeed}
                        onChange={(e) => setLaserSpeed(Number(e.target.value))}
                        className="w-full accent-[#c59257] bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                        <span>بطيء جداً (1)</span>
                        <span className="text-amber-500/80">المقترح لهذه المادة: {optimal.speed.min} - {optimal.speed.max} مم/ث</span>
                        <span>سريع جداً (100)</span>
                      </div>
                    </div>

                    {/* Power Calibration */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-red-400" /> قدرة ومستوى طاقة شعاع الليزر (Power):</span>
                        <span className="text-white font-bold font-mono">{laserPower} %</span>
                      </div>
                      <input 
                        type="range" 
                        min={10} 
                        max={100} 
                        value={laserPower}
                        onChange={(e) => setLaserPower(Number(e.target.value))}
                        className="w-full accent-[#c59257] bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
                        <span>طاقة ضعيفة (10%)</span>
                        <span className="text-amber-500/80">المقترح لهذه المادة: {optimal.power.min} - {optimal.power.max}%</span>
                        <span>أقصى طاقة (100%)</span>
                      </div>
                    </div>

                    {/* Air Assist Switch */}
                    <div className="flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900">
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">مساعد الهواء (Air Assist)</span>
                        <span className="text-[9px] text-zinc-400">توجيه هواء مضغوط لمنع اشتعال حواف الخشب أو تفحم الأكريليك</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAirAssist(!airAssist)}
                        className={`px-3 py-1.5 rounded font-bold text-[10px] transition-all cursor-pointer ${
                          airAssist 
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                        }`}
                      >
                        {airAssist ? "✓ مفعل (ON)" : "❌ ملغى (OFF)"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SIMULATION RUN */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Play className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white">محاكاة تشغيل ماكينة الليزر</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">قم بتشغيل المحاكي لمشاهدة رأس الليزر يسير على مسار التصميم وقص القطعة.</p>
                  </div>

                  {/* Simulator Screen */}
                  <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden relative h-[220px] flex items-center justify-center">
                    
                    {/* Grid Lines to simulate cutting bed */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
                    
                    {/* Workpiece representation */}
                    <div className={`absolute w-[220px] h-[180px] rounded border transition-colors ${
                      materialType === "acrylic" 
                        ? "bg-sky-950/20 border-sky-500/20" 
                        : materialType === "wood"
                          ? "bg-amber-950/20 border-amber-500/20"
                          : "bg-amber-900/15 border-amber-900/30"
                    }`} />

                    {/* SVG Laser path */}
                    <svg className="absolute w-[300px] h-[300px] pointer-events-none" viewBox="0 0 300 300">
                      {/* Already cut path lines */}
                      {cutPoints.length > 0 && (
                        <polyline
                          fill="none"
                          stroke={materialType === "acrylic" ? "#0ea5e9" : "#c59257"}
                          strokeWidth="2"
                          strokeDasharray={simulationProgress === 100 ? "0" : "5, 5"}
                          points={cutPoints.slice(0, activePointIndex + 1).map(p => `${p.x},${p.y}`).join(" ")}
                        />
                      )}

                      {/* Moving laser head and glowing spark */}
                      {isSimulating && cutPoints[activePointIndex] && (
                        <>
                          {/* Outer red boundary crosshair */}
                          <circle cx={cutPoints[activePointIndex].x} cy={cutPoints[activePointIndex].y} r="10" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-pulse" />
                          <line x1={cutPoints[activePointIndex].x - 15} y1={cutPoints[activePointIndex].y} x2={cutPoints[activePointIndex].x + 15} y2={cutPoints[activePointIndex].y} stroke="#ef4444" strokeWidth="1" />
                          <line x1={cutPoints[activePointIndex].x} y1={cutPoints[activePointIndex].y - 15} x2={cutPoints[activePointIndex].x} y2={cutPoints[activePointIndex].y + 15} stroke="#ef4444" strokeWidth="1" />
                          
                          {/* Glowing laser spot */}
                          <circle cx={cutPoints[activePointIndex].x} cy={cutPoints[activePointIndex].y} r="4" fill="#f59e0b" />
                          <circle cx={cutPoints[activePointIndex].x} cy={cutPoints[activePointIndex].y} r="8" fill="#f59e0b" className="animate-ping" opacity="0.8" />
                          
                          {/* Beam path from nozzle head */}
                          <line x1="150" y1="10" x2={cutPoints[activePointIndex].x} y2={cutPoints[activePointIndex].y} stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="3,3" />
                        </>
                      )}
                    </svg>

                    {/* Progress Bar overlay */}
                    {simulationProgress > 0 && (
                      <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/80 p-2 rounded border border-zinc-850/80">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-zinc-400 font-bold">{simStatus}</span>
                          <span className="text-[#c59257] font-mono font-bold">{simulationProgress}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#c59257] h-full transition-all duration-100" 
                            style={{ width: `${simulationProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {!isSimulating && simulationProgress === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSimulating(true);
                          setActivePointIndex(0);
                        }}
                        className="relative z-10 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-emerald-700/20 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                      >
                        <Play className="w-4 h-4 fill-current" /> بدء محاكاة قص اللوح الافتراضية
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: CURRENCY CONVERTER & EXCHANGE RATE SIMULATION */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="p-2 bg-[#c59257]/10 w-fit mx-auto rounded-lg border border-[#c59257]/20 text-[#c59257] mb-2">
                      💱
                    </div>
                    <h3 className="text-sm font-bold text-white">محاكاة إدارة سعر الصرف وتحويل العملات المزدوج</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">اختبر تعديل سعر الصرف وتجربة التحويل اللحظي بين الليرة السورية والدولار لتسعير العقود للعملاء.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-bold">سعر الصرف المعتمد حالياً بالورشة:</span>
                      <span className="font-mono text-[#c59257] font-extrabold text-sm">1$ = {exchangeRate.toLocaleString()} ل.س</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-1">توليد قيمة عقد بالدولار:</span>
                        <div className="text-base font-mono font-bold text-white">$120.00 USD</div>
                        <span className="text-[10px] text-emerald-400 font-bold mt-1 block">قيمة العقد بالليرة: 1,740,000 ل.س</span>
                      </div>

                      <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block mb-1">تحويل المبلغ بالليرة السورية:</span>
                        <div className="text-base font-mono font-bold text-[#c59257]">2,500,000 ل.س</div>
                        <span className="text-[10px] text-sky-400 font-bold mt-1 block">المكافئ بالدولار: $172.41 USD</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-center text-[10px] text-emerald-400 font-bold">
                      ✓ ممتاز! النظام يتيح لك تغيير سعر الصرف بضغطة زر واحدة لتحديث كافة القوائم والفواتير فورياً.
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: SUPPLIER COMPARISON & DEFECTIVE INSPECTION */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="p-2 bg-purple-500/10 w-fit mx-auto rounded-lg border border-purple-500/20 text-purple-400 mb-2">
                      📊
                    </div>
                    <h3 className="text-sm font-bold text-white">محاكاة مقارنة الموردين وفحص الخامات المعيبة</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">تعلم كيفية استخراج العرض الأقل تكلفة وعزل ألواح الأكريليك أو الخشب التالفة.</p>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <div className="text-[11px] font-bold text-zinc-300 border-b border-zinc-850 pb-2 flex justify-between">
                      <span>مقارنة الموردين لمادة: أكريليك شفاف 3 مم</span>
                      <span className="text-emerald-400 font-mono">🏆 العرض الفائز: شركة الشام للاكريليك ($18.50/اللوح)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-2 rounded text-right">
                        <span className="font-bold text-emerald-400 block">شركة الشام للاكريليك</span>
                        <span className="text-zinc-400 block">$18.50 / اللوح (أوفر سعر)</span>
                        <span className="text-zinc-500 block">نسبة التلف: 1% فقط</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-right">
                        <span className="font-bold text-zinc-300 block">المركز الدولي للمواد</span>
                        <span className="text-zinc-400 block">$21.00 / اللوح</span>
                        <span className="text-zinc-500 block">نسبة التلف: 3.5%</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-right">
                        <span className="font-bold text-zinc-300 block">مؤسسة قاسيون للبلاد</span>
                        <span className="text-zinc-400 block">$23.00 / اللوح</span>
                        <span className="text-zinc-500 block">نسبة التلف: 5% (معيبة)</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded text-center text-[10px] text-purple-300 font-bold">
                      ✓ ممتاز! عند اكتشاف خامة معيبة بالمستودع، يتم عزلها فورياً لحماية عدسة وبلاطة ماكينة الليزر.
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-4">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1 || isSimulating}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" /> الخطوة السابقة
              </button>

              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div 
                    key={s} 
                    className={`w-2 h-2 rounded-full transition-all ${
                      s === currentStep 
                        ? "bg-[#c59257] w-5" 
                        : s < currentStep 
                          ? "bg-emerald-500" 
                          : "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  الخطوة التالية <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCertificate(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  عرض شهادة الاجتياز 🎓
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TRAINING CERTIFICATE SECTION */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-zinc-950 p-6 rounded-xl border border-[#c59257]/30 text-center max-w-2xl mx-auto my-4 relative"
        >
          {/* Certificate background ribbon effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#c59257] text-black font-extrabold text-[10px] px-4 py-1 rounded-full uppercase tracking-widest shadow">
            AXIS LAB CERTIFIED
          </div>

          <Award className="w-16 h-16 text-[#c59257] mx-auto mt-4 animate-bounce" />
          
          <h3 className="text-lg font-bold text-white mt-4">شهادة اجتياز التدريب التشبيهي لورشة الليزر</h3>
          <p className="text-xs text-zinc-400 mt-1">تشهد إدارة AXIS LAB بأن الموظف قد أكمل بنجاح محاكاة تشغيل ومعايرة ماكينات CO2 لقطع الأكريليك والأخشاب.</p>
          
          {/* Results Audit Card */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800/60 my-6 text-right">
            <div>
              <span className="text-[10px] text-zinc-500 block">العميل المختار للطلب:</span>
              <span className="text-xs text-zinc-300 font-bold">{selectedCust || "عام"}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">الخامة المحددة:</span>
              <span className="text-xs text-zinc-300 font-bold">{optimal.label}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">سرعة الليزر المعايرة:</span>
              <span className="text-xs text-zinc-300 font-bold font-mono">{laserSpeed} مم/ثانية (المقترح {optimal.speed.min}-{optimal.speed.max})</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">طاقة وقدرة الليزر:</span>
              <span className="text-xs text-zinc-300 font-bold font-mono">{laserPower}% (المقترح {optimal.power.min}-{optimal.power.max})</span>
            </div>
            <div className="col-span-2 border-t border-zinc-800 pt-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">مساعد الهواء:</span>
                <span className={`text-[10px] font-bold ${airAssist === optimal.air ? "text-emerald-400" : "text-amber-400"}`}>
                  {airAssist ? "نشط" : "ملغى"} {airAssist === optimal.air ? "(صحيح)" : "(خاطئ لهذه المادة)"}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-zinc-500 block">تقييم المعايرة والدقة:</span>
                <span className={`text-lg font-extrabold ${calculatedScore >= 85 ? "text-emerald-400" : "text-amber-400"}`}>
                  {calculatedScore} / 100
                </span>
              </div>
            </div>
          </div>

          {calculatedScore < 80 ? (
            <div className="p-3 bg-red-950/20 border border-red-900/20 rounded-lg text-xs text-red-400 mb-6 flex items-start gap-2 text-right">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">تنبيه أمان ومعايرة:</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">درجة دقة المعايرة منخفضة. يؤدي ضبط طاقة مرتفعة جداً أو سرعة بطيئة في القص الفعلي لحرق حواف الخشب وإتلاف اللوح. يوصى بإعادة المحاكاة ومطابقة الإعدادات المقترحة.</p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/20 rounded-lg text-xs text-emerald-400 mb-6 flex items-start gap-2 text-right">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">أداء متميز وجاهزية تامة!</span>
                <p className="text-[10px] text-zinc-400 mt-0.5">لقد قمت بضبط إعدادات حركة رأس الليزر والطاقة بأعلى دقة علمية تضمن الحفاظ على سلامة المواد والتيوب. أنت جاهز لبدء المهام الحقيقية بالورشة.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={resetTrainer}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تجربة تدريب جديدة
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 bg-[#c59257] hover:bg-[#b07d43] text-black font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
            >
              🖨️ طباعة شهادة التدريب
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

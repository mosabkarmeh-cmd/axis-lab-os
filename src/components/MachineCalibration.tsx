import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wrench, 
  Settings, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Info, 
  Check, 
  Sparkles,
  Scissors,
  Ruler,
  Target,
  Cpu
} from "lucide-react";

// Standard type for Machine matching the types.ts file
interface Machine {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'offline' | 'maintenance';
  currentJobId: string | null;
  lastMaintenance?: string;
  workingHours: number;
  calibrationSettings?: {
    scaleX?: number;
    scaleY?: number;
    expectedWidth?: number;
    expectedHeight?: number;
    measuredWidth?: number;
    measuredHeight?: number;
    lastTestCutDate?: string;
    testMaterialId?: string;
  };
}

interface MachineCalibrationProps {
  machines: Machine[];
  onLogCalibration: (msg: string) => void;
  currentUser: { role: string; fullName: string } | null;
  remnants: any[];
  materials: any[];
  onUpdateMachineCalibration: (machineId: string, settings: any) => Promise<void>;
}

interface ProbePoint {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "uncalibrated" | "calibrating" | "calibrated";
  value: number; // current physical height offset in mm
}

interface BurnPulse {
  id: string;
  x: number; // canvas relative x
  y: number; // canvas relative y
  power: number;
  duration: number;
  aligned: boolean;
}

export default function MachineCalibration({ 
  machines, 
  onLogCalibration, 
  currentUser,
  remnants = [],
  materials = [],
  onUpdateMachineCalibration
}: MachineCalibrationProps) {
  // Select first available machine by default
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");

  useEffect(() => {
    if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machines, selectedMachineId]);

  const activeMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  // Bed Leveling State
  const [points, setPoints] = useState<ProbePoint[]>([
    { id: "FL", name: "الزاوية الأمامية اليسرى (FL)", x: 40, y: 160, status: "uncalibrated", value: 0.25 },
    { id: "FR", name: "الزاوية الأمامية اليمنى (FR)", x: 160, y: 160, status: "uncalibrated", value: -0.15 },
    { id: "BL", name: "الزاوية الخلفية اليسرى (BL)", x: 40, y: 40, status: "uncalibrated", value: 0.30 },
    { id: "BR", name: "الزاوية الخلفية اليمنى (BR)", x: 160, y: 40, status: "uncalibrated", value: -0.10 },
    { id: "CT", name: "بؤرة المركز (Center)", x: 100, y: 100, status: "uncalibrated", value: 0.05 },
  ]);

  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [nozzleX, setNozzleX] = useState<number>(100);
  const [nozzleY, setNozzleY] = useState<number>(100);
  const [isNozzleMoving, setIsNozzleMoving] = useState<boolean>(false);
  const [isLevelingAutomated, setIsLevelingAutomated] = useState<boolean>(false);

  // Laser Alignment State
  const [pulsePower, setPulsePower] = useState<number>(15);
  const [pulseDuration, setPulseDuration] = useState<number>(20); // ms
  const [alignmentX, setAlignmentX] = useState<number>(8);  // offset from 0 (perfect)
  const [alignmentY, setAlignmentY] = useState<number>(-6); // offset from 0 (perfect)
  const [burns, setBurns] = useState<BurnPulse[]>([]);
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [alignmentSaved, setAlignmentSaved] = useState<boolean>(false);

  // General Status
  const [calibrationSuccess, setCalibrationSuccess] = useState<boolean>(false);

  // Test Cut Wizard States
  const [testCutStep, setTestCutStep] = useState<'select_material' | 'running_cut' | 'measure_results' | 'calibrated'>('select_material');
  const [selectedRemnantId, setSelectedRemnantId] = useState<string>("");
  const [expectedWidth, setExpectedWidth] = useState<number>(50);
  const [expectedHeight, setExpectedHeight] = useState<number>(50);
  const [measuredWidth, setMeasuredWidth] = useState<string>("50");
  const [measuredHeight, setMeasuredHeight] = useState<string>("50");
  const [isCutting, setIsCutting] = useState<boolean>(false);
  const [cutProgress, setCutProgress] = useState<number>(0);
  const [scaleX, setScaleX] = useState<number>(80);
  const [scaleY, setScaleY] = useState<number>(80);
  const [testCutSuccess, setTestCutSuccess] = useState<boolean>(false);

  // Sync scale settings on machine change
  useEffect(() => {
    if (activeMachine) {
      setScaleX(activeMachine.calibrationSettings?.scaleX || 80.00);
      setScaleY(activeMachine.calibrationSettings?.scaleY || 80.00);
    }
  }, [selectedMachineId]);

  // Sync first available remnant
  useEffect(() => {
    if (remnants && remnants.length > 0 && !selectedRemnantId) {
      setSelectedRemnantId(remnants[0].id);
    }
  }, [remnants]);

  const handleStartTestCut = () => {
    if (!selectedRemnantId) return;
    setTestCutStep('running_cut');
    setIsCutting(true);
    setCutProgress(0);
    
    // Simulate cutting progress
    const interval = setInterval(() => {
      setCutProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCutting(false);
          setTestCutStep('measure_results');
          playLaserSound();
          return 100;
        }
        playLaserSound();
        return prev + 5;
      });
    }, 150);
  };

  const handleApplyCalibrationSettings = async () => {
    if (!activeMachine || !onUpdateMachineCalibration) return;
    
    const mWidthNum = parseFloat(measuredWidth) || expectedWidth;
    const mHeightNum = parseFloat(measuredHeight) || expectedHeight;
    const correctionX = expectedWidth / mWidthNum;
    const correctionY = expectedHeight / mHeightNum;
    const calculatedScaleX = Math.round((scaleX * correctionX) * 100) / 100;
    const calculatedScaleY = Math.round((scaleY * correctionY) * 100) / 100;

    const settings = {
      scaleX: calculatedScaleX,
      scaleY: calculatedScaleY,
      expectedWidth,
      expectedHeight,
      measuredWidth: mWidthNum,
      measuredHeight: mHeightNum,
      lastTestCutDate: new Date().toISOString(),
      testMaterialId: remnants.find(r => r.id === selectedRemnantId)?.materialId
    };
    
    await onUpdateMachineCalibration(activeMachine.id, settings);
    setScaleX(calculatedScaleX);
    setScaleY(calculatedScaleY);
    setTestCutSuccess(true);
    setTestCutStep('calibrated');
    
    const remnantPiece = remnants.find(r => r.id === selectedRemnantId);
    const matName = materials.find(m => m.id === remnantPiece?.materialId)?.name || "خامة فضلات";
    
    onLogCalibration(`[معايرة الأبعاد] تم بنجاح إجراء قطع اختبار على فضلات "${matName}" للماكينة "${activeMachine.name}". الأبعاد المطلوبة: ${expectedWidth}x${expectedHeight} مم، المقاسة: ${mWidthNum}x${mHeightNum} مم. تم تصحيح معامل الخطوات إلى (X: ${calculatedScaleX}، Y: ${calculatedScaleY}).`);
    
    setTimeout(() => {
      setTestCutSuccess(false);
    }, 5000);
  };

  // Leveling Progress Calculation
  const calibratedPointsCount = points.filter(p => p.status === "calibrated").length;
  const levelingProgress = Math.round((calibratedPointsCount / points.length) * 100);

  // Synthesize laser audio pulse using Web Audio API
  const playLaserSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      // Sweep frequency down for a laser "pew" sound
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // Audio context might be blocked or unsupported in iframe, ignore gracefully
    }
  };

  // Move nozzle visually
  const handleSelectPoint = (pt: ProbePoint) => {
    if (isNozzleMoving) return;
    setActivePointId(pt.id);
    setIsNozzleMoving(true);
    
    // Simulate head traveling speed
    setTimeout(() => {
      setNozzleX(pt.x);
      setNozzleY(pt.y);
      setIsNozzleMoving(false);
      
      // Update point status to calibrating if not already calibrated
      setPoints(prev => prev.map(p => {
        if (p.id === pt.id && p.status === "uncalibrated") {
          return { ...p, status: "calibrating" };
        }
        return p;
      }));
    }, 800);
  };

  // Adjust height manually
  const adjustHeight = (amount: number) => {
    if (!activePointId) return;
    setPoints(prev => prev.map(p => {
      if (p.id === activePointId) {
        const newVal = Math.round((p.value + amount) * 100) / 100;
        const status = Math.abs(newVal) < 0.01 ? "calibrated" : "calibrating";
        return { ...p, value: newVal, status };
      }
      return p;
    }));
  };

  // Auto Level single point
  const autoLevelActivePoint = () => {
    if (!activePointId || isNozzleMoving) return;
    
    // Play a mechanical sound or sweep
    playLaserSound();
    
    setPoints(prev => prev.map(p => {
      if (p.id === activePointId) {
        return { ...p, status: "calibrating" };
      }
      return p;
    }));

    // Simulate probing touch
    setTimeout(() => {
      setPoints(prev => prev.map(p => {
        if (p.id === activePointId) {
          return { ...p, value: 0.0, status: "calibrated" };
        }
        return p;
      }));
    }, 1000);
  };

  // Run full automated sequence
  const runFullAutoLeveling = async () => {
    if (isNozzleMoving || isLevelingAutomated) return;
    setIsLevelingAutomated(true);
    
    // Clear all points status
    setPoints(prev => prev.map(p => ({ ...p, status: "uncalibrated", value: Math.round((Math.random() * 0.6 - 0.3) * 100) / 100 })));

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      setActivePointId(pt.id);
      setIsNozzleMoving(true);
      
      // Move to point
      await new Promise(resolve => setTimeout(resolve, 600));
      setNozzleX(pt.x);
      setNozzleY(pt.y);
      setIsNozzleMoving(false);
      
      // Start probing
      setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, status: "calibrating" } : p));
      await new Promise(resolve => setTimeout(resolve, 500));
      playLaserSound();
      
      // Probe touch down & calibrate
      await new Promise(resolve => setTimeout(resolve, 500));
      setPoints(prev => prev.map(p => p.id === pt.id ? { ...p, value: 0.0, status: "calibrated" } : p));
    }
    
    setIsLevelingAutomated(false);
  };

  // Fire laser alignment pulse
  const handleFirePulse = () => {
    if (isFiring) return;
    setIsFiring(true);
    playLaserSound();

    setTimeout(() => {
      // Burn spot is calculated relative to central target (100, 100)
      // AlignmentX and AlignmentY shift where the burn spot lands.
      // Perfect alignment (0,0) lands precisely on the bullseye center.
      const targetX = 100 + alignmentX * 5;
      const targetY = 100 + alignmentY * 5;

      const isAligned = Math.abs(alignmentX) < 0.5 && Math.abs(alignmentY) < 0.5;

      const newBurn: BurnPulse = {
        id: `burn-${Date.now()}`,
        x: targetX,
        y: targetY,
        power: pulsePower,
        duration: pulseDuration,
        aligned: isAligned
      };

      setBurns(prev => [...prev, newBurn]);
      setIsFiring(false);

      if (isAligned) {
        setAlignmentSaved(true);
      }
    }, 200);
  };

  // Reset alignment targets
  const handleResetAlignment = () => {
    setBurns([]);
    setAlignmentX(Math.round((Math.random() * 16 - 8) * 10) / 10);
    setAlignmentY(Math.round((Math.random() * 16 - 8) * 10) / 10);
    setAlignmentSaved(false);
  };

  // Reset Bed Leveling values to test again
  const handleResetLeveling = () => {
    setPoints([
      { id: "FL", name: "الزاوية الأمامية اليسرى (FL)", x: 40, y: 160, status: "uncalibrated", value: 0.25 },
      { id: "FR", name: "الزاوية الأمامية اليمنى (FR)", x: 160, y: 160, status: "uncalibrated", value: -0.15 },
      { id: "BL", name: "الزاوية الخلفية اليسرى (BL)", x: 40, y: 40, status: "uncalibrated", value: 0.30 },
      { id: "BR", name: "الزاوية الخلفية اليمنى (BR)", x: 160, y: 40, status: "uncalibrated", value: -0.10 },
      { id: "CT", name: "بؤرة المركز (Center)", x: 100, y: 100, status: "uncalibrated", value: 0.05 },
    ]);
    setActivePointId(null);
    setNozzleX(100);
    setNozzleY(100);
  };

  // Log final calibration to terminal/activity log
  const handleSaveCalibrationReport = () => {
    if (!activeMachine) return;
    
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const logMsg = `[معايرة الماكينة] تم بنجاح ضبط استواء السطح ومحاذاة شعاع الليزر لجهاز "${activeMachine.name}" (${activeMachine.type === "laser_co2" ? "CO2 Laser" : "Fiber Laser"}) بنسبة دقة 100% وانحراف بصري 0.00 مم بواسطة الفني ${currentUser?.fullName || "فني التشغيل"}.`;
    
    onLogCalibration(logMsg);
    setCalibrationSuccess(true);
    
    setTimeout(() => {
      setCalibrationSuccess(false);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Selector & Intro Banner */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
        <div className="w-full md:w-auto">
          <label className="text-xs text-zinc-500 block mb-1.5 font-bold">اختر الماكينة المراد معايرتها:</label>
          <select
            value={selectedMachineId}
            onChange={(e) => {
              setSelectedMachineId(e.target.value);
              handleResetLeveling();
              handleResetAlignment();
            }}
            className="w-full md:w-64 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257] font-sans text-right"
          >
            {machines.map((mac) => (
              <option key={mac.id} value={mac.id}>
                {mac.name} ({mac.type === 'laser_co2' ? 'CO2' : mac.type === 'cnc_router' ? 'Router' : 'Fiber'})
              </option>
            ))}
          </select>
        </div>
        <div className="order-first md:order-last">
          <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2 justify-end">
            <Wrench className="w-4 h-4 text-[#c59257]" />
            <span>معايرة وضبط بؤرة الليزر (Laser Alignment & Bed Leveling)</span>
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            قم بإجراء معايرة تسوية سطح الطاولة وضبط محاذاة شعاع الليزر لضمان جودة قص ممتازة بدون حواف مائلة أو حروق جانبية.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RIGHT COLUMN: Bed Leveling Simulation (7 cols) */}
        <div className="lg:col-span-6 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
              <span className="text-[10px] font-mono text-[#c59257] bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded-full uppercase">
                Step 1: Bed Leveling
              </span>
              <h5 className="text-xs font-bold text-zinc-200">1. معايرة استواء سطح الطاولة (Bed Leveling)</h5>
            </div>

            <p className="text-xs text-zinc-400 mb-4 text-right">
              اختر أحد نقاط المعايرة الخمس على الشاشة. استخدم نظام ضبط ميكرومتر الارتفاع حتى يبلغ الانحراف <span className="font-mono text-[#c59257]">0.00 مم</span> لتتحول النقطة إلى اللون الأخضر.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Probing Workspace Grid Visualizer */}
              <div className="md:col-span-6 flex flex-col items-center justify-center bg-[#030305] border border-zinc-900 rounded-xl p-4 relative overflow-hidden h-56">
                {/* Calibration Matrix Grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:20px_20px] opacity-60" />
                
                {/* Bed workspace borders */}
                <div className="w-44 h-44 border border-zinc-800 rounded bg-[#010102] relative">
                  {/* Point Targets */}
                  {points.map((pt) => {
                    const isActive = activePointId === pt.id;
                    const isCalibrated = pt.status === "calibrated";
                    const isCalibrating = pt.status === "calibrating";
                    
                    return (
                      <button
                        key={pt.id}
                        style={{ left: `${(pt.x / 200) * 100}%`, top: `${(pt.y / 200) * 100}%` }}
                        onClick={() => handleSelectPoint(pt)}
                        disabled={isNozzleMoving || isLevelingAutomated}
                        className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full flex items-center justify-center transition-all duration-300 z-10 cursor-pointer ${
                          isActive 
                            ? "ring-2 ring-indigo-500 scale-110" 
                            : ""
                        } ${
                          isCalibrated 
                            ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400" 
                            : isCalibrating
                            ? "bg-amber-500/20 border-2 border-amber-500 text-amber-400 animate-pulse"
                            : "bg-zinc-800/80 border border-zinc-600 text-zinc-400 hover:border-zinc-400"
                        }`}
                        title={pt.name}
                      >
                        <span className="text-[7.5px] font-mono font-bold">{pt.id}</span>
                      </button>
                    );
                  })}

                  {/* Physical Nozzle Travel Visualizer */}
                  <motion.div
                    animate={{ x: (nozzleX / 200) * 176 - 8, y: (nozzleY / 200) * 176 - 8 }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    className="absolute w-4 h-4 pointer-events-none flex items-center justify-center z-20"
                  >
                    {/* Brass cross nozzle head */}
                    <div className="w-4 h-4 rounded-full border border-yellow-500/80 flex items-center justify-center relative bg-zinc-900 shadow-md">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping absolute" />
                      <div className="w-1 h-1 bg-rose-600 rounded-full" />
                    </div>
                  </motion.div>
                </div>

                <div className="mt-2 text-center shrink-0">
                  <span className="text-[9px] text-zinc-600 font-mono">WORKSPACE MATRIX: CO2 FL-FR-BL-BR</span>
                </div>
              </div>

              {/* Dial Micrometer Offset Control */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-3 text-right">
                {activePointId ? (
                  (() => {
                    const currentPt = points.find(p => p.id === activePointId)!;
                    const deviation = currentPt.value;
                    const isFine = Math.abs(deviation) < 0.01;

                    return (
                      <div className="space-y-3 bg-zinc-900/30 border border-zinc-850 p-3.5 rounded-xl flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-mono text-zinc-500">{currentPt.id} POINT</span>
                            <span className="text-xs font-bold text-zinc-300">{currentPt.name}</span>
                          </div>

                          {/* Height Display Gauge */}
                          <div className="bg-black/60 border border-zinc-800 rounded-lg py-3 px-4 text-center font-mono my-2 relative overflow-hidden">
                            <span className="text-[9px] text-zinc-500 block uppercase tracking-wider mb-0.5">انحراف الارتفاع (Deviation)</span>
                            <span className={`text-xl font-bold tracking-tight block ${isFine ? 'text-emerald-400' : deviation > 0 ? 'text-rose-400' : 'text-indigo-400'}`}>
                              {deviation > 0 ? `+${deviation.toFixed(2)}` : deviation.toFixed(2)} مم
                            </span>
                            <div className="absolute top-1 left-1.5 flex gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isFine ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            </div>
                          </div>
                        </div>

                        {/* Adjuster controls */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-zinc-500 block">اضبط يدوياً (ميكرومتر):</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => adjustHeight(0.05)}
                              disabled={isLevelingAutomated}
                              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-[11px] rounded-lg cursor-pointer font-bold transition-all"
                            >
                              +0.05
                            </button>
                            <button
                              onClick={() => adjustHeight(-0.05)}
                              disabled={isLevelingAutomated}
                              className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-[11px] rounded-lg cursor-pointer font-bold transition-all"
                            >
                              -0.05
                            </button>
                          </div>
                          
                          <button
                            onClick={autoLevelActivePoint}
                            disabled={isLevelingAutomated}
                            className="w-full py-1.5 bg-indigo-950/30 hover:bg-indigo-900/30 border border-indigo-900/40 hover:border-indigo-850 text-indigo-400 text-[11px] rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>قياس تلقائي وضبط النقطة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-zinc-900/10 border border-zinc-900 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center flex-1">
                    <Info className="w-7 h-7 text-zinc-700 mb-2" />
                    <span className="text-xs text-zinc-500">الرجاء الضغط على إحدى نقاط المعايرة على مصفوفة العمل لبدء القياس والضبط</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lower controls and auto level progress */}
          <div className="border-t border-zinc-900 pt-4 space-y-3 text-right">
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="font-mono text-emerald-400 font-bold">{levelingProgress}%</span>
                <span className="text-zinc-500">حالة استواء السطح الإجمالية (Surface Planarity)</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-850">
                <div 
                  style={{ width: `${levelingProgress}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    levelingProgress === 100 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                      : "bg-indigo-500"
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleResetLeveling}
                disabled={isLevelingAutomated}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 text-xs rounded-lg font-bold cursor-pointer transition-colors"
              >
                إعادة ضبط 🔄
              </button>
              <button
                onClick={runFullAutoLeveling}
                disabled={isNozzleMoving || isLevelingAutomated}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg ${
                  isLevelingAutomated 
                    ? "bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-850" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isLevelingAutomated ? "جاري المعايرة الكلية..." : "معايرة تلقائية شاملة لكافة الزوايا ⚡"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Laser Beam Alignment Target (5 cols) */}
        <div className="lg:col-span-6 bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
              <span className="text-[10px] font-mono text-[#c59257] bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded-full uppercase">
                Step 2: Mirror Alignment
              </span>
              <h5 className="text-xs font-bold text-zinc-200">2. ضبط محاذاة مسار شعاع الليزر (Optical Alignment)</h5>
            </div>

            <p className="text-xs text-zinc-400 mb-4 text-right">
              أطلق نبضة اختبارية لرؤية أثر الليزر على لوحة التصويب الدائرية. اضبط مسامير محاذاة المرآة الخلفية والعدسة حتى يقع نبض الليزر في مركز الهدف <span className="font-mono text-[#c59257]">(0, 0)</span>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Target Board Visualizer */}
              <div className="md:col-span-6 flex flex-col items-center justify-center bg-[#050508] border border-zinc-900 rounded-xl p-4 relative overflow-hidden h-52">
                {/* Target concentric circles */}
                <div className="w-40 h-40 border border-zinc-850 rounded-full relative flex items-center justify-center bg-black">
                  {/* Concentric rings */}
                  <div className="absolute w-32 h-32 rounded-full border border-zinc-900/80 flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full border border-zinc-800 flex items-center justify-center">
                      <div className="absolute w-16 h-16 rounded-full border border-amber-950/30 flex items-center justify-center">
                        <div className="absolute w-8 h-8 rounded-full border border-[#c59257]/40 flex items-center justify-center">
                          {/* Inner bullseye */}
                          <div className="absolute w-2 h-2 rounded-full bg-emerald-500/10 border border-emerald-500/60" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Crosshairs */}
                  <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-zinc-800/60" />
                  <div className="absolute inset-x-0 top-1/2 h-[0.5px] bg-zinc-800/60" />

                  {/* Recorded Pulse Burn Marks */}
                  {burns.map((b) => (
                    <div
                      key={b.id}
                      style={{ left: `${(b.x / 200) * 100}%`, top: `${(b.y / 200) * 100}%` }}
                      className={`absolute rounded-full -ml-1 -mt-1 shadow-lg transition-transform scale-110 ${
                        b.aligned 
                          ? "w-2.5 h-2.5 bg-emerald-500 border border-white ring-2 ring-emerald-500/40" 
                          : "w-2 h-2 bg-amber-600 border border-black"
                      }`}
                      title={`Pulse: X:${(b.x-100)/5} Y:${(100-b.y)/5}`}
                    >
                      <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-30" />
                    </div>
                  ))}

                  {/* Glowing Laser Impulse Flash */}
                  <AnimatePresence>
                    {isFiring && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 2 }}
                        exit={{ opacity: 0 }}
                        style={{ 
                          left: `${((100 + alignmentX * 5) / 200) * 100}%`, 
                          top: `${((100 + alignmentY * 5) / 200) * 100}%` 
                        }}
                        className="absolute w-5 h-5 -ml-2.5 -mt-2.5 bg-yellow-400 rounded-full flex items-center justify-center filter blur-xs"
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Optics Screws Adjustment Sliders */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-2.5 text-right">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className={`${Math.abs(alignmentX) < 0.5 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {alignmentX > 0 ? `+${alignmentX.toFixed(1)}` : alignmentX.toFixed(1)} mm
                      </span>
                      <span className="text-zinc-500">محور مرآة الأفق (X-Mirror Offset)</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={alignmentX}
                      onChange={(e) => {
                        setAlignmentX(parseFloat(e.target.value));
                        setAlignmentSaved(false);
                      }}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#c59257]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className={`${Math.abs(alignmentY) < 0.5 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                        {alignmentY > 0 ? `+${alignmentY.toFixed(1)}` : alignmentY.toFixed(1)} mm
                      </span>
                      <span className="text-zinc-500">محور مرآة العمود (Y-Mirror Offset)</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={alignmentY}
                      onChange={(e) => {
                        setAlignmentY(parseFloat(e.target.value));
                        setAlignmentSaved(false);
                      }}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#c59257]"
                    />
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-2 rounded-xl text-center">
                  <span className="text-[9.5px] text-zinc-500 block uppercase mb-0.5 font-mono">ALIGNMENT PRECISION STATUS</span>
                  {Math.abs(alignmentX) < 0.5 && Math.abs(alignmentY) < 0.5 ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      متحاذي بنسبة 100% (Perfect Target)
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-bold flex items-center gap-1 justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      منحرف بؤرياً (Optical Deviation)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Firing Options & Laser Fire Pulse Button */}
          <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">شدة النبضة: {pulsePower}%</span>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={pulsePower}
                  onChange={(e) => setPulsePower(parseInt(e.target.value))}
                  className="w-24 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">زمن النبض: {pulseDuration}ms</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={pulseDuration}
                  onChange={(e) => setPulseDuration(parseInt(e.target.value))}
                  className="w-24 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleResetAlignment}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 text-xs rounded-lg font-bold cursor-pointer transition-colors"
              >
                تصفير الهدف 🎯
              </button>
              <button
                onClick={handleFirePulse}
                disabled={isFiring}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/10"
              >
                <span>إطلاق نبضة تصويب ⚡</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Dimensional Calibration & Test Cut Wizard */}
      <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl text-right space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <span className="text-[10px] font-mono text-[#c59257] bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded-full uppercase">
            Step 3: Dimensional Calibration Wizard
          </span>
          <h5 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#c59257]" />
            <span>3. معالج قطع الاختبار وضبط أبعاد السائر (Dimensional Test Cut Wizard)</span>
          </h5>
        </div>
        
        <p className="text-xs text-zinc-400">
          هذا المعالج يسمح لك بقطع مربع اختبار على قطعة فضلات (Remnant) ومقارنة الأبعاد المقاسة بالأبعاد الفعلية لتصحيح دقة محاور المحركات (Steps/mm) تلقائياً.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Right Part: Setup & Measurements (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Step indicators */}
            <div className="flex justify-between bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-850 text-xs">
              <span className={`px-2 py-1 rounded-lg ${testCutStep === 'calibrated' ? 'bg-emerald-950/40 text-emerald-400' : 'text-zinc-500'}`}>4. اكتملت المعايرة</span>
              <span className={`px-2 py-1 rounded-lg ${testCutStep === 'measure_results' ? 'bg-indigo-950/50 text-indigo-400 font-bold' : 'text-zinc-500'}`}>3. القياس والتصحيح</span>
              <span className={`px-2 py-1 rounded-lg ${testCutStep === 'running_cut' ? 'bg-amber-950/40 text-amber-400 font-bold animate-pulse' : 'text-zinc-500'}`}>2. جاري القطع</span>
              <span className={`px-2 py-1 rounded-lg ${testCutStep === 'select_material' ? 'bg-zinc-800 text-zinc-200 font-bold' : 'text-zinc-500'}`}>1. اختيار قطعة فضلات</span>
            </div>

            {testCutStep === 'select_material' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-bold block">1. اختر قطعة الفضلات للقص التجريبي:</label>
                  {remnants.length === 0 ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-lg text-xs">
                      ⚠️ لا يوجد أي قطع فضلات (Remnants) مسجلة في المخزن حالياً. يُرجى إنشاء قطعة فضلات من قسم المواد أو المتابعة بقطعة افتراضية.
                    </div>
                  ) : (
                    <select
                      value={selectedRemnantId}
                      onChange={(e) => setSelectedRemnantId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-[#c59257]"
                    >
                      {remnants.map(r => {
                        const matName = materials.find(m => m.id === r.materialId)?.name || "خامة فضلات";
                        return (
                          <option key={r.id} value={r.id}>
                            {matName} - {r.width}x{r.height}مم ({r.location || "بدون موقع رف"})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 block font-mono">العرض المطلوب للمربع (Expected Width - mm):</label>
                    <input
                      type="number"
                      value={expectedWidth}
                      onChange={(e) => setExpectedWidth(Number(e.target.value) || 50)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-left"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 block font-mono">الارتفاع المطلوب للمربع (Expected Height - mm):</label>
                    <input
                      type="number"
                      value={expectedHeight}
                      onChange={(e) => setExpectedHeight(Number(e.target.value) || 50)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-left"
                    />
                  </div>
                </div>

                <button
                  onClick={handleStartTestCut}
                  disabled={!selectedRemnantId}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-600/10"
                >
                  <Play className="w-4 h-4" />
                  <span>بدء قطع اختبار المعايرة ⚡</span>
                </button>
              </div>
            )}

            {testCutStep === 'running_cut' && (
              <div className="space-y-4 p-4 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <h6 className="text-xs font-bold text-zinc-200">جاري تشغيل آلة ليزر CO2 لقص المربع {expectedWidth}x{expectedHeight} مم</h6>
                  <p className="text-[11px] text-zinc-500">يرجى التأكد من تشغيل ساحب الدخان ومساعد الهواء لحماية العدسة البؤرية.</p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>{cutProgress}%</span>
                    <span>معدل التقدم الفعلي للقص اللحظي</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-900">
                    <div style={{ width: `${cutProgress}%` }} className="h-full bg-amber-500 rounded-full transition-all duration-150" />
                  </div>
                </div>
              </div>
            )}

            {testCutStep === 'measure_results' && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-lg text-xs text-indigo-400 leading-relaxed">
                  💡 <strong>إرشاد فني:</strong> يرجى قياس المربع المقصوص بدقة فائقة باستخدام فرجار رقمي (Caliper) في كلا الاتجاهين X و Y لتحديد الانحراف الفعلي عن المقاس المطلوب.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#c59257] block font-bold">العرض المقاس بالفرجار (Measured Width - X):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={measuredWidth}
                      onChange={(e) => setMeasuredWidth(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-left focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#c59257] block font-bold">الارتفاع المقاس بالفرجار (Measured Height - Y):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={measuredHeight}
                      onChange={(e) => setMeasuredHeight(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono text-left focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Calibration Comparison Preview */}
                {(() => {
                  const mWidthNum = parseFloat(measuredWidth) || expectedWidth;
                  const mHeightNum = parseFloat(measuredHeight) || expectedHeight;
                  const deviationXPercent = Math.round(((mWidthNum - expectedWidth) / expectedWidth) * 1000) / 10;
                  const deviationYPercent = Math.round(((mHeightNum - expectedHeight) / expectedHeight) * 1000) / 10;
                  const correctionX = expectedWidth / mWidthNum;
                  const correctionY = expectedHeight / mHeightNum;
                  const calculatedScaleX = Math.round((scaleX * correctionX) * 100) / 100;
                  const calculatedScaleY = Math.round((scaleY * correctionY) * 100) / 100;

                  return (
                    <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500">معامل الخطوات الحالي (Current Steps/mm):</span>
                        <span className="font-mono text-zinc-300">X: {scaleX.toFixed(2)} | Y: {scaleY.toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-850 pt-2.5">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block">تصحيح محور X المقترح:</span>
                          <span className="text-sm font-mono text-emerald-400 font-bold block">
                            {deviationXPercent === 0 ? "متطابق تماماً ✓" : `${deviationXPercent > 0 ? "+" : ""}${deviationXPercent}% (${scaleX} → ${calculatedScaleX})`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block">تصحيح محور Y المقترح:</span>
                          <span className="text-sm font-mono text-emerald-400 font-bold block">
                            {deviationYPercent === 0 ? "متطابق تماماً ✓" : `${deviationYPercent > 0 ? "+" : ""}${deviationYPercent}% (${scaleY} → ${calculatedScaleY})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2">
                  <button
                    onClick={() => setTestCutStep('select_material')}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs rounded-lg font-bold cursor-pointer"
                  >
                    إعادة ضبط المعايرة 🔄
                  </button>
                  <button
                    onClick={handleApplyCalibrationSettings}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تطبيق وتحديث إعدادات الماكينة تلقائياً ✅</span>
                  </button>
                </div>
              </div>
            )}

            {testCutStep === 'calibrated' && (
              <div className="space-y-4 text-center py-6 bg-zinc-900/30 border border-zinc-850 border-dashed rounded-xl">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                    <Check className="w-6 h-6" />
                  </div>
                  <h6 className="text-xs font-bold text-emerald-400">تمت معايرة أبعاد الماكينة وتحديث المعاملات بنجاح!</h6>
                  <p className="text-[11px] text-zinc-400 max-w-sm">
                    المعامل الجديد للمحاور هو <strong className="text-white font-mono">X: {scaleX.toFixed(2)}</strong> و <strong className="text-white font-mono">Y: {scaleY.toFixed(2)}</strong>. هذا يضمن نسبة خطأ أبعاد تقل عن 0.05 مم.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setTestCutStep('select_material');
                    setMeasuredWidth("50");
                    setMeasuredHeight("50");
                  }}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] rounded-lg cursor-pointer"
                >
                  إجراء قطع اختبار جديد لآلة أخرى
                </button>
              </div>
            )}
          </div>

          {/* Left Part: Interactive Remnant Cutting Canvas Simulation (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#030305] border border-zinc-900 rounded-2xl p-4 relative overflow-hidden h-72">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
            
            {/* CNC Workbed simulation */}
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Remnant representation */}
              {(() => {
                const remnantPiece = remnants.find(r => r.id === selectedRemnantId);
                const widthLabel = remnantPiece ? `${remnantPiece.width}mm` : "300mm";
                const heightLabel = remnantPiece ? `${remnantPiece.height}mm` : "200mm";
                const matName = remnants.length > 0 && remnantPiece 
                  ? (materials.find(m => m.id === remnantPiece.materialId)?.name || "خامة فضلات")
                  : "لوحة الفضلات المستهدفة";

                return (
                  <div className="w-72 h-44 bg-[#231b14] border border-amber-800/40 rounded-lg relative overflow-hidden flex flex-col justify-between p-3 shadow-2xl">
                    <div className="absolute inset-0 bg-radial-gradient from-zinc-900/10 to-black/30 pointer-events-none" />
                    
                    {/* Top dimensions */}
                    <div className="flex justify-between items-center text-[9px] text-amber-600/60 font-mono select-none">
                      <span>W: {widthLabel}</span>
                      <span>H: {heightLabel}</span>
                    </div>

                    {/* Central Area: Test cut square animation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {testCutStep === 'select_material' && (
                        <div className="w-24 h-24 border-2 border-zinc-700/40 border-dashed rounded flex items-center justify-center">
                          <span className="text-[9px] text-zinc-600">منطقة القص المقترحة ({expectedWidth}x{expectedHeight} مم)</span>
                        </div>
                      )}

                      {testCutStep === 'running_cut' && (
                        <div className="w-24 h-24 relative">
                          {/* Inner glowing orange paths */}
                          <div className="absolute inset-0 border-2 border-amber-500/80 rounded animate-pulse" />
                          {/* Laser head spark visualizer */}
                          <div 
                            style={{ 
                              left: cutProgress < 25 ? `${(cutProgress / 25) * 100}%` : cutProgress < 50 ? '100%' : cutProgress < 75 ? `${100 - ((cutProgress - 50) / 25) * 100}%` : '0%',
                              top: cutProgress < 25 ? '0%' : cutProgress < 50 ? `${((cutProgress - 25) / 25) * 100}%` : cutProgress < 75 ? '100%' : `${100 - ((cutProgress - 75) / 25) * 100}%`
                            }} 
                            className="absolute w-4 h-4 -ml-2 -mt-2 bg-yellow-400 rounded-full flex items-center justify-center filter blur-xs z-20 shadow-lg shadow-amber-500"
                          >
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                          </div>
                          {/* Floating sparks */}
                          <div className="absolute inset-0 bg-amber-500/5 animate-pulse rounded" />
                        </div>
                      )}

                      {(testCutStep === 'measure_results' || testCutStep === 'calibrated') && (
                        <div className="w-24 h-24 border-2 border-emerald-500/60 rounded flex flex-col items-center justify-center bg-black/40">
                          <span className="text-[10px] text-emerald-400 font-bold font-mono">تم القص ✓</span>
                          <span className="text-[8px] text-zinc-500 font-mono">X:{measuredWidth} Y:{measuredHeight}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom labels */}
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-[#c59257]/80 font-bold block">{matName}</span>
                      <span className="text-[8.5px] text-zinc-500 font-mono block">REMNANT SHEETS CALIBRATION PLATFORM</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="mt-2 text-center shrink-0">
              <span className="text-[9.5px] text-zinc-600 font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-700" />
                <span>محاكاة السطح الحقيقي لآلة القص الرقمي CNC CO2 Laser Feed</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL STEP: Validation & Saving */}
      <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl text-right relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto justify-end order-last md:order-first">
            <button
              onClick={handleSaveCalibrationReport}
              disabled={levelingProgress !== 100 || !alignmentSaved}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xl ${
                levelingProgress === 100 && alignmentSaved
                  ? "bg-[#c59257] hover:bg-[#b07e43] text-zinc-950 shadow-amber-500/10"
                  : "bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-850"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تسجيل ومعايرة الماكينة بنظام الأنشطة</span>
            </button>
          </div>

          <div className="text-right">
            <h5 className="text-xs font-bold text-zinc-200">اعتماد المعايرة وتسجيل الجلسة</h5>
            <p className="text-xs text-zinc-500 mt-1">
              بعد استكمال خطوتي تسوية السطح (Bed Leveling = 100%) ومحاذاة العدسات شعاعاً (X:0, Y:0)، يمكنك الضغط لتأريخ العملية في السجل العام للنظام.
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
        <AnimatePresence>
          {calibrationSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-3 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs flex items-center justify-between gap-3 font-sans"
            >
              <span>تم بنجاح حفظ شهادة المعايرة وتحديث سجل التشغيل للآلة بنجاح! يمكن متابعة العمليات الآن بدقة متناهية.</span>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

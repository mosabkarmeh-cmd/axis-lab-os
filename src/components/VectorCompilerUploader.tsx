import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Ruler,
  Clock,
  Zap,
  Download,
  Link as LinkIcon,
  Play,
  RefreshCw,
  Eye,
  FileText,
  Sparkles,
  ChevronDown
} from "lucide-react";
import {
  parseSvgVectorContent,
  parseDxfVectorContent,
  VectorAnalysisResult,
  formatBytes
} from "../utils/vectorParser";

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customer?: string;
  status: string;
  totalAmount?: number;
}

interface VectorCompilerUploaderProps {
  orders: Order[];
  laserSpeed: number;
  laserPower: number;
  gcodeMaterial: string;
  onCompileVectorGcode: (compiledData: {
    gcodeSnippet: string;
    estimatedTime: string;
    totalPaths: number;
    beamDutyCycle: string;
    materialLossPercent: number;
    gcodeExplanation: string;
    calibrationAdvice: string;
  }) => void;
  onTerminalLog: (type: string, message: string) => void;
}

export default function VectorCompilerUploader({
  orders,
  laserSpeed,
  laserPower,
  gcodeMaterial,
  onCompileVectorGcode,
  onTerminalLog
}: VectorCompilerUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<VectorAnalysisResult | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSavingToOrder, setIsSavingToOrder] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-run analysis if laser parameters change
  useEffect(() => {
    if (file && analysisResult) {
      reAnalyzeFile(file);
    }
  }, [laserSpeed, laserPower]);

  const reAnalyzeFile = async (currentFile: File) => {
    try {
      setIsParsing(true);
      const text = await currentFile.text();
      const ext = currentFile.name.split(".").pop()?.toLowerCase();

      let result: VectorAnalysisResult;
      if (ext === "dxf") {
        result = parseDxfVectorContent(text, currentFile.name, currentFile.size, laserSpeed, laserPower);
      } else {
        result = parseSvgVectorContent(text, currentFile.name, currentFile.size, laserSpeed, laserPower);
      }

      // Attach order info if linked
      if (selectedOrderId) {
        const foundOrder = orders.find(o => o.id === selectedOrderId);
        if (foundOrder) {
          result.linkedOrderId = foundOrder.id;
          result.linkedOrderNumber = foundOrder.orderNumber;
          result.linkedCustomerName = foundOrder.customerName || foundOrder.customer || "عميل بدون اسم";
        }
      }

      setAnalysisResult(result);
    } catch (err) {
      console.error("Vector parsing error:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessSelectedFile(e.target.files[0]);
    }
  };

  const handleProcessSelectedFile = (selectedFile: File) => {
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "dxf" && ext !== "svg") {
      setSaveErrorMsg("يرجى اختيار ملف متجهات بصيغة DXF أو SVG فقط.");
      return;
    }

    setFile(selectedFile);
    reAnalyzeFile(selectedFile);
    onTerminalLog("VECTOR", `تم تحميل ملف التصميم المتجه: ${selectedFile.name} (${formatBytes(selectedFile.size)})`);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (analysisResult) {
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        setAnalysisResult({
          ...analysisResult,
          linkedOrderId: foundOrder.id,
          linkedOrderNumber: foundOrder.orderNumber,
          linkedCustomerName: foundOrder.customerName || foundOrder.customer || "عميل بدون اسم"
        });
      } else {
        const copy = { ...analysisResult };
        delete copy.linkedOrderId;
        delete copy.linkedOrderNumber;
        delete copy.linkedCustomerName;
        setAnalysisResult(copy);
      }
    }
  };

  // Upload file to server and attach to order
  const handleSaveToOrder = async () => {
    if (!file) return;
    if (!selectedOrderId) {
      setSaveErrorMsg("يرجى تحديد الطلب المراد ربط تصميم المتجهات به من القائمة.");
      return;
    }

    try {
      setIsSavingToOrder(true);
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "order");
      formData.append("entityId", selectedOrderId);
      formData.append("uploadedBy", "u-1");

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        const orderNum = analysisResult?.linkedOrderNumber || selectedOrderId;
        setSaveSuccessMsg(`تم رفع وأرشفة ملف التصميم المتجه (${file.name}) وربطه بالطلب ${orderNum} بنجاح!`);
        onTerminalLog("FILE_LINK", `تم ربط الملف ${file.name} بالطلب ${orderNum}`);
      } else {
        setSaveErrorMsg(data.message || "فشل رفع الملف وربطه بالطلب.");
      }
    } catch (err: any) {
      setSaveErrorMsg("حدث خطأ أثناء الاتصال بالخادم لرفع الملف.");
    } finally {
      setIsSavingToOrder(false);
    }
  };

  // Trigger G-Code Compilation from Vector Data
  const handleGenerateGcodeFromVector = () => {
    if (!analysisResult) return;

    onCompileVectorGcode({
      gcodeSnippet: analysisResult.generatedGcodeSnippet,
      estimatedTime: analysisResult.estimatedCutTimeFormatted,
      totalPaths: analysisResult.totalPaths,
      beamDutyCycle: `${Math.round(laserPower * 0.95)}% Duty`,
      materialLossPercent: Number((Math.max(2, (analysisResult.totalLengthMm * 0.15) / (analysisResult.widthMm * analysisResult.heightMm || 100) * 100)).toFixed(1)),
      gcodeExplanation: `تم توليد أوامر G-Code تلقائياً بناءً على تحليل مسارات المتجهات المتطورة لملف ${analysisResult.fileName}. يبلغ مجموع طول خطوط القص ${analysisResult.totalLengthMeters} متر، مقسمة على ${analysisResult.totalPaths} مسار متجه وأبعاد قطعة ${analysisResult.widthMm}x${analysisResult.heightMm} ملم.`,
      calibrationAdvice: `نصيحة المعايرة: يوصى بضبط ضغط المساعد الهوائي عند 2.2 Bar وضبط تركيز البؤرة (Focal Point) بمقدار 0.0mm لضمان حافة قص ناعمة بدون حروق خشبية أو ذوبان أكريليك.`
    });

    onTerminalLog("GCODE_GEN", `تم توليد كود G-Code المباشر من ملف ${analysisResult.fileName} (${analysisResult.totalPaths} مسار متجه).`);
  };

  // Load sample template file for quick test
  const handleLoadSample = (type: "dxf" | "svg") => {
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    let sampleContent = "";
    let name = "";

    if (type === "dxf") {
      name = "gear_cutting_template.dxf";
      sampleContent = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
CUT_LAYER
10
10.0
20
10.0
11
110.0
21
10.0
0
LINE
8
CUT_LAYER
10
110.0
20
10.0
11
110.0
21
110.0
0
LINE
8
CUT_LAYER
10
110.0
20
110.0
11
10.0
21
110.0
0
LINE
8
CUT_LAYER
10
10.0
20
110.0
11
10.0
21
10.0
0
CIRCLE
8
CUT_LAYER
10
60.0
20
60.0
40
25.0
0
ENDSEC
0
EOF`;
    } else {
      name = "acrylic_sign_logo.svg";
      sampleContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120mm" height="120mm">
  <rect x="5" y="5" width="110" height="110" rx="8" stroke="#f43f5e" stroke-width="1.5" fill="none" id="OUTER_CUT" />
  <circle cx="60" cy="60" r="35" stroke="#f43f5e" stroke-width="1.2" fill="none" id="INNER_CUT" />
  <polygon points="60,32 68,52 90,52 72,65 78,86 60,73 42,86 48,65 30,52 52,52" stroke="#4f46e5" stroke-width="1" fill="none" id="ENGRAVE_STAR" />
</svg>`;
    }

    const blob = new Blob([sampleContent], { type: "text/plain" });
    const sampleFile = new File([blob], name, { type: "text/plain" });
    handleProcessSelectedFile(sampleFile);
  };

  // Download digital vector analysis report text file
  const handleExportAnalysisReport = () => {
    if (!analysisResult) return;
    const reportText = `==================================================
AXIS LAB - تقرير التحليل الرقمي لمسارات تصاميم المتجهات
==================================================
اسم الملف: ${analysisResult.fileName} (${analysisResult.fileSizeFormatted})
نوع المتجه: ${analysisResult.fileType.toUpperCase()}
الطلب المرتبط: ${analysisResult.linkedOrderNumber ? `${analysisResult.linkedOrderNumber} (${analysisResult.linkedCustomerName})` : "غير مربوط بطلب"}
تاريخ التحليل: ${new Date().toLocaleString("ar-SY")}

[1] المقاييس الهندسية والأبعاد:
- أبعاد القطعة الخارجية: ${analysisResult.widthMm} ملم (عرض) × ${analysisResult.heightMm} ملم (ارتفاع)
- إجمالي أطوال المسارات: ${analysisResult.totalLengthMm} ملم (${analysisResult.totalLengthMeters} متر)
- إجمالي عدد مسارات المتجهات: ${analysisResult.totalPaths}
- عدد مسارات القص الخارجي: ${analysisResult.cutPathsCount}
- عدد مسارات الحفر الداخلي: ${analysisResult.engravePathsCount}
- إجمالي النقاط والعقد الهندسية: ${analysisResult.nodeCount}

[2] معلمات تشغيل الليزر والزمن المتوقع:
- المادة الخام المستهدفة: ${gcodeMaterial}
- سرعة التحرك رأس القص: ${laserSpeed} mm/s
- نسبة طاقة أنبوب CO2: ${laserPower}%
- وقت القص التقريبي الفعلي: ${analysisResult.estimatedCutTimeFormatted}

==================================================
تم استخراج هذا التقرير آلياً عبر نظام AXIS LAB للورش.
==================================================`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AXIS_Vector_Analysis_${analysisResult.fileName.replace(/\./g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 text-right font-sans">
      {/* Top File Upload Dropzone */}
      <div className="border border-zinc-800 p-4 rounded-xl bg-zinc-950/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-rose-500" />
            <div>
              <h4 className="text-xs font-bold text-zinc-100">مترجم وراسم تصاميم المتجهات الرقمية (DXF / SVG)</h4>
              <p className="text-[11px] text-zinc-500">قم برفع ملفات DXF أو SVG لتحليل أطوال المسارات، ربطها بطلبات القص، وتوليد كود G-Code فورياً</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] text-zinc-500 font-bold">قوالب سريعة:</span>
            <button
              onClick={() => handleLoadSample("dxf")}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[10.5px] cursor-pointer transition-colors"
            >
              ترس DXF
            </button>
            <button
              onClick={() => handleLoadSample("svg")}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 rounded text-[10.5px] cursor-pointer transition-colors"
            >
              شعار SVG
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
            dragActive
              ? "border-rose-500 bg-rose-500/10 text-rose-300 scale-[1.01]"
              : file
              ? "border-emerald-900/50 bg-emerald-950/10 text-zinc-300"
              : "border-zinc-850 hover:border-rose-500/50 bg-black/40 text-zinc-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dxf,.svg"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800 text-rose-400">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <span className="text-xs font-bold block text-zinc-200">
              {file ? `الملف المحدد: ${file.name}` : "اسحب واسقط ملف المتجهات (DXF أو SVG) هنا"}
            </span>
            <span className="text-[10.5px] text-zinc-500 block mt-1">
              {file ? `الحجم: ${formatBytes(file.size)} | انقر للتغيير` : "أو انقر لاختيار ملف من جهازك للتصفح والتحليل الرقمي"}
            </span>
          </div>
        </div>

        {/* Order Link Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
          <div className="sm:col-span-8 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <label className="text-xs text-zinc-400 font-bold shrink-0">ربط الملف بطلب قص حقيقي:</label>
            <select
              value={selectedOrderId}
              onChange={(e) => handleSelectOrder(e.target.value)}
              className="w-full bg-black border border-zinc-850 text-xs text-zinc-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-sans"
            >
              <option value="">-- غير مربوط بطلب (تحليل متجه حر) --</option>
              {orders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.orderNumber} - {ord.customerName || ord.customer || "عميل بدون اسم"} [{ord.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 flex gap-2 justify-end">
            {selectedOrderId && file && (
              <button
                onClick={handleSaveToOrder}
                disabled={isSavingToOrder}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSavingToOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    حفظ الملف بالطلب #{analysisResult?.linkedOrderNumber || selectedOrderId}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Digital Path Analysis Viewport */}
      {isParsing ? (
        <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-950/40 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
          <span>جاري قراءة خطوط التصميم وتفكيك الكائنات الحسابية...</span>
        </div>
      ) : analysisResult ? (
        <div className="space-y-4">
          {/* Header metrics card */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-zinc-100">لوحة التحليل الرقمي للمسارات المتجهة (Digital Vector Analysis)</h4>
              </div>

              {analysisResult.linkedOrderNumber && (
                <span className="px-2.5 py-1 bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 rounded-full text-[10.5px] font-bold flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  مربوط بالطلب: {analysisResult.linkedOrderNumber} ({analysisResult.linkedCustomerName})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">أبعاد القطعة</span>
                <strong className="text-xs font-mono text-zinc-200">{analysisResult.widthMm} x {analysisResult.heightMm} ملم</strong>
              </div>

              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">محيط القص الإجمالي</span>
                <strong className="text-xs font-mono text-emerald-400">{analysisResult.totalLengthMm} ملم ({analysisResult.totalLengthMeters}m)</strong>
              </div>

              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">مسارات المتجهات</span>
                <strong className="text-xs font-mono text-indigo-400">{analysisResult.totalPaths} vectors</strong>
              </div>

              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">العقد والنقاط</span>
                <strong className="text-xs font-mono text-amber-400">{analysisResult.nodeCount} nodes</strong>
              </div>

              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">تقسيم العمليات</span>
                <span className="text-xs font-mono text-rose-400 font-bold">{analysisResult.cutPathsCount} قص</span> / <span className="text-xs font-mono text-indigo-400 font-bold">{analysisResult.engravePathsCount} حفر</span>
              </div>

              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-850">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono">وقت العمل المقدر</span>
                <strong className="text-xs font-mono text-rose-400">{analysisResult.estimatedCutTimeFormatted}</strong>
              </div>
            </div>
          </div>

          {/* Interactive Vector Simulator & Layer breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Visual Simulator Canvas */}
            <div className="lg:col-span-7 border border-zinc-800 rounded-xl bg-black/80 p-4 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 border-b border-zinc-850 pb-2 mb-2 font-mono">
                <span className="flex items-center gap-1 text-zinc-300 font-bold">
                  <Eye className="w-3.5 h-3.5 text-rose-500" />
                  محاكي رسم مسارات المتجه الحية (Live Vector Wireframe)
                </span>
                <span>GRID: 10mm x 10mm</span>
              </div>

              <div className="flex-1 flex items-center justify-center p-2 relative">
                {/* SVG Live Simulation Graphic */}
                <svg
                  className="w-full max-h-[220px] stroke-2 fill-none overflow-visible"
                  viewBox={analysisResult.viewBox}
                >
                  {/* Grid lines background */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" strokeWidth="0.5" strokeDasharray="1,3" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.4" />

                  {/* Render preview vector paths */}
                  {analysisResult.previewSvgPaths.map((p, i) => (
                    <path
                      key={i}
                      d={p.pathData}
                      stroke={p.isCut ? "#f43f5e" : "#6366f1"}
                      strokeWidth={p.isCut ? "1.2" : "0.9"}
                      strokeDasharray={p.isCut ? "none" : "3,2"}
                    />
                  ))}

                  {/* Simulated Laser Head Dot */}
                  <circle cx="10" cy="10" r="2.5" fill="#f43f5e" className="animate-ping" />
                  <circle cx="10" cy="10" r="1.5" fill="#ffffff" />
                </svg>
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-850">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> خطوط قص خارجي (Cut)
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block ml-2"></span> خطوط حفر داخلي (Engrave)
                </span>
                <span>توسيط البؤرة تلقائياً</span>
              </div>
            </div>

            {/* Layer & Control Actions */}
            <div className="lg:col-span-5 border border-zinc-800 rounded-xl bg-zinc-950/60 p-4 flex flex-col justify-between space-y-4">
              <div>
                <h5 className="text-xs font-bold text-zinc-200 border-b border-zinc-850 pb-2 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  جدول طبقات المتجه وخصائص التنفيذ
                </h5>

                <div className="space-y-1.5 text-xs max-h-[160px] overflow-y-auto">
                  {analysisResult.layers.map((lay, idx) => (
                    <div key={idx} className="p-2 bg-black/40 border border-zinc-850 rounded flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lay.color }}></span>
                        <span className="font-mono text-[11px] text-zinc-300">{lay.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {lay.count} عنصر ({lay.lengthMm} ملم)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-850">
                <button
                  onClick={handleGenerateGcodeFromVector}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/10 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  توليد كود G-Code المباشر من المتجهات
                </button>

                <button
                  onClick={handleExportAnalysisReport}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  تصدير تقرير التحليل الرقمي للمسارات
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

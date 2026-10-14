import React, { useState, useRef, useEffect } from 'react';
import { Boxes, DollarSign, Compass, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

export const NestingSimulator = ({ fileName = "مشروع_محاكاة_القص.dxf", partW = 600, partH = 400, currency = "ر.س" }) => {
  const [sheetWidth, setSheetWidth] = useState(2440);
  const [sheetHeight, setSheetHeight] = useState(1220);
  const [partMargin, setPartMargin] = useState(10);
  const [edgeMargin, setEdgeMargin] = useState(15);
  const [targetQuantity, setTargetQuantity] = useState(25);
  const [zoomScale, setZoomScale] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const effectiveW = partW + partMargin;
  const effectiveH = partH + partMargin;
  const usableW = Math.max(0, sheetWidth - (edgeMargin * 2));
  const usableH = Math.max(0, sheetHeight - (edgeMargin * 2));

  const cols = Math.floor(usableW / effectiveW) || 0;
  const rows = Math.floor(usableH / effectiveH) || 0;
  const piecesPerSheet = cols * rows;

  const sheetsNeeded = piecesPerSheet > 0 ? Math.ceil(targetQuantity / piecesPerSheet) : 0;
  const totalAreaSheet = (sheetWidth * sheetHeight) / 1000000;
  const totalPartsArea = (partW * partH * targetQuantity) / 1000000;
  const totalSheetsArea = totalAreaSheet * sheetsNeeded;
  const sheetUtilizationPercent = totalSheetsArea > 0 ? Math.min(100, (totalPartsArea / totalSheetsArea) * 100) : 0;
  const wastePercent = Math.max(0, 100 - sheetUtilizationPercent);
  const totalMaterialCostSheets = sheetsNeeded * 150;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoomScale, zoomScale);

    const scaleFactor = Math.min((canvas.width - 60) / sheetWidth, (canvas.height - 60) / sheetHeight);
    const startX = (canvas.width - (sheetWidth * scaleFactor)) / 2;
    const startY = (canvas.height - (sheetHeight * scaleFactor)) / 2;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(startX, startY, sheetWidth * scaleFactor, sheetHeight * scaleFactor);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, sheetWidth * scaleFactor, sheetHeight * scaleFactor);

    let drawnCount = 0;
    const maxDraw = Math.min(piecesPerSheet, targetQuantity);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drawnCount >= maxDraw) break;
        const px = startX + (edgeMargin + c * effectiveW) * scaleFactor;
        const py = startY + (edgeMargin + r * effectiveH) * scaleFactor;
        const pw = partW * scaleFactor;
        const ph = partH * scaleFactor;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, pw, ph);

        drawnCount++;
      }
    }

    ctx.restore();
  }, [sheetWidth, sheetHeight, partW, partH, partMargin, edgeMargin, targetQuantity, zoomScale, cols, rows]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              <span>محاكاة التعشيش وتوزيع الألواح</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">عرض اللوح (مم)</label>
                <input
                  type="number"
                  value={sheetWidth}
                  onChange={(e) => setSheetWidth(Math.max(100, parseFloat(e.target.value) || 2440))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ارتفاع اللوح (مم)</label>
                <input
                  type="number"
                  value={sheetHeight}
                  onChange={(e) => setSheetHeight(Math.max(100, parseFloat(e.target.value) || 1220))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">هامش القطع (مم)</label>
                <input
                  type="number"
                  value={partMargin}
                  onChange={(e) => setPartMargin(Math.max(0, parseFloat(e.target.value) || 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">الكمية المطلوبة</label>
                <input
                  type="number"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>كفاءة واقتصاديات الألواح</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300 divide-y divide-slate-800/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">القطع في اللوح الواحد:</span>
                <span className="font-mono font-bold text-amber-400">{piecesPerSheet} قطعة</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">الألواح المطلوبة:</span>
                <span className="font-mono font-bold text-cyan-400">{sheetsNeeded} لوح</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">نسبة الاستغلال:</span>
                <span className="font-mono font-bold text-emerald-400">{sheetUtilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">نسبة الهدر (Scrap):</span>
                <span className="font-mono font-bold text-rose-400">{wastePercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-white">
                <span>إجمالي التكلفة:</span>
                <span className="font-mono text-emerald-300">{totalMaterialCostSheets.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>معاينة التعشيش بصرياً: {fileName}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setZoomScale(p => Math.max(0.5, p - 0.15))} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><ZoomOut className="w-4 h-4" /></button>
              <span className="font-mono text-xs text-amber-300 px-1.5">{(zoomScale * 100).toFixed(0)}%</span>
              <button onClick={() => setZoomScale(p => Math.min(2.5, p + 0.15))} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoomScale(1.0)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="w-full h-[450px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            <canvas ref={canvasRef} width={750} height={450} className="w-full h-full object-contain cursor-grab" />
          </div>
        </div>
      </div>
    </div>
  );
};
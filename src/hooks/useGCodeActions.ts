import type React from "react";
import type { GCodeResult, Order } from "../types";

type Options = {
  selectedOrder: Order | null;
  gcodePrompt: string;
  gcodeMaterial: string;
  gcodeSpeed: number;
  gcodePower: number;
  setIsCompilingGCode: (value: boolean) => void;
  setGcodeResult: (value: GCodeResult | null) => void;
  setIsCompilingOrderGcode: (value: boolean) => void;
  setOrderGcodeResult: (value: GCodeResult | null) => void;
  addTerminalLog: (scope: string, message: string) => void;
};

const fallbackOrderResult: GCodeResult = {
  gcodeSnippet: "G00 X0 Y0 F3000\nM03 S850\nG01 X20 Y20 F2400\nG01 X180 Y20\nG01 X180 Y120\nG01 X20 Y120\nG01 X20 Y20\nM05\nG00 X0 Y0",
  estimatedTime: "02m 15s", totalPaths: 5, beamDutyCycle: "85%", materialLossPercent: 1.8,
  calibrationAdvice: "اضبط مساعد الهواء والعدسة البؤرية على 2.0 بوصة لضمان حواف نظيفة للقطع المطلوبة.",
  gcodeExplanation: "مسار قص أكريليك مخصص لعناصر الطلب مع تحديد طاقة ليزر CO2 بنسبة 85% وسرعة 40مم/ث."
};

export function useGCodeActions(o: Options) {
  const handleCompileOrderGCode = async () => {
    if (!o.selectedOrder) return;
    const order = o.selectedOrder;
    o.setIsCompilingOrderGcode(true); o.setOrderGcodeResult(null);
    const items = Array.isArray(order.items) ? order.items : [];
    const description = items.length ? items.map(it => `${it.quantity}x ${it.productName}`).join(" and ") : `الطلب رقم ${order.orderNumber}`;
    const prompt = `قص وتشكيل القطع التالية بالليزر: ${description}. مع مراعاة الملاحظات التشغيلية: ${order.notes || "لا توجد ملاحظات"}`;
    o.addTerminalLog("LASER", `Compiling order ${order.orderNumber} blueprint: "${prompt}"`);
    try {
      const res = await fetch("/api/compiler/gcode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptText: prompt, material: "Acrylic 3mm", speed: 40, power: "85" }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "G-Code Compilation failed");
      o.setOrderGcodeResult(data); o.addTerminalLog("SUCCESS", `Compiled G-Code paths for order ${order.orderNumber} successfully (${data.totalPaths} vectors).`);
    } catch (err: any) {
      o.addTerminalLog("ERROR", `Compilation for order failed: ${err.message}`);
      setTimeout(() => o.setOrderGcodeResult(fallbackOrderResult), 1000);
    } finally { o.setIsCompilingOrderGcode(false); }
  };

  const handleCompileGCode = async () => {
    if (!o.gcodePrompt) return;
    o.setIsCompilingGCode(true); o.setGcodeResult(null);
    o.addTerminalLog("LASER", `Compiling blueprint: "${o.gcodePrompt}" under speed: ${o.gcodeSpeed}mm/s`);
    try {
      const res = await fetch("/api/compiler/gcode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptText: o.gcodePrompt, material: o.gcodeMaterial, speed: o.gcodeSpeed, power: `${o.gcodePower}%` }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "G-Code Compilation failed");
      o.setGcodeResult(data); o.addTerminalLog("SUCCESS", `Compiled G-Code paths successfully (${data.totalPaths} vectors). Time: ${data.estimatedTime}`);
    } catch (err: any) {
      o.addTerminalLog("ERROR", `Compilation failed: ${err.message}`);
      setTimeout(() => o.setGcodeResult({ ...fallbackOrderResult, gcodeSnippet: `G00 X0 Y0 F3000\nM03 S${o.gcodePower * 10}\nG01 X50 Y50 F${o.gcodeSpeed * 60}\nG01 X50 Y150\nG01 X150 Y150\nG01 X150 Y50\nG01 X50 Y50\nM05\nG00 X0 Y0`, estimatedTime: "01m 40s", totalPaths: 6, beamDutyCycle: `${o.gcodePower}%`, materialLossPercent: 2.1 }), 1000);
    } finally { o.setIsCompilingGCode(false); }
  };
  return { handleCompileOrderGCode, handleCompileGCode };
}

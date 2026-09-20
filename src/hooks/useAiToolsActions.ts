type AiToolsActionsOptions = {
  materials: any[];
  machines: any[];
  orders: any[];
  customers: any[];
  calcMatId: string;
  calcMachineId: string;
  calcThicknessMm: number;
  calcWidthCm: number;
  calcLengthCm: number;
  calcCutLengthCm: number;
  calcEngraveAreaCm2: number;
  calcQuantity: number;
  calcLaserPowerWatts: number;
  calcTubeCostUSD: number;
  calcTubeLifespanHours: number;
  calcElectricityRate: number;
  calcOperatorRate: number;
  calcAutoWaste: boolean;
  calcWasteOverridePercent: number;
  calcTargetProfitMargin: number;
  calcWorkType: string;
  calcSetupFeeUSD: number;
  parserInputText: string;
  chatInput: string;
  chatMessages: any[];
  fastResponseMode: boolean;
  exchangeRate: number;
  setCalcMatId: (value: string) => void;
  setCalcThicknessMm: (value: number) => void;
  setCalcMachineId: (value: string) => void;
  setCalcLaserPowerWatts: (value: number) => void;
  setCalcTubeCostUSD: (value: number) => void;
  setIsCalculatingFast: (value: boolean) => void;
  setCalcResult: (value: any) => void;
  setIsParsingFast: (value: boolean) => void;
  setParserResult: (value: any) => void;
  setLastResponseLatencyMs: (value: number) => void;
  setChatInput: (value: string) => void;
  setChatMessages: (updater: (prev: any[]) => any[]) => void;
  setIsSendingChatMessage: (value: boolean) => void;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useAiToolsActions({
  materials,
  machines,
  orders,
  customers,
  calcMatId,
  calcMachineId,
  calcThicknessMm,
  calcWidthCm,
  calcLengthCm,
  calcCutLengthCm,
  calcEngraveAreaCm2,
  calcQuantity,
  calcLaserPowerWatts,
  calcTubeCostUSD,
  calcTubeLifespanHours,
  calcElectricityRate,
  calcOperatorRate,
  calcAutoWaste,
  calcWasteOverridePercent,
  calcTargetProfitMargin,
  calcWorkType,
  calcSetupFeeUSD,
  parserInputText,
  chatInput,
  chatMessages,
  fastResponseMode,
  exchangeRate,
  setCalcMatId,
  setCalcThicknessMm,
  setCalcMachineId,
  setCalcLaserPowerWatts,
  setCalcTubeCostUSD,
  setIsCalculatingFast,
  setCalcResult,
  setIsParsingFast,
  setParserResult,
  setLastResponseLatencyMs,
  setChatInput,
  setChatMessages,
  setIsSendingChatMessage,
  addTerminalLog,
}: AiToolsActionsOptions) {
  const handleSelectCalcMaterial = (matId: string) => {
    setCalcMatId(matId);
    const selectedMat = materials.find(m => m.id === matId);
    if (selectedMat && (selectedMat as any).thickness) {
      setCalcThicknessMm((selectedMat as any).thickness);
    }
  };

  const handleSelectCalcMachine = (machineId: string) => {
    setCalcMachineId(machineId);
    if (!machineId) return;
    const selectedMach = machines.find(m => m.id === machineId);
    if (selectedMach) {
      if (selectedMach.name.includes("130W") || selectedMach.name.includes("130")) {
        setCalcLaserPowerWatts(130);
        setCalcTubeCostUSD(450);
      } else if (selectedMach.name.includes("150W") || selectedMach.name.includes("150")) {
        setCalcLaserPowerWatts(150);
        setCalcTubeCostUSD(600);
      } else if (selectedMach.name.includes("80W") || selectedMach.name.includes("80")) {
        setCalcLaserPowerWatts(80);
        setCalcTubeCostUSD(250);
      } else {
        setCalcLaserPowerWatts(100);
        setCalcTubeCostUSD(350);
      }
    }
  };

  // Fast Laser Calculator Handler
  const handleRunFastCalculator = async () => {
    setIsCalculatingFast(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "instant-pricing-calc",
          payload: {
            materialId: calcMatId,
            machineId: calcMachineId,
            thicknessMm: calcThicknessMm,
            widthCm: calcWidthCm,
            lengthCm: calcLengthCm,
            cutLengthCm: calcCutLengthCm,
            engraveAreaCm2: calcEngraveAreaCm2,
            quantity: calcQuantity,
            laserPowerWatts: calcLaserPowerWatts,
            tubeCostUSD: calcTubeCostUSD,
            tubeLifespanHours: calcTubeLifespanHours,
            electricityRatePerKwh: calcElectricityRate,
            operatorRatePerHour: calcOperatorRate,
            wasteOverridePercent: calcAutoWaste ? -1 : calcWasteOverridePercent,
            targetProfitMarginPercent: calcTargetProfitMargin,
            workType: calcWorkType,
            setupFeeUSD: calcSetupFeeUSD
          }
        })
      });
      const data = await res.json();
      setCalcResult(data);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);
      addTerminalLog("AI", `⚡ حساب بارامترات القص والأسعار بنجاح في (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("Fast Calc Error:", err);
      window.showAlert?.("خطأ في الحاسبة السريعة: " + err.message);
    } finally {
      setIsCalculatingFast(false);
    }
  };

  // Fast Order Parser Handler
  const handleRunFastParser = async () => {
    if (!parserInputText.trim()) return;
    setIsParsingFast(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-order-parser",
          payload: { rawText: parserInputText }
        })
      });
      const data = await res.json();
      setParserResult(data);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);
      addTerminalLog("AI", `⚡ تحليل وتفكيك نص الطلب دلالياً بنجاح (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("Fast Parser Error:", err);
      window.showAlert?.("خطأ في المستخرج السريع: " + err.message);
    } finally {
      setIsParsingFast(false);
    }
  };

  // Chat with AXIS AI Companion
  const handleSendChatMessage = async (overrideMessage?: string) => {
    const msg = (overrideMessage || chatInput).trim();
    if (!msg) return;

    if (!overrideMessage) {
      setChatInput("");
    }

    const startTime = performance.now();
    const userMsg = {
      id: "usr-" + Date.now(),
      sender: "user" as const,
      text: msg,
      time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChatMessage(true);
    addTerminalLog("AI", `إرسال استفسار دلالي إلى AXIS AI: "${msg.slice(0, 40)}..."`);

    try {
      if (fastResponseMode) {
        const res = await fetch("/api/ai/fast-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "fast-faqs",
            payload: { query: msg }
          })
        });

        const latency = Math.round(performance.now() - startTime);
        setLastResponseLatencyMs(latency);

        if (res.ok) {
          const data = await res.json();
          setChatMessages(prev => [...prev, {
            id: "ai-" + Date.now(),
            sender: "ai" as const,
            text: data.answer || "تمت المعالجة الفورية عبر المحرك المحلي بنجاح.",
            time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
          }]);
          addTerminalLog("AI", `⚡ رد محلي فائق السرعة (${latency}ms) ✓`);
          setIsSendingChatMessage(false);
          return;
        }
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          exchangeRate: exchangeRate,
          history: chatMessages.map(m => ({ sender: m.sender, text: m.text })).slice(-8)
        })
      });

      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاتصال بخادم الذكاء الاصطناعي");

      setChatMessages(prev => [...prev, {
        id: "ai-" + Date.now(),
        sender: "ai" as const,
        text: data.text,
        time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
      }]);
      addTerminalLog("AI", `تم الرد بنجاح (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("AI Chat error:", err);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);

      setChatMessages(prev => [...prev, {
        id: "ai-err-" + Date.now(),
        sender: "ai" as const,
        text: `⚡ **استجابة فورية محلية (AXIS AI Local Engine)**:\n- إجمالي طلبات الورشة: **${orders.length} طلبات**\n- الماكينات المسجلة: **${machines.length} ماكينات قص ليزر CO2**\n- العملاء النشطين: **${customers.length} زبائن**\n- إجمالي الأرباح والمبيعات: **$${orders.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)}**`,
        time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  return {
    handleSelectCalcMaterial,
    handleSelectCalcMachine,
    handleRunFastCalculator,
    handleRunFastParser,
    handleSendChatMessage,
  };
}

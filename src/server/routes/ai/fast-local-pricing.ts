import type { Request, Response } from "express";
import * as core from "../../server-core.ts";
const { MATERIALS, MACHINES, SETTINGS } = core;

export function handleFastLocalPricingAction(action: unknown, payload: any, req: Request, res: Response): boolean {
  switch (String(action)) {
            case "pricing-advisor": {
              const items = payload?.items || [];
              let totalSubtotal = 0;
              items.forEach((it) => {
                const q = Number(it.qty || it.quantity) || 1;
                const p = Number(it.price) || 0;
                totalSubtotal += q * p;
              });
    
              const estimatedCostUSD = Number((totalSubtotal * 0.55).toFixed(2));
              const suggestedPriceUSD = Number((totalSubtotal * 1.0).toFixed(2));
              const marginPercent = totalSubtotal > 0 ? Math.round(((totalSubtotal - estimatedCostUSD) / totalSubtotal) * 100) : 45;
    
              const pricingAuditArabic = totalSubtotal > 0
                ? `تحليل التسعير: التكلفة التقديرية المباشرة للقطع ~$${estimatedCostUSD}، إجمالي السعر الحالي $${totalSubtotal} (هامش ربح صافي ~${marginPercent}%). التسعير متوازن ومناسب لورشة الليزر.`
                : "الرجاء تحديد عناصر الطلب لكميات ورسومات القص لعرض تحليل التسعير التقديري.";
    
              res.json({
                totalCost: `$${estimatedCostUSD}`,
                suggestedPrice: `$${suggestedPriceUSD}`,
                profitMarginPercent: marginPercent,
                pricingAuditArabic
              });
              break;
            }
    
    
            case "instant-pricing-calc": {
              const {
                materialId,
                machineId,
                widthCm = 30,
                lengthCm = 40,
                thicknessMm = 3,
                cutLengthCm = 100,
                engraveAreaCm2 = 50,
                quantity = 1,
                laserPowerWatts = 100,
                tubeCostUSD: customTubeCostUSD,
                tubeLifespanHours: customTubeLifespanHours = 4000,
                electricityRatePerKwh = 0.12,
                operatorRatePerHour = 15,
                setupFeeUSD = 3,
                wasteOverridePercent,
                targetProfitMarginPercent = 50,
                workType = "cut_engrave"
              } = payload || {};
    
              const mat = MATERIALS.find(m => m.id === materialId) || MATERIALS[0];
              const exchangeRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
              // Material prices are stored in SYP. Convert to USD only for this legacy USD-based costing model.
              const matPricePerSheetSYP = Number(mat?.pricePerUnit || 0) || 1350;
              const matPricePerSheetUSD = matPricePerSheetSYP / exchangeRate;
              const sheetWidthCm = (mat as Record<string, unknown>)?.widthCm || mat?.width || 122;
              const sheetLengthCm = (mat as Record<string, unknown>)?.lengthCm || mat?.height || 244;
              const sheetAreaCm2 = Number(sheetWidthCm) * Number(sheetLengthCm);
              const pieceAreaCm2 = Math.max(1, widthCm * lengthCm);
    
              // Find machine if machineId provided
              const machine = MACHINES.find(m => m.id === machineId);
    
              // Dynamic Nesting & Waste Ratio Calculation
              const lowerMatName = (mat?.name || "").toLowerCase();
              let materialFragilityWaste = 4; // base fragility
              if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
                materialFragilityWaste = 8;
              } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf")) {
                materialFragilityWaste = 10;
              } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
                materialFragilityWaste = 12;
              }
    
              const estimatedPiecesPerSheet = Math.max(1, Math.floor(sheetAreaCm2 / (pieceAreaCm2 * 1.12)));
              const sheetUtilizationPercent = Math.min(94, Math.max(30, Math.round(((estimatedPiecesPerSheet * pieceAreaCm2) / sheetAreaCm2) * 100)));
              const autoWastePercent = Math.min(35, Math.max(5, Math.round((100 - sheetUtilizationPercent) * 0.4 + materialFragilityWaste)));
              
              const calculatedWastePercent = (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
                ? wasteOverridePercent
                : autoWastePercent;
              const wasteFactor = 1 + (calculatedWastePercent / 100);
    
              // 1. Raw material cost including exact calculated waste factor
              const rawMaterialCost = Math.max(0.15, (pieceAreaCm2 / sheetAreaCm2) * matPricePerSheetUSD * wasteFactor);
    
              // Speed & Pass Calculations
              let cutSpeedMms = 20;
              let engraveSpeedMms = 350;
              let passesCount = 1;
              let airAssistDesc = "متوسط (2.0 Bar)";
              let lensDesc = "2.0 inch Standard";
              let focalOffset = "0.0 mm (سطح الخامة)";
              let exhaustCFM = "350 CFM";
              let finishTips: string[] = [];
    
              if (lowerMatName.includes("أكريليك") || lowerMatName.includes("acrylic")) {
                cutSpeedMms = thicknessMm <= 3 ? 22 : thicknessMm <= 5 ? 12 : 6;
                engraveSpeedMms = 400;
                airAssistDesc = "منخفض جداً (0.8 Bar - Low Air) للحصول على حافة مصقولة زجاجية شفافية عالية";
                lensDesc = thicknessMm > 5 ? "2.5 inch High Focal" : "2.0 inch Standard";
                focalOffset = thicknessMm > 4 ? "+1.0 mm (حفر بؤري لعمق القص)" : "0.0 mm";
                exhaustCFM = "400 CFM (شفط كيميائي للميثاكريلات)";
                finishTips = [
                  "استخدم غطاء حماية أزرق أو ورق كرافت لمنع التخدش بقرص الخلية (Honeycomb).",
                  "تجنب ضغط الهواء المرتفع لحفظ السخونة وتلميع حافة الأكريليك بالحرارة الصافية.",
                  "امسح الحواف بكحول إيزوبروبيل بعد تبريد اللوح بـ 10 دقائق لتفادي التشقق (Crazing)."
                ];
              } else if (lowerMatName.includes("خشب") || lowerMatName.includes("wood") || lowerMatName.includes("mdf") || lowerMatName.includes("زان")) {
                cutSpeedMms = thicknessMm <= 3 ? 25 : thicknessMm <= 5 ? 14 : 7;
                passesCount = thicknessMm > 10 ? 2 : 1;
                engraveSpeedMms = 300;
                airAssistDesc = "مرتفع جداً (3.5 Bar - High Air) لمنع التفحم وإبعاد نواتج الاحتراق";
                lensDesc = thicknessMm > 6 ? "2.5 inch / 4.0 inch Deep Cut" : "2.0 inch Standard";
                focalOffset = "-0.5 mm لتركيز القوة داخل سماكة اللوح";
                exhaustCFM = "500 CFM (شفط نواتج الدخان والتراكم الراتنجي)";
                finishTips = [
                  "ضع شريط لاصق ورقي (Masking Tape) على الوجهين لمنع التلطخ بالدخان الأسود.",
                  "اضبط كمبروسر الهواء على أقصى تدفق لطرد شرر الخشب المتطاير.",
                  "سنّف الحواف بسنفرة ناعمة (رقم 320) لملمس ناعم ولون خشب طبيعي جذاب."
                ];
              } else if (lowerMatName.includes("جلد") || lowerMatName.includes("leather")) {
                cutSpeedMms = 30;
                engraveSpeedMms = 450;
                airAssistDesc = "متوسط (1.8 Bar)";
                lensDesc = "1.5 inch / 2.0 inch Fine Engrave";
                finishTips = [
                  "امسح سطح الجلد بقطعة قماش مبللة بماء ورد أو كحول خفيف فور انتهاء الحفر.",
                  "استخدم قوة نقش منخفضة (15-20%) لتجنب رائحة الاحتراق العميقة."
                ];
              }
    
              // Active execution time calculation
              const cutTimeSec = (cutLengthCm * 10) / Math.max(1, cutSpeedMms);
              const engraveTimeSec = (engraveAreaCm2 * 100) / Math.max(1, engraveSpeedMms);
              const activeMachineTimeMin = (cutTimeSec * passesCount + engraveTimeSec) / 60;
              const setupAndCleanTimeMin = 1.5;
              const totalTimeMinutes = Math.max(0.5, activeMachineTimeMin + setupAndCleanTimeMin);
    
              // 2. Electricity cost (Laser Machine Tube Power + Chiller ~1200W + Exhaust Blower ~450W + Air Compressor ~350W)
              const totalKwPower = Number((((laserPowerWatts * 1.25) + 1800) / 1000).toFixed(2)); // Total system kW
              const activeHours = activeMachineTimeMin / 60;
              const electricityCost = (totalKwPower * activeHours) * electricityRatePerKwh;
    
              // 3. CO2 Laser Tube wear/depreciation cost
              const tubeReplacementCostUSD = (typeof customTubeCostUSD === 'number' && customTubeCostUSD > 0)
                ? customTubeCostUSD
                : (laserPowerWatts * 2.5); // Estimated tube replacement cost
              const tubeLifespanHours = (typeof customTubeLifespanHours === 'number' && customTubeLifespanHours > 0)
                ? customTubeLifespanHours
                : 4000;
              
              const thermalStressMultiplier = thicknessMm > 5 ? 1.15 : 1.0;
              const tubeWearCost = activeHours * (tubeReplacementCostUSD / tubeLifespanHours) * thermalStressMultiplier;
    
              // 4. Labor & technician operator cost
              const totalTimeHours = totalTimeMinutes / 60;
              const laborCost = totalTimeHours * operatorRatePerHour;
    
              // 5. Distributed setup fee
              const setupFeePerUnit = setupFeeUSD / Math.max(1, quantity);
    
              // Total Direct Unit Cost
              const totalDirectCost = rawMaterialCost + electricityCost + tubeWearCost + laborCost + setupFeePerUnit;
    
              // Dynamic Profit Margin & Price Calculation
              const desiredMarginRatio = Math.min(0.95, Math.max(0.05, (typeof targetProfitMarginPercent === 'number' ? targetProfitMarginPercent : 50) / 100));
              const calculatedPrice = totalDirectCost / (1 - desiredMarginRatio);
              const suggestedUnitFinalPrice = Math.max(1, Math.ceil(calculatedPrice));
              const unitProfitMargin = Math.max(0.1, suggestedUnitFinalPrice - totalDirectCost);
              const profitPerUnitUSD = Number(unitProfitMargin.toFixed(2));
              const profitMarginPercent = Math.round((profitPerUnitUSD / suggestedUnitFinalPrice) * 100);
    
              // Batch Calculations
              const discountFactor = quantity >= 50 ? 0.85 : quantity >= 20 ? 0.90 : quantity >= 10 ? 0.95 : 1.0;
              const totalBatchRevenueUSD = Math.round(suggestedUnitFinalPrice * quantity * discountFactor);
              const totalBatchCostUSD = Number((totalDirectCost * quantity).toFixed(2));
              const totalBatchProfitUSD = Number(Math.max(0, totalBatchRevenueUSD - totalBatchCostUSD).toFixed(2));
    
              const detailedFinancials = {
                rawMaterialWithWasteUSD: Number(rawMaterialCost.toFixed(3)),
                electricityCostUSD: Number(electricityCost.toFixed(3)),
                tubeDepreciationCostUSD: Number(tubeWearCost.toFixed(3)),
                laborCostUSD: Number(laborCost.toFixed(3)),
                setupFeePerUnitUSD: Number(setupFeePerUnit.toFixed(2)),
                totalDirectCostUSD: Number(totalDirectCost.toFixed(2)),
                profitPerUnitUSD,
                profitMarginPercent,
                sheetUtilizationPercent,
                calculatedWastePercent,
                totalBatchCostUSD
              };
    
              const formulas = {
                rawMaterial: `(مساحة القطعة ${pieceAreaCm2}سم² ÷ مساحة اللوح ${sheetAreaCm2}سم²) × سعر اللوح ${matPricePerSheetSYP.toLocaleString()} ل.س ÷ سعر الصرف ${exchangeRate} × معامل الهدر ${(wasteFactor).toFixed(2)} = $${rawMaterialCost.toFixed(3)}`,
                electricity: `قدرة النظام الكلية (${totalKwPower} kW) × زمن التشغيل الفعلي (${activeMachineTimeMin.toFixed(2)} دقيقة) × تعرفة الكيلوواط ($${electricityRatePerKwh}/kWh) = $${electricityCost.toFixed(3)}`,
                tubeWear: `ساعات الحرق الفعلي (${activeHours.toFixed(3)} ساعة) × (سعر الأنبوب $${tubeReplacementCostUSD} ÷ العمر ${tubeLifespanHours} ساعة) = $${tubeWearCost.toFixed(3)}`,
                labor: `زمن الإنتاج والتجهيز المباشر (${totalTimeMinutes.toFixed(1)} دقيقة) × أجر الفني ($${operatorRatePerHour}/ساعة) = $${laborCost.toFixed(3)}`,
                setup: `رسوم تجهيز الورشة والمعايرة ($${setupFeeUSD}) ÷ الكمية (${quantity} قطعة) = $${setupFeePerUnit.toFixed(2)}`,
                wasteExplanation: (typeof wasteOverridePercent === 'number' && wasteOverridePercent >= 0)
                  ? `تم تحديد نسبة الهدر يدوياً (%${wasteOverridePercent})`
                  : `تم حساب الهدر تلقائياً (%${calculatedWastePercent}) بناءً على هدر التعشيق المتبقي (%${100 - sheetUtilizationPercent}) ومعامل هشاشة خامة ${mat.name}`
              };
    
              res.json({
                materialName: mat.name,
                machineName: machine ? machine.name : `ماكينة ليزر CO2 قدرة ${laserPowerWatts}W`,
                thicknessMm,
                sheetDimensionsCm: `${sheetWidthCm}x${sheetLengthCm}`,
                pieceDimensionsCm: `${widthCm}x${lengthCm}`,
                quantity,
                workType,
                costBreakdown: {
                  rawMaterialUSD: Number(rawMaterialCost.toFixed(3)),
                  electricityUSD: Number(electricityCost.toFixed(3)),
                  tubeWearUSD: Number(tubeWearCost.toFixed(3)),
                  laborUSD: Number(laborCost.toFixed(3)),
                  setupFeeUSD: Number(setupFeeUSD.toFixed(2)),
                  totalUnitCostUSD: Number(totalDirectCost.toFixed(2)),
                  unitProfitMarginUSD: Number(unitProfitMargin.toFixed(2))
                },
                financialBreakdown: detailedFinancials,
                formulas,
                machineSpecs: {
                  laserPowerWatts,
                  totalKwPower,
                  tubeReplacementCostUSD,
                  tubeLifespanHours,
                  electricityRatePerKwh,
                  operatorRatePerHour
                },
                batchFinancials: {
                  totalBatchCostUSD,
                  totalBatchPriceUSD: totalBatchRevenueUSD,
                  totalBatchPriceSYP: Math.round(totalBatchRevenueUSD * exchangeRate),
                  totalBatchProfitUSD,
                  totalBatchProfitSYP: Math.round(totalBatchProfitUSD * exchangeRate),
                  appliedDiscountPercent: Math.round((1 - discountFactor) * 100)
                },
                batchTotals: {
                  quantity,
                  totalTimeMinutes: Number((totalTimeMinutes * quantity).toFixed(1)),
                  totalBatchCostUSD,
                  totalBatchRevenueUSD,
                  totalBatchProfitUSD
                },
                suggestedPriceUSD: suggestedUnitFinalPrice,
                suggestedPriceSYP: Math.round(suggestedUnitFinalPrice * exchangeRate),
                timeBreakdown: {
                  cutTimeMinutes: Number((cutTimeSec / 60).toFixed(2)),
                  engraveTimeMinutes: Number((engraveTimeSec / 60).toFixed(2)),
                  setupTimeMinutes: setupAndCleanTimeMin,
                  totalTimeMinutes: Number(totalTimeMinutes.toFixed(1))
                },
                recommendedSettings: {
                  laserPowerWatts,
                  speedMms: cutSpeedMms,
                  powerPercent: thicknessMm > 4 ? 85 : 75,
                  passCount: passesCount,
                  passes: passesCount,
                  engraveSpeedMms,
                  engravePowerPercent: 20,
                  frequencyHzDpi: "5000 Hz / 318 DPI",
                  airAssist: airAssistDesc,
                  lens: lensDesc,
                  focalOffsetMm: focalOffset,
                  exhaustCFM,
                  finishTips,
                  safetyNotes: "تحقق من نظافة مرآة الانعكاس رقم 3 ونظافة العدسة البؤرية قبل البدء لضمان قطع ناصع."
                }
              });
              break;
            }
    
    default:
      return false;
  }
  return true;
}

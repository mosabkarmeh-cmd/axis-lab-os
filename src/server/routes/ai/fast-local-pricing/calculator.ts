import * as core from "../../../server-core.ts";
import type { FastLocalPayload } from "../fast-local-types.ts";
import { getMaterialProcessProfile } from "./profile.ts";
import { calculateMaterialUsage } from "./nesting.ts";

const { MATERIALS, MACHINES, SETTINGS } = core;

export function calculateInstantPricing(payload: FastLocalPayload) {
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
    
              const lowerMatName = (mat?.name || "").toLowerCase();
              const materialUsage = calculateMaterialUsage({
                materialName: lowerMatName,
                sheetAreaCm2,
                pieceAreaCm2,
                matPricePerSheetUSD,
                wasteOverridePercent,
              });
              const {
                sheetUtilizationPercent,
                calculatedWastePercent,
                wasteFactor,
                rawMaterialCost,
              } = materialUsage;

              const processProfile = getMaterialProcessProfile(lowerMatName, thicknessMm);
              const {
                cutSpeedMms,
                engraveSpeedMms,
                passesCount,
                airAssistDesc,
                lensDesc,
                focalOffset,
                exhaustCFM,
                finishTips,
              } = processProfile;

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
    
              return {
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
              };
}

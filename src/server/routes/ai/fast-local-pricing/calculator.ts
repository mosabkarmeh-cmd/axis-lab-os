import * as core from "../../../server-core.ts";
import type { FastLocalPayload } from "../fast-local-types.ts";

const { MATERIALS, MACHINES, SETTINGS } = core;

export function calculateInstantPricing(payload: FastLocalPayload) {
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
              });
              break;
            }
}

export interface MaterialUsageInput {
  materialName: string;
  sheetAreaCm2: number;
  pieceAreaCm2: number;
  matPricePerSheetUSD: number;
  wasteOverridePercent?: number;
}

export interface MaterialUsageResult {
  estimatedPiecesPerSheet: number;
  sheetUtilizationPercent: number;
  autoWastePercent: number;
  calculatedWastePercent: number;
  wasteFactor: number;
  rawMaterialCost: number;
}

export function calculateMaterialUsage(input: MaterialUsageInput): MaterialUsageResult {
  const lowerMaterialName = input.materialName.toLowerCase();
  let materialFragilityWaste = 4;

  if (lowerMaterialName.includes("أكريليك") || lowerMaterialName.includes("acrylic")) {
    materialFragilityWaste = 8;
  } else if (
    lowerMaterialName.includes("خشب") ||
    lowerMaterialName.includes("wood") ||
    lowerMaterialName.includes("mdf")
  ) {
    materialFragilityWaste = 10;
  } else if (
    lowerMaterialName.includes("جلد") ||
    lowerMaterialName.includes("leather")
  ) {
    materialFragilityWaste = 12;
  }

  const estimatedPiecesPerSheet = Math.max(
    1,
    Math.floor(input.sheetAreaCm2 / (input.pieceAreaCm2 * 1.12)),
  );
  const sheetUtilizationPercent = Math.min(
    94,
    Math.max(
      30,
      Math.round(
        ((estimatedPiecesPerSheet * input.pieceAreaCm2) / input.sheetAreaCm2) * 100,
      ),
    ),
  );
  const autoWastePercent = Math.min(
    35,
    Math.max(5, Math.round((100 - sheetUtilizationPercent) * 0.4 + materialFragilityWaste)),
  );
  const calculatedWastePercent =
    typeof input.wasteOverridePercent === "number" && input.wasteOverridePercent >= 0
      ? input.wasteOverridePercent
      : autoWastePercent;
  const wasteFactor = 1 + calculatedWastePercent / 100;
  const rawMaterialCost = Math.max(
    0.15,
    (input.pieceAreaCm2 / input.sheetAreaCm2) * input.matPricePerSheetUSD * wasteFactor,
  );

  return {
    estimatedPiecesPerSheet,
    sheetUtilizationPercent,
    autoWastePercent,
    calculatedWastePercent,
    wasteFactor,
    rawMaterialCost,
  };
}

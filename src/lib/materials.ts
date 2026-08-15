export function extractMaterialName(item: Record<string, unknown>): string {
  if (typeof item.material === "string" && item.material.trim()) return item.material.trim();
  if (typeof item.materialCategory === "string" && item.materialCategory.trim()) return item.materialCategory.trim();
  const name = String(item.productName || item.name || "").trim();
  if (/أكريليك|اكريليك|acrylic/i.test(name)) {
    const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
    return thicknessMatch ? `أكريليك ${thicknessMatch[0]}` : "أكريليك";
  }
  if (/mdf|ام دي اف|أم دي إف/i.test(name)) {
    const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
    return thicknessMatch ? `خشب MDF ${thicknessMatch[0]}` : "خشب MDF";
  }
  if (/خشب|خشبي|زان|سويد|بلوط|معاكس|wood/i.test(name)) {
    const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
    return thicknessMatch ? `خشب ${thicknessMatch[0]}` : "خشب طبيعي/معاكس";
  }
  if (/جلد|leather/i.test(name)) return "جلود وقماش";
  if (/صاج|حديد|معادن|ستانلس|stainless|metal/i.test(name)) return "معادن وستانلس";
  return name || "مواد عامة";
}

/** The API and database store material unit prices in USD. */
export function materialPriceUSD(pricePerUnit: unknown, _exchangeRate: number): number {
  return Number(pricePerUnit) || 0;
}

export function materialPriceSYP(pricePerUnit: unknown, exchangeRate: number): number {
  return Math.round(materialPriceUSD(pricePerUnit, exchangeRate) * exchangeRate);
}

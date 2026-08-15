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

/**
 * pricePerUnit is USD in the API/database. Values >= 10,000 are treated as
 * legacy SYP values from versions that displayed the editor in local currency.
 */
export function materialPriceUSD(pricePerUnit: unknown, exchangeRate: number): number {
  const value = Number(pricePerUnit) || 0;
  const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 135;
  return value >= 10_000 ? value / rate : value;
}

export function materialPriceSYP(pricePerUnit: unknown, exchangeRate: number): number {
  return Math.round(materialPriceUSD(pricePerUnit, exchangeRate) * exchangeRate);
}

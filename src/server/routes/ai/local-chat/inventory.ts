import * as core from "../../../server-core.ts";
import type { AiStats } from "./types.ts";

const { MATERIALS, REMNANTS } = core;

export function getInventoryChatResponse(
  msgNorm: string,
  stats: AiStats,
): string | null {
  const inventoryKeywords = [
    "مخزن",
    "مخزون",
    "خامات",
    "مواد",
    "مستودع",
    "بقايا",
    "بواقي",
    "لوح",
    "الواح",
  ];

  if (!inventoryKeywords.some(keyword => msgNorm.includes(keyword))) {
    return null;
  }

  const leftovers = REMNANTS.filter(remnant => remnant.quantity > 0).slice(0, 5);

  return `📦 **تقرير إدارة المستودع والخامات والبقايا**:

• **الخامات منخفضة المخزون**:
  ${stats.lowStockMaterials.length > 0
    ? `⚠️ المواد التالية تحتاج متابعة: **${stats.lowStockMaterials.join(" - ")}**`
    : "✓ حالة المخزون ضمن الحدود الحالية."}

• **أمثلة على البقايا المتوفرة**:
  ${leftovers.map(remnant => {
    const materialName =
      MATERIALS.find(material => material.id === remnant.materialId)?.name ||
      "خامة";
    return `- **${materialName}**: أبعاد \`${remnant.width}x${remnant.height} مم\` - الكمية: \`${remnant.quantity}\``;
  }).join("\n") || "لا توجد بقايا ألواح مسجلة حالياً."}

💡 **نصيحة**: استخدم البقايا القابلة للاستفادة في الأعمال الصغيرة قبل فتح لوح جديد لتقليل الهدر.`;
}

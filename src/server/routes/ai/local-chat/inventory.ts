import * as core from "../../../server-core.ts";
import type { AiStats } from "./types.ts";
import { normalizeArabicAndDialect } from "./normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getInventoryChatResponse(msgNorm: string, stats: AiStats): string | null {

    if (
      msgNorm.includes("مخزن") || 
      msgNorm.includes("مخزون") || 
      msgNorm.includes("خامات") || 
      msgNorm.includes("مواد") || 
      msgNorm.includes("مستودع") || 
      msgNorm.includes("بقايا") || 
      msgNorm.includes("بواقي") || 
      msgNorm.includes("لوح") || 
      msgNorm.includes("الواح")
    ) {
      const leftoversList = REMNANTS.filter(r => r.quantity > 0).slice(0, 5);

      return `📦 **تقرير إدارة المستودع، الخامات، وبقايا الألواح** (تحديث فوري):

• **حالة الخامات والمواد الأولية**:
  ${lowStockMaterials.length > 0 
    ? `⚠️ **تحذير خامات منخفضة**: المواد التالية قاربت على النفاد وتحتاج لشراء فوري: **${lowStockMaterials.join(" - ")}**` 
    : "✓ **حالة المخزون ممتازة**: جميع الخامات والمواد الأساسية متوفرة بكميات كافية وفوق حد الأمان."}

• **أمثلة على بقايا المواد (Remnants) المتوفرة للاستغلال**:
  ${leftoversList.map(r => {
    const matName = MATERIALS.find(m => m.id === r.materialId)?.name || "خامة";
    return `- **${matName}**: أبعاد \`${r.width}x${r.height} مم\` - الكمية: \`${r.quantity}\` (${r.status === 'ready' ? 'جاهز للاستخدام' : 'مستهلك جزئياً'})`;
  }).join('\n') || "لا توجد بقايا ألواح مسجلة حالياً."}

💡 **نصيحة تقليل الهدر**:
- يُفضل دائماً البحث في قائمة "بقايا الألواح المتاحة" لتنفيذ تصاميم العملاء الصغيرة قبل استهلاك لوح جديد كامل لتوفير التكلفة وزيادة الربحية.`;
    }
  return null;
}

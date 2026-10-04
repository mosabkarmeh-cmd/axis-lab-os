import * as core from "../../../server-core.ts";
import type { AiStats } from "../local-chat/types.ts";
import { normalizeArabicAndDialect } from "../local-chat/normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getForecastChatResponse(msgNorm: string, stats: AiStats, rate: number): string | null {

    if (!stats.canViewFinancials && (
      msgNorm.includes("توقع") ||
      msgNorm.includes("تنبؤ") ||
      msgNorm.includes("الشهر") ||
      msgNorm.includes("القادم") ||
      msgNorm.includes("تحليل")
    )) {
      return "🔒 التنبؤات المالية مؤمنة لحسابات الإدارة والحسابات فقط.";
    }
    if (
      msgNorm.includes("توقع") || 
      msgNorm.includes("تنبؤ") || 
      msgNorm.includes("مستقبل") || 
      msgNorm.includes("الشهر") || 
      msgNorm.includes("القادم") ||
      msgNorm.includes("تحليل")
    ) {
      const averageOrderVal = ordersCount > 0 ? (totalRevenue / ordersCount) : 0;
      const forecastedRevenue = averageOrderVal * (ordersCount * 1.15);
      return `🔮 **تنبؤات ومؤشرات التنمية الذكية لورشة AXIS LAB** (استدلال محلي):

استناداً إلى تحليل نشاط الورشة وتاريخ الطلبات والعملاء الحالي:
• **متوسط قيمة الطلب الفردي (Ticket Size)**: $${averageOrderVal.toFixed(2)} (${Math.round(averageOrderVal * rate).toLocaleString()} ل.س)
• **معدل نمو الطلبات المتوقع**: زيادة بنسبة **%15** في حجم الطلبيات للربع السنوي القادم.

📈 **توقعات الشهر القادم**:
- **تقدير المبيعات**: **$${forecastedRevenue.toFixed(2)}** (${Math.round(forecastedRevenue * rate).toLocaleString()} ل.س)
- **المواد الأكثر استهلاكاً**: الأكريليك الشفاف 3مم، خشب MDF 5مم.
- **توصية تشغيلية**: يُقترح تأمين كميات احتياطية من ألواح الأكريليك وتأكيد صيانة رؤوس الليزر والمرايا قبل انطلاق موسم الأعياد واللوحات الدعائية لضمان استمرارية التشغيل دون انقطاع.`;
    }
  return null;
}

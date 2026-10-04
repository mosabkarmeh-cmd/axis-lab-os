import type { AiStats } from "./types.ts";

export function getForecastChatResponse(
  msgNorm: string,
  stats: AiStats,
  rate: number,
): string | null {
  const forecastKeywords = [
    "توقع",
    "تنبؤ",
    "مستقبل",
    "الشهر",
    "القادم",
    "تحليل",
  ];
  if (!forecastKeywords.some(keyword => msgNorm.includes(keyword))) {
    return null;
  }

  if (stats.canViewFinancials !== true) {
    return "🔒 التنبؤات المالية مؤمنة لحسابات الإدارة والحسابات فقط.";
  }

  const averageOrderValue =
    stats.ordersCount > 0 ? stats.totalRevenue / stats.ordersCount : 0;
  const forecastedRevenue = averageOrderValue * (stats.ordersCount * 1.15);

  return `🔮 **تنبؤات ومؤشرات التنمية الذكية لورشة AXIS LAB**:

• **متوسط قيمة الطلب**: $${averageOrderValue.toFixed(2)} (${Math.round(averageOrderValue * rate).toLocaleString()} ل.س)
• **معدل النمو المفترض**: زيادة بنسبة **%15** في حجم الطلبات القادمة.
• **تقدير المبيعات القادم**: **$${forecastedRevenue.toFixed(2)}** (${Math.round(forecastedRevenue * rate).toLocaleString()} ل.س)

📈 **توصية تشغيلية**:
تأمين المواد ذات الاستهلاك الأعلى ومراجعة خطة صيانة الليزر قبل فترات الضغط التشغيلي.`;
}

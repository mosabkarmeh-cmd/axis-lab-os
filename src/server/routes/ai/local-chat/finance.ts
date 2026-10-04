import * as core from "../../../server-core.ts";
import type { AiStats } from "../local-chat/types.ts";
import { normalizeArabicAndDialect } from "../local-chat/normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getFinanceChatResponse(msgNorm: string, stats: AiStats, rate: number): string | null {

    if (!stats.canViewFinancials && (
      msgNorm.includes("مبيعات") ||
      msgNorm.includes("ارباح") ||
      msgNorm.includes("مصروف") ||
      msgNorm.includes("ميزانيه") ||
      msgNorm.includes("فلوس") ||
      msgNorm.includes("مالي") ||
      msgNorm.includes("ايراد") ||
      msgNorm.includes("ديون") ||
      msgNorm.includes("ذمم") ||
      msgNorm.includes("حسابات")
    )) {
      return "🔒 هذا الجزء من بيانات النظام المالي محجوب عن حساب الموظف. يمكنك استخدام مساعد الورشة للأسئلة التشغيلية والليزر والمخزون.";
    }
    if (
      msgNorm.includes("مبيعات") || 
      msgNorm.includes("ارباح") || 
      msgNorm.includes("مصروف") || 
      msgNorm.includes("ميزانيه") || 
      msgNorm.includes("فلوس") || 
      msgNorm.includes("كشف") || 
      msgNorm.includes("مالي") || 
      msgNorm.includes("ايراد") || 
      msgNorm.includes("ديون") || 
      msgNorm.includes("ذمم") ||
      msgNorm.includes("حسابات")
    ) {
      const totalExpenses = EXPENSES.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
      const recoveryRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "0";

      return `💰 **تقرير الأداء المالي والربحي الشامل للورشة** (محلي ومغلق بدون إنترنت):

• **إجمالي المبيعات والطلبيات**: $${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalRevenue * rate).toLocaleString()} ل.س)
• **إجمالي المبالغ المحصلة (المقبوضات)**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalPaid * rate).toLocaleString()} ل.س)
• **إجمالي الذمم المعلقة بذمة العملاء**: $${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalDebt * rate).toLocaleString()} ل.س)
• **إجمالي النفقات والمصروفات التشغيلية**: $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalExpenses * rate).toLocaleString()} ل.س)
• **صافي الأرباح التشغيلية**: **$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(netProfit * rate).toLocaleString()} ل.س)
• **هامش الربح التشغيلي**: **%${profitMargin}**
• **نسبة تحصيل الديون والسيولة**: %${recoveryRate}

📈 **توصية استشارية مالية**:
- ${netProfit > 0 ? "الوضع المالي للورشة مستقر بمسار ربحي واعد ومتزن." : "يُنصح بفحص المصروفات التشغيلية فوراً لتفادي تآكل هامش الأرباح."}
- تبلغ الديون المتبقية بذمة العملاء %${((totalDebt / totalRevenue) * 100).toFixed(1)} من إجمالي أعمالك. يرجى توجيه موظف الحسابات لمتابعة كشوف حسابات العملاء المعلقة باللون الأحمر لتعزيز السيولة بالورشة.`;
    }
  return null;
}

import * as core from "../../../server-core.ts";
import type { AiStats } from "./types.ts";

const { EXPENSES, ORDERS } = core;

export function getFinanceChatResponse(
  msgNorm: string,
  stats: AiStats,
  rate: number,
): string | null {
  const financeKeywords = [
    "مبيعات",
    "ارباح",
    "مصروف",
    "ميزانيه",
    "فلوس",
    "كشف",
    "مالي",
    "ايراد",
    "ديون",
    "ذمم",
    "حسابات",
  ];

  const isFinancialQuestion = financeKeywords.some(keyword =>
    msgNorm.includes(keyword),
  );
  if (!isFinancialQuestion) return null;

  if (stats.canViewFinancials !== true) {
    return "🔒 هذا الجزء من بيانات النظام المالي محجوب عن حساب الموظف. يمكنك استخدام مساعد الورشة للأسئلة التشغيلية والليزر والمخزون.";
  }

  const totalRevenue = ORDERS.reduce(
    (sum, order) => sum + (Number(order.totalPrice) || 0),
    0,
  );
  const totalPaid = ORDERS.reduce(
    (sum, order) => sum + (Number(order.paidAmount) || 0),
    0,
  );
  const totalDebt = Math.max(0, totalRevenue - totalPaid);
  const totalExpenses = EXPENSES.reduce(
    (sum, expense) => sum + (Number(expense.amount) || 0),
    0,
  );
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin =
    totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
  const recoveryRate =
    totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "0";
  const debtRatio =
    totalRevenue > 0 ? ((totalDebt / totalRevenue) * 100).toFixed(1) : "0";

  return `💰 **تقرير الأداء المالي والربحي الشامل للورشة**:

• **إجمالي المبيعات والطلبيات**: $${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalRevenue * rate).toLocaleString()} ل.س)
• **إجمالي المبالغ المحصلة**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalPaid * rate).toLocaleString()} ل.س)
• **إجمالي الذمم المعلقة**: $${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalDebt * rate).toLocaleString()} ل.س)
• **إجمالي المصروفات التشغيلية**: $${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalExpenses * rate).toLocaleString()} ل.س)
• **صافي الأرباح التشغيلية**: **$${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(netProfit * rate).toLocaleString()} ل.س)
• **هامش الربح التشغيلي**: **%${profitMargin}**
• **نسبة التحصيل**: %${recoveryRate}
• **نسبة الذمم من إجمالي الأعمال**: %${debtRatio}`;
}

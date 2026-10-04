import * as core from "../../../server-core.ts";
import type { AiStats } from "./types.ts";
import { normalizeArabicAndDialect } from "./normalization.ts";

const { CUSTOMERS, ORDERS } = core;

export function getCustomerChatResponse(
  message: string,
  stats: AiStats,
  rate: number,
): string | null {
  const msgNorm = normalizeArabicAndDialect(message);

  const matchedCustomer = CUSTOMERS.find(customer => {
    const normName = normalizeArabicAndDialect(customer.name);
    return (
      msgNorm.includes(normName) ||
      normName.includes(msgNorm) ||
      Boolean(customer.phone && message.includes(customer.phone))
    );
  });

  if (!matchedCustomer) return null;

  const customerOrders = ORDERS.filter(
    order =>
      order.customerId === matchedCustomer.id ||
      order.customerName === matchedCustomer.name,
  );
  const totalInvoiced = customerOrders.reduce(
    (sum, order) => sum + (Number(order.totalPrice) || 0),
    0,
  );
  const totalPaid = customerOrders.reduce(
    (sum, order) => sum + (Number(order.paidAmount) || 0),
    0,
  );
  const totalDebt = Math.max(0, totalInvoiced - totalPaid);

  if (
    stats.canViewFinancials === false ||
    stats.canViewCustomerPrivateData === false
  ) {
    return `👤 **ملخص العميل: "${matchedCustomer.name}"**:

• **عدد الطلبات المسجلة**: ${customerOrders.length} طلب
• **الحالة التشغيلية**: ${customerOrders.some(order =>
      ["new", "in_progress", "cutting", "assembly"].includes(order.status || ""),
    ) ? "لديه طلبات قيد التنفيذ أو المتابعة." : "لا توجد طلبات نشطة حالياً."}
• **آخر الطلبات**:
${customerOrders.slice(0, 5).map(order => `- طلب رقم \`${order.id}\` - الحالة: ${["completed", "delivered"].includes(order.status || "") ? "مكتمل" : "قيد المعالجة"}`).join("\n") || "لا توجد طلبات سابقة مسجلة."}

🔒 البيانات المالية وبيانات الاتصال بالعميل محجوبة حسب صلاحية الحساب.`;
  }

  return `📊 **كشف الحساب المالي والإنتاجي التفصيلي للعميل: "${matchedCustomer.name}"**:

• **إجمالي الطلبات المسجلة**: ${customerOrders.length} طلب
• **إجمالي قيمة الأعمال والطلبات**: $${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalInvoiced * rate).toLocaleString()} ل.س)
• **إجمالي المقبوض والمسدد فعلياً**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(totalPaid * rate).toLocaleString()} ل.س)
• **الرصيد المتبقي بذمته**: **$${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(totalDebt * rate).toLocaleString()} ل.س)
• **حالة الحساب المالي**: ${totalDebt > 0 ? "🔴 ذمة مالية معلقة غير مسددة بالكامل." : "🟢 الحساب مسدد بالكامل."}
• **رقم الهاتف المسجل**: \`${matchedCustomer.phone || "غير مسجل"}\`
• **العنوان الجغرافي**: \`${matchedCustomer.address || "غير مسجل"}\`

📈 **آخر طلبات العميل**:
${customerOrders.slice(0, 5).map(order =>
    `- طلب رقم \`${order.id}\` بقيمة **$${Number(order.totalPrice || 0).toFixed(2)}** - الحالة: ${order.status === "completed" || order.status === "delivered" ? "✓ مكتمل" : "⏳ قيد المعالجة"}`,
  ).join("\n") || "لا توجد طلبات سابقة مسجلة."}`;
}

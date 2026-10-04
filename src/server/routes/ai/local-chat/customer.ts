import * as core from "../../../server-core.ts";
import { normalizeArabicAndDialect, type AiStats } from "../local-chat.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;
export function getCustomerChatResponse(message: string, stats: AiStats, rate: number): string | null {

    const matchedCustomer = CUSTOMERS.find(c => {
      const normName = normalizeArabicAndDialect(c.name);
      return msgNorm.includes(normName) || normName.includes(msgNorm) || (c.phone && message.includes(c.phone));
    });

    if (matchedCustomer) {
      const custOrders = ORDERS.filter(o => o.customerId === matchedCustomer.id || o.customerName === matchedCustomer.name);
      const custTotalInvoiced = custOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const custTotalPaid = custOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
      const custTotalDebt = Math.max(0, custTotalInvoiced - custTotalPaid);

      if (stats.canViewFinancials === false || stats.canViewCustomerPrivateData === false) {
        return `👤 **ملخص العميل: "${matchedCustomer.name}"**:

• **عدد الطلبات المسجلة**: ${custOrders.length}
• **الحالة التشغيلية**: ${custOrders.filter(o => ["new", "in_progress", "cutting", "assembly"].includes(o.status || "")).length > 0 ? "لديه طلبات قيد التنفيذ أو المتابعة." : "لا توجد طلبات نشطة حالياً."}
• **آخر الطلبات**:
${custOrders.slice(0, 5).map(o => `- طلب رقم \`${o.id}\` - الحالة: ${o.status === "completed" || o.status === "delivered" ? "مكتمل" : "قيد المعالجة"}`).join("\n") || "لا توجد طلبات سابقة مسجلة."}

🔒 البيانات المالية وبيانات الاتصال بالعميل محجوبة حسب صلاحية الحساب.`;
      }
      
      return `📊 **كشف الحساب المالي والإنتاجي التفصيلي للعميل: "${matchedCustomer.name}"** (محلي ومدمج 100%):

• **إجمالي الطلبيات المسجلة**: ${custOrders.length} طلبات
• **إجمالي قيمة الأعمال والطلبات**: $${custTotalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalInvoiced * rate).toLocaleString()} ل.س)
• **إجمالي المقبوض والمسدد فعلياً**: $${custTotalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${Math.round(custTotalPaid * rate).toLocaleString()} ل.س)
• **الرصيد المتبقي بذمته المعلقة**: **$${custTotalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}** (${Math.round(custTotalDebt * rate).toLocaleString()} ل.س)
• **حالة الحساب المالي**: ${custTotalDebt > 0 ? "🔴 ذمة مالية معلقة غير مسددة بالكامل." : "🟢 الحساب مسدد بالكامل، عميل متميز!"}
• **رقم الهاتف المسجل**: \`${matchedCustomer.phone || "غير مسجل"}\`
• **العنوان الجغرافي**: \`${matchedCustomer.address || "غير مسجل"}\`

📈 **آخر طلبات العميل**:
${custOrders.slice(0, 5).map(o => `- طلب رقم \`${o.id}\` بقيمة **$${o.totalPrice}** - الحالة: ${o.status === 'completed' ? '✓ مكتمل' : '⏳ قيد المعالجة'}`).join('\n') || "لا توجد طلبات سابقة مسجلة."}`;
    }
  return null;
}

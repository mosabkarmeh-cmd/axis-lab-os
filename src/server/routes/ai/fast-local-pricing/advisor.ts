import type { FastLocalPayload } from "../fast-local-types.ts";

export function getPricingAdvisorResponse(payload: FastLocalPayload) {
const items = payload?.items || [];
              let totalSubtotal = 0;
              items.forEach((it) => {
                const q = Number(it.qty || it.quantity) || 1;
                const p = Number(it.price) || 0;
                totalSubtotal += q * p;
              });
    
              const estimatedCostUSD = Number((totalSubtotal * 0.55).toFixed(2));
              const suggestedPriceUSD = Number((totalSubtotal * 1.0).toFixed(2));
              const marginPercent = totalSubtotal > 0 ? Math.round(((totalSubtotal - estimatedCostUSD) / totalSubtotal) * 100) : 45;
    
              const pricingAuditArabic = totalSubtotal > 0
                ? `تحليل التسعير: التكلفة التقديرية المباشرة للقطع ~$${estimatedCostUSD}، إجمالي السعر الحالي $${totalSubtotal} (هامش ربح صافي ~${marginPercent}%). التسعير متوازن ومناسب لورشة الليزر.`
                : "الرجاء تحديد عناصر الطلب لكميات ورسومات القص لعرض تحليل التسعير التقديري.";
    
              return {
                totalCost: `$${estimatedCostUSD}`,
                suggestedPrice: `$${suggestedPriceUSD}`,
                profitMarginPercent: marginPercent,
                pricingAuditArabic
              };
}

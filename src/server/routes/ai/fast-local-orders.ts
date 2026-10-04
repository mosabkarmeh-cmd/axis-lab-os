import type { Request, Response } from "express";
import * as core from "../../server-core.ts";
const { ORDERS, CUSTOMERS, MATERIALS, INVENTORY } = core;

export function handleFastLocalOrderAction(action: unknown, payload: any, req: Request, res: Response): boolean {
  switch (String(action)) {
            case "order-hints": {
              const customerId = payload?.customerId;
              const cust = CUSTOMERS.find(c => c.id === customerId);
              const customerOrders = ORDERS.filter(o => o.customerId === customerId);
              const isVIP = cust ? (customerOrders.length >= 3 || customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0) >= 200) : false;
    
              let recommendedItem = "قص ونقش أخشاب زان / أكريليك مخصص";
              if (customerOrders.length > 0) {
                const itemCounts: Record<string, number> = {};
                customerOrders.forEach(o => {
                  if (o.items && Array.isArray(o.items)) {
                    o.items.forEach((it) => {
                      const name = it.name || it.productName || "";
                      if (name) itemCounts[name] = (itemCounts[name] || 0) + (it.quantity || 1);
                    });
                  }
                });
                let max = 0;
                Object.entries(itemCounts).forEach(([name, count]) => {
                  if (count > max) {
                    max = count;
                    recommendedItem = name;
                  }
                });
              }
    
              const hintMessage = cust
                ? `العميل ${cust.name} - لديه ${customerOrders.length} طلبات سابقة بالورشة. ${isVIP ? "🌟 عميل مميز VIP." : ""} الأكثر طلباً: ${recommendedItem}`
                : "تم تحديد العميل المفضل للطلب.";
    
              res.json({
                success: true,
                hintMessage,
                recommendedItem,
                isVIP,
                ordersCount: customerOrders.length
              });
              break;
            }
    
    
            case "order-status-hint": {
              const items = payload?.items || [];
              const lowStockList: string[] = [];
    
              MATERIALS.forEach(m => {
                const inv = INVENTORY.find(i => i.materialId === m.id);
                const qty = inv ? inv.quantity : 0;
                if (qty <= (m.minimumStock || 5)) {
                  lowStockList.push(m.name);
                }
              });
    
              let status: 'success' | 'warning' | 'neutral' = 'success';
              let message = "جميع الخامات المطلوبة متوفرة بالمستودع وجاهزة للقص مباشرة.";
    
              if (lowStockList.length > 0) {
                status = 'warning';
                message = `تنبيه خامات: توجد خامات منخفضة بالمستودع (${lowStockList.slice(0, 2).join("، ")})، يُنصح بمتابعة التوريد.`;
              }
    
              res.json({
                status,
                message,
                lowStockList
              });
              break;
            }
    
    default:
      return false;
  }
  return true;
}

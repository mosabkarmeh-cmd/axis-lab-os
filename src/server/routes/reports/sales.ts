import type {
  CustomerReportRecord,
  OrderReportRecord,
} from "./types.ts";

export function buildSalesAnalytics(
  orders: OrderReportRecord[],
  customers: CustomerReportRecord[],
  currentRate: number,
  sypToUsd: (amountSYP: number, exchangeRate?: number) => number,
) {
  const orderValueSYP = (order: OrderReportRecord) => Math.round(Number(order.totalPrice) || 0);
  const totalOrdersCount = orders.length;
  const totalOrdersValueSYP = orders.reduce((sum, order) => sum + orderValueSYP(order), 0);
  const avgOrderValueSYP = totalOrdersCount > 0 ? totalOrdersValueSYP / totalOrdersCount : 0;
  const totalOrdersValueUSD = sypToUsd(totalOrdersValueSYP, currentRate);

  const ordersByStatus: Record<string, number> = {};
  for (const order of orders) {
    const status = order.status || "unknown";
    ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
  }

  const customerSpending: Record<string, number> = {};
  for (const order of orders) {
    if (!order.customerId) continue;
    customerSpending[order.customerId] = (customerSpending[order.customerId] || 0) + orderValueSYP(order);
  }

  const topCustomers = Object.entries(customerSpending)
    .map(([id, totalSpent]) => {
      const customer = customers.find(item => item.id === id);
      return {
        id,
        name: customer?.name || "عميل غير معروف",
        company: customer?.company || "أفراد",
        totalSpent,
        totalSpentSYP: totalSpent,
        totalSpentUSD: sypToUsd(totalSpent, currentRate),
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return {
    orderValueSYP,
    totalOrdersCount,
    totalOrdersValueSYP,
    totalOrdersValueUSD,
    avgOrderValueSYP,
    avgOrderValueUSD: sypToUsd(avgOrderValueSYP, currentRate),
    ordersByStatus,
    topCustomers,
  };
}

export function buildRecentOrderTrends(orders: OrderReportRecord[]) {
  const monthlyOrders: Record<string, { orders: number; delivered: number; valueSYP: number }> = {};
  const orderValueSYP = (order: OrderReportRecord) => Math.round(Number(order.totalPrice) || 0);

  for (const order of orders) {
    const date = new Date(order.createdAt || order.orderDate || "");
    if (Number.isNaN(date.getTime())) continue;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyOrders[monthKey] ??= { orders: 0, delivered: 0, valueSYP: 0 };
    monthlyOrders[monthKey].orders += 1;
    if (order.status === "delivered") monthlyOrders[monthKey].delivered += 1;
    monthlyOrders[monthKey].valueSYP += orderValueSYP(order);
  }

  return Object.entries(monthlyOrders)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({ month, ...data }));
}

export function buildProductDemand(orders: OrderReportRecord[]) {
  const productDemand: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items || []) {
      const name = String(item.productName ?? item.name ?? "منتج غير مسمى");
      productDemand[name] = (productDemand[name] || 0) + (Number(item.quantity) || 0);
    }
  }

  return Object.entries(productDemand)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);
}

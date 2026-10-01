export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  link: string;
  [key: string]: any;
};

export function createNotification(
  notifications: NotificationRecord[],
  title: string,
  message: string,
  type: string,
  priority: string = "normal",
  link: string = "",
) {
  const newNotif: NotificationRecord = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    title,
    message,
    type,
    priority,
    isRead: false,
    createdAt: new Date().toISOString(),
    link,
  };
  notifications.unshift(newNotif);
  return newNotif;
}

export function notifyOverdueOrders(
  orders: any[],
  customers: any[],
  notifications: NotificationRecord[],
) {
  const now = Date.now();
  for (const order of orders) {
    if (!order.deliveryDateExpected || ["delivered", "cancelled"].includes(order.status)) continue;
    const dueAt = new Date(order.deliveryDateExpected).getTime();
    if (!Number.isFinite(dueAt) || dueAt >= now) continue;
    const alreadyNotified = notifications.some(
      (n: any) => n.type === "order" && n.orderId === order.id && n.code === "overdue",
    );
    if (alreadyNotified) continue;
    const customer = customers.find((c: any) => c.id === order.customerId);
    const notification = createNotification(
      notifications,
      `طلب متأخر #${order.orderNumber}`,
      `تجاوز الطلب موعد التسليم المتوقع${customer?.name ? ` للعميل ${customer.name}` : ""}. الحالة الحالية: ${order.status}`,
      "order",
      "high",
      "/orders",
    );
    notification.orderId = order.id;
    notification.code = "overdue";
  }
}

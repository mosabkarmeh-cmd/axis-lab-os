export interface NotificationRuntimeDependencies {
  orderStatuses: Array<NotificationRecord>;
  notifications: NotificationRecord[];
  orders: readonly unknown[];
  customers: readonly unknown[];
}

export interface NotificationRecord {
  [key: string]: unknown;
}

const DEFAULT_ORDER_STATUSES: NotificationRecord[] = [
  { id: "new", name: "جديد", color: "#818cf8", order: 1, isDefault: true },
  { id: "design", name: "قيد التصميم", color: "#c084fc", order: 2, isDefault: true },
  { id: "design_approved", name: "تم اعتماد التصميم", color: "#a78bfa", order: 3, isDefault: true },
  { id: "cutting", name: "قيد القص", color: "#60a5fa", order: 4, isDefault: true },
  { id: "cutting_complete", name: "انتهى القص", color: "#38bdf8", order: 5, isDefault: true },
  { id: "assembly", name: "قيد التجميع", color: "#f59e0b", order: 6, isDefault: true },
  { id: "assembly_complete", name: "انتهى التجميع", color: "#fbbf24", order: 7, isDefault: true },
  { id: "packaging", name: "قيد التغليف", color: "#fb923c", order: 8, isDefault: true },
  { id: "ready", name: "بانتظار التسليم", color: "#34d399", order: 9, isDefault: true },
  { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 10, isDefault: true },
  { id: "cancelled", name: "ملغي", color: "#f87171", order: 11, isDefault: true },
  { id: "in_progress", name: "قيد التنفيذ (قديم)", color: "#64748b", order: 99, isDefault: false },
];

export const WORKFLOW_NEXT_REMINDERS: Record<string, string> = {
  new: "اعتمد التصميم قبل تحويل الطلب للتنفيذ.",
  design: "بعد اكتمال التصميم، سجّل اعتماد التصميم.",
  design_approved: "التصميم معتمد؛ ابدأ مهمة القص من لوحة الإنتاج.",
  cutting_complete: "انتهى القص؛ ابدأ مرحلة التجميع.",
  assembly_complete: "انتهى التجميع؛ ابدأ مرحلة التغليف.",
  packaging: "بعد انتهاء التغليف، حوّل الطلب إلى بانتظار التسليم.",
  ready: "تواصل مع العميل وسجّل التسليم بعد استيفاء الدفعة المتبقية.",
};

function asRecord(value: unknown): NotificationRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as NotificationRecord
    : {};
}

export function createNotificationRuntime(deps: NotificationRuntimeDependencies) {
  function normalizeOrderStatuses() {
    for (const defaultStatus of DEFAULT_ORDER_STATUSES) {
      if (!deps.orderStatuses.some((status) => String(status.id) === String(defaultStatus.id))) {
        deps.orderStatuses.push({ ...defaultStatus });
      }
    }
  }

  function createNotification(
    title: string,
    message: string,
    type: string,
    priority = "normal",
    link = "",
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
    deps.notifications.unshift(newNotif);
    return newNotif;
  }

  function notifyOverdueOrders() {
    const now = Date.now();
    for (const rawOrder of deps.orders) {
      const order = asRecord(rawOrder);
      if (
        !order.deliveryDateExpected ||
        ["delivered", "cancelled"].includes(String(order.status))
      ) {
        continue;
      }
      const dueAt = new Date(String(order.deliveryDateExpected)).getTime();
      if (!Number.isFinite(dueAt) || dueAt >= now) continue;

      const alreadyNotified = deps.notifications.some((rawNotification) => {
        const notification = asRecord(rawNotification);
        return (
          notification.type === "order" &&
          notification.orderId === order.id &&
          notification.code === "overdue"
        );
      });
      if (alreadyNotified) continue;

      const customer = deps.customers.find((rawCustomer) => {
        const candidate = asRecord(rawCustomer);
        return candidate.id === order.customerId;
      });
      const customerRecord = asRecord(customer);
      const customerName = String(customerRecord.name || "");
      const orderNumber = String(order.orderNumber || "");
      const status = String(order.status || "");

      const notification = createNotification(
        `طلب متأخر #${orderNumber}`,
        `تجاوز الطلب موعد التسليم المتوقع${customerName ? ` للعميل ${customerName}` : ""}. الحالة الحالية: ${status}`,
        "order",
        "high",
        "/orders",
      );
      notification.orderId = order.id;
      notification.code = "overdue";
    }
  }

  return {
    normalizeOrderStatuses,
    createNotification,
    notifyOverdueOrders,
  };
}

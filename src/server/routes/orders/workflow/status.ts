import express from "express";
import * as core from "../../../server-core.ts";
import { getActorId, orderForResponse } from "../response.ts";

const {
  ORDERS,
  ORDER_STATUSES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  persistStateNow,
  createNotification,
  WORKFLOW_NEXT_REMINDERS,
  freezeOrderCurrencySnapshot,
} = core;

export function registerOrderStatusRoute(app: express.Express) {
app.patch("/api/orders/:id/status", async (req, res) => {
    const { status, notes, changedById } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (!ORDER_STATUSES.some((entry) => entry.id === status)) {
      res.status(400).json({ error: "حالة الطلب غير صالحة" });
      return;
    }

    // Orders are stored in SYP. Block delivery only when at least one whole lira remains.
    const deliveryRemainingSYP = Math.max(0, Math.round(Number(order.remainingSYP ?? order.remaining ?? 0)));
    if (status === "delivered" && deliveryRemainingSYP > 0) {
      const deliveryRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
      res.status(400).json({ 
        error: "حظر التسليم: لا يمكن تسليم الطلب للعميل قبل استيفاء وتسديد كامل المبلغ المتبقي المستحق.",
        remainingUSD: deliveryRemainingSYP / deliveryRate,
        remainingSYP: deliveryRemainingSYP,
        orderNumber: order.orderNumber
      });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (status === "delivered") {
      order.deliveryDateActual = new Date().toISOString();
      // Freeze SYP and USD values exactly at final delivery; later rate changes cannot affect this invoice.
      freezeOrderCurrencySnapshot(order);
    } else {
      // Clear actual delivery date if state was downgraded from delivered
      delete order.deliveryDateActual;
    }

    const statusArabicMap: Record<string, string> = {
      new: "جديد",
      design: "قيد التصميم",
      design_approved: "تم اعتماد التصميم",
      cutting: "قيد القص",
      cutting_complete: "انتهى القص",
      assembly: "قيد التجميع",
      assembly_complete: "انتهى التجميع",
      packaging: "قيد التغليف",
      in_progress: "قيد التنفيذ (قديم)",
      ready: "بانتظار التسليم",
      delivered: "تم التسليم للعميل",
      cancelled: "ملغى"
    };
    const oldStatusLabel = statusArabicMap[oldStatus] || oldStatus;
    const newStatusLabel = statusArabicMap[status] || status;
    const statusChangeMsg = `تغير حالة الطلب من [${oldStatusLabel}] إلى [${newStatusLabel}]${notes ? ` - ملاحظات: ${notes}` : ""}`;

    order.statusHistory.unshift({
      oldStatus,
      newStatus: status,
      notes: notes || `تحديث حالة الطلب إلى ${newStatusLabel}`,
      changedAt: new Date().toISOString(),
      changedById: getActorId(req)
    });

    createNotification(
      `تحديث حالة الطلب #${order.orderNumber}`,
      `انتقلت الحالة من ${oldStatusLabel} إلى ${newStatusLabel}${notes ? `: ${notes}` : ""}`,
      "order",
      status === "ready" ? "high" : "normal",
      "/orders"
    );
    const nextReminder = WORKFLOW_NEXT_REMINDERS[status];
    if (nextReminder) {
      createNotification(
        `الخطوة التالية للطلب #${order.orderNumber}`,
        nextReminder,
        "order",
        ["design_approved", "cutting_complete", "assembly_complete", "ready"].includes(status) ? "high" : "normal",
        "/orders"
      );
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: order.id,
      details: statusChangeMsg,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json(orderForResponse(req, order));
  });
}

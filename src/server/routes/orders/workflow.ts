import express from "express";
import * as core from "../../server-core.ts";
import { getActorId, orderForResponse } from "./response.ts";

const {
  ORDERS,
  USERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  getRequestUser,
  persistStateNow,
  ORDER_STATUSES,
  freezeOrderCurrencySnapshot,
  createNotification,
  WORKFLOW_NEXT_REMINDERS,
} = core;

export function registerOrderWorkflowRoutes(app: express.Express) {
// API - Update Order Status
  // Assign the worker responsible for each production stage on an order.
  // Open to any authenticated staff member (employee/admin) -- this is an
  // operational assignment, not a performance judgement.
  app.patch("/api/orders/:id/assign-workers", async (req, res) => {
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const { designerId, cutterId, assemblerId, changedById } = req.body;
    const assignableRoles = new Set(["admin", "employee"]);
    if (designerId !== undefined) {
      if (designerId && !USERS.some(u => u.id === designerId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "المصمم المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.designerId = designerId || undefined;
    }
    if (cutterId !== undefined) {
      if (cutterId && !USERS.some(u => u.id === cutterId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "عامل القص المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.cutterId = cutterId || undefined;
    }
    if (assemblerId !== undefined) {
      if (assemblerId && !USERS.some(u => u.id === assemblerId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "عامل التجميع المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.assemblerId = assemblerId || undefined;
    }
    const labelFor = (id: string) => USERS.find(u => u.id === id)?.fullName || id;
    const parts: string[] = [];
    if (designerId !== undefined) parts.push(`المصمم: ${designerId ? labelFor(designerId) : "بدون تعيين"}`);
    if (cutterId !== undefined) parts.push(`عامل القص: ${cutterId ? labelFor(cutterId) : "بدون تعيين"}`);
    if (assemblerId !== undefined) parts.push(`عامل التجميع: ${assemblerId ? labelFor(assemblerId) : "بدون تعيين"}`);
    if (parts.length) {
      order.statusHistory.unshift({
        oldStatus: order.status,
        newStatus: order.status,
        notes: `تحديث تعيين العمال — ${parts.join("، ")}`,
        changedAt: new Date().toISOString()
      });
    }
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "ASSIGN_ORDER_WORKERS",
      entityType: "Order",
      entityId: order.id,
      details: parts.join("، "),
      createdAt: new Date().toISOString()
    });
    await persistStateNow();
    res.json(orderForResponse(req, order));
  });

  // Manager-only performance rating per production stage (design/cutting/assembly).
  app.patch("/api/orders/:id/rate", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "تقييم الطلبات متاح للمدير فقط" });
      return;
    }
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const { designRating, cuttingRating, assemblyRating, ratingNotes } = req.body;
    const validateRating = (value: unknown) => value === undefined || value === null || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5);
    if (!validateRating(designRating) || !validateRating(cuttingRating) || !validateRating(assemblyRating)) {
      res.status(400).json({ error: "التقييم يجب أن يكون رقماً صحيحاً بين 1 و5" });
      return;
    }
    if (designRating !== undefined) order.designRating = designRating ?? undefined;
    if (cuttingRating !== undefined) order.cuttingRating = cuttingRating ?? undefined;
    if (assemblyRating !== undefined) order.assemblyRating = assemblyRating ?? undefined;
    if (ratingNotes !== undefined) order.ratingNotes = ratingNotes;
    order.ratedById = user.id;
    order.ratedAt = new Date().toISOString();

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "RATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      details: `تقييم: التصميم=${order.designRating ?? "-"} القص=${order.cuttingRating ?? "-"} التجميع=${order.assemblyRating ?? "-"}`,
      createdAt: new Date().toISOString()
    });
    await persistStateNow();
    res.json(orderForResponse(req, order));
  });

  // Aggregate per-employee performance stats from order ratings (manager-only).
  app.get("/api/employees/stats", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "إحصائيات الموظفين متاحة للمدير فقط" });
      return;
    }
    const stats: Record<string, {
      userId: string; fullName: string; role: string;
      designOrders: number; designRated: number; designRatingSum: number;
      cuttingOrders: number; cuttingRated: number; cuttingRatingSum: number;
      assemblyOrders: number; assemblyRated: number; assemblyRatingSum: number;
    }> = {};
    const ensure = (userId: string) => {
      if (!stats[userId]) {
        const u = USERS.find(x => x.id === userId);
        stats[userId] = {
          userId, fullName: u?.fullName || userId, role: u?.role || "unknown",
          designOrders: 0, designRated: 0, designRatingSum: 0,
          cuttingOrders: 0, cuttingRated: 0, cuttingRatingSum: 0,
          assemblyOrders: 0, assemblyRated: 0, assemblyRatingSum: 0,
        };
      }
      return stats[userId];
    };
    for (const order of ORDERS) {
      if (order.designerId) {
        const s = ensure(order.designerId);
        s.designOrders += 1;
        if (order.designRating) { s.designRatingSum += order.designRating; s.designRated += 1; }
      }
      if (order.cutterId) {
        const s = ensure(order.cutterId);
        s.cuttingOrders += 1;
        if (order.cuttingRating) { s.cuttingRatingSum += order.cuttingRating; s.cuttingRated += 1; }
      }
      if (order.assemblerId) {
        const s = ensure(order.assemblerId);
        s.assemblyOrders += 1;
        if (order.assemblyRating) { s.assemblyRatingSum += order.assemblyRating; s.assemblyRated += 1; }
      }
    }
    const result = Object.values(stats).map(s => ({
      userId: s.userId,
      fullName: s.fullName,
      role: s.role,
      design: { orders: s.designOrders, avgRating: s.designRated ? Number((s.designRatingSum / s.designRated).toFixed(2)) : null },
      cutting: { orders: s.cuttingOrders, avgRating: s.cuttingRated ? Number((s.cuttingRatingSum / s.cuttingRated).toFixed(2)) : null },
      assembly: { orders: s.assemblyOrders, avgRating: s.assemblyRated ? Number((s.assemblyRatingSum / s.assemblyRated).toFixed(2)) : null },
    }));
    res.json({ success: true, employees: result });
  });

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

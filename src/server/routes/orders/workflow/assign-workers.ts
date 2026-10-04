import express from "express";
import * as core from "../../../server-core.ts";
import { getActorId, orderForResponse } from "../response.ts";

const {
  ORDERS,
  USERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  persistStateNow,
} = core;

export function registerOrderWorkerAssignmentRoute(app: express.Express) {
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
}

import express from "express";
import * as core from "../../../server-core.ts";

const {
  ORDERS,
  getRequestUser,
  schedulePersist,
} = core;

export function registerOrderRatingRoute(app: express.Express) {
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
}

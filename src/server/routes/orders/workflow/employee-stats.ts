import express from "express";
import * as core from "../../../server-core.ts";

const {
  ORDERS,
  USERS,
  getRequestUser,
} = core;

export function registerEmployeeOrderStatsRoute(app: express.Express) {
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
}

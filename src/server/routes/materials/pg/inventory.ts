import type { Router } from "express";
import { db } from "../../../db/index.ts";
import { inventory } from "../../../db/schema.ts";
import { errorMessage } from "./shared.ts";

export function registerPostgresInventoryRoutes(router: Router) {
// 5. Get inventory stats
router.get("/inventory/stats", async (req, res) => {
  try {
    const list = await db.select().from(inventory).orderBy(inventory.id);
    const mapped = list.map(inv => ({
      id: "inv-" + inv.id,
      materialId: "m-" + inv.materialId,
      quantity: inv.quantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: inv.availableQuantity,
      location: inv.location || ""
    }));
    res.json(mapped);
  } catch (err: unknown) {
    console.error("Error fetching inventory stats:", err);
    res.status(500).json({ error: "Failed to fetch inventory stats: " + errorMessage(err) });
  }
});
}

import type { Router } from "express";
import { db } from "../../../../db/index.ts";
import { remnants } from "../../../../db/schema.ts";

const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);

export function registerPostgresRemnantRoutes(router: Router) {
// 6. Get all remnants
router.get("/remnants", async (req, res) => {
  try {
    const list = await db.select().from(remnants).orderBy(remnants.id);
    const mapped = list.map(r => ({
      id: "rem-" + r.id,
      materialId: "m-" + r.materialId,
      width: r.width,
      height: r.height,
      area: r.area,
      quantity: r.quantity,
      status: r.status,
      location: r.location || "",
      notes: r.notes || ""
    }));
    res.json(mapped);
  } catch (err: unknown) {
    console.error("Error fetching remnants:", err);
    res.status(500).json({ error: "Failed to fetch remnants: " + errorMessage(err) });
  }
});

// 7. Add remnant
router.post("/remnants", async (req, res) => {
  try {
    const { materialId, width, height, quantity, location, notes } = req.body;
    if (!materialId || !width || !height || !quantity) {
      return res.status(400).json({ error: "جميع حقول البقايا إجبارية" });
    }

    const rawMatId = parseInt(materialId.replace("m-", ""));
    const w = parseInt(width);
    const h = parseInt(height);
    const qty = parseInt(quantity);
    const area = w * h;

    const values = {
      materialId: rawMatId,
      width: w,
      height: h,
      area: area,
      quantity: qty,
      status: "available",
      location: location || "صندوق البقايا",
      notes: notes || ""
    };

    const inserted = await db.insert(remnants).values(values).returning();
    const result = {
      id: "rem-" + inserted[0].id,
      ...values
    };
    res.json(result);
  } catch (err: unknown) {
    console.error("Error adding remnant:", err);
    res.status(500).json({ error: "Failed to add remnant: " + errorMessage(err) });
  }
});
}

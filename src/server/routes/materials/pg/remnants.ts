import type { Router } from "express";
import express from "express";
import * as core from "../../../server-core.ts";
import { db } from "../../../../db/index.ts";
import { remnants } from "../../../../db/schema.ts";

const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);

function requireRemnantOperator(req: express.Request, res: express.Response): boolean {
  const role = core.getRequestUser(req)?.role;
  if (!role || !["admin", "employee"].includes(role)) {
    res.status(403).json({ success: false, message: "عمليات البقايا متاحة للإدارة والموظفين التشغيليين فقط" });
    return false;
  }
  return true;
}

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
  if (!requireRemnantOperator(req, res)) return;
  try {
    const { materialId, width, height, quantity, location, notes } = req.body;
    if (!materialId || !width || !height || !quantity) {
      return res.status(400).json({ error: "جميع حقول البقايا إجبارية" });
    }

    const rawMatId = core.idNum(materialId, "m-");
    const w = Number(width);
    const h = Number(height);
    const qty = Number(quantity);
    if (!rawMatId || !core.MATERIALS.some(material => material.id === materialId)) {
      return res.status(400).json({ error: "معرف المادة غير صالح أو المادة غير موجودة" });
    }
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(qty) || w < 100 || h < 100 || qty <= 0) {
      return res.status(400).json({ error: "الأبعاد يجب أن تكون 100 مم على الأقل والكمية رقمًا موجبًا صالحًا" });
    }
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

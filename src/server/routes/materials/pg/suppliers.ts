import type { Router } from "express";
import { db } from "../../../db/index.ts";
import { suppliers } from "../../../db/schema.ts";

const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);

export function registerPostgresSupplierRoutes(router: Router) {
// 8. Get suppliers
router.get("/suppliers", async (req, res) => {
  try {
    const list = await db.select().from(suppliers).orderBy(suppliers.id);
    const mapped = list.map(s => ({
      id: "s-" + s.id,
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || ""
    }));
    res.json(mapped);
  } catch (err: unknown) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});
}

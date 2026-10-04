import type { Router } from "express";
import { db } from "../../../../db/index.ts";
import { materials, inventory } from "../../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../../server-core.ts";

const { getRequestUser } = core;
const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);

const LEGACY_USD_TO_SYP: Record<number, number> = {
  1: 1350,
  2: 6075,
  3: 2700,
  4: 1620,
  5: 4725,
};
const LEGACY_USD_VALUES: Record<number, number> = {
  1: 10,
  2: 45,
  3: 20,
  4: 12,
  5: 35,
};
const DEMO_LOW_PRICE_MATERIALS = [
  { name: "لوح أكريليك أبيض 2 ملم", category: "الأكريليك", subCategory: "acrylic", thickness: 2, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 540, minimumStock: 10, supplierId: 1 },
  { name: "لوح PVC خفيف 3 ملم", category: "البلاستيك", subCategory: "pvc", thickness: 3, color: "white", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 405, minimumStock: 8, supplierId: 1 },
  { name: "خشب MDF رقيق 3 ملم", category: "الأخشاب", subCategory: "wood", thickness: 3, color: "brown", width: 1220, height: 2440, unit: "sheet", pricePerUnit: 337, minimumStock: 12, supplierId: 2 },
  { name: "فوم بورد 5 ملم", category: "الفوم", subCategory: "foam", thickness: 5, color: "white", width: 700, height: 1000, unit: "sheet", pricePerUnit: 270, minimumStock: 15, supplierId: 1 },
  { name: "جلد صناعي للحفر", category: "الجلود", subCategory: "leather", thickness: 1, color: "black", width: 1000, height: 1000, unit: "piece", pricePerUnit: 202, minimumStock: 20, supplierId: 3 },
];
const DEMO_LOW_PRICE_QUANTITIES = [20, 15, 25, 30, 40];
let demoMaterialSeedPromise: Promise<void> | null = null;
async function ensureDemoLowPriceMaterials() {
  if (demoMaterialSeedPromise) return demoMaterialSeedPromise;
  demoMaterialSeedPromise = (async () => {
    const existing = await db.select().from(materials);
    for (let index = 0; index < DEMO_LOW_PRICE_MATERIALS.length; index++) {
      const seed = DEMO_LOW_PRICE_MATERIALS[index];
      if (existing.some(row => row.name === seed.name)) continue;
      const inserted = await db.insert(materials).values({ ...seed, notes: "مادة اختبارية منخفضة السعر", status: "active" }).returning();
      const materialId = inserted[0]?.id;
      if (materialId) {
        await db.insert(inventory).values({
          materialId,
          quantity: DEMO_LOW_PRICE_QUANTITIES[index],
          reservedQuantity: 0,
          availableQuantity: DEMO_LOW_PRICE_QUANTITIES[index],
          location: `مستودع اختباري ${index + 1}`,
        });
      }
    }
  })().catch(error => {
    demoMaterialSeedPromise = null;
    throw error;
  });
  return demoMaterialSeedPromise;
}

async function normalizeMaterialCurrency(rows: typeof materials.$inferSelect[]) {
  for (const row of rows) {
    if (LEGACY_USD_VALUES[row.id] !== undefined && Number(row.pricePerUnit) === LEGACY_USD_VALUES[row.id]) {
      const pricePerUnit = LEGACY_USD_TO_SYP[row.id];
      await db.update(materials).set({ pricePerUnit }).where(eq(materials.id, row.id));
      row.pricePerUnit = pricePerUnit;
    }
  }
}

export function registerPostgresMaterialCatalogRoutes(router: Router) {
// 1. Get all materials
router.get("/materials", async (req, res) => {
  try {
    const list = await db.select().from(materials).orderBy(materials.id);
    await normalizeMaterialCurrency(list);
    const mapped = list.map(m => ({
      id: "m-" + m.id,
      name: m.name,
      category: m.category,
      subCategory: m.subCategory,
      thickness: m.thickness,
      color: m.color || "",
      width: m.width || 0,
      height: m.height || 0,
      unit: m.unit,
      pricePerUnit: m.pricePerUnit,
      minimumStock: m.minimumStock,
      supplierId: m.supplierId ? "s-" + m.supplierId : "",
      notes: m.notes || "",
      status: m.status || "active"
    }));
    res.json(mapped);
  } catch (err: unknown) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ error: "Failed to fetch materials: " + errorMessage(err) });
  }
});

// 2. Add material
router.post("/materials", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة خامات جديدة" });
    }

    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes } = req.body;
    if (!name || !category || !unit || pricePerUnit === undefined) {
      return res.status(400).json({ error: "الاسم والفئة والوحدة وسعر الوحدة حقول إجبارية" });
    }

    const rawSupplierId = supplierId ? parseInt(supplierId.replace("s-", "")) : null;

    const values = {
      name,
      category,
      subCategory: subCategory || "acrylic",
      thickness: thickness ? parseInt(thickness) : null,
      color: color || "",
      width: width ? parseInt(width) : null,
      height: height ? parseInt(height) : null,
      unit,
      pricePerUnit: parseFloat(pricePerUnit),
      minimumStock: minimumStock ? parseInt(minimumStock) : 0,
      supplierId: isNaN(rawSupplierId || NaN) ? null : rawSupplierId,
      notes: notes || "",
      status: "active"
    };

    const inserted = await db.insert(materials).values(values).returning();
    const result = {
      id: "m-" + inserted[0].id,
      ...values
    };

    // Auto-create initial inventory
    await db.insert(inventory).values({
      materialId: inserted[0].id,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      location: "مستودع أ"
    });

    res.json(result);
  } catch (err: unknown) {
    console.error("Error adding material:", err);
    res.status(500).json({ error: "Failed to add material: " + errorMessage(err) });
  }
});

// 3. Update material
router.put("/materials/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل الخامات" });
    }

    const rawId = parseInt(req.params.id.replace("m-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف الخامة غير صالح" });
    }

    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes } = req.body;
    const rawSupplierId = supplierId ? parseInt(supplierId.replace("s-", "")) : null;

    const values = {
      name,
      category,
      subCategory,
      thickness: thickness !== undefined ? parseInt(thickness) : undefined,
      color,
      width: width !== undefined ? parseInt(width) : undefined,
      height: height !== undefined ? parseInt(height) : undefined,
      unit,
      pricePerUnit: pricePerUnit !== undefined ? parseFloat(pricePerUnit) : undefined,
      minimumStock: minimumStock !== undefined ? parseInt(minimumStock) : undefined,
      supplierId: isNaN(rawSupplierId || NaN) ? null : rawSupplierId,
      notes
    };

    await db.update(materials).set(values).where(eq(materials.id, rawId));
    res.json({ id: req.params.id, ...values });
  } catch (err: unknown) {
    console.error("Error updating material:", err);
    res.status(500).json({ error: "Failed to update material: " + errorMessage(err) });
  }
});

// 4. Archive material (Soft delete)
router.delete("/materials/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بأرشفة الخامات" });
    }

    const rawId = parseInt(req.params.id.replace("m-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف الخامة غير صالح" });
    }

    await db.update(materials).set({ status: "archived" }).where(eq(materials.id, rawId));
    res.json({ success: true, id: req.params.id });
  } catch (err: unknown) {
    console.error("Error archiving material:", err);
    res.status(500).json({ error: "Failed to archive material: " + errorMessage(err) });
  }
});
}

import express from "express";
import { db } from "../../db/index.ts";
import { materials, inventory, remnants, suppliers, supplyOrders } from "../../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getVerifiedRequestUser } from "../auth.ts";

const router = express.Router();

const getRequestUser = getVerifiedRequestUser;

// 1. Get all materials
router.get("/materials", async (req, res) => {
  try {
    const list = await db.select().from(materials).orderBy(materials.id);
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
  } catch (err: any) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ error: "Failed to fetch materials: " + err.message });
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
  } catch (err: any) {
    console.error("Error adding material:", err);
    res.status(500).json({ error: "Failed to add material: " + err.message });
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
  } catch (err: any) {
    console.error("Error updating material:", err);
    res.status(500).json({ error: "Failed to update material: " + err.message });
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
  } catch (err: any) {
    console.error("Error archiving material:", err);
    res.status(500).json({ error: "Failed to archive material: " + err.message });
  }
});

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
  } catch (err: any) {
    console.error("Error fetching inventory stats:", err);
    res.status(500).json({ error: "Failed to fetch inventory stats: " + err.message });
  }
});

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
  } catch (err: any) {
    console.error("Error fetching remnants:", err);
    res.status(500).json({ error: "Failed to fetch remnants: " + err.message });
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
  } catch (err: any) {
    console.error("Error adding remnant:", err);
    res.status(500).json({ error: "Failed to add remnant: " + err.message });
  }
});

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
  } catch (err: any) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

export default router;

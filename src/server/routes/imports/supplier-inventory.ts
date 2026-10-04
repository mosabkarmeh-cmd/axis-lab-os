import express from "express";
import { db } from "../../../db/index.ts";
import { inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, suppliers as suppliersTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";
import { requireImportAdmin } from "./utils.ts";

const {
  MATERIALS,
  SUPPLIERS,
  INVENTORY,
  createNotification,
  idNum,
  getRequestUser,
} = core;

export function registerImportSupplierInventoryRoutes(app: express.Express) {
app.post("/api/import/suppliers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: unknown[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      const code = String(it.code || "").trim();
      const name = String(it.name || "").trim();
      if (!name || !code) { errors.push(`السطر ${idx + 1}: كود المورد والاسم مطلوبان`); continue; }
      const duplicate = SUPPLIERS.some((supplier) => String(supplier.name || "").trim().toLowerCase() === name.toLowerCase() || String(supplier.notes || "").includes(`كود المورد: ${code}`));
      if (duplicate) { errors.push(`السطر ${idx + 1}: المورد أو كوده موجود مسبقًا`); continue; }
      try {
        const inserted = await db.insert(suppliersTable).values({ name, phone: it.phone ? String(it.phone) : null, email: it.email ? String(it.email) : null, address: it.address ? String(it.address) : null, notes: [`كود المورد: ${code}`, it.notes ? String(it.notes) : ""].filter(Boolean).join(" | ") }).returning();
        const row = inserted[0];
        const supplier = { id: "s-" + row.id, code, name: row.name, phone: row.phone || "", email: row.email || "", address: row.address || "", notes: it.notes ? String(it.notes) : "" };
        SUPPLIERS.push(supplier);
        imported.push(supplier);
      } catch (error: unknown) { errors.push(`السطر ${idx + 1}: فشل الحفظ - ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (imported.length > 0) createNotification("استيراد موردين جماعي", `تم استيراد ${imported.length} موردين بنجاح.`, "system");
    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/inventory", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: unknown[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      const code = String(it.code || "").trim().toLowerCase();
      const name = String(it.name || "").trim().toLowerCase();
      const material = MATERIALS.find((candidate) => (code && String(candidate.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code) || (name && String(candidate.name || "").trim().toLowerCase() === name));
      const quantity = Number(it.openingQuantity);
      if (!material) { errors.push(`السطر ${idx + 1}: المادة غير موجودة`); continue; }
      if (!Number.isInteger(quantity) || quantity < 0) { errors.push(`السطر ${idx + 1}: الكمية يجب أن تكون عددًا صحيحًا غير سالب`); continue; }
      const existing = INVENTORY.find((row) => row.materialId === material.id);
      if (existing) {
        const before = Number(existing.quantity) || 0;
        existing.quantity = quantity;
        existing.reservedQuantity = Math.min(existing.reservedQuantity || 0, quantity);
        existing.availableQuantity = quantity - existing.reservedQuantity;
        existing.location = String(it.location ?? it.warehouse ?? existing.location ?? "المستودع الرئيسي");
        await db.update(inventoryTable).set({ quantity, reservedQuantity: existing.reservedQuantity, availableQuantity: existing.availableQuantity, location: existing.location }).where(eq(inventoryTable.materialId, idNum(material.id, "m-")));
        await db.insert(inventoryTransactionsTable).values({ materialId: idNum(material.id, "m-"), type: "adjustment", quantity: quantity - before, beforeQty: before, afterQty: quantity, referenceType: "opening_import", referenceId: "excel", reason: "تثبيت الرصيد الافتتاحي المستورد", createdById: idNum(getRequestUser(req)?.id, "u-") });
      } else {
        const inserted = await db.insert(inventoryTable).values({ materialId: idNum(material.id, "m-"), quantity, reservedQuantity: 0, availableQuantity: quantity, location: it.location || it.warehouse ? String(it.location ?? it.warehouse) : "المستودع الرئيسي" }).returning();
        INVENTORY.push({ id: "inv-" + inserted[0].id, materialId: material.id, quantity, reservedQuantity: 0, availableQuantity: quantity, location: inserted[0].location || "المستودع الرئيسي" });
      }
      imported.push({ materialId: material.id, quantity });
    }
    if (imported.length > 0) createNotification("استيراد رصيد افتتاحي", `تم تحديث ${imported.length} أرصدة مخزنية من Excel.`, "inventory");
    res.json({ success: true, count: imported.length, imported, errors });
  });
}
}

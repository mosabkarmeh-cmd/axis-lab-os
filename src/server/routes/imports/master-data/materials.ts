import express from "express";
import { db } from "../../../../db/index.ts";
import { materials as materialsTable, inventory as inventoryTable } from "../../../../db/schema.ts";
import * as core from "../../../server-core.ts";
import { requireImportAdmin } from "../utils.ts";

const {
  MATERIALS,
  INVENTORY,
  nextEntityId,
  createNotification,
  idNum,
  USE_SQLITE,
  persistMutationWithFastDurability,
} = core;

export function registerImportMaterialRoutes(app: express.Express) {
  app.post("/api/import/materials", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

    if (USE_SQLITE) {
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
        const name = String(it.name || "").trim();
        const code = String(it.code || "").trim();
        const pricePerUnit = Number(it.pricePerUnit);
        const duplicateName = MATERIALS.some(material => String(material.name || "").trim().toLowerCase() === name.toLowerCase());
        const duplicateCode = code && MATERIALS.some(material => String(material.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code.toLowerCase());
        if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
          errors.push(`السطر ${idx + 1}: الاسم وسعر المفرد الصحيح مطلوبان`);
          continue;
        }
        if (duplicateName || duplicateCode) {
          errors.push(`السطر ${idx + 1}: المادة أو كودها موجود مسبقًا`);
          continue;
        }
        const materialId = nextEntityId("m");
        const inventoryId = nextEntityId("inv");
        const stock = Math.max(0, Number(it.stock) || 0);
        const newMat = {
          id: materialId,
          name,
          category: it.category ? String(it.category) : "عام",
          subCategory: it.subCategory ? String(it.subCategory) : "general",
          thickness: Number(it.thickness) || 0,
          color: it.color ? String(it.color) : "natural",
          width: Number(it.width) || 1220,
          height: Number(it.height) || 2440,
          unit: it.unit ? String(it.unit) : "sheet",
          pricePerUnit,
          minimumStock: Number(it.minimumStock) || 5,
          supplierId: it.supplierId ? String(it.supplierId) : null,
          notes: [code ? `كود المادة: ${code}` : "", it.notes ? String(it.notes) : ""].filter(Boolean).join(" | "),
          status: "active",
          qualityStatus: it.qualityStatus ? String(it.qualityStatus) : "inspected",
          createdAt: new Date().toISOString(),
        };
        const newInv = {
          id: inventoryId,
          materialId,
          quantity: stock,
          reservedQuantity: 0,
          availableQuantity: stock,
          location: it.location ? String(it.location) : "المستودع الرئيسي",
        };
        MATERIALS.push(newMat);
        INVENTORY.push(newInv);
        imported.push(newMat);
      }
      if (imported.length > 0) {
        createNotification("استيراد خامات ومواد", `تم استيراد عدد ${imported.length} خامات ومواد جديدة لدفتر المخزون والمستودع.`, "inventory");
      }
      await persistMutationWithFastDurability();
      return res.json({ success: true, count: imported.length, imported, errors });
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      const name = String(it.name || "").trim();
      const code = String(it.code || "").trim();
      const pricePerUnit = Number(it.pricePerUnit);
      const existingCode = code && MATERIALS.find((material) => String(material.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code.toLowerCase());
      if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
        errors.push(`السطر ${idx + 1}: الاسم وسعر المفرد الصحيح مطلوبان`);
        continue;
      }
      if (MATERIALS.some((material) => String(material.name || "").trim().toLowerCase() === name.toLowerCase()) || existingCode) {
        errors.push(`السطر ${idx + 1}: المادة أو كودها موجود مسبقًا`);
        continue;
      }
      try {
        const supId = idNum(it.supplierId, "s-");
        const insertedMat = await db.insert(materialsTable).values({
          name,
          category: it.category ? String(it.category) : "عام",
          subCategory: it.subCategory ? String(it.subCategory) : "general",
          thickness: Number(it.thickness) || 0,
          color: it.color ? String(it.color) : "natural",
          width: Number(it.width) || 1220,
          height: Number(it.height) || 2440,
          unit: it.unit ? String(it.unit) : "sheet",
          pricePerUnit,
          minimumStock: Number(it.minimumStock) || 5,
          supplierId: supId,
          notes: [code ? `كود المادة: ${code}` : "", it.notes ? String(it.notes) : ""].filter(Boolean).join(" | ") || null,
          status: "active",
          qualityStatus: it.qualityStatus ? String(it.qualityStatus) : "inspected",
        }).returning();
        const matRow = insertedMat[0];

        const stock = Number(it.stock) || 0;
        const insertedInventory = await db.insert(inventoryTable).values({
          materialId: matRow.id,
          quantity: stock,
          reservedQuantity: 0,
          availableQuantity: stock,
          location: it.location ? String(it.location) : "المستودع الرئيسي",
        }).returning();

        const newMat = {
          id: "m-" + matRow.id, name: matRow.name, category: matRow.category, subCategory: matRow.subCategory,
          thickness: matRow.thickness ?? 0, color: matRow.color || "", width: matRow.width ?? 0,
          height: matRow.height ?? 0, unit: matRow.unit, pricePerUnit: matRow.pricePerUnit,
          minimumStock: matRow.minimumStock, supplierId: matRow.supplierId ? "s-" + matRow.supplierId : "",
          notes: matRow.notes || "", status: matRow.status, qualityStatus: matRow.qualityStatus || "inspected",
        };
        MATERIALS.push(newMat);
        const inventoryRow = insertedInventory[0];
        if (inventoryRow) {
          INVENTORY.push({
            id: "inv-" + inventoryRow.id,
            materialId: newMat.id,
            quantity: inventoryRow.quantity,
            reservedQuantity: inventoryRow.reservedQuantity,
            availableQuantity: inventoryRow.availableQuantity,
            location: inventoryRow.location || "المستودع الرئيسي",
          });
        }
        imported.push(newMat);
      } catch (err: unknown) {
        console.error("Error importing material row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد خامات ومواد",
        `تم استيراد عدد ${imported.length} خامات ومواد جديدة لدفتر المخزون والمستودع.`,
        "inventory"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });
}

import express from "express";
import { db } from "../../../db/index.ts";
import { customers as customersTable, products as productsTable, materials as materialsTable, inventory as inventoryTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";
import { requireImportAdmin } from "./utils.ts";

const {
  CUSTOMERS,
  PRODUCTS,
  MATERIALS,
  INVENTORY,
  nextEntityId,
  createNotification,
  idNum,
} = core;

export function registerImportMasterDataRoutes(app: express.Express) {
app.post("/api/import/customers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة للاستيراد" });
      return;
    }

    const imported: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      if (!it.name) {
        errors.push(`السطر ${idx + 1}: حقل الاسم مطلوب`);
        continue;
      }
      try {
        const inserted = await db.insert(customersTable).values({
          name: String(it.name), phone: it.phone ? String(it.phone) : null, whatsapp: it.whatsapp ? String(it.whatsapp) : (it.phone ? String(it.phone) : null),
          email: it.email ? String(it.email) : null, company: it.company ? String(it.company) : "أفراد", address: it.address ? String(it.address) : null,
          notes: it.notes ? String(it.notes) : null, category: it.category ? String(it.category) : "شركة",
        }).returning();
        const row = inserted[0];
        const newCust = {
          id: "c-" + row.id, name: row.name, phone: row.phone || "", whatsapp: row.whatsapp || row.phone || "",
          email: row.email || "", company: row.company || "", address: row.address || "",
          notes: row.notes || "", category: row.category || "شركة",
        };
        CUSTOMERS.push(newCust);
        imported.push(newCust);
      } catch (err: unknown) {
        console.error("Error importing customer row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد عملاء جماعي",
        `تم استيراد عدد ${imported.length} عملاء بنجاح من ملف بيانات خارجي.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/products", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      if (!it.name || !it.price) {
        errors.push(`السطر ${idx + 1}: الاسم والسعر مطلوبان`);
        continue;
      }
      try {
        const inserted = await db.insert(productsTable).values({
          name: String(it.name), code: it.code ? String(it.code) : `PRD-${Date.now().toString().slice(-4)}-${idx}`,
          category: it.category ? String(it.category) : "عام", price: Number(it.price) || 0,
          description: it.description ? String(it.description) : null, stock: Number(it.stock) || 0,
        }).returning();
        const row = inserted[0];
        const newProd = {
          id: "p-" + row.id, name: row.name, code: row.code, category: row.category, price: row.price,
          description: row.description || "", stock: row.stock,
        };
        PRODUCTS.push(newProd);
        imported.push(newProd);
      } catch (err: unknown) {
        console.error("Error importing product row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد منتجات جماعي",
        `تم استيراد عدد ${imported.length} منتجات وموديلات جديدة إلى مكتبة التصاميم.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/materials", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

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
        await db.insert(inventoryTable).values({
          materialId: matRow.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location ? String(it.location) : "المستودع الرئيسي",
        });

        const newMat = {
          id: "m-" + matRow.id, name: matRow.name, category: matRow.category, subCategory: matRow.subCategory,
          thickness: matRow.thickness ?? 0, color: matRow.color || "", width: matRow.width ?? 0,
          height: matRow.height ?? 0, unit: matRow.unit, pricePerUnit: matRow.pricePerUnit,
          minimumStock: matRow.minimumStock, supplierId: matRow.supplierId ? "s-" + matRow.supplierId : "",
          notes: matRow.notes || "", status: matRow.status, qualityStatus: matRow.qualityStatus || "inspected",
        };
        MATERIALS.push(newMat);
        INVENTORY.push({
          id: "inv-pending", materialId: newMat.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location ? String(it.location) : "المستودع الرئيسي",
        });
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

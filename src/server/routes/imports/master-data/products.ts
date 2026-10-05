import express from "express";
import { db } from "../../../../db/index.ts";
import { products as productsTable } from "../../../../db/schema.ts";
import * as core from "../../../server-core.ts";
import { requireImportAdmin } from "../utils.ts";

const { PRODUCTS, nextEntityId, createNotification, USE_SQLITE, persistMutationWithFastDurability } = core;

export function registerImportProductRoutes(app: express.Express) {
  app.post("/api/import/products", async (req, res) => {
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
        const price = Number(it.price);
        if (!name || !Number.isFinite(price) || price < 0) {
          errors.push(`السطر ${idx + 1}: الاسم والسعر مطلوبان`);
          continue;
        }
        if (PRODUCTS.some(product => product.name.trim().toLowerCase() === name.toLowerCase() || product.code === String(it.code || ""))) {
          errors.push(`السطر ${idx + 1}: المنتج أو كوده موجود مسبقًا`);
          continue;
        }
        const newProd = {
          id: nextEntityId("p"),
          name,
          code: it.code ? String(it.code) : `PRD-${Date.now().toString().slice(-4)}-${idx}`,
          category: it.category ? String(it.category) : "عام",
          price,
          description: it.description ? String(it.description) : "",
          stock: Number(it.stock) || 0,
        };
        PRODUCTS.push(newProd);
        imported.push(newProd);
      }
      if (imported.length > 0) {
        createNotification("استيراد منتجات جماعي", `تم استيراد عدد ${imported.length} منتجات وموديلات جديدة إلى مكتبة التصاميم.`, "system");
      }
      await persistMutationWithFastDurability();
      return res.json({ success: true, count: imported.length, imported, errors });
    }

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
}

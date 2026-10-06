import express from "express";
import { db } from "../../../../db/index.ts";
import { materials as materialsTable, supplierQuotes as supplierQuotesTable } from "../../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../../server-core.ts";
import { getActorId, isEmployee, sanitizeMaterialForEmployee, sanitizeSupplierQuote } from "./shared.ts";

const {
  MATERIALS,
  SUPPLIERS,
  SUPPLIER_QUOTES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  idNum,
} = core;

function requireMaterialPricingRole(req: express.Request, res: express.Response): boolean {
  const role = core.getRequestUser(req)?.role;
  if (!role || !["admin", "accountant"].includes(role)) { res.status(403).json({ success: false, message: "إدارة عروض الموردين متاحة للإدارة والحسابات فقط" }); return false; }
  return true;
}

export function registerMaterialSupplierRoutes(app: express.Express) {
  app.get("/api/materials/:id/supplier-quotes", (req, res) => {
    const quotes = SUPPLIER_QUOTES
      .filter(quote => quote.materialId === req.params.id)
      .map(quote => sanitizeSupplierQuote(quote as Record<string, unknown>, req));
    res.json({ success: true, quotes });
  });

  app.post("/api/materials/:id/supplier-quotes", async (req, res) => {
    if (!requireMaterialPricingRole(req, res)) return;
    const { supplierId, supplierName, pricePerUnit, minOrderQuantity, deliveryDays, paymentTerms, qualityRating, notes } = req.body;
    if (!pricePerUnit) {
      res.status(400).json({ success: false, message: "سعر الوحدة مطلوب" });
      return;
    }

    const materialDbId = idNum(req.params.id, "m-");
    if (!materialDbId) {
      res.status(400).json({ success: false, message: "معرف المادة غير صالح" });
      return;
    }

    let finalSupName = supplierName || "مورد جديد";
    const supplierNumericId = idNum(supplierId, "s-");
    if (supplierNumericId) {
      const existingSupplier = SUPPLIERS.find(supplier => supplier.id === supplierId);
      if (existingSupplier) finalSupName = existingSupplier.name;
    }

    try {
      const inserted = await db.insert(supplierQuotesTable).values({
        materialId: materialDbId,
        supplierId: supplierNumericId,
        supplierName: finalSupName,
        pricePerUnit: Number(pricePerUnit) || 0,
        minOrderQuantity: Number(minOrderQuantity) || 1,
        deliveryDays: Number(deliveryDays) || 1,
        paymentTerms: paymentTerms || "نقدي",
        qualityRating: Number(qualityRating) || 4.5,
        notes: notes || null,
      }).returning();

      const row = inserted[0];
      if (!row) throw new Error("فشل إنشاء عرض المورد");

      const newQuote = {
        id: "sq-" + row.id,
        materialId: req.params.id,
        supplierId: supplierNumericId ? "s-" + supplierNumericId : "s-custom",
        supplierName: row.supplierName,
        pricePerUnit: row.pricePerUnit,
        minOrderQuantity: row.minOrderQuantity,
        deliveryDays: row.deliveryDays,
        paymentTerms: row.paymentTerms || "",
        qualityRating: row.qualityRating,
        notes: row.notes || "",
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      };

      SUPPLIER_QUOTES.push(newQuote);
      res.status(201).json({
        success: true,
        quote: sanitizeSupplierQuote(newQuote, req),
        quotes: SUPPLIER_QUOTES
          .filter(quote => quote.materialId === req.params.id)
          .map(quote => sanitizeSupplierQuote(quote as Record<string, unknown>, req)),
      });
    } catch (error: unknown) {
      console.error("Error adding supplier quote:", error);
      res.status(500).json({
        success: false,
        message: "فشل إضافة عرض السعر: " + (error instanceof Error ? error.message : String(error)),
      });
    }
  });

  app.delete("/api/materials/:id/supplier-quotes/:quoteId", async (req, res) => {
    if (!requireMaterialPricingRole(req, res)) return;
    const quoteId = idNum(req.params.quoteId, "sq-");
    try {
      if (quoteId) {
        await db.delete(supplierQuotesTable).where(eq(supplierQuotesTable.id, quoteId));
      }

      const index = SUPPLIER_QUOTES.findIndex(
        quote => quote.id === req.params.quoteId && quote.materialId === req.params.id,
      );
      if (index !== -1) SUPPLIER_QUOTES.splice(index, 1);

      res.json({
        success: true,
        quotes: SUPPLIER_QUOTES
          .filter(quote => quote.materialId === req.params.id)
          .map(quote => sanitizeSupplierQuote(quote as Record<string, unknown>, req)),
      });
    } catch (error: unknown) {
      console.error("Error deleting supplier quote:", error);
      res.status(500).json({
        success: false,
        message: "فشل حذف عرض السعر: " + (error instanceof Error ? error.message : String(error)),
      });
    }
  });

  app.post("/api/materials/:id/set-primary-supplier", async (req, res) => {
    if (!requireMaterialPricingRole(req, res)) return;
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { supplierId, supplierName, pricePerUnit } = req.body;
    if (supplierId) material.supplierId = supplierId;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || material.pricePerUnit;

    try {
      const materialDbId = idNum(req.params.id, "m-");
      const supplierDbId = idNum(supplierId, "s-");
      if (materialDbId) {
        await db.update(materialsTable).set({
          ...(supplierDbId ? { supplierId: supplierDbId } : {}),
          pricePerUnit: material.pricePerUnit,
        }).where(eq(materialsTable.id, materialDbId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: "SET_PRIMARY_SUPPLIER",
        entityType: "Material",
        entityId: material.id,
        createdAt: new Date().toISOString(),
        details: `تمت ترقية المورد ${supplierName || supplierId} لمورد رئيسي بسعر $${pricePerUnit}`,
      });

      res.json({ success: true, material: sanitizeMaterialForEmployee(material, req) });
    } catch (error: unknown) {
      console.error("Error setting primary supplier:", error);
      res.status(500).json({
        success: false,
        message: "فشل تعيين المورد الرئيسي: " + (error instanceof Error ? error.message : String(error)),
      });
    }
  });
}

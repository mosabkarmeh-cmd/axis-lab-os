import express from "express";
import * as core from "../../../../server-core.ts";
import { isEmployee, sanitizeMaterialForEmployee, sanitizeSupplierQuote } from "../shared.ts";

const {
  MATERIALS,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  SUPPLIER_QUOTES,
  SUPPLIERS,
} = core;

export function registerMaterialDetailRoute(app: express.Express) {
app.get("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const inventory = INVENTORY.find(item => item.materialId === material.id);
    const supplier = SUPPLIERS.find(item => item.id === material.supplierId);
    const transactions = INVENTORY_TRANSACTIONS
      .filter(item => item.materialId === material.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
    const remnants = REMNANTS.filter(item => item.materialId === material.id && (item.status === "available" || item.status === "reserved"));
    const quotes = SUPPLIER_QUOTES.filter(item => item.materialId === material.id);

    const safeQuotes = quotes.map(quote =>
      sanitizeSupplierQuote(quote as Record<string, unknown>, req),
    );
    const detail = {
      ...material,
      inventory: inventory || null,
      supplier: isEmployee(req) ? null : (supplier || null),
      supplierQuotes: safeQuotes,
      transactions,
      remnants,
    };

    res.json({ success: true, material: sanitizeMaterialForEmployee(detail, req) });
  });
}

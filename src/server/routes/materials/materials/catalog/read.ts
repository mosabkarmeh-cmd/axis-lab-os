import express from "express";
import * as core from "../../../../server-core.ts";
import { isEmployee, sanitizeMaterialForEmployee } from "../shared.ts";

const {
  MATERIALS,
  INVENTORY,
  SUPPLIERS,
} = core;

export function registerMaterialCatalogReadRoutes(app: express.Express) {
app.get("/api/materials", (req, res) => {
    const { search, category } = req.query;
    let list = [...MATERIALS];

    if (search) {
      const searchStr = String(search).toLowerCase();
      list = list.filter(material =>
        material.name.toLowerCase().includes(searchStr) ||
        (material.subCategory && material.subCategory.toLowerCase().includes(searchStr)),
      );
    }
    if (category && category !== "الكل") {
      list = list.filter(material => material.category === category);
    }

    const employee = isEmployee(req);
    const enrichedList = list.map(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      const supplier = SUPPLIERS.find(item => item.id === material.supplierId);
      const result = {
        ...material,
        pricePerUnit: employee ? 0 : material.pricePerUnit,
        inventory: inventory || null,
        supplier: employee ? null : (supplier || null),
      };
      return sanitizeMaterialForEmployee(result, req);
    });

    res.json({ success: true, materials: enrichedList });
  });

  app.get("/api/materials/categories", (req, res) => {
    const categories = Array.from(new Set(MATERIALS.map(material => material.category)));
    res.json({ success: true, categories });
  });

  app.get("/api/materials/low-stock", (req, res) => {
    const lowStock = MATERIALS.filter(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      const available = inventory ? inventory.availableQuantity : 0;
      return available < material.minimumStock;
    }).map(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      return {
        id: material.id,
        name: material.name,
        available: inventory ? inventory.availableQuantity : 0,
        minimum: material.minimumStock,
        unit: material.unit,
      };
    });
    res.json({ success: true, lowStock });
  });
}

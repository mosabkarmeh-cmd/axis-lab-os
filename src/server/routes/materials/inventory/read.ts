import express from "express";
import * as core from "../../../server-core.ts";

const { MATERIALS, INVENTORY, INVENTORY_TRANSACTIONS, USERS, getRequestUser } = core;

export function registerInventoryReadRoutes(app: express.Express) {
app.get("/api/inventory/transactions", (req, res) => {
    const { materialId, type } = req.query;
    let list = [...INVENTORY_TRANSACTIONS];

    if (materialId) list = list.filter(t => t.materialId === materialId);
    if (type) list = list.filter(t => t.type === type);

    const enrichedList = list.map(t => {
      const mat = MATERIALS.find(m => m.id === t.materialId);
      const user = USERS.find(u => u.id === t.createdById);
      return {
        ...t,
        material: mat ? { id: mat.id, name: mat.name, unit: mat.unit } : null,
        createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: enrichedList });
  });

  app.get("/api/inventory/stats", (req, res) => {
    const totalMaterials = MATERIALS.length;
    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    MATERIALS.forEach(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const qty = inv ? inv.quantity : 0;
      const avail = inv ? inv.availableQuantity : 0;
      totalValue += (qty * m.pricePerUnit);
      if (avail < m.minimumStock) lowStock++;
      if (avail <= 0) outOfStock++;
    });

    const isEmployee = getRequestUser(req)?.role === "employee";
    res.json({
      success: true,
      stats: {
        totalMaterials,
        totalValue: isEmployee ? 0 : totalValue,
        lowStock,
        outOfStock,
      },
    });
  });

  app.get("/api/inventory/:materialId/transactions", (req, res) => {
    const { materialId } = req.params;
    const list = INVENTORY_TRANSACTIONS.filter(t => t.materialId === materialId)
      .map(t => {
        const user = USERS.find(u => u.id === t.createdById);
        return {
          ...t,
          createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: list });
  });
}

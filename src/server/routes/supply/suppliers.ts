import express from "express";
import { db } from "../../../db/index.ts";
import { suppliers as suppliersTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";

const {
  USE_SQLITE,
  schedulePersist,
  SUPPLIERS,
  idNum,
  getRequestUser,
} = core;

export function registerSupplierRoutes(app: express.Express) {
app.get("/api/suppliers", (req, res) => {
    res.json({ success: true, suppliers: SUPPLIERS });
  });

  app.post("/api/suppliers", async (req, res) => {
    const role = getRequestUser(req)?.role;
    if (!role || !["admin", "accountant"].includes(role)) { res.status(403).json({ success: false, message: "إدارة الموردين متاحة للإدارة والحسابات فقط" }); return; }
    const { name, phone, email, address, notes } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    try {
      if (USE_SQLITE) {
        const nextId = SUPPLIERS.reduce((max, supplier) => Math.max(max, idNum(supplier.id, "s-") || 0), 0) + 1;
        const newSup = {
          id: `s-${nextId}`,
          name: String(name).trim(),
          phone: phone || "",
          email: email || "",
          address: address || "",
          notes: notes || "",
          createdAt: new Date().toISOString(),
        };
        SUPPLIERS.push(newSup);
        schedulePersist();
        res.status(201).json({ success: true, supplier: newSup });
        return;
      }
      const inserted = await db.insert(suppliersTable).values({
        name, phone: phone || null, email: email || null, address: address || null, notes: notes || null,
      }).returning();
      const row = inserted[0];
      const newSup = {
        id: "s-" + row.id, name: row.name, phone: row.phone || "", email: row.email || "",
        address: row.address || "", notes: row.notes || "",
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      };
      SUPPLIERS.push(newSup);
      res.status(201).json({ success: true, supplier: newSup });
    } catch (err: unknown) {
      console.error("Error adding supplier:", err);
      res.status(500).json({ success: false, message: "فشل إضافة المورد: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

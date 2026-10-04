import express from "express";
import { db } from "../../../db/index.ts";
import { remnants as remnantsTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";

const {
  REMNANTS,
  MATERIALS,
  SUPPLIERS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  idNum,
} = core;

export function registerRemnantRoutes(app: express.Express) {
app.get("/api/remnants", (req, res) => {
    const { materialId, minWidth, minHeight } = req.query;
    let list = REMNANTS.filter(r => r.status === "available");

    if (materialId) list = list.filter(r => r.materialId === materialId);
    if (minWidth) list = list.filter(r => r.width >= Number(minWidth));
    if (minHeight) list = list.filter(r => r.height >= Number(minHeight));

    const enrichedList = list.map(r => {
      const mat = MATERIALS.find(m => m.id === r.materialId);
      return {
        ...r,
        material: mat || null
      };
    }).sort((a, b) => b.area - a.area); // Largest first

    res.json({ success: true, remnants: enrichedList });
  });

  app.get("/api/remnants/stats", (req, res) => {
    const total = REMNANTS.filter(r => r.status === "available").length;
    
    // Group by material
    const groups: Record<string, { count: number, totalArea: number }> = {};
    REMNANTS.filter(r => r.status === "available").forEach(r => {
      if (!groups[r.materialId]) {
        groups[r.materialId] = { count: 0, totalArea: 0 };
      }
      groups[r.materialId].count++;
      groups[r.materialId].totalArea += (r.area * r.quantity);
    });

    const byMaterial = Object.entries(groups).map(([matId, data]) => ({
      materialId: matId,
      count: data.count,
      totalArea: data.totalArea
    }));

    res.json({ success: true, stats: { total, byMaterial } });
  });

  app.post("/api/remnants", (req, res) => {
    const { materialId, width, height, quantity, location } = req.body;
    if (!materialId || !width || !height) {
      res.status(400).json({ success: false, message: "MaterialId, width, and height are required" });
      return;
    }

    const w = Number(width) || 0;
    const h = Number(height) || 0;
    const q = Number(quantity) || 1;

    if (w < 100 || h < 100) {
      res.status(400).json({ success: false, message: "Remnant piece too small (minimum 100x100mm)" });
      return;
    }

    const newRem = {
      id: nextEntityId("rem"),
      materialId,
      width: w,
      height: h,
      area: w * h,
      quantity: q,
      status: "available",
      location: location || "صندوق البقايا الرئيسي",
      createdAt: new Date().toISOString()
    };

    REMNANTS.push(newRem);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_REMNANT",
      entityType: "Remnant",
      entityId: newRem.id,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, remnant: newRem });
  });

  app.post("/api/remnants/find-suitable", (req, res) => {
    const { materialId, requiredWidth, requiredHeight } = req.body;
    if (!materialId || !requiredWidth || !requiredHeight) {
      res.status(400).json({ success: false, message: "MaterialId, requiredWidth, requiredHeight are required" });
      return;
    }

    const reqW = Number(requiredWidth);
    const reqH = Number(requiredHeight);

    const match = REMNANTS.filter(r => 
      r.materialId === materialId &&
      r.status === "available" &&
      r.quantity > 0 &&
      ((r.width >= reqW && r.height >= reqH) || (r.width >= reqH && r.height >= reqW))
    ).sort((a, b) => a.area - b.area)[0];

    res.json({ success: true, remnant: match || null });
  });

  app.post("/api/remnants/consume/:id", async (req, res) => {
    const rem = REMNANTS.find(r => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ success: false, message: "Remnant piece not found" });
      return;
    }

    const quantity = Number(req.body.quantity) || 1;
    if (rem.quantity < quantity) {
      res.status(400).json({ success: false, message: `Insufficient remnant quantity. Available: ${rem.quantity}` });
      return;
    }

    rem.quantity -= quantity;
    if (rem.quantity === 0) {
      rem.status = "consumed";
    }

    try {
      const remId = idNum(rem.id, "rem-");
      if (remId) {
        await db.update(remnantsTable).set({ quantity: rem.quantity, status: rem.status }).where(eq(remnantsTable.id, remId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-2",
        action: "CONSUME_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: unknown) {
      console.error("Error consuming remnant:", err);
      res.status(500).json({ success: false, message: "فشل استهلاك البقايا: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/remnants/waste/:id", async (req, res) => {
    const rem = REMNANTS.find(r => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ success: false, message: "Remnant piece not found" });
      return;
    }

    rem.status = "waste";

    try {
      const remId = idNum(rem.id, "rem-");
      if (remId) {
        await db.update(remnantsTable).set({ status: "waste" }).where(eq(remnantsTable.id, remId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "u-2",
        action: "WASTE_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: unknown) {
      console.error("Error marking remnant as waste:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة البقايا: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // ==================== SUPPLIERS API ====================
}

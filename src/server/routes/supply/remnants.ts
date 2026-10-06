import express from "express";
import { db } from "../../../db/index.ts";
import { remnants as remnantsTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";
import { isEmployee } from "../materials/materials/shared.ts";

const {
  REMNANTS,
  MATERIALS,
  SUPPLIERS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  idNum,
  getRequestUser,
  USE_POSTGRES,
  persistMutationWithFastDurability,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

function requireRemnantOperator(req: express.Request, res: express.Response): boolean {
  const role = getRequestUser(req)?.role;
  if (!role || !["admin", "employee"].includes(role)) {
    res.status(403).json({ success: false, message: "عمليات البقايا متاحة للإدارة والموظفين التشغيليين فقط" });
    return false;
  }
  return true;
}

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
        material: mat
          ? (isEmployee(req)
            ? { id: mat.id, name: mat.name, category: mat.category, subCategory: mat.subCategory, thickness: mat.thickness, color: mat.color, width: mat.width, height: mat.height, unit: mat.unit }
            : mat)
          : null
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

  app.post("/api/remnants", async (req, res) => {
    if (!requireRemnantOperator(req, res)) return;
    const { materialId, width, height, quantity, location } = req.body;
    if (!materialId || !width || !height) {
      res.status(400).json({ success: false, message: "MaterialId, width, and height are required" });
      return;
    }

    if (!MATERIALS.some(material => material.id === materialId)) {
      res.status(400).json({ success: false, message: "المادة المحددة غير موجودة" });
      return;
    }
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    const q = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(q) || w <= 0 || h <= 0 || q <= 0) {
      res.status(400).json({ success: false, message: "أبعاد وكمية البقايا يجب أن تكون أرقاماً موجبة وصالحة" });
      return;
    }

    if (w < 100 || h < 100) {
      res.status(400).json({ success: false, message: "Remnant piece too small (minimum 100x100mm)" });
      return;
    }

    let newRem = {
      id: nextEntityId("rem"),
      materialId, width: w, height: h, area: w * h, quantity: q,
      status: "available", location: location || "صندوق البقايا الرئيسي",
      createdAt: new Date().toISOString()
    };

    if (USE_POSTGRES) {
      const materialDbId = idNum(materialId, "m-");
      if (!materialDbId) { res.status(400).json({ success: false, message: "معرف المادة غير صالح" }); return; }
      try {
        const inserted = await db.insert(remnantsTable).values({
          materialId: materialDbId, width: w, height: h, area: w * h, quantity: q,
          status: "available", location: location || "صندوق البقايا الرئيسي"
        }).returning();
        const row = inserted[0];
        if (!row) throw new Error("تعذر إنشاء سجل البقايا");
        newRem = { ...newRem, id: "rem-" + row.id };
      } catch (error: unknown) {
        res.status(500).json({ success: false, message: "فشل حفظ البقايا: " + (error instanceof Error ? error.message : String(error)) });
        return;
      }
    }

    REMNANTS.push(newRem);
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_REMNANT",
      entityType: "Remnant",
      entityId: newRem.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
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
    if (!Number.isFinite(reqW) || !Number.isFinite(reqH) || reqW <= 0 || reqH <= 0) {
      res.status(400).json({ success: false, message: "الأبعاد المطلوبة يجب أن تكون أرقاماً موجبة وصالحة" });
      return;
    }

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

    if (!requireRemnantOperator(req, res)) return;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400).json({ success: false, message: "كمية الاستهلاك يجب أن تكون رقماً موجباً وصالحاً" });
      return;
    }
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
        userId: getActorId(req),
        action: "CONSUME_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: unknown) {
      rem.quantity += quantity;
      rem.status = rem.quantity > 0 ? "available" : "consumed";
      console.error("Error consuming remnant:", err);
      res.status(500).json({ success: false, message: "فشل استهلاك البقايا: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/remnants/waste/:id", async (req, res) => {
    if (!requireRemnantOperator(req, res)) return;
    const rem = REMNANTS.find(r => r.id === req.params.id);
    if (!rem) {
      res.status(404).json({ success: false, message: "Remnant piece not found" });
      return;
    }

    const previousStatus = rem.status;
    rem.status = "waste";

    try {
      const remId = idNum(rem.id, "rem-");
      if (remId) {
        await db.update(remnantsTable).set({ status: "waste" }).where(eq(remnantsTable.id, remId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: "WASTE_REMNANT",
        entityType: "Remnant",
        entityId: rem.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, remnant: rem });
    } catch (err: unknown) {
      rem.status = previousStatus;
      console.error("Error marking remnant as waste:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة البقايا: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // ==================== SUPPLIERS API ====================
}

import express from "express";
import { db } from "../../../../db/index.ts";
import {
  inventory as inventoryTable,
  inventoryTransactions as inventoryTransactionsTable,
} from "../../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../../server-core.ts";

const {
  USE_POSTGRES,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  idNum,
  persistStateNow,
  getRequestUser,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerInventoryMutationRoutes(app: express.Express) {
app.post("/api/inventory/:materialId/update", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, type, referenceType, referenceId, reason, userId, location } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const beforeQty = Number(inv.quantity) || 0;
    const qtyChange = Number(quantity);
    if (!Number.isFinite(qtyChange) || qtyChange === 0) {
      res.status(400).json({ success: false, message: "Inventory adjustment must be a finite non-zero number" });
      return;
    }
    const afterQty = beforeQty + qtyChange;

    if (afterQty < 0 || afterQty < Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: `Insufficient stock. Available: ${beforeQty - Number(inv.reservedQuantity || 0)}, Requested adjustment: ${qtyChange}` });
      return;
    }

    inv.quantity = afterQty;
    inv.availableQuantity = afterQty - inv.reservedQuantity;
    if (location) inv.location = location;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            quantity: afterQty, availableQuantity: inv.availableQuantity,
            ...(location ? { location } : {}),
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: type || "adjustment", quantity: qtyChange, beforeQty, afterQty,
            referenceType: referenceType || null, referenceId: referenceId || null,
            reason: reason || "تحديث يدوي للمخزون",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: type || "adjustment",
        quantity: qtyChange,
        beforeQty,
        afterQty,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        reason: reason || "تحديث يدوي للمخزون",
        createdById: getActorId(req),
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: `INVENTORY_${type ? type.toUpperCase() : 'ADJUSTMENT'}`,
        entityType: "Inventory",
        entityId: inv.id,
        createdAt: new Date().toISOString()
      });

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error updating inventory:", err);
      res.status(500).json({ success: false, message: `فشل تحديث المخزون: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  app.post("/api/inventory/:materialId/reserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Reservation quantity must be a positive finite number" });
      return;
    }
    const available = inv.quantity - inv.reservedQuantity;
    if (available < qty) {
      res.status(400).json({ success: false, message: `Insufficient available stock. Available: ${available}, Requested: ${qty}` });
      return;
    }

    inv.reservedQuantity += qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "reservation", quantity: qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "حجز مواد للطلب",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "reservation",
        quantity: qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "حجز مواد للطلب",
        createdById: getActorId(req),
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error reserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل حجز المخزون: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/inventory/:materialId/unreserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Unreservation quantity must be a positive finite number" });
      return;
    }
    if (qty > Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: "Cannot release more stock than is currently reserved" });
      return;
    }
    inv.reservedQuantity = inv.reservedQuantity - qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "unreserve", quantity: -qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "إلغاء حجز مواد",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "unreserve",
        quantity: -qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "إلغاء حجز مواد",
        createdById: getActorId(req),
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error unreserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل إلغاء حجز المخزون: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

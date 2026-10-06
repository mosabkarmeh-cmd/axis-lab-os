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
  ORDERS,
} = core;

function requireInventoryRole(req: express.Request, res: express.Response, allowed: readonly string[]): boolean {
  const role = getRequestUser(req)?.role;
  if (!role || !allowed.includes(role)) {
    res.status(403).json({ success: false, message: "غير مصرح لك بتعديل المخزون" });
    return false;
  }
  return true;
}

function hasOrder(orderId: unknown): boolean {
  if (typeof orderId !== "string" || !orderId.trim()) return false;
  return ORDERS.some(order => order.id === orderId || order.id === orderId.replace(/^order-/, ""));
}

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerInventoryMutationRoutes(app: express.Express) {
app.post("/api/inventory/:materialId/update", async (req, res) => {
    if (!requireInventoryRole(req, res, ["admin", "accountant"])) return;

    const { materialId } = req.params;
    const { quantity, type, referenceType, referenceId, reason, location } = req.body;

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
    const adjustmentType = typeof type === "string" && type.trim() ? type.trim().toLowerCase() : "adjustment";
    const allowedTypes = new Set(["adjustment", "receive", "consume", "waste", "return"]);
    if (!allowedTypes.has(adjustmentType)) {
      res.status(400).json({ success: false, message: "نوع حركة المخزون غير صالح" });
      return;
    }

    if (afterQty < 0 || afterQty < Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: `Insufficient stock. Available: ${beforeQty - Number(inv.reservedQuantity || 0)}, Requested adjustment: ${qtyChange}` });
      return;
    }

    const previousLocation = inv.location;
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
            materialId: matId, type: adjustmentType, quantity: qtyChange, beforeQty, afterQty,
            referenceType: referenceType || null, referenceId: referenceId || null,
            reason: reason || "تحديث يدوي للمخزون",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: adjustmentType,
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
        action: `INVENTORY_${adjustmentType.toUpperCase()}`,
        entityType: "Inventory",
        entityId: inv.id,
        createdAt: new Date().toISOString()
      });

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      inv.quantity = beforeQty;
      inv.availableQuantity = beforeQty - Number(inv.reservedQuantity || 0);
      inv.location = previousLocation;
      console.error("Error updating inventory:", err);
      res.status(500).json({ success: false, message: `فشل تحديث المخزون: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  app.post("/api/inventory/:materialId/reserve", async (req, res) => {
    if (!requireInventoryRole(req, res, ["admin", "employee"])) return;

    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    if (!hasOrder(referenceId)) {
      res.status(400).json({ success: false, message: "يجب ربط الحجز بطلب صالح" });
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

    const previousReserved = Number(inv.reservedQuantity || 0);
    inv.reservedQuantity = previousReserved + qty;
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
      inv.reservedQuantity = previousReserved;
      inv.availableQuantity = inv.quantity - previousReserved;
      console.error("Error reserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل حجز المخزون: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/inventory/:materialId/unreserve", async (req, res) => {
    if (!requireInventoryRole(req, res, ["admin", "employee"])) return;

    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    if (!hasOrder(referenceId)) {
      res.status(400).json({ success: false, message: "يجب ربط إلغاء الحجز بطلب صالح" });
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
    const previousReserved = Number(inv.reservedQuantity || 0);
    inv.reservedQuantity = previousReserved - qty;
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
      inv.reservedQuantity = previousReserved;
      inv.availableQuantity = inv.quantity - previousReserved;
      console.error("Error unreserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل إلغاء حجز المخزون: " + (err instanceof Error ? err.message : String(err)) });
    }
  });
}

import express from "express";
import { db } from "../../../db/index.ts";
import { supplyOrders as supplyOrdersTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";

const {
  USE_SQLITE,
  USE_POSTGRES,
  INVENTORY_TRANSACTIONS,
  schedulePersist,
  MATERIALS,
  INVENTORY,
  SUPPLIERS,
  SUPPLY_ORDERS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  idNum,
  getRequestUser,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

function requireSupplyFinanceRole(req: express.Request, res: express.Response): boolean {
  const role = getRequestUser(req)?.role;
  if (!role || !["admin", "accountant"].includes(role)) {
    res.status(403).json({ success: false, message: "طلبات التوريد متاحة للإدارة والحسابات فقط" });
    return false;
  }
  return true;
}

export function registerSupplyOrderRoutes(app: express.Express) {
app.get("/api/supply-orders", (req, res) => {
    const populated = SUPPLY_ORDERS.map(order => {
      const supplier = SUPPLIERS.find(s => s.id === order.supplierId);
      const material = MATERIALS.find(m => m.id === order.materialId);
      return {
        ...order,
        supplierName: supplier ? supplier.name : "مورد غير معروف",
        materialName: material ? material.name : "مادة غير معروفة",
        materialCategory: material ? material.category : "عام"
      };
    });
    res.json({ success: true, supplyOrders: populated });
  });

  app.post("/api/supply-orders", async (req, res) => {
    if (!requireSupplyFinanceRole(req, res)) return;
    const { supplierId, materialId, quantity, unitPrice, expectedDeliveryDate, notes } = req.body;
    if (!supplierId || !materialId || !quantity || !unitPrice) {
      res.status(400).json({ success: false, message: "جميع الحقول الأساسية مطلوبة (المورد، المادة، الكمية، سعر الوحدة)" });
      return;
    }

    const supId = idNum(supplierId, "s-");
    const matId = idNum(materialId, "m-");
    if (!SUPPLIERS.some(supplier => supplier.id === supplierId) || !MATERIALS.some(material => material.id === materialId)) {
      res.status(400).json({ success: false, message: "المورد أو المادة المحددة غير موجودة" });
      return;
    }
    if (!supId || !matId) {
      res.status(400).json({ success: false, message: "مورد أو مادة غير صالحة" });
      return;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      res.status(400).json({ success: false, message: "الكمية وسعر الوحدة يجب أن يكونا رقمين موجبين وصالحين" });
      return;
    }
    const orderDate = new Date().toISOString().split('T')[0];
    const expDelivery = expectedDeliveryDate || new Date(Date.now() + 3600000 * 24 * 5).toISOString().split('T')[0];
    if (expectedDeliveryDate !== undefined && Number.isNaN(Date.parse(String(expectedDeliveryDate)))) {
      res.status(400).json({ success: false, message: "تاريخ التسليم المتوقع غير صالح" });
      return;
    }

    try {
      let newOrder: typeof SUPPLY_ORDERS[number];
      if (USE_SQLITE) {
        // The packaged desktop build uses the in-process SQLite persistence queue.
        // Do not call the Postgres Drizzle adapter here; it produces a 500 in offline mode.
        newOrder = {
          id: `so-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          supplierId: `s-${supId}`, materialId: `m-${matId}`, quantity: qty, unitPrice: price,
          totalPrice: qty * price, status: "pending", orderDate, expectedDeliveryDate: expDelivery,
          actualDeliveryDate: "", notes: notes || "",
        };
        SUPPLY_ORDERS.push(newOrder);
        // Queue the SQLite snapshot without allowing a persistence retry to turn a
        // successfully created local order into an HTTP 500 response.
        schedulePersist();
      } else {
        const inserted = await db.insert(supplyOrdersTable).values({
          supplierId: supId, materialId: matId, quantity: qty, unitPrice: price,
          totalPrice: qty * price, status: "pending", orderDate, expectedDeliveryDate: expDelivery,
          notes: notes || null,
        }).returning();
        const row = inserted[0];
        newOrder = {
          id: "so-" + row.id, supplierId: "s-" + row.supplierId, materialId: "m-" + row.materialId,
          quantity: row.quantity, unitPrice: row.unitPrice, totalPrice: row.totalPrice, status: row.status,
          orderDate: row.orderDate, expectedDeliveryDate: row.expectedDeliveryDate || "",
          actualDeliveryDate: row.actualDeliveryDate || "", notes: row.notes || "",
        };
        SUPPLY_ORDERS.push(newOrder);
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: "CREATE_SUPPLY_ORDER",
        entityType: "SupplyOrder",
        entityId: newOrder.id,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ success: true, supplyOrder: newOrder });
    } catch (err: unknown) {
      console.error("Error creating supply order:", err);
      res.status(500).json({ success: false, message: "فشل إنشاء طلب التوريد: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.put("/api/supply-orders/:id/status", async (req, res) => {
    if (!requireSupplyFinanceRole(req, res)) return;
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = status === "received" ? "completed" : status;

    if (!normalizedStatus || !["completed", "cancelled", "pending"].includes(normalizedStatus)) {
      res.status(400).json({ success: false, message: "الحالة المرسلة غير صالحة" });
      return;
    }

    const order = SUPPLY_ORDERS.find(o => o.id === id);
    if (!order) {
      res.status(404).json({ success: false, message: "طلب التوريد غير موجود" });
      return;
    }

    const soId = idNum(id, "so-");
    const matId = idNum(order.materialId, "m-");
    const previousStatus = order.status;
    if (previousStatus === "completed" && normalizedStatus !== "completed") {
      res.status(409).json({ success: false, message: "طلب التوريد المكتمل لا يمكن التراجع عن استلامه." });
      return;
    }
    if (previousStatus === "cancelled" && normalizedStatus === "completed") {
      res.status(409).json({ success: false, message: "لا يمكن تحويل طلب توريد ملغى مباشرة إلى مستلم." });
      return;
    }
    order.status = normalizedStatus;

    try {
      if (normalizedStatus === "completed" && previousStatus !== "completed") {
        order.actualDeliveryDate = new Date().toISOString().split('T')[0];

        const inv = INVENTORY.find(i => i.materialId === order.materialId);
        if (!inv || !matId) {
          order.status = previousStatus;
          order.actualDeliveryDate = "";
          res.status(409).json({ success: false, message: "لا يوجد سجل مخزون صالح للمادة المستلمة" });
          return;
        }
        if (inv && matId) {
          const beforeQty = inv.quantity;
          const afterQty = beforeQty + order.quantity;
          inv.quantity = afterQty;
          inv.availableQuantity = afterQty - inv.reservedQuantity;

          const invId = idNum(inv.id, "inv-");
          if (USE_POSTGRES) {
            if (invId) {
              await db.update(inventoryTable).set({ quantity: afterQty, availableQuantity: inv.availableQuantity }).where(eq(inventoryTable.id, invId));
            }
            await db.insert(inventoryTransactionsTable).values({
              materialId: matId, type: "purchase", quantity: order.quantity, beforeQty, afterQty,
              referenceType: "purchase_order", referenceId: order.id,
              reason: `توريد تلقائي عبر استلام الطلبية ${order.id}`,
            });
          }

          const newTx = {
            id: nextEntityId("tx"),
            materialId: order.materialId,
            type: "purchase",
            quantity: order.quantity,
            beforeQty,
            afterQty,
            referenceType: "purchase_order",
            referenceId: order.id,
            reason: `توريد تلقائي عبر استلام الطلبية ${order.id}`,
            createdById: getActorId(req),
            createdAt: new Date().toISOString()
          };
          INVENTORY_TRANSACTIONS.push(newTx);
        }
      }

      if (soId && USE_POSTGRES) {
        await db.update(supplyOrdersTable).set({
          status: normalizedStatus,
          actualDeliveryDate: order.actualDeliveryDate || null,
        }).where(eq(supplyOrdersTable.id, soId));
      }
      if (USE_SQLITE) schedulePersist();

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: `SUPPLY_ORDER_${status.toUpperCase()}`,
        entityType: "SupplyOrder",
        entityId: order.id,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, supplyOrder: order });
    } catch (err: unknown) {
      console.error("Error updating supply order status:", err);
      res.status(500).json({ success: false, message: "فشل تحديث حالة طلب التوريد: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // API - Get Activity Logs
}
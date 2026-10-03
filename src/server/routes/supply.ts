import express from "express";
import * as core from "../server-core.ts";

const {
  REMNANTS,
  MATERIALS,
  INVENTORY,
  SUPPLIERS,
  SUPPLY_ORDERS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  idNum,
} = core;

function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function registerSupplyRoutes(app: express.Express) {
  registerOrderRoutes(app);

  // ==================== MATERIALS API ====================

  // ==================== REMNANTS API ====================

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
      res.status(500).json({ success: false, message: "فشل استهلاك البقايا: " + err instanceof Error ? err.message : String(err) });
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
      res.status(500).json({ success: false, message: "فشل تحديث حالة البقايا: " + err instanceof Error ? err.message : String(err) });
    }
  });

  // ==================== SUPPLIERS API ====================

  app.get("/api/suppliers", (req, res) => {
    res.json({ success: true, suppliers: SUPPLIERS });
  });

  app.post("/api/suppliers", async (req, res) => {
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
      res.status(500).json({ success: false, message: "فشل إضافة المورد: " + err instanceof Error ? err.message : String(err) });
    }
  });

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
    const { supplierId, materialId, quantity, unitPrice, expectedDeliveryDate, notes } = req.body;
    if (!supplierId || !materialId || !quantity || !unitPrice) {
      res.status(400).json({ success: false, message: "جميع الحقول الأساسية مطلوبة (المورد، المادة، الكمية، سعر الوحدة)" });
      return;
    }

    const supId = idNum(supplierId, "s-");
    const matId = idNum(materialId, "m-");
    if (!supId || !matId) {
      res.status(400).json({ success: false, message: "مورد أو مادة غير صالحة" });
      return;
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const orderDate = new Date().toISOString().split('T')[0];
    const expDelivery = expectedDeliveryDate || new Date(Date.now() + 3600000 * 24 * 5).toISOString().split('T')[0];

    try {
      let newOrder: any;
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
      res.status(500).json({ success: false, message: "فشل إنشاء طلب التوريد: " + err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/supply-orders/:id/status", async (req, res) => {
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
    order.status = normalizedStatus;

    try {
      if (normalizedStatus === "completed" && previousStatus !== "completed") {
        order.actualDeliveryDate = new Date().toISOString().split('T')[0];

        const inv = INVENTORY.find(i => i.materialId === order.materialId);
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
      res.status(500).json({ success: false, message: "فشل تحديث حالة طلب التوريد: " + err instanceof Error ? err.message : String(err) });
    }
  });

  // API - Get Activity Logs
}

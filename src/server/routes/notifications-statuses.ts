import express from "express";
import { db } from "../../db/index.ts";
import { materials as materialsTable } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../server-core.ts";

const {
  NOTIFICATIONS,
  DELETED_ITEMS,
  ORDER_STATUSES,
  createNotification,
  getRequestUser,
  CUSTOMERS,
  PRODUCTS,
  MATERIALS,
  EXPENSES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  idNum,
} = core;

export function registerNotificationsStatusRoutes(app: express.Express) {
  app.get("/api/notifications", (req, res) => {
    res.json({ success: true, notifications: NOTIFICATIONS });
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    const notif = NOTIFICATIONS.find(n => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
    }
    res.json({ success: true, notification: notif });
  });

  app.patch("/api/notifications/read-all", (req, res) => {
    NOTIFICATIONS.forEach(n => n.isRead = true);
    res.json({ success: true });
  });

  app.delete("/api/notifications/:id", (req, res) => {
    const index = NOTIFICATIONS.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
      NOTIFICATIONS.splice(index, 1);
    }
    res.json({ success: true });
  });

  app.post("/api/notifications", (req, res) => {
    const { title, message, type, priority, link } = req.body;
    if (!title || !message) {
      res.status(400).json({ success: false, message: "العنوان والرسالة مطلوبان" });
      return;
    }
    const notif = createNotification(title, message, type || "system", priority || "normal", link || "");
    res.json({ success: true, notification: notif });
  });
  app.get("/api/recycle-bin", (req, res) => {
    res.json({ success: true, items: DELETED_ITEMS });
  });

  app.post("/api/recycle-bin/restore/:id", async (req, res) => {
    const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "العنصر غير موجود في سلة المحذوفات" });
      return;
    }

    const delItem = DELETED_ITEMS.splice(index, 1)[0];
    const data = delItem.originalData;

    // Restore to appropriate array
    if (delItem.entityType === "Customer") {
      CUSTOMERS.push(data as typeof CUSTOMERS[number]);
    } else if (delItem.entityType === "Product") {
      PRODUCTS.push(data as typeof PRODUCTS[number]);
    } else if (delItem.entityType === "Material") {
      const existing = MATERIALS.find(m => m.id === data.id);
      const matId = idNum(data.id, "m-");
      try {
        if (matId) {
          await db.update(materialsTable).set({ status: "active" }).where(eq(materialsTable.id, matId));
        }
      } catch (err) {
        console.error("Error restoring material from recycle bin:", err);
      }
      if (existing) {
        existing.status = "active";
      } else {
        data.status = "active";
        MATERIALS.push(data as typeof MATERIALS[number]);
      }
    } else if (delItem.entityType === "Expense") {
      EXPENSES.push(data as typeof EXPENSES[number]);
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getRequestUser(req)?.id || "system",
      action: "RESTORE_" + delItem.entityType.toUpperCase(),
      entityType: delItem.entityType,
      entityId: delItem.entityId,
      createdAt: new Date().toISOString()
    });

    createNotification(
      `تم استعادة ${delItem.entityType === "Customer" ? "عميل" : delItem.entityType === "Product" ? "منتج" : delItem.entityType === "Material" ? "خامة" : "مصروف"}`,
      `تم استعادة العنصر "${delItem.name}" بنجاح وإعادته إلى قائمة النظام الرئيسية.`,
      "system"
    );

    res.json({ success: true, message: "تم استعادة العنصر بنجاح", item: data });
  });

  app.delete("/api/recycle-bin/permanent/:id", (req, res) => {
    const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "العنصر غير موجود" });
      return;
    }
    const removed = DELETED_ITEMS.splice(index, 1)[0];
    res.json({ success: true, message: "تم الحذف النهائي بنجاح", id: removed.id });
  });
  app.get("/api/order-statuses", (req, res) => {
    res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
  });

  app.post("/api/order-statuses", (req, res) => {
    const { name, color } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: "الاسم مطلوب" });
      return;
    }
    const newStatus = {
      id: "status_" + Date.now(),
      name,
      color: color || "#3b82f6",
      order: ORDER_STATUSES.length + 1,
      isDefault: false
    };
    ORDER_STATUSES.push(newStatus);
    res.json({ success: true, status: newStatus });
  });

  app.put("/api/order-statuses/:id", (req, res) => {
    const status = ORDER_STATUSES.find(s => s.id === req.params.id);
    if (!status) {
      res.status(404).json({ success: false, message: "الحالة غير موجودة" });
      return;
    }
    const { name, color, order } = req.body;
    if (name !== undefined) status.name = name;
    if (color !== undefined) status.color = color;
    if (order !== undefined) status.order = Number(order) || status.order;
    res.json({ success: true, status });
  });

  app.delete("/api/order-statuses/:id", (req, res) => {
    const index = ORDER_STATUSES.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "الحالة غير موجودة" });
      return;
    }
    if (ORDER_STATUSES[index].isDefault) {
      res.status(400).json({ success: false, message: "لا يمكن حذف الحالات الأساسية للنظام" });
      return;
    }
    const removed = ORDER_STATUSES.splice(index, 1)[0];
    res.json({ success: true, id: removed.id });
  });

  app.post("/api/order-statuses/reorder", (req, res) => {
    const { order } = req.body; // array of status ids
    if (Array.isArray(order)) {
      order.forEach((id: string, idx: number) => {
        const s = ORDER_STATUSES.find(status => status.id === id);
        if (s) {
          s.order = idx + 1;
        }
      });
    }
    res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
  });


}

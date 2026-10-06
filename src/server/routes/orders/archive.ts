import express from "express";
import * as core from "../../server-core.ts";
import { orderForResponse, ordersForResponse, getActorId } from "./response.ts";

const {
  ORDERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  SETTINGS,
  createNotification,
} = core;

type OrderRecord = (typeof ORDERS)[number];

function requireArchiveAdmin(req: express.Request, res: express.Response): boolean {
  const user = core.getRequestUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ success: false, message: "أرشفة واستعادة الطلبات متاحة لمدير النظام فقط" });
    return false;
  }
  return true;
}

export function registerOrderArchiveRoutes(app: express.Express) {
// API - Run Auto Archive Orders
  app.post("/api/orders/auto-archive", (req, res) => {
    if (!requireArchiveAdmin(req, res)) return;
    const isAutoEnabled = req.body.force ? true : (SETTINGS.autoArchive?.enabled ?? true);
    if (!isAutoEnabled) {
      return res.json({
        success: false,
        count: 0,
        archivedOrders: [],
        message: "ميزة الأرشفة التلقائية معطلة حالياً في إعدادات النظام."
      });
    }

    const daysThreshold = Number(req.body.days) || SETTINGS.autoArchive?.thresholdDays || 30;
    const cutoffTime = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
    let count = 0;
    const archivedOrders: OrderRecord[] = [];

    ORDERS.forEach((ord) => {
      if (!ord.isArchived) {
        const orderCreatedTime = new Date(ord.createdAt || Date.now()).getTime();
        const isFinished = ord.status === "delivered" || ord.status === "completed" || ord.status === "ready";
        if (isFinished && orderCreatedTime < cutoffTime) {
          ord.isArchived = true;
          ord.archivedAt = new Date().toISOString();
          if (!ord.statusHistory) ord.statusHistory = [];
          ord.statusHistory.unshift({
            oldStatus: ord.status,
            newStatus: ord.status,
            notes: `تم نقل الطلب تلقائياً للأرشيف بواسطة نظام الأرشفة التلقائية (${daysThreshold}+ يوماً على الإنشاء/التسليم)`,
            changedAt: new Date().toISOString()
          });
          count++;
          archivedOrders.push(ord);
        }
      }
    });

    if (count > 0) {
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: "system",
        action: "AUTO_ARCHIVE_ORDERS",
        entityType: "Order",
        entityId: "batch",
        createdAt: new Date().toISOString(),
        details: `تمت أرشفة ${count} طلبات مكتملة منذ أكثر من ${daysThreshold} يوماً.`
      });

      createNotification(
        "أرشفة الطلبات التلقائية 📦",
        `تم نقل ${count} طلبات مكتملة قديمة (تجاوزت ${daysThreshold} يوماً) إلى أرشيف الطلبات لتسريع الورشة.`,
        "system"
      );
    }

    // Check pre-archive notifications for upcoming orders
    const notifyBeforeArchive = SETTINGS.autoArchive?.notifyBeforeArchive ?? true;
    const notifyDaysBefore = SETTINGS.autoArchive?.notifyDaysBefore || 3;
    let upcomingCount = 0;

    if (notifyBeforeArchive) {
      const warningWindowStart = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
      const warningWindowEnd = Date.now() - ((daysThreshold - notifyDaysBefore) * 24 * 60 * 60 * 1000);

      const upcomingOrders = ORDERS.filter((ord) => {
        if (ord.isArchived) return false;
        const orderCreatedTime = new Date(ord.createdAt || Date.now()).getTime();
        const isFinished = ord.status === "delivered" || ord.status === "completed" || ord.status === "ready";
        return isFinished && orderCreatedTime <= warningWindowEnd && orderCreatedTime >= warningWindowStart && !ord.archiveWarningNotified;
      });

      if (upcomingOrders.length > 0) {
        upcomingCount = upcomingOrders.length;
        upcomingOrders.forEach((ord) => { ord.archiveWarningNotified = true; });

        createNotification(
          "تنبيه: أرشفة طلبات وشيكة 🔔",
          `توجد ${upcomingCount} طلبات مكتملة اقتربت من موعد الأرشفة التلقائية خلال ${notifyDaysBefore} أيام (الطلبات: ${upcomingOrders.map((o) => o.orderNumber).slice(0, 3).join(', ')}${upcomingCount > 3 ? '...' : ''}).`,
          "warning"
        );
      }
    }

    res.json({
      success: true,
      count,
      upcomingCount,
      archivedOrders: ordersForResponse(req, archivedOrders),
      message: count > 0 
        ? `تمت أرشفة ${count} طلبات مكتملة تجاوزت ${daysThreshold} يوماً بنجاح.` 
        : `لا توجد طلبات مكتملة تجاوزت ${daysThreshold} يوماً بحاجة للأرشفة حالياً.`
    });
  });

  // API - Get Archived Orders
  app.get("/api/orders/archived", (req, res) => {
    const archived = ORDERS.filter(o => o.isArchived === true);
    res.json(ordersForResponse(req, archived));
  });

  // API - Archive Single Order (Manual Archive)
  app.post("/api/orders/:id/archive", (req, res) => {
    if (!requireArchiveAdmin(req, res)) return;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    order.isArchived = true;
    order.archivedAt = new Date().toISOString();
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: "تم نقل الطلب يدوياً إلى أرشيف الطلبات لتخفيف لوحة التحكم",
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "ARCHIVE_ORDER",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    res.json(orderForResponse(req, order));
  });

  // API - Restore Order from Archive
  app.post("/api/orders/:id/restore", (req, res) => {
    if (!requireArchiveAdmin(req, res)) return;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    order.isArchived = false;
    delete order.archivedAt;
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: "تمت استعادة الطلب من الأرشيف إلى قائمة الطلبات النشطة بنجاح",
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "RESTORE_ORDER_FROM_ARCHIVE",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    res.json(orderForResponse(req, order));
  });
}

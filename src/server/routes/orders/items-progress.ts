import express from "express";
import * as core from "../../server-core.ts";
import { getActorId, orderForResponse } from "./response.ts";

const { ORDERS, ACTIVITY_LOGS, nextActivityLogId, getRequestUser, persistStateNow } = core;

export function registerOrderItemProgressRoutes(app: express.Express) {
// API - Update Order Item Progress (تحديث نسبة إنجاز أجزاء ومواد الطلب والتكرارات)
  app.patch("/api/orders/:id/items-progress", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "employee"].includes(user.role)) {
      res.status(403).json({ success: false, message: "تحديث إنجاز الطلب متاح للإدارة والموظفين التشغيليين فقط" });
      return;
    }
    const { itemId, materialName, setAllCompleted, resetAll, addItem, removeItemId, completedQuantity } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (!order.items) order.items = [];

    const getMaterialKey = (it): string => {
      if (it.material && typeof it.material === 'string' && it.material.trim()) return it.material.trim();
      if (it.materialCategory && typeof it.materialCategory === 'string' && it.materialCategory.trim()) return it.materialCategory.trim();
      const name = (it.productName || it.name || "").trim();
      if (/أكريليك|اكريليك|acrylic/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `أكريليك ${thicknessMatch[0]}` : "أكريليك";
      }
      if (/mdf|ام دي اف|أم دي إف/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `خشب MDF ${thicknessMatch[0]}` : "خشب MDF";
      }
      if (/خشب|خشبي|زان|سويد|بلوط|معاكس|wood/i.test(name)) {
        const thicknessMatch = name.match(/(\d+(\.\d+)?)\s*(ملم|مم|mm)/i);
        return thicknessMatch ? `خشب ${thicknessMatch[0]}` : "خشب طبيعي/معاكس";
      }
      if (/جلد|leather/i.test(name)) return "جلود وقماش";
      if (/صاج|حديد|معادن|ستانلس|stainless|metal/i.test(name)) return "معادن وستانلس";
      return name || "مواد أخرى";
    };

    let autoNote = "";

    if ((addItem && addItem.productName) || removeItemId) {
      if (user.role !== "admin") {
        res.status(403).json({ success: false, message: "إضافة أو حذف بنود الطلب متاح لمدير النظام فقط" });
        return;
      }
    }

    if (completedQuantity !== undefined) {
      const requestedCompleted = Number(completedQuantity);
      if (!Number.isFinite(requestedCompleted) || requestedCompleted < 0) {
        res.status(400).json({ success: false, message: "كمية الإنجاز يجب أن تكون رقماً غير سالب وصالحاً" });
        return;
      }
    }

    if (addItem && addItem.productName) {
      const newId = "item-" + Date.now();
      const q = Math.max(1, Number(addItem.quantity) || 1);
      order.items.push({
        id: newId,
        productName: addItem.productName.trim(),
        materialCategory: addItem.materialName || "أكريليك",
        quantity: q,
        unitPrice: Number(addItem.unitPrice) || 0,
        totalPrice: q * (Number(addItem.unitPrice) || 0),
        completedQuantity: 0,
        isCompleted: false,
        notes: addItem.notes || ""
      });
      autoNote = `إضافة بند جديد لجدول القص: [${addItem.productName}] بكمية ${q} قطعة.`;
    } else if (removeItemId) {
      const idx = order.items.findIndex((it) => it.id === removeItemId);
      if (idx !== -1) {
        const removed = order.items.splice(idx, 1)[0];
        autoNote = `حذف البند [${removed.productName}] من جدول إنجاز القص.`;
      }
    } else if (resetAll) {
      order.items.forEach((it) => {
        it.completedQuantity = 0;
        it.isCompleted = false;
      });
      autoNote = "🔄 تصفير إنجاز كافة القطع والمواد (إعادة التعيين إلى 0%).";
    } else if (setAllCompleted) {
      // Complete all items in order
      order.items.forEach((it) => {
        const q = Number(it.quantity) || 1;
        it.completedQuantity = q;
        it.isCompleted = true;
      });
      autoNote = "🎉 تم تحديث كافة أجزاء ومواد الطلب وجميع القطع والتكرارات إلى إنجاز كامل (100%).";
    } else if (materialName) {
      // Update all items matching materialName
      let targetCount = 0;
      order.items.forEach((it) => {
        const key = getMaterialKey(it);
        if (key === materialName || (it.productName && it.productName.includes(materialName))) {
          const q = Number(it.quantity) || 1;
          const comp = completedQuantity !== undefined ? Math.max(0, Math.min(q, Number(completedQuantity))) : q;
          it.completedQuantity = comp;
          it.isCompleted = comp >= q;
          targetCount++;
        }
      });
      autoNote = `تحديث نسبة إنجاز كافة القطع والمواد التابعة لخامة [${materialName}] (${targetCount} بند).`;
    } else if (itemId) {
      // Update single item
      const item = order.items.find((it) => it.id === itemId);
      if (!item) {
        res.status(404).json({ error: "جزء/عنصر الطلب غير موجود" });
        return;
      }
      const itemQty = Number(item.quantity) || 1;
      const newCompQty = Math.max(0, Math.min(itemQty, Number(completedQuantity) || 0));
      item.completedQuantity = newCompQty;
      item.isCompleted = newCompQty >= itemQty;
      autoNote = `تحديث نسبة إنجاز الجزء [${item.productName}]: ${newCompQty}/${itemQty} قطعة (${Math.round((newCompQty / itemQty) * 100)}%).`;
    }

    // Calculate total order progress across all parts and materials
    let totalReq = 0;
    let totalDone = 0;
    order.items.forEach((it) => {
      const q = Number(it.quantity) || 1;
      const c = it.completedQuantity !== undefined ? Number(it.completedQuantity) : (it.isCompleted ? q : 0);
      totalReq += q;
      totalDone += c;
    });

    const isAllPartsFinished = totalReq > 0 && totalDone >= totalReq;
    const isPartiallyStarted = totalDone > 0;

    // Auto update order status based on overall parts completion
    if (isAllPartsFinished && (order.status === 'in_progress' || order.status === 'new')) {
      order.status = 'ready';
      autoNote += " 🎉 تم استكمال قص وإنجاز كافة أجزاء ومواد الطلب بالكامل (100%)، وتم تحويل حالة الطلب تلقائياً إلى (جاهز للتسليم).";
    } else if (isPartiallyStarted && order.status === 'new') {
      order.status = 'in_progress';
      autoNote += " ⚙️ تم البدء بإنجاز أجزاء الطلب، وتم تحويل الحالة تلقائياً إلى (قيد التنفيذ).";
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: autoNote,
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_ITEM_PROGRESS",
      entityType: "Order",
      entityId: order.id,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json(orderForResponse(req, order));
  });
}

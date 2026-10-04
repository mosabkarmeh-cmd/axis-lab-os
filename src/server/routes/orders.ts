import express from "express";
import * as core from "../server-core.ts";
import { getActorId, orderForResponse, ordersForResponse } from "./orders/response.ts";
import { applyPayment, withAtomicFinancialMutation } from "./orders/financial.ts";
import { registerOrderCrudRoutes } from "./orders/crud.ts";

const {
  ORDERS,
  CUSTOMERS,
  USERS,
  INVOICES,
  nextEntityId,
  nextActivityLogId,
  persistMutationWithFastDurability,
  getRequestUser,
  recordBenchmark,
  orderCreateBenchmarks,
  getNextNumber,
  SETTINGS,
  sypToUsd,
  notifyOverdueOrders,
  persistStateNow,
  ORDER_STATUSES,
  freezeOrderCurrencySnapshot,
  createNotification,
  WORKFLOW_NEXT_REMINDERS,
} = core;


type OrderItem = {
  productName?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
  notes?: string;
  [key: string]: unknown;
};
function asOrderItem(value: unknown): OrderItem {
  return value && typeof value === "object" ? value as OrderItem : {};
}

export function registerOrderRoutes(app: express.Express) {
  registerOrderCrudRoutes(app);

  // API - Update Order Item Progress (تحديث نسبة إنجاز أجزاء ومواد الطلب والتكرارات)
  app.patch("/api/orders/:id/items-progress", (req, res) => {
    const { itemId, materialName, setAllCompleted, resetAll, addItem, removeItemId, completedQuantity, changedById } = req.body;
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

    res.json(orderForResponse(req, order));
  });

  // Financial mutations use one in-memory snapshot plus the SQLite transaction
  // in persistStateNow. If the durable commit fails, restore every affected
  // collection so the API cannot report a payment that was not persisted.
    app.post("/api/orders/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, changedById, paymentId } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const matchingInv2 = INVOICES.find(inv => inv.orderId === order.id) || null;
    let result;
    try {
      result = await withAtomicFinancialMutation(() => applyPayment({ order, inv: matchingInv2, amount, currency, notes, paymentMethod, changedById, paymentId }));
    } catch (error) {
      console.error("[FINANCE] Atomic order payment failed:", error);
      res.status(500).json({ error: "تعذر حفظ الدفعة بشكل ذري؛ لم يتم تغيير البيانات." });
      return;
    }
    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    res.json(result.order);
  });
  // API - Delete Payment Installment
  app.delete("/api/orders/:orderId/payments/:paymentId", (req, res) => {
    const { orderId, paymentId } = req.params;
    const { changedById } = req.body || {};
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن حذف دفعاته بعد التسليم." });
      return;
    }

    if (!order.payments) order.payments = [];
    const pIndex = order.payments.findIndex((p) => p.id === paymentId);
    if (pIndex === -1) {
      res.status(404).json({ error: "سند القبض غير موجود" });
      return;
    }

    const removedPayment = order.payments[pIndex];
    order.payments.splice(pIndex, 1);

    const orderExchangeRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
    order.paidAmount = Math.min(
      Number(order.totalPrice || 0),
      order.payments.reduce((sum: number, payment: PaymentRecord) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * orderExchangeRate)), 0)
    );
    order.remaining = Math.max(0, Number(order.totalPrice || 0) - order.paidAmount);

    // Keep a linked invoice in USD, while the order remains in SYP.
    const matchingInv2 = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv2) {
      matchingInv2.paidAmount = Math.min(
        Number(matchingInv2.totalPrice || 0),
        matchingInv2.payments?.reduce((sum: number, payment: PaymentRecord) => sum + Number(payment.amountUSD || 0), 0) || 0
      );
      matchingInv2.remaining = Math.max(0, Number(matchingInv2.totalPrice || 0) - matchingInv2.paidAmount);
      matchingInv2.status = matchingInv2.remaining === 0 ? "paid" : matchingInv2.paidAmount > 0 ? "partially_paid" : "unpaid";
    }

    const delPayDetails = `إلغاء وحذف سند قبض بقيمة ${(removedPayment.amountSYP || Math.round(Number(removedPayment.amountUSD || 0) * orderExchangeRate)).toLocaleString()} ل.س | المتبقي الجديد: ${order.remaining.toLocaleString()} ل.س`;

    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: delPayDetails,
      changedAt: new Date().toISOString()
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "DELETE_PAYMENT",
      entityType: "Order",
      entityId: order.id,
      details: delPayDetails,
      createdAt: new Date().toISOString()
    });

    res.json(orderForResponse(req, order));
  });

  // API - Update Order Status
  // Assign the worker responsible for each production stage on an order.
  // Open to any authenticated staff member (employee/admin) -- this is an
  // operational assignment, not a performance judgement.
  app.patch("/api/orders/:id/assign-workers", async (req, res) => {
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const { designerId, cutterId, assemblerId, changedById } = req.body;
    const assignableRoles = new Set(["admin", "employee"]);
    if (designerId !== undefined) {
      if (designerId && !USERS.some(u => u.id === designerId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "المصمم المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.designerId = designerId || undefined;
    }
    if (cutterId !== undefined) {
      if (cutterId && !USERS.some(u => u.id === cutterId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "عامل القص المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.cutterId = cutterId || undefined;
    }
    if (assemblerId !== undefined) {
      if (assemblerId && !USERS.some(u => u.id === assemblerId && assignableRoles.has(u.role))) {
        res.status(400).json({ error: "عامل التجميع المحدد غير موجود أو ليس موظفاً" });
        return;
      }
      order.assemblerId = assemblerId || undefined;
    }
    const labelFor = (id: string) => USERS.find(u => u.id === id)?.fullName || id;
    const parts: string[] = [];
    if (designerId !== undefined) parts.push(`المصمم: ${designerId ? labelFor(designerId) : "بدون تعيين"}`);
    if (cutterId !== undefined) parts.push(`عامل القص: ${cutterId ? labelFor(cutterId) : "بدون تعيين"}`);
    if (assemblerId !== undefined) parts.push(`عامل التجميع: ${assemblerId ? labelFor(assemblerId) : "بدون تعيين"}`);
    if (parts.length) {
      order.statusHistory.unshift({
        oldStatus: order.status,
        newStatus: order.status,
        notes: `تحديث تعيين العمال — ${parts.join("، ")}`,
        changedAt: new Date().toISOString()
      });
    }
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "ASSIGN_ORDER_WORKERS",
      entityType: "Order",
      entityId: order.id,
      details: parts.join("، "),
      createdAt: new Date().toISOString()
    });
    await persistStateNow();
    res.json(orderForResponse(req, order));
  });

  // Manager-only performance rating per production stage (design/cutting/assembly).
  app.patch("/api/orders/:id/rate", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "تقييم الطلبات متاح للمدير فقط" });
      return;
    }
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const { designRating, cuttingRating, assemblyRating, ratingNotes } = req.body;
    const validateRating = (value: unknown) => value === undefined || value === null || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5);
    if (!validateRating(designRating) || !validateRating(cuttingRating) || !validateRating(assemblyRating)) {
      res.status(400).json({ error: "التقييم يجب أن يكون رقماً صحيحاً بين 1 و5" });
      return;
    }
    if (designRating !== undefined) order.designRating = designRating ?? undefined;
    if (cuttingRating !== undefined) order.cuttingRating = cuttingRating ?? undefined;
    if (assemblyRating !== undefined) order.assemblyRating = assemblyRating ?? undefined;
    if (ratingNotes !== undefined) order.ratingNotes = ratingNotes;
    order.ratedById = user.id;
    order.ratedAt = new Date().toISOString();

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: user.id,
      action: "RATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      details: `تقييم: التصميم=${order.designRating ?? "-"} القص=${order.cuttingRating ?? "-"} التجميع=${order.assemblyRating ?? "-"}`,
      createdAt: new Date().toISOString()
    });
    await persistStateNow();
    res.json(orderForResponse(req, order));
  });

  // Aggregate per-employee performance stats from order ratings (manager-only).
  app.get("/api/employees/stats", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "إحصائيات الموظفين متاحة للمدير فقط" });
      return;
    }
    const stats: Record<string, {
      userId: string; fullName: string; role: string;
      designOrders: number; designRated: number; designRatingSum: number;
      cuttingOrders: number; cuttingRated: number; cuttingRatingSum: number;
      assemblyOrders: number; assemblyRated: number; assemblyRatingSum: number;
    }> = {};
    const ensure = (userId: string) => {
      if (!stats[userId]) {
        const u = USERS.find(x => x.id === userId);
        stats[userId] = {
          userId, fullName: u?.fullName || userId, role: u?.role || "unknown",
          designOrders: 0, designRated: 0, designRatingSum: 0,
          cuttingOrders: 0, cuttingRated: 0, cuttingRatingSum: 0,
          assemblyOrders: 0, assemblyRated: 0, assemblyRatingSum: 0,
        };
      }
      return stats[userId];
    };
    for (const order of ORDERS) {
      if (order.designerId) {
        const s = ensure(order.designerId);
        s.designOrders += 1;
        if (order.designRating) { s.designRatingSum += order.designRating; s.designRated += 1; }
      }
      if (order.cutterId) {
        const s = ensure(order.cutterId);
        s.cuttingOrders += 1;
        if (order.cuttingRating) { s.cuttingRatingSum += order.cuttingRating; s.cuttingRated += 1; }
      }
      if (order.assemblerId) {
        const s = ensure(order.assemblerId);
        s.assemblyOrders += 1;
        if (order.assemblyRating) { s.assemblyRatingSum += order.assemblyRating; s.assemblyRated += 1; }
      }
    }
    const result = Object.values(stats).map(s => ({
      userId: s.userId,
      fullName: s.fullName,
      role: s.role,
      design: { orders: s.designOrders, avgRating: s.designRated ? Number((s.designRatingSum / s.designRated).toFixed(2)) : null },
      cutting: { orders: s.cuttingOrders, avgRating: s.cuttingRated ? Number((s.cuttingRatingSum / s.cuttingRated).toFixed(2)) : null },
      assembly: { orders: s.assemblyOrders, avgRating: s.assemblyRated ? Number((s.assemblyRatingSum / s.assemblyRated).toFixed(2)) : null },
    }));
    res.json({ success: true, employees: result });
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status, notes, changedById } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (!ORDER_STATUSES.some((entry) => entry.id === status)) {
      res.status(400).json({ error: "حالة الطلب غير صالحة" });
      return;
    }

    // Orders are stored in SYP. Block delivery only when at least one whole lira remains.
    const deliveryRemainingSYP = Math.max(0, Math.round(Number(order.remainingSYP ?? order.remaining ?? 0)));
    if (status === "delivered" && deliveryRemainingSYP > 0) {
      const deliveryRate = Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135;
      res.status(400).json({ 
        error: "حظر التسليم: لا يمكن تسليم الطلب للعميل قبل استيفاء وتسديد كامل المبلغ المتبقي المستحق.",
        remainingUSD: deliveryRemainingSYP / deliveryRate,
        remainingSYP: deliveryRemainingSYP,
        orderNumber: order.orderNumber
      });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (status === "delivered") {
      order.deliveryDateActual = new Date().toISOString();
      // Freeze SYP and USD values exactly at final delivery; later rate changes cannot affect this invoice.
      freezeOrderCurrencySnapshot(order);
    } else {
      // Clear actual delivery date if state was downgraded from delivered
      delete order.deliveryDateActual;
    }

    const statusArabicMap: Record<string, string> = {
      new: "جديد",
      design: "قيد التصميم",
      design_approved: "تم اعتماد التصميم",
      cutting: "قيد القص",
      cutting_complete: "انتهى القص",
      assembly: "قيد التجميع",
      assembly_complete: "انتهى التجميع",
      packaging: "قيد التغليف",
      in_progress: "قيد التنفيذ (قديم)",
      ready: "بانتظار التسليم",
      delivered: "تم التسليم للعميل",
      cancelled: "ملغى"
    };
    const oldStatusLabel = statusArabicMap[oldStatus] || oldStatus;
    const newStatusLabel = statusArabicMap[status] || status;
    const statusChangeMsg = `تغير حالة الطلب من [${oldStatusLabel}] إلى [${newStatusLabel}]${notes ? ` - ملاحظات: ${notes}` : ""}`;

    order.statusHistory.unshift({
      oldStatus,
      newStatus: status,
      notes: notes || `تحديث حالة الطلب إلى ${newStatusLabel}`,
      changedAt: new Date().toISOString(),
      changedById: getActorId(req)
    });

    createNotification(
      `تحديث حالة الطلب #${order.orderNumber}`,
      `انتقلت الحالة من ${oldStatusLabel} إلى ${newStatusLabel}${notes ? `: ${notes}` : ""}`,
      "order",
      status === "ready" ? "high" : "normal",
      "/orders"
    );
    const nextReminder = WORKFLOW_NEXT_REMINDERS[status];
    if (nextReminder) {
      createNotification(
        `الخطوة التالية للطلب #${order.orderNumber}`,
        nextReminder,
        "order",
        ["design_approved", "cutting_complete", "assembly_complete", "ready"].includes(status) ? "high" : "normal",
        "/orders"
      );
    }

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: order.id,
      details: statusChangeMsg,
      createdAt: new Date().toISOString()
    });

    await persistStateNow();
    res.json(orderForResponse(req, order));
  });

  // API - Run Auto Archive Orders
  app.post("/api/orders/auto-archive", (req, res) => {
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

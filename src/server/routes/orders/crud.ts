import express from "express";
import * as core from "../../server-core.ts";
import { getActorId, orderForResponse, ordersForResponse } from "./response.ts";

const {
  ORDERS,
  CUSTOMERS,
  INVOICES,
  nextEntityId,
  nextActivityLogId,
  persistMutationWithFastDurability,
  recordBenchmark,
  orderCreateBenchmarks,
  getNextNumber,
  SETTINGS,
  sypToUsd,
  notifyOverdueOrders,
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

export function registerOrderCrudRoutes(app: express.Express) {
  // API - Get Orders
  app.get("/api/orders", (req, res) => {
    notifyOverdueOrders();
    res.json(ordersForResponse(req, ORDERS));
  });

  // API - Create Order
  app.post("/api/orders", async (req, res) => {
    const orderRequestStartedAt = performance.now();
    const { customerId, notes, priority, items, totalPrice, paidAmount, createdById, deliveryDateExpected, taxPercent, discount } = req.body;
    if (!customerId || !items || items.length === 0) {
      res.status(400).json({ error: "الرجاء اختيار العميل وإضافة عنصر واحد على الأقل للطلب" });
      return;
    }
    recordBenchmark(orderCreateBenchmarks, "request_validation", orderRequestStartedAt);
    const parseItemsStartedAt = performance.now();
    const parsedItems = items.map((rawItem, idx: number) => {
      const it = asOrderItem(rawItem);
      return {
        id: `item-${Date.now()}-${idx}`,
        productName: it.productName,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        notes: it.notes || ""
      };
    });
    recordBenchmark(orderCreateBenchmarks, "parse_items", parseItemsStartedAt);
    const totalsStartedAt = performance.now();

    const itemsSubtotal = parsedItems.reduce((acc: number, cur: OrderItem) => acc + Number(cur.totalPrice || 0), 0);
    const taxRate = Number(taxPercent) || 0;
    const discountAmt = Number(discount) || 0;
    const computedTotal = itemsSubtotal + (itemsSubtotal * (taxRate / 100)) - discountAmt;
    
    // Respect the explicit totalPrice from the frontend if passed, otherwise use computedTotal
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : Math.max(0, computedTotal);
    const orderNum = getNextNumber("order");
    recordBenchmark(orderCreateBenchmarks, "calculate_totals_and_number", totalsStartedAt);
    const objectBuildStartedAt = performance.now();

    const newOrder = {
      id: nextEntityId("ord"),
      orderNumber: orderNum,
      customerId,
      status: "new",
      priority: priority || "normal",
      totalPrice: finalTotal,
      currency: "SYP",
      exchangeRateAtCreation: Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135,
      taxPercent: taxRate,
      discount: discountAmt,
      paidAmount: Number(paidAmount) || 0,
      remaining: Math.max(0, finalTotal - (Number(paidAmount) || 0)),
      notes: notes || "",
      createdById: getActorId(req),
      createdAt: new Date().toISOString(),
      deliveryDateExpected: deliveryDateExpected || new Date(Date.now() + 3600000 * 48).toISOString(), // default 48h
      items: parsedItems,
      statusHistory: [{
        oldStatus: null,
        newStatus: "new",
        notes: "تم استقبال الطلب",
        changedAt: new Date().toISOString(),
        changedById: getActorId(req)
      }]
    };

    ORDERS.unshift(newOrder);

    // Auto-create matching Invoice
    const invoiceId = nextEntityId("inv");
    const invoiceItems = parsedItems.map((rawItem, idx: number) => {
      const it = asOrderItem(rawItem);
      return {
        id: `invitem-${Date.now()}-${idx}`,
        invoiceId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice) || 0,
        discount: 0,
        tax: 0,
        total: Number(it.totalPrice) || 0,
        createdAt: new Date().toISOString()
      };
    });

    const newInvoice = {
      id: invoiceId,
      invoiceNumber: getNextNumber("invoice"),
      orderId: newOrder.id,
      customerId: newOrder.customerId,
      issueDate: new Date().toISOString(),
      dueDate: newOrder.deliveryDateExpected || new Date().toISOString(),
      totalPrice: sypToUsd(newOrder.totalPrice, newOrder.exchangeRateAtCreation),
      totalPriceSYP: Math.round(newOrder.totalPrice),
      exchangeRateAtIssue: newOrder.exchangeRateAtCreation,
      subtotal: sypToUsd(itemsSubtotal, newOrder.exchangeRateAtCreation),
      taxPercent: taxRate,
      discount: sypToUsd(discountAmt, newOrder.exchangeRateAtCreation),
      paidAmount: sypToUsd(newOrder.paidAmount, newOrder.exchangeRateAtCreation),
      remaining: sypToUsd(newOrder.remaining, newOrder.exchangeRateAtCreation),
      status: newOrder.remaining === 0 ? "paid" : newOrder.paidAmount > 0 ? "partially_paid" : "unpaid",
      currency: "USD",
      items: invoiceItems.map((item) => ({ ...item, unitPriceSYP: Math.round(item.unitPrice), totalSYP: Math.round(item.total), unitPrice: sypToUsd(item.unitPrice, newOrder.exchangeRateAtCreation), total: sypToUsd(item.total, newOrder.exchangeRateAtCreation) })),
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: invoiceId,
          action: "created",
          userId: getActorId(req),
          createdAt: new Date().toISOString()
        }
      ]
    };
    INVOICES.unshift(newInvoice);
    recordBenchmark(orderCreateBenchmarks, "build_order_and_invoice", objectBuildStartedAt);

    const activityStartedAt = performance.now();
    // Log Activity
    const newOrderMsg = `إنشاء طلب جديد #${newOrder.orderNumber} بقيمة إجمالية $${newOrder.totalPrice.toFixed(2)} (المدفوع: $${newOrder.paidAmount.toFixed(2)} / المتبقي: $${newOrder.remaining.toFixed(2)})`;
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_ORDER",
      entityType: "Order",
      entityId: newOrder.id,
      details: newOrderMsg,
      createdAt: new Date().toISOString()
    });
    recordBenchmark(orderCreateBenchmarks, "append_activity_log", activityStartedAt);

    const queueStartedAt = performance.now();
    await persistMutationWithFastDurability();
    res.locals.axisPersistScheduled = true;
    recordBenchmark(orderCreateBenchmarks, "queue_persistence", queueStartedAt);
    recordBenchmark(orderCreateBenchmarks, "request_total_to_response", orderRequestStartedAt);
    res.json(orderForResponse(req, newOrder));
  });
  // API - Update Order (Edit details)
  app.put("/api/orders/:id", (req, res) => {
    const { notes, priority, items, paidAmount, customerId, deliveryDateExpected, taxPercent, discount } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.currencyFinalizedAt && (items !== undefined || paidAmount !== undefined || taxPercent !== undefined || discount !== undefined)) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن تعديل البنود أو المبالغ بعد التسليم الكامل." });
      return;
    }

    // 1. Snapshot previous state for precise audit diff
    const oldState = {
      customerId: order.customerId,
      totalPrice: order.totalPrice || 0,
      paidAmount: order.paidAmount || 0,
      remaining: order.remaining || 0,
      discount: order.discount || 0,
      taxPercent: order.taxPercent || 0,
      priority: order.priority || "normal",
      notes: order.notes || "",
      itemsCount: order.items ? order.items.length : 0,
      itemsTotalQty: order.items ? order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.quantity || 1), 0) : 0,
    };

    if (customerId) order.customerId = customerId;
    if (priority) order.priority = priority;
    if (notes !== undefined) order.notes = notes;
    if (deliveryDateExpected) order.deliveryDateExpected = deliveryDateExpected;
    if (paidAmount !== undefined) {
      order.paidAmount = Number(paidAmount) || 0;
    }

    if (taxPercent !== undefined) order.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) order.discount = Number(discount) || 0;

    if (items && items.length > 0) {
      order.items = items.map((rawItem, idx: number) => {
        const it = asOrderItem(rawItem);
        const qty = Number(it.quantity) || 1;
        const comp = it.completedQuantity !== undefined ? Number(it.completedQuantity) : (it.isCompleted ? qty : 0);
        return {
          id: it.id || `item-${Date.now()}-${idx}`,
          productName: it.productName,
          quantity: qty,
          completedQuantity: Math.max(0, Math.min(qty, comp)),
          isCompleted: comp >= qty,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: qty * (Number(it.unitPrice) || 0),
          notes: it.notes || ""
        };
      });
    }

    const itemsSubtotal = order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.totalPrice || 0), 0);
    const taxRate = order.taxPercent !== undefined ? order.taxPercent : 0;
    const discountAmt = order.discount !== undefined ? order.discount : 0;
    order.totalPrice = Math.max(0, itemsSubtotal + (itemsSubtotal * (taxRate / 100)) - discountAmt);

    order.remaining = Math.max(0, order.totalPrice - order.paidAmount);

    // Sync matching Invoice
    const matchingInv = INVOICES.find(inv => inv.orderId === order.id);
    if (matchingInv) {
      matchingInv.totalPrice = order.totalPrice;
      matchingInv.paidAmount = order.paidAmount;
      matchingInv.remaining = order.remaining;
      matchingInv.status = order.remaining === 0 ? "paid" : order.paidAmount > 0 ? "partially_paid" : "unpaid";
      if (customerId) matchingInv.customerId = customerId;
      if (deliveryDateExpected) matchingInv.dueDate = deliveryDateExpected;
    }

    // 2. Compute detailed financial & operational differences
    const changeDetails: string[] = [];

    if (Math.abs(oldState.totalPrice - order.totalPrice) > 0.001) {
      const diff = order.totalPrice - oldState.totalPrice;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير إجمالي السعر من ${Math.round(oldState.totalPrice).toLocaleString()} ل.س إلى ${Math.round(order.totalPrice).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.paidAmount - order.paidAmount) > 0.001) {
      const diff = order.paidAmount - oldState.paidAmount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الواصل/المقدم من ${Math.round(oldState.paidAmount).toLocaleString()} ل.س إلى ${Math.round(order.paidAmount).toLocaleString()} ل.س (الفرق ${diffSign}${Math.round(diff).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.remaining - order.remaining) > 0.001) {
      changeDetails.push(`تعديل المبلغ المتبقي ليصبح ${Math.round(order.remaining).toLocaleString()} ل.س (سابقاً ${Math.round(oldState.remaining).toLocaleString()} ل.س)`);
    }

    if (Math.abs(oldState.discount - order.discount) > 0.001) {
      const diff = order.discount - oldState.discount;
      const diffSign = diff > 0 ? `+` : ``;
      changeDetails.push(`تغير الخصم المالي من $${oldState.discount.toFixed(2)} إلى $${order.discount.toFixed(2)} (الفرق ${diffSign}$${diff.toFixed(2)})`);
    }

    if (Math.abs(oldState.taxPercent - order.taxPercent) > 0.001) {
      changeDetails.push(`تغيرت نسبة الضريبة من ${oldState.taxPercent}% إلى ${order.taxPercent}%`);
    }

    if (oldState.priority !== order.priority) {
      const pMap: Record<string, string> = { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة/طارئة" };
      changeDetails.push(`تغير الأولوية من [${pMap[oldState.priority] || oldState.priority}] إلى [${pMap[order.priority] || order.priority}]`);
    }

    if (oldState.customerId !== order.customerId) {
      const oldCust = CUSTOMERS.find(c => c.id === oldState.customerId)?.name || "غير محدد";
      const newCust = CUSTOMERS.find(c => c.id === order.customerId)?.name || "غير محدد";
      changeDetails.push(`تغير العميل من "${oldCust}" إلى "${newCust}"`);
    }

    const currentTotalQty = order.items ? order.items.reduce((acc: number, cur: OrderItem) => acc + Number(cur.quantity || 1), 0) : 0;
    if (oldState.itemsCount !== (order.items?.length || 0) || oldState.itemsTotalQty !== currentTotalQty) {
      changeDetails.push(`تعديل بنود وعناصر الطلب (عدد البنود: ${order.items?.length || 0} / الكمية الإجمالية: ${currentTotalQty})`);
    }

    const finalDetailsText = changeDetails.length > 0 
      ? changeDetails.join(" | ") 
      : "تحديث وحفظ بيانات وملاحظات الطلب في النظام";

    // 3. Append entry into Order Status/Audit History
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.unshift({
      oldStatus: order.status,
      newStatus: order.status,
      notes: `[تعديل ماليات وبيانات الطلب #${order.orderNumber}] ${finalDetailsText}`,
      changedAt: new Date().toISOString()
    });

    // 4. Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      details: finalDetailsText,
      createdAt: new Date().toISOString()
    });

    res.json(orderForResponse(req, order));
  });
}

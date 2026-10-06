import express from "express";
import * as core from "../../../server-core.ts";
import { getActorId, orderForResponse } from "../response.ts";
import { asOrderItem, type OrderItem } from "../crud-shared.ts";

const {
  ORDERS,
  INVOICES,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  persistMutationWithFastDurability,
  recordBenchmark,
  orderCreateBenchmarks,
  getNextNumber,
  SETTINGS,
  sypToUsd,
} = core;

export function registerOrderCreateRoutes(app: express.Express) {
  // API - Create Order
  app.post("/api/orders", async (req, res) => {
    const orderRequestStartedAt = performance.now();
    const { customerId, notes, priority, items, paidAmount, createdById, deliveryDateExpected, taxPercent, discount } = req.body;
    const actor = core.getRequestUser(req);
    const financialRestricted = actor?.role === "employee" || actor?.role === "viewer";
    const hasNonZeroFinancialInput =
      (paidAmount !== undefined && paidAmount !== null && Number(paidAmount) !== 0) ||
      (taxPercent !== undefined && taxPercent !== null && Number(taxPercent) !== 0) ||
      (discount !== undefined && discount !== null && Number(discount) !== 0) ||
      (Array.isArray(items) && items.some((rawItem: unknown) => {
        const item = asOrderItem(rawItem);
        return (
          (item.unitPrice !== undefined && item.unitPrice !== null && Number(item.unitPrice) !== 0) ||
          (item.totalPrice !== undefined && item.totalPrice !== null && Number(item.totalPrice) !== 0)
        );
      }));

    if (actor?.role === "viewer") {
      res.status(403).json({ success: false, message: "هذا الحساب للعرض فقط ولا يمكنه إنشاء طلبات." });
      return;
    }

    if (financialRestricted && hasNonZeroFinancialInput) {
      res.status(403).json({
        success: false,
        message: "لا يمكن للموظف إدخال أو تعديل أي قيمة مالية في الطلب. يتم التسعير من الحسابات المصرح لها فقط.",
      });
      return;
    }
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
    
    // Server-authoritative total: never trust a client-supplied totalPrice.
    // The only accepted pricing inputs are item unit prices, tax and discount;
    // the server derives the final total from them.
    const finalTotal = Math.max(0, computedTotal);
    const normalizedPaidAmount = Math.min(
      finalTotal,
      Math.max(0, Number(paidAmount) || 0),
    );
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
      paidAmount: normalizedPaidAmount,
      remaining: Math.max(0, finalTotal - normalizedPaidAmount),
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
}

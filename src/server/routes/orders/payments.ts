import express from "express";
import * as core from "../../server-core.ts";
import { applyPayment, withAtomicFinancialMutation } from "./financial.ts";
import { getActorId, orderForResponse } from "./response.ts";

const {
  ORDERS,
  INVOICES,
  ACTIVITY_LOGS,
  nextActivityLogId,
} = core;

type PaymentRecord = {
  id?: string;
  amountSYP?: number;
  amountUSD?: number;
  exchangeRate?: number;
  [key: string]: unknown;
};

export function registerOrderPaymentRoutes(app: express.Express) {
// Financial mutations use one in-memory snapshot plus the SQLite transaction
  // in persistStateNow. If the durable commit fails, restore every affected
  // collection so the API cannot report a payment that was not persisted.
    app.post("/api/orders/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, paymentId } = req.body;
    const order = ORDERS.find(o => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const matchingInv2 = INVOICES.find(inv => inv.orderId === order.id) || null;
    let result;
    try {
      result = await withAtomicFinancialMutation(() => applyPayment({ order, inv: matchingInv2, amount, currency, notes, paymentMethod, paymentId, actorId: getActorId(req) }));
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
}

import express from "express";
import * as core from "../../server-core.ts";
import { applyPayment, withAtomicFinancialMutation } from "./financial.ts";
import { getActorId, orderForResponse } from "./response.ts";

const {
  ORDERS,
  INVOICES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  sypToUsd,
} = core;

type PaymentRecord = {
  id?: string;
  amountSYP?: number;
  amountUSD?: number;
  exchangeRate?: number;
  [key: string]: unknown;
};

export function registerOrderPaymentRoutes(app: express.Express) {
  app.post("/api/orders/:id/payments", async (req, res) => {
    const user = core.getRequestUser(req);
    if (!user || !["admin", "accountant"].includes(user.role)) {
      res.status(403).json({ success: false, message: "تسجيل الدفعات متاح للإدارة والحسابات فقط" });
      return;
    }

    const { amount, currency = "USD", notes, paymentMethod, paymentId } = req.body;
    const order = ORDERS.find(item => item.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    const matchingInvoice = INVOICES.find(invoice => invoice.orderId === order.id) || null;
    let result;
    try {
      result = await withAtomicFinancialMutation(() =>
        applyPayment({
          order,
          inv: matchingInvoice,
          amount,
          currency,
          notes,
          paymentMethod,
          paymentId,
          actorId: getActorId(req),
        }),
      );
    } catch (error) {
      console.error("[FINANCE] Atomic order payment failed:", error);
      res.status(500).json({ error: "تعذر حفظ الدفعة بشكل ذري؛ لم يتم تغيير البيانات." });
      return;
    }

    if (!result.ok) {
      res.status(result.status).json(result.body);
      return;
    }

    res.json(orderForResponse(req, result.order));
  });

  app.delete("/api/orders/:orderId/payments/:paymentId", async (req, res) => {
    const user = core.getRequestUser(req);
    if (!user || !["admin", "accountant"].includes(user.role)) {
      res.status(403).json({ success: false, message: "حذف الدفعات متاح للإدارة والحسابات فقط" });
      return;
    }

    const { orderId, paymentId } = req.params;
    const order = ORDERS.find(item => item.id === orderId);
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    if (order.currencyFinalizedAt) {
      res.status(409).json({ error: "الطلب نهائي ومثبت مالياً؛ لا يمكن حذف دفعاته بعد التسليم." });
      return;
    }

    const paymentIndex = Array.isArray(order.payments)
      ? order.payments.findIndex(payment => payment.id === paymentId)
      : -1;
    if (paymentIndex === -1) {
      res.status(404).json({ error: "سند القبض غير موجود" });
      return;
    }

    try {
      await withAtomicFinancialMutation(() => {
        const removedPayment = (order.payments as PaymentRecord[]).splice(paymentIndex, 1)[0];
        const exchangeRate = Number(order.exchangeRateAtCreation) > 0
          ? Number(order.exchangeRateAtCreation)
          : 135;

        const orderPaidSYP = (order.payments as PaymentRecord[]).reduce(
          (sum, payment) =>
            sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * exchangeRate)),
          0,
        );

        order.paidAmount = Math.min(Number(order.totalPrice || 0), orderPaidSYP);
        order.remaining = Math.max(0, Number(order.totalPrice || 0) - order.paidAmount);
        order.paidAmountSYP = Math.round(order.paidAmount);
        order.remainingSYP = Math.round(order.remaining);

        const matchingInvoice = INVOICES.find(invoice => invoice.orderId === order.id);
        if (matchingInvoice) {
          matchingInvoice.payments = Array.isArray(matchingInvoice.payments)
            ? matchingInvoice.payments.filter(payment => payment.id !== paymentId)
            : [];

          const invoiceRate = Number(
            matchingInvoice.exchangeRateAtFinalization
              ?? matchingInvoice.exchangeRateAtIssue
              ?? exchangeRate,
          ) > 0
            ? Number(
                matchingInvoice.exchangeRateAtFinalization
                  ?? matchingInvoice.exchangeRateAtIssue
                  ?? exchangeRate,
              )
            : exchangeRate;

          const invoiceTotalSYP = Math.round(
            Number(
              matchingInvoice.totalPriceSYP
                ?? ((Number(matchingInvoice.totalPriceUSD ?? matchingInvoice.totalPrice) || 0) * invoiceRate),
            ),
          );

          const invoicePaidSYP = matchingInvoice.payments.reduce(
            (sum, payment) =>
              sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * invoiceRate)),
            0,
          );

          matchingInvoice.totalPriceSYP = invoiceTotalSYP;
          matchingInvoice.paidAmountSYP = Math.min(invoiceTotalSYP, Math.max(0, Math.round(invoicePaidSYP)));
          matchingInvoice.remainingSYP = Math.max(
            0,
            invoiceTotalSYP - matchingInvoice.paidAmountSYP,
          );
          matchingInvoice.totalPriceUSD = Number(sypToUsd(invoiceTotalSYP, invoiceRate).toFixed(2));
          matchingInvoice.paidAmountUSD = Number(
            sypToUsd(matchingInvoice.paidAmountSYP, invoiceRate).toFixed(2),
          );
          matchingInvoice.remainingUSD = Number(
            sypToUsd(matchingInvoice.remainingSYP, invoiceRate).toFixed(2),
          );
          matchingInvoice.totalPrice = matchingInvoice.totalPriceUSD;
          matchingInvoice.paidAmount = matchingInvoice.paidAmountUSD;
          matchingInvoice.remaining = matchingInvoice.remainingUSD;
          matchingInvoice.status =
            matchingInvoice.remaining === 0
              ? "paid"
              : matchingInvoice.paidAmount > 0
                ? "partially_paid"
                : "unpaid";
        }

        const removedSYP = Number(
          removedPayment?.amountSYP
            ?? Math.round(Number(removedPayment?.amountUSD || 0) * exchangeRate),
        );
        const details =
          `إلغاء وحذف سند قبض بقيمة ${removedSYP.toLocaleString()} ل.س | المتبقي الجديد: ${order.remaining.toLocaleString()} ل.س`;

        order.statusHistory ||= [];
        order.statusHistory.unshift({
          oldStatus: order.status,
          newStatus: order.status,
          notes: details,
          changedAt: new Date().toISOString(),
        });

        ACTIVITY_LOGS.unshift({
          id: nextActivityLogId(),
          userId: getActorId(req),
          action: "DELETE_PAYMENT",
          entityType: "Order",
          entityId: order.id,
          details,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (error) {
      console.error("[FINANCE] Atomic payment deletion failed:", error);
      res.status(500).json({ error: "تعذر حذف الدفعة بشكل ذري؛ لم يتم تغيير البيانات." });
      return;
    }

    res.json(orderForResponse(req, order));
  });
}

export type FinancialTools = ReturnType<typeof createFinancialTools>;

export function createFinancialTools(deps: any) {
  const {
    ORDERS,
    INVOICES,
    INVOICE_HISTORY,
    ACTIVITY_LOGS,
    SETTINGS,
    nextActivityLogId,
    persistStateNow,
  } = deps;

  async function withAtomicFinancialMutation<T>(mutation: () => T | Promise<T>): Promise<T> {
    const snapshot = {
      orders: JSON.stringify(ORDERS),
      invoices: JSON.stringify(INVOICES),
      invoiceHistory: JSON.stringify(INVOICE_HISTORY),
      activityLogs: JSON.stringify(ACTIVITY_LOGS),
    };
    try {
      const result = await mutation();
      await persistStateNow();
      return result;
    } catch (error) {
      ORDERS.splice(0, ORDERS.length, ...JSON.parse(snapshot.orders));
      INVOICES.splice(0, INVOICES.length, ...JSON.parse(snapshot.invoices));
      INVOICE_HISTORY.splice(0, INVOICE_HISTORY.length, ...JSON.parse(snapshot.invoiceHistory));
      ACTIVITY_LOGS.splice(0, ACTIVITY_LOGS.length, ...JSON.parse(snapshot.activityLogs));
      throw error;
    }
  }

  function applyPayment(params: {
    order: any | null;
    inv: any | null;
    amount: any;
    currency: string;
    notes: string | undefined;
    paymentMethod: string | undefined;
    changedById?: string;
    paymentId: string | undefined;
    actorUserId: string;
  }): { ok: boolean; status: number; body: any; order: any | null; invoice: any | null } {
    const { order, inv, currency, notes, paymentMethod, paymentId } = params;

    if (order?.currencyFinalizedAt) {
      return { ok: false, status: 409, body: { error: "الطلب نهائي ومثبت مالياً؛ لا يمكن تسجيل دفعة جديدة بعد التسليم.", message: "الطلب نهائي ومثبت مالياً؛ لا يمكن تسجيل دفعة جديدة بعد التسليم." }, order: null, invoice: null };
    }
    if (inv?.currencyFinalizedAt) {
      return { ok: false, status: 409, body: { error: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل دفعاتها بعد التسليم.", message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل دفعاتها بعد التسليم." }, order: null, invoice: null };
    }
    if (!['SYP', 'USD'].includes(currency)) {
      return { ok: false, status: 400, body: { error: "عملة الدفعة يجب أن تكون SYP أو USD", message: "عملة الدفعة غير صالحة" }, order: null, invoice: null };
    }

    const inputAmount = Number(params.amount);
    const rate = order
      ? (Number(order.exchangeRateAtCreation) > 0 ? Number(order.exchangeRateAtCreation) : 135)
      : (() => {
          const r = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || (inv.orderId ? ORDERS.find((o: any) => o.id === inv.orderId)?.exchangeRateAtCreation : 0) || SETTINGS.exchangeRate || 135);
          return Number.isFinite(r) && r > 0 ? r : 135;
        })();

    const payAmtSYP = currency === "SYP" ? Math.round(inputAmount) : Math.round(inputAmount * rate);
    const payAmtUSD = currency === "SYP" ? payAmtSYP / rate : inputAmount;
    if (!Number.isFinite(inputAmount) || inputAmount <= 0 || payAmtSYP <= 0) {
      return { ok: false, status: 400, body: { error: "مبلغ الدفعة يجب أن يكون أكبر من الصفر", message: "مبلغ الدفعة يجب أن يكون رقمًا أكبر من الصفر" }, order: null, invoice: null };
    }

    let currentRemainingSYP: number;
    let orderPaidSoFarSYP = 0;
    if (order) {
      orderPaidSoFarSYP = (order.payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * rate)), 0);
      currentRemainingSYP = Math.max(0, Number(order.totalPrice || 0) - orderPaidSoFarSYP);
    } else {
      const invoiceTotalUSD = Number(inv.totalPriceUSD ?? inv.totalPrice) || 0;
      const invoiceTotalSYP = Math.round(Number(inv.totalPriceSYP ?? (invoiceTotalUSD * rate)));
      const currentPaidUSD = Number.isFinite(Number(inv.paidAmountUSD ?? inv.paidAmount)) ? Math.max(0, Number(inv.paidAmountUSD ?? inv.paidAmount)) : 0;
      const currentPaidSYP = Math.round(Number(inv.paidAmountSYP ?? (currentPaidUSD * rate)));
      currentRemainingSYP = Math.max(0, invoiceTotalSYP - currentPaidSYP);
    }
    if (payAmtSYP > currentRemainingSYP + 1) {
      const msg = order
        ? `مبلغ الدفعة يتجاوز المبلغ المتبقي. المتبقي: ${Math.round(currentRemainingSYP).toLocaleString()} ل.س`
        : `مبلغ القسط يتجاوز المتبقي. المتبقي: ${currentRemainingSYP.toLocaleString()} ل.س`;
      return { ok: false, status: 400, body: order ? { error: msg, remainingSYP: currentRemainingSYP, remainingUSD: currentRemainingSYP / rate } : { message: msg }, order: null, invoice: null };
    }

    const existingPayments = (order?.payments || inv?.payments || []) as any[];
    if (paymentId && existingPayments.some((payment: any) => payment.id === String(paymentId))) {
      return { ok: false, status: 409, body: { error: "هذه الدفعة مسجلة مسبقاً", message: "هذه الدفعة مسجلة مسبقاً" }, order: null, invoice: null };
    }

    const methodLabel = paymentMethod === 'transfer' ? 'تحويل بنكي' : paymentMethod === 'card' ? 'بطاقة / شيك' : 'نقدي كاش';
    const paymentRecord = {
      id: paymentId ? String(paymentId) : secureId("pay"),
      orderId: order?.id || inv?.orderId || null,
      invoiceId: inv?.id || null,
      amountUSD: payAmtUSD,
      amountSYP: payAmtSYP,
      exchangeRate: rate,
      currency,
      paymentMethod: paymentMethod || "cash",
      notes: notes || (order ? "دفعة مقبوضة للطلب" : "دفعة فاتورة"),
      recordedBy: params.actorUserId,
      createdAt: new Date().toISOString()
    };

    if (order) {
      if (!order.payments) order.payments = [];
      order.payments.unshift(paymentRecord);
      order.paidAmount = Math.min(Number(order.totalPrice || 0), orderPaidSoFarSYP + payAmtSYP);
      order.remaining = Math.max(0, Number(order.totalPrice || 0) - order.paidAmount);
      order.paidAmountSYP = Math.round(order.paidAmount);
      order.remainingSYP = Math.round(order.remaining);
      order.statusHistory.unshift({
        oldStatus: order.status,
        newStatus: order.status,
        notes: `تم تسديد دفعة مالية بقيمة $${payAmtUSD.toFixed(2)} (${methodLabel}). ${notes || ""}`,
        changedAt: new Date().toISOString()
      });
    }

    if (inv) {
      const invoiceTotalUSD = Number(inv.totalPriceUSD ?? inv.totalPrice) || 0;
      const invoiceTotalSYP = Math.round(Number(inv.totalPriceSYP ?? (invoiceTotalUSD * rate)));
      inv.totalPriceUSD = invoiceTotalUSD;
      inv.totalPriceSYP = invoiceTotalSYP;
      const currentPaidUSD = Number.isFinite(Number(inv.paidAmountUSD ?? inv.paidAmount)) ? Math.max(0, Number(inv.paidAmountUSD ?? inv.paidAmount)) : 0;
      const currentPaidSYP = Math.round(Number(inv.paidAmountSYP ?? (currentPaidUSD * rate)));
      inv.paidAmountUSD = Math.min(invoiceTotalUSD, currentPaidUSD + payAmtUSD);
      inv.paidAmountSYP = Math.min(invoiceTotalSYP, currentPaidSYP + payAmtSYP);
      inv.paidAmount = inv.paidAmountUSD;
      inv.remainingUSD = Math.max(0, invoiceTotalUSD - inv.paidAmountUSD);
      inv.remainingSYP = Math.max(0, invoiceTotalSYP - inv.paidAmountSYP);
      inv.remaining = inv.remainingUSD;
      inv.status = inv.remaining === 0 ? "paid" : inv.paidAmount > 0 ? "partially_paid" : "unpaid";
      if (!inv.payments) inv.payments = [];
      if (!inv.payments.some((payment: any) => payment.id === paymentRecord.id)) inv.payments.unshift({ ...paymentRecord });
      if (order) {
        inv.orderId = inv.orderId || order.id;
      } else if (inv.orderId) {
        const linkedOrder = ORDERS.find((o: any) => o.id === inv.orderId);
        if (linkedOrder) {
          const orderExchangeRate = Number(linkedOrder.exchangeRateAtCreation) > 0 ? Number(linkedOrder.exchangeRateAtCreation) : 135;
          const orderPayment = { ...paymentRecord, orderId: linkedOrder.id, amountSYP: payAmtSYP, exchangeRate: orderExchangeRate, currency: "SYP" };
          if (!linkedOrder.payments) linkedOrder.payments = [];
          if (!linkedOrder.payments.some((payment: any) => payment.id === orderPayment.id)) linkedOrder.payments.unshift(orderPayment);
          linkedOrder.paidAmount = Math.min(Number(linkedOrder.totalPrice || 0), linkedOrder.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountSYP ?? Math.round(Number(payment.amountUSD || 0) * orderExchangeRate)), 0));
          linkedOrder.remaining = Math.max(0, Number(linkedOrder.totalPrice || 0) - linkedOrder.paidAmount);
          linkedOrder.statusHistory.unshift({
            oldStatus: linkedOrder.status,
            newStatus: linkedOrder.status,
            notes: `تم تسديد دفعة مالية عبر الفاتورة بقيمة ${payAmtSYP.toLocaleString()} ل.س ($${payAmtUSD.toFixed(2)}). ${notes || ""}`,
            changedAt: new Date().toISOString()
          });
        }
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: params.actorUserId,
      action: order ? "RECORD_PAYMENT" : "RECORD_INVOICE_PAYMENT",
      entityType: order ? "Order" : "Invoice",
      entityId: order?.id || inv?.id,
      details: order ? `تسديد دفعة مالية بقيمة $${payAmtUSD.toFixed(2)} (${methodLabel}) | المتبقي الجديد: ${order.remaining.toLocaleString()} ل.س` : undefined,
      createdAt: new Date().toISOString()
    });

    return { ok: true, status: 200, body: null, order, invoice: inv };
  }

  return { withAtomicFinancialMutation, applyPayment };
}
import { secureId } from "./ids.ts";

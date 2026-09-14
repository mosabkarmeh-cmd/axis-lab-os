import type React from "react";
import { useRef } from "react";
import type { Order } from "../types";

type AccountingActionsOptions = {
  selectedOrder: Order | null;
  newPaymentAmount: string;
  newPaymentSYPAmount: string;
  paymentInputCurrency: "USD" | "SYP";
  newPaymentNotes: string;
  selectedPaymentMethod: string;
  currentUserId?: string;
  setNewPaymentAmount: (value: string) => void;
  setNewPaymentSYPAmount: (value: string) => void;
  setNewPaymentNotes: (value: string) => void;
  setSelectedOrder: (order: Order) => void;
  setIsProcessingQuickFullPay: (value: boolean) => void;
  setDeliveryBlockedOrder: (order: Order | null) => void;
  fetchOrders: () => void | Promise<void>;
  fetchLogs: () => void | Promise<void>;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useAccountingActions({
  selectedOrder,
  newPaymentAmount,
  newPaymentSYPAmount,
  paymentInputCurrency,
  newPaymentNotes,
  selectedPaymentMethod,
  currentUserId,
  setNewPaymentAmount,
  setNewPaymentSYPAmount,
  setNewPaymentNotes,
  setSelectedOrder,
  setIsProcessingQuickFullPay,
  setDeliveryBlockedOrder,
  fetchOrders,
  fetchLogs,
  addTerminalLog,
}: AccountingActionsOptions) {
  const changedById = currentUserId || "u-1";
  const isSubmittingPaymentRef = useRef(false);
  const paymentIdempotencyKeyRef = useRef<string | null>(null);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPaymentRef.current) return;
    const rawInput = paymentInputCurrency === "SYP" ? newPaymentSYPAmount : newPaymentAmount;
    const numericInput = Number(rawInput);
    if (!selectedOrder || !Number.isFinite(numericInput) || numericInput <= 0) return;
    const orderExchangeRate = Number((selectedOrder as any).exchangeRateAtCreation) > 0
      ? Number((selectedOrder as any).exchangeRateAtCreation)
      : 135;
    isSubmittingPaymentRef.current = true;
    if (!paymentIdempotencyKeyRef.current) {
      paymentIdempotencyKeyRef.current = crypto.randomUUID();
    }
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericInput,
          currency: paymentInputCurrency,
          notes: newPaymentNotes,
          paymentMethod: selectedPaymentMethod,
          changedById,
          paymentId: paymentIdempotencyKeyRef.current,
        }),
      });
      if (res.ok) {
        paymentIdempotencyKeyRef.current = null;
        const updated = await res.json() as Order;
        const amountSYP = paymentInputCurrency === "SYP" ? numericInput : Math.round(numericInput * orderExchangeRate);
        addTerminalLog("DB", `تم تسجيل دفعة ${amountSYP.toLocaleString()} ل.س (${paymentInputCurrency === "SYP" ? "ليرة سورية" : "$" + numericInput.toFixed(2)}) للطلب ${selectedOrder.orderNumber}`);
        setNewPaymentAmount("");
        setNewPaymentSYPAmount("");
        setNewPaymentNotes("");
        setSelectedOrder(updated);
        await fetchOrders();
        await fetchLogs();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`فشل تسجيل الدفعة: ${errJson.error || "خطأ غير معروف"}`);
      }
    } catch {
      addTerminalLog("ERROR", "Failed to record payment");
    } finally {
      isSubmittingPaymentRef.current = false;
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedOrder) return;
    if (!window.confirm("هل أنت تأكد من إلغاء وحذف سند القبض هذا؟ سيتم إعادة خصم المبلغ وتحديث المتبقي على العميل تلقائياً.")) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payments/${paymentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changedById }),
      });
      if (res.ok) {
        const updated = await res.json() as Order;
        addTerminalLog("DB", `Deleted payment receipt ${paymentId} for order ${selectedOrder.orderNumber}`);
        setSelectedOrder(updated);
        await fetchOrders();
        await fetchLogs();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`فشل إلغاء سند القبض: ${errJson.error || "خطأ غير معروف"}`);
      }
    } catch {
      addTerminalLog("ERROR", "Failed to delete payment");
    }
  };

  const handleSettleRemainingAndDeliver = async (ordToDeliver: Order) => {
    setIsProcessingQuickFullPay(true);
    try {
      const remainingSYP = Math.max(0, Math.round(Number((ordToDeliver as any).remainingSYP ?? ordToDeliver.remaining ?? 0)));
      if (remainingSYP > 0) {
        const payRes = await fetch(`/api/orders/${ordToDeliver.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: remainingSYP,
            currency: "SYP",
            notes: "تسديد تلقائي كامل للمتبقي عند استلام العميل وتسليم الطلب",
            paymentMethod: selectedPaymentMethod,
            changedById,
          }),
        });
        const payJson = await payRes.json().catch(() => ({}));
        if (!payRes.ok) {
          alert(`فشل استيفاء الدفعة: ${payJson.error || payJson.message || "خطأ غير معروف"}`);
          return;
        }
        if (Number((payJson as any).remainingSYP ?? (payJson as any).remaining ?? 0) > 1) {
          alert(`لم يكتمل قبض المتبقي. الرصيد المتبقي: ${Number((payJson as any).remainingSYP ?? payJson.remaining).toLocaleString()} ل.س`);
          return;
        }
      }
      const statusRes = await fetch(`/api/orders/${ordToDeliver.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered", notes: "تم قبض المتبقي وتسليم الطلب والقطع للعميل فورياً", changedById }),
      });
      if (statusRes.ok) {
        addTerminalLog("DB", `Order ${ordToDeliver.orderNumber} fully settled and delivered successfully.`);
        setDeliveryBlockedOrder(null);
        await fetchOrders();
        await fetchLogs();
      } else {
        const errJson = await statusRes.json().catch(() => ({}));
        alert(`فشل تحويل حالة الطلب: ${errJson.error || errJson.message || "خطأ"}`);
      }
    } catch {
      addTerminalLog("ERROR", "Failed to settle & deliver order");
    } finally {
      setIsProcessingQuickFullPay(false);
    }
  };

  return { handleRecordPaymentSubmit, handleDeletePayment, handleSettleRemainingAndDeliver };
}

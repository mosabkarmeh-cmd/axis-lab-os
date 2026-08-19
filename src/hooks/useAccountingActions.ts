import type React from "react";
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

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newPaymentAmount) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentInputCurrency === "SYP" ? Number(newPaymentSYPAmount) / 135 : Number(newPaymentAmount), notes: newPaymentNotes, paymentMethod: selectedPaymentMethod, changedById }),
      });
      if (res.ok) {
        const updated = await res.json() as Order;
        addTerminalLog("DB", `Recorded payment of $${newPaymentAmount} (${selectedPaymentMethod}) for order ${selectedOrder.orderNumber}`);
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
      if (ordToDeliver.remaining > 0.001) {
        const payRes = await fetch(`/api/orders/${ordToDeliver.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: ordToDeliver.remaining, notes: "تسديد تلقائي كامل للمتبقي عند استلام العميل وتسليم الطلب", paymentMethod: selectedPaymentMethod, changedById }),
        });
        if (!payRes.ok) {
          const errJson = await payRes.json().catch(() => ({}));
          alert(`فشل استيفاء الدفعة: ${errJson.error || "خطأ غير معروف"}`);
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
        alert(`فشل تحويل حالة الطلب: ${errJson.error || "خطأ"}`);
      }
    } catch {
      addTerminalLog("ERROR", "Failed to settle & deliver order");
    } finally {
      setIsProcessingQuickFullPay(false);
    }
  };

  return { handleRecordPaymentSubmit, handleDeletePayment, handleSettleRemainingAndDeliver };
}

import type React from "react";

type OrderActionsOptions = {
  orders: any[]; currentUser: any; fetchOrders: () => void | Promise<void>; fetchLogs: () => void | Promise<void>;
  setDeliveryBlockedOrder: (order: any) => void; addTerminalLog: (scope: string, message: string) => void;
  archiveDaysThreshold: number;
  setOrders: (updater: (prev: any[]) => any[]) => void;
  selectedOrder: any; setSelectedOrder: (value: any) => void;
  progressModalOrder: any; setProgressModalOrder: (value: any) => void;
  editingOrder: any; setEditingOrder: (value: any) => void;
  editOrderItems: any[];
};

export function useOrderActions(o: OrderActionsOptions) {
  const handleUpdateOrderStatus = async (orderId: string, status: string, notesText: string) => {
    const target = o.orders.find(order => order.id === orderId);
    if (status === "delivered" && target && target.remaining > 0.01) { o.setDeliveryBlockedOrder(target); return; }
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes: notesText, changedById: o.currentUser?.id || "u-1" }) });
      if (res.ok) { o.addTerminalLog("DB", `Order ${orderId} status transitioned to: ${status}`); await o.fetchOrders(); await o.fetchLogs(); return; }
      const error = await res.json().catch(() => ({}));
      if (error.remainingUSD !== undefined && target) o.setDeliveryBlockedOrder(target); else window.alert(`خطأ أثناء تحديث حالة الطلب: ${error.error || "خطأ غير معروف"}`);
    } catch { o.addTerminalLog("ERROR", "Failed to transition order status"); }
  };
  const handleRunAutoArchive = async (days = o.archiveDaysThreshold) => {
    try { const res = await fetch("/api/orders/auto-archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days }) }); const data = await res.json(); if (data?.success) { o.addTerminalLog("ARCHIVE", `[AUTO-ARCHIVE ENGINE] ${data.message}`); await o.fetchOrders(); await o.fetchLogs(); } } catch { o.addTerminalLog("ERROR", "Failed to run auto archiving"); }
  };
  const handleArchiveOrder = async (id: string) => { try { const res = await fetch(`/api/orders/${id}/archive`, { method: "POST" }); if (res.ok) { o.addTerminalLog("ARCHIVE", `[ORDER ARCHIVED] Order ${id} moved to archive.`); await o.fetchOrders(); await o.fetchLogs(); } } catch { o.addTerminalLog("ERROR", "Failed to archive order"); } };
  const handleRestoreOrder = async (id: string) => { try { const res = await fetch(`/api/orders/${id}/restore`, { method: "POST" }); if (res.ok) { o.addTerminalLog("ARCHIVE", `[ORDER RESTORED] Order ${id} restored to active queue.`); await o.fetchOrders(); await o.fetchLogs(); } } catch { o.addTerminalLog("ERROR", "Failed to restore order"); } };
  const handleUpdateItemProgress = async (
    orderId: string,
    params: { itemId?: string; materialName?: string; setAllCompleted?: boolean; resetAll?: boolean; addItem?: any; removeItemId?: string; completedQuantity?: number }
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          changedById: o.currentUser?.id || "u-1"
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        o.setOrders(prev => prev.map(ord => ord.id === orderId ? updatedOrder : ord));
        if (o.selectedOrder && o.selectedOrder.id === orderId) {
          o.setSelectedOrder(updatedOrder);
        }
        if (o.progressModalOrder && o.progressModalOrder.id === orderId) {
          o.setProgressModalOrder(updatedOrder);
        }
        o.addTerminalLog("PROD", `تم تحديث إنجاز أجزاء ومواد الطلب #${updatedOrder.orderNumber}`);
        o.fetchLogs();
      } else {
        const err = await res.json();
        o.addTerminalLog("ERROR", err.error || "فشل تحديث إنجاز أجزاء ومواد الطلب");
      }
    } catch (e) {
      o.addTerminalLog("ERROR", "خطأ في الاتصال بالخادم لتحديث إنجاز الأجزاء والمواد");
    }
  };

  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!o.editingOrder) return;

    const itemsToSend = o.editOrderItems.map(it => ({
      productName: it.name || "عنصر تشغيل عام",
      quantity: Number(it.qty) || 1,
      unitPrice: Number(it.price) || 0,
      notes: it.notes || ""
    }));

    try {
      const res = await fetch(`/api/orders/${o.editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: o.editingOrder.customerId,
          notes: o.editingOrder.notes,
          priority: o.editingOrder.priority,
          items: itemsToSend,
          paidAmount: Number(o.editingOrder.paidAmount) || 0,
          deliveryDateExpected: o.editingOrder.deliveryDateExpected,
          taxPercent: Number(o.editingOrder.taxPercent) || 0,
          discount: Number(o.editingOrder.discount) || 0
        })
      });

      if (res.ok) {
        const updated = await res.json();
        o.addTerminalLog("DB", `Order ${o.editingOrder.orderNumber} successfully updated and re-compiled.`);
        o.setEditingOrder(null);
        o.fetchOrders();
        o.fetchLogs();
        if (o.selectedOrder && o.selectedOrder.id === updated.id) {
          o.setSelectedOrder(updated);
        }
      }
    } catch (e) {
      o.addTerminalLog("ERROR", "Failed to update order");
    }
  };

  const handleAssignOrderWorkers = async (
    orderId: string,
    assignment: { designerId?: string | null; cutterId?: string | null; assemblerId?: string | null }
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/assign-workers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...assignment, changedById: o.currentUser?.id || "u-1" })
      });
      if (res.ok) {
        const updated = await res.json();
        o.setOrders(prev => prev.map(ord => ord.id === orderId ? updated : ord));
        if (o.selectedOrder && o.selectedOrder.id === orderId) o.setSelectedOrder(updated);
        o.addTerminalLog("DB", `تم تحديث تعيين العمال للطلب #${updated.orderNumber}`);
        o.fetchLogs();
      } else {
        const err = await res.json().catch(() => ({}));
        o.addTerminalLog("ERROR", err.error || "فشل تعيين العمال");
      }
    } catch (e) {
      o.addTerminalLog("ERROR", "خطأ في الاتصال بالخادم لتعيين العمال");
    }
  };

  const handleRateOrder = async (
    orderId: string,
    rating: { designRating?: number | null; cuttingRating?: number | null; assemblyRating?: number | null; ratingNotes?: string }
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rating)
      });
      if (res.ok) {
        const updated = await res.json();
        o.setOrders(prev => prev.map(ord => ord.id === orderId ? updated : ord));
        if (o.selectedOrder && o.selectedOrder.id === orderId) o.setSelectedOrder(updated);
        o.addTerminalLog("DB", `تم تسجيل تقييم الطلب #${updated.orderNumber}`);
      } else {
        const err = await res.json().catch(() => ({}));
        o.addTerminalLog("ERROR", err.error || "فشل تسجيل التقييم");
      }
    } catch (e) {
      o.addTerminalLog("ERROR", "خطأ في الاتصال بالخادم لتسجيل التقييم");
    }
  };

  return {
    handleUpdateOrderStatus, handleRunAutoArchive, handleArchiveOrder, handleRestoreOrder,
    handleUpdateItemProgress, handleEditOrderSubmit, handleAssignOrderWorkers, handleRateOrder,
  };
}

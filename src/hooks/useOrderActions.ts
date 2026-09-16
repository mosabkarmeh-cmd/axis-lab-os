type OrderActionsOptions = {
  orders: any[]; currentUser: any; fetchOrders: () => void | Promise<void>; fetchLogs: () => void | Promise<void>;
  setDeliveryBlockedOrder: (order: any) => void; addTerminalLog: (scope: string, message: string) => void;
  archiveDaysThreshold: number;
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
  return { handleUpdateOrderStatus, handleRunAutoArchive, handleArchiveOrder, handleRestoreOrder };
}

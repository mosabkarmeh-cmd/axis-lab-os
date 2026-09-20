import type React from "react";

type SupplyActionsOptions = {
  showAdjustStock: any;
  adjustQty: string;
  adjustType: string;
  adjustReason: string;
  currentUser: any;
  remMatId: string;
  remWidth: string;
  remHeight: string;
  remQty: string;
  remLocation: string;
  selectedDashboardSupplierId: string;
  newSupplyMaterialId: string;
  newSupplyQty: string;
  newSupplyPrice: string;
  newSupplyExpectedDate: string;
  newSupplyNotes: string;
  findSuitableMatId: string;
  findSuitableW: string;
  findSuitableH: string;
  suppliers: any[];
  activeView: string;
  setActiveView: (value: string) => void;
  setActiveProductSubTab: (value: any) => void;
  setSelectedDashboardSupplierId: (value: string) => void;
  setShowAdjustStock: (value: any) => void;
  setAdjustQty: (value: string) => void;
  setAdjustReason: (value: string) => void;
  setShowAddRemnant: (value: boolean) => void;
  setRemMatId: (value: string) => void;
  setRemWidth: (value: string) => void;
  setRemHeight: (value: string) => void;
  setRemQty: (value: string) => void;
  setRemLocation: (value: string) => void;
  setIsSubmittingSupplyOrder: (value: boolean) => void;
  setNewSupplyMaterialId: (value: string) => void;
  setNewSupplyQty: (value: string) => void;
  setNewSupplyPrice: (value: string) => void;
  setNewSupplyExpectedDate: (value: string) => void;
  setNewSupplyNotes: (value: string) => void;
  setSuitableRemnantResult: (value: any) => void;
  fetchSupplyOrders: () => void | Promise<void>;
  refreshInventoryData: () => void | Promise<void>;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useSupplyActions({
  showAdjustStock,
  adjustQty,
  adjustType,
  adjustReason,
  currentUser,
  remMatId,
  remWidth,
  remHeight,
  remQty,
  remLocation,
  selectedDashboardSupplierId,
  newSupplyMaterialId,
  newSupplyQty,
  newSupplyPrice,
  newSupplyExpectedDate,
  newSupplyNotes,
  findSuitableMatId,
  findSuitableW,
  findSuitableH,
  suppliers,
  activeView,
  setActiveView,
  setActiveProductSubTab,
  setSelectedDashboardSupplierId,
  setShowAdjustStock,
  setAdjustQty,
  setAdjustReason,
  setShowAddRemnant,
  setRemMatId,
  setRemWidth,
  setRemHeight,
  setRemQty,
  setRemLocation,
  setIsSubmittingSupplyOrder,
  setNewSupplyMaterialId,
  setNewSupplyQty,
  setNewSupplyPrice,
  setNewSupplyExpectedDate,
  setNewSupplyNotes,
  setSuitableRemnantResult,
  fetchSupplyOrders,
  refreshInventoryData,
  addTerminalLog,
}: SupplyActionsOptions) {
  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustStock || !adjustQty) return;

    const qtyVal = parseFloat(adjustQty);
    const multiplier = (adjustType === "purchase" || adjustType === "adjustment" && qtyVal >= 0) ? 1 : -1;
    const finalQty = Math.abs(qtyVal) * multiplier;

    try {
      const res = await fetch(`/api/inventory/${showAdjustStock.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: finalQty,
          type: adjustType,
          reason: adjustReason || "تعديل مخزون يدوي",
          userId: currentUser?.id || "u-1"
        })
      });

      const data = await res.json();
      if (res.ok) {
        addTerminalLog("DB", `Stock adjusted for: ${showAdjustStock.name} (Change: ${finalQty})`);
        setShowAdjustStock(null);
        setAdjustQty("");
        setAdjustReason("");
        refreshInventoryData();
      } else {
        window.showAlert?.(data.message || "حدث خطأ أثناء تعديل المخزون", "خطأ تعديل المخزون");
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to update stock");
    }
  };

  const handleCreateRemnant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remMatId || !remWidth || !remHeight) return;

    try {
      const res = await fetch("/api/remnants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: remMatId,
          width: parseFloat(remWidth),
          height: parseFloat(remHeight),
          quantity: parseInt(remQty) || 1,
          location: remLocation
        })
      });

      if (res.ok) {
        addTerminalLog("DB", "Created a new remnant sheet piece");
        setShowAddRemnant(false);
        setRemMatId("");
        setRemWidth("");
        setRemHeight("");
        setRemQty("1");
        setRemLocation("");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to create remnant");
    }
  };

  const handleConsumeRemnant = async (id: string, qty: number = 1) => {
    try {
      const res = await fetch(`/api/remnants/consume/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty })
      });

      if (res.ok) {
        addTerminalLog("DB", "Consumed raw material remnant piece");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to consume remnant");
    }
  };

  const handleWasteRemnant = async (id: string) => {
    try {
      const res = await fetch(`/api/remnants/waste/${id}`, {
        method: "POST"
      });

      if (res.ok) {
        addTerminalLog("DB", "Remnant marked as waste/scrap");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to waste remnant");
    }
  };

  const handleCreateSupplyOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardSupplierId || !newSupplyMaterialId || !newSupplyQty || !newSupplyPrice) {
      window.showAlert?.("يرجى ملء جميع الحقول المطلوبة لطلب التوريد", "تنبيه التحقق");
      return;
    }

    setIsSubmittingSupplyOrder(true);
    try {
      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedDashboardSupplierId,
          materialId: newSupplyMaterialId,
          quantity: parseFloat(newSupplyQty),
          unitPrice: parseFloat(newSupplyPrice),
          expectedDeliveryDate: newSupplyExpectedDate || null,
          notes: newSupplyNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Created supply order ${data.supplyOrder.id} for supplier`);
        setNewSupplyMaterialId("");
        setNewSupplyQty("");
        setNewSupplyPrice("");
        setNewSupplyExpectedDate("");
        setNewSupplyNotes("");
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل إنشاء طلب التوريد: " + data.message, "خطأ إنشاء طلب");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to create supply order: ${err.message}`);
    } finally {
      setIsSubmittingSupplyOrder(false);
    }
  };

  const handleCreateDirectSupplyOrder = async (
    supplierId: string,
    materialId: string,
    quantity: number,
    unitPrice: number,
    notes: string
  ) => {
    try {
      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          materialId,
          quantity,
          unitPrice,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Created direct supply order ${data.supplyOrder?.id || ''}`);
        window.showAlert?.(`تم إنشاء طلب التوريد المباشر بنجاح!`, "نجاح طلب التوريد");
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل إنشاء طلب التوريد: " + (data.message || ""), "خطأ");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to create direct supply order: ${err.message}`);
    }
  };

  const handleDuplicateSupplyOrder = async (order: any) => {
    if (!order) return;

    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const defaultExpectedDate = futureDate.toISOString().split("T")[0];

      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: order.supplierId,
          materialId: order.materialId,
          quantity: Number(order.quantity),
          unitPrice: Number(order.unitPrice),
          expectedDeliveryDate: defaultExpectedDate,
          notes: order.notes ? `[مكرر من #${order.id}] ${order.notes}` : `نسخ سريع مكرر تلقائياً من الطلبية السابقة #${order.id}`
        })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Duplicated supply order #${order.id} into new order #${data.supplyOrder?.id || ''}`);
        window.showAlert?.(
          `تم إنشاء طلبية توريد مكررة بنجاح (#${data.supplyOrder?.id || ''})!\nالخامة: ${order.materialName || 'المحددة'}\nالكمية: ${order.quantity} قطعة\nالمورد: ${order.supplierName || 'المحدد'}\nالسعر الإجمالي: $${(Number(order.quantity) * Number(order.unitPrice)).toLocaleString()}`,
          "تم النسخ السريع لطلبية التوريد ⚡"
        );
        fetchSupplyOrders();
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل تكرار طلب التوريد: " + (data.message || ""), "خطأ النسخ السريع");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to duplicate supply order: ${err.message}`);
    }
  };

  const handleUpdateSupplyOrderStatus = async (id: string, status: "completed" | "cancelled" | "pending" | "received") => {
    const targetStatus = status === "received" ? "completed" : status;
    let confirmMsg = "";
    if (targetStatus === "completed") {
      confirmMsg = "هل أنت متأكد من تأكيد استلام هذه الطلبية؟ سيتم زيادة المخزون تلقائياً بالكمية الموردة وتسجيل العملية.";
    } else if (targetStatus === "cancelled") {
      confirmMsg = "هل أنت متأكد من إلغاء طلب التوريد هذا؟";
    } else {
      confirmMsg = "هل تريد إعادة تعيين حالة طلب التوريد إلى معلقة؟";
    }

    const confirmed = await window.showConfirm?.(confirmMsg, "تأكيد تغيير حالة الطلبية");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/supply-orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Supply order ${id} marked as ${targetStatus}`);
        refreshInventoryData();
        window.showAlert?.(
          targetStatus === "completed"
            ? "تمت مراجعة واستلام الطلبية بنجاح! تم تحديث المخزون المتاح تلقائياً. 📦"
            : targetStatus === "cancelled"
              ? "تم إلغاء طلب التوريد."
              : "تم تعديل حالة طلب التوريد إلى معلقة.",
          "تحديث حالة طلب التوريد"
        );
      } else {
        window.showAlert?.("فشل تحديث حالة الطلبية: " + data.message, "خطأ تحديث الحالة");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to update supply order: ${err.message}`);
    }
  };

  const handleFindSuitableRemnantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findSuitableMatId || !findSuitableW || !findSuitableH) return;

    try {
      const res = await fetch("/api/remnants/find-suitable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: findSuitableMatId,
          requiredWidth: parseFloat(findSuitableW),
          requiredHeight: parseFloat(findSuitableH)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuitableRemnantResult(data.remnant);
        if (data.remnant) {
          addTerminalLog("LASER", `Suitable remnant found! ID: ${data.remnant.id} (${data.remnant.width}x${data.remnant.height}mm)`);
        } else {
          addTerminalLog("WARNING", "No suitable remnants found. Must use a full sheet!");
        }
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to search remnants");
    }
  };

  const handleQuickSupplyRequest = (mat: any) => {
    if (!mat) return;

    setNewSupplyMaterialId(mat.id);

    let targetSupplierId = mat.supplierId || (mat.supplier && mat.supplier.id) || "";
    if (!targetSupplierId && suppliers.length > 0) {
      targetSupplierId = suppliers[0].id;
    }
    if (targetSupplierId) {
      setSelectedDashboardSupplierId(targetSupplierId);
    }

    const unitPriceVal = mat.pricePerUnit !== undefined && mat.pricePerUnit !== null
      ? mat.pricePerUnit.toString()
      : (mat.price !== undefined ? mat.price.toString() : "15");
    setNewSupplyPrice(unitPriceVal);

    const currentAvailable = mat.inventory?.available ?? (mat.inventory?.quantity ?? 0);
    const minStock = mat.minimumStock || 10;
    const suggestedQty = Math.max(10, minStock - currentAvailable);
    setNewSupplyQty(suggestedQty.toString());

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    setNewSupplyExpectedDate(futureDate.toISOString().split("T")[0]);

    setNewSupplyNotes(`طلب توريد سريع ومباشر للخامة: ${mat.name} (${mat.category}${mat.thickness ? ` - سماكة ${mat.thickness}مم` : ""})`);

    if (activeView !== "products") {
      setActiveView("products");
    }
    setActiveProductSubTab("suppliers");

    addTerminalLog("INVENTORY", `تم إعداد نموذج طلب توريد سريع لخامة: ${mat.name}`);
    window.showAlert?.(
      `تمت تعبئة نموذج طلب التوريد تلقائياً للخامة "${mat.name}". الكمية المقترحة: ${suggestedQty} قطعة بسعر $${unitPriceVal} للوحدة. يرجى مراجعة الطلب واعتتماده.`,
      "طلب توريد سريع 🚚"
    );
  };

  return {
    handleAdjustStockSubmit,
    handleQuickSupplyRequest,
    handleCreateRemnant,
    handleConsumeRemnant,
    handleWasteRemnant,
    handleCreateSupplyOrder,
    handleCreateDirectSupplyOrder,
    handleDuplicateSupplyOrder,
    handleUpdateSupplyOrderStatus,
    handleFindSuitableRemnantSubmit,
  };
}

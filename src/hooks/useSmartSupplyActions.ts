type SmartSupplyOptions = {
  materials: any[]; suppliers: any[]; smartSupplyItems: any[]; currentUser: any;
  setSmartSupplyItems: (items: any[]) => void; setShowSmartSupplyModal: (v: boolean) => void; setIsSubmittingSmartSupply: (v: boolean) => void;
  fetchSupplyOrders: () => void | Promise<void>; addTerminalLog: (scope: string, message: string) => void;
};

export function useSmartSupplyActions(o: SmartSupplyOptions) {
  const handleOpenSmartSupplyModal = () => {
    const lowStock = o.materials.filter(m => (m.inventory?.quantity ?? 0) <= (m.minimumStock || 0));
    if (!lowStock.length) { window.showAlert?.("جميع الخامات تتجاوز الحدود الدنيا، ولا توجد مواد بحاجة لإعادة التوريد.", "حالة المستودع ممتازة"); return; }
    const proposals = lowStock.map(m => {
      const currentStock = m.inventory?.quantity ?? 0, minimumStock = m.minimumStock || 10;
      const supplierId = m.supplierId || m.supplier?.id || o.suppliers[0]?.id || "";
      const supplier = o.suppliers.find(s => s.id === supplierId);
      return { materialId: m.id, materialName: m.name, category: m.category || "عام", unit: m.unit || "وحدة", currentStock, minimumStock, suggestedQty: Math.max(10, minimumStock * 2 - currentStock), unitPrice: Number(m.pricePerUnit ?? m.price ?? 15), supplierId, supplierName: supplier?.name || "المورد الرئيسي المعتمد", selected: true };
    });
    o.setSmartSupplyItems(proposals); o.setShowSmartSupplyModal(true); o.addTerminalLog("PROD", `تم اقتراح توريد ذكي لعدد ${proposals.length} خامات منخفضة المخزون`);
  };
  const handleExecuteSmartSupplyOrders = async () => {
    const selected = o.smartSupplyItems.filter(i => i.selected && i.suggestedQty > 0);
    if (!selected.length) { window.showAlert?.("يرجى تحديد خامة واحدة على الأقل بكمية أكبر من صفر", "تنبيه الاختيار"); return; }
    const manager = o.currentUser?.role !== "employee" && o.currentUser?.role !== "accountant";
    const total = selected.reduce((sum, i) => sum + i.suggestedQty * i.unitPrice, 0);
    if (!await window.showConfirm?.(`هل أنت متأكد من إصدار ${selected.length} طلبات توريد بقيمة تقديرية $${total.toFixed(2)}؟`, "تأكيد الطلب الذكي")) return;
    o.setIsSubmittingSmartSupply(true);
    try {
      const date = new Date(); date.setDate(date.getDate() + 4); const expectedDeliveryDate = date.toISOString().split("T")[0]; let created = 0;
      for (const item of selected) {
        const res = await fetch("/api/supply-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId: item.supplierId || o.suppliers[0]?.id || "s-1", materialId: item.materialId, quantity: item.suggestedQty, unitPrice: item.unitPrice, expectedDeliveryDate, notes: `طلب توريد ذكي تلقائي - ${manager ? "معتمد" : "بانتظار موافقة الإدارة"}` }) });
        const data = await res.json(); if (data.success) created++;
      }
      await o.fetchSupplyOrders(); o.setShowSmartSupplyModal(false); o.addTerminalLog("PROD", `تم إنشاء ${created} طلبات توريد ذكية`); window.showAlert?.(`تم تسجيل ${created} طلبات توريد ذكية بنجاح.`, "اكتمل التوليد الذكي");
    } catch { window.showAlert?.("حدث خطأ أثناء تسجيل طلبات التوريد الذكية", "خطأ في الشبكة"); }
    finally { o.setIsSubmittingSmartSupply(false); }
  };
  return { handleOpenSmartSupplyModal, handleExecuteSmartSupplyOrders };
}

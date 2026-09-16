import type React from "react";

type Options = {
  matName: string; matCategory: string; matSubCategory: string; matThickness: string; matColor: string; matWidth: string; matHeight: string; matUnit: string; matPrice: string; matMinStock: string; matSupplierId: string; matNotes: string; matLocation: string; matQualityStatus: string;
  editingMaterial: any | null; aiClassificationResult: any | null;
  setMatName: (v: string) => void; setMatSubCategory: (v: string) => void; setMatThickness: (v: string) => void; setMatColor: (v: string) => void; setMatWidth: (v: string) => void; setMatHeight: (v: string) => void; setMatPrice: (v: string) => void; setMatMinStock: (v: string) => void; setMatSupplierId: (v: string) => void; setMatNotes: (v: string) => void; setMatLocation: (v: string) => void; setMatQualityStatus: (v: any) => void;
  setEditingMaterial: (v: any | null) => void; setAiClassificationResult: (v: any) => void; setIsAiClassifying: (v: boolean) => void; setShowAddMaterial: (v: boolean) => void; setMaterials: React.Dispatch<React.SetStateAction<any[]>>;
  refreshInventoryData: () => void | Promise<void>; addTerminalLog: (scope: string, message: string) => void; materials: any[]; exchangeRate: number; setMaterialSortBy: (v: any) => void;
};

export function useMaterialActions(o: Options) {
  const classify = async (name: string, thickness: string, color: string, notes: string, isEdit: boolean, quiet = false) => {
    if (!name || name.trim().length < 2) { if (!quiet) window.showAlert?.("يرجى إدخال اسم المادة أولاً (حرفين على الأقل)", "تنبيه الذكاء الاصطناعي"); return null; }
    o.setIsAiClassifying(true); o.setAiClassificationResult(null);
    try {
      const res = await fetch("/api/materials/ai-classify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, thickness, color, notes }) });
      const data = await res.json();
      if (!data.success || !data.classification) throw new Error(data.message || "فشل التصنيف");
      const result = data.classification;
      if (isEdit) o.setEditingMaterial((prev: any) => prev ? { ...prev, category: result.category, subCategory: result.subCategory } : null);
      o.setAiClassificationResult(result); o.addTerminalLog("AI", `Auto-classified material '${name}' as '${result.category}' (${result.subCategory})`); return result;
    } catch (e: any) { o.addTerminalLog("ERROR", `AI classification failed: ${e.message}`); if (!quiet) window.showAlert?.(e.message, "خطأ التصنيف الذكي"); return null; }
    finally { o.setIsAiClassifying(false); }
  };
  const handleAiClassifyMaterial = (name: string, thickness: string, color: string, notes: string, isEdit: boolean, quiet = false) => classify(name, thickness, color, notes, isEdit, quiet);
  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault(); if (!o.matName) return;
    let category = o.matCategory, subCategory = o.matSubCategory;
    if (!o.aiClassificationResult && o.matName.trim().length >= 2) { const c = await classify(o.matName, o.matThickness, o.matColor, o.matNotes, false, true); if (c) { if (!category || category === "عام") category = c.category; if (!subCategory.trim()) subCategory = c.subCategory; } }
    try {
      const res = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: o.matName, category: category || "عام", subCategory: subCategory.trim() || "عام", thickness: o.matThickness ? parseFloat(o.matThickness) : null, color: o.matColor, width: o.matWidth ? parseFloat(o.matWidth) : null, height: o.matHeight ? parseFloat(o.matHeight) : null, unit: o.matUnit, pricePerUnit: o.matPrice ? Math.round(parseFloat(o.matPrice)) : 0, minimumStock: o.matMinStock ? parseFloat(o.matMinStock) : 0, supplierId: o.matSupplierId || null, notes: o.matNotes, location: o.matLocation, qualityStatus: o.matQualityStatus }) });
      if (!res.ok) throw new Error("create failed");
      o.addTerminalLog("DB", `Created raw material: ${o.matName}`); o.setShowAddMaterial(false); o.setAiClassificationResult(null);
      [o.setMatName, o.setMatSubCategory, o.setMatThickness, o.setMatColor, o.setMatWidth, o.setMatHeight, o.setMatPrice, o.setMatMinStock, o.setMatSupplierId, o.setMatNotes, o.setMatLocation].forEach(set => set("")); o.setMatQualityStatus("inspected"); await o.refreshInventoryData();
    } catch { o.addTerminalLog("ERROR", "Failed to create material"); }
  };
  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault(); const m = o.editingMaterial; if (!m?.name) return;
    let category = m.category, subCategory = m.subCategory;
    if (!o.aiClassificationResult && m.name.trim().length >= 2) { const c = await classify(m.name, m.thickness, m.color, m.notes, true, true); if (c) { if (!category || category === "عام") category = c.category; if (!subCategory?.trim()) subCategory = c.subCategory; } }
    try { const res = await fetch(`/api/materials/${m.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: m.name, category: category || "عام", subCategory: subCategory?.trim() || "عام", thickness: m.thickness, color: m.color, width: m.width, height: m.height, unit: m.unit, pricePerUnit: Math.round(Number(m.pricePerUnit) || 0), minimumStock: m.minimumStock, supplierId: m.supplierId, notes: m.notes, location: m.inventory?.location, qualityStatus: m.qualityStatus || "inspected" }) }); if (!res.ok) throw new Error("update failed"); o.addTerminalLog("DB", `Updated raw material: ${m.name}`); o.setEditingMaterial(null); o.setAiClassificationResult(null); await o.refreshInventoryData(); } catch { o.addTerminalLog("ERROR", "Failed to update material"); }
  };
  const handleUpdateMaterialQualityStatus = async (id: string, qualityStatus: string) => { try { o.setMaterials(prev => prev.map(m => m.id === id ? { ...m, qualityStatus } : m)); const res = await fetch(`/api/materials/${id}/quality-status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qualityStatus }) }); if (!res.ok) await o.refreshInventoryData(); else o.addTerminalLog("DB", `Updated material quality: ${qualityStatus}`); } catch { o.addTerminalLog("ERROR", "Failed to update material quality"); await o.refreshInventoryData(); } };
  const handleDeleteMaterial = async (id: string, name: string) => { try { const res = await fetch(`/api/materials/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); o.addTerminalLog("DB", `Archived material item: ${name}`); await o.refreshInventoryData(); } catch { o.addTerminalLog("ERROR", "Failed to archive material"); } };
  const handleReorderMaterials = (sourceId: string, targetId: string) => {
    o.setMaterials(prev => { const sourceIdx = prev.findIndex(m => m.id === sourceId); const targetIdx = prev.findIndex(m => m.id === targetId); if (sourceIdx < 0 || targetIdx < 0) return prev; const updated = [...prev]; const [moved] = updated.splice(sourceIdx, 1); updated.splice(targetIdx, 0, moved); try { localStorage.setItem("axislab_materials_order_ids", JSON.stringify(updated.map(m => m.id))); } catch {} return updated; });
    o.setMaterialSortBy("default"); o.addTerminalLog("SUCCESS", "تم حفظ ترتيب المواد الخام بنجاح");
  };
  const handleExportMaterialsCSV = (list: any[] = o.materials) => {
    if (!list.length) { o.addTerminalLog("WARN", "لا يوجد خامات للتصدير"); return; }
    const headers = ["كود المادة","اسم المادة والخامة","التصنيف","السماكة (ملم)","اللون / المواصفة","حالة الجودة الفنية","سعر الشراء للوحدة ($)","سعر الوحدة بالليرة (ل.س)","الرصيد المتاح الحالي","الوحدة","الكمية المحجوزة للإنتاج","حد الطلب الأدنى","موقع التخزين","حالة المخزون","إجمالي قيمة المخزون ($)"];
    const rows = list.map(m => { const qty=m.inventory?.quantity??0, reserved=m.inventory?.reservedQuantity??0, min=m.minimumStock||0, price=Number(m.pricePerUnit)||0; const quality=m.qualityStatus==='defective'?'معيبة':m.qualityStatus==='in_preparation'?'قيد التجهيز':'مفحوصة'; const status=qty<=0?'نافذ بالكامل':qty<=min?'منخفض / يتطلب توريد':'سليم ومتوفر'; return [m.id,m.name||'',m.category||'',m.thickness||'-',m.color||'-',quality,price,Math.round(price*o.exchangeRate),qty,m.unit||'وحدة',reserved,min,m.inventory?.location||'المستودع الرئيسي',status,(qty*price).toFixed(2)]; });
    const csv="\uFEFF"+[headers.join(","),...rows.map(row=>row.map(v=>{const x=String(v).replace(/"/g,'""'); return /[",\n]/.test(x)?`"${x}"`:x;}).join(","))].join("\n"); const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})); const link=document.createElement("a"); link.href=url; link.download=`AXIS_LAB_Materials_Inventory_Audit_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); o.addTerminalLog("EXPORT", `تم تصدير سجل المواد والمخزون (${list.length} خامة)`);
  };
  return { handleAiClassifyMaterial, handleCreateMaterial, handleUpdateMaterial, handleUpdateMaterialQualityStatus, handleDeleteMaterial, handleReorderMaterials, handleExportMaterialsCSV };
}

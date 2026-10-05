import express from "express";
import * as core from "../../../../server-core.ts";

const { MATERIALS, INVENTORY } = core;

export function registerMaterialAvailabilityRoute(app: express.Express) {
app.post("/api/materials/check-availability", (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "يرجى تزويد قائمة عناصر الطلب للفحص" });
      return;
    }

    const itemsCheck: Array<{
      itemName: string;
      requiredQty: number;
      matchedMaterial: string | null;
      materialId: string | null;
      currentStock: number;
      availableStock: number;
      minimumStock: number;
      projectedStock: number;
      status: "ok" | "warning" | "error" | "unmatched";
      message: string;
    }> = [];

    let hasWarnings = false;
    let hasErrors = false;

    items.forEach((item) => {
      const itemName = String(item.name || item.productName || "").trim();
      const requiredQty = Number(item.qty || item.quantity) || 1;
      if (!itemName) return;

      const lowerItem = itemName.toLowerCase();
      let matched = MATERIALS.find(material => material.name.toLowerCase() === lowerItem);
      if (!matched) {
        matched = MATERIALS.find(
          material =>
            lowerItem.includes(material.name.toLowerCase()) ||
            material.name.toLowerCase().includes(lowerItem),
        );
      }
      if (!matched) {
        if (
          lowerItem.includes("أكريليك") ||
          lowerItem.includes("اكريليك") ||
          lowerItem.includes("acrylic")
        ) {
          matched = MATERIALS.find(material => material.category === "الأكريليك");
        } else if (
          lowerItem.includes("خشب") ||
          lowerItem.includes("mdf") ||
          lowerItem.includes("زان") ||
          lowerItem.includes("wood")
        ) {
          matched = MATERIALS.find(material => material.category === "الأخشاب");
        } else if (lowerItem.includes("جلد") || lowerItem.includes("leather")) {
          matched = MATERIALS.find(material => material.category === "الجلود");
        }
      }

      if (!matched) {
        itemsCheck.push({
          itemName,
          requiredQty,
          matchedMaterial: null,
          materialId: null,
          currentStock: 0,
          availableStock: 0,
          minimumStock: 0,
          projectedStock: 0,
          status: "unmatched",
          message: "لم يتم العثور على مادة مطابقة مباشرة في المستودع. يرجى التأكد من المسمى المعتمد للمادة.",
        });
        return;
      }

      const inventory = INVENTORY.find(item => item.materialId === matched?.id);
      const currentStock = inventory ? inventory.quantity : 0;
      const availableStock = inventory ? inventory.availableQuantity : currentStock;
      const minimumStock = matched.minimumStock || 5;
      const projectedStock = currentStock - requiredQty;
      let status: "ok" | "warning" | "error" = "ok";
      let message = `المادة متوفرة بالمستودع. المخزون الحالي ${currentStock} ${matched.unit || "وحدة"}، والمتبقي المتوقع بعد تنفيذ الطلب سيكون ${projectedStock} ${matched.unit || "وحدة"}.`;

      if (currentStock < requiredQty) {
        status = "error";
        hasErrors = true;
        message = `⚠️ غير كافية! المخزون الحالي (${currentStock} ${matched.unit || "وحدة"}) أقل من الكمية المطلوبة للطلب (${requiredQty} ${matched.unit || "وحدة"}).`;
      } else if (projectedStock < minimumStock) {
        status = "warning";
        hasWarnings = true;
        message = `⚠️ تنبيه انخفاض المخزون! تنفيذ الطلب سيقلل المخزون المتبقي لـ (${matched.name}) إلى (${projectedStock} ${matched.unit || "وحدة"}) وهو أقل من الحد الأدنى المقدر بـ (${minimumStock} ${matched.unit || "وحدة"}).`;
      }

      itemsCheck.push({
        itemName,
        requiredQty,
        matchedMaterial: matched.name,
        materialId: matched.id,
        currentStock,
        availableStock,
        minimumStock,
        projectedStock,
        status,
        message,
      });
    });

    let overallStatus: "success" | "warning" | "error" = "success";
    let summaryMessage = "✅ جميع مواد الطلب متوفرة بالمستودع والمخزون المتبقي سيبقى فوق الحد الأدنى للأمان.";
    if (hasErrors) {
      overallStatus = "error";
      summaryMessage = "🚨 تنبيه حرِج: توجد خامات كميتها الحالية بالمستودع غير كافية لتغطية هذا الطلب!";
    } else if (hasWarnings) {
      overallStatus = "warning";
      summaryMessage = "⚠️ تنبيه مخزون: استهلاك هذا الطلب يؤدي لانخفاض رصيد مواد بالمستودع تحت الحد الأدنى للأمان!";
    }

    res.json({
      success: true,
      overallStatus,
      summaryMessage,
      hasWarnings,
      hasErrors,
      itemsCheck,
    });
  });
}

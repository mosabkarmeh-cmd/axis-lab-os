import express from "express";
import { Type } from "@google/genai";
import * as core from "../../server-core.ts";
import {
  isEmployee,
  sanitizeMaterialForEmployee,
  sanitizeMaterialCollection,
  sanitizeSupplierQuote,
} from "./shared.ts";

const {
  ai,
  MATERIALS,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  SUPPLIER_QUOTES,
  SUPPLIERS,
} = core;

export function registerMaterialCatalogRoutes(app: express.Express) {
  app.post("/api/materials/ai-classify", async (req, res) => {
    try {
      const { name, thickness, color, notes } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "اسم المادة مطلوب للتصنيف الذكي" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ success: false, message: "مفتاح Gemini API غير مكوّن في الإعدادات." });
        return;
      }

      const prompt = `Classify this material for a laser cutting workshop:
- Name: ${name}
- Thickness: ${thickness || "unknown"} mm
- Color: ${color || "unknown"}
- Notes: ${notes || "none"}`;

      const systemInstruction = `You are a material classification assistant for AXIS LAB, a specialized laser cutting and engraving workshop.
Analyze the material's physical properties such as its name, thickness, color, and descriptions.
Identify its standard category and subcategory based on these inputs:
Standard Categories (must be EXACTLY one of these Arabic strings):
- 'الأكريليك' (for acrylic, plexiglass, Perspex, polymer panels)
- 'الأخشاب' (for wood, MDF, plywood, veneer, natural timber)
- 'الجلود' (for leather, cowskin, suede, synthetic leather, fabric)
- 'عام' (for metals, paper, cardboards, glass, rubber, or other general materials)

Standard subCategory (Provide a descriptive short Arabic subcategory string describing the material finish or variant, e.g. 'شفاف', 'ملون', 'مرآة', 'معتم', 'MDF', 'طبيعي', 'معاكس', 'سوداني', 'سويدي', 'صناعي', 'ورق مقوى', 'معدن', 'عام').

Be intelligent! If the name contains wood words like "خشب", "زان", "MDF", classify category as 'الأخشاب' and subCategory as 'MDF' or 'طبيعي'. If it contains "أكريليك", "شفاف", "acrylic", classify category as 'الأكريليك' and subCategory as 'شفاف' or 'ملون' or 'مرآة'. If it contains "جلد", "leather", classify category as 'الجلود' and subCategory as 'طبيعي' or 'صناعي'. Otherwise, use 'عام' and 'عام'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Exactly one of: 'الأكريليك', 'الأخشاب', 'الجلود', 'عام'" },
              subCategory: { type: Type.STRING, description: "Short descriptive subcategory in Arabic e.g. 'شفاف', 'ملون', 'مرآة', 'MDF', 'طبيعي', 'عام'" },
              confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
              explanation: { type: Type.STRING, description: "A brief, friendly explanation in Arabic explaining why this classification was chosen" },
            },
            required: ["category", "subCategory", "confidence", "explanation"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error("Empty response from Gemini API");
      const resultJson = JSON.parse(resultText.trim());
      res.json({ success: true, classification: resultJson });
    } catch (error: unknown) {
      console.error("AI Material classification error:", error);
      res.status(500).json({
        success: false,
        message: "فشل تصنيف المادة بالذكاء الاصطناعي",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/materials", (req, res) => {
    const { search, category } = req.query;
    let list = [...MATERIALS];

    if (search) {
      const searchStr = String(search).toLowerCase();
      list = list.filter(material =>
        material.name.toLowerCase().includes(searchStr) ||
        (material.subCategory && material.subCategory.toLowerCase().includes(searchStr)),
      );
    }
    if (category && category !== "الكل") {
      list = list.filter(material => material.category === category);
    }

    const employee = isEmployee(req);
    const enrichedList = list.map(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      const supplier = SUPPLIERS.find(item => item.id === material.supplierId);
      const result = {
        ...material,
        pricePerUnit: employee ? 0 : material.pricePerUnit,
        inventory: inventory || null,
        supplier: employee ? null : (supplier || null),
      };
      return sanitizeMaterialForEmployee(result, req);
    });

    res.json({ success: true, materials: enrichedList });
  });

  app.get("/api/materials/categories", (req, res) => {
    const categories = Array.from(new Set(MATERIALS.map(material => material.category)));
    res.json({ success: true, categories });
  });

  app.get("/api/materials/low-stock", (req, res) => {
    const lowStock = MATERIALS.filter(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      const available = inventory ? inventory.availableQuantity : 0;
      return available < material.minimumStock;
    }).map(material => {
      const inventory = INVENTORY.find(item => item.materialId === material.id);
      return {
        id: material.id,
        name: material.name,
        available: inventory ? inventory.availableQuantity : 0,
        minimum: material.minimumStock,
        unit: material.unit,
      };
    });
    res.json({ success: true, lowStock });
  });

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

  app.get("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(item => item.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const inventory = INVENTORY.find(item => item.materialId === material.id);
    const supplier = SUPPLIERS.find(item => item.id === material.supplierId);
    const transactions = INVENTORY_TRANSACTIONS
      .filter(item => item.materialId === material.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
    const remnants = REMNANTS.filter(item => item.materialId === material.id && (item.status === "available" || item.status === "reserved"));
    const quotes = SUPPLIER_QUOTES.filter(item => item.materialId === material.id);

    const safeQuotes = quotes.map(quote =>
      sanitizeSupplierQuote(quote as Record<string, unknown>, req),
    );
    const detail = {
      ...material,
      inventory: inventory || null,
      supplier: isEmployee(req) ? null : (supplier || null),
      supplierQuotes: safeQuotes,
      transactions,
      remnants,
    };

    res.json({ success: true, material: sanitizeMaterialForEmployee(detail, req) });
  });
}

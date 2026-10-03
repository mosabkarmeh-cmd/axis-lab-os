import express from "express";
import { Type } from "@google/genai";
import { db } from "../../db/index.ts";
import { eq } from "drizzle-orm";
import { inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable } from "../../db/schema.ts";
import * as core from "../server-core.ts";

const {
  ai,
  USE_POSTGRES,
  MATERIALS,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  SUPPLIER_QUOTES,
  SUPPLIERS,
  DELETED_ITEMS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  getRequestUser,
  createNotification,
  idNum,
  persistStateNow,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerLegacyMaterialsInventoryRoutes(app: express.Express) {
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
              explanation: { type: Type.STRING, description: "A brief, friendly explanation in Arabic explaining why this classification was chosen" }
            },
            required: ["category", "subCategory", "confidence", "explanation"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from Gemini API");
      }

      const resultJson = JSON.parse(resultText.trim());
      res.json({ success: true, classification: resultJson });
    } catch (error: unknown) {
      console.error("AI Material classification error:", error);
      res.status(500).json({ success: false, message: "فشل تصنيف المادة بالذكاء الاصطناعي", error: error.message });
    }
  });

  app.get("/api/materials", (req, res) => {
    const { search, category } = req.query;
    let list = [...MATERIALS];

    if (search) {
      const searchStr = String(search).toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(searchStr) || 
        (m.subCategory && m.subCategory.toLowerCase().includes(searchStr))
      );
    }
    if (category && category !== "الكل") {
      list = list.filter(m => m.category === category);
    }

    const user = getRequestUser(req);
    const isEmployee = user && user.role === "employee";

    // Attach inventory and supplier to each material
    const enrichedList = list.map(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const sup = SUPPLIERS.find(s => s.id === m.supplierId);
      return {
        ...m,
        pricePerUnit: isEmployee ? 0 : m.pricePerUnit,
        inventory: inv || null,
        supplier: isEmployee ? null : (sup || null)
      };
    });

    res.json({ success: true, materials: enrichedList });
  });

  app.get("/api/materials/categories", (req, res) => {
    const categories = Array.from(new Set(MATERIALS.map(m => m.category)));
    res.json({ success: true, categories });
  });

  app.get("/api/materials/low-stock", (req, res) => {
    const lowStock = MATERIALS.filter(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const avail = inv ? inv.availableQuantity : 0;
      return avail < m.minimumStock;
    }).map(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      return {
        id: m.id,
        name: m.name,
        available: inv ? inv.availableQuantity : 0,
        minimum: m.minimumStock,
        unit: m.unit
      };
    });
    res.json({ success: true, lowStock });
  });

  app.post("/api/materials/check-availability", (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
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
      status: 'ok' | 'warning' | 'error' | 'unmatched';
      message: string;
    }> = [];

    let hasWarnings = false;
    let hasErrors = false;

    items.forEach((it) => {
      const itemName = String(it.name || it.productName || "").trim();
      const requiredQty = Number(it.qty || it.quantity) || 1;

      if (!itemName) return;

      const lowerItem = itemName.toLowerCase();
      // Find best match in MATERIALS
      let matched = MATERIALS.find(m => m.name.toLowerCase() === lowerItem);
      if (!matched) {
        matched = MATERIALS.find(m => lowerItem.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lowerItem));
      }
      if (!matched) {
        // Keyword fallbacks
        if (lowerItem.includes("أكريليك") || lowerItem.includes("اكريليك") || lowerItem.includes("acrylic")) {
          matched = MATERIALS.find(m => m.category === "الأكريليك");
        } else if (lowerItem.includes("خشب") || lowerItem.includes("mdf") || lowerItem.includes("زان") || lowerItem.includes("wood")) {
          matched = MATERIALS.find(m => m.category === "الأخشاب");
        } else if (lowerItem.includes("جلد") || lowerItem.includes("leather")) {
          matched = MATERIALS.find(m => m.category === "الجلود");
        }
      }

      if (matched) {
        const inv = INVENTORY.find(i => i.materialId === matched.id);
        const currentStock = inv ? inv.quantity : 0;
        const availableStock = inv ? inv.availableQuantity : currentStock;
        const minimumStock = matched.minimumStock || 5;
        const projectedStock = currentStock - requiredQty;

        let status: 'ok' | 'warning' | 'error' = 'ok';
        let message = `المادة متوفرة بالمستودع. المخزون الحالي ${currentStock} ${matched.unit || "وحدة"}، والمتبقي المتوقع بعد تنفيذ الطلب سيكون ${projectedStock} ${matched.unit || "وحدة"}.`;

        if (currentStock < requiredQty) {
          status = 'error';
          hasErrors = true;
          message = `⚠️ غير كافية! المخزون الحالي (${currentStock} ${matched.unit || "وحدة"}) أقل من الكمية المطلوبة للطلب (${requiredQty} ${matched.unit || "وحدة"}).`;
        } else if (projectedStock < minimumStock) {
          status = 'warning';
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
          message
        });
      } else {
        itemsCheck.push({
          itemName,
          requiredQty,
          matchedMaterial: null,
          materialId: null,
          currentStock: 0,
          availableStock: 0,
          minimumStock: 0,
          projectedStock: 0,
          status: 'unmatched',
          message: `لم يتم العثور على مادة مطابقة مباشرة في المستودع. يرجى التأكد من المسمى المعتمد للمادة.`
        });
      }
    });

    let overallStatus: 'success' | 'warning' | 'error' = 'success';
    let summaryMessage = "✅ جميع مواد الطلب متوفرة بالمستودع والمخزون المتبقي سيبقى فوق الحد الأدنى للأمان.";

    if (hasErrors) {
      overallStatus = 'error';
      summaryMessage = "🚨 تنبيه حرِج: توجد خامات كميتها الحالية بالمستودع غير كافية لتغطية هذا الطلب!";
    } else if (hasWarnings) {
      overallStatus = 'warning';
      summaryMessage = "⚠️ تنبيه مخزون: استهلاك هذا الطلب يؤدي لانخفاض رصيد مواد بالمستودع تحت الحد الأدنى للأمان!";
    }

    res.json({
      success: true,
      overallStatus,
      summaryMessage,
      hasWarnings,
      hasErrors,
      itemsCheck
    });
  });

  app.get("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const inv = INVENTORY.find(i => i.materialId === material.id);
    const sup = SUPPLIERS.find(s => s.id === material.supplierId);
    const txs = INVENTORY_TRANSACTIONS.filter(t => t.materialId === material.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
    const rems = REMNANTS.filter(r => r.materialId === material.id && (r.status === "available" || r.status === "reserved"));
    const quotes = SUPPLIER_QUOTES.filter(q => q.materialId === material.id);

    res.json({
      success: true,
      material: {
        ...material,
        inventory: inv || null,
        supplier: sup || null,
        transactions: txs,
        remnants: rems,
        supplierQuotes: quotes
      }
    });
  });

  // Supplier Price Comparison Endpoints
  app.get("/api/materials/:id/supplier-quotes", (req, res) => {
    const quotes = SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id);
    res.json({ success: true, quotes });
  });

  app.post("/api/materials/:id/supplier-quotes", async (req, res) => {
    const { supplierId, supplierName, pricePerUnit, minOrderQuantity, deliveryDays, paymentTerms, qualityRating, notes } = req.body;
    if (!pricePerUnit) {
      res.status(400).json({ success: false, message: "سعر الوحدة مطلوب" });
      return;
    }

    const matId = idNum(req.params.id, "m-");
    if (!matId) {
      res.status(400).json({ success: false, message: "معرف المادة غير صالح" });
      return;
    }

    let finalSupName = supplierName || "مورد جديد";
    const supId = idNum(supplierId, "s-");
    if (supId) {
      const existingSup = SUPPLIERS.find(s => s.id === supplierId);
      if (existingSup) finalSupName = existingSup.name;
    }

    try {
      const inserted = await db.insert(supplierQuotesTable).values({
        materialId: matId, supplierId: supId, supplierName: finalSupName,
        pricePerUnit: Number(pricePerUnit) || 0, minOrderQuantity: Number(minOrderQuantity) || 1,
        deliveryDays: Number(deliveryDays) || 1, paymentTerms: paymentTerms || "نقدي",
        qualityRating: Number(qualityRating) || 4.5, notes: notes || null,
      }).returning();
      const row = inserted[0];
      const newQuote = {
        id: "sq-" + row.id, materialId: req.params.id, supplierId: supId ? "s-" + supId : "s-custom",
        supplierName: row.supplierName, pricePerUnit: row.pricePerUnit,
        minOrderQuantity: row.minOrderQuantity, deliveryDays: row.deliveryDays,
        paymentTerms: row.paymentTerms || "", qualityRating: row.qualityRating, notes: row.notes || "",
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      };
      SUPPLIER_QUOTES.push(newQuote);
      res.status(201).json({ success: true, quote: newQuote, quotes: SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id) });
    } catch (err: unknown) {
      console.error("Error adding supplier quote:", err);
      res.status(500).json({ success: false, message: "فشل إضافة عرض السعر: " + err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/materials/:id/supplier-quotes/:quoteId", async (req, res) => {
    const quoteId = idNum(req.params.quoteId, "sq-");
    try {
      if (quoteId) {
        await db.delete(supplierQuotesTable).where(eq(supplierQuotesTable.id, quoteId));
      }
      const idx = SUPPLIER_QUOTES.findIndex(q => q.id === req.params.quoteId && q.materialId === req.params.id);
      if (idx !== -1) {
        SUPPLIER_QUOTES.splice(idx, 1);
      }
      res.json({ success: true, quotes: SUPPLIER_QUOTES.filter(q => q.materialId === req.params.id) });
    } catch (err: unknown) {
      console.error("Error deleting supplier quote:", err);
      res.status(500).json({ success: false, message: "فشل حذف عرض السعر: " + err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/materials/:id/set-primary-supplier", async (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { supplierId, supplierName, pricePerUnit } = req.body;
    if (supplierId) material.supplierId = supplierId;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || material.pricePerUnit;

    try {
      const matId = idNum(req.params.id, "m-");
      const supId = idNum(supplierId, "s-");
      if (matId) {
        await db.update(materialsTable).set({
          ...(supId ? { supplierId: supId } : {}),
          pricePerUnit: material.pricePerUnit,
        }).where(eq(materialsTable.id, matId));
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: "SET_PRIMARY_SUPPLIER",
        entityType: "Material",
        entityId: material.id,
        createdAt: new Date().toISOString(),
        details: `تمت ترقية المورد ${supplierName || supplierId} لمورد رئيسي بسعر $${pricePerUnit}`
      });

      res.json({ success: true, material });
    } catch (err: unknown) {
      console.error("Error setting primary supplier:", err);
      res.status(500).json({ success: false, message: "فشل تعيين المورد الرئيسي: " + err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/materials", (req, res) => {
    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, qualityStatus } = req.body;
    if (!name || !category) {
      res.status(400).json({ success: false, message: "Name and Category are required" });
      return;
    }

    const newMat = {
      id: nextEntityId("m"),
      name: name.trim(),
      category,
      subCategory: subCategory || "",
      thickness: thickness ? Number(thickness) : null,
      color: color || "",
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      unit: unit || "sheet",
      pricePerUnit: pricePerUnit ? Number(pricePerUnit) : 0,
      minimumStock: minimumStock ? Number(minimumStock) : 0,
      supplierId: supplierId || null,
      notes: notes || "",
      status: "active",
      qualityStatus: qualityStatus || "inspected",
      createdAt: new Date().toISOString()
    };

    MATERIALS.push(newMat);

    // Create corresponding Inventory record
    const newInv = {
      id: nextEntityId("inv"),
      materialId: newMat.id,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      location: "مستودع عام"
    };
    INVENTORY.push(newInv);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_MATERIAL",
      entityType: "Material",
      entityId: newMat.id,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, material: newMat });
  });

  app.put("/api/materials/:id", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }

    const { name, category, subCategory, thickness, color, width, height, unit, pricePerUnit, minimumStock, supplierId, notes, location, qualityStatus } = req.body;
    
    if (name) material.name = name;
    if (category) material.category = category;
    if (subCategory !== undefined) material.subCategory = subCategory;
    if (thickness !== undefined) material.thickness = thickness ? Number(thickness) : null;
    if (color !== undefined) material.color = color;
    if (width !== undefined) material.width = width ? Number(width) : null;
    if (height !== undefined) material.height = height ? Number(height) : null;
    if (unit) material.unit = unit;
    if (pricePerUnit !== undefined) material.pricePerUnit = Number(pricePerUnit) || 0;
    if (minimumStock !== undefined) material.minimumStock = Number(minimumStock) || 0;
    if (supplierId !== undefined) material.supplierId = supplierId;
    if (notes !== undefined) material.notes = notes;
    if (qualityStatus !== undefined) material.qualityStatus = qualityStatus;

    if (location !== undefined) {
      const inv = INVENTORY.find(i => i.materialId === material.id);
      if (inv) inv.location = location;
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, material });
  });

  app.patch("/api/materials/:id/quality-status", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const { qualityStatus } = req.body;
    if (qualityStatus) {
      material.qualityStatus = qualityStatus;
    }
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_MATERIAL_QUALITY_STATUS",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, material });
  });

  app.delete("/api/materials/:id", (req, res) => {
    const user = getRequestUser(req);
    const index = MATERIALS.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    const material = MATERIALS[index];
    material.status = "archived";

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Material",
      entityId: material.id,
      name: material.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: material
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "ARCHIVE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    createNotification(
      "أرشفة خامة",
      `تم نقل الخامة "${material.name}" إلى سلة المحذوفات وأرشفتها.`,
      "inventory"
    );

    res.json({ success: true, material });
  });

  app.post("/api/materials/:id/restore", (req, res) => {
    const material = MATERIALS.find(m => m.id === req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: "Material not found" });
      return;
    }
    material.status = "active";

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "RESTORE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, material });
  });


  // ==================== INVENTORY API ====================

  app.get("/api/inventory/transactions", (req, res) => {
    const { materialId, type } = req.query;
    let list = [...INVENTORY_TRANSACTIONS];

    if (materialId) list = list.filter(t => t.materialId === materialId);
    if (type) list = list.filter(t => t.type === type);

    const enrichedList = list.map(t => {
      const mat = MATERIALS.find(m => m.id === t.materialId);
      const user = USERS.find(u => u.id === t.createdById);
      return {
        ...t,
        material: mat ? { id: mat.id, name: mat.name, unit: mat.unit } : null,
        createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: enrichedList });
  });

  app.get("/api/inventory/stats", (req, res) => {
    const totalMaterials = MATERIALS.length;
    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    MATERIALS.forEach(m => {
      const inv = INVENTORY.find(i => i.materialId === m.id);
      const qty = inv ? inv.quantity : 0;
      const avail = inv ? inv.availableQuantity : 0;
      totalValue += (qty * m.pricePerUnit);
      if (avail < m.minimumStock) lowStock++;
      if (avail <= 0) outOfStock++;
    });

    res.json({
      success: true,
      stats: {
        totalMaterials,
        totalValue,
        lowStock,
        outOfStock
      }
    });
  });

  app.get("/api/inventory/:materialId/transactions", (req, res) => {
    const { materialId } = req.params;
    const list = INVENTORY_TRANSACTIONS.filter(t => t.materialId === materialId)
      .map(t => {
        const user = USERS.find(u => u.id === t.createdById);
        return {
          ...t,
          createdBy: user ? { id: user.id, fullName: user.fullName } : { id: "system", fullName: "النظام" }
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, transactions: list });
  });

  app.post("/api/inventory/:materialId/update", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, type, referenceType, referenceId, reason, userId, location } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const beforeQty = Number(inv.quantity) || 0;
    const qtyChange = Number(quantity);
    if (!Number.isFinite(qtyChange) || qtyChange === 0) {
      res.status(400).json({ success: false, message: "Inventory adjustment must be a finite non-zero number" });
      return;
    }
    const afterQty = beforeQty + qtyChange;

    if (afterQty < 0 || afterQty < Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: `Insufficient stock. Available: ${beforeQty - Number(inv.reservedQuantity || 0)}, Requested adjustment: ${qtyChange}` });
      return;
    }

    inv.quantity = afterQty;
    inv.availableQuantity = afterQty - inv.reservedQuantity;
    if (location) inv.location = location;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            quantity: afterQty, availableQuantity: inv.availableQuantity,
            ...(location ? { location } : {}),
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: type || "adjustment", quantity: qtyChange, beforeQty, afterQty,
            referenceType: referenceType || null, referenceId: referenceId || null,
            reason: reason || "تحديث يدوي للمخزون",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: type || "adjustment",
        quantity: qtyChange,
        beforeQty,
        afterQty,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        reason: reason || "تحديث يدوي للمخزون",
        createdById: getActorId(req),
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: getActorId(req),
        action: `INVENTORY_${type ? type.toUpperCase() : 'ADJUSTMENT'}`,
        entityType: "Inventory",
        entityId: inv.id,
        createdAt: new Date().toISOString()
      });

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error updating inventory:", err);
      res.status(500).json({ success: false, message: `فشل تحديث المخزون: ${err instanceof Error ? err.message : String(err)}` });
    }
  });

  app.post("/api/inventory/:materialId/reserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Reservation quantity must be a positive finite number" });
      return;
    }
    const available = inv.quantity - inv.reservedQuantity;
    if (available < qty) {
      res.status(400).json({ success: false, message: `Insufficient available stock. Available: ${available}, Requested: ${qty}` });
      return;
    }

    inv.reservedQuantity += qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "reservation", quantity: qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "حجز مواد للطلب",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "reservation",
        quantity: qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "حجز مواد للطلب",
        createdById: "system",
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error reserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل حجز المخزون: " + err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/inventory/:materialId/unreserve", async (req, res) => {
    const { materialId } = req.params;
    const { quantity, referenceId } = req.body;

    const inv = INVENTORY.find(i => i.materialId === materialId);
    if (!inv) {
      res.status(404).json({ success: false, message: "Inventory record not found" });
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: "Unreservation quantity must be a positive finite number" });
      return;
    }
    if (qty > Number(inv.reservedQuantity || 0)) {
      res.status(400).json({ success: false, message: "Cannot release more stock than is currently reserved" });
      return;
    }
    inv.reservedQuantity = inv.reservedQuantity - qty;
    inv.availableQuantity = inv.quantity - inv.reservedQuantity;

    const matId = idNum(materialId, "m-");
    const invId = idNum(inv.id, "inv-");

    try {
      if (USE_POSTGRES) {
        if (invId) {
          await db.update(inventoryTable).set({
            reservedQuantity: inv.reservedQuantity, availableQuantity: inv.availableQuantity,
          }).where(eq(inventoryTable.id, invId));
        }
        if (matId) {
          await db.insert(inventoryTransactionsTable).values({
            materialId: matId, type: "unreserve", quantity: -qty, beforeQty: inv.quantity, afterQty: inv.quantity,
            referenceType: "order", referenceId: referenceId || null, reason: "إلغاء حجز مواد",
          });
        }
      }

      const newTx = {
        id: nextEntityId("tx"),
        materialId,
        type: "unreserve",
        quantity: -qty,
        beforeQty: inv.quantity,
        afterQty: inv.quantity,
        referenceType: "order",
        referenceId: referenceId || null,
        reason: "إلغاء حجز مواد",
        createdById: "system",
        createdAt: new Date().toISOString()
      };
      INVENTORY_TRANSACTIONS.push(newTx);

      await persistStateNow();
      res.json({ success: true, inventory: inv });
    } catch (err: unknown) {
      console.error("Error unreserving inventory:", err);
      res.status(500).json({ success: false, message: "فشل إلغاء حجز المخزون: " + err instanceof Error ? err.message : String(err) });
    }
  });



}

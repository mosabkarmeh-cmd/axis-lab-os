import express from "express";
import multer from "multer";
import * as core from "../server-core.ts";

const {
  CUSTOMERS,
  PRODUCTS,
  MATERIALS,
  SUPPLIERS,
  INVENTORY,
  nextEntityId,
  getRequestUser,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerImportRoutes(app: express.Express) {
  });

  // 4. BULK IMPORT APIs
  const requireImportAdmin = (req: express.Request, res: express.Response) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "استيراد البيانات متاح لمدير النظام فقط" });
      return false;
    }
    return true;
  };
  const normalizeImportHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[\\s_\\-\\/()]+/g, "");
  const importCell = (row: unknown[], headers: string[], aliases: string[]) => {
    const wanted = aliases.map(normalizeImportHeader);
    const index = headers.findIndex((header) => wanted.includes(normalizeImportHeader(header)));
    return index >= 0 ? row[index] ?? "" : "";
  };
  const inferImportSheet = (name: string, headers: string[]) => {
    const normalizedName = normalizeImportHeader(name);
    const normalizedHeaders = headers.map(normalizeImportHeader);
    if (normalizedName.includes("تعليمات") || normalizedName.includes("قوائم") || normalizedName.includes("instructions") || normalizedName.includes("lists")) return "ignore";
    if (normalizedName.includes("مورد") || normalizedHeaders.includes("كودالمورد") || normalizedHeaders.includes("suppliercode")) return "suppliers";
    if (normalizedName.includes("مخزون") || normalizedHeaders.includes("الكميةالافتتاحية") || normalizedHeaders.includes("openingquantity")) return "inventory";
    return "materials";
  };
  app.post("/api/import/excel/preview", multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single("file"), async (req: express.Request, res) => {
    if (!requireImportAdmin(req, res)) return;
    if (!req.file) { res.status(400).json({ success: false, message: "ملف Excel مطلوب" }); return; }
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheets = workbook.worksheets.map((worksheet) => {
        const name = worksheet.name;
        const matrix: unknown[][] = [];
        worksheet.eachRow({ includeEmpty: true }, (row) => {
          const rawValues = row.values as any[];
          const values = rawValues.slice(1).map((value: unknown) => {
            if (value && typeof value === "object") {
              if ("text" in value) return value.text;
              if ("result" in value) return value.result;
              if (value instanceof Date) return value;
            }
            return value ?? "";
          });
          matrix.push(values);
        });
        const headers = (matrix[0] || []).map((value: unknown) => String(value ?? "").trim());
        const kind = inferImportSheet(name, headers);
        const rows = matrix.slice(1).filter((row) => row.some((value: unknown) => String(value ?? "").trim() !== "")).map((row) => {
          if (kind === "suppliers") return { code: importCell(row, headers, ["كود المورد*", "كود المورد", "supplier_code", "suppliercode"]), name: importCell(row, headers, ["اسم المورد*", "اسم المورد", "name"]), phone: importCell(row, headers, ["الهاتف", "phone"]), email: importCell(row, headers, ["البريد الإلكتروني", "email"]), address: importCell(row, headers, ["العنوان", "address"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          if (kind === "inventory") return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة (للمراجعة)", "اسم المادة", "name"]), warehouse: importCell(row, headers, ["اسم المستودع*", "اسم المستودع", "warehouse"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), openingQuantity: importCell(row, headers, ["الكمية الافتتاحية*", "الكمية الافتتاحية", "opening_quantity", "openingquantity"]), qualityStatus: importCell(row, headers, ["حالة الجودة*", "حالة الجودة", "quality_status", "qualitystatus"]), batchNumber: importCell(row, headers, ["رقم الدفعة", "batch_number", "batchnumber"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة*", "اسم المادة", "name"]), category: importCell(row, headers, ["التصنيف*", "التصنيف", "category"]), thickness: importCell(row, headers, ["السماكة (مم)", "السماكة", "thickness"]), unit: importCell(row, headers, ["الوحدة*", "الوحدة", "unit"]), pricePerUnit: importCell(row, headers, ["سعر الشراء (ل.س)*", "سعر الشراء", "price_per_unit", "priceperunit"]), minimumStock: importCell(row, headers, ["الحد الأدنى للمخزون", "minimum_stock", "minimumstock"]), supplierCode: importCell(row, headers, ["كود المورد", "supplier_code", "suppliercode"]), stock: importCell(row, headers, ["الكمية الافتتاحية", "stock"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), qualityStatus: importCell(row, headers, ["حالة الجودة", "quality_status", "qualitystatus"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
        });
        return { name, kind, headers, rows };
      });
      res.json({ success: true, fileName: req.file.originalname, sheets: sheets.filter((sheet) => sheet.kind !== "ignore") });
    } catch (error: unknown) {
      console.error("Excel preview failed:", error);
      res.status(400).json({ success: false, message: "تعذر قراءة ملف Excel: " + error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/import/customers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة للاستيراد" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      if (!it.name) {
        errors.push(`السطر ${idx + 1}: حقل الاسم مطلوب`);
        continue;
      }
      try {
        const inserted = await db.insert(customersTable).values({
          name: it.name, phone: it.phone || null, whatsapp: it.whatsapp || it.phone || null,
          email: it.email || null, company: it.company || "أفراد", address: it.address || null,
          notes: it.notes || null, category: it.category || "شركة",
        }).returning();
        const row = inserted[0];
        const newCust = {
          id: "c-" + row.id, name: row.name, phone: row.phone || "", whatsapp: row.whatsapp || row.phone || "",
          email: row.email || "", company: row.company || "", address: row.address || "",
          notes: row.notes || "", category: row.category || "شركة",
        };
        CUSTOMERS.push(newCust);
        imported.push(newCust);
      } catch (err: unknown) {
        console.error("Error importing customer row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد عملاء جماعي",
        `تم استيراد عدد ${imported.length} عملاء بنجاح من ملف بيانات خارجي.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/products", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      if (!it.name || !it.price) {
        errors.push(`السطر ${idx + 1}: الاسم والسعر مطلوبان`);
        continue;
      }
      try {
        const inserted = await db.insert(productsTable).values({
          name: it.name, code: it.code || `PRD-${Date.now().toString().slice(-4)}-${idx}`,
          category: it.category || "عام", price: Number(it.price) || 0,
          description: it.description || null, stock: Number(it.stock) || 0,
        }).returning();
        const row = inserted[0];
        const newProd = {
          id: "p-" + row.id, name: row.name, code: row.code, category: row.category, price: row.price,
          description: row.description || "", stock: row.stock,
        };
        PRODUCTS.push(newProd);
        imported.push(newProd);
      } catch (err: unknown) {
        console.error("Error importing product row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد منتجات جماعي",
        `تم استيراد عدد ${imported.length} منتجات وموديلات جديدة إلى مكتبة التصاميم.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/materials", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
      return;
    }

    const imported: unknown[] = [];
    const errors: string[] = [];

    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const name = String(it.name || "").trim();
      const code = String(it.code || "").trim();
      const pricePerUnit = Number(it.pricePerUnit);
      const existingCode = code && MATERIALS.find((material) => String(material.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code.toLowerCase());
      if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
        errors.push(`السطر ${idx + 1}: الاسم وسعر المفرد الصحيح مطلوبان`);
        continue;
      }
      if (MATERIALS.some((material) => String(material.name || "").trim().toLowerCase() === name.toLowerCase()) || existingCode) {
        errors.push(`السطر ${idx + 1}: المادة أو كودها موجود مسبقًا`);
        continue;
      }
      try {
        const supId = idNum(it.supplierId, "s-");
        const insertedMat = await db.insert(materialsTable).values({
          name,
          category: it.category || "عام",
          subCategory: it.subCategory || "general",
          thickness: Number(it.thickness) || 0,
          color: it.color || "natural",
          width: Number(it.width) || 1220,
          height: Number(it.height) || 2440,
          unit: it.unit || "sheet",
          pricePerUnit,
          minimumStock: Number(it.minimumStock) || 5,
          supplierId: supId,
          notes: [code ? `كود المادة: ${code}` : "", it.notes || ""].filter(Boolean).join(" | ") || null,
          status: "active",
          qualityStatus: it.qualityStatus || "inspected",
        }).returning();
        const matRow = insertedMat[0];

        const stock = Number(it.stock) || 0;
        await db.insert(inventoryTable).values({
          materialId: matRow.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location || "المستودع الرئيسي",
        });

        const newMat = {
          id: "m-" + matRow.id, name: matRow.name, category: matRow.category, subCategory: matRow.subCategory,
          thickness: matRow.thickness ?? 0, color: matRow.color || "", width: matRow.width ?? 0,
          height: matRow.height ?? 0, unit: matRow.unit, pricePerUnit: matRow.pricePerUnit,
          minimumStock: matRow.minimumStock, supplierId: matRow.supplierId ? "s-" + matRow.supplierId : "",
          notes: matRow.notes || "", status: matRow.status, qualityStatus: matRow.qualityStatus || "inspected",
        };
        MATERIALS.push(newMat);
        INVENTORY.push({
          id: "inv-pending", materialId: newMat.id, quantity: stock, reservedQuantity: 0,
          availableQuantity: stock, location: it.location || "المستودع الرئيسي",
        });
        imported.push(newMat);
      } catch (err: unknown) {
        console.error("Error importing material row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد خامات ومواد",
        `تم استيراد عدد ${imported.length} خامات ومواد جديدة لدفتر المخزون والمستودع.`,
        "inventory"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/suppliers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: unknown[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const code = String(it.code || "").trim();
      const name = String(it.name || "").trim();
      if (!name || !code) { errors.push(`السطر ${idx + 1}: كود المورد والاسم مطلوبان`); continue; }
      const duplicate = SUPPLIERS.some((supplier) => String(supplier.name || "").trim().toLowerCase() === name.toLowerCase() || String(supplier.notes || "").includes(`كود المورد: ${code}`));
      if (duplicate) { errors.push(`السطر ${idx + 1}: المورد أو كوده موجود مسبقًا`); continue; }
      try {
        const inserted = await db.insert(suppliersTable).values({ name, phone: it.phone || null, email: it.email || null, address: it.address || null, notes: [`كود المورد: ${code}`, it.notes || ""].filter(Boolean).join(" | ") }).returning();
        const row = inserted[0];
        const supplier = { id: "s-" + row.id, code, name: row.name, phone: row.phone || "", email: row.email || "", address: row.address || "", notes: it.notes || "" };
        SUPPLIERS.push(supplier);
        imported.push(supplier);
      } catch (error: unknown) { errors.push(`السطر ${idx + 1}: فشل الحفظ - ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (imported.length > 0) createNotification("استيراد موردين جماعي", `تم استيراد ${imported.length} موردين بنجاح.`, "system");
    res.json({ success: true, count: imported.length, imported, errors });
  });

  app.post("/api/import/inventory", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
    const imported: unknown[] = [];
    const errors: string[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it: any = items[idx];
      const code = String(it.code || "").trim().toLowerCase();
      const name = String(it.name || "").trim().toLowerCase();
      const material: any = MATERIALS.find((candidate) => (code && String(candidate.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code) || (name && String(candidate.name || "").trim().toLowerCase() === name));
      const quantity = Number(it.openingQuantity);
      if (!material) { errors.push(`السطر ${idx + 1}: المادة غير موجودة`); continue; }
      if (!Number.isInteger(quantity) || quantity < 0) { errors.push(`السطر ${idx + 1}: الكمية يجب أن تكون عددًا صحيحًا غير سالب`); continue; }
      const existing = INVENTORY.find((row: unknown[]) => row.materialId === material.id);
      if (existing) {
        const before = Number(existing.quantity) || 0;
        existing.quantity = quantity;
        existing.reservedQuantity = Math.min(existing.reservedQuantity || 0, quantity);
        existing.availableQuantity = quantity - existing.reservedQuantity;
        existing.location = it.location || it.warehouse || existing.location || "المستودع الرئيسي";
        await db.update(inventoryTable).set({ quantity, reservedQuantity: existing.reservedQuantity, availableQuantity: existing.availableQuantity, location: existing.location }).where(eq(inventoryTable.materialId, idNum(material.id, "m-")));
        await db.insert(inventoryTransactionsTable).values({ materialId: idNum(material.id, "m-"), type: "adjustment", quantity: quantity - before, beforeQty: before, afterQty: quantity, referenceType: "opening_import", referenceId: "excel", reason: "تثبيت الرصيد الافتتاحي المستورد", createdById: idNum(getRequestUser(req)?.id, "u-") });
      } else {
        const inserted = await db.insert(inventoryTable).values({ materialId: idNum(material.id, "m-"), quantity, reservedQuantity: 0, availableQuantity: quantity, location: it.location || it.warehouse || "المستودع الرئيسي" }).returning();
        INVENTORY.push({ id: "inv-" + inserted[0].id, materialId: material.id, quantity, reservedQuantity: 0, availableQuantity: quantity, location: inserted[0].location || "المستودع الرئيسي" });
      }
      imported.push({ materialId: material.id, quantity });
    }
    if (imported.length > 0) createNotification("استيراد رصيد افتتاحي", `تم تحديث ${imported.length} أرصدة مخزنية من Excel.`, "inventory");
    res.json({ success: true, count: imported.length, imported, errors });
  });
}

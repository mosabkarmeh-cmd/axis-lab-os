import { Router } from "express";

export function createAdvancedLocalRouter(deps: any) {
  const router = Router();
  const {
    ACTIVITY_LOGS,
    CUSTOMERS,
    DELETED_ITEMS,
    EXPENSES,
    ExcelJS,
    INVENTORY,
    INVOICES,
    MATERIALS,
    NOTIFICATIONS,
    ORDERS,
    ORDER_STATUSES,
    PRODUCTS,
    SUPPLIERS,
    USERS,
    authenticatedUserId,
    createNotification,
    customersTable,
    db,
    eq,
    getRequestUser,
    idNum,
    inventoryTable,
    inventoryTransactionsTable,
    materialsTable,
    multer,
    nextActivityLogId,
    productsTable,
    sanitizeActivityLogForEmployee,
    suppliersTable,
  } = deps;

  // Extracted from server.ts during the v0.14 architecture pass.
    // ==================== ADVANCED ADDITIONS APIs ====================

    // Activity log API (keep /api/logs for backwards compatibility).
    router.get("/activity-logs", (req, res) => {
      const user = getRequestUser(req);
      const logs = user?.role === "employee" ? ACTIVITY_LOGS.map(sanitizeActivityLogForEmployee) : ACTIVITY_LOGS;
      res.json(logs);
    });


    // Aggregate per-employee performance stats from order ratings (manager-only).
    router.get("/employees/stats", (req, res) => {
      const user = getRequestUser(req);
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "إحصائيات الموظفين متاحة للمدير فقط" });
        return;
      }
      const stats: Record<string, {
        userId: string; fullName: string; role: string;
        designOrders: number; designRated: number; designRatingSum: number;
        cuttingOrders: number; cuttingRated: number; cuttingRatingSum: number;
        assemblyOrders: number; assemblyRated: number; assemblyRatingSum: number;
      }> = {};
      const ensure = (userId: string) => {
        if (!stats[userId]) {
          const employee = USERS.find((entry: any) => entry.id === userId);
          stats[userId] = {
            userId, fullName: employee?.fullName || userId, role: employee?.role || "unknown",
            designOrders: 0, designRated: 0, designRatingSum: 0,
            cuttingOrders: 0, cuttingRated: 0, cuttingRatingSum: 0,
            assemblyOrders: 0, assemblyRated: 0, assemblyRatingSum: 0,
          };
        }
        return stats[userId];
      };
      for (const order of ORDERS) {
        if (order.designerId) {
          const item = ensure(order.designerId);
          item.designOrders += 1;
          if (order.designRating) { item.designRatingSum += order.designRating; item.designRated += 1; }
        }
        if (order.cutterId) {
          const item = ensure(order.cutterId);
          item.cuttingOrders += 1;
          if (order.cuttingRating) { item.cuttingRatingSum += order.cuttingRating; item.cuttingRated += 1; }
        }
        if (order.assemblerId) {
          const item = ensure(order.assemblerId);
          item.assemblyOrders += 1;
          if (order.assemblyRating) { item.assemblyRatingSum += order.assemblyRating; item.assemblyRated += 1; }
        }
      }
      const result = Object.values(stats).map((item) => ({
        userId: item.userId, fullName: item.fullName, role: item.role,
        design: { orders: item.designOrders, avgRating: item.designRated ? Number((item.designRatingSum / item.designRated).toFixed(2)) : null },
        cutting: { orders: item.cuttingOrders, avgRating: item.cuttingRated ? Number((item.cuttingRatingSum / item.cuttingRated).toFixed(2)) : null },
        assembly: { orders: item.assemblyOrders, avgRating: item.assemblyRated ? Number((item.assemblyRatingSum / item.assemblyRated).toFixed(2)) : null },
      }));
      res.json({ success: true, employees: result });
    });

    // 1. NOTIFICATIONS APIs
    router.get("/notifications", (req, res) => {
      res.json({ success: true, notifications: NOTIFICATIONS });
    });

    router.patch("/notifications/:id/read", (req, res) => {
      const notif = NOTIFICATIONS.find(n => n.id === req.params.id);
      if (notif) {
        notif.isRead = true;
      }
      res.json({ success: true, notification: notif });
    });

    router.patch("/notifications/read-all", (req, res) => {
      NOTIFICATIONS.forEach(n => n.isRead = true);
      res.json({ success: true });
    });

    router.delete("/notifications/:id", (req, res) => {
      const index = NOTIFICATIONS.findIndex(n => n.id === req.params.id);
      if (index !== -1) {
        NOTIFICATIONS.splice(index, 1);
      }
      res.json({ success: true });
    });

    router.post("/notifications", (req, res) => {
      const { title, message, type, priority, link } = req.body;
      if (!title || !message) {
        res.status(400).json({ success: false, message: "العنوان والرسالة مطلوبان" });
        return;
      }
      const notif = createNotification(title, message, type || "system", priority || "normal", link || "");
      res.json({ success: true, notification: notif });
    });

    // 2. RECYCLE BIN APIs
    router.get("/recycle-bin", (req, res) => {
      res.json({ success: true, items: DELETED_ITEMS });
    });

    router.post("/recycle-bin/restore/:id", async (req, res) => {
      const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: "العنصر غير موجود في سلة المحذوفات" });
        return;
      }

      const delItem = DELETED_ITEMS.splice(index, 1)[0];
      const data = delItem.originalData;

      // Restore to appropriate array
      if (delItem.entityType === "Customer") {
        CUSTOMERS.push(data);
      } else if (delItem.entityType === "Product") {
        PRODUCTS.push(data);
      } else if (delItem.entityType === "Material") {
        const existing = MATERIALS.find(m => m.id === data.id);
        const matId = idNum(data.id, "m-");
        try {
          if (matId) {
            await db.update(materialsTable).set({ status: "active" }).where(eq(materialsTable.id, matId));
          }
        } catch (err) {
          console.error("Error restoring material from recycle bin:", err);
        }
        if (existing) {
          existing.status = "active";
        } else {
          data.status = "active";
          MATERIALS.push(data);
        }
      } else if (delItem.entityType === "Expense") {
        EXPENSES.push(data);
      }

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "RESTORE_" + delItem.entityType.toUpperCase(),
        entityType: delItem.entityType,
        entityId: delItem.entityId,
        createdAt: new Date().toISOString()
      });

      createNotification(
        `تم استعادة ${delItem.entityType === "Customer" ? "عميل" : delItem.entityType === "Product" ? "منتج" : delItem.entityType === "Material" ? "خامة" : "مصروف"}`,
        `تم استعادة العنصر "${delItem.name}" بنجاح وإعادته إلى قائمة النظام الرئيسية.`,
        "system"
      );

      res.json({ success: true, message: "تم استعادة العنصر بنجاح", item: data });
    });

    router.delete("/recycle-bin/permanent/:id", (req, res) => {
      const index = DELETED_ITEMS.findIndex(item => item.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: "العنصر غير موجود" });
        return;
      }
      const removed = DELETED_ITEMS.splice(index, 1)[0];
      res.json({ success: true, message: "تم الحذف النهائي بنجاح", id: removed.id });
    });

    // 3. CUSTOM ORDER STATUS APIs
    router.get("/order-statuses", (req, res) => {
      res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
    });

    router.post("/order-statuses", (req, res) => {
      const { name, color } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: "الاسم مطلوب" });
        return;
      }
      const newStatus = {
        id: "status_" + Date.now(),
        name,
        color: color || "#3b82f6",
        order: ORDER_STATUSES.length + 1,
        isDefault: false
      };
      ORDER_STATUSES.push(newStatus);
      res.json({ success: true, status: newStatus });
    });

    router.put("/order-statuses/:id", (req, res) => {
      const status = ORDER_STATUSES.find(s => s.id === req.params.id);
      if (!status) {
        res.status(404).json({ success: false, message: "الحالة غير موجودة" });
        return;
      }
      const { name, color, order } = req.body;
      if (name !== undefined) status.name = name;
      if (color !== undefined) status.color = color;
      if (order !== undefined) status.order = Number(order) || status.order;
      res.json({ success: true, status });
    });

    router.delete("/order-statuses/:id", (req, res) => {
      const index = ORDER_STATUSES.findIndex(s => s.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: "الحالة غير موجودة" });
        return;
      }
      if (ORDER_STATUSES[index].isDefault) {
        res.status(400).json({ success: false, message: "لا يمكن حذف الحالات الأساسية للنظام" });
        return;
      }
      const removed = ORDER_STATUSES.splice(index, 1)[0];
      res.json({ success: true, id: removed.id });
    });

    router.post("/order-statuses/reorder", (req, res) => {
      const { order } = req.body; // array of status ids
      if (Array.isArray(order)) {
        order.forEach((id: string, idx: number) => {
          const s = ORDER_STATUSES.find(status => status.id === id);
          if (s) {
            s.order = idx + 1;
          }
        });
      }
      res.json({ success: true, statuses: ORDER_STATUSES.sort((a, b) => a.order - b.order) });
    });

    // 4. BULK IMPORT APIs
    const requireImportAdmin = (req: any, res: any) => {
      const user = getRequestUser(req);
      if (!user || user.role !== "admin") {
        res.status(403).json({ success: false, message: "استيراد البيانات متاح لمدير النظام فقط" });
        return false;
      }
      return true;
    };
    const normalizeImportHeader = (value: any) => String(value ?? "").trim().toLowerCase().replace(/[\\s_\\-\\/()]+/g, "");
    const importCell = (row: any[], headers: string[], aliases: string[]) => {
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
    router.post("/import/excel/preview", multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single("file"), async (req: any, res) => {
      if (!requireImportAdmin(req, res)) return;
      if (!req.file) { res.status(400).json({ success: false, message: "ملف Excel مطلوب" }); return; }
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const sheets = workbook.worksheets.map((worksheet) => {
          const name = worksheet.name;
          const matrix: any[][] = [];
          worksheet.eachRow({ includeEmpty: true }, (row) => {
            const rawValues = row.values as any[];
            const values = rawValues.slice(1).map((value: any) => {
              if (value && typeof value === "object") {
                if ("text" in value) return value.text;
                if ("result" in value) return value.result;
                if (value instanceof Date) return value;
              }
              return value ?? "";
            });
            matrix.push(values);
          });
          const headers = (matrix[0] || []).map((value: any) => String(value ?? "").trim());
          const kind = inferImportSheet(name, headers);
          const rows = matrix.slice(1).filter((row) => row.some((value: any) => String(value ?? "").trim() !== "")).map((row) => {
            if (kind === "suppliers") return { code: importCell(row, headers, ["كود المورد*", "كود المورد", "supplier_code", "suppliercode"]), name: importCell(row, headers, ["اسم المورد*", "اسم المورد", "name"]), phone: importCell(row, headers, ["الهاتف", "phone"]), email: importCell(row, headers, ["البريد الإلكتروني", "email"]), address: importCell(row, headers, ["العنوان", "address"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
            if (kind === "inventory") return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة (للمراجعة)", "اسم المادة", "name"]), warehouse: importCell(row, headers, ["اسم المستودع*", "اسم المستودع", "warehouse"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), openingQuantity: importCell(row, headers, ["الكمية الافتتاحية*", "الكمية الافتتاحية", "opening_quantity", "openingquantity"]), qualityStatus: importCell(row, headers, ["حالة الجودة*", "حالة الجودة", "quality_status", "qualitystatus"]), batchNumber: importCell(row, headers, ["رقم الدفعة", "batch_number", "batchnumber"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
            return { code: importCell(row, headers, ["كود المادة*", "كود المادة", "material_code", "materialcode"]), name: importCell(row, headers, ["اسم المادة*", "اسم المادة", "name"]), category: importCell(row, headers, ["التصنيف*", "التصنيف", "category"]), thickness: importCell(row, headers, ["السماكة (مم)", "السماكة", "thickness"]), unit: importCell(row, headers, ["الوحدة*", "الوحدة", "unit"]), pricePerUnit: importCell(row, headers, ["سعر الشراء (ل.س)*", "سعر الشراء", "price_per_unit", "priceperunit"]), minimumStock: importCell(row, headers, ["الحد الأدنى للمخزون", "minimum_stock", "minimumstock"]), supplierCode: importCell(row, headers, ["كود المورد", "supplier_code", "suppliercode"]), stock: importCell(row, headers, ["الكمية الافتتاحية", "stock"]), location: importCell(row, headers, ["الموقع/الرف", "الموقع", "location"]), qualityStatus: importCell(row, headers, ["حالة الجودة", "quality_status", "qualitystatus"]), notes: importCell(row, headers, ["ملاحظات", "notes"]) };
          });
          return { name, kind, headers, rows };
        });
        res.json({ success: true, fileName: req.file.originalname, sheets: sheets.filter((sheet) => sheet.kind !== "ignore") });
      } catch (error: unknown) {
        console.error("Excel preview failed:", error);
        res.status(400).json({ success: false, message: "تعذر قراءة ملف Excel: " + error.message });
      }
    });

    router.post("/import/customers", async (req, res) => {
      if (!requireImportAdmin(req, res)) return;
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة للاستيراد" });
        return;
      }

      const imported: any[] = [];
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
          errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
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

    router.post("/import/products", async (req, res) => {
      if (!requireImportAdmin(req, res)) return;
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
        return;
      }

      const imported: any[] = [];
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
          errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
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

    router.post("/import/materials", async (req, res) => {
      if (!requireImportAdmin(req, res)) return;
      const { items } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" });
        return;
      }

      const imported: any[] = [];
      const errors: string[] = [];

      for (let idx = 0; idx < items.length; idx++) {
        const it: any = items[idx];
        const name = String(it.name || "").trim();
        const code = String(it.code || "").trim();
        const pricePerUnit = Number(it.pricePerUnit);
        const existingCode = code && MATERIALS.find((material: any) => String(material.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code.toLowerCase());
        if (!name || !Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
          errors.push(`السطر ${idx + 1}: الاسم وسعر المفرد الصحيح مطلوبان`);
          continue;
        }
        if (MATERIALS.some((material: any) => String(material.name || "").trim().toLowerCase() === name.toLowerCase()) || existingCode) {
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
          errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err.message}`);
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

    router.post("/import/suppliers", async (req, res) => {
      if (!requireImportAdmin(req, res)) return;
      const { items } = req.body;
      if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
      const imported: any[] = [];
      const errors: string[] = [];
      for (let idx = 0; idx < items.length; idx++) {
        const it: any = items[idx];
        const code = String(it.code || "").trim();
        const name = String(it.name || "").trim();
        if (!name || !code) { errors.push(`السطر ${idx + 1}: كود المورد والاسم مطلوبان`); continue; }
        const duplicate = SUPPLIERS.some((supplier: any) => String(supplier.name || "").trim().toLowerCase() === name.toLowerCase() || String(supplier.notes || "").includes(`كود المورد: ${code}`));
        if (duplicate) { errors.push(`السطر ${idx + 1}: المورد أو كوده موجود مسبقًا`); continue; }
        try {
          const inserted = await db.insert(suppliersTable).values({ name, phone: it.phone || null, email: it.email || null, address: it.address || null, notes: [`كود المورد: ${code}`, it.notes || ""].filter(Boolean).join(" | ") }).returning();
          const row = inserted[0];
          const supplier = { id: "s-" + row.id, code, name: row.name, phone: row.phone || "", email: row.email || "", address: row.address || "", notes: it.notes || "" };
          SUPPLIERS.push(supplier);
          imported.push(supplier);
        } catch (error: unknown) { errors.push(`السطر ${idx + 1}: فشل الحفظ - ${error.message}`); }
      }
      if (imported.length > 0) createNotification("استيراد موردين جماعي", `تم استيراد ${imported.length} موردين بنجاح.`, "system");
      res.json({ success: true, count: imported.length, imported, errors });
    });

    router.post("/import/inventory", async (req, res) => {
      if (!requireImportAdmin(req, res)) return;
      const { items } = req.body;
      if (!Array.isArray(items)) { res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة" }); return; }
      const imported: any[] = [];
      const errors: string[] = [];
      for (let idx = 0; idx < items.length; idx++) {
        const it: any = items[idx];
        const code = String(it.code || "").trim().toLowerCase();
        const name = String(it.name || "").trim().toLowerCase();
        const material: any = MATERIALS.find((candidate: any) => (code && String(candidate.notes || "").match(/كود المادة:\s*([^|]+)/)?.[1]?.trim().toLowerCase() === code) || (name && String(candidate.name || "").trim().toLowerCase() === name));
        const quantity = Number(it.openingQuantity);
        if (!material) { errors.push(`السطر ${idx + 1}: المادة غير موجودة`); continue; }
        if (!Number.isInteger(quantity) || quantity < 0) { errors.push(`السطر ${idx + 1}: الكمية يجب أن تكون عددًا صحيحًا غير سالب`); continue; }
        const existing = INVENTORY.find((row: any) => row.materialId === material.id);
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

    // 5. GLOBAL SEARCH API
    router.get("/search", (req, res) => {
      const query = String(req.query.q || "").toLowerCase().trim();
      if (!query) {
        res.json({ success: true, results: { orders: [], customers: [], products: [], materials: [], invoices: [] } });
        return;
      }

      const filteredOrders = ORDERS.filter(o => 
        o.orderNumber.toLowerCase().includes(query) ||
        (o.notes && o.notes.toLowerCase().includes(query)) ||
        (CUSTOMERS.find(c => c.id === o.customerId)?.name || "").toLowerCase().includes(query)
      ).map(o => ({
        id: o.id,
        title: o.orderNumber,
        subtitle: CUSTOMERS.find(c => c.id === o.customerId)?.name || "عميل عام",
        details: o.notes || "لا توجد تفاصيل",
        type: "order",
        link: "dashboard" // Active Tab in frontend
      }));

      const filteredCustomers = CUSTOMERS.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
      ).map(c => ({
        id: c.id,
        title: c.name,
        subtitle: c.company || "أفراد",
        details: c.phone,
        type: "customer",
        link: "database"
      }));

      const filteredProducts = PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      ).map(p => ({
        id: p.id,
        title: p.name,
        subtitle: p.code,
        details: `${p.price} $ - ${p.category}`,
        type: "product",
        link: "database"
      }));

      const filteredMaterials = MATERIALS.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query)
      ).map(m => ({
        id: m.id,
        title: m.name,
        subtitle: m.category,
        details: `${m.pricePerUnit} $ - السماكة: ${m.thickness} مم`,
        type: "material",
        link: "database"
      }));

      const filteredInvoices = INVOICES.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(query) ||
        (inv.notes && inv.notes.toLowerCase().includes(query)) ||
        (CUSTOMERS.find(c => c.id === inv.customerId)?.name || "").toLowerCase().includes(query)
      ).map(inv => ({
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: CUSTOMERS.find(c => c.id === inv.customerId)?.name || "عميل عام",
        details: `القيمة: $${inv.totalPrice.toFixed(2)} - المتبقي: $${inv.remaining.toFixed(2)}`,
        type: "invoice",
        link: "accounting"
      }));

      res.json({
        success: true,
        results: {
          orders: filteredOrders,
          customers: filteredCustomers,
          products: filteredProducts,
          materials: filteredMaterials,
          invoices: filteredInvoices
        }
      });
    });

    // 6. QUOTATION PDF API

  return router;
}

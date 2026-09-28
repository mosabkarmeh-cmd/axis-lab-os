import { Router } from "express";

export function createAccountingLocalRouter(deps: any) {
  const router = Router();
  const {
    ACTIVITY_LOGS,
    CUSTOMERS,
    EXPENSES,
    INVOICES,
    NUMBERING_SETTINGS,
    ORDERS,
    SETTINGS,
    authenticatedUserId,
    getNextNumber,
    loadPersistedState,
    nextActivityLogId,
    nextEntityId,
    persistMutationWithFastDurability,
    withAtomicFinancialMutation,
    applyPayment,
  } = deps;

  // Extracted from server.ts during the v0.14 refactor.
    router.get("/invoices", (req, res) => {
      // In-memory INVOICES is always immediately consistent with the latest
      // mutation; SQLite writes are debounced (~400ms) so reading from the
      // SQLite tables here can return stale data right after a write.
      // Durability across restarts is already guaranteed separately by
      // loadPersistedState() repopulating memory from SQLite at boot.
      const sourceInvoices = INVOICES;
      const list = sourceInvoices.map(inv => {
        const cust = CUSTOMERS.find(c => c.id === inv.customerId);
        const ord = ORDERS.find(o => o.id === inv.orderId);
        return {
          ...inv,
          customerName: cust ? cust.name : "عميل غير معروف",
          orderNumber: ord ? ord.orderNumber : null
        };
      });
      res.json({ success: true, invoices: list });
    });

    // Create Custom Standalone Invoice
    router.post("/invoices", async (req, res) => {
      const { customerId, totalPrice, dueDate, notes, items, taxPercent, discount } = req.body;
      if (!customerId) {
        res.status(400).json({ success: false, message: "العميل مطلوب" });
        return;
      }

      if (!CUSTOMERS.some(c => c.id === customerId)) {
        res.status(404).json({ success: false, message: "العميل المحدد غير موجود" });
        return;
      }
      if (items !== undefined && (!Array.isArray(items) || items.length === 0 || items.length > 100)) {
        res.status(400).json({ success: false, message: "الفاتورة يجب أن تحتوي من 1 إلى 100 بند" });
        return;
      }
      const invoiceId = nextEntityId("inv");
      let invItems: any[];
      try {
        invItems = (items && items.length > 0) ? items.map((it: any, idx: number) => {
        const quantity = Number(it.quantity);
        const unitPrice = Number(it.unitPrice);
        const lineDiscount = Number(it.discount || 0);
        const lineTax = Number(it.tax || 0);
        if (!String(it.productName || "").trim() || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineDiscount) || lineDiscount < 0 || !Number.isFinite(lineTax) || lineTax < 0) {
          throw new Error("بيانات بند الفاتورة غير صالحة");
        }
        const lineBase = quantity * unitPrice;
        const safeLineDiscount = Math.min(lineBase, lineDiscount);
        return {
          id: `invitem-${Date.now()}-${idx}`, invoiceId: invoiceId,
          productName: String(it.productName).trim().slice(0, 500), quantity, unitPrice,
          discount: safeLineDiscount, tax: lineTax,
          total: Math.max(0, lineBase - safeLineDiscount + lineTax),
          createdAt: new Date().toISOString()
        };
      }) : [
        {
          id: `invitem-${Date.now()}-0`,
          invoiceId: invoiceId,
          productName: "فاتورة يدوية مخصصة",
          quantity: 1,
          unitPrice: Number(totalPrice) || 0,
          discount: Number(discount) || 0,
          tax: 0,
          total: Number(totalPrice) || 0,
          createdAt: new Date().toISOString()
        }
        ];
      } catch (error: unknown) {
        res.status(400).json({ success: false, message: error.message || "بيانات بنود الفاتورة غير صالحة" });
        return;
      }

      const computedSubtotal = invItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
      const lineTotalBeforeInvoiceAdjustments = invItems.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
      const taxRate = Number(taxPercent);
      const safeTaxRate = Number.isFinite(taxRate) ? Math.min(100, Math.max(0, taxRate)) : 0;
      const requestedDiscount = Number(discount);
      const safeDiscount = Number.isFinite(requestedDiscount) ? Math.min(lineTotalBeforeInvoiceAdjustments, Math.max(0, requestedDiscount)) : 0;
      const computedTotal = Math.max(0, lineTotalBeforeInvoiceAdjustments + (lineTotalBeforeInvoiceAdjustments * safeTaxRate / 100) - safeDiscount);
      const finalTotal = computedTotal;

      const newInv = {
        id: invoiceId,
        invoiceNumber: getNextNumber("invoice"),
        orderId: null,
        customerId,
        issueDate: new Date().toISOString(),
        dueDate: dueDate || new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // default 7 days
        totalPrice: finalTotal,
        subtotal: computedSubtotal,
        taxPercent: safeTaxRate,
        discount: safeDiscount,
        paidAmount: 0,
        remaining: finalTotal,
        status: "draft", // Starts as draft per request
        notes: notes || "",
        items: invItems,
        history: [
          {
            id: `invhist-${Date.now()}`,
            invoiceId: invoiceId,
            action: "created",
            userId: authenticatedUserId(req),
            createdAt: new Date().toISOString()
          }
        ]
      };

      INVOICES.unshift(newInv);

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "CREATE_INVOICE",
        entityType: "Invoice",
        entityId: newInv.id,
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, invoice: newInv });
    });

    // Record Payment on Invoice
    router.post("/invoices/:id/payments", async (req, res) => {
      const { amount, currency = "USD", notes, paymentMethod, paymentId } = req.body;
      const actorUserId = authenticatedUserId(req);
      const inv = INVOICES.find(i => i.id === req.params.id);
      if (!inv) {
        res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
        return;
      }
      let result;
      try {
        result = await withAtomicFinancialMutation(() => applyPayment({ order: null, inv, amount, currency, notes, paymentMethod, paymentId, actorUserId }));
      } catch (error) {
        console.error("[FINANCE] Atomic invoice payment failed:", error);
        res.status(500).json({ success: false, message: "تعذر حفظ الدفعة بشكل ذري؛ لم يتم تغيير البيانات." });
        return;
      }
      if (!result.ok) {
        res.status(result.status).json({ success: false, ...result.body });
        return;
      }
      res.json({ success: true, invoice: result.invoice });
    });
    // Get Single Invoice Details
    router.get("/invoices/:id", (req, res) => {
      const inv = INVOICES.find(i => i.id === req.params.id);
      if (!inv) {
        res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
        return;
      }
      const cust = CUSTOMERS.find(c => c.id === inv.customerId);
      const ord = ORDERS.find(o => o.id === inv.orderId);
      res.json({
        success: true,
        invoice: {
          ...inv,
          customerName: cust ? cust.name : "عميل غير معروف",
          orderNumber: ord ? ord.orderNumber : null
        }
      });
    });

    // Update Invoice Details (Saves modification history)
    router.put("/invoices/:id", async (req, res) => {
      const inv = INVOICES.find(i => i.id === req.params.id);
      if (!inv) {
        res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
        return;
      }

      const { notes, dueDate, items, taxPercent, discount } = req.body;
      const oldData = JSON.parse(JSON.stringify(inv));
      if (inv.currencyFinalizedAt && (items !== undefined || taxPercent !== undefined || discount !== undefined)) {
        res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل قيمتها بعد التسليم الكامل." });
        return;
      }

      // Validate the whole request first. Do not mutate the live invoice until every
      // requested field is known to be valid, preventing partial in-memory updates on 400 responses.
      if (taxPercent !== undefined) {
        const nextTax = Number(taxPercent);
        if (!Number.isFinite(nextTax) || nextTax < 0 || nextTax > 100) {
          res.status(400).json({ success: false, message: "نسبة الضريبة يجب أن تكون بين 0 و100" });
          return;
        }
      }
      if (discount !== undefined) {
        const nextDiscount = Number(discount);
        if (!Number.isFinite(nextDiscount) || nextDiscount < 0) {
          res.status(400).json({ success: false, message: "الخصم يجب أن يكون رقماً غير سالب" });
          return;
        }
      }

      let nextItems = inv.items ? JSON.parse(JSON.stringify(inv.items)) : [];
      if (items !== undefined) {
        if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
          res.status(400).json({ success: false, message: "الفاتورة يجب أن تحتوي من 1 إلى 100 بند" });
          return;
        }
        try {
          nextItems = items.map((it: any, idx: number) => {
            const quantity = Number(it.quantity);
            const unitPrice = Number(it.unitPrice);
            const lineDiscount = Number(it.discount || 0);
            const lineTax = Number(it.tax || 0);
            const productName = String(it.productName || "").trim();
            if (!productName || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineDiscount) || lineDiscount < 0 || !Number.isFinite(lineTax) || lineTax < 0) {
              throw new Error("بيانات بند الفاتورة غير صالحة");
            }
            const lineBase = quantity * unitPrice;
            const safeLineDiscount = Math.min(lineBase, lineDiscount);
            return {
              id: it.id || `invitem-${Date.now()}-${idx}`,
              invoiceId: inv.id,
              productName: productName.slice(0, 500),
              quantity,
              unitPrice,
              discount: safeLineDiscount,
              tax: lineTax,
              total: Math.max(0, lineBase - safeLineDiscount + lineTax),
              createdAt: it.createdAt || new Date().toISOString()
            };
          });
        } catch (error: unknown) {
          res.status(400).json({ success: false, message: error.message || "بيانات بند الفاتورة غير صالحة" });
          return;
        }
      }

      const nextTaxRate = taxPercent !== undefined ? Number(taxPercent) : Number(inv.taxPercent || 0);
      const nextInvoiceDiscount = discount !== undefined ? Number(discount) : Number(inv.discount || 0);
      const computedSubtotal = nextItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);
      const lineTotalBeforeInvoiceAdjustments = nextItems.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0);
      const safeInvoiceTaxRate = Math.min(100, Math.max(0, nextTaxRate));
      const safeInvoiceDiscount = Math.min(lineTotalBeforeInvoiceAdjustments, Math.max(0, nextInvoiceDiscount));
      const finalTotal = Math.max(0, lineTotalBeforeInvoiceAdjustments + (lineTotalBeforeInvoiceAdjustments * safeInvoiceTaxRate / 100) - safeInvoiceDiscount);
      if (!Number.isFinite(computedSubtotal) || !Number.isFinite(finalTotal)) {
        res.status(400).json({ success: false, message: "تعذر حساب إجمالي الفاتورة من البيانات المرسلة" });
        return;
      }
      if (finalTotal + 0.01 < Number(inv.paidAmount || 0)) {
        res.status(409).json({ success: false, message: "لا يمكن جعل قيمة الفاتورة أقل من المبالغ المدفوعة سابقاً" });
        return;
      }

      if (dueDate) inv.dueDate = dueDate;
      if (notes !== undefined) inv.notes = String(notes).slice(0, 4000);
      inv.items = nextItems;
      inv.subtotal = computedSubtotal;
      inv.taxPercent = safeInvoiceTaxRate;
      inv.discount = safeInvoiceDiscount;
      inv.totalPrice = finalTotal;
      inv.remaining = Math.max(0, finalTotal - Number(inv.paidAmount || 0));

      const historyEntry = {
        id: `invhist-${Date.now()}`,
        invoiceId: inv.id,
        action: "updated" as const,
        oldData,
        newData: JSON.parse(JSON.stringify(inv)),
        userId: authenticatedUserId(req),
        createdAt: new Date().toISOString()
      };
      if (!inv.history) inv.history = [];
      inv.history.push(historyEntry);

      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "UPDATE_INVOICE",
        entityType: "Invoice",
        entityId: inv.id,
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, invoice: inv });
    });

    // Update Invoice Status
    router.post("/invoices/:id/status", async (req, res) => {
      const inv = INVOICES.find(i => i.id === req.params.id);
      if (!inv) {
        res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
        return;
      }

      const { status } = req.body;
      const allowedStatuses = new Set(["draft", "sent", "unpaid", "partially_paid", "paid", "cancelled"]);
      if (!allowedStatuses.has(status)) {
        res.status(400).json({ success: false, message: "حالة الفاتورة غير صالحة" });
        return;
      }
      if (["cancelled", "credit_note"].includes(inv.status)) {
        res.status(409).json({ success: false, message: "الفاتورة ملغاة/مقفلة ولا يمكن إعادة فتحها من هذا المسار" });
        return;
      }
      if (status === "paid" && Number(inv.remaining || 0) > 0.01) {
        res.status(409).json({ success: false, message: "لا يمكن وضع الفاتورة كمدفوعة قبل تسوية كامل المتبقي" });
        return;
      }
      const oldData = { status: inv.status };
      inv.status = status;

      if (!inv.history) inv.history = [];
      inv.history.push({
        id: `invhist-${Date.now()}`,
        invoiceId: inv.id,
        action: (status === "cancelled" ? "cancelled" : status === "paid" ? "paid" : "updated") as any,
        oldData,
        newData: { status },
        userId: authenticatedUserId(req),
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, invoice: inv });
    });

    // Create Credit Note (Reverse/Refund Invoice)
    router.post("/invoices/:id/credit-note", async (req, res) => {
      const inv = INVOICES.find(i => i.id === req.params.id);
      if (!inv) {
        res.status(404).json({ success: false, message: "الفاتورة الأصلية غير موجودة" });
        return;
      }
      if (["cancelled", "credit_note"].includes(inv.status) || INVOICES.some(candidate => candidate.originalInvoiceId === inv.id)) {
        res.status(409).json({ success: false, message: "تم إصدار إشعار دائن/إلغاء لهذه الفاتورة مسبقاً" });
        return;
      }

      const creditNoteId = nextEntityId("inv");
      const creditItems = inv.items ? inv.items.map((it: any, idx: number) => ({
        id: `invitem-${Date.now()}-${idx}`,
        invoiceId: creditNoteId,
        productName: `مرتجع: ${it.productName}`,
        quantity: -it.quantity,
        unitPrice: it.unitPrice,
        discount: -it.discount,
        tax: -it.tax,
        total: -it.total,
        createdAt: new Date().toISOString()
      })) : [
        {
          id: `invitem-${Date.now()}-0`,
          invoiceId: creditNoteId,
          productName: `إشعار دائن للفاتورة ${inv.invoiceNumber}`,
          quantity: -1,
          unitPrice: inv.totalPrice,
          discount: 0,
          tax: 0,
          total: -inv.totalPrice,
          createdAt: new Date().toISOString()
        }
      ];

      const creditInvoice = {
        id: creditNoteId,
        invoiceNumber: getNextNumber("invoice") + "-CN",
        originalInvoiceId: inv.id,
        orderId: inv.orderId,
        customerId: inv.customerId,
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        totalPrice: -inv.totalPrice,
        subtotal: inv.subtotal ? -inv.subtotal : -inv.totalPrice,
        taxPercent: inv.taxPercent || 0,
        discount: inv.discount ? -inv.discount : 0,
        paidAmount: -inv.paidAmount,
        remaining: 0,
        status: "credit_note" as const,
        notes: `إشعار دائن للفاتورة رقم: ${inv.invoiceNumber}`,
        items: creditItems,
        history: [
          {
            id: `invhist-${Date.now()}`,
            invoiceId: creditNoteId,
            action: "credit_note" as const,
            userId: authenticatedUserId(req),
            createdAt: new Date().toISOString()
          }
        ]
      };

      INVOICES.unshift(creditInvoice);
      inv.status = "cancelled"; // Auto cancel the original invoice or flag it

      if (!inv.history) inv.history = [];
      inv.history.push({
        id: `invhist-${Date.now()}`,
        invoiceId: inv.id,
        action: "cancelled",
        userId: authenticatedUserId(req),
        createdAt: new Date().toISOString(),
        notes: `تم إلغاء الفاتورة وإصدار إشعار دائن رقم ${creditInvoice.invoiceNumber}`
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, creditInvoice, originalInvoice: inv });
    });

    // Get Numbering Settings
    router.get("/numbering", (req, res) => {
      res.json({ success: true, settings: NUMBERING_SETTINGS });
    });

    // Update Numbering Settings
    router.put("/numbering/:id", (req, res) => {
      const setting = NUMBERING_SETTINGS.find(s => s.id === req.params.id);
      if (!setting) {
        res.status(404).json({ success: false, message: "الإعدادات غير موجودة" });
        return;
      }
      const { prefix, suffix, digits, separator, nextNumber } = req.body;
      if (prefix !== undefined) setting.prefix = prefix;
      if (suffix !== undefined) setting.suffix = suffix;
      if (digits !== undefined) setting.digits = Number(digits) || 6;
      if (separator !== undefined) setting.separator = separator;
      if (nextNumber !== undefined) setting.nextNumber = Number(nextNumber) || 1;

      res.json({ success: true, setting });
    });

    // Get Expenses
    router.get("/expenses", (req, res) => {
      res.json({ success: true, expenses: EXPENSES });
    });

    // Create Expense
    router.post("/expenses", async (req, res) => {
          const { category, amount, amountSYP, date, description, status, exchangeRateAtCreation } = req.body;
      const amountUSD = Number(amount);
      const requestedSYP = amountSYP === undefined ? undefined : Number(amountSYP);
      const expenseRate = Number(exchangeRateAtCreation ?? SETTINGS.exchangeRate);
      if (!String(category || "").trim() || !Number.isFinite(amountUSD) || amountUSD <= 0 || !String(date || "").trim() || Number.isNaN(Date.parse(String(date)))) {
        res.status(400).json({ success: false, message: "الفئة والقيمة الموجبة والتاريخ الصحيح مطلوبة" });
        return;
      }
      if (requestedSYP !== undefined && (!Number.isFinite(requestedSYP) || requestedSYP <= 0)) {
        res.status(400).json({ success: false, message: "قيمة SYP يجب أن تكون موجبة وصالحة" });
        return;
      }
      const safeExpenseRate = Number.isFinite(expenseRate) && expenseRate > 0 ? expenseRate : 135;
      const newExp = {
        id: nextEntityId("exp"),
        category: String(category).trim().slice(0, 120),
        amount: amountUSD,
        amountUSD,
        amountSYP: requestedSYP === undefined ? Math.round(amountUSD * safeExpenseRate) : Math.round(requestedSYP),
        exchangeRateAtCreation: safeExpenseRate,
        currency: "USD",
        date,
        description: description || "",
        status: ["draft", "paid", "cancelled"].includes(String(status)) ? String(status) : "paid",
        createdById: authenticatedUserId(req)
      };

      EXPENSES.unshift(newExp);

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "CREATE_EXPENSE",
        entityType: "Expense",
        entityId: newExp.id,
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, expense: newExp });
    });

    // Update Expense
    router.put("/expenses/:id", async (req, res) => {
      const { category, amount, amountSYP, date, description, status, exchangeRateAtCreation } = req.body;
      const exp = EXPENSES.find(e => e.id === req.params.id);
      if (!exp) {
        res.status(404).json({ success: false, message: "المصروف غير موجود" });
        return;
      }

      if (category !== undefined && !String(category || "").trim()) {
        res.status(400).json({ success: false, message: "فئة المصروف مطلوبة" });
        return;
      }
      if (amount !== undefined) {
        const nextAmountUSD = Number(amount);
        const nextAmountSYP = amountSYP === undefined ? undefined : Number(amountSYP);
        const requestedRate = Number(exchangeRateAtCreation ?? SETTINGS.exchangeRate);
        const safeRate = Number.isFinite(requestedRate) && requestedRate > 0 ? requestedRate : 135;
        if (!Number.isFinite(nextAmountUSD) || nextAmountUSD <= 0 || (nextAmountSYP !== undefined && (!Number.isFinite(nextAmountSYP) || nextAmountSYP <= 0))) {
          res.status(400).json({ success: false, message: "قيمة المصروف وقيمة SYP يجب أن تكونا موجبتين وصالحتين" });
          return;
        }
        exp.amount = nextAmountUSD;
        exp.amountUSD = nextAmountUSD;
        exp.amountSYP = nextAmountSYP === undefined ? Math.round(nextAmountUSD * safeRate) : Math.round(nextAmountSYP);
        exp.exchangeRateAtCreation = safeRate;
        exp.currency = "USD";
      }
      if (date !== undefined) {
        if (!String(date || "").trim() || Number.isNaN(Date.parse(String(date)))) {
          res.status(400).json({ success: false, message: "تاريخ المصروف غير صالح" });
          return;
        }
        exp.date = date;
      }
      if (description !== undefined) exp.description = description;
      if (status !== undefined) {
        if (!["paid", "pending"].includes(status)) {
          res.status(400).json({ success: false, message: "حالة المصروف غير صالحة" });
          return;
        }
        exp.status = status;
      }

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "UPDATE_EXPENSE",
        entityType: "Expense",
        entityId: exp.id,
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, expense: exp });
    });

    // Delete Expense
    router.delete("/expenses/:id", async (req, res) => {
      const idx = EXPENSES.findIndex(e => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ success: false, message: "المصروف غير موجود" });
        return;
      }

      const deleted = EXPENSES.splice(idx, 1)[0];

      // Log Activity
      ACTIVITY_LOGS.unshift({
        id: nextActivityLogId(),
        userId: authenticatedUserId(req),
        action: "DELETE_EXPENSE",
        entityType: "Expense",
        entityId: deleted.id,
        createdAt: new Date().toISOString()
      });

      await persistMutationWithFastDurability();
      res.json({ success: true, expense: deleted });
    });

    // Get Finance Stats
    router.get("/stats", (req, res) => {
      // In-memory is authoritative for freshness (SQLite writes are debounced
      // ~400ms); restart durability comes from loadPersistedState() at boot.
      const sourceInvoices = INVOICES;
      const sourceExpenses = EXPENSES;
      const reportRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
      const invoiceSYP = (inv: any, usdField: string, sypField: string) => {
        const fixedSYP = Number(inv[sypField]);
        if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
        const linkedOrder = ORDERS.find((order: any) => order.id === inv.orderId);
        const historicalRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || linkedOrder?.exchangeRateAtCreation);
        const rate = historicalRate > 0 ? historicalRate : 135;
        return Math.round((Number(inv[usdField]) || 0) * rate);
      };
      const totalRevenue = sourceInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalReceivables = sourceInvoices.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
      const totalRevenueSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "paidAmount", "paidAmountSYP"), 0);
      const totalReceivablesSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "remaining", "remainingSYP"), 0);
      const expenseSYP = (exp: any) => {
        const fixedSYP = Number(exp.amountSYP);
        if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
        const historicalRate = Number(exp.exchangeRateAtCreation);
        return Math.round((Number(exp.amountUSD ?? exp.amount) || 0) * (historicalRate > 0 ? historicalRate : 135));
      };
      const totalExpenses = sourceExpenses.reduce((sum, exp) => sum + (exp.amountUSD ?? exp.amount ?? 0), 0);
      const totalExpensesSYP = sourceExpenses.reduce((sum, exp) => sum + expenseSYP(exp), 0);
      const netProfit = totalRevenue - totalExpenses;
      const netProfitSYP = totalRevenueSYP - totalExpensesSYP;

      // Group expenses by category
      const expenseCategories: Record<string, number> = {};
      sourceExpenses.forEach(e => {
        expenseCategories[e.category] = (expenseCategories[e.category] || 0) + (e.amountUSD ?? e.amount);
      });

      const categoryBreakdown = Object.entries(expenseCategories).map(([name, value]) => ({
        name,
        value
      }));

      // Group revenue and expenses by calendar month without merging the same month across years.
      const monthlyData: Record<string, { revenue: number; revenueSYP: number; expenses: number; expensesSYP: number }> = {};
      const monthKeyFor = (value: unknown) => {
        const date = new Date(String(value || ""));
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };
      const monthLabelFor = (monthKey: string) => {
        const [year, month] = monthKey.split("-").map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString("ar-EG", { month: "short", year: "numeric" });
      };

      sourceInvoices.forEach(inv => {
        const monthKey = monthKeyFor(inv.issueDate);
        if (!monthKey) return;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, revenueSYP: 0, expenses: 0, expensesSYP: 0 };
        monthlyData[monthKey].revenue += (inv.paidAmount || 0);
        monthlyData[monthKey].revenueSYP += invoiceSYP(inv, "paidAmount", "paidAmountSYP");
      });

      sourceExpenses.forEach(exp => {
        const monthKey = monthKeyFor(exp.date);
        if (!monthKey) return;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { revenue: 0, revenueSYP: 0, expenses: 0, expensesSYP: 0 };
        monthlyData[monthKey].expenses += (exp.amountUSD ?? exp.amount);
        monthlyData[monthKey].expensesSYP += expenseSYP(exp);
      });

      const monthlyTrends = Object.keys(monthlyData)
        .sort()
        .slice(-6)
        .map(monthKey => {
          const data = monthlyData[monthKey];
          return {
            month: monthLabelFor(monthKey),
            monthKey,
            revenue: data.revenue,
            revenueSYP: data.revenueSYP,
            expenses: data.expenses,
            expensesSYP: data.expensesSYP,
            profit: data.revenue - data.expenses,
            profitSYP: data.revenueSYP - data.expensesSYP
          };
        });

      res.json({
        success: true,
        stats: {
          totalRevenue,
          totalReceivables,
          totalRevenueSYP,
          totalReceivablesSYP,
          totalExpenses,
          totalExpensesSYP,
          netProfit,
          netProfitSYP,
          categoryBreakdown,
          monthlyTrends
        }
      });
    });

  return router;
}

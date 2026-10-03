import express from "express";
import * as core from "../server-core.ts";

type InvoiceItem = { quantity?: number; unitPrice?: number; total?: number; description?: string; [key: string]: unknown };
type InvoiceLike = { id: string; orderId?: string; items?: InvoiceItem[]; totalPrice?: number; subtotal?: number; [key: string]: unknown };
const asInvoiceItem = (value: unknown): InvoiceItem => value && typeof value === "object" ? value as InvoiceItem : {};

const {
  INVOICES,
  ORDERS,
  CUSTOMERS,
  EXPENSES,
  NUMBERING_SETTINGS,
  ACTIVITY_LOGS,
  SETTINGS,
  nextEntityId,
  nextActivityLogId,
  getNextNumber,
  persistMutationWithFastDurability,
} = core;

function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function registerAccountingRoutes(app: express.Express) {

  // ==================== ACCOUNTING & FINANCE API ====================

  // Get Invoices
  app.get("/api/accounting/invoices", (req, res) => {
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
  app.post("/api/accounting/invoices", async (req, res) => {
    const { customerId, totalPrice, dueDate, notes, items, taxPercent, discount } = req.body;
    if (!customerId) {
      res.status(400).json({ success: false, message: "العميل مطلوب" });
      return;
    }

    const invoiceId = nextEntityId("inv");
    const invItems = (items && items.length > 0) ? items.map((raw, idx: number) => { const it = asInvoiceItem(raw); return ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: invoiceId,
      productName: it.productName || "بند مخصص",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      tax: Number(it.tax) || 0,
      total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0) + (Number(it.tax) || 0),
      createdAt: new Date().toISOString()
    }); }) : [
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

    const computedSubtotal = invItems.reduce((sum: number, it: InvoiceItem) => sum + (it.quantity * it.unitPrice), 0);
    const computedTotal = invItems.reduce((sum: number, it: InvoiceItem) => sum + it.total, 0);
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : computedTotal;

    const newInv = {
      id: invoiceId,
      invoiceNumber: getNextNumber("invoice"),
      orderId: null,
      customerId,
      issueDate: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // default 7 days
      totalPrice: finalTotal,
      subtotal: computedSubtotal,
      taxPercent: Number(taxPercent) || 0,
      discount: Number(discount) || 0,
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
          userId: getActorId(req),
          createdAt: new Date().toISOString()
        }
      ]
    };

    INVOICES.unshift(newInv);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_INVOICE",
      entityType: "Invoice",
      entityId: newInv.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: newInv });
  });

  // Record Payment on Invoice
  app.post("/api/accounting/invoices/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, changedById, paymentId } = req.body;
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    let result;
    try {
      result = await withAtomicFinancialMutation(() => applyPayment({ order: null, inv, amount, currency, notes, paymentMethod, changedById, paymentId }));
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
  app.get("/api/accounting/invoices/:id", (req, res) => {
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
  app.put("/api/accounting/invoices/:id", async (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { notes, dueDate, items, taxPercent, discount, totalPrice } = req.body;
    const oldData = JSON.parse(JSON.stringify(inv));
    if (inv.currencyFinalizedAt && (items !== undefined || taxPercent !== undefined || discount !== undefined || totalPrice !== undefined)) {
      res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل قيمتها بعد التسليم الكامل." });
      return;
    }

    if (dueDate) inv.dueDate = dueDate;
    if (notes !== undefined) inv.notes = notes;
    if (taxPercent !== undefined) inv.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) inv.discount = Number(discount) || 0;

    if (items && Array.isArray(items)) {
      inv.items = items.map((raw, idx: number) => { const it = asInvoiceItem(raw); return ({
        id: it.id || `invitem-${Date.now()}-${idx}`,
        invoiceId: inv.id,
        productName: it.productName || "بند مخصص",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        tax: Number(it.tax) || 0,
        total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0) + (Number(it.tax) || 0),
        createdAt: it.createdAt || new Date().toISOString()
      }));
      }
    }

    const computedSubtotal = inv.items ? inv.items.reduce((sum: number, it) => sum + (it.quantity * it.unitPrice), 0) : inv.totalPrice;
    inv.subtotal = computedSubtotal;

    const computedTotal = inv.items ? inv.items.reduce((sum: number, it) => sum + it.total, 0) : inv.totalPrice;
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : computedTotal;
    inv.totalPrice = finalTotal;
    inv.remaining = Math.max(0, finalTotal - inv.paidAmount);

    // Record history
    const historyEntry = {
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: "updated" as const,
      oldData,
      newData: JSON.parse(JSON.stringify(inv)),
      userId: getActorId(req),
      createdAt: new Date().toISOString()
    };
    if (!inv.history) inv.history = [];
    inv.history.push(historyEntry);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_INVOICE",
      entityType: "Invoice",
      entityId: inv.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: inv });
  });

  // Update Invoice Status
  app.post("/api/accounting/invoices/:id/status", async (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { status } = req.body;
    const oldData = { status: inv.status };
    inv.status = status;

    if (!inv.history) inv.history = [];
    inv.history.push({
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: (status === "cancelled" ? "cancelled" : status === "paid" ? "paid" : "updated") ,
      oldData,
      newData: { status },
      userId: getActorId(req),
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: inv });
  });

  // Create Credit Note (Reverse/Refund Invoice)
  app.post("/api/accounting/invoices/:id/credit-note", async (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة الأصلية غير موجودة" });
      return;
    }

    const creditNoteId = nextEntityId("inv");
    const creditItems = inv.items ? inv.items.map((raw, idx: number) => { const it = asInvoiceItem(raw); return ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: creditNoteId,
      productName: `مرتجع: ${it.productName}`,
      quantity: -it.quantity,
      unitPrice: it.unitPrice,
      discount: -it.discount,
      tax: -it.tax,
      total: -it.total,
      createdAt: new Date().toISOString()
    }));
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
          userId: getActorId(req),
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
      userId: getActorId(req),
      createdAt: new Date().toISOString(),
      notes: `تم إلغاء الفاتورة وإصدار إشعار دائن رقم ${creditInvoice.invoiceNumber}`
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, creditInvoice, originalInvoice: inv });
  });

  // Get Numbering Settings
  app.get("/api/accounting/numbering", (req, res) => {
    res.json({ success: true, settings: NUMBERING_SETTINGS });
  });

  // Update Numbering Settings
  app.put("/api/accounting/numbering/:id", (req, res) => {
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
  app.get("/api/accounting/expenses", (req, res) => {
    res.json({ success: true, expenses: EXPENSES });
  });

  // Create Expense
  app.post("/api/accounting/expenses", async (req, res) => {
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
      category,
      amount: amountUSD,
      amountUSD,
      amountSYP: requestedSYP === undefined ? Math.round(amountUSD * safeExpenseRate) : Math.round(requestedSYP),
      exchangeRateAtCreation: safeExpenseRate,
      currency: "USD",
      date,
      description: description || "",
      status: status || "paid",
      createdById: getActorId(req)
    };

    EXPENSES.unshift(newExp);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_EXPENSE",
      entityType: "Expense",
      entityId: newExp.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, expense: newExp });
  });

  // Update Expense
  app.put("/api/accounting/expenses/:id", async (req, res) => {
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
      userId: getActorId(req),
      action: "UPDATE_EXPENSE",
      entityType: "Expense",
      entityId: exp.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, expense: exp });
  });

  // Delete Expense
  app.delete("/api/accounting/expenses/:id", async (req, res) => {
    const idx = EXPENSES.findIndex(e => e.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: "المصروف غير موجود" });
      return;
    }

    const deleted = EXPENSES.splice(idx, 1)[0];

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "DELETE_EXPENSE",
      entityType: "Expense",
      entityId: deleted.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, expense: deleted });
  });

  // Get Finance Stats
  app.get("/api/accounting/stats", (req, res) => {
    // In-memory is authoritative for freshness (SQLite writes are debounced
    // ~400ms); restart durability comes from loadPersistedState() at boot.
    const sourceInvoices = INVOICES;
    const sourceExpenses = EXPENSES;
    const reportRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
    const invoiceSYP = (inv: InvoiceLike, usdField: string, sypField: string) => {
      const fixedSYP = Number(inv[sypField]);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const linkedOrder = ORDERS.find((order) => order.id === inv.orderId);
      const historicalRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || linkedOrder?.exchangeRateAtCreation);
      const rate = historicalRate > 0 ? historicalRate : 135;
      return Math.round((Number(inv[usdField]) || 0) * rate);
    };
    const totalRevenue = sourceInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalReceivables = sourceInvoices.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
    const totalRevenueSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "paidAmount", "paidAmountSYP"), 0);
    const totalReceivablesSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "remaining", "remainingSYP"), 0);
    const expenseSYP = (exp) => {
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

}

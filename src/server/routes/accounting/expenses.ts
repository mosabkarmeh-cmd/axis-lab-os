import express from "express";
import * as core from "../../server-core.ts";

const {
  EXPENSES,
  ACTIVITY_LOGS,
  SETTINGS,
  nextActivityLogId,
  getRequestUser,
  persistMutationWithFastDurability,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerAccountingExpenseRoutes(app: express.Express) {
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
}

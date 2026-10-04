import express from "express";
import * as core from "../../server-core.ts";

const {
  INVOICES,
  ORDERS,
  EXPENSES,
  SETTINGS,
} = core;

export function registerAccountingStatsRoutes(app: express.Express) {
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
    const totalExpenses = sourceExpenses.reduce((sum, exp) => sum + Number(exp.amountUSD ?? exp.amount ?? 0), 0);
    const totalExpensesSYP = sourceExpenses.reduce((sum, exp) => sum + expenseSYP(exp), 0);
    const netProfit = totalRevenue - totalExpenses;
    const netProfitSYP = totalRevenueSYP - totalExpensesSYP;

    // Group expenses by category
    const expenseCategories: Record<string, number> = {};
    sourceExpenses.forEach(e => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + Number(e.amountUSD ?? e.amount ?? 0);
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
      monthlyData[monthKey].expenses += Number(exp.amountUSD ?? exp.amount ?? 0);
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
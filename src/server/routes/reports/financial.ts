import type {
  CustomerReportRecord,
  ExpenseReportRecord,
  InvoiceReportRecord,
  OrderReportRecord,
} from "./types.ts";

export function invoiceToSyp(
  invoice: InvoiceReportRecord,
  orders: OrderReportRecord[],
): number {
  const fixedSYP = Number(invoice.totalPriceSYP ?? invoice.paidAmountSYP ?? invoice.remainingSYP);
  if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);

  const linkedOrder = invoice.orderId
    ? orders.find(order => order.id === invoice.orderId)
    : undefined;
  const historicalRate = Number(
    invoice.exchangeRateAtFinalization
      ?? invoice.exchangeRateAtIssue
      ?? linkedOrder?.exchangeRateAtCreation,
  );
  const rate = historicalRate > 0 ? historicalRate : 135;
  return Math.round((Number(invoice.totalPriceUSD ?? invoice.totalPrice) || 0) * rate);
}

export function expenseToSyp(expense: ExpenseReportRecord): number {
  const fixedSYP = Number(expense.amountSYP);
  if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);

  const historicalRate = Number(expense.exchangeRateAtCreation);
  return Math.round(
    (Number(expense.amountUSD ?? expense.amount) || 0) * (historicalRate > 0 ? historicalRate : 135),
  );
}

export function buildFinancialAnalytics(
  invoices: InvoiceReportRecord[],
  expenses: ExpenseReportRecord[],
  orders: OrderReportRecord[],
  customers: CustomerReportRecord[],
  currentRate: number,
  getPartnerSharePercentAt: () => number,
) {
  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const totalReceivables = invoices.reduce((sum, invoice) => sum + Number(invoice.remaining || 0), 0);
  const totalRevenueSYP = invoices.reduce((sum, invoice) => sum + invoiceToSyp(invoice, orders), 0);
  const totalReceivablesSYP = invoices.reduce((sum, invoice) => {
    const linkedOrder = invoice.orderId ? orders.find(order => order.id === invoice.orderId) : undefined;
    const historicalRate = Number(
      invoice.exchangeRateAtFinalization
        ?? invoice.exchangeRateAtIssue
        ?? linkedOrder?.exchangeRateAtCreation,
    );
    const rate = historicalRate > 0 ? historicalRate : 135;
    const fixedSYP = Number(invoice.remainingSYP);
    return sum + (Number.isFinite(fixedSYP) ? Math.round(fixedSYP) : Math.round((Number(invoice.remaining) || 0) * rate));
  }, 0);

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amountUSD ?? expense.amount ?? 0), 0);
  const totalExpensesSYP = expenses.reduce((sum, expense) => sum + expenseToSyp(expense), 0);
  const netProfit = totalRevenue - totalExpenses;
  const netProfitSYP = totalRevenueSYP - totalExpensesSYP;
  const profitMargin = totalRevenueSYP > 0 ? (netProfitSYP / totalRevenueSYP) * 100 : 0;

  const expenseCategories: Record<string, number> = {};
  for (const expense of expenses) {
    expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + Number(expense.amountUSD ?? expense.amount ?? 0);
  }

  const expenseBreakdown = Object.entries(expenseCategories).map(([name, value]) => ({
    name,
    value,
    valueUSD: value,
    valueSYP: expenses
      .filter(expense => expense.category === name)
      .reduce((sum, expense) => sum + expenseToSyp(expense), 0),
  }));

  const recentInvoices = invoices.map(invoice => {
    const linkedOrder = invoice.orderId ? orders.find(order => order.id === invoice.orderId) : undefined;
    const recordRate = Number(
      invoice.exchangeRateAtFinalization
        ?? invoice.exchangeRateAtIssue
        ?? linkedOrder?.exchangeRateAtCreation,
    );
    const rate = recordRate > 0 ? recordRate : 135;
    const amountSYP = Number(invoice.totalPriceSYP);
    return {
      id: invoice.id,
      type: "invoice",
      reference: invoice.invoiceNumber,
      amount: invoice.totalPrice,
      amountUSD: Number(invoice.totalPriceUSD ?? invoice.totalPrice ?? 0),
      amountSYP: Number.isFinite(amountSYP)
        ? Math.round(amountSYP)
        : Math.round((Number(invoice.totalPriceUSD ?? invoice.totalPrice) || 0) * rate),
      date: invoice.issueDate,
      description: `فاتورة مبيعات للعميل: ${customers.find(customer => customer.id === invoice.customerId)?.name || "عميل غير معروف"}`,
      status: invoice.status === "paid" ? "تم التحصيل" : (invoice.status === "partially_paid" ? "محصل جزئياً" : "غير محصل"),
    };
  });

  const recentExpenses = expenses.map(expense => ({
    id: expense.id,
    type: "expense",
    reference: `EXP-${expense.id}`,
    amount: expense.amount,
    date: expense.date,
    description: `مصروفات [${expense.category}]: ${expense.description || "بدون بيان تفصيلي"}`,
    status: expense.status === "paid" ? "تم الصرف" : "معلق",
  }));

  const recentTransactions = [...recentInvoices, ...recentExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const partnerSharePercent = getPartnerSharePercentAt();

  return {
    totalRevenue,
    totalReceivables,
    totalRevenueSYP,
    totalReceivablesSYP,
    totalExpenses,
    totalExpensesSYP,
    netProfit,
    netProfitSYP,
    profitMargin,
    partnerSharePercent,
    partnerProfit: netProfit * (partnerSharePercent / 100),
    partnerProfitSYP: netProfitSYP * (partnerSharePercent / 100),
    workshopProfit: netProfit * (1 - partnerSharePercent / 100),
    workshopProfitSYP: netProfitSYP * (1 - partnerSharePercent / 100),
    expenseBreakdown,
    recentTransactions,
    currentRate,
  };
}

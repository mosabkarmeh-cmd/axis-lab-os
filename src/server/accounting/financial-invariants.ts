export interface FinancialInvariantInvoice {
  id: string | number;
  totalPrice?: number;
  paidAmount?: number;
  remaining?: number;
  status?: string;
  items?: Array<{
    id?: string | number;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    tax?: number;
    total?: number;
  }>;
}

export interface FinancialInvariantExpense {
  id: string | number;
  amount?: number;
}

export function assertFinancialStateInvariants(
  invoices: FinancialInvariantInvoice[],
  expenses: FinancialInvariantExpense[],
): void {
  for (const invoice of invoices) {
    const total = Number(invoice.totalPrice) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    const remaining = Number(invoice.remaining) || 0;
    if (invoice.status !== "credit_note" && Math.abs(remaining - Math.max(0, total - paid)) > 0.02) {
      throw new Error(`Financial invariant failed for invoice ${invoice.id}: remaining mismatch`);
    }
    for (const item of invoice.items || []) {
      const expected = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0) + (Number(item.tax) || 0);
      if (Math.abs((Number(item.total) || 0) - expected) > 0.02) {
        throw new Error(`Financial invariant failed for invoice item ${item.id || "unknown"}: total mismatch`);
      }
    }
  }
  for (const expense of expenses) {
    if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) < 0) {
      throw new Error(`Financial invariant failed for expense ${expense.id}: amount must be non-negative`);
    }
  }
}

import type { Database } from "sql.js";

export type LocalEntityCollectionMap = Record<string, readonly unknown[]>;

type JsonRecord = Record<string, unknown>;

interface FinancialCollections {
  invoices: readonly unknown[];
  expenses: readonly unknown[];
  orders: readonly unknown[];
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.map(asRecord)
    : [];
}

export function syncNormalizedLocalEntities(
  sqlite: Database,
  collections: readonly string[],
  persistedCollections: LocalEntityCollectionMap,
) {
  const now = new Date().toISOString();
  for (const collection of collections) {
    const values = persistedCollections[collection] || [];
    const usedEntityIds = new Set<string>();
    sqlite.run("DELETE FROM local_entities WHERE collection = ?", [collection]);
    for (const value of values) {
      const record = asRecord(value);
      const baseEntityId = String(
        record.id ||
        record.key ||
        `${collection.toLowerCase()}-${Math.random().toString(36).slice(2)}`,
      );
      let entityId = baseEntityId;
      let duplicateIndex = 1;
      while (usedEntityIds.has(entityId)) {
        entityId = `${baseEntityId}~${duplicateIndex++}`;
      }
      if (entityId !== baseEntityId) {
        console.warn(`[STATE] Duplicate ${collection} entity id ${baseEntityId}; persisted with storage key ${entityId}`);
      }
      usedEntityIds.add(entityId);
      sqlite.run(
        "INSERT INTO local_entities (collection, entity_id, payload, updated_at) VALUES (?, ?, ?, ?)",
        [collection, entityId, JSON.stringify(value), now],
      );
    }
  }
}

export function assertFinancialStateInvariants({
  invoices,
  expenses,
}: Pick<FinancialCollections, "invoices" | "expenses">) {
  for (const rawInvoice of invoices) {
    const invoice = asRecord(rawInvoice);
    const total = Number(invoice.totalPrice) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    const remaining = Number(invoice.remaining) || 0;
    if (
      invoice.status !== "credit_note" &&
      Math.abs(remaining - Math.max(0, total - paid)) > 0.02
    ) {
      throw new Error(`Financial invariant failed for invoice ${invoice.id}: remaining mismatch`);
    }
    for (const rawItem of asRecordArray(invoice.items)) {
      const expected =
        (Number(rawItem.quantity) || 0) *
        (Number(rawItem.unitPrice) || 0) -
        (Number(rawItem.discount) || 0) +
        (Number(rawItem.tax) || 0);
      if (Math.abs((Number(rawItem.total) || 0) - expected) > 0.02) {
        throw new Error(
          `Financial invariant failed for invoice item ${rawItem.id || "unknown"}: total mismatch`,
        );
      }
    }
  }
  for (const rawExpense of expenses) {
    const expense = asRecord(rawExpense);
    if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) < 0) {
      throw new Error(
        `Financial invariant failed for expense ${expense.id}: amount must be non-negative`,
      );
    }
  }
}

export function syncNormalizedFinancialEntities(
  sqlite: Database,
  { invoices, expenses, orders }: FinancialCollections,
) {
  const now = new Date().toISOString();
  sqlite.run("DELETE FROM local_invoice_items");
  sqlite.run("DELETE FROM local_invoice_history");
  sqlite.run("DELETE FROM local_payments");
  sqlite.run("DELETE FROM local_invoices");
  sqlite.run("DELETE FROM local_expenses");

  const usedInvoiceIds = new Set<string>();
  const usedInvoiceItemIds = new Set<string>();
  const usedInvoiceHistoryIds = new Set<string>();
  const usedExpenseIds = new Set<string>();

  for (const rawInvoice of invoices) {
    const invoice = asRecord(rawInvoice);
    const invoiceId = String(invoice.id);
    if (usedInvoiceIds.has(invoiceId)) continue;
    usedInvoiceIds.add(invoiceId);

    sqlite.run(
      "INSERT INTO local_invoices (id, invoice_number, order_id, customer_id, issue_date, due_date, total_price, subtotal, tax_percent, discount, paid_amount, remaining, status, notes, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        invoiceId,
        String(invoice.invoiceNumber || invoiceId),
        invoice.orderId ? String(invoice.orderId) : null,
        String(invoice.customerId || ""),
        String(invoice.issueDate || now),
        String(invoice.dueDate || invoice.issueDate || now),
        Number(invoice.totalPrice) || 0,
        invoice.subtotal == null ? null : Number(invoice.subtotal),
        invoice.taxPercent == null ? null : Number(invoice.taxPercent),
        invoice.discount == null ? null : Number(invoice.discount),
        Number(invoice.paidAmount) || 0,
        Number(invoice.remaining) || 0,
        String(invoice.status || "unpaid"),
        invoice.notes == null ? null : String(invoice.notes),
        JSON.stringify(invoice),
        now,
      ],
    );

    for (const item of asRecordArray(invoice.items)) {
      const baseItemId = String(
        item.id ||
        `${invoiceId}-item-${Math.random().toString(36).slice(2)}`,
      );
      let itemId = baseItemId;
      let itemSuffix = 1;
      while (usedInvoiceItemIds.has(itemId)) {
        itemId = `${baseItemId}~${itemSuffix++}`;
      }
      usedInvoiceItemIds.add(itemId);
      sqlite.run(
        "INSERT INTO local_invoice_items (id, invoice_id, product_name, quantity, unit_price, discount, tax, total, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          itemId,
          invoiceId,
          String(item.productName || ""),
          Number(item.quantity) || 0,
          Number(item.unitPrice) || 0,
          Number(item.discount) || 0,
          Number(item.tax) || 0,
          Number(item.total) || 0,
          String(item.createdAt || now),
          JSON.stringify(item),
        ],
      );
    }

    for (const history of asRecordArray(invoice.history)) {
      const baseHistoryId = String(
        history.id ||
        `${invoiceId}-history-${Math.random().toString(36).slice(2)}`,
      );
      let historyId = baseHistoryId;
      let historySuffix = 1;
      while (usedInvoiceHistoryIds.has(historyId)) {
        historyId = `${baseHistoryId}~${historySuffix++}`;
      }
      usedInvoiceHistoryIds.add(historyId);
      sqlite.run(
        "INSERT INTO local_invoice_history (id, invoice_id, action, created_at, payload) VALUES (?, ?, ?, ?, ?)",
        [
          historyId,
          invoiceId,
          String(history.action || "updated"),
          String(history.createdAt || now),
          JSON.stringify(history),
        ],
      );
    }
  }

  const paymentRows = new Map<string, JsonRecord>();
  for (const rawInvoice of invoices) {
    const invoice = asRecord(rawInvoice);
    for (const payment of asRecordArray(invoice.payments)) {
      const id = String(
        payment.id ||
        `${invoice.id}-${payment.createdAt || payment.date || Math.random()}`,
      );
      paymentRows.set(id, {
        ...payment,
        id,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
      });
    }
  }

  for (const rawOrder of orders) {
    const order = asRecord(rawOrder);
    for (const payment of asRecordArray(order.payments)) {
      const id = String(
        payment.id ||
        `${order.id}-${payment.createdAt || payment.date || Math.random()}`,
      );
      if (!paymentRows.has(id)) {
        paymentRows.set(id, {
          ...payment,
          id,
          orderId: order.id,
        });
      }
    }
  }

  for (const payment of paymentRows.values()) {
    sqlite.run(
      "INSERT INTO local_payments (id, order_id, invoice_id, amount, method, reference, date, notes, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        String(payment.id),
        payment.orderId ? String(payment.orderId) : null,
        payment.invoiceId ? String(payment.invoiceId) : null,
        Number(payment.amountUSD ?? payment.amount) || 0,
        String(payment.paymentMethod || payment.method || "cash"),
        payment.reference == null ? null : String(payment.reference),
        String(payment.date || payment.createdAt || now),
        payment.notes == null ? null : String(payment.notes),
        JSON.stringify(payment),
        now,
      ],
    );
  }

  for (const rawExpense of expenses) {
    const expense = asRecord(rawExpense);
    const expenseId = String(expense.id);
    if (usedExpenseIds.has(expenseId)) continue;
    usedExpenseIds.add(expenseId);
    sqlite.run(
      "INSERT INTO local_expenses (id, category, amount, date, status, payload, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        expenseId,
        String(expense.category || "عام"),
        Number(expense.amount) || 0,
        String(expense.date || now),
        String(expense.status || "paid"),
        JSON.stringify(expense),
        now,
      ],
    );
  }
}

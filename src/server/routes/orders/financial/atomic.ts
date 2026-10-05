import * as core from "../../../server-core.ts";

const {
  ORDERS,
  INVOICES,
  INVOICE_HISTORY,
  ACTIVITY_LOGS,
  persistStateNow,
} = core;

export async function withAtomicFinancialMutation<T>(
  mutation: () => T | Promise<T>,
): Promise<T> {
  const snapshot = {
    orders: JSON.stringify(ORDERS),
    invoices: JSON.stringify(INVOICES),
    invoiceHistory: JSON.stringify(INVOICE_HISTORY),
    activityLogs: JSON.stringify(ACTIVITY_LOGS),
  };

  try {
    const result = await mutation();
    await persistStateNow();
    return result;
  } catch (error) {
    ORDERS.splice(0, ORDERS.length, ...JSON.parse(snapshot.orders));
    INVOICES.splice(0, INVOICES.length, ...JSON.parse(snapshot.invoices));
    INVOICE_HISTORY.splice(0, INVOICE_HISTORY.length, ...JSON.parse(snapshot.invoiceHistory));
    ACTIVITY_LOGS.splice(0, ACTIVITY_LOGS.length, ...JSON.parse(snapshot.activityLogs));
    throw error;
  }
}

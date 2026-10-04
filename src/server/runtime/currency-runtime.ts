import { sypToUsd } from "../../lib/currency.ts";

export interface CurrencyRecord {
  [key: string]: unknown;
}

export interface CurrencyRuntimeDependencies {
  settings: { exchangeRate: number };
  invoices: CurrencyRecord[];
}

function asRecordArray(value: unknown): CurrencyRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is CurrencyRecord => entry !== null && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

export function createCurrencyRuntime(deps: CurrencyRuntimeDependencies) {
  /**
   * Freeze the exchange-rate snapshot exactly once when an order is fully paid and delivered.
   * Operational order values remain SYP; USD values are immutable final-invoice presentation values.
   */
  function freezeOrderCurrencySnapshot(order: CurrencyRecord, invoice?: CurrencyRecord) {
    if (order.currencyFinalizedAt && order.exchangeRateAtFinalization) {
      return {
        order,
        invoice: invoice || deps.invoices.find((candidate) => candidate.orderId === order.id),
      };
    }

    const historicalRate = Number(
      order.exchangeRateAtFinalization ||
      order.exchangeRateAtCreation ||
      invoice?.exchangeRateAtIssue,
    );
    const configuredRate = Number(deps.settings.exchangeRate);
    const rate = historicalRate > 0
      ? historicalRate
      : (configuredRate > 0 ? configuredRate : 135);
    const finalizedAt = new Date().toISOString();
    const totalSYP = Math.round(Number(order.totalPrice) || 0);
    const paidSYP = Math.round(Number(order.paidAmount) || 0);
    const remainingSYP = Math.max(0, totalSYP - paidSYP);
    const finalInvoice = invoice || deps.invoices.find((candidate) => candidate.orderId === order.id);

    order.currency = "SYP";
    order.exchangeRateAtFinalization = rate;
    order.currencyFinalizedAt = finalizedAt;
    order.finalTotalSYP = totalSYP;
    order.finalPaidSYP = paidSYP;
    order.finalRemainingSYP = remainingSYP;
    order.finalTotalUSD = Number(sypToUsd(totalSYP, rate).toFixed(2));
    order.finalPaidUSD = Number(sypToUsd(paidSYP, rate).toFixed(2));
    order.finalRemainingUSD = Number(sypToUsd(remainingSYP, rate).toFixed(2));

    if (finalInvoice) {
      finalInvoice.currency = "USD";
      finalInvoice.exchangeRateAtFinalization = rate;
      finalInvoice.currencyFinalizedAt = finalizedAt;
      finalInvoice.totalPriceSYP = totalSYP;
      finalInvoice.paidAmountSYP = paidSYP;
      finalInvoice.remainingSYP = remainingSYP;
      finalInvoice.totalPriceUSD = order.finalTotalUSD;
      finalInvoice.paidAmountUSD = order.finalPaidUSD;
      finalInvoice.remainingUSD = order.finalRemainingUSD;
      finalInvoice.items = asRecordArray(finalInvoice.items).map((item) => {
        const issueRate = Number(finalInvoice.exchangeRateAtIssue) > 0
          ? Number(finalInvoice.exchangeRateAtIssue)
          : rate;
        const unitPriceSYP = Math.round(
          Number(item.unitPriceSYP ?? (Number(item.unitPrice || 0) * issueRate)),
        );
        const totalSYP = Math.round(
          Number(item.totalSYP ?? (Number(item.total || 0) * issueRate)),
        );
        return {
          ...item,
          unitPriceSYP,
          totalSYP,
          unitPrice: Number(sypToUsd(unitPriceSYP, rate).toFixed(2)),
          total: Number(sypToUsd(totalSYP, rate).toFixed(2)),
        };
      });
      // Existing invoice fields are USD and remain stable after finalization.
      finalInvoice.totalPrice = order.finalTotalUSD;
      finalInvoice.paidAmount = order.finalPaidUSD;
      finalInvoice.remaining = order.finalRemainingUSD;
    }

    return { order, invoice: finalInvoice };
  }

  return { freezeOrderCurrencySnapshot };
}

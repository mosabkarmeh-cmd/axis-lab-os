export interface PricingLine {
  quantity: number;
  unitPrice: number;
}

export interface DocumentTotals {
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
}

function finiteNonNegative(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function calculateDocumentTotals(
  lines: readonly PricingLine[],
  taxPercent: unknown = 0,
  discount: unknown = 0,
): DocumentTotals {
  const subtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const unitPrice = finiteNonNegative(line.unitPrice);
    return sum + quantity * unitPrice;
  }, 0);

  const normalizedTaxPercent = finiteNonNegative(taxPercent);
  const taxAmount = subtotal * (normalizedTaxPercent / 100);
  const normalizedDiscount = Math.min(subtotal, finiteNonNegative(discount));
  const total = Math.max(0, subtotal + taxAmount - normalizedDiscount);

  return {
    subtotal,
    taxPercent: normalizedTaxPercent,
    taxAmount,
    discount: normalizedDiscount,
    total,
  };
}

export interface InvoiceTotals extends DocumentTotals {
  lineAdjustments: number;
}

export function calculateInvoiceTotals(
  lines: readonly PricingLine[],
  lineDiscounts: readonly number[] = [],
  lineTaxes: readonly number[] = [],
  taxPercent: unknown = 0,
  discount: unknown = 0,
): InvoiceTotals {
  const rawSubtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const unitPrice = finiteNonNegative(line.unitPrice);
    return sum + quantity * unitPrice;
  }, 0);

  const lineDiscountTotal = lines.reduce(
    (sum, _, index) => sum + finiteNonNegative(lineDiscounts[index] ?? 0),
    0,
  );
  const lineTaxTotal = lines.reduce(
    (sum, _, index) => sum + finiteNonNegative(lineTaxes[index] ?? 0),
    0,
  );
  const netBeforeDocumentAdjustments = Math.max(
    0,
    rawSubtotal - lineDiscountTotal + lineTaxTotal,
  );
  const normalizedTaxPercent = finiteNonNegative(taxPercent);
  const taxAmount = netBeforeDocumentAdjustments * (normalizedTaxPercent / 100);
  const normalizedDiscount = Math.min(
    netBeforeDocumentAdjustments,
    finiteNonNegative(discount),
  );
  const total = Math.max(
    0,
    netBeforeDocumentAdjustments + taxAmount - normalizedDiscount,
  );

  return {
    subtotal: rawSubtotal,
    taxPercent: normalizedTaxPercent,
    taxAmount,
    discount: normalizedDiscount,
    total,
    lineAdjustments: lineDiscountTotal - lineTaxTotal,
  };
}

export function calculateLineTotal(
  quantity: unknown,
  unitPrice: unknown,
  discount: unknown = 0,
  tax: unknown = 0,
): number {
  const safeQuantity = Number(quantity);
  const safeUnitPrice = finiteNonNegative(unitPrice);
  const safeDiscount = finiteNonNegative(discount);
  const safeTax = finiteNonNegative(tax);
  if (!Number.isFinite(safeQuantity) || safeQuantity < 0) return 0;
  return Math.max(0, safeQuantity * safeUnitPrice - safeDiscount + safeTax);
}

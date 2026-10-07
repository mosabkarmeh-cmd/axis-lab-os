export interface PricingLine {
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface DocumentTotals {
  subtotal: number;
  taxableSubtotal: number;
  lineDiscount: number;
  lineTax: number;
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

  const lineDiscount = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const unitPrice = finiteNonNegative(line.unitPrice);
    return sum + Math.min(quantity * unitPrice, finiteNonNegative(line.discount));
  }, 0);

  const lineTax = lines.reduce((sum, line) => sum + finiteNonNegative(line.tax), 0);
  const taxableSubtotal = lines.reduce((sum, line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const unitPrice = finiteNonNegative(line.unitPrice);
    const base = quantity * unitPrice;
    const lineDiscountAmount = Math.min(base, finiteNonNegative(line.discount));
    return sum + Math.max(0, base - lineDiscountAmount + finiteNonNegative(line.tax));
  }, 0);

  const normalizedTaxPercent = finiteNonNegative(taxPercent);
  const taxAmount = taxableSubtotal * (normalizedTaxPercent / 100);
  const normalizedDiscount = Math.min(taxableSubtotal + taxAmount, finiteNonNegative(discount));
  const total = Math.max(0, taxableSubtotal + taxAmount - normalizedDiscount);

  return {
    subtotal,
    taxableSubtotal,
    lineDiscount,
    lineTax,
    taxPercent: normalizedTaxPercent,
    taxAmount,
    discount: normalizedDiscount,
    total,
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
  const base = safeQuantity * safeUnitPrice;
  return Math.max(0, base - Math.min(base, safeDiscount) + safeTax);
}

import { calculateDocumentTotals, calculateLineTotal } from "../src/server/domain/financial/pricing-engine.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const order = calculateDocumentTotals(
  [
    { quantity: 2, unitPrice: 100 },
    { quantity: 3, unitPrice: 50 },
  ],
  10,
  25,
);
assert(order.subtotal === 350, `unexpected subtotal: ${order.subtotal}`);
assert(order.taxAmount === 35, `unexpected tax: ${order.taxAmount}`);
assert(order.discount === 25, `unexpected discount: ${order.discount}`);
assert(order.total === 360, `unexpected total: ${order.total}`);

const cappedDiscount = calculateDocumentTotals([{ quantity: 1, unitPrice: 100 }], 0, 999);
assert(cappedDiscount.discount === 100 && cappedDiscount.total === 0, "discount was not capped at subtotal");

assert(calculateLineTotal(3, 20, 10, 5) === 55, "line total formula is incorrect");

const invoiceAdjustments = calculateDocumentTotals(
  [{ quantity: 1, unitPrice: 100, discount: 10, tax: 5 }],
  10,
  5,
);
assert(invoiceAdjustments.subtotal === 100, `unexpected invoice subtotal: ${invoiceAdjustments.subtotal}`);
assert(invoiceAdjustments.taxableSubtotal === 95, `unexpected invoice taxable subtotal: ${invoiceAdjustments.taxableSubtotal}`);
assert(invoiceAdjustments.taxAmount === 9.5, `unexpected invoice tax: ${invoiceAdjustments.taxAmount}`);
assert(invoiceAdjustments.discount === 5, `unexpected invoice additional discount: ${invoiceAdjustments.discount}`);
assert(invoiceAdjustments.total === 99.5, `unexpected invoice total: ${invoiceAdjustments.total}`);
assert(calculateLineTotal("invalid", 20, 10, 5) === 0, "invalid quantity did not fail closed");

const invoice = (await import("../src/server/domain/financial/pricing-engine.ts")).calculateInvoiceTotals(
  [
    { quantity: 2, unitPrice: 100 },
    { quantity: 1, unitPrice: 50 },
  ],
  [10, 0],
  [5, 0],
  10,
  20,
);
assert(invoice.subtotal === 250, `unexpected invoice subtotal: ${invoice.subtotal}`);
assert(invoice.taxAmount === 24.5, `unexpected invoice document tax: ${invoice.taxAmount}`);
assert(invoice.total === 249.5, `unexpected invoice total: ${invoice.total}`);


console.log("financial-pricing-engine-smoke: PASS");

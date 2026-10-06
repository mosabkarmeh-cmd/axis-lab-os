import express from "express";
import * as core from "../../../server-core.ts";
import { asInvoiceItem, getActorId, type InvoiceItem } from "./shared.ts";

const {
  INVOICES,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  getNextNumber,
  persistMutationWithFastDurability,
} = core;

export function registerInvoiceCreateRoutes(app: express.Express) {
  app.post("/api/accounting/invoices", async (req, res) => {
    const { customerId, totalPrice, dueDate, notes, items, taxPercent, discount } = req.body;
    if (!customerId) {
      res.status(400).json({ success: false, message: "العميل مطلوب" });
      return;
    }

    if (!core.CUSTOMERS.some(customer => customer.id === customerId)) {
      res.status(400).json({ success: false, message: "العميل المحدد غير موجود" });
      return;
    }
    if (dueDate !== undefined && (!String(dueDate || "").trim() || Number.isNaN(Date.parse(String(dueDate))))) {
      res.status(400).json({ success: false, message: "تاريخ الاستحقاق غير صالح" });
      return;
    }

    const invoiceId = nextEntityId("inv");
    const invItems = Array.isArray(items) && items.length > 0 ? (() => {
      const normalized = [];
      for (let idx = 0; idx < items.length; idx++) {
        const it = asInvoiceItem(items[idx]);
        const quantity = Number(it.quantity);
        const unitPrice = Number(it.unitPrice);
        const lineDiscount = Number(it.discount ?? 0);
        const lineTax = Number(it.tax ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineDiscount) || lineDiscount < 0 || !Number.isFinite(lineTax) || lineTax < 0) {
          throw new Error("بيانات بند الفاتورة غير صالحة في السطر " + (idx + 1));
        }
        const total = Math.max(0, quantity * unitPrice - lineDiscount + lineTax);
        if (!Number.isFinite(total)) throw new Error("إجمالي بند الفاتورة غير صالح في السطر " + (idx + 1));
        normalized.push({
          id: "invitem-" + Date.now() + "-" + idx, invoiceId,
          productName: it.productName || "بند مخصص", quantity, unitPrice,
          discount: lineDiscount, tax: lineTax, total, createdAt: new Date().toISOString()
        });
      }
      return normalized;
    })() : [
      { id: "invitem-" + Date.now() + "-0", invoiceId, productName: "فاتورة يدوية مخصصة",
        quantity: 1, unitPrice: Number(totalPrice) || 0, discount: Number(discount) || 0,
        tax: 0, total: Math.max(0, Number(totalPrice) || 0), createdAt: new Date().toISOString() }
    ];
    const computedSubtotal = invItems.reduce((sum: number, it: InvoiceItem) => sum + (it.quantity * it.unitPrice), 0);
    const computedTotal = invItems.reduce((sum: number, it: InvoiceItem) => sum + it.total, 0);
    const safeTotal = Number.isFinite(computedTotal) ? Math.max(0, computedTotal) : 0;
    const finalTotal = safeTotal;

    const newInv = {
      id: invoiceId,
      invoiceNumber: getNextNumber("invoice"),
      orderId: null,
      customerId,
      issueDate: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 3600000 * 24 * 7).toISOString(), // default 7 days
      totalPrice: finalTotal,
      subtotal: computedSubtotal,
      taxPercent: Number.isFinite(Number(taxPercent)) ? Math.max(0, Number(taxPercent)) : 0,
      discount: Number.isFinite(Number(discount)) ? Math.max(0, Number(discount)) : 0,
      paidAmount: 0,
      remaining: finalTotal,
      status: "draft", // Starts as draft per request
      notes: notes || "",
      items: invItems,
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: invoiceId,
          action: "created",
          userId: getActorId(req),
          createdAt: new Date().toISOString()
        }
      ]
    };

    INVOICES.unshift(newInv);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_INVOICE",
      entityType: "Invoice",
      entityId: newInv.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: newInv });
  });
}

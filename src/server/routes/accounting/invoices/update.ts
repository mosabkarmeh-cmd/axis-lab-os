import express from "express";
import * as core from "../../../server-core.ts";
import { asInvoiceItem, getActorId } from "./shared.ts";

const {
  INVOICES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  persistMutationWithFastDurability,
} = core;

export function registerInvoiceUpdateRoutes(app: express.Express) {
  app.put("/api/accounting/invoices/:id", async (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { notes, dueDate, items, taxPercent, discount, totalPrice } = req.body;
    const oldData = JSON.parse(JSON.stringify(inv));
    if (inv.currencyFinalizedAt && (items !== undefined || taxPercent !== undefined || discount !== undefined || totalPrice !== undefined)) {
      res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديل قيمتها بعد التسليم الكامل." });
      return;
    }

    if (dueDate) inv.dueDate = dueDate;
    if (notes !== undefined) inv.notes = notes;
    if (taxPercent !== undefined) inv.taxPercent = Number(taxPercent) || 0;
    if (discount !== undefined) inv.discount = Number(discount) || 0;

    if (items && Array.isArray(items)) {
      inv.items = items.map((raw, idx: number) => {
        const it = asInvoiceItem(raw);
        return {
          id: it.id || `invitem-${Date.now()}-${idx}`,
          invoiceId: inv.id,
          productName: it.productName || "بند مخصص",
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discount: Number(it.discount) || 0,
          tax: Number(it.tax) || 0,
          total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0) + (Number(it.tax) || 0),
          createdAt: it.createdAt || new Date().toISOString()
        };
      });
    }

    const computedSubtotal = inv.items ? inv.items.reduce((sum: number, it) => sum + (it.quantity * it.unitPrice), 0) : inv.totalPrice;
    inv.subtotal = computedSubtotal;

    const computedTotal = inv.items ? inv.items.reduce((sum: number, it) => sum + it.total, 0) : inv.totalPrice;
    const finalTotal = totalPrice !== undefined ? Number(totalPrice) : computedTotal;
    inv.totalPrice = finalTotal;
    inv.remaining = Math.max(0, finalTotal - inv.paidAmount);

    // Record history
    const historyEntry = {
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: "updated" as const,
      oldData,
      newData: JSON.parse(JSON.stringify(inv)),
      userId: getActorId(req),
      createdAt: new Date().toISOString()
    };
    if (!inv.history) inv.history = [];
    inv.history.push(historyEntry);

    // Log Activity
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_INVOICE",
      entityType: "Invoice",
      entityId: inv.id,
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: inv });
  });
  app.post("/api/accounting/invoices/:id/status", async (req, res) => {
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { status } = req.body;
    const oldData = { status: inv.status };
    inv.status = status;

    if (!inv.history) inv.history = [];
    inv.history.push({
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: (status === "cancelled" ? "cancelled" : status === "paid" ? "paid" : "updated") ,
      oldData,
      newData: { status },
      userId: getActorId(req),
      createdAt: new Date().toISOString()
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, invoice: inv });
  });
}

import express from "express";
import * as core from "../../../server-core.ts";
import { asInvoiceItem, getActorId } from "./shared.ts";

const {
  INVOICES,
  nextEntityId,
  getNextNumber,
  persistMutationWithFastDurability,
  getRequestUser,
} = core;

export function registerInvoiceCreditNoteRoutes(app: express.Express) {
  app.post("/api/accounting/invoices/:id/credit-note", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "accountant"].includes(user.role)) { res.status(403).json({ success: false, message: "إصدار الإشعارات الدائنة متاح للإدارة والحسابات فقط" }); return; }
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة الأصلية غير موجودة" });
      return;
    }
    if (inv.currencyFinalizedAt) {
      res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن إصدار إشعار دائن بعد التسليم." });
      return;
    }
    if (inv.status === "cancelled" || inv.status === "credit_note") {
      res.status(409).json({ success: false, message: "لا يمكن إصدار إشعار دائن لفاتورة ملغاة أو إشعار دائن." });
      return;
    }

    const creditNoteId = nextEntityId("inv");
    const creditItems = inv.items ? inv.items.map((raw, idx: number) => { const it = asInvoiceItem(raw); return ({
      id: `invitem-${Date.now()}-${idx}`,
      invoiceId: creditNoteId,
      productName: `مرتجع: ${it.productName}`,
      quantity: -it.quantity,
      unitPrice: it.unitPrice,
      discount: -it.discount,
      tax: -it.tax,
      total: -it.total,
      createdAt: new Date().toISOString()
    })}) : [
      {
        id: `invitem-${Date.now()}-0`,
        invoiceId: creditNoteId,
        productName: `إشعار دائن للفاتورة ${inv.invoiceNumber}`,
        quantity: -1,
        unitPrice: inv.totalPrice,
        discount: 0,
        tax: 0,
        total: -inv.totalPrice,
        createdAt: new Date().toISOString()
      }
    ];

    const creditInvoice = {
      id: creditNoteId,
      invoiceNumber: getNextNumber("invoice") + "-CN",
      orderId: inv.orderId,
      customerId: inv.customerId,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      totalPrice: -inv.totalPrice,
      subtotal: inv.subtotal ? -inv.subtotal : -inv.totalPrice,
      taxPercent: inv.taxPercent || 0,
      discount: inv.discount ? -inv.discount : 0,
      paidAmount: -inv.paidAmount,
      remaining: 0,
      status: "credit_note" as const,
      notes: `إشعار دائن للفاتورة رقم: ${inv.invoiceNumber}`,
      items: creditItems,
      history: [
        {
          id: `invhist-${Date.now()}`,
          invoiceId: creditNoteId,
          action: "credit_note" as const,
          userId: getActorId(req),
          createdAt: new Date().toISOString()
        }
      ]
    };

    INVOICES.unshift(creditInvoice);
    inv.status = "cancelled"; // Auto cancel the original invoice or flag it

    if (!inv.history) inv.history = [];
    inv.history.push({
      id: `invhist-${Date.now()}`,
      invoiceId: inv.id,
      action: "cancelled",
      userId: getActorId(req),
      createdAt: new Date().toISOString(),
      notes: `تم إلغاء الفاتورة وإصدار إشعار دائن رقم ${creditInvoice.invoiceNumber}`
    });

    await persistMutationWithFastDurability();
    res.json({ success: true, creditInvoice, originalInvoice: inv });
  });
}

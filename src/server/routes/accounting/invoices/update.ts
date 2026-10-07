import express from "express";
import * as core from "../../../server-core.ts";
import { asInvoiceItem, getActorId } from "./shared.ts";
import { calculateLineTotal, calculateInvoiceTotals } from "../../../domain/financial/pricing-engine.ts";

const {
  INVOICES,
  ACTIVITY_LOGS,
  nextActivityLogId,
  persistMutationWithFastDurability,
  getRequestUser,
} = core;

export function registerInvoiceUpdateRoutes(app: express.Express) {
  app.put("/api/accounting/invoices/:id", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "accountant"].includes(user.role)) { res.status(403).json({ success: false, message: "تعديل الفواتير متاح للإدارة والحسابات فقط" }); return; }
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    const { notes, dueDate, items, taxPercent, discount, totalPrice } = req.body;
    const oldData = JSON.parse(JSON.stringify(inv));
    if (inv.currencyFinalizedAt) { res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تعديلها بعد التسليم الكامل." }); return; }

    if (dueDate !== undefined) { if (!String(dueDate || "").trim() || Number.isNaN(Date.parse(String(dueDate)))) { res.status(400).json({ success: false, message: "تاريخ الاستحقاق غير صالح" }); return; } inv.dueDate = dueDate; }
    if (notes !== undefined) inv.notes = notes;
    if (taxPercent !== undefined) {
      const value = Number(taxPercent);
      if (!Number.isFinite(value) || value < 0) { res.status(400).json({ success: false, message: "نسبة الضريبة غير صالحة" }); return; }
      inv.taxPercent = value;
    }
    if (discount !== undefined) {
      const value = Number(discount);
      if (!Number.isFinite(value) || value < 0) { res.status(400).json({ success: false, message: "الخصم غير صالح" }); return; }
      inv.discount = value;
    }

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: "يجب أن تحتوي الفاتورة على بند واحد على الأقل" });
        return;
      }
      const normalizedItems = [];
      for (let idx = 0; idx < items.length; idx++) {
        const it = asInvoiceItem(items[idx]);
        const quantity = Number(it.quantity);
        const unitPrice = Number(it.unitPrice);
        const lineDiscount = Number(it.discount ?? 0);
        const lineTax = Number(it.tax ?? 0);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineDiscount) || lineDiscount < 0 || !Number.isFinite(lineTax) || lineTax < 0) {
          res.status(400).json({ success: false, message: "بيانات بند الفاتورة غير صالحة في السطر " + (idx + 1) });
          return;
        }
        const total = calculateLineTotal(quantity, unitPrice, lineDiscount, lineTax);
        if (!Number.isFinite(total)) {
          res.status(400).json({ success: false, message: "إجمالي بند الفاتورة غير صالح في السطر " + (idx + 1) });
          return;
        }
        normalizedItems.push({
          id: it.id || ("invitem-" + Date.now() + "-" + idx),
          invoiceId: inv.id,
          productName: it.productName || "بند مخصص",
          quantity, unitPrice, discount: lineDiscount, tax: lineTax, total,
          createdAt: it.createdAt || new Date().toISOString()
        });
      }
      inv.items = normalizedItems;
    }
    const invoicePricing = calculateInvoiceTotals(
      (inv.items || []).map((item) => ({
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      })),
      (inv.items || []).map((item) => Number(item.discount || 0)),
      (inv.items || []).map((item) => Number(item.tax || 0)),
      inv.taxPercent,
      inv.discount,
    );
    const computedSubtotal = invoicePricing.subtotal;
    const finalTotal = invoicePricing.total;
    if (!Number.isFinite(computedSubtotal) || !Number.isFinite(finalTotal) || finalTotal < 0) { res.status(400).json({ success: false, message: "تعذر حساب إجمالي الفاتورة من البنود" }); return; }
    const paidAmount = Number.isFinite(Number(inv.paidAmount)) ? Math.max(0, Number(inv.paidAmount)) : 0;
    if (paidAmount > finalTotal) { res.status(409).json({ success: false, message: "لا يمكن أن يتجاوز المدفوع إجمالي الفاتورة بعد التعديل." }); return; }
    inv.subtotal = computedSubtotal;
    inv.totalPrice = finalTotal;
    inv.remaining = finalTotal - paidAmount;
    void totalPrice;
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
    const user = getRequestUser(req);
    if (!user || !["admin", "accountant"].includes(user.role)) { res.status(403).json({ success: false, message: "تعديل حالة الفاتورة متاح للإدارة والحسابات فقط" }); return; }
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }

    if (inv.currencyFinalizedAt) { res.status(409).json({ success: false, message: "الفاتورة نهائية ومثبتة؛ لا يمكن تغيير حالتها." }); return; }
    const { status } = req.body;
    const allowedStatuses = new Set(["draft", "issued", "sent", "unpaid", "partially_paid", "paid", "cancelled"]);
    if (typeof status !== "string" || !allowedStatuses.has(status)) { res.status(400).json({ success: false, message: "حالة الفاتورة غير صالحة" }); return; }
    const paid = Math.max(0, Number(inv.paidAmount) || 0);
    const total = Math.max(0, Number(inv.totalPrice) || 0);
    const remaining = Math.max(0, total - paid);
    if (status === "paid" && remaining > 0) { res.status(409).json({ success: false, message: "لا يمكن وضع الفاتورة كمدفوعة قبل تسديد كامل المبلغ." }); return; }
    if (status === "partially_paid" && (paid <= 0 || remaining <= 0)) { res.status(409).json({ success: false, message: "حالة الدفعة الجزئية لا تطابق الرصيد المالي." }); return; }
    if (status === "unpaid" && paid > 0) { res.status(409).json({ success: false, message: "لا يمكن وضع الفاتورة كغير مدفوعة مع وجود دفعات مسجلة." }); return; }
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

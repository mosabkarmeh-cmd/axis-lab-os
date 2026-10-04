import express from "express";
import * as core from "../../../server-core.ts";
import { applyPayment, withAtomicFinancialMutation } from "../../orders/financial.ts";
import { getActorId } from "./shared.ts";

const { INVOICES } = core;

export function registerInvoicePaymentRoutes(app: express.Express) {
  app.post("/api/accounting/invoices/:id/payments", async (req, res) => {
    const { amount, currency = "USD", notes, paymentMethod, paymentId } = req.body;
    const inv = INVOICES.find(i => i.id === req.params.id);
    if (!inv) {
      res.status(404).json({ success: false, message: "الفاتورة غير موجودة" });
      return;
    }
    let result;
    try {
      result = await withAtomicFinancialMutation(() => applyPayment({ order: null, inv, amount, currency, notes, paymentMethod, actorId: getActorId(req), paymentId }));
    } catch (error) {
      console.error("[FINANCE] Atomic invoice payment failed:", error);
      res.status(500).json({ success: false, message: "تعذر حفظ الدفعة بشكل ذري؛ لم يتم تغيير البيانات." });
      return;
    }
    if (!result.ok) {
      res.status(result.status).json({ success: false, ...result.body });
      return;
    }
    res.json({ success: true, invoice: result.invoice });
  });
}

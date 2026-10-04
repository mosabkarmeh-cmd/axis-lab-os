import express from "express";
import { registerInvoiceReadRoutes } from "./invoices/read.ts";
import { registerInvoiceCreateRoutes } from "./invoices/create.ts";
import { registerInvoicePaymentRoutes } from "./invoices/payments.ts";
import { registerInvoiceUpdateRoutes } from "./invoices/update.ts";
import { registerInvoiceCreditNoteRoutes } from "./invoices/credit-note.ts";

export function registerAccountingInvoiceRoutes(app: express.Express) {
  registerInvoiceReadRoutes(app);
  registerInvoiceCreateRoutes(app);
  registerInvoicePaymentRoutes(app);
  registerInvoiceUpdateRoutes(app);
  registerInvoiceCreditNoteRoutes(app);
}

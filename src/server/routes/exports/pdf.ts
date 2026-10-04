import express from "express";
import { registerInvoicePdfRoute } from "./pdf/invoice.ts";
import { registerDeliveryNotePdfRoute } from "./pdf/delivery.ts";
import { registerJobTicketPdfRoute } from "./pdf/job-ticket.ts";
import { registerOrderPdfRoute } from "./pdf/order.ts";

export function registerExportPdfRoutes(app: express.Express) {
  registerInvoicePdfRoute(app);
  registerDeliveryNotePdfRoute(app);
  registerJobTicketPdfRoute(app);
  registerOrderPdfRoute(app);
}

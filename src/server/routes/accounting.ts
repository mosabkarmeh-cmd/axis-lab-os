import express from "express";
import { registerAccountingInvoiceRoutes } from "./accounting/invoices.ts";
import { registerAccountingNumberingRoutes } from "./accounting/numbering.ts";
import { registerAccountingExpenseRoutes } from "./accounting/expenses.ts";
import { registerAccountingStatsRoutes } from "./accounting/stats.ts";

export function registerAccountingRoutes(app: express.Express) {
  registerAccountingInvoiceRoutes(app);
  registerAccountingNumberingRoutes(app);
  registerAccountingExpenseRoutes(app);
  registerAccountingStatsRoutes(app);
}

import express from "express";
import { registerSalesExcelRoute } from "./spreadsheets/sales.ts";
import { registerInvoicesExcelRoute } from "./spreadsheets/invoices.ts";
import { registerInventoryExcelRoute } from "./spreadsheets/inventory.ts";
import { registerCustomersCsvRoute } from "./spreadsheets/customers.ts";
import { registerMaterialsCsvRoute } from "./spreadsheets/materials.ts";

export function registerExportSpreadsheetRoutes(app: express.Express) {
  registerSalesExcelRoute(app);
  registerInvoicesExcelRoute(app);
  registerInventoryExcelRoute(app);
  registerCustomersCsvRoute(app);
  registerMaterialsCsvRoute(app);
}

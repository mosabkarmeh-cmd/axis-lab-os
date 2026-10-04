import express from "express";
import { registerExportSpreadsheetRoutes } from "./exports/spreadsheets.ts";
import { registerExportPdfRoutes } from "./exports/pdf.ts";
import { registerExportShareRoutes } from "./exports/sharing.ts";

export function registerExportRoutes(app: express.Express) {
  registerExportSpreadsheetRoutes(app);
  registerExportPdfRoutes(app);
  registerExportShareRoutes(app);
}

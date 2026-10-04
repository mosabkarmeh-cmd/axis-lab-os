import express from "express";
import { registerImportPreviewRoutes } from "./imports/preview.ts";
import { registerImportMasterDataRoutes } from "./imports/master-data.ts";
import { registerImportSupplierInventoryRoutes } from "./imports/supplier-inventory.ts";

export function registerImportRoutes(app: express.Express) {
  registerImportPreviewRoutes(app);
  registerImportMasterDataRoutes(app);
  registerImportSupplierInventoryRoutes(app);
}

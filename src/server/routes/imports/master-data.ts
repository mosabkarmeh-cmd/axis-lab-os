import express from "express";
import { registerImportCustomerRoutes } from "./master-data/customers.ts";
import { registerImportProductRoutes } from "./master-data/products.ts";
import { registerImportMaterialRoutes } from "./master-data/materials.ts";

export function registerImportMasterDataRoutes(app: express.Express) {
  registerImportCustomerRoutes(app);
  registerImportProductRoutes(app);
  registerImportMaterialRoutes(app);
}

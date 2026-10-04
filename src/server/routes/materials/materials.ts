import express from "express";
import { registerMaterialCatalogRoutes } from "./materials/catalog.ts";
import { registerMaterialSupplierRoutes } from "./materials/quotes.ts";
import { registerMaterialMutationRoutes } from "./materials/mutations.ts";

export function registerMaterialRoutes(app: express.Express) {
  registerMaterialCatalogRoutes(app);
  registerMaterialSupplierRoutes(app);
  registerMaterialMutationRoutes(app);
}

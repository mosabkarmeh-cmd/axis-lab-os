import express from "express";
import { registerMaterialRoutes } from "./materials/materials.ts";
import { registerInventoryRoutes } from "./materials/inventory.ts";

export function registerLegacyMaterialsInventoryRoutes(app: express.Express) {
  registerMaterialRoutes(app);
  registerInventoryRoutes(app);
}

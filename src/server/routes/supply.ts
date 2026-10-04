import express from "express";
import { registerRemnantRoutes } from "./supply/remnants.ts";
import { registerSupplierRoutes } from "./supply/suppliers.ts";
import { registerSupplyOrderRoutes } from "./supply/orders.ts";

export function registerSupplyRoutes(app: express.Express) {
  registerRemnantRoutes(app);
  registerSupplierRoutes(app);
  registerSupplyOrderRoutes(app);
}

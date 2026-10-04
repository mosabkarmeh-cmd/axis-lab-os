import express from "express";
import { registerPostgresMaterialCatalogRoutes } from "./materials/pg/catalog.ts";
import { registerPostgresInventoryRoutes } from "./materials/pg/inventory.ts";
import { registerPostgresRemnantRoutes } from "./materials/pg/remnants.ts";
import { registerPostgresSupplierRoutes } from "./materials/pg/suppliers.ts";

const router = express.Router();

registerPostgresMaterialCatalogRoutes(router);
registerPostgresInventoryRoutes(router);
registerPostgresRemnantRoutes(router);
registerPostgresSupplierRoutes(router);

export default router;

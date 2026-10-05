import express from "express";
import { registerMaterialAiClassificationRoute } from "./catalog/ai-classify.ts";
import { registerMaterialCatalogReadRoutes } from "./catalog/read.ts";
import { registerMaterialAvailabilityRoute } from "./catalog/availability.ts";
import { registerMaterialDetailRoute } from "./catalog/detail.ts";

export function registerMaterialCatalogRoutes(app: express.Express) {
  registerMaterialAiClassificationRoute(app);
  registerMaterialCatalogReadRoutes(app);
  registerMaterialAvailabilityRoute(app);
  registerMaterialDetailRoute(app);
}

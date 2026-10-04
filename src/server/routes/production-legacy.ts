import express from "express";
import { registerProductionMachineRoutes } from "./production/machines.ts";
import { registerProductionJobRoutes } from "./production/jobs.ts";

export function registerProductionLegacyRoutes(app: express.Express) {
  registerProductionMachineRoutes(app);
  registerProductionJobRoutes(app);
}

import express from "express";
import { registerProductionJobQueueRoutes } from "./jobs/queue.ts";
import { registerProductionJobLifecycleRoutes } from "./jobs/lifecycle.ts";

export function registerProductionJobRoutes(app: express.Express) {
  registerProductionJobQueueRoutes(app);
  registerProductionJobLifecycleRoutes(app);
}

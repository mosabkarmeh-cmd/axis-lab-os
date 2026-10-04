import express from "express";
import { registerProductionAssignRoute } from "./assign.ts";
import { registerProductionStartRoute } from "./start.ts";
import { registerProductionPauseProgressRoutes } from "./pause-progress.ts";
import { registerProductionCompleteRoute } from "./complete.ts";

export function registerProductionJobLifecycleRoutes(app: express.Express) {
  registerProductionAssignRoute(app);
  registerProductionStartRoute(app);
  registerProductionPauseProgressRoutes(app);
  registerProductionCompleteRoute(app);
}

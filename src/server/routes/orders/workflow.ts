import express from "express";
import { registerOrderWorkerAssignmentRoute } from "./workflow/assign-workers.ts";
import { registerOrderRatingRoute } from "./workflow/rating.ts";
import { registerEmployeeOrderStatsRoute } from "./workflow/employee-stats.ts";
import { registerOrderStatusRoute } from "./workflow/status.ts";

export function registerOrderWorkflowRoutes(app: express.Express) {
  registerOrderWorkerAssignmentRoute(app);
  registerOrderRatingRoute(app);
  registerEmployeeOrderStatsRoute(app);
  registerOrderStatusRoute(app);
}

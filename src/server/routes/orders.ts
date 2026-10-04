import express from "express";
import { registerOrderCrudRoutes } from "./orders/crud.ts";
import { registerOrderItemProgressRoutes } from "./orders/items-progress.ts";
import { registerOrderPaymentRoutes } from "./orders/payments.ts";
import { registerOrderWorkflowRoutes } from "./orders/workflow.ts";
import { registerOrderArchiveRoutes } from "./orders/archive.ts";

export function registerOrderRoutes(app: express.Express) {
  registerOrderCrudRoutes(app);
  registerOrderItemProgressRoutes(app);
  registerOrderPaymentRoutes(app);
  registerOrderWorkflowRoutes(app);
  registerOrderArchiveRoutes(app);
}

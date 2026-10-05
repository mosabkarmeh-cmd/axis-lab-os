import express from "express";
import { registerInventoryReadRoutes } from "./inventory/read.ts";
import { registerInventoryMutationRoutes } from "./inventory/mutations.ts";

export function registerInventoryRoutes(app: express.Express) {
  registerInventoryReadRoutes(app);
  registerInventoryMutationRoutes(app);
}

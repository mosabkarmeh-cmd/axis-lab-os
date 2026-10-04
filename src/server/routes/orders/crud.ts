import express from "express";
import { registerOrderReadRoutes } from "./crud/read.ts";
import { registerOrderCreateRoutes } from "./crud/create.ts";
import { registerOrderUpdateRoutes } from "./crud/update.ts";

export function registerOrderCrudRoutes(app: express.Express) {
  registerOrderReadRoutes(app);
  registerOrderCreateRoutes(app);
  registerOrderUpdateRoutes(app);
}

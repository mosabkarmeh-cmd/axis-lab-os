import express from "express";
import * as core from "../../server-core.ts";
import { ordersForResponse } from "./response.ts";

const { ORDERS, notifyOverdueOrders } = core;

export function registerOrderReadRoutes(app: express.Express) {
  // API - Get Orders
  app.get("/api/orders", (req, res) => {
    notifyOverdueOrders();
    res.json(ordersForResponse(req, ORDERS));
  });
}

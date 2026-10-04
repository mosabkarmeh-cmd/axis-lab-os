import express from "express";
import * as core from "../../server-core.ts";
import { orderForResponse, ordersForResponse, getActorId } from "./response.ts";

const {
  ORDERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  SETTINGS,
  createNotification,
} = core;

type OrderRecord = (typeof ORDERS)[number];

export function registerOrderArchiveRoutes(app: express.Express) {
// API - Run Auto Archive Orders
  app.post("/api/orders/auto-archive", (req, res) => {
    const isAutoEnabled = req.body.force ? true : (SETTINGS.autoArchive?.enabled ?? true);
    if (!isAutoEnabled) {
      return res.json({
        success: false,
        count: 0,
        archivedOrders: [],
        message: "ميزة الأرشفة التلقائية معطلة حالياً في إعدادات النظام."
}

import express from "express";
import { registerAnalyticsReportRoute } from "./reports/analytics.ts";

export function registerReportRoutes(app: express.Express) {
  registerAnalyticsReportRoute(app);
}

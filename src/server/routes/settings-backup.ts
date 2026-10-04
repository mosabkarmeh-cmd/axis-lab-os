import express from "express";
import { registerSettingsRoutes } from "./settings/settings.ts";
import { registerBackupRoutes } from "./settings/backup.ts";

export function registerSettingsBackupRoutes(app: express.Express) {
  registerSettingsRoutes(app);
  registerBackupRoutes(app);
}

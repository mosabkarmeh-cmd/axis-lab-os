import express from "express";
import { registerUserManagementRoutes } from "./users/management.ts";
import { registerLegacyCustomerRoutes } from "./users/customers.ts";
import { registerLegacyProductRoutes } from "./users/products.ts";

export function registerUserRoutes(
  app: express.Express,
  options: { includeLegacyCustomerProductRoutes?: boolean } = {},
) {
  registerUserManagementRoutes(app);

  if (options.includeLegacyCustomerProductRoutes !== false) {
    registerLegacyCustomerRoutes(app);
    registerLegacyProductRoutes(app);
  }
}

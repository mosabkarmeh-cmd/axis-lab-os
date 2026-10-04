import express from "express";
import * as core from "../../server-core.ts";

export type AiAccessScope = {
  role: string | null;
  canViewFinancials: boolean;
  canViewCustomerPrivateData: boolean;
  canUsePricingTools: boolean;
};

export function getAiAccessScope(req: express.Request): AiAccessScope {
  const user = core.getRequestUser(req);
  const role = user?.role || null;
  const privileged = role === "admin" || role === "accountant";
  return {
    role,
    canViewFinancials: privileged,
    canViewCustomerPrivateData: privileged,
    canUsePricingTools: privileged,
  };
}

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
  const canViewFinancials = role === "admin" || role === "accountant";
  const canViewCustomerPrivateData = role === "admin";
  return {
    role,
    canViewFinancials,
    canViewCustomerPrivateData,
    canUsePricingTools: canViewFinancials,
  };
}

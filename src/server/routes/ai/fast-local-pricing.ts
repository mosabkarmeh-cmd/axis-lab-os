import type { Request, Response } from "express";
import type { FastLocalPayload } from "./fast-local-types.ts";
import { getPricingAdvisorResponse } from "./fast-local-pricing/advisor.ts";
import { calculateInstantPricing } from "./fast-local-pricing/calculator.ts";

export function handleFastLocalPricingAction(
  action: unknown,
  payload: FastLocalPayload,
  _req: Request,
  res: Response,
): boolean {
  switch (String(action)) {
    case "pricing-advisor":
      res.json(getPricingAdvisorResponse(payload));
      return true;
    case "instant-pricing-calc":
      res.json(calculateInstantPricing(payload));
      return true;
    default:
      return false;
  }
}

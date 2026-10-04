import type { Request, Response } from "express";
import type { FastLocalPayload } from "./fast-local-types.ts";
import { getPricingAdvisorResponse } from "./fast-local-pricing/advisor.ts";
import { calculateInstantPricing } from "./fast-local-pricing/calculator.ts";
import * as core from "../../server-core.ts";

export function handleFastLocalPricingAction(
  action: unknown,
  payload: FastLocalPayload,
  _req: Request,
  res: Response,
): boolean {
  const user = core.getRequestUser(_req);
  if (user?.role === "employee" && ["pricing-advisor", "instant-pricing-calc"].includes(String(action))) {
    res.status(403).json({
      success: false,
      error: "أدوات التسعير والتكلفة محجوبة عن حساب الموظف"
    });
    return true;
  }

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

import express from "express";
import { handleFastLocalLookupAction } from "./fast-local-lookup.ts";
import { handleFastLocalOrderAction } from "./fast-local-orders.ts";
import { handleFastLocalPricingAction } from "./fast-local-pricing.ts";
import { handleFastLocalParserAction } from "./fast-local-parser.ts";
import { handleFastLocalOperationsAction } from "./fast-local-operations.ts";
import { handleFastLocalLaserAction } from "./fast-local-laser.ts";

const FAST_LOCAL_HANDLERS = [
  handleFastLocalLookupAction,
  handleFastLocalOrderAction,
  handleFastLocalPricingAction,
  handleFastLocalParserAction,
  handleFastLocalOperationsAction,
  handleFastLocalLaserAction,
] as const;

export function registerAiFastLocalRoutes(app: express.Express) {
  app.post("/api/ai/fast-local", (req, res) => {
    try {
      const { action, payload } = req.body;
      if (!action) {
        res.status(400).json({ error: "الرجاء تحديد الإجراء المطلوب لمحرك الذكاء الاصطناعي المحلي السريع" });
        return;
      }

      for (const handler of FAST_LOCAL_HANDLERS) {
        if (handler(action, payload, req, res)) return;
      }

      res.status(400).json({ error: "الإجراء غير معروف" });
    } catch (error: unknown) {
      console.error("Fast local AI Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}

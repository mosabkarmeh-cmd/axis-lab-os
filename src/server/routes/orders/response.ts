import express from "express";
import * as core from "../../server-core.ts";

const { getRequestUser } = core;

export function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

function sanitizeForEmployee(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForEmployee);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (EMPLOYEE_HIDDEN_FIELDS.has(key)) {
      if ([
        "unitPrice", "unitPriceSYP", "totalPrice", "totalPriceSYP", "total", "totalSYP",
        "subtotal", "paidAmount", "remaining", "remainingSYP", "amount", "amountSYP", "amountUSD"
      ].includes(key)) result[key] = 0;
      continue;
    }
    result[key] = sanitizeForEmployee(entry);
  }
  return result;
}

function orderForResponse(req: express.Request, order: unknown): unknown {
  return getRequestUser(req)?.role === "employee" ? sanitizeForEmployee(order) : order;
}

function ordersForResponse(req: express.Request, orders: unknown[]): unknown[] {
  return getRequestUser(req)?.role === "employee"
    ? orders.map(order => sanitizeForEmployee(order))
    : orders;
}

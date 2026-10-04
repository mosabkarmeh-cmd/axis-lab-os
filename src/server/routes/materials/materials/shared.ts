import express from "express";
import * as core from "../../server-core.ts";

export function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function isEmployee(req: express.Request): boolean {
  return core.getRequestUser(req)?.role === "employee";
}

export function sanitizeMaterialForEmployee<T extends Record<string, unknown>>(material: T, req: express.Request): T {
  if (!isEmployee(req)) return material;
  const safe = { ...material };
  safe.pricePerUnit = 0;
  delete safe.supplier;
  return safe;
}

export function sanitizeSupplierQuote<T extends Record<string, unknown>>(quote: T, req: express.Request): T {
  if (!isEmployee(req)) return quote;
  const safe = { ...quote };
  delete safe.pricePerUnit;
  return safe;
}

export function sanitizeMaterialCollection<T extends Record<string, unknown>>(materials: T[], req: express.Request): T[] {
  return materials.map(material => sanitizeMaterialForEmployee(material, req));
}

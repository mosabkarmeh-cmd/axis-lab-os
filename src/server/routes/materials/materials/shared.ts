import express from "express";
import * as core from "../../../server-core.ts";

export function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function isEmployee(req: express.Request): boolean {
  const role = core.getRequestUser(req)?.role;
  return role === "employee" || role === "viewer";
}

export function sanitizeMaterialForEmployee<T>(material: T, req: express.Request): T {
  if (!isEmployee(req)) return material;
  const safe = { ...(material as Record<string, unknown>) };
  safe.pricePerUnit = 0;
  delete safe.supplier;
  return safe as T;
}

export function sanitizeSupplierQuote<T>(quote: T, req: express.Request): T {
  if (!isEmployee(req)) return quote;
  const safe = { ...(quote as Record<string, unknown>) };
  delete safe.pricePerUnit;
  return safe as T;
}

export function sanitizeMaterialCollection<T extends Record<string, unknown>>(materials: T[], req: express.Request): T[] {
  return materials.map(material => sanitizeMaterialForEmployee(material, req));
}

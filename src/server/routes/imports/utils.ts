import type express from "express";
import * as core from "../../server-core.ts";

const { getRequestUser } = core;

export function requireImportAdmin(req: express.Request, res: express.Response): boolean {
  const user = getRequestUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ success: false, message: "استيراد البيانات متاح لمدير النظام فقط" });
    return false;
  }
  return true;
}

export const normalizeImportHeader = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/[\s_\-\/()]+/g, "");

export function importCell(row: unknown[], headers: string[], aliases: string[]) {
  const wanted = aliases.map(normalizeImportHeader);
  const index = headers.findIndex((header) => wanted.includes(normalizeImportHeader(header)));
  return index >= 0 ? row[index] ?? "" : "";
}

export function inferImportSheet(name: string, headers: string[]) {
  const normalizedName = normalizeImportHeader(name);
  const normalizedHeaders = headers.map(normalizeImportHeader);
  if (
    normalizedName.includes("تعليمات") ||
    normalizedName.includes("قوائم") ||
    normalizedName.includes("instructions") ||
    normalizedName.includes("lists")
  ) return "ignore";
  if (
    normalizedName.includes("مورد") ||
    normalizedHeaders.includes("كودالمورد") ||
    normalizedHeaders.includes("suppliercode")
  ) return "suppliers";
  if (
    normalizedName.includes("مخزون") ||
    normalizedHeaders.includes("الكميةالافتتاحية") ||
    normalizedHeaders.includes("openingquantity")
  ) return "inventory";
  return "materials";
}

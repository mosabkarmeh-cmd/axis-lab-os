import express from "express";
import * as core from "../../../server-core.ts";

export type InvoiceItem = {
  quantity?: number;
  unitPrice?: number;
  total?: number;
  description?: string;
  productName?: string;
  discount?: number;
  tax?: number;
  [key: string]: unknown;
};

export type InvoiceLike = {
  id: string;
  orderId?: string | null;
  items?: InvoiceItem[];
  totalPrice?: number;
  subtotal?: number;
  paidAmount?: number;
  remaining?: number;
  [key: string]: unknown;
};

export const asInvoiceItem = (value: unknown): InvoiceItem =>
  value && typeof value === "object" ? value as InvoiceItem : {};

export function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

import crypto from "node:crypto";

export function secureId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

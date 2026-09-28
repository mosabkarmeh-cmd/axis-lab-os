import crypto from "node:crypto";

export function secureId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

export function nextEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

let activityLogSequence = 0;
export function nextActivityLogId(prefix = "log"): string {
  activityLogSequence = (activityLogSequence + 1) % 1_000_000;
  return `${prefix}_${Date.now()}_${process.pid}_${activityLogSequence}_${crypto.randomUUID().slice(0, 8)}`;
}

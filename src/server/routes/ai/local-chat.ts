import type { AiStats } from "./local-chat/types.ts";
import { normalizeArabicAndDialect } from "./local-chat/normalization.ts";
import { getCustomerChatResponse } from "./local-chat/customer.ts";
import { getFinanceChatResponse } from "./local-chat/finance.ts";
import { getInventoryChatResponse } from "./local-chat/inventory.ts";
import { getLaserChatResponse } from "./local-chat/laser.ts";
import { getMaintenanceChatResponse } from "./local-chat/maintenance.ts";
import { getSafetyChatResponse } from "./local-chat/safety.ts";
import { getForecastChatResponse } from "./local-chat/forecast.ts";
import { getFallbackChatResponse } from "./local-chat/fallback.ts";

export { normalizeArabicAndDialect } from "./local-chat/normalization.ts";
export type { AiStats } from "./local-chat/types.ts";

export const getLocalChatResponse = (
  message: string,
  stats: AiStats,
  userExchangeRate?: number,
): string => {
  const rate = userExchangeRate || 15000;
  const msgNorm = normalizeArabicAndDialect(message);

  const customerResponse = getCustomerChatResponse(message, stats, rate);
  if (customerResponse) return customerResponse;

  const financeResponse = getFinanceChatResponse(msgNorm, stats, rate);
  if (financeResponse) return financeResponse;

  const inventoryResponse = getInventoryChatResponse(msgNorm, stats);
  if (inventoryResponse) return inventoryResponse;

  const laserResponse = getLaserChatResponse(msgNorm, stats.machinesCount);
  if (laserResponse) return laserResponse;

  const maintenanceResponse = getMaintenanceChatResponse(msgNorm);
  if (maintenanceResponse) return maintenanceResponse;

  const safetyResponse = getSafetyChatResponse(msgNorm);
  if (safetyResponse) return safetyResponse;

  const forecastResponse = getForecastChatResponse(msgNorm, stats, rate);
  if (forecastResponse) return forecastResponse;

  return getFallbackChatResponse();
};

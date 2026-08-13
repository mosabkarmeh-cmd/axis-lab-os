export const DEFAULT_EXCHANGE_RATE = 145;
export const EXCHANGE_RATE_STORAGE_KEY = "axislab_exchange_rate";

export function sanitizeExchangeRate(value: unknown, fallback = DEFAULT_EXCHANGE_RATE): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function usdToSyp(usd: number, exchangeRate: number): number {
  return Math.round(Number(usd || 0) * sanitizeExchangeRate(exchangeRate));
}

export function sypToUsd(syp: number, exchangeRate: number): number {
  const rate = sanitizeExchangeRate(exchangeRate);
  return Number(syp || 0) / rate;
}

export async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch("/api/exchange-rate");
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`);
    const data = await response.json();
    const rate = sanitizeExchangeRate(data?.exchangeRate);
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, String(rate));
    return rate;
  } catch {
    return sanitizeExchangeRate(localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY));
  }
}

export async function updateExchangeRate(value: unknown): Promise<number> {
  const exchangeRate = sanitizeExchangeRate(value);
  const response = await fetch("/api/exchange-rate", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exchangeRate }),
  });
  if (!response.ok) throw new Error("تعذر حفظ سعر الصرف");
  const data = await response.json();
  const savedRate = sanitizeExchangeRate(data?.exchangeRate, exchangeRate);
  localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, String(savedRate));
  window.dispatchEvent(new CustomEvent("axislab:exchange-rate-changed", { detail: savedRate }));
  return savedRate;
}

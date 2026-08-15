import { useEffect, useState } from "react";
import { DEFAULT_EXCHANGE_RATE, sanitizeExchangeRate, sypToUsd, usdToSyp } from "../lib/currency";

export function useCurrencyCalculator(exchangeRate: number) {
  const [calcUsd, setCalcUsd] = useState("100");
  const [calcSyp, setCalcSyp] = useState(() => usdToSyp(100, sanitizeExchangeRate(exchangeRate, DEFAULT_EXCHANGE_RATE)).toString());

  // Keep the displayed SYP amount synchronized when the committed rate changes
  // from another session, on startup, or after a settings refresh.
  useEffect(() => {
    const amount = Number.parseFloat(calcUsd);
    if (!Number.isNaN(amount)) setCalcSyp(usdToSyp(amount, exchangeRate).toString());
  }, [exchangeRate]);

  const handleUsdChange = (value: string) => {
    setCalcUsd(value);
    const amount = Number.parseFloat(value);
    setCalcSyp(Number.isNaN(amount) ? "" : usdToSyp(amount, exchangeRate).toString());
  };

  const handleSypChange = (value: string) => {
    setCalcSyp(value);
    const amount = Number.parseFloat(value);
    setCalcUsd(Number.isNaN(amount) ? "" : sypToUsd(amount, exchangeRate).toFixed(2));
  };

  const refreshFromUsd = (value = calcUsd, rate = exchangeRate) => {
    const amount = Number.parseFloat(value);
    if (!Number.isNaN(amount)) setCalcSyp(usdToSyp(amount, rate).toString());
  };

  return { calcUsd, calcSyp, handleUsdChange, handleSypChange, refreshFromUsd };
}

import { useState } from "react";
import { sanitizeExchangeRate, sypToUsd, usdToSyp } from "../lib/currency";

export function useCurrencyCalculator(exchangeRate: number) {
  const [calcUsd, setCalcUsd] = useState("100");
  const [calcSyp, setCalcSyp] = useState(() => usdToSyp(100, sanitizeExchangeRate(exchangeRate, 145)).toString());

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

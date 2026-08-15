import assert from "node:assert/strict";
import { DEFAULT_EXCHANGE_RATE, sanitizeExchangeRate, sypToUsd, usdToSyp } from "../src/lib/currency";

assert.equal(DEFAULT_EXCHANGE_RATE, 135);
assert.equal(sanitizeExchangeRate("150"), 150);
assert.equal(sanitizeExchangeRate("1500"), 1500);
assert.equal(usdToSyp(100, 135), 13500);
assert.equal(usdToSyp(100, 150), 15000);
assert.equal(usdToSyp(100, 1500), 150000);
assert.equal(sypToUsd(15000, 150), 100);
assert.equal(Number(sypToUsd(150000, 1500).toFixed(2)), 100);

console.log("currency-conversion-smoke: PASS");

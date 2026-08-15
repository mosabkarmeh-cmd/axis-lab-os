import assert from "node:assert/strict";
import { DEFAULT_EXCHANGE_RATE, sanitizeExchangeRate, sypToUsd, usdToSyp } from "../src/lib/currency";
import { materialPriceSYP, materialPriceUSD } from "../src/lib/materials";

assert.equal(DEFAULT_EXCHANGE_RATE, 135);
assert.equal(sanitizeExchangeRate("150"), 150);
assert.equal(sanitizeExchangeRate("1500"), 1500);
assert.equal(usdToSyp(100, 135), 13500);
assert.equal(usdToSyp(100, 150), 15000);
assert.equal(usdToSyp(100, 1500), 150000);
assert.equal(sypToUsd(15000, 150), 100);
assert.equal(Number(sypToUsd(150000, 1500).toFixed(2)), 100);
assert.equal(Number(materialPriceUSD(362500, 135).toFixed(2)), 2685.19);
assert.equal(materialPriceSYP(2685.185185185185, 135), 362500);
assert.equal(Number(materialPriceUSD(45, 135).toFixed(2)), 45);
assert.equal(materialPriceSYP(45, 135), 6075);

console.log("currency-conversion-smoke: PASS");

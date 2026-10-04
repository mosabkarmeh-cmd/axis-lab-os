const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const fail = [];
const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|cjs|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
};
const files = walkFiles(path.join(root, "src")).concat(walkFiles(path.join(root, "desktop")));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/["']u-1["']/.test(source)) fail.push(`${rel}: hardcoded actor id u-1`);
  if (/\bconst\s+\w+\s*:\s*any\b|\b(?:let|var)\s+\w+\s*:\s*any\b|\)\s*:\s*any\b/.test(source)) fail.push(`${rel}: explicit any annotation`);
  if (/executeJavaScript\s*\(/.test(source)) fail.push(`${rel}: forbidden webContents.executeJavaScript usage`);
}

const orderSources = walkFiles(path.join(root, "src/server/routes/orders"))
  .filter(p => p.endsWith(".ts"))
  .map(p => fs.readFileSync(p, "utf8"))
  .join("\n");
for (const field of ["matCost", "finalPrice"]) {
  if (!orderSources.includes(field)) fail.push(`orders route tree missing employee financial boundary marker for ${field}`);
}

const response = read("src/server/routes/orders/response.ts");
for (const field of ["matCost", "finalPrice", "totalPrice", "paidAmount", "remaining"]) {
  if (!response.includes(`"${field}"`)) fail.push(`orders/response.ts missing hidden field ${field}`);
}

const productionShared = read("src/server/routes/production/jobs/shared.ts");
for (const field of ["materialCostUSD", "technicianCostUSD", "totalDirectCostUSD"]) {
  if (!productionShared.includes(field)) fail.push(`production response boundary missing ${field}`);
}

const aiChat = read("src/server/routes/ai/chat.ts");
const aiPricing = read("src/server/routes/ai/fast-local-pricing.ts");
if (!aiChat.includes('getAiAccessScope')) fail.push('AI chat missing role scope enforcement');
if (!aiPricing.includes('role') || !aiPricing.includes('403')) fail.push('AI pricing missing server-side authorization');

if (fail.length) {
  console.error('[STATIC-SOURCE-AUDIT] FAIL');
  for (const item of fail) console.error(' - ' + item);
  process.exit(1);
}
console.log('[STATIC-SOURCE-AUDIT] PASS');

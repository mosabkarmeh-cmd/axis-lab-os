const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|cjs|mjs|js)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const routeFiles = walkFiles(path.join(root, "src/server/routes"));
const runtimeFiles = walkFiles(path.join(root, "src/server/runtime")).filter(file =>
  !["business-state.ts", "core-state.ts", "operational-seeds.ts"].includes(path.basename(file))
);
const actorClientFiles = walkFiles(path.join(root, "src")).filter(file =>
  ![
    "src/App.tsx",
    "src/server/runtime/business-state.ts",
    "src/server/runtime/core-state.ts",
    "src/server/runtime/operational-seeds.ts",
  ].includes(path.relative(root, file))
);

for (const file of routeFiles.concat(runtimeFiles)) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);

  if (/["']u-1["']/.test(source)) {
    fail.push(\`\${rel}: hardcoded actor id u-1\`);
  }
  if (/\\bconst\\s+\\w+\\s*:\\s*any\\b|\\b(?:let|var)\\s+\\w+\\s*:\\s*any\\b|\\)\\s*:\\s*any\\b/.test(source)) {
    fail.push(\`\${rel}: explicit any annotation in backend\`);
  }
}

for (const file of actorClientFiles) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/["']u-1["']/.test(source)) {
    fail.push(\`\${rel}: hardcoded actor id u-1\`);
  }
}

for (const file of walkFiles(path.join(root, "src")).concat(walkFiles(path.join(root, "desktop")))) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/executeJavaScript\\s*\\(/.test(source)) {
    fail.push(\`\${rel}: forbidden webContents.executeJavaScript usage\`);
  }
}

const orderSources = walkFiles(path.join(root, "src/server/routes/orders"))
  .filter(file => file.endsWith(".ts"))
  .map(file => fs.readFileSync(file, "utf8"))
  .join("\\n");

for (const field of ["matCost", "finalPrice"]) {
  if (!orderSources.includes(field)) {
    fail.push(\`orders route tree missing employee financial boundary marker for \${field}\`);
  }
}

const response = read("src/server/routes/orders/response.ts");
for (const field of ["matCost", "finalPrice", "totalPrice", "paidAmount", "remaining"]) {
  if (!response.includes(\`"\${field}"\`)) {
    fail.push(\`orders/response.ts missing hidden field \${field}\`);
  }
}

const productionShared = read("src/server/routes/production/jobs/shared.ts");
for (const field of ["materialCostUSD", "technicianCostUSD", "totalDirectCostUSD"]) {
  if (!productionShared.includes(field)) {
    fail.push(\`production response boundary missing \${field}\`);
  }
}

const aiChat = read("src/server/routes/ai/chat.ts");
const aiPricing = read("src/server/routes/ai/fast-local-pricing.ts");
if (!aiChat.includes("getAiAccessScope")) fail.push("AI chat missing role scope enforcement");
if (!aiPricing.includes("role") || !aiPricing.includes("403")) fail.push("AI pricing missing server-side authorization");

if (fail.length) {
  console.error("[STATIC-SOURCE-AUDIT] FAIL");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("[STATIC-SOURCE-AUDIT] PASS");

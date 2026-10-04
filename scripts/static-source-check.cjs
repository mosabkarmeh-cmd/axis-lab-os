const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function walk(dir, output) {
  const result = output || [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, result);
    } else if (/\.(ts|tsx|js|cjs|mjs)$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

const routeFiles = walk(path.join(ROOT, "src/server/routes"));
const runtimeFiles = walk(path.join(ROOT, "src/server/runtime")).filter(function (file) {
  return !["business-state.ts", "core-state.ts", "operational-seeds.ts"].includes(path.basename(file));
});
const clientFiles = walk(path.join(ROOT, "src")).filter(function (file) {
  const rel = path.relative(ROOT, file);
  if (rel === "src/App.tsx") return false;
  return !file.includes(path.join("src", "server") + path.sep);
});

for (const file of routeFiles.concat(runtimeFiles)) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);

  if (/['"]u-1['"]/.test(source)) {
    failures.push(rel + ": hardcoded actor id u-1");
  }

  if (/\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*any\b/.test(source) ||
      /\)\s*:\s*any\b/.test(source)) {
    failures.push(rel + ": explicit any annotation in backend");
  }
}

for (const file of clientFiles) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  if (/['"]u-1['"]/.test(source)) {
    failures.push(rel + ": hardcoded actor id u-1");
  }
}

for (const file of walk(path.join(ROOT, "src")).concat(walk(path.join(ROOT, "desktop")))) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  if (/executeJavaScript\s*\(/.test(source)) {
    failures.push(rel + ": forbidden webContents.executeJavaScript usage");
  }
}

const orderSources = routeFiles.filter(function (file) {
  return file.split(path.sep).includes("orders");
}).map(function (file) {
  return fs.readFileSync(file, "utf8");
}).join("\n");

for (const field of ["matCost", "finalPrice"]) {
  if (!orderSources.includes(field)) {
    failures.push("orders route tree missing employee financial boundary marker for " + field);
  }
}

const response = read("src/server/routes/orders/response.ts");
for (const field of ["matCost", "finalPrice", "totalPrice", "paidAmount", "remaining"]) {
  if (!response.includes(field)) {
    failures.push("orders/response.ts missing hidden field " + field);
  }
}

const productionShared = read("src/server/routes/production/jobs/shared.ts");
for (const field of ["materialCostUSD", "technicianCostUSD", "totalDirectCostUSD"]) {
  if (!productionShared.includes(field)) {
    failures.push("production response boundary missing " + field);
  }
}

const aiChat = read("src/server/routes/ai/chat.ts");
const aiPricing = read("src/server/routes/ai/fast-local-pricing.ts");

if (!aiChat.includes("getAiAccessScope")) {
  failures.push("AI chat missing role scope enforcement");
}
if (!aiPricing.includes("getRequestUser") || !aiPricing.includes("403")) {
  failures.push("AI pricing missing server-side authorization");
}

if (failures.length > 0) {
  console.error("[STATIC-SOURCE-AUDIT] FAIL");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("[STATIC-SOURCE-AUDIT] PASS");

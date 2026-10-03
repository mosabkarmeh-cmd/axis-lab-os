const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, ".."); // CI verification branch
const fail = (message) => { console.error("[STATIC-SOURCE-AUDIT] FAIL:", message); process.exitCode = 1; };
const files = [];
const scanRoots = ["src", "desktop"];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|cjs|mjs|js)$/.test(entry.name)) files.push(full);
  }
};
for (const rel of scanRoots) walk(path.join(root, rel));

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/["']u-1["']/.test(source)) fail(`${rel}: hardcoded actor id u-1`);
  if (/\bconst\s+\w+\s*:\s*any\b|\b(?:let|var)\s+\w+\s*:\s*any\b|\)\s*:\s*any\b/.test(source)) fail(`${rel}: explicit any annotation`);
  if (/executeJavaScript\s*\(/.test(source)) fail(`${rel}: forbidden webContents.executeJavaScript usage`);
}
const orders = fs.readFileSync(path.join(root, "src/server/routes/orders.ts"), "utf8");
for (const field of ["matCost", "finalPrice"]) {
  if (!orders.includes(field)) fail(`orders.ts missing employee financial field boundary for ${field}`);
}
if (!process.exitCode) console.log("[STATIC-SOURCE-AUDIT] PASS");

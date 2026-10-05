const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = (message) => { console.error("[ROUTE-DEPENDENCY-AUDIT] FAIL:", message); process.exitCode = 1; };
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const core = read("src/server/server-core.ts");
const exported = new Set();
for (const match of core.matchAll(/\bexport\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g)) exported.add(match[1]);
for (const match of core.matchAll(/\bexport\s*\{([^}]+)\}/gs)) {
  for (const part of match[1].split(",")) {
    const name = part.trim().split(/\s+as\s+/)[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) exported.add(name);
  }
}

const routeDir = path.join(root, "src/server/routes");
const routeFiles = [];
const walkRoutes = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRoutes(full);
    else if (entry.name.endsWith(".ts")) routeFiles.push(full);
  }
};
walkRoutes(routeDir);

for (const fullPath of routeFiles) {
  const source = fs.readFileSync(fullPath, "utf8");
  const rel = path.relative(root, fullPath);
  const matches = source.matchAll(/\b(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*core\s*;/g);
  for (const match of matches) {
    for (const part of match[1].split(",")) {
      const local = part.trim().split("=")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(local) && !exported.has(local)) {
        fail(`${rel} depends on non-exported server-core symbol: ${local}`);
      }
    }
  }
}
if (!process.exitCode) console.log("[ROUTE-DEPENDENCY-AUDIT] PASS");

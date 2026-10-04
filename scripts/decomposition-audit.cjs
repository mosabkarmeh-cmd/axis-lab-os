const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = (message) => { console.error("[DECOMPOSITION-AUDIT] FAIL:", message); process.exitCode = 1; };
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const index = read("src/server/routes/index.ts");
const routeRoot = path.join(root, "src/server/routes");
const routeFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".ts")) routeFiles.push(full);
  }
};
walk(routeRoot);

const registrations = [...index.matchAll(/register[A-Za-z0-9]+Routes\(app\)/g)].map((m) => m[0]);
if (routeFiles.length < 25) fail(`expected extracted route modules, found ${routeFiles.length}`);
if (registrations.length < 10) fail(`expected route registrations, found ${registrations.length}`);
if (index.length > 25000) fail("route composition root is unexpectedly large");

for (const fullPath of routeFiles) {
  const source = fs.readFileSync(fullPath, "utf8");
  const rel = path.relative(root, fullPath);
  for (const match of source.matchAll(/from\s+["'](\.\.?\/[^"']+\.ts)["']/g)) {
    const target = path.resolve(path.dirname(fullPath), match[1]);
    if (!fs.existsSync(target)) fail(`${rel}: broken local import ${match[1]}`);
  }
  if (/const\s*\{[\s\S]*?\}\s*=\s*core\s*;/.test(source) && !source.includes("server-core.ts")) {
    fail(`${rel}: core destructuring without server-core import`);
  }
}

if (!process.exitCode) console.log("[DECOMPOSITION-AUDIT] PASS");

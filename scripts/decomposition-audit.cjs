const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fail = (message) => { console.error("[DECOMPOSITION-AUDIT] FAIL:", message); process.exitCode = 1; };
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const index = read("src/server/routes/index.ts");
const routeDir = path.join(root, "src/server/routes");
const routeFiles = fs.readdirSync(routeDir).filter((name) => name.endsWith(".ts") && name !== "index.ts");
const registrations = [...index.matchAll(/register[A-Za-z0-9]+Routes\(app\)/g)].map((m) => m[0]);

if (routeFiles.length < 10) fail(`expected extracted route modules, found ${routeFiles.length}`);
if (registrations.length < 10) fail(`expected route registrations, found ${registrations.length}`);
if (index.length > 25000) fail("route composition root is unexpectedly large");
for (const name of routeFiles) {
  const source = read(path.join("src/server/routes", name));
  if (/\bconst\s*\{[\s\S]*?\}\s*=\s*core\s*;/.test(source) && !source.includes('from "../server-core.ts"')) {
    fail(`${name} uses core destructuring without server-core import`);
  }
}
if (!process.exitCode) console.log("[DECOMPOSITION-AUDIT] PASS");

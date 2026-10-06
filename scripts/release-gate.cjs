const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const fail = (message) => {
  console.error("[RELEASE-GATE] FAIL:", message);
  process.exitCode = 1;
};
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const requiredFiles = [
  "desktop/main.cjs",
  "desktop/preload.cjs",
  "electron-builder.yml",
  "assets/icon.ico",
  "src/server/server-core.ts",
  "src/server/routes/index.ts",
  "tests/static-security-audit.cjs",
  "tests/desktop-security-smoke.cjs",
];

if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) fail("package.json version is not valid semver");
if (lock.version !== pkg.version || lock.packages?.[""]?.version !== pkg.version) {
  fail("package-lock.json version does not match package.json");
}
for (const file of requiredFiles) {
  if (!exists(file)) fail("missing required release file: " + file);
}

const builder = read("electron-builder.yml");
for (const required of ["appId: com.axislab.os", "productName: AXIS LAB OS", "target:", "nsis:", "extraResources:"]) {
  if (!builder.includes(required)) fail("electron-builder.yml missing " + required);
}
if (!builder.includes("from: dist/server.cjs")) fail("packaged server resource is missing");
if (!builder.includes("from: node_modules/sql.js/dist/sql-wasm.wasm")) fail("SQLite WASM resource is missing");

const desktop = read("desktop/main.cjs");
if (/initialPassword\s*=\s*["'](?:12345|admin123|password)["']/.test(desktop)) {
  fail("hardcoded bootstrap password detected");
}
if (!desktop.includes("getBootstrapAdminPassword")) fail("bootstrap password generation path missing");
if (!desktop.includes("getDesktopJwtSecret")) fail("desktop JWT secret generation path missing");

const auth = read("src/server/routes/auth.ts");
if (/res\.json\(\{[^}]*token\s*[,}]/s.test(auth)) fail("JWT is returned directly in authentication JSON");
if (!auth.includes('res.cookie("axislab_token"')) fail("HttpOnly authentication cookie path missing");

const server = read("server.ts");
if (server.includes('path.join(process.cwd(), "Amiri-Regular.ttf")')) fail("unstable production font path remains");
if (server.includes('path.join(process.cwd(), "node_modules", "sql.js"')) fail("unstable production SQLite WASM path remains");

const scripts = pkg.scripts || {};
for (const key of [
  "build",
  "lint",
  "test:pre-release",
  "test:security-static",
  "test:desktop-security",
  "test:employee-boundary",
  "test:rbac-workflow",
  "desktop:package:win",
]) {
  if (!scripts[key]) fail("required npm script missing: " + key);
}

if (process.exitCode) process.exit(process.exitCode);

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (label, args) => {
  console.log("[RELEASE-GATE] RUN:", label);
  const result = spawnSync(npm, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error("[RELEASE-GATE] FAIL:", label);
    process.exit(result.status ?? 1);
  }
};

if (process.env.AXIS_RELEASE_SKIP_BUILD !== "1") {
  run("build", ["run", "build"]);
}
run("lint", ["run", "lint"]);
run("pricing engine", ["exec", "tsx", "tests/financial-pricing-engine-smoke.ts"]);
run("pre-release audits", ["run", "test:pre-release"]);
run("employee financial boundary", ["exec", "node", "--", "tests/employee-financial-boundary-smoke.cjs"]);
run("workflow RBAC", ["exec", "node", "--", "tests/rbac-workflow-integration-smoke.cjs"]);
run("production completion", ["exec", "node", "--", "tests/production-completion-smoke.cjs"]);
run("inventory guards", ["exec", "node", "--", "tests/inventory-guards-smoke.cjs"]);
run("payment/G-code regression", ["exec", "node", "--", "tests/payment-gcode-regression-smoke.cjs"]);

console.log("[RELEASE-GATE] PASS: source, security, type-check, runtime smoke, and desktop prerequisites are green.");

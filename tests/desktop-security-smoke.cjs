const fs = require("node:fs");
const path = require("node:path");

const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const main = fs.readFileSync(path.resolve(__dirname, "../desktop/main.cjs"), "utf8");
const preload = fs.readFileSync(path.resolve(__dirname, "../desktop/preload.cjs"), "utf8");
const authRoutes = fs.readFileSync(path.resolve(__dirname, "../src/server/routes/index.ts"), "utf8");
const auth = fs.readFileSync(path.resolve(__dirname, "../src/server/auth.ts"), "utf8");

assert(/contextIsolation:\s*true/.test(main), "context isolation is not enabled");
assert(/nodeIntegration:\s*false/.test(main), "nodeIntegration must be disabled");
assert(/sandbox:\s*true/.test(main), "renderer sandbox is not enabled");
assert(!preload.includes("nodeIntegration"), "preload must not expose node integration");

assert(/res\.cookie\(["']axislab_token["']/.test(authRoutes), "login must establish the authentication cookie");
assert(!/res\.json\(\{\s*token\s*,/.test(authRoutes), "login must not return JWT in JSON");
assert(!/res\.json\(\{[^}]*token\s*\}/s.test(authRoutes.match(/app\.post\(["']\/api\/test\/gui-session["'][\s\S]*?\n\s*\}\);/)?.[0] || ""), "GUI test session must not return JWT in JSON");
assert(/httpOnly:\s*true/.test(authRoutes), "authentication cookie must be HttpOnly");
assert(/sameSite:\s*["']lax["']/.test(authRoutes), "authentication cookie must define SameSite");
assert(/getVerifiedRequestUser\(req: Request\)/.test(auth), "request authentication must use the Express Request type");
assert(!/getVerifiedRequestUser\(req:\s*any\)/.test(auth), "request authentication must not use any");

assert(!/webContents\.executeJavaScript\(/.test(main), "desktop main must not inject arbitrary renderer JavaScript");
assert(/setWindowOpenHandler/.test(main), "external window handling must be explicitly controlled");

console.log("desktop-security-smoke: PASS");

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const dataDir = process.env.AXIS_DATA_DIR || path.join(appData, "axis-lab-os-central");
const port = Number(process.env.AXIS_PORT || process.env.PORT || 3210);
const host = process.env.AXIS_SERVER_HOST || process.env.SERVER_HOST || "0.0.0.0";

fs.mkdirSync(dataDir, { recursive: true });
function persistentSecret(fileName, bytes = 48) {
  const filePath = path.join(dataDir, fileName);
  try {
    const existing = fs.readFileSync(filePath, "utf8").trim();
    if (existing) return existing;
  } catch {}
  const value = crypto.randomBytes(bytes).toString("hex");
  fs.writeFileSync(filePath, value, "utf8");
  return value;
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: "sqlite",
  SERVER_HOST: host,
  PORT: String(port),
  APP_URL: process.env.APP_URL || `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
  AXIS_DATA_FILE: path.join(dataDir, "axis-data.sqlite"),
  AXIS_LEGACY_DATA_FILE: path.join(dataDir, "axis-data.json"),
  SQLITE_WASM_PATH: process.env.SQLITE_WASM_PATH || path.join(root, "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  JWT_SECRET: process.env.JWT_SECRET || persistentSecret("jwt-secret"),
  BOOTSTRAP_ADMIN_PASSWORD: process.env.BOOTSTRAP_ADMIN_PASSWORD || persistentSecret("bootstrap-admin-password", 16),
  ALLOW_PUBLIC_REGISTRATION: "false",
};

const server = spawn(process.execPath, [path.join(root, "dist", "server.cjs")], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: false,
});

console.log(`[AXIS CENTRAL] data: ${env.AXIS_DATA_FILE}`);
console.log(`[AXIS CENTRAL] listening: http://${host}:${port}`);
console.log(`[AXIS CENTRAL] health: http://<SERVER-IP>:${port}/api/health`);
console.log("[AXIS CENTRAL] Keep this computer running; client devices must use the server IP and must not open the SQLite file directly.");

const shutdown = (signal) => {
  if (!server.killed) server.kill(signal);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

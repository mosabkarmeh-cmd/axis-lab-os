const path = require("node:path");
const { spawn } = require("node:child_process");

const remoteUrl = String(process.argv[2] || process.env.AXIS_REMOTE_URL || "").replace(/\/+$/, "");
if (!/^https?:\/\/[\w.-]+(?::\d+)?$/.test(remoteUrl)) {
  console.error("Usage: node scripts/start-network-client.cjs http://SERVER-IP:3210");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const client = spawn(process.execPath, [path.join(root, "desktop", "main.cjs")], {
  cwd: root,
  env: { ...process.env, AXIS_REMOTE_URL: remoteUrl },
  stdio: "inherit",
  windowsHide: false,
});

client.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

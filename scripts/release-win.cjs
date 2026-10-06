#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (args, label) => {
  console.log("[RELEASE-WIN] " + label);
  const result = spawnSync(npm, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(["run", "test:release-gate"], "running release gate");
run(["exec", "electron-builder", "--", "--win", "nsis", "--config", "electron-builder.yml", "--publish", "never"], "building Windows NSIS installer");
console.log("[RELEASE-WIN] PASS");

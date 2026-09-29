const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const runtimeDir = path.join(root, '.runtime');

fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeDir, { recursive: true });

for (const file of ['package.json', 'package-lock.json']) {
  fs.copyFileSync(path.join(root, file), path.join(runtimeDir, file));
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'], {
  cwd: runtimeDir,
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) process.exit(result.status ?? 1);

console.log('[RUNTIME] Prepared production dependencies in ' + runtimeDir);

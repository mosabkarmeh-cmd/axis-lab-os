const { spawnSync } = require('node:child_process');
const checks = [
  ['architecture','scripts/architecture-audit.cjs'],
  ['decomposition','scripts/decomposition-audit.cjs'],
  ['route-dependency','scripts/route-dependency-audit.cjs'],
  ['static-source','scripts/static-source-check.cjs'],
  ['static-security','tests/static-security-audit.cjs'],
  ['desktop-security','tests/desktop-security-smoke.cjs'],
];
for (const [name,file] of checks) {
  const result = spawnSync(process.execPath,[file],{cwd:process.cwd(),stdio:'inherit'});
  if (result.status !== 0) { console.error(`[PRE-RELEASE-AUDIT] FAIL: ${name}`); process.exit(result.status ?? 1); }
}
console.log('[PRE-RELEASE-AUDIT] PASS');

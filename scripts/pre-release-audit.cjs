const { spawnSync } = require('node:child_process');
const releaseWorkflow = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../.github/workflows/release.yml'), 'utf8');
if (!releaseWorkflow.includes("name: Windows CI")) {
  console.error('[PRE-RELEASE-AUDIT] FAIL: Windows CI is not part of release validation');
  process.exit(1);
}
if (!releaseWorkflow.includes("name: Electron GUI Smoke")) {
  console.error('[PRE-RELEASE-AUDIT] FAIL: Electron GUI Smoke is not part of release validation');
  process.exit(1);
}
if (!releaseWorkflow.includes("name: Windows Unpacked QA")) {
  console.error('[PRE-RELEASE-AUDIT] FAIL: Windows Unpacked QA is not part of release validation');
  process.exit(1);
}
if (!releaseWorkflow.includes("Release signing gate") || !releaseWorkflow.includes("CSC_CERT_BASE64") || !releaseWorkflow.includes("Official GitHub Releases are blocked")) {
  console.error('[PRE-RELEASE-AUDIT] FAIL: official release signing gate is missing');
  process.exit(1);
}

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

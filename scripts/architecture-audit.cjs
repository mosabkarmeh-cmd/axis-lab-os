const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error('[ARCHITECTURE-AUDIT] FAIL:', message); process.exitCode = 1; };
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
if (!/^0\.\d+\.\d+$/.test(pkg.version)) fail(`invalid package.json version: ${pkg.version}`);
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) fail('package-lock version mismatch');
for (const rel of ['src/server/routes/customers.ts','src/server/routes/products.ts','src/server/routes/materials.ts','src/server/routes/production.ts']) {
  if (!fs.existsSync(path.join(root, rel))) fail('missing '+rel);
}
console.log('[ARCHITECTURE-AUDIT] PASS');

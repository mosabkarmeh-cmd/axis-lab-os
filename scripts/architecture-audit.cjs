const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error('[ARCHITECTURE-AUDIT] FAIL:', message); process.exitCode = 1; };
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
if (pkg.version !== '0.14.0') fail('package.json version mismatch');
if (lock.version !== '0.14.0' || lock.packages?.['']?.version !== '0.14.0') fail('package-lock version mismatch');
for (const rel of ['src/server/routes/customers.ts','src/server/routes/products.ts','src/server/routes/materials.ts','src/server/routes/production.ts']) {
  if (!fs.existsSync(path.join(root, rel))) fail('missing '+rel);
}
console.log('[ARCHITECTURE-AUDIT] PASS');

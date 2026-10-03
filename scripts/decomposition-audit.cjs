const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = [
  'src/server/app.ts',
  'src/server/server-core.ts',
  'src/server/routes/index.ts',
  'src/server/routes/customers.ts',
  'src/server/routes/products.ts',
  'src/server/routes/materials.ts',
  'src/server/routes/production.ts',
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) { console.error('[DECOMPOSITION-AUDIT] FAIL'); missing.forEach(file => console.error(' - missing '+file)); process.exit(1); }
const core = fs.readFileSync(path.join(root, 'src/server/server-core.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/server/app.ts'), 'utf8');
const explicitAny = /(^|[=:<(,])\\s*any\\b|\\bas\\s+any\\b|catch\\s*\\(\\s*\\w+\\s*:\s*any\\s*\\)/m;
if (explicitAny.test(core) || explicitAny.test(app)) { console.error('[DECOMPOSITION-AUDIT] FAIL: explicit any remains in core/app'); process.exit(1); }
if (/router\\.(get|post|put|patch|delete)\\s*\\(/.test(core)) { console.error('[DECOMPOSITION-AUDIT] FAIL: server-core defines route handlers'); process.exit(1); }
console.log('[DECOMPOSITION-AUDIT] PASS');

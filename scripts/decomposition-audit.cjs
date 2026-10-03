const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = ['src/server/app.ts','src/server/server-core.ts','src/server/routes/customers.ts','src/server/routes/products.ts','src/server/routes/materials.ts','src/server/routes/production.ts'];
const missing = required.filter(file => !fs.existsSync(path.join(root,file)));
if (missing.length) { console.error('[DECOMPOSITION-AUDIT] FAIL'); missing.forEach(file => console.error(' - missing '+file)); process.exit(1); }
const core = fs.readFileSync(path.join(root,'src/server/server-core.ts'),'utf8');
if (/\bany\b/.test(core)) { console.error('[DECOMPOSITION-AUDIT] FAIL: explicit any remains in server-core.ts'); process.exit(1); }
console.log('[DECOMPOSITION-AUDIT] PASS');

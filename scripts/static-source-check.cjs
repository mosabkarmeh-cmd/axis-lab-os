const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const files = ['src/server/server-core.ts','src/server/routes/customers.ts','src/server/routes/products.ts','src/server/routes/materials.ts','src/server/routes/production.ts'];
const failures=[];
for(const rel of files){const source=fs.readFileSync(path.join(root,rel),'utf8'); if (/\bany\b/.test(source)) failures.push(rel+' contains explicit any');}
if(failures.length){console.error('[STATIC-SOURCE-CHECK] FAIL'); failures.forEach(x=>console.error(' - '+x)); process.exit(1);}
console.log('[STATIC-SOURCE-CHECK] PASS');

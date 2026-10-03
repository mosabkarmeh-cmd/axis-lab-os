const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const routes = ['customers','products','materials','production'];
for (const name of routes) {
  const file = path.join(root,'src/server/routes',name+'.ts');
  if (!fs.existsSync(file)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: missing '+file); process.exit(1); }
  const source = fs.readFileSync(file,'utf8');
  for (const dependency of ['express','drizzle-orm']) if (!source.includes(dependency)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: '+name+' missing '+dependency); process.exit(1); }
}
console.log('[ROUTE-DEPENDENCY-AUDIT] PASS');

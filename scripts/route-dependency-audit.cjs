const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const routes = ['customers','products','materials','production'];
const forbidden = [/from ['"](?:\\.\\.\\/)+app\\.ts['"]/i,/from ['"](?:\\.\\.\\/)+server-core\\.ts['"]/i,/from ['"](?:\\.\\.\\/)+server\\.ts['"]/i];
for (const name of routes) {
  const file = path.join(root, 'src/server/routes', name+'.ts');
  if (!fs.existsSync(file)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: missing '+file); process.exit(1); }
  const source = fs.readFileSync(file, 'utf8');
  if (!/import\\s+express\\s+from ['"]express['"]/.test(source)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: '+name+' is not an Express route module'); process.exit(1); }
  if (!/export\\s+default\\s+router\\s*;/.test(source)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: '+name+' does not export its router'); process.exit(1); }
  if (forbidden.some(pattern => pattern.test(source))) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: '+name+' imports a server/bootstrap module'); process.exit(1); }
  if (/(^|[=:<(,])\\s*any\\b|\\bas\\s+any\\b|catch\\s*\\(\\s*\\w+\\s*:\s*any\\s*\)/m.test(source)) { console.error('[ROUTE-DEPENDENCY-AUDIT] FAIL: explicit any in '+name); process.exit(1); }
}
console.log('[ROUTE-DEPENDENCY-AUDIT] PASS');

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = [
  'src/server/server-core.ts',
  'src/server/app.ts',
  'src/server/routes/customers.ts',
  'src/server/routes/products.ts',
  'src/server/routes/materials.ts',
  'src/server/routes/production.ts',
];
const failures = [];
const explicitAny = /(^|[=:<(,])\\s*any\\b|\\bas\\s+any\\b|catch\\s*\\(\\s*\\w+\\s*:\s*any\\s*\)/m;
for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { failures.push(rel+' is missing'); continue; }
  const source = fs.readFileSync(file, 'utf8');
  if (explicitAny.test(source)) failures.push(rel+' contains explicit any');
}
const install = path.join(root, 'install.bat');
if (fs.existsSync(install)) {
  const source = fs.readFileSync(install, 'utf8');
  if (/password\\s*=\\s*[^%\\r\\n]*(?:dev_pass|password|admin123)/i.test(source)) failures.push('install.bat contains a hardcoded password');
}
if (failures.length) { console.error('[STATIC-SOURCE-CHECK] FAIL'); failures.forEach(x => console.error(' - '+x)); process.exit(1); }
console.log('[STATIC-SOURCE-CHECK] PASS');

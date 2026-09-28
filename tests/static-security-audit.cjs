const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = [];
const main = read('src/main.tsx');
const auth = read('src/hooks/useAuthActions.ts');
const desktop = read('desktop/main.cjs');
const install = read('install.bat');
if (main.includes('localStorage.getItem("axislab_token")')) fail.push('renderer reads JWT from localStorage');
if (auth.includes('localStorage.setItem("axislab_token"')) fail.push('renderer persists JWT in localStorage');
if (auth.includes('document.cookie = `axislab_token=${data.token}')) fail.push('renderer writes auth cookie directly');
if (/initialPassword\s*=\s*['"]12345['"]/.test(desktop)) fail.push('default bootstrap password remains hardcoded');
if (install.includes('admin@axislab.com / admin123') || install.includes('employee@axislab.com / employee123')) fail.push('installer docs expose obsolete default credentials');
const server = read('server.ts');
if (server.includes('path.join(process.cwd(), "Amiri-Regular.ttf")')) fail.push('server has unstable font path');
if (server.includes('path.join(process.cwd(), "node_modules", "sql.js"')) fail.push('server has unstable wasm path');
if (fail.length) { console.error('[STATIC-SECURITY-AUDIT] FAIL'); for (const item of fail) console.error(' - '+item); process.exit(1); }
console.log('[STATIC-SECURITY-AUDIT] PASS');

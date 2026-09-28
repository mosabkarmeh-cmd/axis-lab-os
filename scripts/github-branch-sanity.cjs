const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const fail=[];
const pkg=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
if(pkg.version!=='0.15.0') fail.push('package.json version must be 0.15.0');
if(lock.version!=='0.15.0' || lock.packages?.['']?.version!=='0.15.0') fail.push('package-lock version must be 0.15.0');
const auth=read('src/hooks/useAuthActions.ts');
if(auth.includes('localStorage.setItem("axislab_token"')||auth.includes('document.cookie =')) fail.push('renderer must not persist/write JWT cookie');
if(!auth.includes('/api/auth/logout')) fail.push('server-side logout endpoint is not used');
const desktop=read('desktop/main.cjs');
if(/initialPassword\s*=\s*['"]12345['"]/.test(desktop)) fail.push('hardcoded bootstrap password remains');
if(!desktop.includes('contextIsolation: true')||!desktop.includes('nodeIntegration: false')||!desktop.includes('sandbox: true')) fail.push('Electron security baseline missing');
if(fail.length){console.error('[GITHUB-BRANCH-SANITY] FAIL');fail.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log('[GITHUB-BRANCH-SANITY] PASS');

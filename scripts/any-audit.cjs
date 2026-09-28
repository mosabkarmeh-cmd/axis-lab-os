const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const maxAllowed = 690;
let count = 0;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.runtime'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(ent.name)) {
      const text = fs.readFileSync(full, 'utf8');
      count += [...text.matchAll(/\bany\b/g)].length;
    }
  }
}
walk(root);
if (count > maxAllowed) {
  console.error(`[ANY-AUDIT] FAIL: ${count} explicit 'any' tokens > ${maxAllowed} allowed.`);
  process.exit(1);
}
console.log(`[ANY-AUDIT] PASS: ${count} 'any' tokens (limit ${maxAllowed}).`);
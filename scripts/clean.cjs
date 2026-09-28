const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const target of ['dist', 'server.js', '.runtime']) fs.rmSync(path.join(root, target), { recursive: true, force: true });
console.log('[CLEAN] Removed build artifacts and runtime staging directory.');

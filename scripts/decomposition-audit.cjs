const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lineCount = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).length;
const failures = [];
const thresholds = {
  'server.ts': 1000,
  'src/App.tsx': 2200,
  'src/components/GlobalDialogs.tsx': 250,
  'src/components/SettingsView.tsx': 1200,
  'src/components/settings/SettingsContent.tsx': 200,
  'src/components/settings/SettingsFormTabs.tsx': 1500,
  'src/components/settings/SettingsAdvancedTabs.tsx': 1600,
  'src/components/AccountingView.tsx': 1800,
  'src/components/accounting/AccountingModals.tsx': 1400,
  'src/components/InventoryPage.tsx': 2200,
  'src/components/inventory/InventoryProductsWorkspace.tsx': 2000,
  'src/components/inventory/InventoryGcodeWorkspace.tsx': 400,
  'src/components/AIHubPage.tsx': 1500,
  'src/components/ProductionJobView.tsx': 1600,
  'src/components/AddOrderModal.tsx': 1500,
};
for (const [rel,max] of Object.entries(thresholds)) {
  if (!fs.existsSync(path.join(root,rel))) failures.push(`missing decomposition target: ${rel}`);
  else { const n=lineCount(rel); if(n>max) failures.push(`${rel}: ${n} lines > ${max}`); }
}
for (const rel of [
  'src/components/LoginScreen.tsx','src/components/OrderTeamRatingPanel.tsx','src/components/OrderPrintModal.tsx',
  'src/components/ShareOrderModal.tsx','src/components/CommandPalette.tsx','src/components/EntityFilesModals.tsx',
  'src/components/QuickActionsFab.tsx','src/components/CutProgressModal.tsx','src/server/services/financial.ts',
  'src/server/services/pdf.ts','src/server/services/ids.ts'
]) if(!fs.existsSync(path.join(root,rel))) failures.push(`missing extracted module: ${rel}`);
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','dist','.git','.runtime'].includes(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(/\.(ts|tsx)$/.test(ent.name)){
      const rel=path.relative(root,full), n=lineCount(rel);
      if(n>2200) failures.push(`${rel}: ${n} lines exceeds hard ceiling of 2200`);
    }
  }
}
walk(root);
if(failures.length){console.error('[DECOMPOSITION-AUDIT] FAIL'); failures.forEach(f=>console.error(' - '+f)); process.exit(1);}
console.log('[DECOMPOSITION-AUDIT] PASS');
for(const rel of Object.keys(thresholds)) console.log(` - ${rel}: ${lineCount(rel)} lines`);
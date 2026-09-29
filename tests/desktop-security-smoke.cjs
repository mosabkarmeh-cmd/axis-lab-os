const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const { getBootstrapAdminPassword, getDesktopJwtSecret } = require('../desktop/security.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'axis-desktop-security-'));
try {
  const userData = path.join(temp, 'userData');
  const dataFile = path.join(userData, 'axis-data.sqlite');
  const first = getBootstrapAdminPassword(userData, dataFile);
  assert(first.created && first.password.length >= 20, 'first launch should create a strong bootstrap password');
  const second = getBootstrapAdminPassword(userData, dataFile);
  assert(second.password === first.password, 'bootstrap password must persist');
  fs.writeFileSync(dataFile, 'persisted');
  fs.rmSync(first.path, { force: true });
  const afterPersistence = getBootstrapAdminPassword(userData, dataFile);
  assert(afterPersistence.password === '' && afterPersistence.created === false, 'persisted install must not create a new bootstrap password');
  const secret1 = getDesktopJwtSecret(userData, '');
  const secret2 = getDesktopJwtSecret(userData, '');
  assert(secret1.length >= 32 && secret1 === secret2, 'desktop JWT secret must persist');
  console.log('desktop-security-smoke: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
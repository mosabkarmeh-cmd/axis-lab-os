const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");

const root = process.cwd();
const secret = "axis-backup-files-secret-01234567890123456789";
let port;
let tempDir;
let dataFile;
let server;
let logs = "";

function allocateFreePort() {
  return new Promise((resolve, reject) => {
    const net = require("node:net");
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const assigned = address && typeof address === "object" ? address.port : null;
      probe.close(error => error ? reject(error) : assigned ? resolve(assigned) : reject(new Error("Could not allocate a free TCP port")));
    });
  });
}

function start() {
  server = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DB_MODE: "sqlite",
      PORT: String(port),
      SERVER_HOST: "127.0.0.1",
      APP_URL: `http://127.0.0.1:${port}`,
      ALLOW_PUBLIC_REGISTRATION: "false",
      JWT_SECRET: secret,
      AXIS_DATA_FILE: dataFile,
      AXIS_LEGACY_DATA_FILE: path.join(tempDir, "missing.json"),
      SQLITE_WASM_PATH: path.resolve("node_modules/sql.js/dist/sql-wasm.wasm"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { logs += chunk.toString(); });
  server.stderr.on("data", chunk => { logs += chunk.toString(); });
}

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server did not become healthy:
${logs}`);
}

async function stop() {
  if (!server) return;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      try { server.kill("SIGKILL"); } catch {}
      resolve();
    }, 3000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try { server.kill("SIGTERM"); } catch { resolve(); }
  });
}

function request(route, options = {}) {
  return fetch(`http://127.0.0.1:${port}${route}`, {
    ...options,
    headers: {
      authorization: `Bearer ${jwt.sign(
        { sub: "u-1", email: "admin@axislab.com", fullName: "Backup Admin", role: "admin" },
        secret,
        { algorithm: "HS256", expiresIn: "10m", issuer: "axislab-api", audience: "axislab-web" },
      )}`,
      ...(options.headers || {}),
    },
  });
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  try {
    port = await allocateFreePort();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "axis-backup-files-"));
    dataFile = path.join(tempDir, "axis-data.sqlite");
    start();
    await waitForHealth();

    const form = new FormData();
    const originalContent = Buffer.from("AXIS LAB BACKUP FILE TEST\n");
    form.append("file", new Blob([originalContent], { type: "application/octet-stream" }), "backup-proof.dxf");
    form.append("entityType", "order");
    form.append("entityId", "ord-backup-test");
    const uploadResponse = await request("/api/files/upload", { method: "POST", body: form });
    const uploadBody = await uploadResponse.json();
    assert(uploadResponse.ok && uploadBody.file?.id, `upload failed: ${JSON.stringify(uploadBody)}`);
    const uploadedFile = uploadBody.file;
    assert(fs.existsSync(uploadedFile.path), "uploaded file was not written to disk");

    const backupResponse = await request("/api/backup", { method: "POST", body: JSON.stringify({}) });
    const backupBody = await backupResponse.json();
    assert(backupResponse.ok && backupBody.backup?.id, `backup failed: ${JSON.stringify(backupBody)}`);
    assert(backupBody.backup.includesUploads === true, `backup did not report included uploads: ${JSON.stringify(backupBody.backup)}`);
    assert(!Object.prototype.hasOwnProperty.call(backupBody.backup, "filePath"), "backup leaked its filesystem path");

    const backupPackage = path.join(tempDir, "backups", `${backupBody.backup.id}.sqlite`);
    const manifestPath = path.join(backupPackage, "manifest.json");
    const dbBackupPath = path.join(backupPackage, "axis-data.sqlite");
    assert(fs.existsSync(manifestPath) && fs.existsSync(dbBackupPath), "backup package is missing manifest/database");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert(manifest.formatVersion === 1, `unexpected backup format: ${JSON.stringify(manifest)}`);
    const normalizedUpload = uploadedFile.path.split(path.sep).slice(-1)[0];
    const manifestUpload = manifest.uploads.find(item => item.path.endsWith(normalizedUpload));
    assert(manifestUpload, `uploaded file was not indexed in backup manifest: ${JSON.stringify(manifest.uploads)}`);
    const backedUpUploadPath = path.join(backupPackage, "uploads", ...manifestUpload.path.split("/"));
    assert(fs.existsSync(backedUpUploadPath), "uploaded file is missing from backup package");
    assert(sha256File(backedUpUploadPath) === manifestUpload.sha256, "uploaded file checksum mismatch in backup package");

    const deleteResponse = await request(`/api/files/${uploadedFile.id}`, { method: "DELETE" });
    assert(deleteResponse.ok, `file delete failed: ${await deleteResponse.text()}`);
    assert(!fs.existsSync(uploadedFile.path), "uploaded file still exists after delete");

    const restoreResponse = await request(`/api/backup/restore/${backupBody.backup.id}`, { method: "POST", body: JSON.stringify({}) });
    const restoreBody = await restoreResponse.json();
    assert(restoreResponse.ok, `restore failed: ${JSON.stringify(restoreBody)}`);
    assert(fs.existsSync(uploadedFile.path), "restore did not recreate uploaded file");
    assert(fs.readFileSync(uploadedFile.path).equals(originalContent), "restored uploaded file content changed");

    const restoredFilesResponse = await request("/api/files/entity/order/ord-backup-test");
    const restoredFilesBody = await restoredFilesResponse.json();
    assert(restoredFilesResponse.ok && restoredFilesBody.files?.some(file => file.id === uploadedFile.id),
      `file metadata was not restored: ${JSON.stringify(restoredFilesBody)}`);

    console.log("sqlite-backup-files-smoke: PASS (database + uploads packaged, checksummed, restored)");
  } catch (error) {
    console.error(`sqlite-backup-files-smoke: FAIL - ${error.message}
${logs}`);
    process.exitCode = 1;
  } finally {
    await stop();
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();

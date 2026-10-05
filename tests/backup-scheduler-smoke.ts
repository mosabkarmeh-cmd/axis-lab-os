import { createBackupScheduler } from "../src/server/runtime/backup-scheduler.ts";
import type { BackupSeed } from "../src/server/runtime/operational-seeds.ts";

const backups: BackupSeed[] = [
  { id: "auto-old", name: "old", createdAt: "2026-01-01T00:00:00.000Z", status: "completed", kind: "auto", filePath: "/tmp/auto-old" },
  { id: "auto-newer", name: "newer", createdAt: "2026-01-10T00:00:00.000Z", status: "completed", kind: "auto", filePath: "/tmp/auto-newer" },
  { id: "manual-keep", name: "manual", createdAt: "2026-01-10T00:00:00.000Z", status: "completed", kind: "manual", filePath: "/tmp/manual" },
];

const deleted: string[] = [];
let persisted = 0;
let created = 0;

const scheduler = createBackupScheduler({
  settings: {
    backup: {
      autoBackup: true,
      backupFrequency: "daily",
      retentionCount: 2,
    },
  },
  backups,
  createBackup: async kind => {
    created += 1;
    return {
      id: "auto-created",
      name: "auto",
      createdAt: "2026-10-05T00:00:00.000Z",
      status: "completed",
      kind,
      filePath: "/tmp/auto-created",
    };
  },
  deleteBackup: async filePath => {
    deleted.push(filePath);
  },
  persist: async () => {
    persisted += 1;
  },
});

if (!scheduler.isDue(Date.parse("2026-01-11T12:00:00.000Z"))) throw new Error("daily backup should be due after one day");
if (await scheduler.runIfDue() === null) throw new Error("automatic backup did not run");
if (created !== 1) throw new Error(`expected 1 automatic backup creation, got ${created}`);
if (persisted !== 1) throw new Error(`expected one persistence call, got ${persisted}`);
if (!backups.some(backup => backup.id === "auto-created")) throw new Error("new automatic backup was not recorded");
if (backups.some(backup => backup.id === "auto-old")) throw new Error("retention did not remove oldest automatic backup");
if (!backups.some(backup => backup.id === "manual-keep")) throw new Error("retention removed a manual backup");
if (!deleted.includes("/tmp/auto-old")) throw new Error("retention did not delete stale backup package");

await scheduler.stop();

scheduler.pruneAutoBackups().then(() => {
  console.log("backup-scheduler-smoke: PASS");
}).catch(error => {
  console.error(`backup-scheduler-smoke: FAIL - ${error.message}`);
  process.exitCode = 1;
});

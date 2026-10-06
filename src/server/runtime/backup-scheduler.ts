import type { BackupSeed } from "./operational-seeds.ts";

type BackupFrequency = "daily" | "weekly" | "monthly";

export interface BackupSchedulerDependencies {
  settings: {
    backup: {
      autoBackup: boolean;
      backupFrequency: BackupFrequency;
      retentionCount: number;
    };
  };
  backups: BackupSeed[];
  createBackup: (kind: "auto") => Promise<BackupSeed | null>;
  deleteBackup: (filePath: string) => Promise<void>;
  persist: () => void | Promise<void>;
}

const FREQUENCY_MS: Record<BackupFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function createBackupScheduler(deps: BackupSchedulerDependencies) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let activeRun: Promise<BackupSeed | null> | null = null;

  function isDue(now = Date.now()) {
    if (!deps.settings.backup.autoBackup) return false;
    const frequency = deps.settings.backup.backupFrequency;
    const interval = FREQUENCY_MS[frequency] || FREQUENCY_MS.daily;
    const latestAutoBackup = deps.backups
      .filter(backup => backup.kind === "auto" && typeof backup.createdAt === "string")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (!latestAutoBackup) return true;
    const timestamp = Date.parse(latestAutoBackup.createdAt);
    return !Number.isFinite(timestamp) || now - timestamp >= interval;
  }

  async function pruneAutoBackups() {
    const retention = Math.max(1, Math.floor(Number(deps.settings.backup.retentionCount) || 10));
    const autoBackups = deps.backups
      .filter(backup => backup.kind === "auto")
      .sort((a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)));

    for (const stale of autoBackups.slice(retention)) {
      if (stale.filePath) {
        try {
          await deps.deleteBackup(stale.filePath);
        } catch (error) {
          console.error("[BACKUP] Failed to delete stale automatic backup:", error);
          continue;
        }
      }
      const index = deps.backups.findIndex(backup => backup.id === stale.id);
      if (index >= 0) deps.backups.splice(index, 1);
    }
  }

  function runIfDue() {
    if (activeRun) return activeRun;
    if (!isDue()) return Promise.resolve(null);

    activeRun = (async () => {
      try {
        const backup = await deps.createBackup("auto");
        if (!backup) return null;
        deps.backups.unshift(backup);
        await pruneAutoBackups();
        await deps.persist();
        console.log(`[BACKUP] Automatic backup completed: ${backup.id}`);
        return backup;
      } catch (error) {
        console.error("[BACKUP] Automatic backup failed:", error);
        return null;
      } finally {
        activeRun = null;
      }
    })();
    return activeRun;
  }

  function start() {
    if (timer) return;
    void runIfDue();
    timer = setInterval(() => { void runIfDue(); }, 60 * 60 * 1000);
    timer.unref?.();
  }

  async function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (activeRun) await activeRun;
  }

  return {
    isDue,
    pruneAutoBackups,
    runIfDue,
    start,
    stop,
  };
}

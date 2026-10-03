import express from "express";
import path from "path";
import * as core from "../server-core.ts";

const {
  USE_POSTGRES,
  USE_SQLITE,
  LOCAL_DATA_FILE,
  initLocalSqlite,
  benchmarkSnapshot,
  orderCreateBenchmarks,
  persistenceBenchmarks,
  persistQueueStats,
  persistInFlight,
  persistAgainAfter,
  persistTimer,
  getRequestUser,
  resetBusinessData,
  ACTIVITY_LOGS,
} = core;

export function registerSystemRoutes(app: express.Express) {
  app.get("/api/health", async (_req, res) => {
    const database = USE_POSTGRES ? "postgres" : USE_SQLITE ? "sqlite" : "memory";
    let status = "ok";
    let sqliteIntegrity: string | null = null;
    let schemaVersion: number | null = null;

    if (USE_SQLITE) {
      try {
        const databaseHandle = await initLocalSqlite();
        const integrityResult = databaseHandle.exec("PRAGMA integrity_check");
        sqliteIntegrity = String(integrityResult[0]?.values?.[0]?.[0] || "unknown");
        const schemaResult = databaseHandle.exec("SELECT value FROM local_metadata WHERE key = 'schema_version' LIMIT 1");
        const parsedVersion = Number(schemaResult[0]?.values?.[0]?.[0]);
        schemaVersion = Number.isFinite(parsedVersion) ? parsedVersion : null;
        if (sqliteIntegrity !== "ok") status = "degraded";
      } catch (error) {
        status = "degraded";
        sqliteIntegrity = "error";
        console.error("[HEALTH] SQLite integrity check failed:", error);
      }
    }

    res.status(status === "ok" ? 200 : 503).json({
      success: status === "ok",
      status,
      database,
      databaseFile: USE_SQLITE ? path.basename(LOCAL_DATA_FILE) : null,
      sqliteIntegrity,
      schemaVersion,
    });
  });

  app.get("/api/diagnostics/benchmarks", (req, res) => {
    const user = req.user;
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بعرض قياسات الأداء الداخلية" });
      return;
    }

    res.json({
      success: true,
      collectedAt: new Date().toISOString(),
      orderCreate: benchmarkSnapshot(orderCreateBenchmarks),
      persistence: benchmarkSnapshot(persistenceBenchmarks),
      persistenceQueue: {
        ...persistQueueStats,
        pendingTimer: Boolean(persistTimer),
        inFlight: persistInFlight,
        pendingFollowUp: persistAgainAfter,
      },
    });
  });

  app.post("/api/admin/reset-business-data", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "هذه العملية متاحة لمدير النظام فقط" });
      return;
    }

    try {
      await resetBusinessData();
      res.json({ success: true, message: "تم تصفير بيانات الأعمال مع الحفاظ على الإعدادات والحساب الإداري" });
    } catch (error) {
      console.error("[RESET] Business data reset failed:", error);
      res.status(500).json({ success: false, message: "تعذر تصفير بيانات الأعمال بأمان" });
    }
  });

  app.get("/api/logs", (_req, res) => {
    res.json(ACTIVITY_LOGS);
  });
}

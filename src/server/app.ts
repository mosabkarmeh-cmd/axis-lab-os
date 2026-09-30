import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import * as core from "./server-core.ts";
import { registerRoutes } from "./routes/index.ts";

const {
  DB_MODE,
  USE_POSTGRES,
  USE_SQLITE,
  LOCAL_DATA_FILE,
  getRequestUser,
  loadPersistedState,
  normalizeOrderStatuses,
  normalizeInventoryState,
  normalizeLegacyMaterialPrices,
  refreshWarehouseCache,
  schedulePersist,
  persistStateNow,
  persistTimer,
} = core;

export async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const allowedOrigin = process.env.APP_URL || `http://localhost:${PORT}`;

  app.set("trust proxy", 1);
  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? allowedOrigin : true,
    credentials: true,
  }));
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Central API boundary: only health and authentication bootstrap are public.
  // Every business endpoint must have a verified active user before its handler runs.
  app.use("/api", (req, res, next) => {
    const publicPaths = new Set(["/health", "/auth/login", "/auth/register", "/auth/change-password", ...(process.env.AXIS_GUI_TEST === "1" ? ["/test/gui-session"] : [])]);
    if (req.method === "OPTIONS" || publicPaths.has(req.path)) {
      next();
      return;
    }
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ success: false, message: "يجب تسجيل الدخول للوصول إلى واجهة API" });
      return;
    }
    if (user.mustChangePassword && req.path !== "/auth/change-password") {
      res.status(428).json({ success: false, message: "يجب تغيير كلمة المرور المؤقتة قبل استخدام النظام" });
      return;
    }
    (req as any).user = user;
    next();
  });

  // Restore all in-memory business data (orders, users, invoices, ...) from the
  // last snapshot saved in Postgres, if any. On a brand-new database this finds
  // nothing and the app just keeps the hardcoded seed data (also true on first boot).
  const restoredCount = await loadPersistedState();
  normalizeOrderStatuses();
  normalizeInventoryState();
  normalizeLegacyMaterialPrices();
  console.log(`[STATE] Mode=${DB_MODE}; restored ${restoredCount} collections from ${USE_SQLITE ? LOCAL_DATA_FILE : "database"}.`);
  // Make sure a fresh local store/database immediately has a snapshot saved.
  if (USE_POSTGRES || USE_SQLITE) schedulePersist();

  // Load the warehouse cache (materials/inventory/suppliers/...) from the real tables
  // once at boot so the very first request already sees correct data.
  await refreshWarehouseCache();

  // The warehouse cache is loaded from SQLite after the legacy snapshot restore.
  // Re-run the idempotent material-price migration after that load, then persist it;
  // otherwise the old database values would overwrite the corrected in-memory values.
  // Demo materials are never re-seeded automatically. Real installations must remain empty after Safe Reset.
  normalizeInventoryState();
  normalizeLegacyMaterialPrices();
  if (USE_POSTGRES || USE_SQLITE) await persistStateNow();

  // Keep the warehouse cache in sync with the real tables on every API request - cheap
  // for a single-workshop's data volume, and means every one of the ~100 read call sites
  // across this file (dashboards, reports, order/production lookups, ...) that use
  // the MATERIALS/INVENTORY/SUPPLIERS/... arrays always sees what's actually in the database,
  // regardless of whether the last write came from materials.ts's routes or from this file.
  app.use((req, res, next) => {
    if (USE_POSTGRES && req.path.startsWith("/api/")) {
      refreshWarehouseCache().finally(next);
    } else {
      next();
    }
  });

  // After every successful write request, snapshot the in-memory state to Postgres
  // (debounced) so it survives the next restart/redeploy.
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (
        req.path.startsWith("/api/") &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        res.statusCode >= 200 && res.statusCode < 400
      ) {
        if ((USE_POSTGRES || USE_SQLITE) && !(res.locals as any).axisPersistScheduled) schedulePersist();
      }
    });
    next();
  });


  await registerRoutes(app);



  // Vite middleware for development or static serving for production
  const isElectronProduction = process.env.ELECTRON_RUN_AS_NODE === "1";
  if (!isElectronProduction && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 0 },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const HOST = process.env.SERVER_HOST || "127.0.0.1";
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  // Flush any pending state save on a normal shutdown (Ctrl+C, systemd stop, etc.)
  // so the last few seconds of work aren't lost.
  const gracefulShutdown = async () => {
    console.log("[STATE] Shutting down, saving latest data before exit...");
    if (persistTimer) clearTimeout(persistTimer);
    try {
      await persistStateNow();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

}

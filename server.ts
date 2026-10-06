import "dotenv/config";
import { startServer } from "./src/server/app.ts";

startServer().catch((error) => {
  console.error("[SERVER STARTUP] Failed to start AXIS LAB OS:", error);
  process.exit(1);
});

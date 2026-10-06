import express from "express";
import { db } from "../../../../db/index.ts";
import {
  machines as machinesTable,
  inventory as inventoryTable,
  inventoryTransactions as inventoryTransactionsTable,
  remnants as remnantsTable,
} from "../../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../../server-core.ts";
import {
  getActorId,
  machines,
  productionJobs,
  sanitizeProductionJob,
  persistProductionState,
} from "./shared.ts";

const {
  idNum,
  sendProductionJobEmailNotification,
  getRequestUser,
} = core;

function requireProductionOperator(req: express.Request, res: express.Response): boolean {
  const role = getRequestUser(req)?.role;
  if (!role || !["admin", "employee"].includes(role)) { res.status(403).json({ success: false, message: "عمليات الإنتاج متاحة للإدارة والموظفين التشغيليين فقط" }); return false; }
  return true;
}

export function registerProductionPauseProgressRoutes(app: express.Express) {
app.post("/api/production/jobs/:id/pause", async (req, res) => {
    if (!requireProductionOperator(req, res)) return;
    const { id } = req.params;
    const job = productionJobs.find(item => item.id === id);

    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    job.status = "paused";

    if (job.machineId) {
      const machine = machines.find(item => item.id === job.machineId);
      if (machine && machine.currentJobId === id) {
        machine.status = "idle";
        const machineDbId = idNum(machine.id, "mach-");
        if (machineDbId) {
          try {
            await db.update(machinesTable)
              .set({ status: "idle" })
              .where(eq(machinesTable.id, machineDbId));
          } catch (err) {
            console.error("Error updating machine status on job pause:", err);
          }
        }
      }
    }

    await persistProductionState();
    sendProductionJobEmailNotification(job, "paused", "تم توقيف المهمة مؤقتاً بواسطة فني الماكينة");
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });

  app.post("/api/production/jobs/:id/progress", async (req, res) => {
    if (!requireProductionOperator(req, res)) return;
    const { id } = req.params;
    const { progress, elapsedTimeSec } = req.body;
    const job = productionJobs.find(item => item.id === id);

    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    if (job.status !== "running") {
      res.status(400).json({ success: false, message: "المهمة ليست قيد التشغيل حالياً" });
      return;
    }

    job.progress = Math.min(100, Math.max(0, Number(progress)));
    job.elapsedTimeSec = Number(elapsedTimeSec) || job.elapsedTimeSec;
    await persistProductionState();
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });
}

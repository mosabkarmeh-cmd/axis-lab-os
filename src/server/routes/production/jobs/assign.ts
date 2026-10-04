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
} from "./shared.ts";

const {
  idNum,
  createNotification,
  sendProductionJobEmailNotification,
  ORDERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
} = core;

export function registerProductionAssignRoute(app: express.Express) {
app.post("/api/production/jobs/:id/assign", (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;
    const job = productionJobs.find(item => item.id === id);

    if (!job) {
      res.status(404).json({ success: false, message: "لم يتم العثور على مهمة الإنتاج" });
      return;
    }

    if (machineId) {
      const machine = machines.find(item => item.id === machineId);
      if (machine && machine.status !== "idle" && machine.currentJobId !== id) {
        res.status(400).json({ success: false, message: "الآلة قيد التشغيل حالياً في مهمة أخرى" });
        return;
      }
      job.machineId = machineId;
    }

    if (operatorId) job.operatorId = operatorId;
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });
}

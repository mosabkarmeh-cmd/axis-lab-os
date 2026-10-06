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
  createNotification,
  sendProductionJobEmailNotification,
  ORDERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  getRequestUser,
} = core;

function requireProductionOperator(req: express.Request, res: express.Response): boolean {
  const role = getRequestUser(req)?.role;
  if (!role || !["admin", "employee"].includes(role)) { res.status(403).json({ success: false, message: "عمليات الإنتاج متاحة للإدارة والموظفين التشغيليين فقط" }); return false; }
  return true;
}

export function registerProductionAssignRoute(app: express.Express) {
app.post("/api/production/jobs/:id/assign", async (req, res) => {
    if (!requireProductionOperator(req, res)) return;
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
    await persistProductionState();
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });
}

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

export function registerProductionStartRoute(app: express.Express) {
app.post("/api/production/jobs/:id/start", async (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;
    const job = productionJobs.find(item => item.id === id);

    if (!job) {
      res.status(404).json({ success: false, message: "مهمة الإنتاج غير موجودة" });
      return;
    }

    const finalMachineId = machineId || job.machineId;
    const finalOperatorId = operatorId || job.operatorId;
    if (!finalMachineId) {
      res.status(400).json({ success: false, message: "يرجى تعيين آلة قبل بدء تشغيل المهمة" });
      return;
    }

    const machine = machines.find(item => item.id === finalMachineId);
    if (machine) {
      machine.status = "running";
      machine.currentJobId = id;
      const machineDbId = idNum(machine.id, "mach-");
      if (machineDbId) {
        try {
          await db.update(machinesTable)
            .set({ status: "running", currentJobId: id })
            .where(eq(machinesTable.id, machineDbId));
        } catch (err) {
          console.error("Error updating machine status on job start:", err);
        }
      }
    }

    job.machineId = finalMachineId;
    job.operatorId = finalOperatorId || getActorId(req);
    job.status = "running";

    let orderUpdated = false;
    let updatedOrderNumber = job.orderNumber;

    if (job.orderId || job.orderNumber) {
      const order = ORDERS.find(item =>
        (job.orderId && item.id === job.orderId) ||
        (job.orderNumber && item.orderNumber === job.orderNumber),
      );

      if (order) {
        const previousOrderStatus = order.status;
        order.status = "cutting";
        order.statusHistory ||= [];
        order.statusHistory.push({
          id: "sh_" + Date.now(),
          oldStatus: previousOrderStatus,
          newStatus: "cutting",
          status: "cutting",
          note: `تحديث تلقائي: تم بدء القص بالليزر (${job.jobNo}) على الماكينة (${machine?.name || ""})`,
          createdAt: new Date().toISOString(),
          createdById: finalOperatorId || getActorId(req),
        });
        orderUpdated = true;
        updatedOrderNumber = order.orderNumber;
        createNotification(
          `بدأ قص الطلب #${order.orderNumber}`,
          `بدأت مهمة القص ${job.jobNo} تلقائياً على الماكينة ${machine?.name || "المحددة"}.`,
          "production",
          "normal",
          "/production",
        );
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: job.operatorId,
      action: "START_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: job.id,
      createdAt: new Date().toISOString(),
    });

    sendProductionJobEmailNotification(
      job,
      "started",
      `بدء التشغيل الفعلي للقص على ماكينة (${machine?.name || "الماكينة المحددة"})`,
    );

    res.json({
      success: true,
      job: sanitizeProductionJob(job, req),
      orderUpdated,
      orderNumber: updatedOrderNumber,
    });
  });
}

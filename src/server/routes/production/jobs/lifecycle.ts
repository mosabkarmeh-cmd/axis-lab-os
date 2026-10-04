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
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  ORDERS,
  createNotification,
  sendProductionJobEmailNotification,
  idNum,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
} = core;

export function registerProductionJobLifecycleRoutes(app: express.Express) {
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

  app.post("/api/production/jobs/:id/pause", async (req, res) => {
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

    sendProductionJobEmailNotification(job, "paused", "تم توقيف المهمة مؤقتاً بواسطة فني الماكينة");
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });

  app.post("/api/production/jobs/:id/progress", (req, res) => {
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
    res.json({ success: true, job: sanitizeProductionJob(job, req) });
  });

  app.post("/api/production/jobs/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { remnantWidth, remnantHeight, remnantLocation } = req.body;
    const job = productionJobs.find(item => item.id === id);

    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    if (job.status === "completed") {
      res.status(409).json({ success: false, message: "Production job is already completed" });
      return;
    }

    if (job.materialId) {
      const inventory = INVENTORY.find(item => item.materialId === job.materialId);
      const availableQuantity = Number(inventory?.availableQuantity ?? inventory?.quantity ?? 0);
      if (!inventory || Number(inventory.quantity) < 1 || availableQuantity < 1) {
        res.status(409).json({
          success: false,
          code: "INSUFFICIENT_STOCK",
          message: "Production cannot be completed because material stock is insufficient",
        });
        return;
      }
    }

    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date().toISOString();

    const completedOrder = job.orderId || job.orderNumber
      ? ORDERS.find(item =>
          (job.orderId && item.id === job.orderId) ||
          (job.orderNumber && item.orderNumber === job.orderNumber),
        )
      : undefined;

    if (completedOrder) {
      const previousOrderStatus = completedOrder.status;
      completedOrder.status = "cutting_complete";
      completedOrder.statusHistory ||= [];
      completedOrder.statusHistory.unshift({
        oldStatus: previousOrderStatus,
        newStatus: "cutting_complete",
        status: "cutting_complete",
        note: `تحديث تلقائي: انتهت مهمة القص ${job.jobNo}. يرجى بدء التجميع عند الجاهزية.`,
        notes: `انتهى القص ${job.jobNo}، بانتظار بدء التجميع`,
        changedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        changedById: job.operatorId || getActorId(req),
      });
      createNotification(
        `انتهى قص الطلب #${completedOrder.orderNumber}`,
        `انتهت مهمة القص ${job.jobNo}. تذكير: ابدأ مرحلة التجميع.`,
        "production",
        "high",
        "/production",
      );
    }

    if (job.machineId) {
      const machine = machines.find(item => item.id === job.machineId);
      if (machine) {
        machine.status = "idle";
        machine.currentJobId = null;
        machine.workingHours = Number((machine.workingHours + (Number(job.estTimeSec) / 3600)).toFixed(1));

        const machineDbId = idNum(machine.id, "mach-");
        if (machineDbId) {
          try {
            await db.update(machinesTable)
              .set({
                status: "idle",
                currentJobId: null,
                workingHours: machine.workingHours,
              })
              .where(eq(machinesTable.id, machineDbId));
          } catch (err) {
            console.error("Error releasing machine on job completion:", err);
          }
        }
      }
    }

    if (job.materialId) {
      const inventory = INVENTORY.find(item => item.materialId === job.materialId);
      if (inventory && Number(inventory.quantity) > 0) {
        const beforeQty = Number(inventory.quantity);
        inventory.quantity = beforeQty - 1;
        inventory.availableQuantity = inventory.quantity - Number(inventory.reservedQuantity || 0);

        const materialDbId = idNum(job.materialId, "m-");
        const inventoryDbId = idNum(inventory.id, "inv-");

        try {
          if (inventoryDbId) {
            await db.update(inventoryTable)
              .set({
                quantity: inventory.quantity,
                availableQuantity: inventory.availableQuantity,
              })
              .where(eq(inventoryTable.id, inventoryDbId));
          }

          if (materialDbId) {
            await db.insert(inventoryTransactionsTable).values({
              materialId: materialDbId,
              type: "consumption",
              quantity: -1,
              beforeQty,
              afterQty: inventory.quantity,
              referenceType: "production_job",
              referenceId: job.id,
              reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
            });
          }
        } catch (err) {
          console.error("Error deducting inventory on job completion:", err);
        }

        INVENTORY_TRANSACTIONS.push({
          id: nextEntityId("tx"),
          materialId: job.materialId,
          type: "consumption",
          quantity: -1,
          beforeQty,
          afterQty: inventory.quantity,
          referenceType: "production_job",
          referenceId: job.id,
          reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
          createdById: job.operatorId || getActorId(req),
          createdAt: new Date().toISOString(),
        });
      }
    }

    let addedRemnant: Record<string, unknown> | null = null;
    if (remnantWidth && remnantHeight) {
      const materialDbId = idNum(job.materialId, "m-");

      try {
        if (materialDbId) {
          const inserted = await db.insert(remnantsTable).values({
            materialId: materialDbId,
            width: Number(remnantWidth),
            height: Number(remnantHeight),
            area: Number(remnantWidth) * Number(remnantHeight),
            quantity: 1,
            status: "available",
            location: remnantLocation || "رف البقايا التلقائي",
          }).returning();

          const row = inserted[0];
          if (row) {
            addedRemnant = {
              id: "rem-" + row.id,
              materialId: job.materialId,
              width: row.width,
              height: row.height,
              area: row.area,
              quantity: row.quantity,
              status: row.status,
              location: row.location || "",
            };
          }
        }
      } catch (err) {
        console.error("Error adding remnant on job completion:", err);
      }

      if (!addedRemnant) {
        addedRemnant = {
          id: "rem-" + Date.now(),
          materialId: job.materialId,
          width: Number(remnantWidth),
          height: Number(remnantHeight),
          area: Number(remnantWidth) * Number(remnantHeight),
          quantity: 1,
          status: "available",
          location: remnantLocation || "رف البقايا التلقائي",
        };
      }

      REMNANTS.push(addedRemnant);
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: job.operatorId || getActorId(req),
      action: "COMPLETE_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: job.id,
      createdAt: new Date().toISOString(),
    });

    sendProductionJobEmailNotification(
      job,
      "completed",
      "تم انتهاء قص المهمة بالكامل (100%) وتخزين البقايا الناتجة بالمخزن لضمان المتابعة الفورية",
    );

    res.json({
      success: true,
      job: sanitizeProductionJob(job, req),
      addedRemnant,
    });
  });
}

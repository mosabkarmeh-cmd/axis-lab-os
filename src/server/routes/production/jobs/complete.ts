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

type RemnantRecord = {
  id: string;
  materialId: string;
  width: number;
  height: number;
  area: number;
  quantity: number;
  status: string;
  location: string;
};

export function registerProductionCompleteRoute(app: express.Express) {
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

    let addedRemnant: RemnantRecord | null = null;
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

    await persistProductionState();

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

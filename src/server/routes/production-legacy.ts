import express from "express";
import { db } from "../../db/index.ts";
import { machines as machinesTable, inventory as inventoryTable, inventoryTransactions as inventoryTransactionsTable, remnants as remnantsTable } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../server-core.ts";

const {
  PRODUCTION_JOBS,
  MATERIALS,
  USERS,
  ORDERS,
  INVENTORY,
  INVENTORY_TRANSACTIONS,
  REMNANTS,
  createNotification,
  sendProductionJobEmailNotification,
  idNum,
  MACHINES,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  getRequestUser,
} = core;

type ProductionJobView = {
  id: string;
  jobNo?: string;
  orderId?: string;
  orderNumber?: string;
  itemName?: string;
  materialId?: string;
  machineId?: string;
  status?: string;
  progress?: number;
  estTimeSec?: number;
  elapsedTimeSec?: number;
  laserPower?: number;
  laserSpeed?: number;
  operatorId?: string;
  priority?: string | number;
  createdAt?: string;
  completedAt?: string;
  materialCostUSD?: number;
  technicianCostUSD?: number;
  [key: string]: unknown;
};

type MachineView = {
  id: string;
  name: string;
  type: string;
  status: string;
  currentJobId: string | null;
  lastMaintenance: string;
  workingHours: number;
  calibrationSettings?: Record<string, unknown>;
  [key: string]: unknown;
};

const productionJobs = PRODUCTION_JOBS as unknown as ProductionJobView[];
const machines = MACHINES as unknown as MachineView[];

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerProductionLegacyRoutes(app: express.Express) {

  // API - Get Production Machines
  app.get("/api/production/machines", (req, res) => {
    res.json({ success: true, machines: machines });
  });

  // API - Add Production Machine (Admin only)
  app.post("/api/production/machines", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بإضافة آلات جديدة" });
      return;
    }
    const { name, type, workingHours } = req.body;
    if (!name || !type) {
      res.status(400).json({ success: false, message: "اسم ونوع الآلة حقول مطلوبة" });
      return;
    }
    const newMachine = {
      id: "mac-" + Date.now(),
      name,
      type,
      status: "idle",
      currentJobId: null,
      lastMaintenance: new Date().toISOString().slice(0, 10),
      workingHours: Number(workingHours) || 0
    };
    machines.push(newMachine);
    res.json({ success: true, machine: newMachine });
  });

  // API - Delete Production Machine (Admin only)
  app.delete("/api/production/machines/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ success: false, message: "غير مصرح لك بحذف الآلات" });
      return;
    }
    const { id } = req.params;
    const index = machines.findIndex(m => m.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }
    machines.splice(index, 1);
    res.json({ success: true, message: "تم حذف الآلة بنجاح" });
  });

  // API - Update Production Machine settings / calibration (Admin / Manager)
  app.put("/api/production/machines/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || (user.role !== "admin" && user.role !== "manager" && user.role !== "employee")) {
      res.status(403).json({ success: false, message: "غير مصرح لك بتعديل إعدادات الآلات" });
      return;
    }
    const { id } = req.params;
    const machine = machines.find(m => m.id === id);
    if (!machine) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }
    
    if (req.body.name !== undefined) machine.name = req.body.name;
    if (req.body.status !== undefined) machine.status = req.body.status;
    if (req.body.workingHours !== undefined) machine.workingHours = Number(req.body.workingHours);
    if (req.body.calibrationSettings !== undefined) {
      machine.calibrationSettings = {
        ...(machine.calibrationSettings || {}),
        ...req.body.calibrationSettings
      };
    }
    
    res.json({ success: true, machine });
  });

  // API - Get Production Jobs
  app.get("/api/production/jobs", (req, res) => {
    const list = productionJobs.map(job => {
      const mat = MATERIALS.find(m => m.id === job.materialId);
      const op = USERS.find(u => u.id === job.operatorId);
      const mac = machines.find(m => m.id === job.machineId);

      // Estimated technician cost based on cutting time (e.g. $15/hr = $0.25/min)
      const technicianCostUSD = Number(((job.estTimeSec / 60) * 0.25).toFixed(2));
      
      // Consumed material cost based on material price per unit
      const matPrice = mat ? (mat.pricePerUnit || 15) : 15;
      const materialCostUSD = Number((matPrice * 0.15).toFixed(2));

      return {
        ...job,
        materialName: mat ? mat.name : "خامة غير معروفة",
        materialPricePerUnit: matPrice,
        materialCostUSD: job.materialCostUSD || materialCostUSD,
        technicianCostUSD: job.technicianCostUSD || technicianCostUSD,
        totalDirectCostUSD: Number(((job.materialCostUSD || materialCostUSD) + (job.technicianCostUSD || technicianCostUSD)).toFixed(2)),
        operatorName: op ? op.fullName : "لم يحدد",
        machineName: mac ? mac.name : "لم تحدد آلة"
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, jobs: list });
  });

  // API - Create Production Job
  app.post("/api/production/jobs", (req, res) => {
    const { orderId, orderNumber, itemName, materialId, laserPower, laserSpeed, estTimeSec, materialCostUSD, technicianCostUSD } = req.body;

    if (!itemName || !materialId) {
      res.status(400).json({ success: false, message: "اسم المهمة ونوع المادة حقول مطلوبة" });
      return;
    }

    const mat = MATERIALS.find(m => m.id === materialId);
    const estSec = Number(estTimeSec) || 90;
    const calcTechCost = Number(((estSec / 60) * 0.25).toFixed(2));
    const calcMatCost = mat ? Number(((mat.pricePerUnit || 15) * 0.15).toFixed(2)) : 2.25;

    let assignedMachineId = req.body.machineId || null;
    if (!assignedMachineId && req.body.autoAssign) {
      const matName = (itemName || "").toLowerCase();
      let preferredType = "laser_co2";
      if (matName.includes("فايبر") || matName.includes("حديد") || matName.includes("معدن") || matName.includes("استيل") || matName.includes("fiber")) {
        preferredType = "fiber_laser";
      } else if (matName.includes("cnc") || matName.includes("راوتر") || matName.includes("سميك")) {
        preferredType = "cnc_router";
      }

      let candidates = machines.filter(m => m.status !== "maintenance" && m.status !== "offline" && (m.type === preferredType || m.type?.includes(preferredType)));
      if (candidates.length === 0) {
        candidates = machines.filter(m => m.status !== "maintenance" && m.status !== "offline");
      }

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;
        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      if (candidates[0]) {
        assignedMachineId = candidates[0].id;
      }
    }

    const newJob = {
      id: "job-" + Date.now(),
      jobNo: "JOB-2026-" + String(productionJobs.length + 1).padStart(3, '0'),
      orderId: orderId || null,
      orderNumber: orderNumber || "يدوي",
      itemName,
      materialId,
      machineId: assignedMachineId,
      status: "pending",
      progress: 0,
      estTimeSec: estSec,
      elapsedTimeSec: 0,
      laserPower: Number(laserPower) || 80,
      laserSpeed: Number(laserSpeed) || 30,
      operatorId: null,
      materialCostUSD: Number(materialCostUSD) || calcMatCost,
      technicianCostUSD: Number(technicianCostUSD) || calcTechCost,
      createdAt: new Date().toISOString()
    };

    productionJobs.push(newJob);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: newJob.id,
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(newJob, "created");

    res.status(201).json({ success: true, job: newJob });
  });

  // API - Reorder Production Jobs Queue Sequence
  app.post("/api/production/jobs/reorder", (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "Invalid orderedIds array" });
    }

    const jobMap = new Map(productionJobs.map(j => [j.id, j]));
    const reordered: typeof productionJobs = [];

    orderedIds.forEach((id, idx) => {
      const job = jobMap.get(id);
      if (job) {
        job.priority = idx + 1;
        reordered.push(job);
        jobMap.delete(id);
      }
    });

    // Append any remaining jobs that weren't in orderedIds
    jobMap.forEach(job => {
      reordered.push(job);
    });

    productionJobs.length = 0;
    productionJobs.push(...reordered);

    res.json({ success: true, jobs: productionJobs });
  });

  // API - Auto-Assign Pending Jobs to Least-Used Machines by Machine Type
  app.post("/api/production/jobs/auto-assign", (req, res) => {
    const { jobIds, autoStart } = req.body;
    
    let targetJobs = productionJobs.filter(j => j.status === "pending");
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      targetJobs = targetJobs.filter(j => jobIds.includes(j.id));
    }

    if (targetJobs.length === 0) {
      res.json({ success: true, message: "لا توجد مهام معلقة تتطلب التوزيع التلقائي حالياً", assignedCount: 0, details: [] });
      return;
    }

    const availableMachines = machines.filter(m => m.status !== "maintenance" && m.status !== "offline");
    if (availableMachines.length === 0) {
      res.status(400).json({ success: false, message: "لا توجد ماكينات متاحة أو غير متوقفة للصيانة حالياً" });
      return;
    }

    const machineSimulatedJobsCount = new Map<string, number>();
    availableMachines.forEach(m => machineSimulatedJobsCount.set(m.id, 0));

    const assignmentResults: Array<Record<string, unknown>> = [];

    for (const job of targetJobs) {
      const jobObj = job as typeof job & Record<string, unknown>;
      const matName = String(jobObj.materialName ?? job.itemName ?? "").toLowerCase();
      let preferredType = "laser_co2";
      if (matName.includes("فايبر") || matName.includes("حديد") || matName.includes("معدن") || matName.includes("استيل") || matName.includes("fiber")) {
        preferredType = "fiber_laser";
      } else if (matName.includes("cnc") || matName.includes("راوتر") || matName.includes("سميك")) {
        preferredType = "cnc_router";
      }

      let candidates = availableMachines.filter(m => m.type === preferredType || m.type?.includes(preferredType));
      if (candidates.length === 0) {
        candidates = [...availableMachines];
      }

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;

        const countA = machineSimulatedJobsCount.get(a.id) || 0;
        const countB = machineSimulatedJobsCount.get(b.id) || 0;
        if (countA !== countB) return countA - countB;

        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      const selectedMachine = candidates[0];
      if (selectedMachine) {
        job.machineId = selectedMachine.id;
        machineSimulatedJobsCount.set(selectedMachine.id, (machineSimulatedJobsCount.get(selectedMachine.id) || 0) + 1);

        if (autoStart && selectedMachine.status === "idle") {
          job.status = "running";
          jobObj.startTime = new Date().toISOString();
          selectedMachine.status = "running";
          selectedMachine.currentJobId = job.id;
        }

        assignmentResults.push({
          jobId: job.id,
          jobNo: job.jobNo,
          itemName: job.itemName,
          machineId: selectedMachine.id,
          machineName: selectedMachine.name,
          machineType: selectedMachine.type,
          workingHours: selectedMachine.workingHours,
          reason: `الماكينة الأقل استهلاكاً للساعات (${selectedMachine.workingHours?.toFixed(1) || 0} ساعة) المتوافقة مع التقنية (${selectedMachine.type || 'ليزر'})`
        });
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "AUTO_ASSIGN_JOBS",
      entityType: "ProductionJob",
      entityId: "batch",
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `تم توزيع ${assignmentResults.length} مهمة قص تلقائياً بحسب ساعات العمل ونوع الماكينة`,
      assignedCount: assignmentResults.length,
      details: assignmentResults
    });
  });

  // API - Assign Machine & Operator to Job
  app.post("/api/production/jobs/:id/assign", (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;

    const job = productionJobs.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "لم يتم العثور على مهمة الإنتاج" });
      return;
    }

    if (machineId) {
      const mac = machines.find(m => m.id === machineId);
      if (mac && mac.status !== "idle" && mac.currentJobId !== id) {
        res.status(400).json({ success: false, message: "الآلة قيد التشغيل حالياً في مهمة أخرى" });
        return;
      }
      job.machineId = machineId;
    }

    if (operatorId) {
      job.operatorId = operatorId;
    }

    res.json({ success: true, job });
  });

  // API - Start Production Job
  app.post("/api/production/jobs/:id/start", async (req, res) => {
    const { id } = req.params;
    const { machineId, operatorId } = req.body;

    const job = productionJobs.find(j => j.id === id);
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

    // Set Machine status to running
    const mac = machines.find(m => m.id === finalMachineId);
    if (mac) {
      mac.status = "running";
      mac.currentJobId = id;
      const macId = idNum(mac.id, "mach-");
      if (macId) {
        try {
          await db.update(machinesTable).set({ status: "running", currentJobId: id }).where(eq(machinesTable.id, macId));
        } catch (err) {
          console.error("Error updating machine status on job start:", err);
        }
      }
    }

    job.machineId = finalMachineId;
    job.operatorId = finalOperatorId || getActorId(req);
    job.status = "running";

    // Auto-update associated order status to 'cutting' when the laser actually starts.
    let orderUpdated = false;
    let updatedOrderNumber = job.orderNumber;
    if (job.orderId || job.orderNumber) {
      const ord = ORDERS.find(o => (job.orderId && o.id === job.orderId) || (job.orderNumber && o.orderNumber === job.orderNumber));
      if (ord) {
        const previousOrderStatus = ord.status;
        ord.status = 'cutting';
        orderUpdated = true;
        updatedOrderNumber = ord.orderNumber;
        if (!ord.statusHistory) ord.statusHistory = [];
        ord.statusHistory.push({
          id: "sh_" + Date.now(),
          oldStatus: previousOrderStatus,
          newStatus: 'cutting',
          status: 'cutting',
          note: `تحديث تلقائي: تم بدء القص بالليزر (${job.jobNo}) على الماكينة (${mac ? mac.name : ''})`,
          createdAt: new Date().toISOString(),
          createdById: finalOperatorId || getActorId(req)
        });
        createNotification(`بدأ قص الطلب #${ord.orderNumber}`, `بدأت مهمة القص ${job.jobNo} تلقائياً على الماكينة ${mac?.name || "المحددة"}.`, "production", "normal", "/production");
      }
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: job.operatorId,
      action: "START_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: job.id,
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(job, "started", `بدء التشغيل الفعلي للقص على ماكينة (${mac ? mac.name : 'الماكينة المحددة'})`);

    res.json({ success: true, job, orderUpdated, orderNumber: updatedOrderNumber });
  });

  // API - Pause Production Job
  app.post("/api/production/jobs/:id/pause", async (req, res) => {
    const { id } = req.params;

    const job = productionJobs.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    job.status = "paused";

    if (job.machineId) {
      const mac = machines.find(m => m.id === job.machineId);
      if (mac && mac.currentJobId === id) {
        mac.status = "idle";
        const macId = idNum(mac.id, "mach-");
        if (macId) {
          try {
            await db.update(machinesTable).set({ status: "idle" }).where(eq(machinesTable.id, macId));
          } catch (err) {
            console.error("Error updating machine status on job pause:", err);
          }
        }
      }
    }

    // Send SMTP notification asynchronously
    sendProductionJobEmailNotification(job, "paused", "تم توقيف المهمة مؤقتاً بواسطة فني الماكينة");

    res.json({ success: true, job });
  });

  // API - Update Progress
  app.post("/api/production/jobs/:id/progress", (req, res) => {
    const { id } = req.params;
    const { progress, elapsedTimeSec } = req.body;

    const job = productionJobs.find(j => j.id === id);
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

    res.json({ success: true, job });
  });

  // API - Complete Production Job (with automatic stock deduction!)
  app.post("/api/production/jobs/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { remnantWidth, remnantHeight, remnantLocation } = req.body;

    const job = productionJobs.find(j => j.id === id);
    if (!job) {
      res.status(404).json({ success: false, message: "المهمة غير موجودة" });
      return;
    }

    if (job.status === "completed") {
      res.status(409).json({ success: false, message: "Production job is already completed" });
      return;
    }

    if (job.materialId) {
      const inv = INVENTORY.find(i => i.materialId === job.materialId);
      const availableQuantity = Number(inv?.availableQuantity ?? inv?.quantity ?? 0);
      if (!inv || Number(inv.quantity) < 1 || availableQuantity < 1) {
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
      ? ORDERS.find(o => (job.orderId && o.id === job.orderId) || (job.orderNumber && o.orderNumber === job.orderNumber))
      : null;
    if (completedOrder) {
      const previousOrderStatus = completedOrder.status;
      completedOrder.status = "cutting_complete";
      if (!completedOrder.statusHistory) completedOrder.statusHistory = [];
      completedOrder.statusHistory.unshift({
        oldStatus: previousOrderStatus,
        newStatus: "cutting_complete",
        status: "cutting_complete",
        note: `تحديث تلقائي: انتهت مهمة القص ${job.jobNo}. يرجى بدء التجميع عند الجاهزية.`,
        notes: `انتهى القص ${job.jobNo}، بانتظار بدء التجميع`,
        changedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        changedById: job.operatorId || getActorId(req)
      });
      createNotification(`انتهى قص الطلب #${completedOrder.orderNumber}`, `انتهت مهمة القص ${job.jobNo}. تذكير: ابدأ مرحلة التجميع.`, "production", "high", "/production");
    }

    // Release machine
    if (job.machineId) {
      const mac = machines.find(m => m.id === job.machineId);
      if (mac) {
        mac.status = "idle";
        mac.currentJobId = null;
        mac.workingHours = Number((mac.workingHours + (job.estTimeSec / 3600)).toFixed(1));

        const macId = idNum(mac.id, "mach-");
        if (macId) {
          try {
            await db.update(machinesTable).set({
              status: "idle", currentJobId: null, workingHours: mac.workingHours,
            }).where(eq(machinesTable.id, macId));
          } catch (err) {
            console.error("Error releasing machine on job completion:", err);
          }
        }
      }
    }

    // Auto-deduct 1 unit from material inventory if exists
    if (job.materialId) {
      const inv = INVENTORY.find(i => i.materialId === job.materialId);
      if (inv && inv.quantity > 0) {
        const beforeQty = inv.quantity;
        inv.quantity -= 1;
        inv.availableQuantity = inv.quantity - inv.reservedQuantity;

        const matId = idNum(job.materialId, "m-");
        const invId = idNum(inv.id, "inv-");
        try {
          if (invId) {
            await db.update(inventoryTable).set({ quantity: inv.quantity, availableQuantity: inv.availableQuantity }).where(eq(inventoryTable.id, invId));
          }
          if (matId) {
            await db.insert(inventoryTransactionsTable).values({
              materialId: matId, type: "consumption", quantity: -1, beforeQty, afterQty: inv.quantity,
              referenceType: "production_job", referenceId: job.id,
              reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
            });
          }
        } catch (err) {
          console.error("Error deducting inventory on job completion:", err);
        }

        // Log transaction
        INVENTORY_TRANSACTIONS.push({
          id: nextEntityId("tx"),
          materialId: job.materialId,
          type: "consumption",
          quantity: -1,
          beforeQty,
          afterQty: inv.quantity,
          referenceType: "production_job",
          referenceId: job.id,
          reason: `استهلاك لوح لإنتاج مهمة: ${job.itemName} لطلب ${job.orderNumber}`,
          createdById: job.operatorId || getActorId(req),
          createdAt: new Date().toISOString()
        });
      }
    }

    // Add remnant offcut if specified
    let addedRemnant = null;
    if (remnantWidth && remnantHeight) {
      const matId = idNum(job.materialId, "m-");
      try {
        if (matId) {
          const inserted = await db.insert(remnantsTable).values({
            materialId: matId, width: Number(remnantWidth), height: Number(remnantHeight),
            area: Number(remnantWidth) * Number(remnantHeight), quantity: 1, status: "available",
            location: remnantLocation || "رف البقايا التلقائي",
          }).returning();
          const row = inserted[0];
          addedRemnant = {
            id: "rem-" + row.id, materialId: job.materialId, width: row.width, height: row.height,
            area: row.area, quantity: row.quantity, status: row.status, location: row.location || "",
          };
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
          location: remnantLocation || "رف البقايا التلقائي"
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
      createdAt: new Date().toISOString()
    });

    // Send SMTP notification asynchronously for job completion!
    sendProductionJobEmailNotification(job, "completed", "تم انتهاء قص المهمة بالكامل (100%) وتخزين البقايا الناتجة بالمخزن لضمان المتابعة الفورية");

    res.json({ success: true, job, addedRemnant });
  });

  // API - Machine Maintenance Trigger
  app.post("/api/production/machines/:id/maintenance", async (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role === "accountant") {
      res.status(403).json({ success: false, message: "غير مصرح للمحاسب المالي بتعديل حالة الآلات" });
      return;
    }
    const { id } = req.params;
    const { status } = req.body; // "maintenance" or "idle"

    const mac = machines.find(m => m.id === id);
    if (!mac) {
      res.status(404).json({ success: false, message: "الآلة غير موجودة" });
      return;
    }

    mac.status = status || "idle";
    if (status === "maintenance") {
      mac.lastMaintenance = new Date().toISOString().slice(0, 10);
    }

    try {
      const macId = idNum(mac.id, "mach-");
      if (macId) {
        await db.update(machinesTable).set({
          status: mac.status, lastMaintenance: mac.lastMaintenance,
        }).where(eq(machinesTable.id, macId));
      }
      res.json({ success: true, machine: mac });
    } catch (err: unknown) {
      console.error("Error updating machine maintenance status:", err);
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : String(err) });
    }
  });
}

import express from "express";
import * as core from "../../server-core.ts";
import {
  getActorId,
  machines,
  productionJobs,
  sanitizeProductionJob,
  sanitizeProductionJobs,
} from "./shared.ts";

const {
  MATERIALS,
  USERS,
  ACTIVITY_LOGS,
  nextActivityLogId,
  sendProductionJobEmailNotification,
} = core;

export function registerProductionJobQueueRoutes(app: express.Express) {
  app.get("/api/production/jobs", (req, res) => {
    const list = productionJobs.map(job => {
      const material = MATERIALS.find(m => m.id === job.materialId);
      const operator = USERS.find(u => u.id === job.operatorId);
      const machine = machines.find(m => m.id === job.machineId);
      const technicianCostUSD = Number(((Number(job.estTimeSec || 0) / 60) * 0.25).toFixed(2));
      const matPrice = material ? (Number(material.pricePerUnit) || 15) : 15;
      const materialCostUSD = Number((matPrice * 0.15).toFixed(2));

      return {
        ...job,
        materialName: material ? material.name : "خامة غير معروفة",
        materialPricePerUnit: matPrice,
        materialCostUSD: job.materialCostUSD || materialCostUSD,
        technicianCostUSD: job.technicianCostUSD || technicianCostUSD,
        totalDirectCostUSD: Number(((job.materialCostUSD || materialCostUSD) + (job.technicianCostUSD || technicianCostUSD)).toFixed(2)),
        operatorName: operator ? operator.fullName : "لم يحدد",
        machineName: machine ? machine.name : "لم تحدد آلة",
      };
    }).sort((a, b) => new Date(String(b.createdAt || "")).getTime() - new Date(String(a.createdAt || "")).getTime());

    res.json({ success: true, jobs: sanitizeProductionJobs(list, req) });
  });

  app.post("/api/production/jobs", (req, res) => {
    const {
      orderId,
      orderNumber,
      itemName,
      materialId,
      laserPower,
      laserSpeed,
      estTimeSec,
      materialCostUSD,
      technicianCostUSD,
    } = req.body;

    if (!itemName || !materialId) {
      res.status(400).json({ success: false, message: "اسم المهمة ونوع المادة حقول مطلوبة" });
      return;
    }

    const material = MATERIALS.find(m => m.id === materialId);
    const estSec = Number(estTimeSec) || 90;
    const calcTechCost = Number(((estSec / 60) * 0.25).toFixed(2));
    const calcMatCost = material ? Number(((Number(material.pricePerUnit) || 15) * 0.15).toFixed(2)) : 2.25;

    let assignedMachineId = req.body.machineId || null;
    if (!assignedMachineId && req.body.autoAssign) {
      const materialName = String(itemName).toLowerCase();
      let preferredType = "laser_co2";
      if (
        materialName.includes("فايبر") ||
        materialName.includes("حديد") ||
        materialName.includes("معدن") ||
        materialName.includes("استيل") ||
        materialName.includes("fiber")
      ) {
        preferredType = "fiber_laser";
      } else if (
        materialName.includes("cnc") ||
        materialName.includes("راوتر") ||
        materialName.includes("سميك")
      ) {
        preferredType = "cnc_router";
      }

      let candidates = machines.filter(
        m =>
          m.status !== "maintenance" &&
          m.status !== "offline" &&
          (m.type === preferredType || m.type.includes(preferredType)),
      );
      if (candidates.length === 0) {
        candidates = machines.filter(m => m.status !== "maintenance" && m.status !== "offline");
      }

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;
        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      assignedMachineId = candidates[0]?.id || null;
    }

    const newJob: ProductionJobView = {
      id: "job-" + Date.now(),
      jobNo: "JOB-2026-" + String(productionJobs.length + 1).padStart(3, "0"),
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
      createdAt: new Date().toISOString(),
    };

    productionJobs.push(newJob);
    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_PRODUCTION_JOB",
      entityType: "ProductionJob",
      entityId: newJob.id,
      createdAt: new Date().toISOString(),
    });

    sendProductionJobEmailNotification(newJob, "created");
    res.status(201).json({ success: true, job: sanitizeProductionJob(newJob, req) });
  });

  app.post("/api/production/jobs/reorder", (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ success: false, message: "Invalid orderedIds array" });
      return;
    }

    const jobMap = new Map(productionJobs.map(job => [job.id, job]));
    const reordered: ProductionJobView[] = [];

    orderedIds.forEach((id, index) => {
      const job = jobMap.get(String(id));
      if (!job) return;
      job.priority = index + 1;
      reordered.push(job);
      jobMap.delete(job.id);
    });

    jobMap.forEach(job => reordered.push(job));
    productionJobs.length = 0;
    productionJobs.push(...reordered);

    res.json({ success: true, jobs: sanitizeProductionJobs(productionJobs, req) });
  });

  app.post("/api/production/jobs/auto-assign", (req, res) => {
    const { jobIds, autoStart } = req.body;

    let targetJobs = productionJobs.filter(job => job.status === "pending");
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      targetJobs = targetJobs.filter(job => jobIds.includes(job.id));
    }

    if (targetJobs.length === 0) {
      res.json({
        success: true,
        message: "لا توجد مهام معلقة تتطلب التوزيع التلقائي حالياً",
        assignedCount: 0,
        details: [],
      });
      return;
    }

    const availableMachines = machines.filter(machine => machine.status !== "maintenance" && machine.status !== "offline");
    if (availableMachines.length === 0) {
      res.status(400).json({ success: false, message: "لا توجد ماكينات متاحة أو غير متوقفة للصيانة حالياً" });
      return;
    }

    const machineSimulatedJobsCount = new Map<string, number>();
    availableMachines.forEach(machine => machineSimulatedJobsCount.set(machine.id, 0));
    const assignmentResults: Array<Record<string, unknown>> = [];

    for (const job of targetJobs) {
      const jobRecord = job as ProductionJobView & Record<string, unknown>;
      const materialName = String(jobRecord.materialName ?? job.itemName ?? "").toLowerCase();
      let preferredType = "laser_co2";

      if (
        materialName.includes("فايبر") ||
        materialName.includes("حديد") ||
        materialName.includes("معدن") ||
        materialName.includes("استيل") ||
        materialName.includes("fiber")
      ) {
        preferredType = "fiber_laser";
      } else if (
        materialName.includes("cnc") ||
        materialName.includes("راوتر") ||
        materialName.includes("سميك")
      ) {
        preferredType = "cnc_router";
      }

      let candidates = availableMachines.filter(
        machine => machine.type === preferredType || machine.type.includes(preferredType),
      );
      if (candidates.length === 0) candidates = [...availableMachines];

      candidates.sort((a, b) => {
        if (a.status === "idle" && b.status !== "idle") return -1;
        if (a.status !== "idle" && b.status === "idle") return 1;

        const countA = machineSimulatedJobsCount.get(a.id) || 0;
        const countB = machineSimulatedJobsCount.get(b.id) || 0;
        if (countA !== countB) return countA - countB;

        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      const selectedMachine = candidates[0];
      if (!selectedMachine) continue;

      job.machineId = selectedMachine.id;
      machineSimulatedJobsCount.set(
        selectedMachine.id,
        (machineSimulatedJobsCount.get(selectedMachine.id) || 0) + 1,
      );

      if (autoStart && selectedMachine.status === "idle") {
        job.status = "running";
        jobRecord.startTime = new Date().toISOString();
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
        reason: `الماكينة الأقل استهلاكاً للساعات (${selectedMachine.workingHours?.toFixed(1) || 0} ساعة) المتوافقة مع التقنية (${selectedMachine.type || "ليزر"})`,
      });
    }

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "AUTO_ASSIGN_JOBS",
      entityType: "ProductionJob",
      entityId: "batch",
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `تم توزيع ${assignmentResults.length} مهمة قص تلقائياً بحسب ساعات العمل ونوع الماكينة`,
      assignedCount: assignmentResults.length,
      details: assignmentResults,
    });
  });
}

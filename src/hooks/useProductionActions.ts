import type React from "react";
import type { ProductionJob } from "../types";

type ProductionActionsOptions = {
  newMachineName: string;
  newMachineType: string;
  newMachineHours: string;
  currentUser: any;
  productionJobs: ProductionJob[];
  activeRunningJob: any;
  orders: any[];
  newJobItemName: string;
  newJobMaterialId: string;
  newJobLaserPower: number;
  newJobLaserSpeed: number;
  newJobEstTime: number;
  newJobOrderId: string;
  showRemnantRegister: any;
  jobRemWidth: string;
  jobRemHeight: string;
  jobRemLocation: string;
  setNewMachineName: (value: string) => void;
  setNewMachineHours: (value: string) => void;
  setShowAddMachine: (value: boolean) => void;
  setProductionJobs: (updater: any) => void;
  setActiveRunningJob: (value: any) => void;
  setLiveLogLines: (value: string[]) => void;
  setNewJobItemName: (value: string) => void;
  setNewJobMaterialId: (value: string) => void;
  setNewJobLaserPower: (value: number) => void;
  setNewJobLaserSpeed: (value: number) => void;
  setNewJobEstTime: (value: number) => void;
  setNewJobOrderId: (value: string) => void;
  setShowAddJob: (value: boolean) => void;
  setShowRemnantRegister: (value: any) => void;
  setJobRemWidth: (value: string) => void;
  setJobRemHeight: (value: string) => void;
  setJobRemLocation: (value: string) => void;
  fetchMachines: () => void | Promise<void>;
  fetchProductionJobs: () => void | Promise<void>;
  fetchOrders: () => void | Promise<void>;
  fetchLogs: () => void | Promise<void>;
  refreshInventoryData: () => void | Promise<void>;
  addTerminalLog: (scope: string, message: string) => void;
};

export function useProductionActions({
  newMachineName,
  newMachineType,
  newMachineHours,
  currentUser,
  productionJobs,
  activeRunningJob,
  orders,
  newJobItemName,
  newJobMaterialId,
  newJobLaserPower,
  newJobLaserSpeed,
  newJobEstTime,
  newJobOrderId,
  showRemnantRegister,
  jobRemWidth,
  jobRemHeight,
  jobRemLocation,
  setNewMachineName,
  setNewMachineHours,
  setShowAddMachine,
  setProductionJobs,
  setActiveRunningJob,
  setLiveLogLines,
  setNewJobItemName,
  setNewJobMaterialId,
  setNewJobLaserPower,
  setNewJobLaserSpeed,
  setNewJobEstTime,
  setNewJobOrderId,
  setShowAddJob,
  setShowRemnantRegister,
  setJobRemWidth,
  setJobRemHeight,
  setJobRemLocation,
  fetchMachines,
  fetchProductionJobs,
  fetchOrders,
  fetchLogs,
  refreshInventoryData,
  addTerminalLog,
}: ProductionActionsOptions) {
  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName) return;
    try {
      const res = await fetch("/api/production/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMachineName,
          type: newMachineType,
          workingHours: Number(newMachineHours) || 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        addTerminalLog("SYSTEM", `تم إضافة ماكينة جديدة بنجاح: ${newMachineName}`);
        setNewMachineName("");
        setNewMachineHours("0");
        setShowAddMachine(false);
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل إضافة ماكينة: ${data.message || "خطأ مجهول"}`);
      }
    } catch (err: any) {
      addTerminalLog("ERROR", `خطأ أثناء الاتصال بالخادم: ${err.message}`);
    }
  };

  const handleDeleteMachine = async (id: string) => {
    const confirmed = await window.showConfirm?.("هل أنت متأكد من رغبتك في حذف هذه الماكينة نهائياً؟", "تأكيد حذف الماكينة");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/production/machines/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        addTerminalLog("SYSTEM", "تم حذف الماكينة بنجاح من قاعدة البيانات.");
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل حذف الماكينة: ${data.message || "خطأ مجهول"}`);
      }
    } catch (err: any) {
      addTerminalLog("ERROR", `خطأ أثناء الاتصال بالخادم: ${err.message}`);
    }
  };

  // Start Production Job Simulation
  const handleStartProductionJob = async (jobId: string, machineId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, operatorId: currentUser?.id || "u-1" })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `بدء تشغيل المهمة ${data.job.jobNo} على الآلة. تم تحديث حالة الطلب المرتبط إلى (قيد التنفيذ) تلقائياً.`);
        fetchProductionJobs();
        fetchMachines();
        fetchOrders();
        fetchLogs();

        // Setup live simulation
        const jobToRun = productionJobs.find(j => j.id === jobId) || data.job;
        setActiveRunningJob(jobToRun);
        setLiveLogLines([
          `[${new Date().toLocaleTimeString()}] SYSTEM: Loading design vectors...`,
          `[${new Date().toLocaleTimeString()}] SYSTEM: Calibrating Z-axis distance to 4.2mm`,
          `[${new Date().toLocaleTimeString()}] CNC: G28 (Home position check)`,
          `[${new Date().toLocaleTimeString()}] CNC: M03 S${Math.round((jobToRun.laserPower || 80) * 10)} (Laser head ON)`,
          `[${new Date().toLocaleTimeString()}] ORDER: Updated linked order status to 'in_progress'`
        ]);
      }
    } catch (e) {
      console.error(e);
      addTerminalLog("ERROR", "فشل بدء تشغيل مهمة الإنتاج");
    }
  };

  // Pause Production Job
  const handlePauseProductionJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/pause`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم إيقاف المهمة مؤقتاً.`);
        fetchProductionJobs();
        fetchMachines();
        if (activeRunningJob?.id === jobId) {
          setActiveRunningJob(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Machine Calibration Settings
  const handleUpdateMachineCalibration = async (machineId: string, calibrationSettings: any) => {
    try {
      const res = await fetch(`/api/production/machines/${machineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrationSettings })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم تحديث معايرة آلة القص بنجاح.`);
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل تحديث المعايرة: ${data.message}`);
      }
    } catch (e: any) {
      addTerminalLog("ERROR", `خطأ في الاتصال بالخادم أثناء المعايرة: ${e.message}`);
    }
  };

  // Update Production Job Details (Material Cost & Waste Calculation)
  const handleUpdateProductionJob = (jobId: string, updatedData: Partial<ProductionJob>) => {
    setProductionJobs((prev: ProductionJob[]) => prev.map(job => {
      if (job.id === jobId) {
        return { ...job, ...updatedData };
      }
      return job;
    }));
    addTerminalLog("PROD", `تم حساب وتطبيق تكلفة المادة والهدر للمهمة ${jobId}`);
  };

  // Reorder Production Jobs Queue Sequence
  const handleReorderProductionJobs = async (newJobs: ProductionJob[]) => {
    setProductionJobs(newJobs);
    addTerminalLog("PROD", `تم إعادة جدولة طابور القص بالليزر وتحديث تسلسل ${newJobs.length} مهام بنجاح`);

    try {
      const orderedIds = newJobs.map(j => j.id);
      await fetch("/api/production/jobs/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
    } catch (e) {
      console.error("Error persisting job reorder:", e);
    }
  };

  // Create Production Job Manually
  const handleCreateProductionJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobItemName || !newJobMaterialId) {
      window.showAlert?.("الرجاء اختيار اسم المهمة ونوع الخامة", "تنبيه إدخال");
      return;
    }

    try {
      const res = await fetch("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: newJobItemName,
          materialId: newJobMaterialId,
          laserPower: newJobLaserPower,
          laserSpeed: newJobLaserSpeed,
          estTimeSec: newJobEstTime,
          orderId: newJobOrderId || null,
          orderNumber: newJobOrderId ? orders.find(o => o.id === newJobOrderId)?.orderNumber : "يدوي"
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إدراج مهمة قص جديدة: ${newJobItemName}`);
        setNewJobItemName("");
        setNewJobMaterialId("");
        setNewJobLaserPower(80);
        setNewJobLaserSpeed(30);
        setNewJobEstTime(90);
        setNewJobOrderId("");
        setShowAddJob(false);
        fetchProductionJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Register Remnant Offcut upon Job Completion
  const handleRegisterRemnantOnJobComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRemnantRegister) return;

    try {
      const res = await fetch(`/api/production/jobs/${showRemnantRegister.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remnantWidth: jobRemWidth ? Number(jobRemWidth) : undefined,
          remnantHeight: jobRemHeight ? Number(jobRemHeight) : undefined,
          remnantLocation: jobRemLocation || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إكمال المهمة وتحديث المخزون بنجاح.`);
        if (jobRemWidth && jobRemHeight) {
          addTerminalLog("DB", `تم توليد وتسجيل فضلة لوح مقاس ${jobRemWidth}x${jobRemHeight} مم.`);
        }
        setShowRemnantRegister(null);
        setJobRemWidth("");
        setJobRemHeight("");
        setJobRemLocation("");
        fetchProductionJobs();
        fetchMachines();
        refreshInventoryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Complete Job (without remnant form)
  const handleDirectCompleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إكمال المهمة ${jobId} بنجاح.`);
        fetchProductionJobs();
        fetchMachines();
        refreshInventoryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change Machine Maintenance Status
  const handleChangeMachineMaintenance = async (machineId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "maintenance" ? "idle" : "maintenance";
      const res = await fetch(`/api/production/machines/${machineId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم تحديث حالة صيانة الآلة ${data.machine.name} إلى: ${newStatus === 'maintenance' ? 'تحت الصيانة' : 'نشط وجاهز'}`);
        fetchMachines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    handleAddMachine,
    handleDeleteMachine,
    handleStartProductionJob,
    handlePauseProductionJob,
    handleUpdateMachineCalibration,
    handleUpdateProductionJob,
    handleReorderProductionJobs,
    handleCreateProductionJob,
    handleRegisterRemnantOnJobComplete,
    handleDirectCompleteJob,
    handleChangeMachineMaintenance,
  };
}

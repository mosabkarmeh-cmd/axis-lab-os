import express from "express";
import { db } from "../../../db/index.ts";
import { machines as machinesTable } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../../server-core.ts";

const { MACHINES, getRequestUser, idNum } = core;

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

const machines = MACHINES as unknown as MachineView[];

export function registerProductionMachineRoutes(app: express.Express) {
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

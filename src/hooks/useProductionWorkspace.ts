import { useEffect, useState } from "react";
import type { Machine, ProductionJob } from "../types";

type MachineLayout = "grid" | "list";
type MachineStatusFilter = "all" | "idle" | "running" | "maintenance" | "offline";

export function useProductionWorkspace() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [isLoadingProduction, setIsLoadingProduction] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [activeProductionSubTab, setActiveProductionSubTab] = useState<"console" | "calibration">("console");
  const [newMachineName, setNewMachineName] = useState("");
  const [newMachineType, setNewMachineType] = useState("laser_co2");
  const [newMachineHours, setNewMachineHours] = useState("0");
  const [machineSearchQuery, setMachineSearchQuery] = useState("");
  const [machineStatusFilter, setMachineStatusFilter] = useState<MachineStatusFilter>("all");
  const [machineLayout, setMachineLayout] = useState<MachineLayout>(() => {
    const saved = localStorage.getItem("axislab_machine_layout");
    return saved === "list" || saved === "grid" ? saved : "grid";
  });
  const [newJobItemName, setNewJobItemName] = useState("");
  const [newJobMaterialId, setNewJobMaterialId] = useState("");
  const [newJobLaserPower, setNewJobLaserPower] = useState(80);
  const [newJobLaserSpeed, setNewJobLaserSpeed] = useState(30);
  const [newJobEstTime, setNewJobEstTime] = useState(90);
  const [newJobOrderId, setNewJobOrderId] = useState("");
  const [activeRunningJob, setActiveRunningJob] = useState<ProductionJob | null>(null);
  const [liveLogLines, setLiveLogLines] = useState<string[]>([]);
  const [laserX, setLaserX] = useState(0);
  const [laserY, setLaserY] = useState(0);
  const [showRemnantRegister, setShowRemnantRegister] = useState<ProductionJob | null>(null);
  const [jobRemWidth, setJobRemWidth] = useState("");
  const [jobRemHeight, setJobRemHeight] = useState("");
  const [jobRemLocation, setJobRemLocation] = useState("");

  useEffect(() => {
    localStorage.setItem("axislab_machine_layout", machineLayout);
  }, [machineLayout]);

  return {
    machines, setMachines, productionJobs, setProductionJobs, isLoadingProduction, setIsLoadingProduction,
    showAddJob, setShowAddJob, showAddMachine, setShowAddMachine, activeProductionSubTab, setActiveProductionSubTab,
    newMachineName, setNewMachineName, newMachineType, setNewMachineType, newMachineHours, setNewMachineHours,
    machineSearchQuery, setMachineSearchQuery, machineStatusFilter, setMachineStatusFilter, machineLayout, setMachineLayout,
    newJobItemName, setNewJobItemName, newJobMaterialId, setNewJobMaterialId, newJobLaserPower, setNewJobLaserPower,
    newJobLaserSpeed, setNewJobLaserSpeed, newJobEstTime, setNewJobEstTime, newJobOrderId, setNewJobOrderId,
    activeRunningJob, setActiveRunningJob, liveLogLines, setLiveLogLines, laserX, setLaserX, laserY, setLaserY,
    showRemnantRegister, setShowRemnantRegister, jobRemWidth, setJobRemWidth, jobRemHeight, setJobRemHeight,
    jobRemLocation, setJobRemLocation,
  };
}

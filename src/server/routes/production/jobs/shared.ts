import express from "express";
import * as core from "../../../server-core.ts";

export type ProductionJobView = {
  id: string;
  jobNo?: string;
  orderId?: string;
  orderNumber?: string;
  itemName?: string;
  materialId?: string;
  machineId?: string | null;
  status?: string;
  progress?: number;
  estTimeSec?: number;
  elapsedTimeSec?: number;
  laserPower?: number;
  laserSpeed?: number;
  operatorId?: string | null;
  priority?: string | number;
  createdAt?: string;
  completedAt?: string;
  materialCostUSD?: number;
  technicianCostUSD?: number;
  [key: string]: unknown;
};

export type MachineView = {
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

export const productionJobs = core.PRODUCTION_JOBS as unknown as ProductionJobView[];
export const machines = core.MACHINES as unknown as MachineView[];

export function getActorId(req: express.Request): string {
  return core.getRequestUser(req)?.id || "system";
}

export function sanitizeProductionJob(job: ProductionJobView, req: express.Request): Record<string, unknown> {
  const safeJob: Record<string, unknown> = { ...job };
  const user = core.getRequestUser(req);
  if (user?.role === "employee") {
    delete safeJob.materialPricePerUnit;
    delete safeJob.materialCostUSD;
    delete safeJob.technicianCostUSD;
    delete safeJob.totalDirectCostUSD;
  }
  return safeJob;
}

export function sanitizeProductionJobs(jobs: ProductionJobView[], req: express.Request) {
  return jobs.map(job => sanitizeProductionJob(job, req));
}

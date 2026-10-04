import type {
  MaterialReportRecord,
  ProductionJobReportRecord,
  OrderReportRecord,
  ReportSettings,
} from "./types.ts";

export function buildOperationsAnalytics(
  orders: OrderReportRecord[],
  productionJobs: ProductionJobReportRecord[],
  materials: MaterialReportRecord[],
  currentRate: number,
  settings: ReportSettings,
  sypToUsd: (amountSYP: number, exchangeRate?: number) => number,
) {
  const completedJobs = productionJobs.filter(job => job.status === "completed");
  const materialCostSYP = completedJobs.reduce((sum, job) => {
    const material = job.materialId ? materials.find(item => item.id === job.materialId) : undefined;
    return sum + Math.round(Number(material?.pricePerUnit) || 0);
  }, 0);

  const productionHours = productionJobs.reduce(
    (sum, job) => sum + ((Number(job.elapsedTimeSec ?? job.estTimeSec) || 0) / 3600),
    0,
  );

  const laborCostSYP = Math.round(
    productionHours * (Number(settings.pricing?.assemblyCostPerHour) || 0) * currentRate,
  );
  const directCostSYP = materialCostSYP + laborCostSYP;

  const completedOrders = orders.filter(order => order.status === "delivered").length;
  const overdueOrders = orders.filter(order => {
    if (!order.deliveryDateExpected || ["delivered", "cancelled"].includes(order.status || "")) return false;
    return new Date(order.deliveryDateExpected).getTime() < Date.now();
  }).length;

  const totalOrdersCount = orders.length;
  const completedOrderRate = totalOrdersCount > 0 ? (completedOrders / totalOrdersCount) * 100 : 0;

  const workflowLabels: Record<string, string> = {
    new: "جديد",
    design: "التصميم",
    design_approved: "اعتماد التصميم",
    cutting: "القص",
    cutting_complete: "انتهاء القص",
    assembly: "التجميع",
    assembly_complete: "انتهاء التجميع",
    packaging: "التغليف",
    ready: "بانتظار التسليم",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    in_progress: "تنفيذ قديم",
  };

  const ordersByStatus: Record<string, number> = {};
  for (const order of orders) {
    const status = order.status || "unknown";
    ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
  }
  const workflowFunnel = Object.entries(ordersByStatus)
    .map(([status, count]) => ({ status, name: workflowLabels[status] || status, count }));

  return {
    materialCostSYP,
    productionHours: Number(productionHours.toFixed(2)),
    laborCostSYP,
    directCostSYP,
    overdueOrders,
    completedOrders,
    completionRate: completedOrderRate,
    workflowFunnel,
  };
}

export function buildMachineAnalytics(
  machines: Array<{ id: string; name: string; type: string; status: string; workingHours?: number }>,
  productionJobs: ProductionJobReportRecord[],
) {
  return machines.map(machine => {
    const machineJobs = productionJobs.filter(job => job.machineId === machine.id);
    const completedJobs = machineJobs.filter(job => job.status === "completed");
    return {
      id: machine.id,
      name: machine.name,
      type: machine.type,
      status: machine.status,
      workingHours: machine.workingHours || 0,
      totalJobs: machineJobs.length,
      completedJobs: completedJobs.length,
    };
  });
}

import express from "express";
import * as core from "../../server-core.ts";
import {
  buildSalesAnalytics,
  buildProductDemand,
  buildRecentOrderTrends,
} from "./sales.ts";
import { buildFinancialAnalytics } from "./financial.ts";
import { buildOperationsAnalytics, buildMachineAnalytics } from "./operations.ts";
import { buildInventoryAnalytics } from "./inventory.ts";
import {
  asRecordArray,
  type CustomerReportRecord,
  type ExpenseReportRecord,
  type InvoiceReportRecord,
  type InventoryReportRecord,
  type MachineReportRecord,
  type MaterialReportRecord,
  type OrderReportRecord,
  type ProductionJobReportRecord,
  type ReportSettings,
} from "./types.ts";

const {
  ORDERS,
  PRODUCTION_JOBS,
  MATERIALS,
  INVENTORY,
  EXPENSES,
  INVOICES,
  CUSTOMERS,
  getPartnerSharePercentAt,
  sypToUsd,
  MACHINES,
  SETTINGS,
} = core;

export function registerAnalyticsReportRoute(app: express.Express) {
  app.get("/api/reports/analytics", (req, res) => {
    const orders = asRecordArray<OrderReportRecord>(ORDERS);
    const invoices = asRecordArray<InvoiceReportRecord>(INVOICES);
    const expenses = asRecordArray<ExpenseReportRecord>(EXPENSES);
    const customers = asRecordArray<CustomerReportRecord>(CUSTOMERS);
    const productionJobs = asRecordArray<ProductionJobReportRecord>(PRODUCTION_JOBS);
    const materials = asRecordArray<MaterialReportRecord>(MATERIALS);
    const inventory = asRecordArray<InventoryReportRecord>(INVENTORY);
    const machines = asRecordArray<MachineReportRecord>(MACHINES);
    const settings = SETTINGS as ReportSettings;

    const currentRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 135;

    const sales = buildSalesAnalytics(orders, customers, currentRate, sypToUsd);
    const financial = buildFinancialAnalytics(
      invoices,
      expenses,
      orders,
      customers,
      currentRate,
      getPartnerSharePercentAt,
    );
    const operations = buildOperationsAnalytics(
      orders,
      productionJobs,
      materials,
      currentRate,
      settings,
      sypToUsd,
    );
    const inventoryReport = buildInventoryAnalytics(materials, inventory, currentRate, sypToUsd);
    const machinesReport = buildMachineAnalytics(machines, productionJobs);

    const completedOrders = orders.filter(order => order.status === "delivered").length;
    const monthlyOrderTrends = buildRecentOrderTrends(orders);
    const topProducts = buildProductDemand(orders);
    const trueProfitSYP = financial.totalRevenueSYP - financial.totalExpensesSYP - operations.directCostSYP;

    operations.trueProfitSYP = trueProfitSYP;
    operations.trueProfitUSD = sypToUsd(trueProfitSYP, currentRate);
    operations.topProducts = topProducts;
    operations.monthlyOrderTrends = monthlyOrderTrends;

    const response = {
      success: true,
      analytics: {
        sales: {
          totalOrdersCount: sales.totalOrdersCount,
          totalOrdersValue: sales.totalOrdersValueSYP,
          totalOrdersValueSYP: sales.totalOrdersValueSYP,
          totalOrdersValueUSD: sales.totalOrdersValueUSD,
          avgOrderValue: sales.avgOrderValueSYP,
          avgOrderValueSYP: sales.avgOrderValueSYP,
          avgOrderValueUSD: sales.avgOrderValueUSD,
          exchangeRate: currentRate,
          ordersByStatus: sales.ordersByStatus,
          topCustomers: sales.topCustomers,
        },
        financial: {
          totalRevenue: financial.totalRevenue,
          totalReceivables: financial.totalReceivables,
          totalRevenueSYP: financial.totalRevenueSYP,
          totalReceivablesSYP: financial.totalReceivablesSYP,
          totalExpenses: financial.totalExpenses,
          totalExpensesSYP: financial.totalExpensesSYP,
          netProfit: financial.netProfit,
          netProfitSYP: financial.netProfitSYP,
          profitMargin: financial.profitMargin,
          partnerSharePercent: financial.partnerSharePercent,
          partnerProfit: financial.partnerProfit,
          partnerProfitSYP: financial.partnerProfitSYP,
          workshopProfit: financial.workshopProfit,
          workshopProfitSYP: financial.workshopProfitSYP,
          expenseBreakdown: financial.expenseBreakdown,
          recentTransactions: financial.recentTransactions,
        },
        operations: {
          directCostSYP: operations.directCostSYP,
          materialCostSYP: operations.materialCostSYP,
          laborCostSYP: operations.laborCostSYP,
          productionHours: operations.productionHours,
          trueProfitSYP: operations.trueProfitSYP,
          trueProfitUSD: operations.trueProfitUSD,
          overdueOrders: operations.overdueOrders,
          completedOrders,
          completionRate: operations.completionRate,
          workflowFunnel: operations.workflowFunnel,
          topProducts: operations.topProducts,
          monthlyOrderTrends: operations.monthlyOrderTrends,
        },
        machines: machinesReport,
        inventory: inventoryReport,
      },
    };

    res.json(response);
  });
}

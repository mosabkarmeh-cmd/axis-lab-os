import express from "express";
import * as core from "../server-core.ts";

const {
  ORDERS,
  PRODUCTION_JOBS,
  MATERIALS,
  INVENTORY,
  EXPENSES,
  INVOICES,
  CUSTOMERS,
  getRequestUser,
} = core;

export function registerReportRoutes(app: express.Express) {
  app.get("/api/reports/analytics", (req, res) => {
    // See note on /api/accounting/stats: in-memory is the fresh, race-free
    // source; SQLite durability is handled by loadPersistedState() at boot.
    const sourceInvoices = INVOICES;
    const sourceExpenses = EXPENSES;
    // 1. Sales & Orders
    const totalOrdersCount = ORDERS.length;
    const orderValueSYP = (order) => Math.round(Number(order.totalPrice) || 0);
    const totalOrdersValueSYP = ORDERS.reduce((sum, ord) => sum + orderValueSYP(ord), 0);
    const avgOrderValueSYP = totalOrdersCount > 0 ? (totalOrdersValueSYP / totalOrdersCount) : 0;
    const currentRate = Number(SETTINGS.exchangeRate) > 0 ? Number(SETTINGS.exchangeRate) : 135;
    const totalOrdersValueUSD = sypToUsd(totalOrdersValueSYP, currentRate);
    
    const ordersByStatus: Record<string, number> = {};
    ORDERS.forEach(ord => {
      ordersByStatus[ord.status] = (ordersByStatus[ord.status] || 0) + 1;
    });

    // Top Customers by spending
    const customerSpending: Record<string, number> = {};
    ORDERS.forEach(ord => {
      customerSpending[ord.customerId] = (customerSpending[ord.customerId] || 0) + orderValueSYP(ord);
    });
    
    const topCustomers = Object.entries(customerSpending).map(([id, totalSpent]) => {
      const cust = CUSTOMERS.find(c => c.id === id);
      return {
        id,
        name: cust ? cust.name : "عميل غير معروف",
        company: cust ? (cust.company || "أفراد") : "أفراد",
        totalSpent,
        totalSpentSYP: totalSpent,
        totalSpentUSD: sypToUsd(totalSpent, currentRate)
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

    // 2. Financial Metrics
    const invoiceReportRate = currentRate;
    const invoiceSYP = (inv: unknown, usdField: string, sypField: string) => {
      const fixedSYP = Number(inv[sypField]);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const linkedOrder = ORDERS.find((order) => order.id === inv.orderId);
      const historicalRate = Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || linkedOrder?.exchangeRateAtCreation);
      const rate = historicalRate > 0 ? historicalRate : 135;
      return Math.round((Number(inv[usdField]) || 0) * rate);
    };
    const totalRevenue = sourceInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalReceivables = sourceInvoices.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
    const totalRevenueSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "paidAmount", "paidAmountSYP"), 0);
    const totalReceivablesSYP = sourceInvoices.reduce((sum, inv) => sum + invoiceSYP(inv, "remaining", "remainingSYP"), 0);
    const expenseSYP = (exp: unknown) => {
      const fixedSYP = Number(exp.amountSYP);
      if (Number.isFinite(fixedSYP)) return Math.round(fixedSYP);
      const historicalRate = Number(exp.exchangeRateAtCreation);
      return Math.round((Number(exp.amountUSD ?? exp.amount) || 0) * (historicalRate > 0 ? historicalRate : 135));
    };
    const totalExpenses = sourceExpenses.reduce((sum, exp) => sum + (exp.amountUSD ?? exp.amount ?? 0), 0);
    const totalExpensesSYP = sourceExpenses.reduce((sum, exp) => sum + expenseSYP(exp), 0);
    const netProfit = totalRevenue - totalExpenses;
    const netProfitSYP = totalRevenueSYP - totalExpensesSYP;
    const profitMargin = totalRevenueSYP > 0 ? (netProfitSYP / totalRevenueSYP) * 100 : 0;

    const expenseCategories: Record<string, number> = {};
    sourceExpenses.forEach(e => {
      expenseCategories[e.category] = (expenseCategories[e.category] || 0) + (e.amountUSD ?? e.amount);
    });
    const expenseBreakdown = Object.entries(expenseCategories).map(([name, value]) => ({
      name,
      value,
      valueUSD: value,
      valueSYP: sourceExpenses.filter((expense) => expense.category === name).reduce((sum, expense) => sum + expenseSYP(expense), 0)
    }));

    // 3. Machines & Operations
    const machineUtilization = MACHINES.map(m => {
      // Find total jobs assigned to this machine
      // (The PRODUCTION_JOBS array) - let's find jobs belonging to this machine
      // Let's safe-guard with global array existence
      const totalJobs = PRODUCTION_JOBS ? PRODUCTION_JOBS.filter((j: unknown) => j.machineId === m.id).length : 0;
      const completedJobs = PRODUCTION_JOBS ? PRODUCTION_JOBS.filter((j: unknown) => j.machineId === m.id && j.status === "completed").length : 0;
      
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        status: m.status,
        workingHours: m.workingHours || 0,
        totalJobs,
        completedJobs
      };
    });

    // 4. Inventory & Materials
    const stockStatus = MATERIALS.map(m => {
      const invRecord = INVENTORY.find(i => i.materialId === m.id);
      const stockQty = invRecord ? invRecord.quantity : 0;
      const minStock = m.minimumStock || 0;
      const isLowStock = stockQty < minStock;
      
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        stockQuantity: stockQty,
        minimumStock: minStock,
        unit: m.unit,
        isLowStock,
        stockValue: stockQty * Math.round(Number(m.pricePerUnit) || 0),
        stockValueSYP: stockQty * Math.round(Number(m.pricePerUnit) || 0),
        stockValueUSD: sypToUsd(stockQty * Math.round(Number(m.pricePerUnit) || 0), currentRate)
      };
    });

    const lowStockCount = stockStatus.filter(s => s.isLowStock).length;
    const totalInventoryValue = stockStatus.reduce((sum, item) => sum + item.stockValue, 0);

    // Recent Financial Transactions Combined
    const recentInvoices = sourceInvoices.map(inv => ({
      id: inv.id,
      type: "invoice",
      reference: inv.invoiceNumber,
      amount: inv.totalPrice,
      amountUSD: Number(inv.totalPriceUSD ?? inv.totalPrice ?? 0),
      amountSYP: Math.round(Number(inv.totalPriceSYP ?? ((Number(inv.totalPriceUSD ?? inv.totalPrice) || 0) * (Number(inv.exchangeRateAtFinalization || inv.exchangeRateAtIssue || ORDERS.find((order) => order.id === inv.orderId)?.exchangeRateAtCreation) || 135)))),
      date: inv.issueDate,
      description: `فاتورة مبيعات للعميل: ${CUSTOMERS.find(c => c.id === inv.customerId)?.name || "عميل غير معروف"}`,
      status: inv.status === "paid" ? "تم التحصيل" : (inv.status === "partially_paid" ? "محصل جزئياً" : "غير محصل")
    }));

    const recentExpenses = sourceExpenses.map(exp => ({
      id: exp.id,
      type: "expense",
      reference: `EXP-${exp.id}`,
      amount: exp.amount,
      date: exp.date,
      description: `مصروفات [${exp.category}]: ${exp.description || "بدون بيان تفصيلي"}`,
      status: exp.status === "paid" ? "تم الصرف" : "معلق"
    }));

    const recentTransactions = [...recentInvoices, ...recentExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const completedJobs = PRODUCTION_JOBS.filter((job) => job.status === "completed");
    const materialCostSYP = completedJobs.reduce((sum: number, job: unknown) => {
      const material = MATERIALS.find((item) => item.id === job.materialId);
      return sum + Math.round(Number(material?.pricePerUnit) || 0);
    }, 0);
    const productionHours = PRODUCTION_JOBS.reduce((sum: number, job: unknown) => sum + ((Number(job.elapsedTimeSec || job.estTimeSec) || 0) / 3600), 0);
    const laborCostSYP = Math.round(productionHours * (Number(SETTINGS.pricing?.assemblyCostPerHour) || 0) * currentRate);
    const directCostSYP = materialCostSYP + laborCostSYP;
    const trueProfitSYP = totalRevenueSYP - totalExpensesSYP - directCostSYP;
    const overdueOrders = ORDERS.filter((order) => order.deliveryDateExpected && !["delivered", "cancelled"].includes(order.status) && new Date(order.deliveryDateExpected).getTime() < Date.now()).length;
    const completedOrders = ORDERS.filter((order) => order.status === "delivered").length;
    const completionRate = totalOrdersCount > 0 ? (completedOrders / totalOrdersCount) * 100 : 0;
    const workflowLabels: Record<string, string> = {
      new: "جديد", design: "التصميم", design_approved: "اعتماد التصميم", cutting: "القص",
      cutting_complete: "انتهاء القص", assembly: "التجميع", assembly_complete: "انتهاء التجميع",
      packaging: "التغليف", ready: "بانتظار التسليم", delivered: "تم التسليم", cancelled: "ملغي", in_progress: "تنفيذ قديم"
    };
    const workflowFunnel = Object.entries(ordersByStatus).map(([status, count]) => ({ status, name: workflowLabels[status] || status, count }));
    const productDemand: Record<string, number> = {};
    ORDERS.forEach((order) => (order.items || []).forEach((item) => {
      const name = item.productName || item.name || "منتج غير مسمى";
      productDemand[name] = (productDemand[name] || 0) + (Number(item.quantity) || 0);
    }));
    const topProducts = Object.entries(productDemand).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 8);
    const monthlyOrders: Record<string, { orders: number; delivered: number; valueSYP: number }> = {};
    ORDERS.forEach((order) => {
      const date = new Date(order.createdAt || order.orderDate || "");
      if (Number.isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyOrders[monthKey]) monthlyOrders[monthKey] = { orders: 0, delivered: 0, valueSYP: 0 };
      monthlyOrders[monthKey].orders += 1;
      if (order.status === "delivered") monthlyOrders[monthKey].delivered += 1;
      monthlyOrders[monthKey].valueSYP += orderValueSYP(order);
    });
    const monthlyOrderTrends = Object.entries(monthlyOrders).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, data]) => ({ month, ...data }));

    res.json({
      success: true,
      analytics: {
        sales: {
          totalOrdersCount,
          totalOrdersValue: totalOrdersValueSYP,
          totalOrdersValueSYP,
          totalOrdersValueUSD,
          avgOrderValue: avgOrderValueSYP,
          avgOrderValueSYP,
          avgOrderValueUSD: sypToUsd(avgOrderValueSYP, currentRate),
          exchangeRate: currentRate,
          ordersByStatus,
          topCustomers
        },
        financial: {
          totalRevenue,
          totalReceivables,
          totalRevenueSYP,
          totalReceivablesSYP,
          totalExpenses,
          totalExpensesSYP,
          netProfit,
          netProfitSYP,
          profitMargin,
          partnerSharePercent: getPartnerSharePercentAt(),
          partnerProfit: netProfit * (getPartnerSharePercentAt() / 100),
          partnerProfitSYP: netProfitSYP * (getPartnerSharePercentAt() / 100),
          workshopProfit: netProfit * (1 - getPartnerSharePercentAt() / 100),
          workshopProfitSYP: netProfitSYP * (1 - getPartnerSharePercentAt() / 100),
          expenseBreakdown,
          recentTransactions
        },
        operations: {
          directCostSYP,
          materialCostSYP,
          laborCostSYP,
          productionHours: Number(productionHours.toFixed(2)),
          trueProfitSYP,
          trueProfitUSD: sypToUsd(trueProfitSYP, currentRate),
          overdueOrders,
          completedOrders,
          completionRate,
          workflowFunnel,
          topProducts,
          monthlyOrderTrends
        },
        machines: machineUtilization,
        inventory: {
          stockStatus,
          lowStockCount,
          totalInventoryValue
        }
      }
    });
  });

  // ==================== SETTINGS & BACKUP API ====================
  app.get("/api/network/info", (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips: { name: string; address: string; family: string; internal: boolean }[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === "IPv4") {
          ips.push({
            name: name,
            address: net.address,
            family: net.family,
            internal: net.internal
          });
        }
      }
    }
    res.json({
      success: true,
      ips: ips,
      port: 3000,
      platform: os.platform(),
      hostname: os.hostname(),
      env: process.env.NODE_ENV || "development"
    });
  });

}

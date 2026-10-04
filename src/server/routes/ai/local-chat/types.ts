export type AiStats = {
    customersCount: number;
    ordersCount: number;
    pendingOrdersCount: number;
    totalRevenue: number;
    totalPaid: number;
    totalDebt: number;
    machinesCount: number;
    activeJobsCount: number;
    lowStockMaterials: string[];
    canViewFinancials?: boolean;
    canViewCustomerPrivateData?: boolean;
};


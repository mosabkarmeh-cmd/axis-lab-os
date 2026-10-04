export interface OrderReportRecord {
  id: string;
  customerId?: string;
  totalPrice?: unknown;
  status?: string;
  deliveryDateExpected?: string;
  items?: Array<Record<string, unknown>>;
  createdAt?: string;
  orderDate?: string;
  exchangeRateAtCreation?: unknown;
}

export interface InvoiceReportRecord {
  id: string;
  customerId?: string;
  orderId?: string;
  invoiceNumber?: string;
  totalPrice?: unknown;
  totalPriceUSD?: unknown;
  totalPriceSYP?: unknown;
  paidAmount?: number;
  paidAmountSYP?: number;
  remaining?: number;
  remainingSYP?: number;
  exchangeRateAtFinalization?: unknown;
  exchangeRateAtIssue?: unknown;
  issueDate?: string;
  status?: string;
}

export interface ExpenseReportRecord {
  id: string;
  category: string;
  amount?: unknown;
  amountUSD?: unknown;
  amountSYP?: unknown;
  date: string;
  description?: string;
  status?: string;
  exchangeRateAtCreation?: unknown;
}

export interface ProductionJobReportRecord {
  id?: string;
  machineId?: string;
  materialId?: string;
  status?: string;
  elapsedTimeSec?: unknown;
  estTimeSec?: unknown;
}

export interface CustomerReportRecord {
  id: string;
  name: string;
  company?: string;
}

export interface MaterialReportRecord {
  id: string;
  name: string;
  category: string;
  minimumStock?: number;
  unit: string;
  pricePerUnit?: unknown;
}

export interface InventoryReportRecord {
  materialId: string;
  quantity?: number;
}

export interface MachineReportRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  workingHours?: number;
}

export interface ReportSettings {
  exchangeRate?: number;
  pricing?: {
    assemblyCostPerHour?: number;
  };
}

export function asRecordArray<T>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => item !== null && typeof item === "object")
    : [];
}

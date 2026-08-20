export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee' | 'accountant';
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  address?: string;
  notes?: string;
  category?: 'شركة' | 'أفراد' | 'مقاول' | string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface OrderStatusHistory {
  oldStatus?: string;
  newStatus: string;
  notes: string;
  changedAt: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  amountUSD: number;
  amountSYP?: number;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: 'new' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  totalPrice: number;
  paidAmount: number;
  remaining: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  deliveryDateExpected?: string;
  deliveryDateActual?: string;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  payments?: OrderPayment[];
  taxPercent?: number;
  discount?: number;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

export interface CodeFile {
  id: string;
  name: string;
  code: string;
  language: string;
  size: string;
  lastEdited: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  description?: string;
  stock?: number;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'offline' | 'maintenance';
  currentJobId: string | null;
  lastMaintenance?: string;
  workingHours: number;
  calibrationSettings?: {
    scaleX?: number;
    scaleY?: number;
    expectedWidth?: number;
    expectedHeight?: number;
    measuredWidth?: number;
    measuredHeight?: number;
    lastTestCutDate?: string;
    testMaterialId?: string;
  };
}

export interface ProductionJob {
  id: string;
  jobNo: string;
  orderId: string | null;
  orderNumber: string;
  itemName: string;
  materialId: string;
  materialName?: string;
  materialPricePerUnit?: number;
  materialCostUSD?: number;
  technicianCostUSD?: number;
  totalDirectCostUSD?: number;
  machineId: string | null;
  machineName?: string;
  status: 'pending' | 'running' | 'paused' | 'completed';
  progress: number;
  estTimeSec: number;
  elapsedTimeSec: number;
  laserPower: number;
  laserSpeed: number;
  operatorId: string | null;
  operatorName?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GCodeResult {
  gcodeSnippet: string;
  estimatedTime: string;
  totalPaths: number;
  beamDutyCycle: string;
  materialLossPercent: number;
  calibrationAdvice: string;
  gcodeExplanation: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;  // discount on this specific item
  tax: number;       // tax amount on this item
  total: number;     // quantity * unitPrice - discount + tax
  createdAt: string;
}

export interface InvoiceHistory {
  id: string;
  invoiceId: string;
  action: 'created' | 'updated' | 'cancelled' | 'credit_note' | 'sent' | 'paid';
  oldData?: any;
  newData?: any;
  userId: string;
  createdAt: string;
}

export interface NumberingSetting {
  id: string;
  entity: string; // invoice, order, job, quotation, payment
  prefix: string;
  suffix: string;
  digits: number;
  separator: string;
  nextNumber: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string | null;
  customerId: string;
  customerName?: string;
  orderNumber?: string | null;
  issueDate: string;
  dueDate: string;
  totalPrice: number;
  totalPriceSYP?: number;
  totalPriceUSD?: number;
  exchangeRateAtIssue?: number;
  exchangeRateAtFinalization?: number;
  currencyFinalizedAt?: string;
  subtotal?: number;
  taxPercent?: number;
  discount?: number;
  paidAmount: number;
  paidAmountSYP?: number;
  paidAmountUSD?: number;
  remaining: number;
  remainingSYP?: number;
  remainingUSD?: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'unpaid' | 'cancelled' | 'credit_note';
  notes?: string;
  items?: InvoiceItem[];
  history?: InvoiceHistory[];
}

export interface Expense {
  id: string;
  category: string;
  /** Legacy/reporting amount in USD. */
  amount: number;
  amountUSD?: number;
  amountSYP?: number;
  exchangeRateAtCreation?: number;
  currency?: 'USD' | 'SYP' | string;
  date: string;
  description?: string;
  status: 'paid' | 'pending';
  createdById?: string;
}

/** Profit distribution configuration persisted with the application settings snapshot. */
export interface PartnerShareHistoryEntry {
  effectiveFrom: string;
  percent: number;
}

export interface Settings {
  partnerSharePercent: number;
  partnerShareHistory?: PartnerShareHistoryEntry[];
}

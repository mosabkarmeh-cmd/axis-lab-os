export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: string;
  createdById: string;
  [key: string]: unknown;
}

export interface NumberingSetting {
  id: string;
  entity: string;
  prefix: string;
  suffix: string;
  digits: number;
  separator: string;
  nextNumber: number;
  [key: string]: unknown;
}

export interface NotificationSeed {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  link: string;
  [key: string]: unknown;
}

export interface DeletedItemSeed {
  id: string;
  entityType: string;
  entityId: string;
  name: string;
  deletedAt: string;
  deletedBy: string;
  originalData: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OrderStatusSeed {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  [key: string]: unknown;
}

export interface BackupSeed {
  id: string;
  name: string;
  createdAt: string;
  status: string;
  filePath?: string;
  size?: number;
  sha256?: string;
  [key: string]: unknown;
}

export interface ProductionJobSeed {
  id: string;
  jobNo: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  materialId: string;
  machineId: string | null;
  status: string;
  progress: number;
  estTimeSec: number;
  elapsedTimeSec: number;
  laserPower: number;
  laserSpeed: number;
  operatorId: string | null;
  createdAt: string;
  completedAt?: string;
  [key: string]: unknown;
}

export const EXPENSES: ExpenseRecord[] = [
  { id: "exp-1", category: "رواتب", amount: 450.0, date: "2026-07-01", description: "راتب فني تشغيل الليزر لشهر يونيو", status: "paid", createdById: "u-1" },
  { id: "exp-2", category: "صيانة", amount: 80.0, date: "2026-07-03", description: "شراء مرايا جديدة لعدسة الليزر CO2", status: "paid", createdById: "u-1" },
  { id: "exp-3", category: "كهرباء ومرافق", amount: 120.0, date: "2026-07-05", description: "فاتورة كهرباء المصنع", status: "paid", createdById: "u-1" },
  { id: "exp-4", category: "خامات ومواد", amount: 250.0, date: "2026-07-07", description: "شراء ألواح أكريليك من الشركة الوطنية", status: "paid", createdById: "u-1" }
];

export const NUMBERING_SETTINGS: NumberingSetting[] = [] = [
  { id: "num-1", entity: "invoice", prefix: "INV", suffix: "", digits: 6, separator: "-", nextNumber: 3 },
  { id: "num-2", entity: "order", prefix: "ORD", suffix: "", digits: 6, separator: "-", nextNumber: 3 },
  { id: "num-3", entity: "job", prefix: "JOB", suffix: "", digits: 6, separator: "-", nextNumber: 3 }
];

export const INVOICE_HISTORY: unknown[] = [];

export const NOTIFICATIONS: NotificationSeed[] = [] = [
  { id: "notif_1", title: "تم تفعيل نظام ليزر CO2 بنجاح والاتصال بالماكينات", message: "تم تفعيل نظام ليزر CO2 بنجاح والاتصال بالماكينات بقناة الاتصال الآمنة.", type: "system", priority: "normal", isRead: false, createdAt: new Date(Date.now() - 3600000 * 0.1).toISOString(), link: "" },
  { id: "notif_2", title: "انخفاض خامة الأكريليك الشفاف (3 مم)", message: "انخفاض خامة الأكريليك الشفاف (3 مم) في المخزون عن الحد الأدنى المسموح به.", type: "inventory", priority: "high", isRead: false, createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), link: "/inventory" },
  { id: "notif_3", title: "دفعة مالية جديدة بقيمة $150.00", message: "العميل شركة الأمل للدعاية أضاف دفعة مالية بقيمة $150.00 للطلب AX-2026-001.", type: "financial", priority: "normal", isRead: true, createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), link: "/accounting" },
  { id: "notif_4", title: "اكتمال معالجة G-Code لطلب القص", message: "اكتمال معالجة ملف G-Code لطلب القص رقم AX-2026-002 بنجاح.", type: "production", priority: "normal", isRead: true, createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), link: "/gcode" }
];

export const DELETED_ITEMS: DeletedItemSeed[] = [] = [
  {
    id: "del-1",
    entityType: "Customer",
    entityId: "c-deleted-1",
    name: "مكتب آفاق للتصميم",
    deletedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    deletedBy: "المدير العام",
    originalData: { id: "c-deleted-1", name: "مكتب آفاق للتصميم", phone: "+963991234567", email: "afaq@design.sy" }
  },
  {
    id: "del-2",
    entityType: "Product",
    entityId: "p-deleted-1",
    name: "علبة أكريليك فاخرة",
    deletedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    deletedBy: "المدير العام",
    originalData: { id: "p-deleted-1", name: "علبة أكريليك فاخرة", code: "ACR-BOX-PRM", price: 35.0, description: "علبة لحفظ الهدايا", stock: 10 }
  }
];

export const ORDER_STATUSES: OrderStatusSeed[] = [] = [
  { id: "new", name: "جديد", color: "#818cf8", order: 1, isDefault: true },
  { id: "design", name: "قيد التصميم", color: "#c084fc", order: 2, isDefault: true },
  { id: "design_approved", name: "تم اعتماد التصميم", color: "#a78bfa", order: 3, isDefault: true },
  { id: "cutting", name: "قيد القص", color: "#60a5fa", order: 4, isDefault: true },
  { id: "cutting_complete", name: "انتهى القص", color: "#38bdf8", order: 5, isDefault: true },
  { id: "assembly", name: "قيد التجميع", color: "#f59e0b", order: 6, isDefault: true },
  { id: "assembly_complete", name: "انتهى التجميع", color: "#fbbf24", order: 7, isDefault: true },
  { id: "packaging", name: "قيد التغليف", color: "#fb923c", order: 8, isDefault: true },
  { id: "ready", name: "بانتظار التسليم", color: "#34d399", order: 9, isDefault: true },
  { id: "delivered", name: "تم التسليم", color: "#a1a1aa", order: 10, isDefault: true },
  { id: "cancelled", name: "ملغي", color: "#f87171", order: 11, isDefault: true },
  { id: "in_progress", name: "قيد التنفيذ (قديم)", color: "#64748b", order: 99, isDefault: false }
];

export const BACKUPS: BackupSeed[] = [] = [
  { id: "b-1", name: "نسخة احتياطية تلقائية - قبل تحديث المحاسبة", createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), status: "completed" },
  { id: "b-2", name: "نسخة احتياطية يدوية - إقفال الربع الثاني", createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), status: "completed" }
];

export const PRODUCTION_JOBS: ProductionJobSeed[] = [
  {
    id: "job-1",
    jobNo: "JOB-2026-001",
    orderId: "ord-1",
    orderNumber: "AX-2026-001",
    itemName: "قص أكريليك أسود 5 ملم",
    materialId: "m-2",
    machineId: "mach-1",
    status: "completed",
    progress: 100,
    estTimeSec: 60,
    elapsedTimeSec: 60,
    laserPower: 80,
    laserSpeed: 35,
    operatorId: "u-2",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 2.9).toISOString()
  },
  {
    id: "job-2",
    jobNo: "JOB-2026-002",
    orderId: "ord-1",
    orderNumber: "AX-2026-001",
    itemName: "حفر وتلميع خط عربي أكريليك",
    materialId: "m-2",
    machineId: "mach-1",
    status: "running",
    progress: 45,
    estTimeSec: 120,
    elapsedTimeSec: 54,
    laserPower: 75,
    laserSpeed: 45,
    operatorId: "u-2",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: "job-3",
    jobNo: "JOB-2026-003",
    orderId: "ord-2",
    orderNumber: "AX-2026-002",
    itemName: "لوحة ترحيبية خشب زان 8 ملم",
    materialId: "m-3",
    machineId: null,
    status: "pending",
    progress: 0,
    estTimeSec: 180,
    elapsedTimeSec: 0,
    laserPower: 90,
    laserSpeed: 20,
    operatorId: null,
    createdAt: new Date().toISOString()
  }
];

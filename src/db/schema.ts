import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").unique(), // Firebase Auth UID
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // admin, manager, employee, accountant, viewer
  isActive: boolean("is_active").default(true).notNull(),
  password: text("password"), // Nullable if using Firebase Auth exclusively, or for standard login
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  company: text("company"),
  address: text("address"),
  notes: text("notes"),
  category: text("category").default("شركة"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(),
  price: doublePrecision("price").default(0).notNull(),
  description: text("description"),
  stock: integer("stock").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // new, in_progress, completed, cancelled
  priority: text("priority").default("normal").notNull(), // high, normal, low
  totalPrice: doublePrecision("total_price").default(0).notNull(),
  paidAmount: doublePrecision("paid_amount").default(0).notNull(),
  remaining: doublePrecision("remaining").default(0).notNull(),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => users.id),
  deliveryDateExpected: timestamp("delivery_date_expected"),
  isArchived: boolean("is_archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: doublePrecision("unit_price").default(0).notNull(),
  totalPrice: doublePrecision("total_price").default(0).notNull(),
  notes: text("notes"),
});

// 6. Order status history table
export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  oldStatus: text("old_status").notNull(),
  newStatus: text("new_status").notNull(),
  notes: text("notes"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

// 7. Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Materials table
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subCategory: text("sub_category").notNull(), // acrylic, wood, leather, general
  thickness: integer("thickness"), // in mm
  color: text("color"),
  width: integer("width"), // in mm
  height: integer("height"), // in mm
  unit: text("unit").notNull(), // sheet, piece, etc.
  pricePerUnit: doublePrecision("price_per_unit").default(0).notNull(),
  minimumStock: integer("minimum_stock").default(0).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  notes: text("notes"),
  status: text("status").default("active").notNull(), // active, archived
  qualityStatus: text("quality_status").default("inspected"), // inspected, in_preparation, defective
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Inventory table
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull().unique(),
  quantity: integer("quantity").default(0).notNull(),
  reservedQuantity: integer("reserved_quantity").default(0).notNull(),
  availableQuantity: integer("available_quantity").default(0).notNull(),
  location: text("location"),
});

// 10. Inventory transactions table
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // purchase, consumption, adjustment
  quantity: integer("quantity").notNull(),
  beforeQty: integer("before_qty").notNull(),
  afterQty: integer("after_qty").notNull(),
  referenceType: text("reference_type"), // purchase_order, order, adjustment
  referenceId: text("reference_id"),
  reason: text("reason"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Remnants table
export const remnants = pgTable("remnants", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  width: integer("width").notNull(), // in mm
  height: integer("height").notNull(), // in mm
  area: doublePrecision("area").notNull(), // in sq mm
  quantity: integer("quantity").default(1).notNull(),
  status: text("status").default("available").notNull(), // available, consumed, wasted
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Supply orders table
export const supplyOrders = pgTable("supply_orders", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  materialId: integer("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  status: text("status").default("pending").notNull(), // pending, completed, cancelled
  orderDate: text("order_date").notNull(),
  expectedDeliveryDate: text("expected_delivery_date"),
  actualDeliveryDate: text("actual_delivery_date"),
  notes: text("notes"),
});

// 13. Machines table
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // e.g. laser_cutter, engraver
  status: text("status").default("idle").notNull(), // idle, running, maintenance
  maxDimensions: text("max_dimensions"), // e.g. "1300x900 mm"
  // Stored as text, not a real FK: production_jobs in this app are still tracked as an
  // in-memory/JSON collection (PRODUCTION_JOBS in server.ts) with non-numeric, timestamp-
  // based ids like "job-1786273778054", not small sequential ids from this table.
  currentJobId: text("current_job_id"),
  lastMaintenance: text("last_maintenance"), // date string, e.g. "2026-06-01"
  workingHours: doublePrecision("working_hours").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Production jobs table
export const productionJobs = pgTable("production_jobs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  orderNumber: text("order_number").notNull(),
  materialId: integer("material_id").references(() => materials.id),
  machineId: integer("machine_id").references(() => machines.id),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed, failed
  priority: text("priority").default("normal").notNull(), // high, normal, low
  durationMinutes: integer("duration_minutes").default(0).notNull(),
  operatorName: text("operator_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 15. Production stages table
export const productionStages = pgTable("production_stages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => productionJobs.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // e.g. "قص", "تجميع", "فحص جودة"
  status: text("status").notNull(), // pending, in_progress, completed, failed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
});

// 16. Machine queue table
export const machineQueue = pgTable("machine_queue", {
  id: serial("id").primaryKey(),
  machineId: integer("machine_id").references(() => machines.id, { onDelete: "cascade" }).notNull(),
  jobId: integer("job_id").references(() => productionJobs.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  status: text("status").default("queued").notNull(), // queued, active, completed
});

// 17. Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // rent, salaries, utilities, maintenance, etc.
  title: text("title").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 18. Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull(), // cash, bank_transfer, card
  reference: text("reference"),
  date: text("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19. Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  entityType: text("entity_type").notNull(), // order, product, customer
  entityId: text("entity_id").notNull(), // ID string e.g. "ord-1"
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 20. Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g. CREATE_CUSTOMER, LOGIN
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  inventoryTransactions: many(inventoryTransactions),
  activityLogs: many(activityLogs),
  files: many(files),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  creator: one(users, { fields: [orders.createdById], references: [users.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  payments: many(payments),
  productionJobs: many(productionJobs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  materials: many(materials),
  supplyOrders: many(supplyOrders),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [materials.supplierId], references: [suppliers.id] }),
  inventory: one(inventory, { fields: [materials.id], references: [inventory.materialId] }),
  transactions: many(inventoryTransactions),
  remnants: many(remnants),
  supplyOrders: many(supplyOrders),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  material: one(materials, { fields: [inventory.materialId], references: [materials.id] }),
}));

export const remnantsRelations = relations(remnants, ({ one }) => ({
  material: one(materials, { fields: [remnants.materialId], references: [materials.id] }),
}));

export const supplyOrdersRelations = relations(supplyOrders, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplyOrders.supplierId], references: [suppliers.id] }),
  material: one(materials, { fields: [supplyOrders.materialId], references: [materials.id] }),
}));

export const productionJobsRelations = relations(productionJobs, ({ one, many }) => ({
  order: one(orders, { fields: [productionJobs.orderId], references: [orders.id] }),
  material: one(materials, { fields: [productionJobs.materialId], references: [materials.id] }),
  machine: one(machines, { fields: [productionJobs.machineId], references: [machines.id] }),
  stages: many(productionStages),
  queueItems: many(machineQueue),
}));

export const productionStagesRelations = relations(productionStages, ({ one }) => ({
  job: one(productionJobs, { fields: [productionStages.jobId], references: [productionJobs.id] }),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  jobs: many(productionJobs),
  queueItems: many(machineQueue),
}));

export const machineQueueRelations = relations(machineQueue, ({ one }) => ({
  machine: one(machines, { fields: [machineQueue.machineId], references: [machines.id] }),
  job: one(productionJobs, { fields: [machineQueue.jobId], references: [productionJobs.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  uploader: one(users, { fields: [files.uploadedById], references: [users.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

// 20. App state snapshot table
// Persists the in-memory collections that still live as plain JS arrays/objects
// in server.ts (orders, users, invoices, activity logs, settings, ...), so their
// data survives a server restart instead of resetting to the hardcoded seed data
// every time. Each row is one named collection stored as JSON.
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 21. Supplier price quotes table (per-material price comparison across suppliers)
export const supplierQuotes = pgTable("supplier_quotes", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplierName: text("supplier_name").notNull(),
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  minOrderQuantity: integer("min_order_quantity").default(1).notNull(),
  deliveryDays: integer("delivery_days").default(1).notNull(),
  paymentTerms: text("payment_terms"),
  qualityRating: doublePrecision("quality_rating").default(4.5).notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

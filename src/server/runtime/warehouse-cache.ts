import { db } from "../../db/index.ts";
import {
  customers as customersTable,
  products as productsTable,
  materials as materialsTable,
  inventory as inventoryTable,
  inventoryTransactions as inventoryTransactionsTable,
  remnants as remnantsTable,
  suppliers as suppliersTable,
  supplyOrders as supplyOrdersTable,
  supplierQuotes as supplierQuotesTable,
  machines as machinesTable,
} from "../../db/schema.ts";
import { eq, desc } from "drizzle-orm";

export interface WarehouseCacheCollections {
  MACHINES: Array<Record<string, unknown>>;
  CUSTOMERS: Array<Record<string, unknown>>;
  PRODUCTS: Array<Record<string, unknown>>;
  MATERIALS: Array<Record<string, unknown>>;
  INVENTORY: Array<Record<string, unknown>>;
  INVENTORY_TRANSACTIONS: Array<Record<string, unknown>>;
  REMNANTS: Array<Record<string, unknown>>;
  SUPPLIERS: Array<Record<string, unknown>>;
  SUPPLY_ORDERS: Array<Record<string, unknown>>;
  SUPPLIER_QUOTES: Array<Record<string, unknown>>;
}

export async function refreshWarehouseCache(enabled: boolean, collections: WarehouseCacheCollections): Promise<void> {
  if (!enabled) return;
  try {
    const [custRows, prodRows, matRows, invRows, txRows, remRows, supRows, soRows, sqRows, machRows] = await Promise.all([
      db.select().from(customersTable).orderBy(customersTable.id),
      db.select().from(productsTable).orderBy(productsTable.id),
      db.select().from(materialsTable).orderBy(materialsTable.id),
      db.select().from(inventoryTable).orderBy(inventoryTable.id),
      db.select().from(inventoryTransactionsTable).orderBy(desc(inventoryTransactionsTable.id)).limit(500),
      db.select().from(remnantsTable).orderBy(remnantsTable.id),
      db.select().from(suppliersTable).orderBy(suppliersTable.id),
      db.select().from(supplyOrdersTable).orderBy(supplyOrdersTable.id),
      db.select().from(supplierQuotesTable).orderBy(supplierQuotesTable.id),
      db.select().from(machinesTable).orderBy(machinesTable.id),
    ]);

    collections.MACHINES.length = 0;
    collections.MACHINES.push(...machRows.map(m => ({
      id: "mach-" + m.id, name: m.name, type: m.type, status: m.status,
      maxDimensions: m.maxDimensions || "", currentJobId: m.currentJobId || null,
      lastMaintenance: m.lastMaintenance || "", workingHours: m.workingHours ?? 0,
    })));

    collections.CUSTOMERS.length = 0;
    collections.CUSTOMERS.push(...custRows.map(c => ({
      id: "c-" + c.id, name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || c.phone || "",
      email: c.email || "", company: c.company || "", address: c.address || "",
      notes: c.notes || "", category: c.category || "شركة",
    })));

    collections.PRODUCTS.length = 0;
    collections.PRODUCTS.push(...prodRows.map(p => ({
      id: "p-" + p.id, name: p.name, code: p.code, category: p.category, price: p.price,
      description: p.description || "", stock: p.stock,
    })));

    const legacyUsdToSypByMaterialId: Record<number, { usd: number; syp: number }> = {
      1: { usd: 10, syp: 1350 },
      2: { usd: 45, syp: 6075 },
      3: { usd: 20, syp: 2700 },
      4: { usd: 12, syp: 1620 },
      5: { usd: 35, syp: 4725 },
    };
    for (const row of matRows) {
      const migration = legacyUsdToSypByMaterialId[row.id];
      if (migration && Number(row.pricePerUnit) === migration.usd) {
        await db.update(materialsTable).set({ pricePerUnit: migration.syp }).where(eq(materialsTable.id, row.id));
        row.pricePerUnit = migration.syp;
      }
    }
    const legacySupplierPricesUSD = new Set([10.5, 12, 18.2, 19, 20, 22.8, 25, 26.5, 32, 35, 41.5, 43, 45]);
    for (const row of [...sqRows, ...soRows]) {
      const price = Number("pricePerUnit" in row ? row.pricePerUnit : row.unitPrice);
      if (legacySupplierPricesUSD.has(price)) {
        const migratedPrice = Math.round(price * 135);
        if ("minOrderQuantity" in row) {
          await db.update(supplierQuotesTable).set({ pricePerUnit: migratedPrice }).where(eq(supplierQuotesTable.id, row.id));
        } else {
          await db.update(supplyOrdersTable).set({ unitPrice: migratedPrice, totalPrice: migratedPrice * Number(row.quantity || 0) }).where(eq(supplyOrdersTable.id, row.id));
        }
        row.pricePerUnit = migratedPrice;
        if ("unitPrice" in row) {
          row.unitPrice = migratedPrice;
          row.totalPrice = migratedPrice * Number(row.quantity || 0);
        }
      }
    }
    collections.MATERIALS.length = 0;
    collections.MATERIALS.push(...matRows.map(m => ({
      id: "m-" + m.id, name: m.name, category: m.category, subCategory: m.subCategory,
      thickness: m.thickness ?? 0, color: m.color || "", width: m.width ?? 0, height: m.height ?? 0,
      unit: m.unit, pricePerUnit: m.pricePerUnit, minimumStock: m.minimumStock,
      supplierId: m.supplierId ? "s-" + m.supplierId : "", notes: m.notes || "",
      status: m.status || "active", qualityStatus: m.qualityStatus || "inspected",
    })));

    collections.INVENTORY.length = 0;
    collections.INVENTORY.push(...invRows.map(i => ({
      id: "inv-" + i.id, materialId: "m-" + i.materialId, quantity: i.quantity,
      reservedQuantity: i.reservedQuantity, availableQuantity: i.availableQuantity,
      location: i.location || "",
    })));

    collections.INVENTORY_TRANSACTIONS.length = 0;
    collections.INVENTORY_TRANSACTIONS.push(...txRows.map(t => ({
      id: "tx-" + t.id, materialId: "m-" + t.materialId, type: t.type, quantity: t.quantity,
      beforeQty: t.beforeQty, afterQty: t.afterQty, referenceType: t.referenceType || null,
      referenceId: t.referenceId || null, reason: t.reason || "",
      createdById: t.createdById ? "u-" + t.createdById : "system",
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    })));

    collections.REMNANTS.length = 0;
    collections.REMNANTS.push(...remRows.map(r => ({
      id: "rem-" + r.id, materialId: "m-" + r.materialId, width: r.width, height: r.height,
      area: r.area, quantity: r.quantity, status: r.status, location: r.location || "",
      notes: r.notes || "",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })));

    collections.SUPPLIERS.length = 0;
    collections.SUPPLIERS.push(...supRows.map(s => ({
      id: "s-" + s.id, name: s.name, phone: s.phone || "", email: s.email || "",
      address: s.address || "", notes: s.notes || "",
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    })));

    collections.SUPPLY_ORDERS.length = 0;
    collections.SUPPLY_ORDERS.push(...soRows.map(o => ({
      id: "so-" + o.id, supplierId: "s-" + o.supplierId, materialId: "m-" + o.materialId,
      quantity: o.quantity, unitPrice: o.unitPrice, totalPrice: o.totalPrice, status: o.status,
      orderDate: o.orderDate, expectedDeliveryDate: o.expectedDeliveryDate || "",
      actualDeliveryDate: o.actualDeliveryDate || "", notes: o.notes || "",
    })));

    collections.SUPPLIER_QUOTES.length = 0;
    collections.SUPPLIER_QUOTES.push(...sqRows.map(q => ({
      id: "sq-" + q.id, materialId: "m-" + q.materialId,
      supplierId: q.supplierId ? "s-" + q.supplierId : "", supplierName: q.supplierName,
      pricePerUnit: q.pricePerUnit, minOrderQuantity: q.minOrderQuantity,
      deliveryDays: q.deliveryDays, paymentTerms: q.paymentTerms || "",
      qualityRating: q.qualityRating, notes: q.notes || "",
      updatedAt: q.updatedAt instanceof Date ? q.updatedAt.toISOString() : q.updatedAt,
    })));
  } catch (err) {
    console.error("[WAREHOUSE] Failed to refresh warehouse cache from database:", err);
  }
}


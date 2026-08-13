import { db } from "./index.ts";
import { 
  users, customers, products, orders, orderItems, orderStatusHistory, 
  materials, inventory, remnants, suppliers, supplyOrders, 
  machines, productionJobs, productionStages, machineQueue,
  payments, expenses, files, activityLogs
} from "./schema.ts";
import { eq, desc } from "drizzle-orm";

// General logs helper
export async function logToDb(userId: number | null, action: string, entityType: string, entityId: string, details?: string) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
  } catch (err) {
    console.error("Failed to log activity to DB:", err);
  }
}

// 1. Customers Sync Helpers
export async function loadCustomersFromDb() {
  try {
    const list = await db.select().from(customers).orderBy(customers.id);
    return list.map(c => ({
      id: "c-" + c.id,
      name: c.name,
      phone: c.phone || "",
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      company: c.company || "",
      address: c.address || "",
      notes: c.notes || ""
    }));
  } catch (err) {
    console.error("Failed to load customers from DB:", err);
    return [];
  }
}

export async function saveCustomerToDb(customer: any) {
  try {
    const rawId = parseInt(customer.id.replace("c-", ""));
    const values = {
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      company: customer.company,
      address: customer.address,
      notes: customer.notes,
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(customers).values(values).returning();
      return "c-" + inserted[0].id;
    } else {
      await db.update(customers).set(values).where(eq(customers.id, rawId));
      return customer.id;
    }
  } catch (err) {
    console.error("Failed to save customer to DB:", err);
    return customer.id;
  }
}

export async function deleteCustomerFromDb(id: string) {
  try {
    const rawId = parseInt(id.replace("c-", ""));
    if (!isNaN(rawId)) {
      await db.delete(customers).where(eq(customers.id, rawId));
    }
  } catch (err) {
    console.error("Failed to delete customer from DB:", err);
  }
}

// 2. Products Sync Helpers
export async function loadProductsFromDb() {
  try {
    const list = await db.select().from(products).orderBy(products.id);
    return list.map(p => ({
      id: "p-" + p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      price: p.price,
      description: p.description || "",
      stock: p.stock
    }));
  } catch (err) {
    console.error("Failed to load products from DB:", err);
    return [];
  }
}

export async function saveProductToDb(prod: any) {
  try {
    const rawId = parseInt(prod.id.replace("p-", ""));
    const values = {
      name: prod.name,
      code: prod.code,
      category: prod.category,
      price: prod.price,
      description: prod.description,
      stock: prod.stock || 0,
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(products).values(values).returning();
      return "p-" + inserted[0].id;
    } else {
      await db.update(products).set(values).where(eq(products.id, rawId));
      return prod.id;
    }
  } catch (err) {
    console.error("Failed to save product to DB:", err);
    return prod.id;
  }
}

export async function deleteProductFromDb(id: string) {
  try {
    const rawId = parseInt(id.replace("p-", ""));
    if (!isNaN(rawId)) {
      await db.delete(products).where(eq(products.id, rawId));
    }
  } catch (err) {
    console.error("Failed to delete product from DB:", err);
  }
}

// 3. Materials & Inventory Sync Helpers
export async function loadMaterialsFromDb() {
  try {
    const list = await db.select().from(materials).where(eq(materials.status, "active")).orderBy(materials.id);
    return list.map(m => ({
      id: "m-" + m.id,
      name: m.name,
      category: m.category,
      subCategory: m.subCategory,
      thickness: m.thickness,
      color: m.color || "",
      width: m.width || 0,
      height: m.height || 0,
      unit: m.unit,
      pricePerUnit: m.pricePerUnit,
      minimumStock: m.minimumStock,
      supplierId: m.supplierId ? "s-" + m.supplierId : "",
      notes: m.notes || "",
      status: m.status
    }));
  } catch (err) {
    console.error("Failed to load materials from DB:", err);
    return [];
  }
}

export async function saveMaterialToDb(mat: any) {
  try {
    const rawId = parseInt(mat.id.replace("m-", ""));
    const rawSupplierId = parseInt(mat.supplierId?.replace("s-", "") || "");
    const values = {
      name: mat.name,
      category: mat.category,
      subCategory: mat.subCategory,
      thickness: mat.thickness ? parseInt(mat.thickness) : null,
      color: mat.color,
      width: mat.width ? parseInt(mat.width) : null,
      height: mat.height ? parseInt(mat.height) : null,
      unit: mat.unit,
      pricePerUnit: mat.pricePerUnit ? parseFloat(mat.pricePerUnit) : 0,
      minimumStock: mat.minimumStock ? parseInt(mat.minimumStock) : 0,
      supplierId: isNaN(rawSupplierId) ? null : rawSupplierId,
      notes: mat.notes,
      status: mat.status || "active",
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(materials).values(values).returning();
      const newId = "m-" + inserted[0].id;
      // also create initial empty inventory
      await db.insert(inventory).values({
        materialId: inserted[0].id,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        location: "مستودع أ"
      });
      return newId;
    } else {
      await db.update(materials).set(values).where(eq(materials.id, rawId));
      return mat.id;
    }
  } catch (err) {
    console.error("Failed to save material to DB:", err);
    return mat.id;
  }
}

export async function archiveMaterialInDb(id: string) {
  try {
    const rawId = parseInt(id.replace("m-", ""));
    if (!isNaN(rawId)) {
      await db.update(materials).set({ status: "archived" }).where(eq(materials.id, rawId));
    }
  } catch (err) {
    console.error("Failed to archive material in DB:", err);
  }
}

// 4. Inventory stats sync
export async function loadInventoryFromDb() {
  try {
    const list = await db.select().from(inventory).orderBy(inventory.id);
    return list.map(inv => ({
      id: "inv-" + inv.id,
      materialId: "m-" + inv.materialId,
      quantity: inv.quantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: inv.availableQuantity,
      location: inv.location || ""
    }));
  } catch (err) {
    console.error("Failed to load inventory from DB:", err);
    return [];
  }
}

export async function saveInventoryItemToDb(inv: any) {
  try {
    const rawMatId = parseInt(inv.materialId.replace("m-", ""));
    if (!isNaN(rawMatId)) {
      await db.insert(inventory).values({
        materialId: rawMatId,
        quantity: inv.quantity,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity: inv.availableQuantity,
        location: inv.location
      }).onConflictDoUpdate({
        target: inventory.materialId,
        set: {
          quantity: inv.quantity,
          reservedQuantity: inv.reservedQuantity,
          availableQuantity: inv.availableQuantity,
          location: inv.location
        }
      });
    }
  } catch (err) {
    console.error("Failed to save inventory item to DB:", err);
  }
}

// 5. Remnants Sync Helpers
export async function loadRemnantsFromDb() {
  try {
    const list = await db.select().from(remnants).orderBy(remnants.id);
    return list.map(r => ({
      id: "rem-" + r.id,
      materialId: "m-" + r.materialId,
      width: r.width,
      height: r.height,
      area: r.area,
      quantity: r.quantity,
      status: r.status,
      location: r.location || "",
      notes: r.notes || ""
    }));
  } catch (err) {
    console.error("Failed to load remnants from DB:", err);
    return [];
  }
}

export async function saveRemnantToDb(rem: any) {
  try {
    const rawId = parseInt(rem.id.replace("rem-", ""));
    const rawMatId = parseInt(rem.materialId.replace("m-", ""));
    const values = {
      materialId: rawMatId,
      width: parseInt(rem.width),
      height: parseInt(rem.height),
      area: parseFloat(rem.area),
      quantity: parseInt(rem.quantity),
      status: rem.status || "available",
      location: rem.location,
      notes: rem.notes,
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(remnants).values(values).returning();
      return "rem-" + inserted[0].id;
    } else {
      await db.update(remnants).set(values).where(eq(remnants.id, rawId));
      return rem.id;
    }
  } catch (err) {
    console.error("Failed to save remnant to DB:", err);
    return rem.id;
  }
}

export async function deleteRemnantFromDb(id: string) {
  try {
    const rawId = parseInt(id.replace("rem-", ""));
    if (!isNaN(rawId)) {
      await db.delete(remnants).where(eq(remnants.id, rawId));
    }
  } catch (err) {
    console.error("Failed to delete remnant from DB:", err);
  }
}

// 6. Machines Sync Helpers
export async function loadMachinesFromDb() {
  try {
    const list = await db.select().from(machines).orderBy(machines.id);
    return list.map(m => ({
      id: "mach-" + m.id,
      name: m.name,
      type: m.type,
      status: m.status,
      maxDimensions: m.maxDimensions || "",
      currentJobId: m.currentJobId ? "job-" + m.currentJobId : null
    }));
  } catch (err) {
    console.error("Failed to load machines from DB:", err);
    return [];
  }
}

export async function saveMachineToDb(mach: any) {
  try {
    const rawId = parseInt(mach.id.replace("mach-", ""));
    const values = {
      name: mach.name,
      type: mach.type,
      status: mach.status || "idle",
      maxDimensions: mach.maxDimensions,
      currentJobId: mach.currentJobId || null,
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(machines).values(values).returning();
      return "mach-" + inserted[0].id;
    } else {
      await db.update(machines).set(values).where(eq(machines.id, rawId));
      return mach.id;
    }
  } catch (err) {
    console.error("Failed to save machine to DB:", err);
    return mach.id;
  }
}

export async function deleteMachineFromDb(id: string) {
  try {
    const rawId = parseInt(id.replace("mach-", ""));
    if (!isNaN(rawId)) {
      await db.delete(machines).where(eq(machines.id, rawId));
    }
  } catch (err) {
    console.error("Failed to delete machine from DB:", err);
  }
}

// 7. Expenses Sync Helpers
export async function loadExpensesFromDb() {
  try {
    const list = await db.select().from(expenses).orderBy(expenses.id);
    return list.map(e => ({
      id: "exp-" + e.id,
      category: e.category,
      title: e.title,
      amount: e.amount,
      date: e.date,
      notes: e.notes || ""
    }));
  } catch (err) {
    console.error("Failed to load expenses from DB:", err);
    return [];
  }
}

export async function saveExpenseToDb(exp: any) {
  try {
    const rawId = parseInt(exp.id.replace("exp-", ""));
    const values = {
      category: exp.category,
      title: exp.title,
      amount: parseFloat(exp.amount),
      date: exp.date,
      notes: exp.notes,
    };
    if (isNaN(rawId)) {
      const inserted = await db.insert(expenses).values(values).returning();
      return "exp-" + inserted[0].id;
    } else {
      await db.update(expenses).set(values).where(eq(expenses.id, rawId));
      return exp.id;
    }
  } catch (err) {
    console.error("Failed to save expense to DB:", err);
    return exp.id;
  }
}

export async function deleteExpenseFromDb(id: string) {
  try {
    const rawId = parseInt(id.replace("exp-", ""));
    if (!isNaN(rawId)) {
      await db.delete(expenses).where(eq(expenses.id, rawId));
    }
  } catch (err) {
    console.error("Failed to delete expense from DB:", err);
  }
}

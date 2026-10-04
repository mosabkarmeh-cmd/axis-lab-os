import express from "express";
import { db } from "../../db/index.ts";
import { customers } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import * as core from "../server-core.ts";

const router = express.Router();

const { getRequestUser } = core;

function sanitizeCustomer<T extends Record<string, unknown>>(customer: T, req: express.Request): T {
  if (getRequestUser(req)?.role === "admin") return customer;
  return {
    ...customer,
    phone: "🔒 محجوب للأمان",
    whatsapp: "🔒 محجوب للأمان",
    email: "🔒 محجوب للأمان",
    address: "🔒 محجوب للأمان",
    notes: "🔒 محجوب للأمان",
  } as T;
}

const errorMessage = (err: unknown) => err instanceof Error ? err.message : String(err);

// 1. Get all customers
router.get("/", async (req, res) => {
  try {
    const user = getRequestUser(req);
    const dbCustomers = await db.select().from(customers).orderBy(customers.id);
    
    // Privacy protection for accountants: hide contact info on printed/shared financial reports
    if (user && user.role === "accountant") {
      const sanitized = dbCustomers.map(c => ({
        id: "c-" + c.id,
        name: c.name,
        phone: "🔒 محجوب للأمان",
        whatsapp: "🔒 محجوب للأمان",
        email: "🔒 محجوب للأمان",
        company: c.company || "",
        address: "🔒 محجوب للأمان",
        notes: "🔒 محجوب للأمان",
        category: c.category || "شركة"
      }));
      return res.json(sanitized);
    }

    const mapped = dbCustomers.map(c => ({
      id: "c-" + c.id,
      name: c.name,
      phone: c.phone || "",
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      company: c.company || "",
      address: c.address || "",
      notes: c.notes || "",
      category: c.category || "شركة"
    }));
    res.json(mapped.map(customer => sanitizeCustomer(customer, req)));
  } catch (err: unknown) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ error: "Failed to fetch customers: " + errorMessage(err) });
  }
});

// 2. Add/Update customer
router.post("/", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة عملاء جدد" });
    }

    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
    }

    const values = {
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    const inserted = await db.insert(customers).values(values).returning();
    const result = {
      id: "c-" + inserted[0].id,
      ...values
    };
    res.json(sanitizeCustomer(result, req));
  } catch (err: unknown) {
    console.error("Error adding customer:", err);
    res.status(500).json({ error: "Failed to add customer: " + errorMessage(err) });
  }
});

// 3. Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بحذف العملاء" });
    }

    const rawId = parseInt(req.params.id.replace("c-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف العميل غير صالح" });
    }

    const existing = await db.select().from(customers).where(eq(customers.id, rawId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    await db.delete(customers).where(eq(customers.id, rawId));
    res.json({ success: true, id: req.params.id, name: existing[0].name });
  } catch (err: unknown) {
    console.error("Error deleting customer:", err);
    res.status(500).json({ error: "Failed to delete customer: " + errorMessage(err) });
  }
});

// 4. Update customer
router.put("/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
    }

    const rawId = parseInt(req.params.id.replace("c-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف العميل غير صالح" });
    }

    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
    }

    const existing = await db.select().from(customers).where(eq(customers.id, rawId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    const values = {
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    const updated = await db.update(customers).set(values).where(eq(customers.id, rawId)).returning();
    const result = {
      id: "c-" + updated[0].id,
      ...values
    };
    res.json(result);
  } catch (err: unknown) {
    console.error("Error updating customer:", err);
    res.status(500).json({ error: "Failed to update customer: " + errorMessage(err) });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
    }

    const rawId = parseInt(req.params.id.replace("c-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف العميل غير صالح" });
    }

    const existing = await db.select().from(customers).where(eq(customers.id, rawId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "العميل غير موجود" });
    }

    const values = {
      name: req.body.name ?? existing[0].name,
      phone: req.body.phone ?? existing[0].phone,
      whatsapp: req.body.whatsapp ?? existing[0].whatsapp ?? "",
      email: req.body.email ?? existing[0].email ?? "",
      company: req.body.company ?? existing[0].company ?? "",
      address: req.body.address ?? existing[0].address ?? "",
      notes: req.body.notes ?? existing[0].notes ?? "",
      category: req.body.category ?? existing[0].category ?? "شركة"
    };

    const updated = await db.update(customers).set(values).where(eq(customers.id, rawId)).returning();
    const result = {
      id: "c-" + updated[0].id,
      ...values
    };
    res.json(result);
  } catch (err: unknown) {
    console.error("Error updating customer:", err);
    res.status(500).json({ error: "Failed to update customer: " + errorMessage(err) });
  }
});

export default router;

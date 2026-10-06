import express from "express";
import * as core from "../../server-core.ts";

const {
  CUSTOMERS,
  DELETED_ITEMS,
  createNotification,
  nextEntityId,
  getRequestUser,
} = core;

function canViewCustomerPrivateData(req: express.Request): boolean {
  return getRequestUser(req)?.role === "admin";
}

function sanitizeCustomer(customer: typeof CUSTOMERS[number], req: express.Request) {
  if (canViewCustomerPrivateData(req)) return customer;
  return {
    id: customer.id,
    name: customer.name,
    company: customer.company || "",
    category: customer.category || "شركة",
    phone: "🔒 محجوب",
    whatsapp: "🔒 محجوب",
    email: "🔒 محجوب",
    address: "🔒 محجوب",
    notes: "🔒 محجوب",
  };
}

export function registerLegacyCustomerRoutes(app: express.Express) {
app.get("/api/customers", (req, res) => {
    res.json(CUSTOMERS.map(customer => sanitizeCustomer(customer, req)));
  });

  // API - Add Customer
  app.post("/api/customers", (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "employee"].includes(user.role)) {
      res.status(403).json({ error: "إضافة العملاء متاحة للإدارة والموظفين فقط" });
      return;
    }
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة عملاء جدد" });
      return;
    }
    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
      return;
    }

    const newCust = {
      id: nextEntityId("c"),
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    CUSTOMERS.push(newCust);

    res.json(sanitizeCustomer(newCust, req));
  });

  // API - Update Customer
  app.put("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "employee"].includes(user.role)) {
      res.status(403).json({ error: "تعديل العملاء متاح للإدارة والموظفين فقط" });
      return;
    }
    const { name, phone, whatsapp, email, company, address, notes, category } = req.body;
    if (!name || !phone) {
      res.status(400).json({ error: "الاسم ورقم الهاتف حقلان إجباريان" });
      return;
    }

    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }

    const updatedCust = {
      ...CUSTOMERS[index],
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || CUSTOMERS[index].email || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      category: category || "شركة"
    };

    CUSTOMERS[index] = updatedCust;
    res.json(sanitizeCustomer(updatedCust, req));
  });

  app.patch("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || !["admin", "employee"].includes(user.role)) {
      res.status(403).json({ error: "تعديل العملاء متاح للإدارة والموظفين فقط" });
      return;
    }
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
      return;
    }

    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }

    const updatedCust = {
      ...CUSTOMERS[index],
      name: req.body.name ?? CUSTOMERS[index].name,
      phone: req.body.phone ?? CUSTOMERS[index].phone,
      whatsapp: req.body.whatsapp ?? CUSTOMERS[index].whatsapp ?? CUSTOMERS[index].phone,
      email: req.body.email ?? CUSTOMERS[index].email ?? "",
      company: req.body.company ?? CUSTOMERS[index].company ?? "",
      address: req.body.address ?? CUSTOMERS[index].address ?? "",
      notes: req.body.notes ?? CUSTOMERS[index].notes ?? "",
      category: req.body.category ?? CUSTOMERS[index].category ?? "شركة"
    };

    CUSTOMERS[index] = updatedCust;
    res.json(sanitizeCustomer(updatedCust, req));
  });

  // API - Delete Customer
  app.delete("/api/customers/:id", (req, res) => {
    const user = getRequestUser(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "حذف العملاء متاح لمدير النظام فقط" });
      return;
    }
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بحذف العملاء" });
      return;
    }
    const index = CUSTOMERS.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    const removed = CUSTOMERS.splice(index, 1)[0];

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Customer",
      entityId: removed.id,
      name: removed.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: removed
    });

    createNotification(
      "حذف عميل مؤقتاً",
      `تم نقل العميل "${removed.name}" إلى سلة المحذوفات ويمكن استعادته من لوحة التحكم.`,
      "system"
    );

    res.json(sanitizeCustomer(removed, req));
  });

  // API - Get Products
}

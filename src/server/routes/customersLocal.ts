import { Router } from "express";

export function createCustomersLocalRouter(deps: any) {
  const router = Router();
  const { CUSTOMERS, DELETED_ITEMS, getRequestUser, nextEntityId, createNotification, secureId } = deps;

  // API - Get Customers
  router.get("/", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      const sanitized = CUSTOMERS.map(c => ({
        id: c.id,
        name: c.name,
        phone: "🔒 محجوب",
        whatsapp: "🔒 محجوب",
        email: "🔒 محجوب",
        company: "",
        address: "🔒 محجوب",
        notes: "🔒 محجوب"
      }));
      res.json(sanitized);
    } else {
      res.json(CUSTOMERS);
    }
  });

  // API - Add Customer
  router.post("/", (req, res) => {
    const user = getRequestUser(req);
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

    res.json(newCust);
  });

  // API - Update Customer
  router.put("/:id", (req, res) => {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل بيانات العملاء" });
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
    res.json(updatedCust);
  });

  router.patch("/:id", (req, res) => {
    const user = getRequestUser(req);
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
    res.json(updatedCust);
  });

  // API - Delete Customer
  router.delete("/:id", (req, res) => {
    const user = getRequestUser(req);
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
      id: secureId("del"),
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

    res.json(removed);
  });


  return router;
}

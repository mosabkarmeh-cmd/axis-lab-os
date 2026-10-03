import express from "express";
import * as core from "../server-core.ts";

const {
  CUSTOMERS,
  PRODUCTS,
  DELETED_ITEMS,
  ACTIVITY_LOGS,
  nextEntityId,
  nextActivityLogId,
  getRequestUser,
  createNotification,
} = core;

function getActorId(req: express.Request): string {
  return getRequestUser(req)?.id || "system";
}

export function registerLegacyMasterDataRoutes(app: express.Express) {
  // API - Get Customers
  app.get("/api/customers", (req, res) => {
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
  app.post("/api/customers", (req, res) => {
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
  app.put("/api/customers/:id", (req, res) => {
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

  app.patch("/api/customers/:id", (req, res) => {
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
  app.delete("/api/customers/:id", (req, res) => {
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

    res.json(removed);
  });

  // API - Get Products
  app.get("/api/products", (req, res) => {
    const { search } = req.query;
    if (search) {
      const searchStr = String(search).toLowerCase();
      const filtered = PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(searchStr) || 
        p.code.toLowerCase().includes(searchStr) ||
        p.category.toLowerCase().includes(searchStr)
      );
      res.json(filtered);
    } else {
      res.json(PRODUCTS);
    }
  });

  // API - Add Product
  app.post("/api/products", (req, res) => {
    const { name, code, category, price, description, stock } = req.body;
    if (!name || !price) {
      res.status(400).json({ error: "الاسم والسعر حقلان إجباريان" });
      return;
    }

    const newProd = {
      id: nextEntityId("p"),
      name,
      code: code || `PRD-${Date.now().toString().slice(-6)}`,
      category: category || "عام",
      price: Number(price) || 0,
      description: description || "",
      stock: Number(stock) || 0
    };

    PRODUCTS.push(newProd);

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: newProd.id,
      createdAt: new Date().toISOString()
    });

    res.json(newProd);
  });

  // API - Update Product
  app.put("/api/products/:id", (req, res) => {
    const { name, code, category, price, description, stock } = req.body;
    const prod = PRODUCTS.find(p => p.id === req.params.id);
    if (!prod) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    if (name) prod.name = name;
    if (code) prod.code = code;
    if (category) prod.category = category;
    if (price !== undefined) prod.price = Number(price) || 0;
    if (description !== undefined) prod.description = description;
    if (stock !== undefined) prod.stock = Number(stock) || 0;

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: prod.id,
      createdAt: new Date().toISOString()
    });

    res.json(prod);
  });

  // API - Delete Product
  app.delete("/api/products/:id", (req, res) => {
    const user = getRequestUser(req);
    const index = PRODUCTS.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }
    const removed = PRODUCTS.splice(index, 1)[0];

    // Push to Recycle Bin
    DELETED_ITEMS.push({
      id: "del_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      entityType: "Product",
      entityId: removed.id,
      name: removed.name,
      deletedAt: new Date().toISOString(),
      deletedBy: user ? user.fullName : "المدير العام",
      originalData: removed
    });

    ACTIVITY_LOGS.unshift({
      id: nextActivityLogId(),
      userId: getActorId(req),
      action: "DELETE_PRODUCT",
      entityType: "Product",
      entityId: removed.id,
      createdAt: new Date().toISOString()
    });

    createNotification(
      "حذف منتج مؤقتاً",
      `تم نقل المنتج "${removed.name}" إلى سلة المحذوفات ويمكن استعادته من لوحة التحكم.`,
      "system"
    );

    res.json(removed);
  });


}

import express from "express";
import * as core from "../../server-core.ts";

const {
  PRODUCTS,
  DELETED_ITEMS,
  ACTIVITY_LOGS,
  createNotification,
  nextEntityId,
  nextActivityLogId,
  getRequestUser,
} = core;

export function registerLegacyProductRoutes(app: express.Express) {
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
      userId: "u-1",
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
      userId: "u-1",
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
      userId: "u-1",
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
}

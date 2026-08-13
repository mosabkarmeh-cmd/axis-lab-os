import express from "express";
import { db } from "../../db/index.ts";
import { products } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { getVerifiedRequestUser } from "../auth.ts";

const router = express.Router();

const getRequestUser = getVerifiedRequestUser;

// 1. Get all products
router.get("/", async (req, res) => {
  try {
    const list = await db.select().from(products).orderBy(products.id);
    const mapped = list.map(p => ({
      id: "p-" + p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      price: p.price,
      description: p.description || "",
      stock: p.stock
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products: " + err.message });
  }
});

// 2. Add product
router.post("/", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة منتجات جديدة" });
    }

    const { name, code, category, price, description, stock } = req.body;
    if (!name || !code || price === undefined) {
      return res.status(400).json({ error: "الاسم والكود والسعر حقول إجبارية" });
    }

    const values = {
      name,
      code,
      category: category || "عام",
      price: parseFloat(price),
      description: description || "",
      stock: stock ? parseInt(stock) : 0
    };

    const inserted = await db.insert(products).values(values).returning();
    const result = {
      id: "p-" + inserted[0].id,
      ...values
    };
    res.json(result);
  } catch (err: any) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Failed to add product: " + err.message });
  }
});

// 3. Update product
router.put("/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل المنتجات" });
    }

    const rawId = parseInt(req.params.id.replace("p-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح" });
    }

    const { name, code, category, price, description, stock } = req.body;
    const values = {
      name,
      code,
      category,
      price: price !== undefined ? parseFloat(price) : undefined,
      description,
      stock: stock !== undefined ? parseInt(stock) : undefined
    };

    await db.update(products).set(values).where(eq(products.id, rawId));
    res.json({ id: req.params.id, ...values });
  } catch (err: any) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product: " + err.message });
  }
});

// 4. Delete product
router.delete("/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بحذف المنتجات" });
    }

    const rawId = parseInt(req.params.id.replace("p-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح" });
    }

    const existing = await db.select().from(products).where(eq(products.id, rawId));
    if (existing.length === 0) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    await db.delete(products).where(eq(products.id, rawId));
    res.json({ success: true, id: req.params.id, name: existing[0].name });
  } catch (err: any) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product: " + err.message });
  }
});

export default router;

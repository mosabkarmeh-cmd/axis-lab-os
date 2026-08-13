import express from "express";
import { db } from "../../db/index.ts";
import { machines, productionJobs } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { getVerifiedRequestUser } from "../auth.ts";

const router = express.Router();

const getRequestUser = getVerifiedRequestUser;

// 1. Get all production machines
router.get("/machines", async (req, res) => {
  try {
    const list = await db.select().from(machines).orderBy(machines.id);
    const mapped = list.map(m => ({
      id: "mach-" + m.id,
      name: m.name,
      type: m.type,
      status: m.status,
      maxDimensions: m.maxDimensions || "",
      currentJobId: m.currentJobId || null
    }));
    res.json(mapped);
  } catch (err: any) {
    console.error("Error fetching machines:", err);
    res.status(500).json({ error: "Failed to fetch machines" });
  }
});

// 2. Add machine
router.post("/machines", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بإضافة ماكينات" });
    }

    const { name, type, maxDimensions } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: "اسم الماكينة ونوعها حقلان إجباريان" });
    }

    const values = {
      name,
      type,
      status: "idle",
      maxDimensions: maxDimensions || ""
    };

    const inserted = await db.insert(machines).values(values).returning();
    const result = {
      id: "mach-" + inserted[0].id,
      ...values,
      currentJobId: null
    };
    res.json(result);
  } catch (err: any) {
    console.error("Error adding machine:", err);
    res.status(500).json({ error: "Failed to add machine" });
  }
});

// 3. Update machine
router.put("/machines/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بتعديل الماكينات" });
    }

    const rawId = parseInt(req.params.id.replace("mach-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف الماكينة غير صالح" });
    }

    const { name, type, status, maxDimensions } = req.body;
    const values: any = {};
    if (name) values.name = name;
    if (type) values.type = type;
    if (status) values.status = status;
    if (maxDimensions) values.maxDimensions = maxDimensions;

    await db.update(machines).set(values).where(eq(machines.id, rawId));
    res.json({ id: req.params.id, ...values });
  } catch (err: any) {
    console.error("Error updating machine:", err);
    res.status(500).json({ error: "Failed to update machine" });
  }
});

// 4. Delete machine
router.delete("/machines/:id", async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user && user.role === "accountant") {
      return res.status(403).json({ error: "غير مصرح للمحاسبين بحذف الماكينات" });
    }

    const rawId = parseInt(req.params.id.replace("mach-", ""));
    if (isNaN(rawId)) {
      return res.status(400).json({ error: "معرف الماكينة غير صالح" });
    }

    await db.delete(machines).where(eq(machines.id, rawId));
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error("Error deleting machine:", err);
    res.status(500).json({ error: "Failed to delete machine" });
  }
});

export default router;

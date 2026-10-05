import express from "express";
import { db } from "../../../../db/index.ts";
import { customers as customersTable } from "../../../../db/schema.ts";
import * as core from "../../../server-core.ts";
import { requireImportAdmin } from "../utils.ts";

const { CUSTOMERS, nextEntityId, createNotification, USE_SQLITE, persistMutationWithFastDurability } = core;

export function registerImportCustomerRoutes(app: express.Express) {
app.post("/api/import/customers", async (req, res) => {
    if (!requireImportAdmin(req, res)) return;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, message: "يرجى تقديم قائمة صحيحة للاستيراد" });
      return;
    }

    const imported: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    if (USE_SQLITE) {
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
        const name = String(it.name || "").trim();
        if (!name) {
          errors.push(`السطر ${idx + 1}: حقل الاسم مطلوب`);
          continue;
        }
        if (CUSTOMERS.some(customer => customer.name.trim().toLowerCase() === name.toLowerCase())) {
          errors.push(`السطر ${idx + 1}: العميل موجود مسبقًا`);
          continue;
        }
        const newCust = {
          id: nextEntityId("c"),
          name,
          phone: it.phone ? String(it.phone) : "",
          whatsapp: it.whatsapp ? String(it.whatsapp) : (it.phone ? String(it.phone) : ""),
          email: it.email ? String(it.email) : "",
          company: it.company ? String(it.company) : "أفراد",
          address: it.address ? String(it.address) : "",
          notes: it.notes ? String(it.notes) : "",
          category: it.category ? String(it.category) : "شركة",
        };
        CUSTOMERS.push(newCust);
        imported.push(newCust);
      }
      if (imported.length > 0) {
        createNotification("استيراد عملاء جماعي", `تم استيراد عدد ${imported.length} عملاء بنجاح من ملف بيانات خارجي.`, "system");
      }
      await persistMutationWithFastDurability();
      return res.json({ success: true, count: imported.length, imported, errors });
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx] && typeof items[idx] === "object" ? items[idx] as Record<string, unknown> : {};
      if (!it.name) {
        errors.push(`السطر ${idx + 1}: حقل الاسم مطلوب`);
        continue;
      }
      try {
        const inserted = await db.insert(customersTable).values({
          name: String(it.name), phone: it.phone ? String(it.phone) : null, whatsapp: it.whatsapp ? String(it.whatsapp) : (it.phone ? String(it.phone) : null),
          email: it.email ? String(it.email) : null, company: it.company ? String(it.company) : "أفراد", address: it.address ? String(it.address) : null,
          notes: it.notes ? String(it.notes) : null, category: it.category ? String(it.category) : "شركة",
        }).returning();
        const row = inserted[0];
        const newCust = {
          id: "c-" + row.id, name: row.name, phone: row.phone || "", whatsapp: row.whatsapp || row.phone || "",
          email: row.email || "", company: row.company || "", address: row.address || "",
          notes: row.notes || "", category: row.category || "شركة",
        };
        CUSTOMERS.push(newCust);
        imported.push(newCust);
      } catch (err: unknown) {
        console.error("Error importing customer row:", err);
        errors.push(`السطر ${idx + 1}: فشل الحفظ - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (imported.length > 0) {
      createNotification(
        "استيراد عملاء جماعي",
        `تم استيراد عدد ${imported.length} عملاء بنجاح من ملف بيانات خارجي.`,
        "system"
      );
    }

    res.json({ success: true, count: imported.length, imported, errors });
  });
}

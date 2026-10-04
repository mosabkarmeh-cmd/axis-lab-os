import express from "express";
import * as core from "../../server-core.ts";
import { getAiAccessScope } from "./access.ts";

type SemanticResult = {
  type: string;
  title: string;
  subtitle: string;
  entityId: string;
  relevance: number;
  reason: string;
};

const {
  ai,
  ORDERS,
  CUSTOMERS,
  MATERIALS,
  SETTINGS,
} = core;

export function registerAiSemanticSearchRoutes(app: express.Express) {
// API - Semantic Intelligent Search crossing orders, customers, and materials
  app.post("/api/ai/semantic-search", (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim() === "") {
        res.json({ success: true, results: [] });
        return;
      }

      const q = query.toLowerCase().trim();
      const access = getAiAccessScope(req);
      if (!access.role) {
        res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
        return;
      }
      const results: SemanticResult[] = [];

      // Search Customers
      CUSTOMERS.forEach(c => {
        if (c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q))) {
          results.push({
            type: "customer",
            title: c.name,
            subtitle: access.canViewCustomerPrivateData ? `شركة: ${c.company || "فردي"} • هاتف: ${c.phone || "غير محدد"}` : `شركة: ${c.company || "فردي"}`,
            entityId: c.id,
            relevance: 100,
            reason: "مطابقة مباشرة لاسم العميل أو رقم الهاتف في دفتر الحسابات."
          });
        }
      });

      // Search Orders
      ORDERS.forEach(o => {
        if (o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q))) {
          results.push({
            type: "order",
            title: `طلب رقم ${o.orderNumber}`,
            subtitle: access.canViewFinancials ? `العميل: ${o.customerName} • القيمة: ${Math.round(Number(o.totalPrice || 0)).toLocaleString()} ل.س • الحالة: ${o.status}` : `العميل: ${o.customerName} • الحالة: ${o.status}`,
            entityId: o.id,
            relevance: 95,
            reason: `عثرنا على مطابقة في بيانات الطلبات المرتبطة بـ ${o.customerName}.`
          });
        }
      });

      // Search Materials
      MATERIALS.forEach(m => {
        if (m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          results.push({
            type: "material",
            title: m.name,
            subtitle: access.canViewFinancials ? `الفئة: ${m.category} • السماكة: ${m.thickness || "غير محدد"} مم • السعر: ${Math.round(Number(m.pricePerUnit || 0)).toLocaleString()} ل.س (≈ ${(Number(m.pricePerUnit || 0) / (Number(SETTINGS.exchangeRate) || 135)).toFixed(2)})` : `الفئة: ${m.category} • السماكة: ${m.thickness || "غير محدد"} مم`,
            entityId: m.id,
            relevance: 90,
            reason: `تطابق دلالي مع الخامات المخزنية المسجلة من نوع ${m.category}.`
          });
        }
      });

      // Simple AI Match explanation generator if query is semantic e.g. "معلق" (pending), "مخزن" (stock), "أرباح" (money)
      if (q.includes("معلق") || q.includes("جديد")) {
        ORDERS.filter(o => o.status === "new" || o.status === "in_progress").forEach(o => {
          if (!results.some(r => r.entityId === o.id)) {
            results.push({
              type: "order",
              title: `طلب معلق رقم ${o.orderNumber}`,
              subtitle: `العميل: ${o.customerName} • الحالة: ${o.status}`,
              entityId: o.id,
              relevance: 85,
              reason: "فهم دلالي: تم العثور على هذا الطلب لأنه في حالة 'جديد' أو 'قيد التنفيذ' المطلوبة في بحثك عن معلق."
            });
          }
        });
      }

      if (q.includes("خشب") || q.includes("wood")) {
        MATERIALS.filter(m => m.category === "wood").forEach(m => {
          if (!results.some(r => r.entityId === m.id)) {
            results.push({
              type: "material",
              title: m.name,
              subtitle: `خامة خشبية بسماكة ${m.thickness || 3} مم`,
              entityId: m.id,
              relevance: 80,
              reason: "تحليل دلالي: تم تصنيف هذه الخامة كخشب بناءً على تصنيف الفئة الخاص بها."
            });
          }
        });
      }

      if (q.includes("أكريليك") || q.includes("acrylic")) {
        MATERIALS.filter(m => m.category === "acrylic").forEach(m => {
          if (!results.some(r => r.entityId === m.id)) {
            results.push({
              type: "material",
              title: m.name,
              subtitle: `لوح أكريليك بسماكة ${m.thickness || 3} مم`,
              entityId: m.id,
              relevance: 80,
              reason: "تحليل دلالي: تم ربطها بطلبك للأكريليك لتسهيل قص ونقش الموديلات."
            });
          }
        });
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      res.json({ success: true, results: results.slice(0, 10) });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : String(err) || "فشل البحث الدلالي" });
    }
  });
}

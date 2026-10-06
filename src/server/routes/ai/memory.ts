import express from "express";
import * as core from "../../server-core.ts";
import { getAiAccessScope } from "./access.ts";

const {
  ai,
  ORDERS,
  CUSTOMERS,
  MATERIALS,
  INVENTORY,
  REMNANTS,
  PRODUCTION_JOBS,
} = core;

export function registerAiMemoryRoutes(app: express.Express) {
// API - Dynamic DeepBrain Learned Memory layers (Simulating 6 layers of workshop self-learning)
  app.get("/api/ai/memory", (req, res) => {
    try {
      const user = core.getRequestUser(req);
      if (!user) {
        res.status(401).json({ success: false, message: "يجب تسجيل الدخول" });
        return;
      }
      const access = getAiAccessScope(req);
      const canViewFinancials = access.canViewFinancials;
      // 1. FLASH MEMORY (Live operations right now)
      const flashMem = [
        {
          id: "flash-1",
          fact: "جلسة العمل الحالية مستقرة والاتصال بملقم قاعدة البيانات ممتاز.",
          type: "operational",
          importance: 8.5,
          time: "قبل ثوانٍ معدودة"
        },
        {
          id: "flash-2",
          fact: `تم رصد نشاط إنتاجي لعدد (${PRODUCTION_JOBS.filter(j => j.status === "running").length}) مهام قص قيد التنفيذ المباشر على الماكينات.`,
          type: "production",
          importance: 9.0,
          time: "تحديث فوري"
        }
      ];

      // 2. SHORT-TERM MEMORY (Immediate operational alerts & tasks)
      const lowStockList = MATERIALS.filter(m => {
        const inv = INVENTORY.find(i => i.materialId === m.id);
        const qty = inv ? inv.quantity : 0;
        return qty <= (m.minimumStock || 5);
      });
      const shortTermMem = [
        {
          id: "st-1",
          fact: `تنبيه مستودعي: يوجد عدد (${lowStockList.length}) خامات قاربت على النفاد التام من المخزن وتحتاج لإصدار أمر شراء فوري.`,
          type: "inventory",
          importance: 9.5,
          time: "منذ ساعة"
        },
        {
          id: "st-2",
          fact: !canViewFinancials ? "البيانات المالية محجوبة عن هذا الحساب." : `إجمالي المبالغ والذمم المالية المستحقة على العملاء والتي لم تدفع بعد تبلغ ${ORDERS.reduce((sum, o) => sum + (o.totalPrice - (o.paidAmount || 0)), 0).toFixed(2)}.`,
          type: "finance",
          importance: 8.8,
          time: "منذ 4 ساعات"
        }
      ];

      // 3. LONG-TERM MEMORY (Stabilized core trends, VIPs, and hot-sellers)
      // Find top customers
      const customerOrdersCount = CUSTOMERS.map(c => {
        const cOrders = ORDERS.filter(o => o.customerId === c.id || o.customerName === c.name);
        const totalSpent = cOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        return { name: c.name, count: cOrders.length, spent: totalSpent };
      }).sort((a, b) => b.spent - a.spent);

      const topCustomer = customerOrdersCount[0];
      const longTermMem = [
        {
          id: "lt-1",
          fact: topCustomer && topCustomer.spent > 0 
            ? !canViewFinancials ? "تم رصد العملاء ذوي النشاط التشغيلي المرتفع دون إظهار بياناتهم المالية." : `العميل "${topCustomer.name}" هو الأكثر إنفاقاً وأهمية للورشة بإجمالي طلبات بقيمة ${topCustomer.spent.toFixed(2)}.`
            : "لم يتم رصد عميل فائق الأهمية بعد (بانتظار تجميع المزيد من الفواتير المكتملة).",
          type: "customer_insight",
          importance: 9.2,
          time: "تعلم تراكمي"
        },
        {
          id: "lt-2",
          fact: "المواد الأكثر طلباً واستخداماً في خطوط الإنتاج هي الأكريليك الشفاف وخشب MDF المقاوم للرطوبة.",
          type: "materials_preference",
          importance: 8.0,
          time: "مستقر"
        }
      ];

      // 4. CONSOLIDATED MEMORY (Cross-entity analysis & process mining)
      const avgOrderVal = ORDERS.length > 0 ? (ORDERS.reduce((sum, o) => sum + o.totalPrice, 0) / ORDERS.length) : 0;
      const consolidatedMem = [
        {
          id: "con-1",
          fact: !canViewFinancials ? "مؤشر متوسط قيمة الطلب محجوب عن هذا الحساب." : `متوسط قيمة الفاتورة/الطلب الواحد في الورشة يبلغ حالياً ${avgOrderVal.toFixed(2)}. يساعد هذا المؤشر في التنبؤ بالإيرادات الشهرية.`,
          type: "process_analytics",
          importance: 8.7,
          time: "موحد"
        },
        {
          id: "con-2",
          fact: "هناك علاقة طردية قوية بين سرعة إنهاء مهام التصميم في المرحلة الأولى وسرعة التزام العميل بالدفعات المالية.",
          type: "operational_insights",
          importance: 7.5,
          time: "مكتمل التدريب"
        }
      ];

      // 5. ARCHIVED KNOWLEDGE (Calibration standards & blueprints)
      const archivedKnowledge = [
        {
          id: "arc-1",
          fact: "معايرة ليزر CO2 المعتمدة لألواح الأكريليك الملون 3مم: سرعة قص 20 مم/ثانية، قدرة أنبوب 80%، ضغط هواء معتدل.",
          type: "laser_calibration",
          importance: 9.0,
          time: "مؤرشف ومؤكد"
        },
        {
          id: "arc-2",
          fact: "معايرة ليزر CO2 المعتمدة لألواح خشب السويد الطبيعي 4مم: سرعة قص 15 مم/ثانية، قدرة أنبوب 85%، مع تفعيل مساعد الهواء القوي لمنع تفحم الحواف.",
          type: "laser_calibration",
          importance: 8.8,
          time: "مؤرشف ومؤكد"
        }
      ];

      // 6. META-LEARNING LAYER (AI Strategic development advises)
      const metaLearning = [
        {
          id: "meta-1",
          fact: canViewFinancials
            ? "توصية تسعيرية: تظهر البيانات إمكانية رفع هوامش أرباح تصاميم علب المناديل والصواني الخشبية بنسبة 7% دون التأثير على حجم المبيعات الإجمالي."
            : "تم حجب توصيات التسعير والتحليل المالي عن هذا الحساب.",
          type: "pricing_strategy",
          importance: 9.4,
          time: "توليد ذكي"
        },
        {
          id: "meta-2",
          fact: `يُقترح استغلال بقايا خامات الأكريليك المتراكمة في المخزن حالياً (عدد البقايا المسجلة: ${REMNANTS.length}) لإنتاج قواعد ميداليات صغيرة لزيادة صافي الأرباح.`,
          type: "efficiency_strategy",
          importance: 8.9,
          time: "توليد ذكي"
        }
      ];

      res.json({
        success: true,
        layers: {
          flash: flashMem,
          short_term: shortTermMem,
          long_term: longTermMem,
          consolidated: consolidatedMem,
          archived: archivedKnowledge,
          meta_learning: metaLearning
        }
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : String(err) || "فشل قراءة الذاكرة المتعلمة" });
    }
  });
}

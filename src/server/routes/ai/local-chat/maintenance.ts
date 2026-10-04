import * as core from "../../../server-core.ts";
import type { AiStats } from "./types.ts";
import { normalizeArabicAndDialect } from "./normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getMaintenanceChatResponse(msgNorm: string): string | null {

    if (
      msgNorm.includes("صيانه") || 
      msgNorm.includes("مشكله") || 
      msgNorm.includes("مشاكل") || 
      msgNorm.includes("ضعف") || 
      msgNorm.includes("اهتزاز") || 
      msgNorm.includes("تقطيع") || 
      msgNorm.includes("حرق") || 
      msgNorm.includes("عدسه") || 
      msgNorm.includes("مرايا") || 
      msgNorm.includes("حراره") || 
      msgNorm.includes("صيانة") || 
      msgNorm.includes("مشكلة")
    ) {
      return `🛠️ **دليل استكشاف أخطاء وصيانة ماكينات القص CO2**:

1. 📉 **ضعف في جودة أو عمق القص (عدم اختراق المادة)**:
   - **المرايا والعدسة (Mirrors & Lens)**: فحص اتساخ المرايا والعدسة البؤرية. قم بتنظيفها فوراً باستخدام كحول آيزوبروبيلي وقطنة ناعمة. اتساخ المرايا يمتص طاقة الشعاع ويؤدي لشرخها.
   - **مسار الشعاع (Beam Alignment)**: تأكد من تمركز شعاع الليزر في منتصف فتحة رأس الليزر وفي كل زوايا الماكينة.
   - **أنبوب الليزر (Laser Tube)**: تأكد من أن درجة حرارة ماء التبريد في مبرد المياه (Chiller) تتراوح بين \`18-22 درجة مئوية\`. ارتفاع حرارة الماء يقلل من قدرة الأنبوب بشكل كبير ويسرع من تلفه.

2. 🔥 **احتراق حواف الأخشاب وتفحمها بشكل مفرط**:
   - تأكد من عمل ضاغط الهواء (Air Compressor) بكفاءة كاملة وضخ تدفق هواء قوي لإبعاد ألسنة اللهب والدخان عن نقطة التركيز البؤري.

3. 📉 **اهتزاز خطوط القص أو عدم انتظام الدوائر**:
   - **القشاط والسكك (Belts & Rails)**: قم بتنظيف السكك المنزلقة بقطعة قماش ناعمة ومذيب للزيوت القديمة، ثم تزييتها بزيت خفيف جداً. فحص شد قشاط محاور الحركة لمنع انزلاق الخطوات (Step Loss).`;
    }
  return null;
}

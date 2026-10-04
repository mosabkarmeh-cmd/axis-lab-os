import * as core from "../../../server-core.ts";
import type { AiStats } from "../local-chat/types.ts";
import { normalizeArabicAndDialect } from "../local-chat/normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getLaserChatResponse(msgNorm: string, machinesCount: number): string | null {

    if (
      msgNorm.includes("ماكينه") || 
      msgNorm.includes("ماكينات") || 
      msgNorm.includes("ليزر") || 
      msgNorm.includes("سرعه") || 
      msgNorm.includes("طاقه") || 
      msgNorm.includes("قوه") || 
      msgNorm.includes("قص") || 
      msgNorm.includes("معايره") ||
      msgNorm.includes("معايرة") ||
      msgNorm.includes("سرعة") ||
      msgNorm.includes("طاقة") ||
      msgNorm.includes("قوة") ||
      msgNorm.includes("بارامتر")
    ) {
      return `⚙️ **دليل معايرة وقدرات ليزر CO2 لورشة AXIS LAB** (الماكينات المتاحة: ${machinesCount}):

إليك البارامترات القياسية المعتمدة للقص والنقش النظيف حسب نوع وسماكة المادة:

1. 🪵 **خشب MDF سماكة 5 مم**:
   - **القص**: السرعة \`12-15 مم/ثانية\` | الطاقة \`80-90%\` | مساعدة الهواء: **قوية جداً** (لتجنب تفحم الحواف).
2. 💎 **أكريليك شفاف/ملون 3 مم**:
   - **القص**: السرعة \`18-22 مم/ثانية\` | الطاقة \`75-85%\` | مساعدة الهواء: **منخفضة** (للحصول على حافة مصقولة كالزجاج).
3. 💼 **جلود طبيعية وصناعية**:
   - **القص**: السرعة \`20-25 مم/ثانية\` | الطاقة \`65-70%\` | مساعدة الهواء: **متوسطة** لمنع الاحتراق.
4. 📦 **كرتون مقوى وورق**:
   - **القص**: السرعة \`50-80 مم/ثانية\` | الطاقة \`30-40%\` | مساعدة الهواء: **خفيفة** جداً.
5. 🖼️ **النقش البصري (Engraving) لجميع المواد**:
   - **النقش**: السرعة \`250-400 مم/ثانية\` | الطاقة \`15-25%\` | دقة بؤرية عالية.`;
    }
  return null;
}

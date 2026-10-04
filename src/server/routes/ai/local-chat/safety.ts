import * as core from "../../../server-core.ts";
import type { AiStats } from "../local-chat/types.ts";
import { normalizeArabicAndDialect } from "../local-chat/normalization.ts";

const { CUSTOMERS, ORDERS, MATERIALS, REMNANTS, EXPENSES } = core;

export function getSafetyChatResponse(msgNorm: string): string | null {

    if (
      msgNorm.includes("سلامه") || 
      msgNorm.includes("امان") || 
      msgNorm.includes("حريق") || 
      msgNorm.includes("خطر") || 
      msgNorm.includes("حمايه") || 
      msgNorm.includes("غاز") || 
      msgNorm.includes("تهويه") || 
      msgNorm.includes("سام") ||
      msgNorm.includes("سلامة") ||
      msgNorm.includes("أمان") ||
      msgNorm.includes("حماية") ||
      msgNorm.includes("تهوية")
    ) {
      return `🛡️ **دليل السلامة والأمن المهني والبيئي لورشة AXIS LAB**:

التزامك بقواعد السلامة يضمن حماية فريق العمل والمعدات الغالية في الورشة:

1. 🚫 **يمنع قص مادة الـ PVC**: يمنع منعاً باتاً قص الفينيل أو البلاستيك الذي يحتوي على مركبات الكلور. غاز الكلور الناتج سام جداً للمشغل ويتحد مع الرطوبة لينتج حمض الهيدروكلوريك الحارق الذي يدمر الماكينة والمرايا مسبباً الصدأ السريع!
2. 🥽 **نظارات الحماية الواقية**: ارتداء نظارات حماية مخصصة لليزر CO2 ذات طول موجي (\`10600 نانومتر\`) لحماية شبكية وعين المشغل من الانعكاسات غير المرئية للشعاع.
3. 🧯 **مكافحة الحرائق المباشرة**: احتفظ بمطفأة حريق غاز ثنائي أكسيد الكربون (CO2) بجانب الماكينة، ولا تترك ماكينة الخشب تعمل دون إشراف بشري أبداً أثناء عملية القص.
4. 🌬️ **التهوية وسحب الغازات**: تأكد من عمل مراوح الشفط والتهوية بكفاءة عالية لطرد أبخرة الأكريليك والأخشاب السامة خارج صالة العمل.`;
    }
  return null;
}

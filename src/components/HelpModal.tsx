import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, Layers, Settings, FileText, ShoppingCart, UserCheck, ShieldAlert, TrendingUp, Info } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onOpenFullGuide?: () => void;
}

export default function HelpModal({ isOpen, onClose, currentView, onOpenFullGuide }: HelpModalProps) {
  if (!isOpen) return null;

  // View-specific help content
  const getViewHelpContent = () => {
    switch (currentView.toLowerCase()) {
      case "dashboard":
        return {
          title: "لوحة التحكم الرئيسية",
          icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
          summary: "نظرة عامة على أداء الورشة اللحظي اليوم.",
          guidelines: [
            "تعرض هذه الواجهة إحصائيات فورية حول المبيعات والطلبات الجديدة ومعدل إنتاجية العمال.",
            "مؤشر انخفاض المخازن: ينبهك بالمواد التي قاربت على النفاد لتقوم بطلب توريدها.",
            "طابور الماكينات: يعرض تقدم المهام على ماكينات CO2 / Fiber ليزر ومعدل وقت الفراغ والنشاط."
          ],
          tips: "راجع قسم 'تنبيهات انخفاض المواد' صباحاً لتجنب توقف الماكينات بسبب نقص الألواح."
        };
      case "customers":
        return {
          title: "إدارة بيانات العملاء",
          icon: <UserCheck className="w-5 h-5 text-blue-400" />,
          summary: "إدارة جهات الاتصال، الشركات وسجلات التعامل.",
          guidelines: [
            "البحث السريع: يمكنك البحث عن أي عميل بكتابة جزء من اسمه أو رقم هاتفه الجوال.",
            "نجوم التفضيل: تظهر علامة مفضلة للعملاء الأكثر طلباً في الورشة لحث العمال على العناية بهم.",
            "إضافة عميل سريع: يمكنك إضافة العملاء مباشرة من نافذة الطلبات الجديدة لسرعة الاستلام."
          ],
          tips: "احرص على إدخال رقم هاتف العميل دقيقاً، ليتسنى ربط الفواتير والذمم به بشكل صحيح."
        };
      case "orders":
        return {
          title: "إدارة وتلقي الطلبات",
          icon: <ShoppingCart className="w-5 h-5 text-indigo-400" />,
          summary: "استلام وتوصيف طلبات قص ليزر جديدة وإعداد مسارات التشغيل.",
          guidelines: [
            "إدخال الأبعاد: سجل الطول والعرض للقطع بالمليمتر (mm) لتمكين نظام التسعير التلقائي.",
            "مستشار التسعير: يقدم لك اقتراحاً دقيقاً للسعر بناءً على تكلفة المادة وزمن تشغيل رأس الليزر.",
            "حالة الطلب: انتقل بين المراحل (جديد ← قيد التصميم ← قيد الإنتاج ← جاهز للتسليم) بسلاسة."
          ],
          tips: "لا تقم بترحيل أي طلب إلى الماكينات إلا بعد مراجعة ملف التصميم الفني (DXF/SVG) والتأكد من ملاءمته لسماكة المادة."
        };
      case "products":
        return {
          title: "مكتبة المنتجات وإصدارات التصميم",
          icon: <Layers className="w-5 h-5 text-[#c59257]" />,
          summary: "أرشفة المنتجات المتكررة (مثل العلب والهدايا) وتتبع إصدارات ملفات الرسم.",
          guidelines: [
            "مكونات المنتج: يمكنك تفصيل مكونات كل منتج (مثلاً علبة تتألف من 6 قطع خشبية) وأبعادها.",
            "إصدارات التصميم: لتفادي تكرار العمل، يحفظ النظام الإصدارات التاريخية للملفات مع تفاصيل التعديل.",
            "الربط التلقائي: عند اختيار منتج محفوظ بالطلب، يستورد النظام كافة أبعاده وإعداداته مباشرة."
          ],
          tips: "قم بوضع كود (SKU) فريد لكل علبة أو منتج يسهل على موظف الاستلام الوصول إليه."
        };
      case "inventory":
        return {
          title: "المخازن وإدارة البقايا (Remnants)",
          icon: <Layers className="w-5 h-5 text-amber-500" />,
          summary: "تتبع ألواح الأكريليك، الأخشاب، الجلود، والقطع المتبقية الصالحة للقص.",
          guidelines: [
            "حركات المخزن: تتبع الوارد (الشراء) والمستهلك في عمليات القص مع تاريخ العملية واسم العامل.",
            "مستودع البقايا: يسجل النظام قطع الألواح المتبقية وأبعادها للاستفادة منها لاحقاً وتقليص الهدر.",
            "مطابقة البقايا: عند إنشاء طلب، يقارن النظام القطع المطلوبة بالبقايا المتوفرة لإعادة استخدامها."
          ],
          tips: "استغلال البقايا يرفع نسبة أرباح الورشة بشكل فوري ويوفر المواد للطلبات الصغيرة المستعجلة."
        };
      case "production":
        return {
          title: "إدارة خطوط الإنتاج والماكينات",
          icon: <Settings className="w-5 h-5 text-red-400" />,
          summary: "توزيع مهام القص على ماكينات CO2 Laser، متابعة الحالات وتصفير الإحداثيات.",
          guidelines: [
            "طابور الماكينة: قم بترتيب المهام سحباً وإسقاطاً لتحديد أولوية القص.",
            "تسجيل زمن التشغيل: يقيس النظام ثواني حركة رأس الليزر الفعلية لحساب كفاءة العمال وصيانة التيوب.",
            "فحص الجودة: بعد اكتمال القص، افحص القطعة ضد أي حروق أو خدوش قبل نقلها للتسليم."
          ],
          tips: "تنظيف العدسات وضبط مبرد المياه (Chiller) يطيل عمر الماكينة الافتراضي ويحسن جودة القص الفني."
        };
      case "accounting":
        return {
          title: "وحدة الحسابات والمدفوعات والمصاريف",
          icon: <FileText className="w-5 h-5 text-emerald-500" />,
          summary: "إصدار فواتير الورشة، تسجيل سندات القبض والدفع الجزئي والمصاريف التشغيلية.",
          guidelines: [
            "الذمم المتبقية: يعرض النظام العملاء المديونين والطلبات غير مدفوعة بالكامل بلون أحمر بارز.",
            "المصاريف: سجل مصروفات الورشة كأجور العمال، الإيجار وشراء مستهلكات الصيانة.",
            "تصدير الحسابات: يمكنك تصدير سجل المعاملات المالية كملف CSV منسق لتقديمه للمحاسب القانوني."
          ],
          tips: "يقوم النظام تلقائياً بحجب البيانات الشخصية للعملاء (كالبريد ورقم الهاتف) من الفواتير المطبوعة لحماية السرية والخصوصية."
        };
      default:
        return {
          title: "مساعدة سريعة - نظام AXIS LAB",
          icon: <HelpCircle className="w-5 h-5 text-[#c59257]" />,
          summary: "نظام تشغيل متكامل لإدارة ورش وقص ونقش الليزر.",
          guidelines: [
            "يمكنك استخدام شريط البحث السريع (Ctrl+K) في أعلى الصفحة للوصول الفوري لأي طلب أو عميل.",
            "تساعدك قائمة الإشعارات في متابعة تقدم المهام وتنبيهات مستودعات المواد.",
            "يقوم النظام بحفظ جميع الإجراءات في سجلات النشاط لضمان حوكمة الورشة."
          ],
          tips: "يمكنك قراءة الدليل الكامل للبرنامج أو تشغيل محاكي ليزر التفاعلي من مركز المساعدة."
        };
    }
  };

  const help = getViewHelpContent();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#0b0c0e] border border-zinc-800/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-right font-sans"
        >
          {/* Header */}
          <div className="bg-zinc-950 px-5 py-4 border-b border-zinc-900 flex items-center justify-between">
            <button 
              id="close-help-modal-btn"
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"
            >
              ×
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">{help.title}</span>
              <div className="p-1.5 bg-[#c59257]/10 rounded-lg text-[#c59257]">
                {help.icon}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-900">
              <span className="text-[10px] text-[#c59257] font-bold block mb-1">وصف الشاشة الحالية:</span>
              <p className="text-xs text-zinc-300 font-medium leading-relaxed">{help.summary}</p>
            </div>

            <div className="space-y-2.5">
              <span className="text-[10px] text-zinc-500 font-bold block">📋 تعليمات تشغيل وتوجيه الورشة:</span>
              <ul className="space-y-2">
                {help.guidelines.map((line, idx) => (
                  <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2 justify-end">
                    <span className="leading-relaxed text-zinc-300">{line}</span>
                    <span className="text-[#c59257] text-[10px] shrink-0 mt-1">◀</span>
                  </li>
                ))}
              </ul>
            </div>

            {help.tips && (
              <div className="p-3 bg-[#c59257]/5 border border-[#c59257]/15 rounded-lg text-right flex gap-2 items-start justify-end">
                <div className="text-[11px] text-zinc-400 leading-normal">
                  <span className="font-bold text-white text-[11px] block text-right mb-0.5">💡 نصيحة المشرف الذكي:</span>
                  {help.tips}
                </div>
                <Info className="w-4 h-4 text-[#c59257] shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-zinc-950/80 border-t border-zinc-900 flex items-center justify-between gap-3">
            {onOpenFullGuide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullGuide();
                }}
                className="px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📘 الانتقال لمركز المساعدة الكامل</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold border border-zinc-800 cursor-pointer"
            >
              فهمت ذلك، إغلاق نافذة المساعدة
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

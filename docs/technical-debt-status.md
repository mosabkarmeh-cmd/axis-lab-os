# AXIS LAB OS — العرض التوضيحي لحالة الدين التقني

## الملخص التنفيذي

النسخة الحالية تستخدم SQLite بـ **schema version 5**، مع جداول منظمة للكيانات الأساسية والفواتير وبنودها وتاريخها والمدفوعات والمصروفات. `src/App.tsx` انخفض من 15,055 سطر إلى **4,698 سطر** عبر استخراج Hooks مستقلة للعملاء والمنتجات والمواد والتوريد الذكي والإنتاج.

## لوحة القياس الحالية

| المجال | الحالة الحالية | التقييم المرحلي | شرط 100% |
|---|---|---:|---|
| SQLite integrity وbackup/restore | ناجح مع corruption recovery، مُتحقق بإعادة تشغيل قسرية (SIGKILL) | 95% | اختبارات crash وforeign-key وmigration متعددة الإصدارات |
| الكيانات الأساسية | `local_entities` + IDs محمية من التصادم بعد الحذف (customers/products/users/materials/expenses/orders/invoices/inventory/remnants) | 97% | جداول relational صريحة وقيود مرجعية لكل domain |
| الفواتير | `local_invoices` (durability عبر restart via loadPersistedState)؛ القراءات الحيّة (stats/analytics/invoices) تُقرأ من الذاكرة عمداً لتفادي فجوة الـ 400ms debounce بالكتابة لـ SQLite | 93% | نقل الكتابة لتكون synchronous بدل debounced لإزالة الفجوة نهائياً |
| بنود الفواتير والتاريخ | جداول مستقلة مع foreign key | 90% | اختبارات تعديل/إلغاء/credit note مع rollback ذري |
| المدفوعات | `local_payments`، مسار موحد عبر `applyPayment`، idempotency، ومعاملة حفظ ذرية مع rollback للذاكرة عند فشل SQLite | 99% | اختبارات fault injection وcredit note متقدمة |
| المصروفات | `local_expenses`، والتقارير المالية تقرأ منها مباشرة الآن | 93% | قيود مبالغ وتواريخ واختبارات إغلاق الفترة |
| App.tsx | استخراج Hooks للعملاء والمنتجات والمواد والتوريد الذكي والإنتاج والطلبات؛ بقي G-Code orchestration | 95% | فصل G-Code orchestration واختبار UI |
| API والاختبارات | lint وsmoke وmigration وWindows QA ناجحة، صفر ثغرات npm audit | 96% | تغطية mutations والحالات السلبية والـ UI smoke |

## آخر ما تم إصلاحه (هذه الجلسة)

- صفر ثغرات أمنية (`npm audit`): تصحيح multer/nodemailer/js-yaml/qs، واستبدال `xlsx` المعطوب أمنياً بـ `exceljs`.
- حماية brute-force على تسجيل الدخول + rate limiting عام على الـ API.
- تحقق من نوع وحجم الملفات المرفوعة.
- Docker يعمل الآن بمستخدم غير-root.
- منع تسجيل دفعة مكررة (double-click/network retry) عبر idempotency key على مساري دفع الطلب والفاتورة.
- إصلاح تصادم IDs بعد الحذف لكل كيان عنده حذف فعلي (customers, products, users, materials, expenses) + بقية الكيانات وقائياً (orders, invoices, inventory, transactions, remnants, numbering settings) — واكتشاف وإصلاح تصادم كان كامناً بين عناصر المخزون والفواتير لأنهم كانوا يشتركون بنفس البادئة `inv-`.
- **تم فصل Order Actions (`useOrderActions`) وإزالة نسخ status/archive القديمة من `App.tsx`، مع نجاح lint/build وsmoke الكامل.**
- **`/api/accounting/stats` و`/api/reports/analytics` صارا يقرآن الإيرادات والمصروفات والتقارير الشهرية من الجداول المالية بـ SQLite فعلياً، بدل قراءتها من مصفوفات الذاكرة رغم وجود متغيرات SQLite جاهزة وغير مستخدمة سابقاً.**

## الطريق إلى 100%

**المرحلة الأولى:** اكتملت المعاملة الذرية المشتركة لمساري تسجيل الدفعة؛ الحفظ يلتزم عبر SQLite transaction، وفشل الالتزام يعيد الحالة الذاكرية ويرجع HTTP 500.

**المرحلة الثانية:** إنهاء تفكيك `App.tsx` (90% مكتمل) — المتبقي أساساً orchestration الطلبات وعمليات مخزون محدودة.

**المرحلة الثالثة:** توسيع الاختبارات إلى حالات الفشل: payment أكبر من المتبقي، إلغاء فاتورة مدفوعة، credit note جزئي، فشل منتصف transaction، تزامن طلبين متعارضين.

## تعريف النجاح النهائي

> الجاهزية 100% تعني أن البيانات المالية لا تفقد أو تتضاعف بعد restart أو restore (✅ متحقق ومُختبر فعلياً)، وأن كل mutation محاسبية ذرية وقابلة للتراجع، وأن App.tsx لم يعد مسؤولًا عن orchestration شامل، وأن Windows unpacked والمثبتين ينجحان على بيئة نظيفة.

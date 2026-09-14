# AXIS LAB OS — العرض التوضيحي لحالة الدين التقني

## الملخص التنفيذي

النسخة الحالية تستخدم SQLite بـ **schema version 5**، مع جداول منظمة للكيانات الأساسية والفواتير وبنودها وتاريخها والمدفوعات والمصروفات. صار الآن **كل من `/api/accounting/stats` و`/api/reports/analytics` يقرآن فعلياً من الجداول المالية بـ SQLite** (`readFinancialTablesFromSqlite`) بدل الاعتماد فقط على مصفوفات الذاكرة، مع تحقق فعلي (إنشاء بيانات → قراءة إحصائيات → قتل السيرفر فجأة (SIGKILL) → إعادة تشغيل → مقارنة الإحصائيات): النتائج طابقت تماماً بدون أي فقدان بيانات. `src/App.tsx` انخفض من 15,055 سطر إلى **5,085 سطر** عبر استخراج مكونات وhooks مستقلة.

## لوحة القياس الحالية

| المجال | الحالة الحالية | التقييم المرحلي | شرط 100% |
|---|---|---:|---|
| SQLite integrity وbackup/restore | ناجح مع corruption recovery، مُتحقق بإعادة تشغيل قسرية (SIGKILL) | 95% | اختبارات crash وforeign-key وmigration متعددة الإصدارات |
| الكيانات الأساسية | `local_entities` + IDs محمية من التصادم بعد الحذف (customers/products/users/materials/expenses/orders/invoices/inventory/remnants) | 97% | جداول relational صريحة وقيود مرجعية لكل domain |
| الفواتير | `local_invoices`، وتقارير `/accounting/stats` و`/reports/analytics` تقرأ منها فعلياً الآن | 93% | قراءة وكتابة API مباشرة من الجداول دون in-memory authority (كتابة الفواتير نفسها لسا عبر مسارين منفصلين order/invoice) |
| بنود الفواتير والتاريخ | جداول مستقلة مع foreign key | 90% | اختبارات تعديل/إلغاء/credit note مع rollback ذري |
| المدفوعات | `local_payments`، ومنع تكرار فعلي (idempotency key) على مساري الطلب والفاتورة | 90% | ledger موحد (مسار واحد بدل مسارين منفصلين order/invoice) |
| المصروفات | `local_expenses`، والتقارير المالية تقرأ منها مباشرة الآن | 93% | قيود مبالغ وتواريخ واختبارات إغلاق الفترة |
| App.tsx | 5,085 سطر (من 15,055) — استخراج مكونات وhooks (AccountingView, useAccountingActions, DashboardPage...) | 85% | إكمال فصل باقي الصفحات لhooks/domain services |
| API والاختبارات | lint وsmoke وmigration وWindows QA ناجحة، صفر ثغرات npm audit | 96% | تغطية mutations والحالات السلبية والـ UI smoke |

## آخر ما تم إصلاحه (هذه الجلسة)

- صفر ثغرات أمنية (`npm audit`): تصحيح multer/nodemailer/js-yaml/qs، واستبدال `xlsx` المعطوب أمنياً بـ `exceljs`.
- حماية brute-force على تسجيل الدخول + rate limiting عام على الـ API.
- تحقق من نوع وحجم الملفات المرفوعة.
- Docker يعمل الآن بمستخدم غير-root.
- منع تسجيل دفعة مكررة (double-click/network retry) عبر idempotency key على مساري دفع الطلب والفاتورة.
- إصلاح تصادم IDs بعد الحذف لكل كيان عنده حذف فعلي (customers, products, users, materials, expenses) + بقية الكيانات وقائياً (orders, invoices, inventory, transactions, remnants, numbering settings) — واكتشاف وإصلاح تصادم كان كامناً بين عناصر المخزون والفواتير لأنهم كانوا يشتركون بنفس البادئة `inv-`.
- **`/api/accounting/stats` و`/api/reports/analytics` صارا يقرآن الإيرادات والمصروفات والتقارير الشهرية من الجداول المالية بـ SQLite فعلياً، بدل قراءتها من مصفوفات الذاكرة رغم وجود متغيرات SQLite جاهزة وغير مستخدمة سابقاً.**

## الطريق إلى 100%

**المرحلة الأولى (الأهم الآن):** توحيد مسارَي تسجيل الدفعة (`/api/orders/:id/payments` و`/api/accounting/invoices/:id/payments`) بمنطق واحد مشترك بدل تكرار نفس المنطق في مكانين، مع معاملة ذرية واحدة تغطي invoice + items + history + payment + activity log.

**المرحلة الثانية:** إنهاء تفكيك `App.tsx` (85% مكتمل) — فصل باقي orchestration المتبقي لصفحات Orders وInventory وProduction إلى hooks مستقلة.

**المرحلة الثالثة:** توسيع الاختبارات إلى حالات الفشل: payment أكبر من المتبقي، إلغاء فاتورة مدفوعة، credit note جزئي، فشل منتصف transaction، تزامن طلبين متعارضين.

## تعريف النجاح النهائي

> الجاهزية 100% تعني أن البيانات المالية لا تفقد أو تتضاعف بعد restart أو restore (✅ متحقق ومُختبر فعلياً)، وأن كل mutation محاسبية ذرية وقابلة للتراجع، وأن App.tsx لم يعد مسؤولًا عن orchestration شامل، وأن Windows unpacked والمثبتين ينجحان على بيئة نظيفة.

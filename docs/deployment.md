# نشر AXIS LAB في الإنتاج

## المتطلبات

يحتاج النشر إلى Docker وDocker Compose أو Node.js 22 وPostgreSQL 16. يجب إنشاء ملف `.env.production` من `.env.production.example` ووضع قيم حقيقية قوية، وعدم رفع الملف إلى Git.

## التشغيل عبر Docker Compose

```bash
cp .env.production.example .env.production
# عدّل جميع القيم السرية والدومين داخل .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

يتولى الحاوي تشغيل PostgreSQL، انتظار healthcheck، تنفيذ migrations، ثم تشغيل التطبيق على المنفذ 3000. يجب وضع Reverse Proxy مثل Nginx أو Cloudflare أمام التطبيق وتفعيل HTTPS.

## التشغيل اليدوي

```bash
npm ci --omit=dev
npm run db:migrate
npm run build
NODE_ENV=production npm run start:prod
```

يجب ضبط `DB_MODE=postgres` في الإنتاج. وضع `memory` مخصص للتجربة المحلية فقط، لأن بياناته لا تمثل قاعدة تشغيل دائمة.

## الفحص بعد النشر

```bash
curl https://your-domain.example/api/health
```

يجب أن تعيد الاستجابة `success: true` وأن تكون قيمة `database` هي `postgres`. بعد ذلك يُنصح بتسجيل الدخول، إنشاء عميل اختبار، قراءة قائمة العملاء، ثم حذف سجل الاختبار.

## النسخ الاحتياطي

يجب أخذ نسخة PostgreSQL دورية مستقلة عن النسخ الموجودة داخل التطبيق، مع تجربة الاستعادة على بيئة منفصلة. لا تعتبر نسخة Docker volume وحدها استراتيجية نسخ احتياطي.

## ملاحظات أمنية

استخدم سر JWT عشوائيًا بطول 64 محرفًا على الأقل، وكلمة مرور قاعدة طويلة، ولا تستخدم الحسابات التجريبية في بيئة الإنتاج. يجب تغيير حساب المدير الافتراضي أو استبداله بمستخدم مُنشأ من قاعدة البيانات قبل فتح النظام للعامة. يجب إعداد SMTP حقيقي إذا كانت إشعارات البريد مطلوبة.

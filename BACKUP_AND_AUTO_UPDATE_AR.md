# النسخة الاحتياطية النهائية وميزة التحديث التلقائي — AXIS LAB OS

## 1. النسخة الاحتياطية النهائية

تم إنشاء النسخة الاحتياطية من قاعدة SQLite المحلية بعد التأكد من عدم تشغيل التطبيق. الملف محفوظ على جهاز Windows في المسار التالي:

```text
C:\Users\pc4\Downloads\AXIS-LAB-Backups\axis-data-final-2026-08-13.sqlite
```

تم إنشاء ملف تحقق مرافق:

```text
C:\Users\pc4\Downloads\AXIS-LAB-Backups\axis-data-final-2026-08-13.sha256
```

قيمة SHA-256 الحالية هي:

```text
715E4B62C1E4192B4400BD51F7D364299AA64657CD4342D99E60873C912CFAD0
```

تم تشغيل `PRAGMA integrity_check` على قاعدة التشغيل والنسخة الاحتياطية، وكانت النتيجة `ok` لكلتيهما. حجم النسخة الاحتياطية 45,056 بايت.

## 2. طريقة إنشاء نسخة جديدة يدويًا

أغلق AXIS LAB OS تمامًا، ثم انسخ الملف من:

```text
%APPDATA%\Electron\axis-data.sqlite
```

إلى مجلد احتياطي باسم يتضمن التاريخ، مثل:

```text
D:\AXIS-LAB-Backups\axis-data-2026-09-01.sqlite
```

يجب نسخ الملف بعد إغلاق البرنامج حتى تكون جميع عمليات الحفظ قد اكتملت.

## 3. طريقة الاستعادة

أغلق البرنامج. احتفظ أولًا بنسخة من قاعدة البيانات الحالية لأي رجوع محتمل، ثم انسخ ملف النسخة الاحتياطية إلى:

```text
%APPDATA%\Electron\axis-data.sqlite
```

وافق على الاستبدال، ثم شغّل البرنامج. إذا لم يظهر التغيير، أغلق البرنامج مرة أخرى وتأكد من عدم وجود عملية `AXIS LAB OS.exe` أو `node.exe` تعمل في الخلفية، ثم أعد التشغيل.

لا تستبدل قاعدة البيانات أثناء تشغيل البرنامج، ولا تحذف ملفات `axis-data.sqlite` أو `axis-data.json` القديمة قبل التأكد من نجاح الاستعادة.

## 4. إضافة Auto-Update

تحتاج التحديثات التلقائية إلى مكان تنشر فيه ملفات الإصدار الجديدة، وإلى توقيع رقمي موثوق للتطبيق. الخيار الموصى به لتطبيق AXIS LAB هو استخدام `electron-updater` مع `electron-builder` ونشر إصدارات Windows في GitHub Releases أو في خادم HTTPS خاص. يدعم electron-builder مثبت NSIS assisted، وخيار `perMachine` يحدد ما إذا كان المثبت يعرض صفحة اختيار التثبيت لكل المستخدمين أو للمستخدم الحالي [1].

| الخيار | طريقة العمل | المزايا | المتطلبات |
|---|---|---|---|
| GitHub Releases + `electron-updater` | ينشر Setup وملفات metadata في إصدار GitHub، ثم يفحص التطبيق الإصدار الجديد عبر HTTPS | أبسط وأقل كلفة، مناسب للبدء | حساب GitHub، مستودع Releases، شهادة توقيع Windows |
| خادم HTTPS أو S3/CDN خاص | ينشر `latest.yml` وملف Setup على خادم الشركة | تحكم كامل وخصوصية أكبر | استضافة HTTPS، تخزين، إدارة صلاحيات وتنزيل |
| تحديث يدوي | يعرض البرنامج إشعارًا ورابطًا لنسخة Setup الجديدة | لا يحتاج خدمة تحديث | المستخدم يشغّل المثبت بنفسه |

### البنية البرمجية المقترحة

ثبّت الحزمة:

```bash
npm install electron-updater
```

في `desktop/main.cjs`، أضف في عملية Electron الرئيسية:

```js
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', (info) => {
  // أظهر للمستخدم إشعارًا داخل التطبيق مع رقم الإصدار وحجم التحديث.
});
autoUpdater.on('update-downloaded', () => {
  // بعد موافقة المستخدم، نفّذ autoUpdater.quitAndInstall().
});

app.whenReady().then(async () => {
  autoUpdater.checkForUpdates().catch(() => {
    // فشل التحقق لا يمنع تشغيل البرنامج محليًا.
  });
});
```

في إعداد `electron-builder.yml` يمكن تحديد جهة النشر، مثل GitHub:

```yaml
publish:
  provider: github
  owner: YOUR_GITHUB_OWNER
  repo: YOUR_GITHUB_REPOSITORY
  releaseType: release
```

يجب عدم تضمين رمز GitHub داخل التطبيق. يتم استخدام متغيرات بيئة في جهاز البناء، مثل `GH_TOKEN`، أثناء إنشاء الإصدار فقط. كما يجب توقيع ملف Windows بشهادة Code Signing حتى لا تظهر تحذيرات SmartScreen غير الضرورية.

### قواعد أمان مهمة

يجب أن يفحص التطبيق التحديث عبر HTTPS فقط، وألا يثبت تحديثًا من رابط غير موثوق. يجب إبقاء قاعدة SQLite في مجلد بيانات المستخدم خارج مجلد التثبيت؛ بذلك لا يستبدل التحديث ملفات البيانات. قبل تثبيت التحديث، من الأفضل إنشاء نسخة تلقائية من `axis-data.sqlite` داخل مجلد `backups` مع التاريخ والوقت. يجب أيضًا توفير زر **التحقق من وجود تحديث** وزر **تأجيل التحديث**، وعدم إغلاق البرنامج أو تثبيت التحديث أثناء عملية حفظ أو تصدير.

### ترتيب التنفيذ المقترح

المرحلة الأولى هي إنشاء حساب GitHub أو خادم HTTPS، ثم إصدار شهادة توقيع Windows. بعد ذلك تُضاف `electron-updater` وأحداث التحديث إلى `desktop/main.cjs`، ثم يُضاف حوار واجهة يعرض الإصدار وحالة التنزيل. بعدها تُبنى نسخة تجريبية، ويُختبر التحديث من إصدار `0.1.0` إلى `0.1.1` مع التأكد من بقاء SQLite. أخيرًا فقط يتم تفعيل التحديث التلقائي في النسخة الإنتاجية.

## المراجع

[1]: https://www.electron.build/docs/nsis/ "توثيق electron-builder — NSIS"

[2]: https://www.electron.build/auto-update "توثيق electron-builder — Auto Update"

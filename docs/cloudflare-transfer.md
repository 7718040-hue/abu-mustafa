# نقل البيانات والصور إلى Cloudflare

لا تُعدّل قاعدة Sites خلال تجهيز الكود. النقل إجراء منفصل يُنفَّذ إلى **موارد Cloudflare جديدة وفارغة فقط**.

## تجهيز لقطة كاملة

1. أوقف تعديل المحتوى أثناء التصدير. صدّر الجداول settings وcategories وproducts وmedia وreviews وadmin_members وfaqs وposts وaudit_log. يمكن تضمين review_submission_limits إن كان متاحًا. احتفظ بالمسودات والمحذوفات والمراجعات المخفية. تابع جميع صفحات التصدير ولا تستعمل بيانات مبتورة.
2. احفظ database.json بتنسيق abu-mustafa-d1-snapshot-v1، مع tables لكل جدول يحتوي columns وrows. هذا يختلف عن abu-mustafa-catalog-v1 الناتج من زر الإدارة؛ لا يستبدل أحدهما الآخر.
3. احفظ كل ملف R2 المسجل في media باسم objects/MEDIA_ID. أنشئ manifest.json بتنسيق abu-mustafa-backup-v1 مع database_sha256 وfiles. كل سجل ملف يحتوي id وobject_key وfile وsize وsha256 وcontent_type. يجب تطابق عدد الصور والجداول وأحجام الملفات والبصمات. الصور الأولية المضمنة في public/assets لا تحتاج R2؛ وهي ضمن المصدر.
4. هذه الملفات قد تحتوي معلومات خاصة بالعملاء والفريق؛ تحفظ خارج المستودع وبمكان خاص. لا تضع أسرار الاستضافة أو كلمات المرور فيها. الملفات غير المسجلة في جدول media تحتاج جردًا مستقلًا من المزود.

## تحويل اللقطة والتحقق منها دون تغيير الإنتاج

~~~sh
node scripts/prepare-cloudflare-import.mjs ABSOLUTE_BACKUP_DIRECTORY ABSOLUTE_NEW_OUTPUT_DIRECTORY
~~~

يرفض السكربت مجلد إخراج موجودًا أو بصمات وأحجامًا خاطئة. ينشئ database.sql وmedia-upload-plan.json. يزيل owner_user_id الخاص بالمزود السابق، ويعيد user_id لأعضاء الفريق إلى NULL ليتم ربطهم بهويات Access عند الدخول. يحتفظ بمحتوى الموقع والسجلات والأدوار. يمكن للمالك مراجعة الفريق قبل السماح بالبريد في Access.

## الاستيراد إلى قاعدة جديدة قبل نشر Worker

بعد تطبيق ترحيلات D1 وقبل أن يفتح أي زائر الموقع:

~~~sh
npx wrangler d1 execute DB --remote --file ABSOLUTE_OUTPUT_DIRECTORY/database.sql
node scripts/upload-cloudflare-media.mjs ABSOLUTE_OUTPUT_DIRECTORY/media-upload-plan.json
~~~

SQL يبدأ بفحص فراغ جداول التطبيق، ويرفض الكتابة فوق بيانات موجودة. لا يضم DELETE أو استبدالًا للكتالوج. استيراد المزود قد ينفذ على مراحل؛ عند أي فشل لا تعاود الاستيراد على قاعدة جزئية، احتفظ بها للتشخيص وأنشئ قاعدة جديدة. يراجع رافع الصور البصمات كاملة قبل أول رفع، ويستخدم الحاوية المستقلة المسماة abu-mustafa-cloudflare-photos.

تحقق من أعداد الصفوف وPRAGMA foreign_key_check، ومن جميع روابط /media/، ثم ادخل عبر Access ببريد المالك. لم تُنقل بيانات الموقع الحالي أثناء تجهيز هذا الفرع ولم تُقرأ أسراره.

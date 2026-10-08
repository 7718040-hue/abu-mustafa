# تشغيل نسخة Cloudflare وتسليمها

هذه الوثيقة تخص فرع Cloudflare المستقل. ابدأ بـ[دليل الإعداد](cloudflare-setup.md)، ثم [نقل البيانات والصور](cloudflare-transfer.md)، و[نتائج التحقق](cloudflare-validation.md).

لا تحفظ لقطات العملاء والمسودات أو أسرار الحساب في GitHub. تحتاج النسخة الكاملة جداول D1 وكل ملف مسجل في media، بالإضافة إلى المصدر والموارد العامة. ملف الكتالوج من زر الإدارة لا يحتوي جميع هذه المواد.

أداة scripts/backup-recovery.cjs مخصصة لفحص نسخة احتياطية محليًا، ولا تكتب في الإنتاج. تضبط مصدر التنزيل من PUBLIC_ORIGIN في wrangler.json. تحتاج لقطة database.json صحيحة قبل capture-files، ثم manifest.json لفحص verify. تشغيلها على مصدر Sites القديم يتم من مصدر Sites نفسه؛ لا تغيّر رابط هذه النسخة لهذا الغرض.

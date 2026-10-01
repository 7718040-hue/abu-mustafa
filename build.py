import json, html, pathlib, shutil, urllib.parse, hashlib, zipfile
from catalog import products, EDUCATION, BRAND, UNSUITABLE, REASONS
root=pathlib.Path(__file__).parent
p=root/'public';p.mkdir(exist_ok=True)
base='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site'
seo=json.loads((root/'content/seo.json').read_text(encoding='utf-8'))
esc=lambda s:html.escape(str(s),quote=True)
MAP='https://share.google/31or5gWiPUprKpMrt'
DIRECTIONS='https://www.google.com/maps/dir/?api=1&destination='+urllib.parse.quote('مركز أبو مصطفى التجاري، اليمن، إب، شارع تعز، جوار البرج، أمام القوسي للجنابي تمامًا')
MAP_EMBED='https://www.google.com/maps?q='+urllib.parse.quote('مركز أبو مصطفى التجاري، شارع تعز، جوار البرج، أمام القوسي للجنابي، إب، اليمن')+'&output=embed'
WA='https://wa.me/967770525525'
DIGITAL_CARD='https://poplme.co/hash/fsS3Fbxp/1/dashqr1768850896664'
EMAIL='mailto:abumustafacentr@gmail.com'
TREND_WA='https://wa.me/qr/EC5OBUAAV2DMC1'
STORE_NAME='مركز أبو مصطفى التجاري للعود والعطور ومستلزمات التجميل ومستلزمات الأخضرين والزباد والبخور'
ADDRESS='اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا'
asset_ver=hashlib.sha256((root/'web/style.css').read_bytes()+(root/'web/app.js').read_bytes()).hexdigest()[:12]
CATEGORIES=['عطور','عود وبخور','مسك ومخمريات','معطرات','عناية وتجميل','عبوات ومستلزمات']
CATEGORY_IDS={'عطور':'perfumes','عود وبخور':'oud','مسك ومخمريات':'musk','معطرات':'fresheners','عناية وتجميل':'beauty','عبوات ومستلزمات':'supplies'}
# Repeated source files remain in the original archive; galleries show one copy.
visual_duplicates={15:14,44:42,51:46,55:9,61:60,62:60,72:70,75:74,89:88,98:97}
metadata=json.loads((root/'content/image-metadata.json').read_text())
(p/'assets').mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'content/received/brand-card.png',p/'assets/brand-card.png')
for product in products:
    product['original_photos']=product['photos'][:]
    product['photos']=list(dict.fromkeys(visual_duplicates.get(n,n) for n in product['photos']))
    product['reference']='AM-'+str(product['photos'][0]).zfill(3)
    product['images']=[base+f'/assets/photos/{n}.webp' for n in product['photos']]
    product['url']=base+'/products/'+product['id']+'/'
    product['inquiry_url']=WA+'?text='+urllib.parse.quote('السلام عليكم، أود الاستفسار عن '+product['name']+'، السعر والتوفر والحجم.\nمرجع الصورة: '+product['reference']+'\n'+product['url'])
    product['image_evidence']='صورة أرسلها المالك؛ لا تثبت المخزون الحالي'
(root/'content/products.json').write_text(json.dumps(products,ensure_ascii=False,indent=2))
(p/'products.json').write_text(json.dumps(products,ensure_ascii=False,indent=2))
with zipfile.ZipFile(root/'content/received/product-images.zip') as z:
    manifest=[];seen={}
    for n in range(1,101):
        f=next(f for f in z.infolist() if pathlib.PurePosixPath(f.filename).name.startswith(f'photo_{n}_'))
        digest=hashlib.sha256(z.read(f)).hexdigest()
        linked=[x['id'] for x in products if n in x['original_photos']]
        category='مستبعد من واجهة المتجر' if n==81 else 'كتالوج المنتجات' if linked else 'تعليم ومحتوى تحريري' if n in EDUCATION else 'هوية المركز' if n in BRAND else 'مستبعد من واجهة المتجر' if n in UNSUITABLE else 'بانتظار تحديد المنتج'
        duplicate=seen.get(digest) or visual_duplicates.get(n)
        reason='صورة بخلفية شتوية وأشجار، أزيلت من معرض المنتج بعد مراجعة ملاحظة المستخدم. الأصل محفوظ للمراجعة.' if n==81 else REASONS.get(n,'مرتبط بمنتج مصوّر؛ لا يؤكد التوفر' if linked else 'مادة تعليمية؛ لا تعامل كمنتج أو وصفة معتمدة' if n in EDUCATION else 'مادة هوية؛ لا تعامل كمنتج مستقل' if n in BRAND else 'لا يكفي المظهر لتأكيد الاسم أو المحتوى')
        manifest.append(dict(number=n,filename=pathlib.PurePosixPath(f.filename).name,sha256=digest,classification=category,product_ids=linked,duplicate_of=duplicate,exact_duplicate_of=seen.get(digest),decision=reason,**{k:v for k,v in metadata[str(n)].items() if k in ('width','height')}))
        if digest not in seen:seen[digest]=n
(root/'content/image-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(p/'image-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
paths={
'social':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3m-6 7 6 3"/>',
'googlemaps':'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/>',
'pin':'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/>',
'arrow':'<path d="M19 12H5m6-6-6 6 6 6"/>',
'external':'<path d="M8 5H5v14h14v-3M12 5h7v7M19 5 9 15"/>',
'route':'<path d="m12 2 10 10-10 10L2 12 10-10Z"/><path d="M8 15v-4h8m-3-3 3 3-3 3"/>',
'search':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
'close':'<path d="m6 6 12 12M18 6 6 18"/>',
'menu':'<path d="M4 6h16M4 12h16M4 18h16"/>',
'hand':'<path d="M9 11V4a2 2 0 0 1 4 0v7-2a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-2 6-6 6h-1c-3 0-4-2-6-4l-4-4a2 2 0 0 1 3-3l2 2"/>',
'phone':'<path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2A18 18 0 0 1 3 5c0-1 1-2 2-2Z"/>',
'spark':'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
'gift':'<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8S5 9 5 5s7-3 7 3Zm0 0s7 1 7-3-7-3-7 3Z"/>',
'leaf':'<path d="M20 3S7 1 4 10s6 13 11 7 5-14 5-14Z"/><path d="M3 22 15 9"/>',
'book':'<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/>',
'bag':'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/>',
'bottle':'<path d="M9 3h6v4H9zM8 7h8l2 4v10H6V11l2-4Z"/><path d="M9 14h6M9 17h6"/>',
'layers':'<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M20 7v13H7"/>',
'zoom':'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
'check':'<path d="m5 12 4 4 10-10"/>',
'copy':'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
'mail':'<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m4 7 8 6 8-6"/>',
'card':'<rect x="2.5" y="4" width="19" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M5 16c.8-2 5.2-2 6 0M14 9h4M14 13h4"/>',
'grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
'whatsapp':'<path d="M20.4 3.6A11.8 11.8 0 0 0 1.8 17.8L0 24l6.4-1.7A11.8 11.8 0 0 0 24 12a11.7 11.7 0 0 0-3.6-8.4ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.3-.4A9.8 9.8 0 1 1 12 21.8Zm5.4-7.3c-.3-.2-1.7-.8-2-.9s-.5-.2-.7.1-.8.9-1 1.1-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6L9 6.8c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4A3.6 3.6 0 0 0 5.7 9a6.3 6.3 0 0 0 1.3 3c.2.2 2.5 3.9 6 5.4.8.3 1.5.5 2 .6a4.7 4.7 0 0 0 2.2-.1 3.6 3.6 0 0 0 2.1-1.5c.3-.5.3-1 .2-1.1s-.3-.2-.6-.4Z"/>',
'facebook':'<path d="M24 12A12 12 0 1 0 10.1 23.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-1.9.9-1.9 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"/>',
'instagram':'<path d="M7 0h10a7 7 0 0 1 7 7v10a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7V7a7 7 0 0 1 7-7Zm0 2a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5H7Zm5 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm6.3-3.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"/>',
'youtube':'<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/>',
 'telegram':'<path d="M22.4 1.6 1.1 9.8c-1.5.6-1.5 1.4-.3 1.8l5.5 1.7L19.2 5c.6-.4 1.1-.2.6.2L9.4 14.7 9 20.4c.6 0 .9-.3 1.2-.6l2.7-2.6 5.6 4.1c1 .6 1.8.3 2-.9L24 3.3c.3-1.5-.6-2.2-1.6-1.7Z"/>',
 'x':'<path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.9L0 1.2h7.6l5.2 7 6.1-7Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z"/>',
 'tiktok':'<path d="M16.7 0c.4 3.3 2.3 5.3 5.3 5.5v4.1a10 10 0 0 1-5.3-1.6v8.5A7.5 7.5 0 1 1 10.2 9v4.2a3.4 3.4 0 1 0 2.2 3.2V0h4.3Z"/>'}
brands={'whatsapp','facebook','instagram','youtube','telegram','x','tiktok'}
def icon(name):return '<svg class="icon'+(' brand-icon' if name in brands else '')+'" viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>'
social_data=[
    ('whatsapp','واتساب',WA,'استفسار مباشر'),
    ('instagram','إنستغرام','https://www.instagram.com/abumustafacenter99/','صور واختيارات'),
    ('facebook','فيسبوك','https://www.facebook.com/share/17nWaxKfb5/','أخبار المركز'),
    ('tiktok','تيك توك','https://www.tiktok.com/@abomustafa_center?is_from_webapp=1&sender_device=pc','مقاطع وجديدنا'),
    ('youtube','يوتيوب','https://www.youtube.com/@abumustafacenter99','شاهد وتعلّم'),
    ('telegram','تيليجرام','https://t.me/abumustafacenter99','قناة المركز'),
    ('x','إكس','https://x.com/abumustafacentr','حساب المركز'),
    ('mail','البريد الإلكتروني',EMAIL,'راسل المركز'),
    ('googlemaps','خرائط جوجل',MAP,'الموقع والاتجاهات'),
    ('card','البطاقة الرقمية',DIGITAL_CARD,'جميع بيانات المركز'),
]
def social(extra=''):
    cls='socials'+((' '+extra) if extra else '')
    return f'<div class="{cls}" aria-label="حسابات المركز">'+''.join(f'<a class="social-link platform-{k}" data-account="{k}" href="{esc(u)}" target="_blank" rel="noopener noreferrer" title="{n}" aria-label="{n} — مركز أبو مصطفى">{icon(k)}</a>' for k,n,u,_ in social_data)+'</div>'
def social_cards():
    cards=social_data+[
        ('telegram','تعلّم أسرار العطور مجانًا','https://t.me/mA_M_H','دروس العطور والبخور'),
        ('whatsapp','واتساب فرع الترندات',TREND_WA,'تواصل مع الفرع'),
    ]
    return ''.join(f'<a class="social-card social-{k}" href="{esc(u)}" target="_blank" rel="noopener noreferrer"><span class="social-platform-icon">{icon(k)}</span><span><strong>{n}</strong><small>{subtitle}</small></span>{icon("external")}</a>' for k,n,u,subtitle in cards)
def brand():return '<a class="brand" href="/" aria-label="مركز أبو مصطفى — الرئيسية"><img src="/assets/logo.webp" alt="شعار مركز أبو مصطفى الأصلي" width="74" height="74"><span><strong>مركز أبو مصطفى التجاري</strong><small>للعود والعطور ومستلزمات التجميل<br>ومستلزمات الأخضرين والزباد والبخور</small></span></a>'
def ext(url,text,cls='btn',ico='external'):
    return f'<a class="{cls}" href="{esc(url)}" target="_blank" rel="noopener noreferrer">{text}{icon(ico)}</a>'
shortcuts=''.join([
    '<a href="/">'+icon('arrow')+'<span><strong>العودة إلى الرئيسية</strong><small>الصفحة الرئيسية للمركز</small></span></a>',
    '<a href="/#news">'+icon('book')+'<span><strong>المنشورات التعليمية</strong><small>نصائح وأخبار المركز</small></span></a>',
    '<a href="/#faq">'+icon('spark')+'<span><strong>الأسئلة الشائعة</strong><small>إجابات سريعة ومفيدة</small></span></a>',
    '<a href="/#catalog" data-focus-search>'+icon('search')+'<span><strong>البحث في المنتجات</strong><small>اكتب اسم العطر أو الصنف</small></span></a>',
    '<a href="/#services">'+icon('spark')+'<span><strong>خدمات المركز</strong><small>جملة وتجزئة ومستلزمات</small></span></a>',
    '<a href="/#learn">'+icon('book')+'<span><strong>تعلّم أسرار العطور مجانًا</strong><small>العطور والبخور والخلطات</small></span></a>',
    '<a href="/#contact">'+icon('pin')+'<span><strong>زيارة المحل</strong><small>العنوان وطرق الوصول</small></span></a>',
    '<a href="/#contact-directory">'+icon('phone')+'<span><strong>أرقام هواتف المركز</strong><small>اختر القسم والرقم المناسب</small></span></a>',
    '<a href="/categories/supplies/">'+icon('bottle')+'<span><strong>أدوات ومستلزمات العطور</strong><small>العبوات وأدوات القياس والتحضير</small></span></a>',
    f'<a href="{DIGITAL_CARD}" target="_blank" rel="noopener noreferrer">'+icon('card')+'<span><strong>البطاقة الرقمية</strong><small>كل روابط المركز</small></span></a>',
])
header=f'''<a class="skip" href="#main">انتقل إلى المحتوى</a><header class="site-header compact-header"><a class="location-strip" href="{MAP}" target="_blank" rel="noopener noreferrer" aria-label="فتح موقع مركز أبو مصطفى على خرائط جوجل"><span class="location-strip-inner">{icon('pin')}<span>{ADDRESS}</span><strong>الاتجاهات</strong>{icon('external')}</span></a><div class="brand-strip"><div class="wrap header-inner"><a class="nav-mark" href="/" aria-label="مركز أبو مصطفى التجاري — الرئيسية"><img src="/assets/logo-original.png" width="960" height="960" alt="شعار مركز أبو مصطفى الأصلي"><span class="nav-title"><strong>مركز أبو مصطفى التجاري</strong><small>للعود والعطور ومستلزمات التجميل</small><small>ومستلزمات الأخضرين والزباد والبخور</small></span></a><button class="menu-toggle" aria-label="فتح الأقسام والاختصارات" aria-controls="main-nav" aria-expanded="false">{icon('menu')}<span class="menu-gesture" aria-hidden="true">{icon('hand')}</span></button><nav class="main-nav" id="main-nav" aria-label="الأقسام والاختصارات"><div class="menu-heading"><strong>اكتشف المركز</strong><span>إلى أين تريد الذهاب؟</span></div><div class="compact-shortcuts">{shortcuts}</div></nav></div></div></header><section class="identity-header compact-social" aria-label="حسابات مركز أبو مصطفى"><div class="wrap identity-inner"><span class="follow-label">تابعنا</span>{social('identity-socials')}</div></section>'''

footer=f'''<footer class="site-footer"><div class="wrap"><div class="footer-main"><div class="footer-brand">{brand()}<p>{ADDRESS}</p></div><nav class="footer-nav" aria-label="دليل الموقع"><strong>دليل الموقع</strong><a href="/#catalog">المنتجات والتشكيلات</a><a href="/#services">خدمات المركز</a><a href="/#learn">تعلّم أسرار العطور مجانًا</a><a href="/#reviews">آراء العملاء الموثقة</a><a href="/#contact">العنوان وأرقام الأقسام</a><a href="/#social-accounts">الحسابات الرسمية</a></nav><div class="footer-actions"><p>كل بيانات المركز وروابطه في مكان واحد.</p>{ext(DIGITAL_CARD,'فتح البطاقة الرقمية','btn footer-card-link','card')}{ext(MAP,'الاتجاهات إلى المحل','text-link footer-map-link','pin')}</div></div><div class="developer-credit"><span>تصميم وتطوير <strong>ابراهيم العواضي</strong></span><a href="tel:+967771804045" dir="ltr">{icon("phone")}+967 771 804 045</a><a class="admin-link" href="/admin/">إدارة المحتوى</a></div><div class="footer-bottom"><span>مركز أبو مصطفى التجاري · {ADDRESS}</span><span>جميع الحقوق محفوظة © 2026</span></div></div></footer><a class="wa-floating" href="{WA}" target="_blank" rel="noopener noreferrer" aria-label="افتح دردشة واتساب مع مركز أبو مصطفى على 770525525"><small>تواصل معنا</small>{icon('whatsapp')}</a><div class="toast" id="toast" role="status" hidden></div>'''
store_schema={'@context':'https://schema.org','@type':'Store','@id':base+'/#store','name':STORE_NAME,'url':base,'logo':base+'/assets/logo-original.png','image':[base+'/assets/brand-card.png',base+'/assets/storefront.webp'],'telephone':['+967770525525','+967716525525','+967778525525','+967714525525','+967777550035','+9674427600','+9674418100'],'email':'abumustafacentr@gmail.com','address':{'@type':'PostalAddress','streetAddress':'شارع تعز، جوار البرج، أمام القوسي للجنابي تمامًا','addressLocality':'إب','addressRegion':'إب','addressCountry':'YE'},'sameAs':[u for k,n,u,_ in social_data if k in {'instagram','facebook','tiktok','youtube','telegram','x','card'}],'hasMap':MAP,'description':STORE_NAME+' في '+ADDRESS+'. بيع بالجملة والتجزئة ومحتوى «تعلّم أسرار العطور مجانًا» في موضوعات العطور والبخور.'}
store_schema.update(name=seo['businessName'],alternateName=[seo['siteName'],seo['alternateName']],url=base+'/',description=seo['description'])
store_schema['address']['streetAddress']='شارع تعز، جوار البرج، أمام القوسي للجنابي تمامًا'
website_schema={'@context':'https://schema.org','@type':'WebSite','@id':base+'/#website','url':base+'/','name':seo['siteName'],'alternateName':seo['alternateName'],'inLanguage':'ar-YE','publisher':{'@id':base+'/#store'}}
def page(title,desc,body,path='/',schema=None):
    data=json.dumps(products,ensure_ascii=False).replace('</','<\\/')
    schema_data=json.dumps(schema or store_schema,ensure_ascii=False).replace('</','<\\/')
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#4b172b"><meta name="application-name" content="{esc(seo['siteName'])}"><title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><link rel="canonical" href="{base+path}"><meta property="og:type" content="website"><meta property="og:locale" content="ar_YE"><meta property="og:site_name" content="{esc(seo['siteName'])}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{base+path}"><meta property="og:image" content="{base}{seo['logoPath']}"><meta property="og:image:alt" content="{esc(seo['siteName'])}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{base}{seo['logoPath']}"><meta name="twitter:image:alt" content="{esc(seo['siteName'])}"><link rel="icon" href="/assets/favicon.png" type="image/png" sizes="96x96"><link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48"><link rel="icon" href="/assets/favicon-192.png" type="image/png" sizes="192x192"><link rel="icon" href="/assets/favicon-512.png" type="image/png" sizes="512x512"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180"><link rel="manifest" href="/site.webmanifest"><link rel="preload" as="font" href="/assets/fonts/tajawal-400.ttf" type="font/ttf" crossorigin><link rel="stylesheet" href="/style.css?v={asset_ver}"><script type="application/ld+json">{schema_data}</script><script id="catalog-data" type="application/json">{data}</script><script src="/app.js?v={asset_ver}" defer></script></head><body>{header}{body}{footer}{dialogs()}</body></html>'''
def image_tag(n,alt,small=True,lazy=True,cls=''):
    m=metadata[str(n)]
    return f'<img src="/assets/photos/{n}{"-small" if small else ""}.webp" alt="{esc(alt)}" width="{m["width"]}" height="{m["height"]}" loading="{"lazy" if lazy else "eager"}" decoding="async"'+(f' class="{cls}"' if cls else '')+'>'

def card(x):
    count=len(x['photos'])
    return f'''<article class="product-card" data-id="{x['id']}" data-categories="{CATEGORY_IDS[x['category']]}" data-search="{esc(' '.join(str(x.get(f,'')) for f in ['name','category','description','brand','label','reference']))}"><a class="product-visual" href="/products/{x['id']}/" aria-label="تفاصيل {x['name']}">{image_tag(x['photos'][0],x['name']+' — صورة من المركز')}{f'<span class="photo-count">{icon("layers")}{count} صور</span>' if count>1 else ''}</a><a class="quick-button" href="/products/{x['id']}/" aria-label="عرض جميع صور وتفاصيل {x['name']}">{icon('zoom')}</a><div class="product-info"><div class="product-category">{x['category']}</div><h3><a href="/products/{x['id']}/">{x['name']}</a></h3><p>{x['intro']}</p><div class="product-footer"><a class="product-details-link" href="/products/{x['id']}/"><span><strong>مزيد من التفاصيل</strong><small>اضغط لعرض الصور والمعلومات</small></span>{icon('arrow')}</a></div></div></article>'''
def dialogs():return f'''<dialog id="quick-dialog" class="dialog" aria-labelledby="quick-title"><button class="dialog-close" data-close aria-label="إغلاق المعاينة">{icon('close')}</button><div class="dialog-grid"><div class="dialog-gallery"><img id="quick-image" class="dialog-stage" alt=""><div id="quick-thumbs" class="thumbnails" aria-label="صور المنتج"></div></div><div class="dialog-copy"><div class="eyebrow" id="quick-category"></div><h2 id="quick-title"></h2><p id="quick-description"></p><a id="quick-inquiry" class="btn whatsapp" target="_blank" rel="noopener noreferrer">{icon('whatsapp')}اسأل عن هذا المنتج</a><a id="quick-details" class="text-link">التفاصيل الكاملة {icon('arrow')}</a></div></div></dialog><dialog id="zoom-dialog" class="dialog zoom-dialog" aria-label="الصورة المكبرة للمنتج"><button class="dialog-close" data-close aria-label="إغلاق الصورة">{icon('close')}</button><img id="zoom-image" alt=""></dialog>'''
faq=[('كيف أعرف السعر والتوفر؟','افتح المنتج واضغط «اسأل عن هذا المنتج». تُفتح دردشة واتساب على الرقم 770525525 مع اسم المنتج ومرجعه؛ يؤكد المركز السعر والحجم والتوفر قبل إتمام الطلب.'),('أين يقع مركز أبو مصطفى؟','في اليمن — محافظة إب — شارع تعز — سوق الأسلحة — جوار برج المدينة — أمام القوسي للجنابي تمامًا. استخدم زر خرائط جوجل أو الاتجاهات للوصول.'),('هل يمكن الاستفسار عن طلبات الجملة؟','نعم، المركز يقدم البيع بالجملة والتجزئة. حدّد الأصناف والكميات عند التواصل للحصول على تفاصيل الطلب.'),('أين أتابع «تعلّم أسرار العطور مجانًا»؟','عبر قناة مركز أبو مصطفى التعليمية على تيليجرام وقناته على يوتيوب. تتناول المواد موضوعات العطور والبخور والخلطات من مصادر المركز الأصلية.'),('هل الصور المعروضة للمنتجات حقيقية؟','صور الكتالوج من الملفات التي قدّمها مالك المركز. تبقى تفاصيل الإصدار والحجم والتوفر بحاجة إلى تأكيد عند الاستفسار.'),('هل أستطيع البحث باسم العطر أو العلامة؟','نعم. استخدم مربع البحث في الكتالوج، ويمكنك أيضًا التصفية حسب القسم وترتيب النتائج حسب الاسم أو عدد الصور.'),('كيف أرسل استفسارًا عن منتج محدد؟','افتح صفحة المنتج واضغط زر واتساب؛ ستُجهّز رسالة تتضمن اسم المنتج ومرجعه لتسهيل الرد عليك.'),('هل توجد أسعار داخل الموقع؟','لا يظهر أي سعر إلا بعد أن تعتمد إدارة المركز قيمته. إذا لم يُضف سعر مؤكد فلن يعرض الموقع سعرًا للمنتج.'),('ما الفرق بين أرقام الأقسام؟','أرقام قسم الزباد والبخور والأخضرين منفصلة عن أرقام قسم التجميل والعطور لتصل مباشرة إلى الفريق الأنسب.'),('هل الرقم 770 525 525 يعمل على واتساب؟','نعم، هذا هو رقم التواصل الرئيسي المعتمد، ويظهر بجواره رمز واتساب في الموقع.'),('هل المنتجات المعروضة متوفرة الآن؟','وجود صورة المنتج لا يعني توفره لحظيًا. تواصل مع القسم المختص لتأكيد التوفر والإصدار والحجم.'),('كيف أصل إلى جميع حسابات المركز؟','ستجد روابط الحسابات الرسمية في قسم «حساباتنا»، كما تجمع البطاقة الرقمية جميع وسائل التواصل في رابط واحد.')]
faq=[(q,'في اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا. استخدم زر خرائط جوجل أو الاتجاهات للوصول.' if q=='أين يقع مركز أبو مصطفى؟' else a) for q,a in faq]
catalog_filters='<button class="filter active" data-category="الكل" aria-pressed="true">الكل</button>'+''.join(f'<button class="filter" data-category="{CATEGORY_IDS[c]}" aria-pressed="false">{c}</button>' for c in CATEGORIES)
catalog_cards=''.join(card(x) for x in products)
lessons=''.join(f'<a class="lesson" href="{url}" target="_blank" rel="noopener noreferrer"><span class="lesson-symbol">{icon("book")}</span><span><strong>{title}</strong><small>{subtitle}</small></span>{icon("external")}</a>' for title,subtitle,url in [
    ('البخور ومستلزماته','موضوعات عن الخامات وأساليب التحضير','https://t.me/mA_M_H'),
    ('الخلطات العطرية','مواد تعليمية من قناة المركز','https://t.me/mA_M_H'),
    ('مجتمع المعرفة','تابع الدروس واسأل عن التفاصيل','https://t.me/mA_M_H'),
])
faq_html=''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q,a in faq)
body=f'''<main id="main"><h1 class="sr-only">{STORE_NAME}</h1>
<section class="hero identity-hero" aria-label="هوية مركز أبو مصطفى">
  <div class="wrap hero-luxe">
    <div class="hero-stage" data-mobile-carousel tabindex="0" aria-label="بطاقات المركز. اسحب أفقيًا للاستكشاف.">
      <article class="hero-note hero-note-products">
        <span class="hero-note-icon">{icon('bottle')}</span>
        <div class="eyebrow">تشكيلة مصوّرة</div>
        <h2>من العطر إلى عبق العود.</h2>
        <p>تصفّح المنتجات بصورها الحقيقية، ثم اسأل عن السعر والحجم والتوفر.</p>
        <a class="hero-note-link" href="#catalog">اكتشف المنتجات {icon('arrow')}</a>
      </article>
      <figure class="brand-card-stage">
        <span class="brand-card-label">الهوية الرسمية للمركز</span>
        <img src="/assets/brand-card.png" alt="البطاقة التعريفية الأصلية لمركز أبو مصطفى التجاري للعود والعطور ومستلزمات التجميل" width="640" height="640" loading="eager" decoding="async">
        <figcaption>أبو مصطفى · للعود والعطور ومستلزمات التجميل</figcaption>
      </figure>
      <a class="street-card-stage" href="{MAP}" target="_blank" rel="noopener noreferrer" aria-label="فتح موقع واجهة مركز أبو مصطفى على خرائط جوجل">
        <img src="/assets/storefront.webp" alt="واجهة مركز أبو مصطفى التجاري من شارع تعز في إب" width="765" height="1020" loading="eager" decoding="async">
        <span class="street-card-copy"><small>{icon('pin')} شارع تعز · جوار البرج</small><strong>واجهة المركز من الشارع</strong><em>افتح الاتجاهات {icon('external')}</em></span>
      </a>
      <article class="hero-note hero-note-learning">
        <span class="hero-note-icon">{icon('book')}</span>
        <div class="eyebrow">تعلّم أسرار العطور مجانًا</div>
        <h2>المعرفة جزء من تجربتنا.</h2>
        <p>تابع محتوى المركز في العطور والبخور والخلطات من قنواته الأصلية.</p>
        <a class="hero-note-link" href="#learn">ابدأ التعلّم {icon('arrow')}</a>
      </article>
    </div>
    <div class="carousel-hint" aria-label="التنقل بين بطاقات الواجهة"><button type="button" data-carousel-prev aria-label="البطاقة السابقة">{icon('arrow')}</button><span>تتحرك البطاقات تلقائيًا · اسحب يمينًا أو يسارًا للتحكم</span><div class="carousel-dots" data-carousel-dots aria-hidden="true"></div><button type="button" data-carousel-next aria-label="البطاقة التالية">{icon('arrow')}</button></div>
    <div class="hero-actions hero-luxe-actions">
      <a class="btn gold" href="#catalog" data-focus-search>ابحث في التشكيلة {icon('search')}</a>
      {ext(WA,'اسألنا على واتساب','btn light','whatsapp')}
      {ext(DIRECTIONS,'الاتجاهات إلى المحل','btn light','route')}
    </div>
  </div>
</section>

<section class="catalog wrap" id="catalog" aria-labelledby="catalog-title">
  <div class="section-heading luxe-heading"><div><div class="eyebrow">الكتالوج المصوّر</div><h2 id="catalog-title">اختيارات تليق بذوقك.</h2></div><p>ابحث بالاسم، صفِّ حسب القسم، وافتح صور المنتج وتفاصيله قبل الاستفسار.</p></div>
  <div class="catalog-controls"><div class="toolbar"><label class="search-box">{icon('search')}<input type="search" id="search" aria-label="ابحث عن منتج" placeholder="ابحث عن عطر، مسك، بخور…" autocomplete="off"></label><select id="sort" aria-label="ترتيب المنتجات"><option value="featured">ترتيب التشكيلة</option><option value="best-sellers">الأكثر مبيعًا</option><option value="name">حسب الاسم</option><option value="photos">الأكثر صورًا</option></select></div><div class="filter-row" aria-label="تصفية المنتجات حسب الفئة">{catalog_filters}</div></div>
  <div class="results-line"><span id="count" role="status">{len(products)} منتجًا في التشكيلة</span><span class="note">{icon('whatsapp')}السعر والتوفر بالاستفسار</span></div>
  <div class="grid" id="products">{catalog_cards}</div>
  <div class="empty" id="empty" hidden><h3>لم نجد نتيجة مطابقة.</h3><p>جرّب اسمًا آخر أو امسح التصفية، ويمكنك سؤالنا مباشرة.</p><button class="btn outline" id="reset">عرض كل المنتجات</button>{ext(WA,'اسألنا على واتساب','btn whatsapp','whatsapp')}</div>
  <div class="load-area" id="load-area" hidden><button id="load-more" class="btn outline">عرض المزيد {icon('arrow')}</button></div>
</section>

<section class="services-section" id="services" aria-labelledby="services-title"><div class="wrap">
  <div class="section-heading luxe-heading"><div><div class="eyebrow">خدمة تكمّل اختيارك</div><h2 id="services-title">كل ما تحتاجه من مكان واحد.</h2></div><p>اختر المنتج المناسب، ونسّق الكمية والتفاصيل مباشرة مع المركز.</p></div>
  <div class="services"><div class="service">{icon('bag')}<div><h3>جملة وتجزئة</h3><p>اختيارات للأفراد وأصحاب المحلات، مع تنسيق الأصناف والكميات بالاستفسار.</p></div></div><div class="service">{icon('bottle')}<div><h3>مستلزمات عالم الطيب</h3><p>عبوات وأدوات وخامات عطرية؛ اسأل عن المواصفات المناسبة لاحتياجك.</p></div></div><div class="service">{icon('whatsapp')}<div><h3>مساعدة في الاختيار</h3><p>أرسل اسم المنتج أو مرجع صورته، واسأل عن الرائحة والحجم والسعر والتوفر.</p></div></div></div>
</div></section>

<section class="learning-wrap wrap" id="learn" aria-labelledby="learn-title"><div class="learning">
  <div><div class="eyebrow">تعلّم أسرار العطور مجانًا</div><h2 id="learn-title">تعلّم عالم العطور والبخور.</h2><p>محتوى مجاني من المركز عن العطور والخامات وتحضير البخور والخلطات.</p><div class="learning-actions">{ext('https://t.me/mA_M_H','ابدأ التعلّم مجانًا','btn gold','telegram')}{ext('https://www.youtube.com/@abumustafacenter99','شاهد القناة','text-link','youtube')}</div></div>
  <div class="lesson-list">{lessons}</div>
</div></section>

<div id="reviews-slot">{{{{REVIEWS}}}}</div>

<section class="visit wrap" id="contact" aria-labelledby="visit-title">
  <div class="visit-heading luxe-heading"><div><div class="eyebrow">زيارة وتواصل</div><h2 id="visit-title">نلقاك في إب.</h2></div><p>احفظ العنوان، افتح الاتجاهات، أو تواصل قبل الزيارة.</p></div>
  <div class="visit-grid">
    <figure class="storefront-frame"><img src="/assets/storefront.webp" alt="واجهة مركز أبو مصطفى التجاري في شارع تعز جوار البرج أمام القوسي للجنابي في إب" width="765" height="1020" loading="lazy"><figcaption class="storefront-caption"><span>{icon('pin')} شارع تعز · جوار البرج</span><strong>واجهة المركز</strong></figcaption></figure>
    <div class="location-panel location-map"><div class="map-frame"><iframe src="{esc(MAP_EMBED)}" title="موقع مركز أبو مصطفى التجاري على خرائط جوجل" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="map-card"><span class="location-symbol">{icon('pin')}</span><div><div class="place">اليمن - إب</div><h3>شارع تعز - جوار البرج</h3><p>أمام القوسي للجنابي تمامًا</p></div><div class="location-actions">{ext(DIRECTIONS,'الاتجاهات','btn','route')}{ext(MAP,'فتح خرائط جوجل','btn outline','pin')}</div></div></div>
    <div class="contact-panel contact-directory" id="contact-directory" role="region" aria-labelledby="contact-directory-title">
      <div class="eyebrow">أرقام مرتبة حسب القسم</div>
      <h3 id="contact-directory-title">دليل التواصل</h3>
      <p>اختر الاتصال، أو اضغط أيقونة واتساب بجانب الرقم لمراسلته.</p>
      <section class="department-contact" aria-labelledby="contact-incense-title">
        <div class="department-heading"><span class="department-kicker">قسم مستلزمات</span><h4 id="contact-incense-title">الزباد والبخور والأخضرين</h4></div>
        <div class="department-numbers">
          <a class="department-call" href="tel:+9674427600" aria-label="اتصال بقسم الزباد والبخور والأخضرين على 04 427600"><span class="phone-copy"><span class="phone-label">هاتف القسم</span><bdi class="phone-number" dir="ltr">04 427600</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
          <div class="department-phone">
            <a class="department-call" href="tel:+967770525525" aria-label="اتصال بقسم الزباد والبخور والأخضرين على 770 525 525"><span class="phone-copy"><span class="phone-label">الجوال الرئيسي</span><bdi class="phone-number" dir="ltr">770 525 525</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
            <a class="department-whatsapp" href="{WA}" target="_blank" rel="noopener noreferrer" aria-label="واتساب قسم الزباد والبخور على 770 525 525">{icon('whatsapp')}<span class="sr-only">مراسلة</span></a>
          </div>
          <div class="department-phone">
            <a class="department-call" href="tel:+967716525525" aria-label="اتصال بقسم الزباد والبخور والأخضرين على 716 525 525"><span class="phone-copy"><span class="phone-label">جوال القسم</span><bdi class="phone-number" dir="ltr">716 525 525</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
            <a class="department-whatsapp" href="https://wa.me/967716525525" target="_blank" rel="noopener noreferrer" aria-label="واتساب قسم الزباد والبخور والأخضرين على 716 525 525">{icon('whatsapp')}<span class="sr-only">مراسلة</span></a>
          </div>
        </div>
      </section>
      <section class="department-contact" aria-labelledby="contact-perfume-title">
        <div class="department-heading"><span class="department-kicker">قسم مستلزمات</span><h4 id="contact-perfume-title">التجميل والعطور</h4></div>
        <div class="department-numbers">
          <a class="department-call" href="tel:+9674418100" aria-label="اتصال بقسم التجميل والعطور على 04 418100"><span class="phone-copy"><span class="phone-label">هاتف القسم</span><bdi class="phone-number" dir="ltr">04 418100</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
          <div class="department-phone">
            <a class="department-call" href="tel:+967778525525" aria-label="اتصال بقسم التجميل والعطور على 778 525 525"><span class="phone-copy"><span class="phone-label">جوال القسم</span><bdi class="phone-number" dir="ltr">778 525 525</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
            <a class="department-whatsapp" href="https://wa.me/967778525525" target="_blank" rel="noopener noreferrer" aria-label="واتساب قسم التجميل والعطور على 778 525 525">{icon('whatsapp')}<span class="sr-only">مراسلة</span></a>
          </div>
          <div class="department-phone">
            <a class="department-call" href="tel:+967714525525" aria-label="اتصال بقسم التجميل والعطور على 714 525 525"><span class="phone-copy"><span class="phone-label">جوال القسم</span><bdi class="phone-number" dir="ltr">714 525 525</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
            <a class="department-whatsapp" href="https://wa.me/967714525525" target="_blank" rel="noopener noreferrer" aria-label="واتساب قسم التجميل والعطور على 714 525 525">{icon('whatsapp')}<span class="sr-only">مراسلة</span></a>
          </div>
        </div>
      </section>
      <section class="department-contact management-contact" aria-labelledby="contact-management-title">
        <div class="department-heading"><span class="department-kicker">الإدارة</span><h4 id="contact-management-title">مكتب إدارة المركز</h4></div>
        <div class="department-numbers">
          <div class="department-phone">
            <a class="department-call" href="tel:+967777550035" aria-label="اتصال بإدارة المركز على 777 550 035"><span class="phone-copy"><span class="phone-label">جوال الإدارة</span><bdi class="phone-number" dir="ltr">777 550 035</bdi></span><span class="call-symbol">{icon('phone')}</span></a>
            <a class="department-whatsapp" href="https://wa.me/967777550035" target="_blank" rel="noopener noreferrer" aria-label="واتساب إدارة المركز على 777 550 035">{icon('whatsapp')}<span class="sr-only">مراسلة</span></a>
          </div>
        </div>
      </section>
    </div>
  </div>

  <div class="social-showcase" id="social-accounts"><div class="section-heading luxe-heading"><div><div class="eyebrow">جميع قنوات المركز</div><h2>تابع أبو مصطفى حيث تفضّل.</h2></div><p>الحسابات والبطاقة الرقمية والبريد والموقع في مجموعة مرتبة وواضحة.</p></div><div class="social-cards">{social_cards()}</div></div>
  <div class="faq-heading" id="faq"><div class="eyebrow">قبل أن تتواصل</div><h2>إجابات سريعة.</h2></div><div class="faq" aria-label="أسئلة شائعة">{faq_html}</div>
</section>
</main>'''
list_schema={'@context':'https://schema.org','@type':'ItemList','name':'تشكيلة مركز أبو مصطفى المصورة','numberOfItems':len(products),'itemListElement':[{'@type':'ListItem','position':i+1,'name':x['name'],'url':x['url']} for i,x in enumerate(products)]}
faq_schema={'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faq]}
(p/'index.html').write_text(page(seo['homeTitle'],seo['description'],body.replace('{{REVIEWS}}',''),schema=[website_schema,store_schema,list_schema,faq_schema]))
shutil.rmtree(p/'products',ignore_errors=True)
for x in products:
    folder=p/'products'/x['id'];folder.mkdir(parents=True,exist_ok=True)
    thumbs=''.join(f'<button class="thumb{" active" if i==0 else ""}" data-image="/assets/photos/{n}.webp" aria-label="الصورة {i+1} من {x["name"]}" aria-pressed="{"true" if i==0 else "false"}">{image_tag(n,x["name"]+" — الصورة "+str(i+1))}</button>' for i,n in enumerate(x['photos']))
    specs=[('الفئة',x['category'])]+([('العلامة الظاهرة',x['brand'])] if x.get('brand') else [])+([('الحجم على الصورة',x['size'])] if x.get('size') else [])+[('مرجع الصورة',x['reference']),('السعر والتوفر','اسألنا مباشرة')]
    others=[a for a in products if a['category']==x['category'] and a['id']!=x['id']][:4]
    detail=f'''<main id="main" class="detail-page wrap"><nav class="breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><a href="/#catalog">المنتجات</a><span>/</span><span>{x['name']}</span></nav><div class="detail-grid"><div class="detail-gallery"><div class="detail-stage">{image_tag(x['photos'][0],x['name'],False,False,'detail-image')}<button class="zoom-btn" data-zoom>{icon('zoom')}تكبير الصورة</button></div><div class="thumbnails" aria-label="صور {x['name']}">{thumbs}</div></div><div class="detail-copy"><div class="eyebrow">{x['category']}</div><h1>{x['name']}</h1><p class="description">{x['description']}</p><dl class="specs">'''+''.join(f'<div><dt>{label}</dt><dd>{esc(v)}</dd></div>' for label,v in specs)+f'''</dl><div class="detail-actions">{ext(x['inquiry_url'],'اسأل عن هذا المنتج','btn whatsapp','whatsapp')}<button class="btn outline" data-copy-url="{x['url']}">{icon('copy')}نسخ الرابط</button></div><p class="detail-note">الصورة من المواد التي أرسلها المالك. يؤكّد المركز تفاصيل الإصدار والتوفر قبل الطلب.</p></div></div><div class="related"><h2>قد تجد اختيارك هنا أيضًا.</h2><div class="grid">{''.join(card(a) for a in others)}</div></div></main>'''
    product_schema={'@context':'https://schema.org','@type':'Product','@id':x['url']+'#product','name':x['name'],'description':x['description'],'category':x['category'],'image':x['images'],'url':x['url']}
    if x.get('brand'):product_schema['brand']={'@type':'Brand','name':x['brand']}
    if x.get('size'):product_schema['size']=x['size']
    breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'الرئيسية','item':base},{'@type':'ListItem','position':2,'name':'المنتجات','item':base+'/#catalog'},{'@type':'ListItem','position':3,'name':x['name'],'item':x['url']}]}
    (folder/'index.html').write_text(page(x['name']+' | مركز أبو مصطفى في إب',x['intro']+' '+x['description'],detail,'/products/'+x['id']+'/',[product_schema,breadcrumbs]))
# Keep the previous review's product URLs valid, clearly separated from the pictured catalog.
legacy=json.loads((root/'content/legacy-products.json').read_text())
for x in legacy:
    folder=p/'products'/x['id'];folder.mkdir(parents=True,exist_ok=True)
    msg=WA+'?text='+urllib.parse.quote('السلام عليكم، أود الاستفسار عن '+x['name']+' المذكور في منشور سابق. هل يتوفر حاليًا؟')
    detail=f'''<main id="main" class="wrap detail-page"><nav class="breadcrumb" aria-label="مسار الصفحة"><a href="/">الرئيسية</a> / <a href="/#catalog">الكتالوج المصوّر</a></nav><div class="detail-grid"><div class="legacy-art"><img src="/assets/logo.webp" alt="شعار المركز؛ ليست صورة للمنتج" width="300" height="300"></div><div class="detail-copy"><div class="eyebrow">من أرشيف منشورات المركز</div><h1>{x['name']}</h1><p class="description">{x['description']}</p><p class="detail-note">هذا سجل من البحث السابق. لم تُطابق له صورة من الصور الجديدة؛ شعار المركز هنا للتعريف فقط. اسأل عن الإصدار والتوفر الحالي.</p><div class="detail-actions" style="margin-top:24px">{ext(msg,'استفسر على واتساب','btn whatsapp','whatsapp')}{ext(x['source_url'],'المنشور الأصلي','btn outline','external')}</div></div></div></main>'''
    (folder/'index.html').write_text(page(x['name']+' — من الأرشيف | أبو مصطفى',x['description'],detail,'/products/'+x['id']+'/'))
for f in (root/'web').glob('*'):shutil.copy2(f,p/f.name)
(p/'assets/favicon.svg').unlink(missing_ok=True)
(p/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
# The Worker controls privacy/indexing for every response, including assets.
# A blanket static noindex here would conflict with approved public image indexing.
(p/'_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/fonts/*\n  Cache-Control: public, max-age=86400\n/assets/photos/*\n  Cache-Control: public, max-age=86400\n')
import re
# Shared presentation is generated once; the Worker renders live records into it.
home_template=body.replace(faq_html,'{{FAQ_ITEMS}}').replace('{{REVIEWS}}','{{POSTS}}{{REVIEWS}}')
home_template=re.sub(r'(<div class="grid" id="products">).*?(</div>\s*<div class="empty")',r'\1{{PRODUCT_CARDS}}\2',home_template,flags=re.S)
home_template=re.sub(r'(<div class="filter-row"[^>]*>).*?(</div></div>\s*<div class="results-line")',r'\1{{FILTERS}}\2',home_template,flags=re.S)
home_template=re.sub(r'(<span id="count" role="status">).*?(</span>)',r'\1{{COUNT}}\2',home_template)
home_template=re.sub(r'<div class="collection-line">.*?(?=<section class="catalog wrap")','{{COLLECTION_LINKS}}',home_template,flags=re.S)
home_template=re.sub(r'<div class="hero-visual">.*?(?=</div></section>{{COLLECTION_LINKS}})','{{HERO_VISUAL}}',home_template,flags=re.S)
home_template=re.sub(r'<div class="contact-panel contact-directory".*?(?=\n  </div>\n\n  <div class="social-showcase")','{{CONTACT_DIRECTORY}}',home_template,flags=re.S)
home_template=re.sub(r'(<div class="hero-stage"[^>]*>).*?(?=</div>\s*<div class="carousel-hint")',r'\1{{PROMO_CARDS}}',home_template,flags=re.S)
(root/'content/site-shell.json').write_text(json.dumps(dict(base=base,name=STORE_NAME,header=header,footer=footer,dialogs=dialogs(),home=home_template,storeSchema=store_schema,faq=faq_schema,icons={k:icon(k) for k in paths},assetVersion=asset_ver,socialAccounts=[dict(id=k,name=n,url=u,summary=d) for k,n,u,d in social_data]),ensure_ascii=False))
print(f'Built {len(products)} pictured products, {len(legacy)} preserved archive URLs, {len(manifest)} audited photos.')

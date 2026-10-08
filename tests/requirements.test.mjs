import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime } from '../scripts/local-runtime.cjs';

const state=await mkdtemp(join(tmpdir(),'abu-mustafa-requirements-'));
const headers={'oai-authenticated-user-id':'owner-contract','oai-authenticated-user-email':'owner@preview.test'};
let count=0;
const check=(value,label)=>{assert.ok(value,label);count++;console.log('PASS '+label);};
const fetchText=async(runtime,path,options={})=>{const response=await runtime.dispatchFetch('https://cloudflare-preview.example'+path,{headers:{...headers,...options.headers},...options});return {response,text:await response.text()};};

const style=await readFile('dist/client/style.css','utf8');
const app=await readFile('dist/client/app.js','utf8');
const adminJs=await readFile('dist/client/admin.js','utf8');
const runtime=await createRuntime({stateDirectory:state});
try{
  const {response:homeResponse,text:home}=await fetchText(runtime,'/');
  const address='اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا';
  check(homeResponse.status===200,'storefront responds');
  check(home.includes(address),'full agreed address appears');
  check(home.includes('مركز أبو مصطفى التجاري')&&home.includes('للعود والعطور ومستلزمات التجميل')&&home.includes('ومستلزمات الأخضرين والزباد والبخور'),'complete brand wording appears in three lines');
  check(home.indexOf('location-strip')<home.indexOf('brand-strip')&&home.indexOf('brand-strip')<home.indexOf('identity-header'),'address, brand and social strips use the agreed order');
  check(!home.includes('header-cta'),'WhatsApp is removed from the sticky brand strip');
  check(home.includes('class="wa-floating"')&&home.includes('<small>تواصل معنا</small>'),'labeled floating WhatsApp is present');
  check((home.match(/\/assets\/storefront.webp/g)||[]).length>=2,'street storefront appears in carousel and contact area');
  check(home.includes('data-mobile-carousel')&&home.includes('تتحرك البطاقات تلقائيًا'),'carousel and swipe cue appear');
  check(['instagram.com','facebook.com','tiktok.com','youtube.com','t.me/abumustafacenter99','x.com','mailto:','share.google','poplme.co'].every(link=>home.includes(link)),'all agreed social, map, email and digital-card links appear');
  check(['04 427600','770 525 525','716 525 525','04 418100','778 525 525','714 525 525','777 550 035'].every(number=>home.includes(number)),'all seven contact numbers appear');
  check(home.includes('الزباد والبخور والأخضرين')&&home.includes('التجميل والعطور')&&home.includes('مكتب إدارة المركز'),'phone numbers are grouped by department');
  check(home.includes('تعلّم أسرار العطور مجانًا')&&home.includes('آراء عملائنا')&&home.includes('إجابات سريعة'),'learning, reviews and FAQ sections appear');
  check(home.includes('العودة إلى الرئيسية')&&home.includes('href="/#news"')&&home.includes('href="/#faq"')&&home.includes('id="news"')&&home.includes('id="faq"'),'visitor drawer shortcuts point to stable home, posts and FAQ sections');
  check(home.includes('id="public-review-form"')&&home.includes('رقم الهاتف للتحقق')&&home.includes('إرسال التقييم للمراجعة'),'public moderated review form appears');
  check(home.includes('ابراهيم العواضي')&&home.includes('+967 771 804 045'),'developer credit appears');
  check(!home.includes('تقرير المراجعة'),'internal QA report is not linked for visitors');
  check(home.includes('application/ld+json')&&home.includes('FAQPage')&&home.includes('ItemList'),'store, products and FAQ structured data render');
  check(homeResponse.headers.get('x-robots-tag')?.includes('noindex'),'private release keeps HTML out of indexing');
  check(style.includes('.site-header{position:sticky')&&style.includes('.brand-strip{'), 'sticky luxury header styling ships');
  check(style.includes('scroll-snap-type:x mandatory')&&style.includes('flex:0 0 80vw'), 'adjacent swipe cards with side peeks ship for phones');
  check(style.includes('calc((100% - 36px)/3)'),'three adjacent carousel cards ship for desktop');
  check(style.includes('@keyframes waPulse')&&style.includes('left:15px'),'floating WhatsApp pulse and left placement ship');
  check(style.includes('.product-card.is-featured')&&style.includes('.product-card{background:linear-gradient(155deg,#242123,#121214)'),'featured charcoal/gold product presentation ships');
  check(app.includes('5200')&&app.includes("'pointerdown','touchstart','wheel'")&&app.includes('clearInterval(timer)'),'carousel auto timing and manual-stop behavior ship');
  check(app.includes('normalize')&&app.includes('dataset.category'),'Arabic search and filters ship');

  const {text:admin}=await fetchText(runtime,'/admin/');
  check(['المنتجات','الأقسام','آراء العملاء','فريق التحرير','الأسئلة الشائعة','المنشورات','المحذوفات','سجل التغييرات','الظهور في البحث'].every(label=>admin.includes(label)),'all agreed management workspaces appear');
  check(admin.includes('منتج مميز')&&admin.includes('طابع البطاقة')&&admin.includes('لون الإطار المخصص'),'featured-product and card-style controls appear');
  check(admin.includes('نحفظ كلام العميل وتقييمه كما وردا'),'review-integrity rule is visible to moderators');
  check(admin.includes('المشرف يدير الأقسام والنشر والتنسيق')&&admin.includes('المحرر يرفع الصور ويكتب الأوصاف'),'role boundaries are explained');
  check(adminJs.includes("['customer_name','rating','quote','source_label']")&&adminJs.includes('disabled=!!activeReview'),'saved customer words cannot be edited in the UI');
  check(adminJs.includes("catalog.access.role==='editor'")&&adminJs.includes('status.disabled'),'editor-specific restrictions ship in the UI');

  const catalogResult=await fetchText(runtime,'/catalog.json');
  const catalog=JSON.parse(catalogResult.text);
  const seoIdentity=JSON.parse(await readFile('content/seo.json','utf8'));
  check(catalog.name===seoIdentity.businessName&&catalog.site_name===seoIdentity.siteName&&catalog.address===address&&catalog.products.length===35,'machine-readable catalog includes the approved SEO identity, address and all products');
  check(Array.isArray(catalog.faqs)&&catalog.faqs.length>=12,'managed FAQ data is machine-readable');
  const robots=await fetchText(runtime,'/robots.txt');
  check(robots.text.includes('Disallow: /'),'private robots policy remains closed');
  const report=await fetchText(runtime,'/report.html');
  check(report.response.status===404,'visitor-facing report route is removed');
  console.log(`Completed ${count} agreement checks.`);
} finally {
  await runtime.dispose();
  await rm(state,{recursive:true,force:true});
}

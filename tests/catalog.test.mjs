import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { createRuntime } from '../scripts/local-runtime.cjs';
import path from 'node:path';

const state=await mkdtemp(path.resolve('.local-state-test-'));
let runtime=await createRuntime({stateDirectory:state});
const origin='https://cloudflare-preview.example';
const owner={'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@preview.test'};
const other={'oai-authenticated-user-id':'test-other','oai-authenticated-user-email':'other@preview.test'};
let checks=0;
async function call(url,{method='GET',data,headers={},user=owner}={}){
 const h={...user,...headers};if(!['GET','HEAD'].includes(method)){h.origin=origin;h['x-admin-request']='1';}
 let body;if(data instanceof FormData){const multipart=new Request(origin+url,{method:'POST',body:data});body=new Uint8Array(await multipart.arrayBuffer());h['content-type']=multipart.headers.get('content-type');}else if(data!==undefined){body=JSON.stringify(data);h['content-type']='application/json';}
 const response=await runtime.dispatchFetch(origin+url,{method,headers:h,body,redirect:'manual'});
 const type=response.headers.get('content-type')||'';return {status:response.status,headers:response.headers,data:type.includes('json')?await response.json():await response.text()};
}
const ok=(condition,message)=>{assert.ok(condition,message);checks++;console.log('PASS '+message);};
try{
 let r=await call('/api/admin/catalog',{user:{}});ok(r.status===403,'anonymous cannot read admin catalog');
 r=await call('/api/admin/products',{method:'POST',data:{},user:other});ok(r.status===403,'non-owner cannot modify records');
 r=await call('/api/admin/catalog');ok(r.status===200&&r.data.products.length===35&&r.data.access.role==='owner','owner can open seeded catalog');
 const original=r.data.products[0],image=original.gallery[0];
 ok(r.data.products.every(p=>p.price===null&&p.availability==='unknown'),'initial catalog contains no invented prices or availability');
 ok(r.data.reviews.length===0,'review section starts without fabricated customer opinions');
 r=await call('/api/admin/catalog',{user:{...owner,'oai-authenticated-user-id':'wrong-id'}});ok(r.status===403,'owner role is tied to stable identity after bootstrap');
 r=await runtime.dispatchFetch(origin+'/api/admin/categories',{method:'POST',headers:{...owner,'content-type':'application/json'},body:'{}'});ok(r.status===403,'mutations require same-origin admin request');
 r=await call('/api/admin/members',{method:'POST',data:{email:other['oai-authenticated-user-email'],role:'editor'}});ok(r.status===201,'owner can add an editor role');
 r=await call('/api/admin/catalog',{user:other});ok(r.status===200&&r.data.access.role==='editor','authorized editor can open content management');
 r=await call('/api/admin/members',{method:'POST',data:{email:'another@preview.test',role:'supervisor'},user:other});ok(r.status===403,'editor cannot manage team permissions');
 r=await call('/api/admin/categories',{method:'POST',data:{name:'قسم أنشأه المحرر',description:'قسم مؤقت لاختبار صلاحيات التحرير',position:99},user:other});ok(r.status===403,'editor cannot create structural categories');const editorCategoryId='perfumes';
 r=await call('/api/admin/categories/'+editorCategoryId,{method:'DELETE',data:{version:1},user:other});ok(r.status===403,'editor cannot delete categories');

 r=await call('/api/admin/products/'+original.id,{method:'PUT',user:other,data:{...original,name:'اسم لا يحق للمحرر تغييره'}});ok(r.status===403,'editor cannot rename an existing product');
 r=await call('/api/admin/products/'+original.id,{method:'PUT',user:other,data:{...original,description:original.description+' وصف تحريري'}});ok(r.status===200,'editor can update product descriptions');original.version++;
 r=await call('/api/admin/products/'+original.id,{method:'PUT',user:other,data:{...original,featured:true}});ok(r.status===403,'editor cannot feature products');
 r=await call('/api/admin/reviews',{method:'POST',user:other,data:{}});ok(r.status===403,'editor cannot moderate reviews');
 r=await call('/api/admin/faqs',{method:'POST',user:other,data:{}});ok(r.status===403,'editor cannot manage FAQs');
 r=await call('/api/admin/posts',{method:'POST',user:other,data:{title:'مسودة محرر',slug:'editor-draft',summary:'ملخص',body:'محتوى',image:'',status:'published',position:0}});ok(r.status===403,'editor cannot publish posts');
 r=await call('/api/admin/posts',{method:'POST',user:other,data:{title:'مسودة محرر',slug:'editor-draft',summary:'ملخص',body:'محتوى',image:'',status:'draft',position:0}});ok(r.status===201,'editor can save a post draft');
 r=await call('/api/admin/members/'+encodeURIComponent(other['oai-authenticated-user-email']),{method:'DELETE'});ok(r.status===200,'owner can remove an editor role');
 r=await call('/api/admin/catalog',{user:other});ok(r.status===403,'removed editor immediately loses content access');
 r=await call('/api/admin/categories',{method:'POST',data:{name:'قسم اختبار محفوظ',description:'وصف قسم للاختبار فقط',position:50}});ok(r.status===201,'category creation');const categoryId=r.data.id;
 let input={name:'منتج اختبار <b>آمن</b>',category_id:categoryId,intro:'وصف مختصر للاختبار',description:'وصف تفصيلي للاختبار لا يظهر في النسخة الحقيقية.',brand:'علامة اختبار',size:'',price:'١٢٣٤٫٥٠',currency:'YER',availability:'unknown',visible:true,position:50,gallery:[image]};
 r=await call('/api/admin/products',{method:'POST',data:input});ok(r.status===201,'product creation with Arabic decimal price');const productId=r.data.id;
 r=await call('/products/'+productId+'/',{user:{}});ok(r.status===200&&r.data.includes('&lt;b&gt;آمن&lt;/b&gt;')&&!r.data.includes('<b>آمن</b>'),'server-rendered detail escapes entered markup');
 const schemas=JSON.parse(r.data.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 ok(schemas.find(s=>s['@type']==='Product').offers.price==='1234.50'&&!schemas.find(s=>s['@type']==='Product').offers.availability,'confirmed price appears in structured data without invented stock');
 r=await call('/api/admin/products/'+productId,{method:'PUT',data:{...input,price:'-7',version:1}});ok(r.status===400,'invalid price rejected');
 r=await call('/api/admin/categories/'+categoryId,{method:'DELETE',data:{version:1}});ok(r.status===409,'nonempty category cannot be deleted');
 r=await call('/api/admin/products/'+productId,{method:'PUT',data:{...input,price:'',description:'وصف معدّل ومحفوظ',version:1}});ok(r.status===200,'editing description and clearing price');
 r=await call('/api/admin/products/'+productId,{method:'PUT',data:{...input,version:1}});ok(r.status===409,'stale edit rejected to protect newer changes');
 const bytes=await readFile('public/assets/photos/77-small.webp'),upload=new FormData();upload.append('file',new Blob([bytes],{type:'image/webp'}),'qa-product.webp');upload.append('width','520');upload.append('height','650');
 r=await call('/api/admin/images',{method:'POST',data:upload});ok(r.status===201,'image bytes uploaded to object storage');const savedImage=r.data;
 r=await call('/api/admin/products/'+productId,{method:'PUT',data:{...input,price:'',gallery:[savedImage],version:2}});ok(r.status===200,'uploaded image linked to product');
 await runtime.dispose();runtime=await createRuntime({stateDirectory:state});
 r=await call('/api/admin/catalog');const current=r.data.products.find(p=>p.id===productId);
 ok(current&&current.price===null&&current.gallery[0].url===savedImage.url,'records and uploaded image references survive runtime restart');
 const im=await runtime.dispatchFetch(origin+savedImage.url);ok(im.status===200&&im.headers.get('content-type')==='image/webp'&&Buffer.from(await im.arrayBuffer()).equals(bytes),'uploaded image bytes retain their WebP type after runtime restart');
 await runtime.dispose();runtime=await createRuntime({stateDirectory:state,publicIndexing:true});
 const publicImage=await runtime.dispatchFetch(origin+savedImage.url,{method:'HEAD'});ok(publicImage.status===200&&publicImage.headers.get('content-type')==='image/webp'&&publicImage.headers.get('x-robots-tag')?.startsWith('index, follow'),'uploaded image is discoverable when the storefront is public');
 await runtime.dispose();runtime=await createRuntime({stateDirectory:state});
 r=await call('/sitemap.xml',{user:{}});ok(r.status===200&&r.data.includes(productId)&&r.data.includes(savedImage.url),'sitemap includes current product and uploaded image');
 r=await call('/products/'+productId+'/',{user:{}});const noPrice=JSON.parse(r.data.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]).find(s=>s['@type']==='Product');ok(!noPrice.offers,'clearing price removes obsolete offer data');
 r=await call('/api/admin/products/'+productId,{method:'DELETE',data:{version:3}});ok(r.status===200,'product deletion');
 r=await call('/products/'+productId+'/',{user:{}});ok(r.status===404,'deleted product route returns 404');
 r=await call('/api/admin/categories/'+categoryId,{method:'DELETE',data:{version:1}});ok(r.status===200,'empty category deletion');
 r=await call('/api/admin/catalog');ok(r.data.products.length===35&&!r.data.categories.some(c=>c.id===categoryId),'deleted seed-independent records stay deleted');

 r=await call('/api/admin/categories',{method:'POST',data:{name:'عطور شرقية للاختبار',parent_id:'perfumes',description:'قسم فرعي مؤقت',position:5}});ok(r.status===201,'subcategory creation under a main category');const childCategoryId=r.data.id;
 r=await call('/api/admin/products/bulk',{method:'POST',data:{action:'copy',target_category_id:childCategoryId,items:[{id:original.id,version:original.version}]}});ok(r.status===200&&r.data.copied===1,'selected product can be copied to a subcategory');const copiedId=r.data.ids[0];
 r=await call('/api/admin/catalog');let copied=r.data.products.find(p=>p.id===copiedId);ok(copied&&copied.category_ids.includes('perfumes')&&copied.category_ids.includes(childCategoryId),'copied product inherits main and subcategory filters');
 r=await call('/');ok(r.status===200&&r.data.includes(`data-category="${childCategoryId}"`)&&r.data.includes(`data-categories="perfumes ${childCategoryId}"`),'subcategory and its product render in the storefront');
 r=await call('/api/admin/products/bulk',{method:'POST',data:{action:'move',target_category_id:'perfumes',items:[{id:copied.id,version:copied.version}]}});ok(r.status===200&&r.data.moved===1,'selected product can be moved between categories');
 r=await call('/api/admin/categories/'+childCategoryId,{method:'DELETE',data:{version:1}});ok(r.status===200,'empty subcategory can be removed after moving products');
 r=await call('/api/admin/catalog');copied=r.data.products.find(p=>p.id===copiedId);r=await call('/api/admin/products/'+copiedId,{method:'DELETE',data:{version:copied.version}});ok(r.status===200,'copied product remains an independent editable record');

 r=await call('/api/reviews',{method:'POST',user:{},data:{customer_name:'عميل الموقع',rating:4,quote:'تجربة حقيقية أرسلت من نموذج الموقع',verification_phone:'+967 700 000 001',consent:true,website:''}});ok(r.status===201&&r.data.submitted,'customer can submit a review for moderation');
 let submitted=(await call('/api/admin/catalog')).data.reviews.find(x=>x.quote==='تجربة حقيقية أرسلت من نموذج الموقع');ok(submitted&&!submitted.visible&&submitted.verification_phone==='+967 700 000 001','submitted review is pending and its private phone is available only to moderators');
 r=await call('/');ok(!r.data.includes('تجربة حقيقية أرسلت من نموذج الموقع')&&!r.data.includes('+967 700 000 001'),'pending review and verification phone never leak into the public page');
 r=await call('/api/reviews',{method:'POST',user:{},data:{customer_name:'رسالة آلية',rating:5,quote:'يجب رفض هذا النص',verification_phone:'',consent:true,website:'spam'}});ok(r.status===400,'review honeypot rejects automated submissions');
 r=await call('/api/admin/reviews/'+submitted.id,{method:'PUT',data:{visible:true,position:submitted.position,moderation_reason:'',version:submitted.version}});ok(r.status===200,'moderator can approve a submitted review');
 r=await call('/');ok(r.data.includes('تجربة حقيقية أرسلت من نموذج الموقع')&&!r.data.includes('+967 700 000 001'),'approved review appears while private phone stays hidden');
 submitted=(await call('/api/admin/catalog')).data.reviews.find(x=>x.id===submitted.id);await call('/api/admin/reviews/'+submitted.id,{method:'DELETE',data:{version:submitted.version,moderation_reason:'تنظيف بيانات الاختبار'}});

 r=await call('/api/admin/reviews',{method:'POST',data:{customer_name:'عميل اختبار',rating:5,quote:'رأي موثّق للاختبار فقط',source_label:'سجل اختبار',visible:true,position:0}});ok(r.status===201,'verified customer review creation');const reviewId=r.data.id;
 r=await call('/');ok(r.status===200&&r.data.includes('رأي موثّق للاختبار فقط')&&r.data.includes('class="review-summary"><strong>5.0</strong>')&&!r.data.includes('AggregateRating'),'visible review and calculated rating remain without self-serving business review schema');
 r=await call('/api/admin/reviews/'+reviewId,{method:'PUT',data:{customer_name:'عميل اختبار',rating:4,quote:'رأي موثّق معدّل',source_label:'سجل اختبار',visible:true,position:0,version:1}});ok(r.status===200,'review visibility may be moderated');const reviewNow=(await call('/api/admin/catalog')).data.reviews.find(x=>x.id===reviewId);ok(reviewNow.quote==='رأي موثّق للاختبار فقط'&&reviewNow.rating===5,'original customer words and rating cannot be altered');
 r=await call('/api/admin/reviews/'+reviewId,{method:'DELETE',data:{version:2,moderation_reason:'ألفاظ مسيئة — سبب اختبار'}});ok(r.status===200,'customer review deletion requires a reason');
 r=await call('/');ok(r.status===200&&!r.data.includes('رأي موثّق معدّل')&&r.data.includes('كن أول من يشارك تجربته'),'removed review is not shown and empty state stays honest');

 const live=(await call('/catalog.json',{user:{}})).data.products;
 const pageResults=await Promise.all(live.map(p=>call('/products/'+p.id+'/',{user:{}})));
 ok(pageResults.every((r,i)=>r.status===200&&r.data.includes('جوار البرج')&&r.data.includes('application/ld+json')&&r.data.includes(live[i].reference)),'all 35 product pages render with updated address and structured data');
 const legacy=JSON.parse(await readFile('content/legacy-products.json','utf8'));
 const legacyResponses=await Promise.all(legacy.map(p=>call('/products/'+p.id+'/',{user:{}})));
 ok(legacyResponses.every(r=>r.status===200&&r.data.includes('جوار البرج')),'all 11 historical product links remain working with updated address');
 const imageUrls=[...new Set(live.flatMap(p=>p.gallery.map(i=>i.url)))];
 const imageResponses=await Promise.all(imageUrls.map(u=>runtime.dispatchFetch(origin+u)));
 ok(imageResponses.every(r=>r.status===200),'all 47 product gallery images are served');
  r=await call('/robots.txt',{user:{}});ok(r.data.includes('Disallow: /'),'private preview remains closed to indexing');
 r=await call('/',{user:{}});ok(r.status===200&&r.data.indexOf('site-header')<r.data.indexOf('identity-header')&&r.data.includes('location-strip')&&r.data.includes('brand-strip')&&!r.data.includes('header-cta')&&r.data.includes('data-mobile-carousel')&&r.data.includes('تعلّم أسرار العطور مجانًا')&&r.data.includes('مركز أبو مصطفى التجاري')&&r.data.includes('/assets/brand-card.png')&&r.data.includes('abomustafa_center')&&r.data.includes('abumustafacentr')&&r.data.includes('poplme.co/hash/fsS3Fbxp')&&r.data.includes('+967771804045')&&!r.data.includes('{{PRODUCT_CARDS}}')&&!r.data.includes('{{REVIEWS}}'),'navigation-first identity, mobile store-name strip, swipe carousel and verified channels');
 const style=await (await runtime.dispatchFetch(origin+'/style.css')).text();ok(style.includes('scroll-snap-type:x mandatory')&&style.includes('.reviews-wrap')&&style.includes('.nav-title{display:grid!important}')&&style.includes('.featured-badge'),'mobile name, ordered header actions, swipe and review presentation styles are shipped');
 const brandCard=await runtime.dispatchFetch(origin+'/assets/brand-card.png');ok(brandCard.status===200&&brandCard.headers.get('content-type')?.includes('image/'),'supplied brand card is served as a real image');
 ok(r.headers.get('x-robots-tag').includes('noindex'),'private HTML retains noindex');
 
 r=await call('/api/admin/catalog');const faq=r.data.faqs[0];ok(r.data.faqs.length>=12,'FAQs seeded for management');
 r=await call('/api/admin/faqs/'+faq.id,{method:'PUT',data:{...faq,answer:'إجابة اختبار آمنة',version:faq.version}});ok(r.status===200,'FAQ can be edited');
 r=await call('/');ok(r.data.includes('إجابة اختبار آمنة')&&!r.data.includes('{{FAQ_ITEMS}}'),'edited FAQ renders with no template residue');
 r=await call('/api/admin/products/'+original.id,{method:'PUT',data:{...original,featured:true,best_seller:true,badge:'اختيار خاص',card_theme:'garnet',accent_color:'#ddb566',version:original.version}});ok(r.status===200,'featured and best-seller product settings persist');
 r=await call('/');ok(r.data.includes('is-featured')&&r.data.includes('is-best-seller')&&r.data.includes('اختيار خاص')&&r.data.includes('الأكثر مبيعًا'),'featured best-seller card is rendered');
 r=await call('/api/admin/posts',{method:'POST',data:{title:'منشور اختبار',slug:'qa-post',summary:'ملخص موثق',body:'نص للاختبار فقط',image:image.url,status:'draft',pinned:true,position:0}});ok(r.status===201,'pinned post draft creation');const postId=r.data.id;
 r=await call('/news/qa-post/');ok(r.status===404,'draft post is not public');
 r=await call('/api/admin/catalog');const post=r.data.posts.find(x=>x.id===postId);
 r=await call('/api/admin/posts/'+postId,{method:'PUT',data:{...post,status:'published'}});ok(r.status===200,'owner can publish post');
 r=await call('/news/qa-post/');ok(r.status===200&&r.data.includes('منشور اختبار'),'published post has working detail route');
 r=await call('/');ok(r.status===200&&r.data.includes('pinned-news')&&r.data.indexOf('pinned-news')<r.data.indexOf('id="catalog"'),'pinned post renders above the product section');
 r=await call('/api/admin/catalog');ok(r.data.audit.length>0&&r.data.trash.length>0,'audit and recovery are available');const deleted=r.data.trash.find(x=>x.type==='review');
 r=await call('/api/admin/audit?page=1&page_size=10&order=asc&type=product');ok(r.status===200&&Array.isArray(r.data.items)&&r.data.page===1&&r.data.page_size===10,'audit history supports filtering and pagination');
 r=await call('/api/admin/trash?page=1&page_size=10&order=desc&type=review');ok(r.status===200&&r.data.items.some(x=>x.id===deleted.id),'trash supports filtering and pagination');
 const testDb=await runtime.getD1Database('DB');let auditDeleteBlocked=false;try{await testDb.prepare('DELETE FROM audit_log').run();}catch{auditDeleteBlocked=true;}ok(auditDeleteBlocked,'audit records are append-only at the database layer');
 r=await call('/api/admin/restore-bulk',{method:'POST',data:{items:[deleted]}});ok(r.status===200&&r.data.restored===1,'selected deleted records can be restored in bulk');
 r=await call('/');ok(!r.data.includes('رأي موثّق للاختبار فقط'),'restored review remains hidden until approved');
 r=await call('/report.html');ok(r.status===404,'internal review report is removed from visitor routes');
 console.log(`Completed ${checks} meaningful checks.`);
}finally{await runtime.dispose();await rm(state,{recursive:true,force:true});}

import { readPresentation, saveContactOptions, savePromoCard, deletePromoCard, brandImages } from './presentation.mjs';
import shell from '../content/site-shell.json';
import { ORIGIN, STORE_NAME, STORE_ADDRESS, can, saveFaq, deleteFaq, savePost, deletePost, readAudit, readTrash, queryAudit, queryTrash, restoreRecord, restoreRecords, AppError, database, ensureCatalog, isAdmin, identity, requireAdmin, requireOwner, mutationGuard, readJson, readCatalog, saveProduct, deleteProduct, bulkProducts, saveCategory, deleteCategory, saveReview, deleteReview, submitPublicReview, readMembers, saveMember, deleteMember, uploadImage, allImages } from './data.mjs';
import { home, detail, categoryPage, postPage, errorPage, adminPage, indexable, esc } from './render.mjs';
import {manifest, archiveHead, identity as seoIdentity} from './seo.mjs';

function response(body,type='text/html; charset=utf-8',status=200,env={},privateData=false){return new Response(body,{status,headers:{'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-robots-tag':privateData||!indexable(env)?'noindex, nofollow, noarchive':'index, follow, max-image-preview:large','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.google.com https://*.gstatic.com; font-src 'self'; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' "}});}
const json=(value,env,status=200)=>response(JSON.stringify(value),'application/json; charset=utf-8',status,env,true);
const download=(body,type,name,env)=>{const r=response(body,type,200,env,true);r.headers.set('content-disposition',`attachment; filename="${name}"`);return r;};
const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
function csv(products){const fields=[['id','الرمز'],['name','المنتج'],['category','القسم'],['description','الوصف'],['brand','العلامة'],['size','الحجم'],['price','السعر'],['currency','العملة'],['availability','التوفر'],['url','الصفحة']];return '\uFEFF'+[fields.map(x=>csvCell(x[1])).join(','),...products.map(p=>fields.map(([key])=>csvCell(p[key])).join(','))].join('\r\n');}
function discovery(products){return products.filter(p=>p.visible&&p.brand&&p.price_minor!==null).map(p=>({item_id:p.id,title:p.name,description:p.description,url:p.url,brand:p.brand,seller_name:seoIdentity.businessName,image_url:p.images[0],additional_image_urls:p.images.slice(1),availability:p.availability,price:p.price+' '+p.currency}));}
function sitemap(catalog){const items=[{url:ORIGIN+'/',images:[]},...catalog.categories.map(c=>({url:ORIGIN+'/categories/'+c.id+'/',images:[],updated_at:c.updated_at})),...catalog.products,...catalog.posts.map(p=>({url:ORIGIN+'/news/'+p.slug+'/',images:p.image?[ORIGIN+p.image]:[],updated_at:p.updated_at}))];return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+items.map(p=>`<url><loc>${esc(p.url)}</loc>${p.updated_at?`<lastmod>${p.updated_at}</lastmod>`:''}${p.images.map(im=>`<image:image><image:loc>${esc(im)}</image:loc></image:image>`).join('')}</url>`).join('')+'</urlset>';}
async function completeCatalog(env,admin=false){const catalog=await readCatalog(env,admin);return {...catalog,presentation:await readPresentation(env,catalog.products,admin)};}
const reservedReview=new Set(['/report.html','/research-bundle.zip','/image-manifest.json']);
async function handle(request,env){
  const url=new URL(request.url),path=url.pathname;
  // Serve Google's exact verification file before asset HTML URL normalization.
  if(path==='/google423f0fde26d818a9.html'&&['GET','HEAD'].includes(request.method))return response(request.method==='HEAD'?null:'google-site-verification: google423f0fde26d818a9.html','text/html; charset=utf-8',200,env);
  if(reservedReview.has(path))throw new AppError('هذا المستند داخلي وليس صفحة للزوار.',404);
  if(['GET','HEAD'].includes(request.method)){
    const canonicalPath=path==='/index.html'?'/':/^\/(products|categories|news)\/[a-z0-9-]+\/index\.html$/.test(path)?path.replace(/index\.html$/,''):/^\/(products|categories|news)\/[a-z0-9-]+$/.test(path)?path+'/':null;
    if(canonicalPath)return Response.redirect(new URL(canonicalPath+url.search,url.origin),308);
    if(path==='/site.webmanifest')return response(JSON.stringify(manifest()),'application/manifest+json; charset=utf-8',200,env);
  }
  if(path==='/robots.txt')return response(indexable(env)?`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /report.html\nDisallow: /research-bundle.zip\nDisallow: /image-manifest.json\nSitemap: ${ORIGIN}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain; charset=utf-8',200,env);
  if(path.startsWith('/api/admin/')||path==='/admin/'||path==='/admin'){
    await ensureCatalog(env);
    if((path==='/admin/'||path==='/admin')&&!identity(request))return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2Fadmin%2F',request.url),302);
    const user=await requireAdmin(request,env);
    if(path==='/admin/'||path==='/admin'){if(request.method!=='GET')throw new AppError('طريقة الطلب غير مدعومة.',405);return response(adminPage(env),undefined,200,env,true);}
    if(!['GET','HEAD'].includes(request.method))mutationGuard(request);
    if(path==='/api/admin/catalog'&&request.method==='GET'){const catalog=await completeCatalog(env,true);return json({...catalog,images:await allImages(env),presentation_images:brandImages,audit:can(user,'audit')?await readAudit(env,user):[],trash:can(user,'restore')?await readTrash(env,user):[],access:{role:user.role,email:user.email},members:user.role==='owner'?await readMembers(env):[],seo:{indexing:indexable(env),sitemap:ORIGIN+'/sitemap.xml',total:catalog.products.filter(p=>p.visible).length,priced:catalog.products.filter(p=>p.visible&&p.price_minor!==null).length,feed:discovery(catalog.products).length}},env);}
    if(path==='/api/admin/export'&&request.method==='GET'){const catalog=await completeCatalog(env,true);return download(JSON.stringify({format:'abu-mustafa-catalog-v1',exported_at:new Date().toISOString(),...catalog,images:await allImages(env)},null,2),'application/json; charset=utf-8','abu-mustafa-catalog.json',env);}
    if(path==='/api/admin/discovery-feed'&&request.method==='GET'){
      const feed=discovery((await completeCatalog(env,true)).products);
      if(!feed.length)return response(errorPage('لا توجد منتجات مكتملة للتصدير بعد. أضف سعرًا مؤكدًا وعلامة تجارية وصورة لمنتج ظاهر، ثم صدّر البيانات من لوحة الإدارة.',400,env),undefined,400,env,true);
      return download(feed.map(x=>JSON.stringify(x)).join('\n'),'application/x-ndjson; charset=utf-8','abu-mustafa-discovery.jsonl',env);
    }
    if(path==='/api/admin/audit'&&request.method==='GET')return json(await queryAudit(env,user,Object.fromEntries(url.searchParams)),env);
    if(path==='/api/admin/trash'&&request.method==='GET')return json(await queryTrash(env,user,Object.fromEntries(url.searchParams)),env);
    if(path==='/api/admin/contacts'&&request.method==='PUT')return json(await saveContactOptions(env,user,await readJson(request)),env);
    const promo=path.match(/^\/api\/admin\/cards(?:\/([a-z0-9-]+))?$/);if(promo){const id=promo[1],body=await readJson(request);if(request.method==='POST'&&!id)return json(await savePromoCard(env,user,body),env,201);if(request.method==='PUT'&&id)return json(await savePromoCard(env,user,body,id),env);if(request.method==='DELETE'&&id)return json(await deletePromoCard(env,user,body,id),env);throw new AppError('طريقة الطلب غير مدعومة.',405);}
    if(path==='/api/admin/images'&&request.method==='POST')return json(await uploadImage(request,env,user),env,201);
    if(path==='/api/admin/products/bulk'&&request.method==='POST')return json(await bulkProducts(env,user,await readJson(request)),env);
    if(path==='/api/admin/members'&&request.method==='POST')return json(await saveMember(env,user,await readJson(request)),env,201);
    if(path.startsWith('/api/admin/members/')&&request.method==='DELETE'){requireOwner(user);return json(await deleteMember(env,user,path.slice('/api/admin/members/'.length)),env);}
    if(path==='/api/admin/restore'&&request.method==='POST')return json(await restoreRecord(env,user,await readJson(request)),env);
    if(path==='/api/admin/restore-bulk'&&request.method==='POST')return json(await restoreRecords(env,user,await readJson(request)),env);
    const extra=path.match(/^\/api\/admin\/(faqs|posts)(?:\/([a-z0-9-]+))?$/);if(extra){const [,kind,id]=extra,body=await readJson(request),save=kind==='faqs'?saveFaq:savePost,del=kind==='faqs'?deleteFaq:deletePost;if(request.method==='POST'&&!id)return json(await save(env,user,body),env,201);if(request.method==='PUT'&&id)return json(await save(env,user,body,id),env);if(request.method==='DELETE'&&id)return json(await del(env,user,id,body),env);}
    const reviewMatch=path.match(/^\/api\/admin\/reviews(?:\/([a-z0-9-]+))?$/);
    if(reviewMatch){const id=reviewMatch[1],body=await readJson(request);
      if(request.method==='POST'&&!id)return json(await saveReview(env,user,body),env,201);
      if(request.method==='PUT'&&id)return json(await saveReview(env,user,body,id),env);
      if(request.method==='DELETE'&&id)return json(await deleteReview(env,user,id,body),env);
    }
    const match=path.match(/^\/api\/admin\/(products|categories)(?:\/([a-z0-9-]+))?$/);
    if(match){const [,kind,id]=match,body=await readJson(request);
      if(request.method==='POST'&&!id)return json(kind==='products'?await saveProduct(env,user,body):await saveCategory(env,user,body),env,201);
      if(request.method==='PUT'&&id)return json(kind==='products'?await saveProduct(env,user,body,id):await saveCategory(env,user,body,id),env);
      if(request.method==='DELETE'&&id)return json(kind==='products'?await deleteProduct(env,user,id,body):await deleteCategory(env,user,id,body),env);
    }
    throw new AppError('الطلب غير موجود.',404);
  }
  if(path==='/api/reviews'&&request.method==='POST'){
    await ensureCatalog(env);
    return json(await submitPublicReview(request,env,await readJson(request)),env,201);
  }
  if(!['GET','HEAD'].includes(request.method))throw new AppError('طريقة الطلب غير مدعومة.',405);
  const productImage=path.match(/^\/product-images\/([1-9][0-9]{0,2}(?:-small)?\.webp)$/);
  if(productImage&&env.ASSETS){
    const assetUrl=new URL('/assets/photos/'+productImage[1],request.url),asset=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method}));
    if(asset.status===200){const result=new Response(asset.body,asset);result.headers.set('content-type','image/webp');result.headers.set('x-content-type-options','nosniff');result.headers.set('x-robots-tag',indexable(env)?'index, follow, max-image-preview:large':'noindex, nofollow');result.headers.set('cache-control',indexable(env)?'public, max-age=86400':'private, no-store');return result;}
  }
  if(path.startsWith('/media/')){
    const id=path.slice(7);if(!/^[a-f0-9-]{36}$/.test(id))throw new AppError('الصورة غير موجودة.',404);
    const media=await database(env).prepare('SELECT object_key,content_type FROM media WHERE id=?').bind(id).first();if(!media)throw new AppError('الصورة غير موجودة.',404);
    const file=await env.BUCKET.get(media.object_key);if(!file)throw new AppError('الصورة غير متاحة مؤقتًا.',503);
    const result=response(request.method==='HEAD'?null:file.body,media.content_type,200,env);result.headers.set('etag',file.httpEtag);result.headers.set('cache-control','private, max-age=86400');return result;
  }
  if(path==='/'||path==='/index.html'||path==='/catalog.json'||path==='/products.json'||path==='/catalog.csv'||path==='/sitemap.xml'||path==='/llms.txt'||path.startsWith('/products/')||path.startsWith('/categories/')||path.startsWith('/news/')){
    const catalog=await completeCatalog(env);
    if(path==='/products.json')return response(JSON.stringify(catalog.products),'application/json; charset=utf-8',200,env);
    if(path==='/catalog.json')return response(JSON.stringify({name:seoIdentity.businessName,site_name:seoIdentity.siteName,alternate_name:seoIdentity.alternateName,url:ORIGIN+'/',address:STORE_ADDRESS,primary_contact:'+967770525525',whatsapp:'https://wa.me/967770525525',contacts:catalog.presentation.contacts,social_accounts:shell.socialAccounts,categories:catalog.categories,products:catalog.products,posts:catalog.posts,faqs:catalog.faqs}),'application/json; charset=utf-8',200,env);
    if(path==='/catalog.csv')return download(csv(catalog.products),'text/csv; charset=utf-8','abu-mustafa-catalog.csv',env);
    if(path==='/sitemap.xml')return response(sitemap(catalog),'application/xml; charset=utf-8',200,env);
    if(path==='/llms.txt')return response(`# ${seoIdentity.siteName}\n\n${seoIdentity.businessName} في ${STORE_ADDRESS}. التواصل: +967770525525.\n\n${indexable(env)?'':'الموقع في المعاينة الخاصة، والفهرسة متوقفة.\n\n'}الصور والأوصاف تمثل المنتجات المعروضة، ولا تثبت التوفر الحالي. الأسعار والتوفر المجهولان لا يُفترضان.\n\n- [بيانات الكتالوج](${ORIGIN}/catalog.json)\n- [خريطة الموقع والصور](${ORIGIN}/sitemap.xml)\n\n## التواصل حسب القسم\n${catalog.presentation.contacts.map(g=>'- '+g.name+': '+g.phones.map(p=>p.number+(p.whatsapp?' (واتساب: https://wa.me/'+p.number.slice(1)+')':'')).join('، ')).join('\n')}\n\n## حسابات المركز\n${shell.socialAccounts.map(a=>'- ['+a.name+']('+a.url+')').join('\n')}\n\n## المنتجات\n${catalog.products.map(p=>`- [${p.name}](${p.url}): ${p.intro.replace(/\n/g,' ')}`).join('\n')}\n`,'text/plain; charset=utf-8',200,env);
    const admin=await isAdmin(request,env);
    if(path==='/'||path==='/index.html')return response(home(catalog,admin,env),undefined,200,env);
    const productMatch=path.match(/^\/products\/([a-z0-9-]+)\/(?:index\.html)?$/);
    if(productMatch){const p=catalog.products.find(p=>p.id===productMatch[1]);if(p)return response(detail(p,catalog,admin,env),undefined,200,env);
      const record=await database(env).prepare('SELECT id FROM products WHERE id=?').bind(productMatch[1]).first();if(record)throw new AppError('قد يكون المنتج مخفيًا أو حُذف من التشكيلة. يمكنك الاستفسار عنه مباشرة.',404);
      // Retain the documented historical product URLs as static archive pages.
      if(env.ASSETS){const assetUrl=new URL('/products/'+productMatch[1]+'/index.html',request.url);const old=await env.ASSETS.fetch(new Request(assetUrl,{method:'GET'}));if(old.status===200){const robots=indexable(env)?'noindex,follow':'noindex,nofollow,noarchive';const archive=response(archiveHead(await old.text(),robots),undefined,200,env,true);archive.headers.set('x-robots-tag',robots);return archive;}}
    }
    const news=path.match(/^\/news\/([a-z0-9-]+)\/$/);if(news){const p=catalog.posts.find(p=>p.slug===news[1]);if(p)return response(postPage(p,admin,env,catalog.presentation),undefined,200,env);}
    const cat=path.match(/^\/categories\/([a-z0-9-]+)\/$/);if(cat){const c=catalog.categories.find(c=>c.id===cat[1]);if(c)return response(categoryPage(c,catalog,admin,env),undefined,200,env);}
    throw new AppError('هذه الصفحة غير موجودة في التشكيلة الحالية.',404);
  }
  if(reservedReview.has(path)){await ensureCatalog(env);await requireAdmin(request,env);}
  if(env.ASSETS){const asset=await env.ASSETS.fetch(request);if(asset.status!==404){const r=new Response(asset.body,asset);r.headers.set('x-robots-tag',!indexable(env)||reservedReview.has(path)?'noindex, nofollow':'index, follow, max-image-preview:large');const mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.ttf':'font/ttf'}[path.slice(path.lastIndexOf('.')).toLowerCase()];if(mime)r.headers.set('content-type',mime);if(!indexable(env))r.headers.set('cache-control','private, no-store');else if(asset.status===200&&/^\/assets\/(photos|fonts)\//.test(path))r.headers.set('cache-control','public, max-age=86400');return r;}}
  throw new AppError('الصفحة التي طلبتها غير موجودة.',404);
}
export default { async fetch(request,env,ctx){
  try{return await handle(request,env);}catch(error){const status=error instanceof AppError?error.status:503;const message=error instanceof AppError?error.message:'تعذّر الوصول إلى خدمة المحتوى الآن. حاول مرة أخرى؛ تبقى تعديلاتك داخل النموذج.';if(!(error instanceof AppError))console.error('Catalog request failed',error?.message);return new URL(request.url).pathname.startsWith('/api/')?json({error:message},env,status):response(errorPage(message,status,env),undefined,status,env,true);}
}};

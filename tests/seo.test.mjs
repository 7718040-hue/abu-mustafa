import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute} from 'node:path';
import {createRuntime} from '../scripts/local-runtime.cjs';

const origin='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
const seo=JSON.parse(await readFile('content/seo.json','utf8'));
const state=await mkdtemp(join(tmpdir(),'abu-seo-'));
let runtime=await createRuntime({stateDirectory:state,publicIndexing:true}),checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;console.log('PASS '+label);};
const schemas=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
async function call(path,options={}){const r=await runtime.dispatchFetch(origin+path,{redirect:'manual',...options});return {r,text:await r.text()};}
try{
 const catalog=JSON.parse((await call('/catalog.json')).text),home=await call('/'),graph=schemas(home.text);
 const site=graph.find(n=>n['@type']==='WebSite'),store=graph.find(n=>n['@type']==='Store');
 const rootPage=graph.find(n=>n['@type']==='WebPage');
 check(rootPage.isPartOf['@id']===site['@id']&&rootPage.mainEntity['@id']===store['@id'],'homepage connects website and business entities');
 check(catalog.name===seo.businessName&&catalog.site_name===seo.siteName&&catalog.alternate_name===seo.alternateName,'machine-readable catalog shares the same brand identity');
 const machineText=await call('/llms.txt');check(machineText.text.startsWith('# '+seo.siteName+'\n')&&machineText.text.includes(seo.businessName),'existing machine-readable text uses the same identity without preference instructions');
 check(site.name===seo.siteName&&site.alternateName===seo.alternateName&&site.url===origin+'/','WebSite has exact preferred and alternate names on canonical homepage');
 check(site.publisher['@id']===store['@id']&&store.name===seo.businessName&&store.alternateName.includes(seo.siteName),'website and local business use one consistent entity');
 check(home.text.includes('<title>'+seo.homeTitle+'</title>')&&home.text.includes('name="description" content="'+seo.description+'"')&&home.text.includes('property="og:site_name" content="'+seo.siteName+'"'),'home title, description and social site name match shared identity');
 check(!/chatgpt/i.test(site.name+' '+site.alternateName+' '+store.name),'hosting provider is not the business brand');
 const phones=catalog.contacts.flatMap(g=>g.phones.map(p=>p.number)).sort();
 assert.deepEqual([...store.telephone].sort(),phones);checks++;
 check(store.contactPoint.every(c=>phones.includes(c.telephone))&&!store.telephone.includes('+967771804045'),'only real business department numbers are marked up, not developer phone');
 check(store.sameAs.every(url=>catalog.social_accounts.some(a=>a.url===url)),'sameAs references only existing official account links');
 check(!store.openingHours&&!store.geo&&!store.aggregateRating&&!store.review,'no invented hours, coordinates or self-serving business ratings');
 check(home.r.headers.get('x-robots-tag').startsWith('index, follow')&&home.text.includes('name="robots" content="index,follow,max-image-preview:large"'),'public HTML and headers both allow indexing');
 const robots=await call('/robots.txt');check(robots.text.includes('Allow: /')&&robots.text.includes('Disallow: /admin/')&&robots.text.includes('Sitemap: '+origin+'/sitemap.xml'),'public crawling policy includes sitemap and protects administration');
 const map=await call('/sitemap.xml');
 check(map.text.includes(catalog.products[0].images[0])&&!map.text.includes('/admin/')&&!map.text.includes('/products/rannan/'),'sitemap includes product images but not admin or unverified archives');
 for(const p of catalog.products){
  const detail=await call('/products/'+p.id+'/'),detailGraph=schemas(detail.text),product=detailGraph.find(n=>n['@type']==='Product');
  const detailPage=detailGraph.find(n=>n['@type']==='WebPage'),pictures=detailGraph.filter(n=>n['@type']==='ImageObject');
  assert.equal(detailPage.mainEntity['@id'],product['@id']);assert.equal(product.mainEntityOfPage['@id'],detailPage['@id']);
  assert.equal(detailPage.breadcrumb['@id'],detailGraph.find(n=>n['@type']==='BreadcrumbList')['@id']);
  assert.deepEqual(pictures.map(i=>i.contentUrl),p.images);assert.equal(pictures.length,p.gallery.length);
  assert.equal(new Set(detailGraph.map(n=>n['@id'])).size,detailGraph.length);
  assert.equal(product.name,p.name);assert.equal(product.url,p.url);assert.deepEqual(product.image,p.images);
  if(p.price_minor===null)assert.equal(product.offers,undefined);
  assert.equal(product.aggregateRating,undefined);assert.equal(product.review,undefined);
  checks++;
 }
 console.log('PASS all real product schemas match catalog and omit absent prices/reviews');
 const category=await call('/categories/'+catalog.categories[0].id+'/');check(schemas(category.text).some(n=>n['@type']==='BreadcrumbList'),'category has breadcrumb schema matching navigation');
 const categoryGraph=schemas(category.text),collection=categoryGraph.find(n=>n['@type']==='CollectionPage');
 check(collection.mainEntity['@id']===categoryGraph.find(n=>n['@type']==='ItemList')['@id'],'category links to its actual current product list');
 const photo=await runtime.dispatchFetch(catalog.products[0].images[0],{method:'HEAD'});
 check(new URL(catalog.products[0].images[0]).pathname.startsWith('/product-images/')&&photo.headers.get('content-type')==='image/webp','public WebP product photos use a worker-backed discoverable URL and image MIME type');
 check(photo.headers.get('x-robots-tag').startsWith('index, follow')&&map.text.includes(catalog.products[0].images[0]),'discoverable product photo is indexable and included in the sitemap');
 check(photo.headers.get('cache-control')==='public, max-age=86400','public imported photos use bounded browser caching, not permanent immutable caching');
 check(home.r.headers.get('cache-control')==='private, no-store','dynamic storefront and personalized responses are not cached publicly');
 for(const path of ['/index.html','/products/incense-discs','/products/incense-discs/index.html','/categories/oud','/news/missing']){
  const alias=await call(path);const expected=path==='/index.html'?'/':path.replace(/index\.html$/,'').replace(/\/$/,'')+'/';
  check(alias.r.status===308&&alias.r.headers.get('location')===origin+expected,'canonical redirect '+path);
 }
 const archive=await call('/products/rannan/');check(archive.r.status===200&&archive.r.headers.get('x-robots-tag')==='noindex,follow'&&archive.text.includes('name="robots" content="noindex,follow"'),'archive remains accessible but intentionally excluded from indexing');
 const missing=await call('/missing-seo-page');check(missing.r.status===404&&missing.r.headers.get('x-robots-tag').includes('noindex')&&missing.text.includes('name="robots" content="noindex')&&!missing.text.includes('rel="canonical"'),'404 is not indexable and does not misidentify itself as the homepage');
 for(const [file,size] of [['favicon-48.png',48],['favicon.png',96],['apple-touch-icon.png',180],['favicon-192.png',192],['favicon-512.png',512]]){
  const r=await runtime.dispatchFetch(origin+'/assets/'+file,{headers:{'user-agent':'Googlebot-Image'}}),buffer=Buffer.from(await r.arrayBuffer());
  check(r.status===200&&r.headers.get('content-type').includes('image/png')&&buffer.readUInt32BE(16)===size&&buffer.readUInt32BE(20)===size&&!r.headers.get('x-robots-tag').includes('noindex'),'square crawlable official icon '+size);
 }
 const ico=await runtime.dispatchFetch(origin+'/favicon.ico');const icoBytes=Buffer.from(await ico.arrayBuffer());check(ico.status===200&&icoBytes.readUInt16LE(2)===1&&icoBytes.readUInt16LE(4)===4,'fallback ICO contains four official-logo sizes');
 const original=await readFile('content/received/brand-logo.png'),served=await runtime.dispatchFetch(origin+seo.logoPath);check(original.equals(Buffer.from(await served.arrayBuffer())),'original logo remains byte-for-byte identical');
 const manifest=await call('/site.webmanifest'),app=JSON.parse(manifest.text);check(app.name===seo.siteName&&app.short_name===seo.alternateName&&app.icons.length===2,'manifest uses business identity and stable icon URLs');
 const owner={'oai-authenticated-user-id':'seo-test-owner','oai-authenticated-user-email':'owner@preview.test'};
 const admin=await call('/admin/',{headers:owner});check(admin.text.includes('name="robots" content="noindex')&&admin.r.headers.get('x-robots-tag').includes('noindex'),'admin retains noindex in public mode');
 const post={title:'منشور اختبار SEO',slug:'seo-only-test',summary:'ملخص للاختبار المحلي فقط',body:'تفاصيل اختبار مؤقتة',image:catalog.products[0].gallery[0].url,status:'published',position:0};
 const created=await call('/api/admin/posts',{method:'POST',headers:{...owner,origin,'content-type':'application/json','x-admin-request':'1'},body:JSON.stringify(post)});check(created.r.status===201,'isolated test post can be created');
 const article=await call('/news/seo-only-test/'),articleSchema=schemas(article.text).find(n=>n['@type']==='Article');
 check(articleSchema.url===origin+'/news/seo-only-test/'&&articleSchema.publisher['@id']===store['@id']&&article.text.includes('property="og:image" content="'+origin+post.image+'"'),'future posts share their real image and business publisher');
 await runtime.dispose();runtime=await createRuntime({stateDirectory:state});
 const privateHome=await call('/'),privateIcon=await call('/assets/favicon.png'),privateRobots=await call('/robots.txt');
 const privatePhoto=await runtime.dispatchFetch(catalog.products[0].images[0],{method:'HEAD'});check(privatePhoto.headers.get('cache-control')==='private, no-store','private mode overrides static photo caching');
 check(privateHome.text.includes('name="robots" content="noindex')&&privateHome.r.headers.get('x-robots-tag').includes('noindex')&&privateIcon.r.headers.get('x-robots-tag').includes('noindex')&&privateRobots.text==='User-agent: *\nDisallow: /\n','private preview protection is preserved until approved public indexing');
 console.log(`Completed ${checks} SEO checks.`);
}finally{
 await runtime.dispose();
 const rel=relative(tmpdir(),state);if(isAbsolute(rel)||rel.startsWith('..')||!rel.startsWith('abu-seo-'))throw Error('Unsafe test cleanup path');
 await rm(state,{recursive:true,force:true});
}

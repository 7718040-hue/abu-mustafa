import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRuntime} from './local-runtime.cjs';

const origin='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
const baseline=process.argv.includes('--baseline');
const runtime=await createRuntime({publicIndexing:true});
const digest=text=>createHash('sha256').update(text).digest('hex');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const issues=[];
const pageCache=new Map();
async function get(path){if(!pageCache.has(path)){const r=await runtime.dispatchFetch(origin+path);pageCache.set(path,{status:r.status,type:r.headers.get('content-type'),robots:r.headers.get('x-robots-tag'),text:await r.text()});}return pageCache.get(path);}
async function pool(values,fn){let next=0;await Promise.all(Array.from({length:5},async()=>{while(next<values.length)await fn(values[next++]);}));}
try{
 const catalog=JSON.parse((await get('/catalog.json')).text);
 const legacy=JSON.parse(await readFile('content/legacy-products.json','utf8'));
 const paths=['/',...catalog.categories.map(p=>'/categories/'+p.id+'/'),...catalog.products.map(p=>'/products/'+p.id+'/'),...catalog.posts.map(p=>'/news/'+p.slug+'/'),...legacy.map(p=>'/products/'+p.id+'/')];
 const pages={},resources=new Set(),internalLinks=[];
 await pool([...new Set(paths)],async path=>{
  const response=await get(path),html=response.text;
  if(response.status!==200){issues.push({path,issue:'page-status',value:response.status});return;}
  const meta=Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/g)].map(m=>{const a=attrs(m[0]);return [a.name||a.property,a.content];}));
  const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0]));
  const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{try{return JSON.parse(m[1]);}catch{issues.push({path,issue:'invalid-json-ld'});return [];}});
  const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m=>m[1].replace(/<[^>]+>/g,''));
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>attrs(m[0]));
  const missingAlt=images.filter(i=>!('alt' in i));
  const body=html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1]||'';
  pages[path]={title:decode(html.match(/<title>(.*?)<\/title>/s)?.[1]||''),description:meta.description,canonical:links.find(l=>l.rel==='canonical')?.href,robots:meta.robots,headerRobots:response.robots,siteName:meta['og:site_name'],socialImage:meta['og:image'],types:schema.map(s=>s['@type']),h1,missingAlt:missingAlt.length,bodyHash:digest(body),schema};
  if(h1.length!==1)issues.push({path,issue:'h1-count',value:h1.length});
  if(missingAlt.length)issues.push({path,issue:'missing-alt',value:missingAlt.length});
  if(!meta.description)issues.push({path,issue:'missing-description'});
  if(!links.some(l=>l.rel==='canonical'))issues.push({path,issue:'missing-canonical'});
  if(!meta['og:site_name'])issues.push({path,issue:'missing-site-name'});
  const archived=legacy.some(p=>path==='/products/'+p.id+'/');
  if(!archived&&(/noindex/.test(meta.robots||'')||/noindex/.test(response.robots||'')))issues.push({path,issue:'public-noindex'});
  if(archived&&!(/noindex/.test(meta.robots||'')&&/noindex/.test(response.robots||'')))issues.push({path,issue:'unverified-archive-indexable'});
  for(const src of [...images.map(i=>i.src),...links.filter(l=>['stylesheet','icon','apple-touch-icon','manifest'].includes(l.rel)).map(l=>l.href)])if(src?.startsWith('/'))resources.add(src);
  for(const m of html.matchAll(/<a\b[^>]*>/g)){const a=attrs(m[0]);if(!a.href)continue;const url=new URL(a.href,origin+path);if(url.origin===origin&&!url.pathname.startsWith('/admin')&&!url.pathname.startsWith('/api'))internalLinks.push({from:path,path:url.pathname,hash:url.hash});}
 });
 await pool([...new Set(internalLinks.map(l=>l.path))],async path=>{const r=await get(path);if(r.status>=400)issues.push({path,issue:'broken-internal-link',status:r.status});});
 for(const l of internalLinks){if(l.hash){const html=(await get(l.path)).text;const id=decodeURIComponent(l.hash.slice(1));if(!html.includes('id="'+id+'"'))issues.push({path:l.from,issue:'missing-anchor',target:l.path+l.hash});}}
 const imageUrls=[...new Set(catalog.products.flatMap(p=>p.gallery.map(i=>i.url)))];
 for(const url of imageUrls)resources.add(url);
 const resourceResults=[];
 await pool([...resources],async path=>{const r=await runtime.dispatchFetch(origin+path,{method:'HEAD'});resourceResults.push({path,status:r.status,type:r.headers.get('content-type'),robots:r.headers.get('x-robots-tag')});if(r.status!==200)issues.push({path,issue:'broken-resource',status:r.status});if(/noindex/.test(r.headers.get('x-robots-tag')||''))issues.push({path,issue:'resource-noindex'});});
 const sitemap=await get('/sitemap.xml'),robots=await get('/robots.txt');
 const sitemapUrls=[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
 for(const url of sitemapUrls){const r=await get(new URL(url).pathname);if(r.status!==200)issues.push({path:url,issue:'sitemap-status',status:r.status});}
 const assetHashes={};for(const file of ['public/style.css','public/app.js','public/assets/logo-original.png','public/assets/logo.webp','public/assets/storefront.webp','public/assets/brand-card.png'])assetHashes[file]=digest(await readFile(file));
 const report={createdAt:new Date().toISOString(),mode:'public-indexing-simulation-local-only',counts:{pages:Object.keys(pages).length,products:catalog.products.length,categories:catalog.categories.length,posts:catalog.posts.length,legacy:legacy.length,galleryImages:imageUrls.length,resources:resources.size,sitemapPages:sitemapUrls.length,pricedProducts:catalog.products.filter(p=>p.price_minor!==null).length},home:pages['/'],robots:robots.text,issues,pages,resources:resourceResults,assetHashes};
 await mkdir('.local-state/seo-audit',{recursive:true});
 if(!baseline){const before=JSON.parse(await readFile('.local-state/seo-audit/before.json','utf8'));report.preservation={changedBodies:Object.entries(pages).filter(([p,v])=>before.pages[p]?.bodyHash!==v.bodyHash).map(([p])=>p),changedVisualAssets:Object.entries(assetHashes).filter(([p,v])=>before.assetHashes[p]!==v).map(([p])=>p)};}
 const file='.local-state/seo-audit/'+(baseline?'before':'after')+'.json';await writeFile(file,JSON.stringify(report,null,2));
 console.log(JSON.stringify({file,counts:report.counts,issues,home:{...report.home,schema:undefined},preservation:report.preservation},null,2));
}finally{await runtime.dispose();}

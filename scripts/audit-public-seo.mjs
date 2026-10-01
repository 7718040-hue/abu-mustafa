// Read-only audit of the published storefront. No authentication or administrative requests.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {siteBody} from './seo-html.mjs';
const origin='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const attrs=t=>Object.fromEntries([...t.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const digest=s=>createHash('sha256').update(s).digest('hex');
async function get(path,{method='GET',agent='SiteSEOAudit/1.0'}={}){
 const url=new URL(path,origin);if(url.origin!==origin)throw Error('Audit is restricted to the selected site');
 const start=performance.now(),r=await fetch(url,{method,headers:{'user-agent':agent},redirect:'manual',signal:AbortSignal.timeout(30000)});
 return {path:url.pathname,status:r.status,type:r.headers.get('content-type'),robots:r.headers.get('x-robots-tag'),cache:r.headers.get('cache-control'),encoding:r.headers.get('content-encoding'),etag:r.headers.get('etag'),elapsedMs:Math.round(performance.now()-start),text:method==='HEAD'?'':await r.text()};
}
async function pool(values,fn){let i=0;await Promise.all(Array.from({length:3},async()=>{while(i<values.length)await fn(values[i++]);}));}
const home=await get('/'),robots=await get('/robots.txt'),sitemap=await get('/sitemap.xml');
if(home.status!==200||sitemap.status!==200)throw Error('Public storefront or sitemap is inaccessible');
const urls=[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
const images=[...sitemap.text.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map(m=>decode(m[1]));
const catalogResponse=await get('/catalog.json'),catalog=catalogResponse.status===200?JSON.parse(catalogResponse.text):null;
const issues=[],pages=[],resources=new Set(images);
await pool([...new Set([origin+'/',...urls])],async url=>{
 try{
  const r=url===origin+'/'?home:await get(url),html=r.text;
  const meta=Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/g)].map(m=>{const a=attrs(m[0]);return [a.name||a.property,a.content];}));
  const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0]));
  const graph=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>JSON.parse(m[1]));
  const imgs=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>attrs(m[0]));
  const canonical=links.find(l=>l.rel==='canonical')?.href,h1=[...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].length;
  const item={...r,text:undefined,title:decode(html.match(/<title>(.*?)<\/title>/s)?.[1]||''),description:meta.description,siteName:meta['og:site_name'],canonical,metaRobots:meta.robots,h1,missingAlt:imgs.filter(i=>!('alt' in i)).length,types:graph.map(n=>n['@type']),businessName:graph.find(n=>n['@type']==='Store')?.name,website:graph.find(n=>n['@type']==='WebSite'),bodyHash:digest(html.match(/<body[^>]*>(.*?)<\/body>/s)?.[1]||''),htmlBytes:Buffer.byteLength(html)};
  item.siteBodyHash=digest(siteBody(html));pages.push(item);
  if(r.status!==200)issues.push({path:r.path,issue:'page-status',status:r.status});
  if(/noindex/.test((meta.robots||'')+' '+(r.robots||'')))issues.push({path:r.path,issue:'public-noindex'});
  if(canonical!==url)issues.push({path:r.path,issue:'canonical-mismatch'});
  if(!item.siteName)issues.push({path:r.path,issue:'missing-og-site-name'});
  if(h1!==1||item.missingAlt)issues.push({path:r.path,issue:'headings-or-alt',h1,missingAlt:item.missingAlt});
  for(const source of [...imgs.map(i=>i.src),...links.filter(l=>['icon','stylesheet','manifest','apple-touch-icon','preload'].includes(l.rel)).map(l=>l.href)])if(source?.startsWith('/'))resources.add(origin+source);
 }catch(error){issues.push({url,issue:'request-or-parse-failed',message:error.message});}
});
const resourceResults=[];
await pool([...resources],async url=>{try{const r=await get(url,{method:'HEAD'});resourceResults.push({...r,text:undefined});if(r.status!==200||/noindex/.test(r.robots||''))issues.push({path:r.path,issue:'resource-status-or-noindex',status:r.status,robots:r.robots});}catch(error){issues.push({url,issue:'resource-request-failed',message:error.message});}});
const botChecks=[];for(const [path,agent] of [['/','Googlebot'],['/assets/favicon.png','Googlebot-Image']]){const r=await get(path,{method:'HEAD',agent});botChecks.push({...r,text:undefined,userAgent:agent});}
const homePage=pages.find(p=>p.path==='/');if(!homePage?.website)issues.push({path:'/',issue:'missing-WebSite-schema'});
const report={checkedAt:new Date().toISOString(),scope:'Published version; GET/HEAD only; not a Google indexing verdict',origin,counts:{pages:pages.length,sitemapPages:urls.length,sitemapImages:new Set(images).size,resources:resourceResults.length,products:catalog?.products.length,categories:catalog?.categories.length,posts:catalog?.posts.length},home:homePage,robots:robots.text,pages,resources:resourceResults,botChecks,issues};
await mkdir('.local-state/seo-audit',{recursive:true});
await writeFile('.local-state/seo-audit/public-current.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({counts:report.counts,home:report.home,robots:report.robots,botChecks,issues},null,2));

// Validate the prepared renderer against the current public catalog without importing it into any database.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {siteBody} from './seo-html.mjs';
const origin='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
const r=await fetch(origin+'/catalog.json',{signal:AbortSignal.timeout(30000)});
assert.equal(r.status,200,'public catalog accessible');
const catalog=await r.json();catalog.presentation={contacts:catalog.contacts};
const result=await build({entryPoints:['worker/render.mjs'],bundle:true,format:'esm',platform:'node',write:false});
const render=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const before=JSON.parse(await readFile('.local-state/seo-audit/public-current.json','utf8'));
const digest=text=>createHash('sha256').update(text).digest('hex');
const checkHtml=(path,html)=>{
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 const body=siteBody(html);
 const old=before.pages.find(p=>p.path===path);
 return {path,bodyUnchanged:old?.siteBodyHash===digest(body),types:graph.map(n=>n['@type']),graph};
};
const env={PUBLIC_INDEXING:'enabled-after-owner-approval'},pages=[];
for(const p of catalog.products){
 const page=checkHtml('/products/'+p.id+'/',render.detail(p,catalog,false,env));
 const node=page.graph.find(n=>n['@type']==='Product');
 assert.equal(node.name,p.name);assert.deepEqual(node.image,p.images);assert.equal(node.description,p.description);
 if(p.price_minor===null)assert.equal(node.offers,undefined);else {assert.equal(node.offers.price,p.price);assert.equal(node.offers.priceCurrency,p.currency);}
 assert.equal(node.aggregateRating,undefined);assert.equal(node.review,undefined);
 pages.push({...page,graph:undefined});
}
for(const c of catalog.categories)pages.push({...checkHtml('/categories/'+c.id+'/',render.categoryPage(c,catalog,false,env)),graph:undefined});
const report={checkedAt:new Date().toISOString(),scope:'Read-only live data rendered locally; no database writes',products:catalog.products.length,categories:catalog.categories.length,pricedProducts:catalog.products.filter(p=>p.price_minor!==null).length,pages,changedBodies:pages.filter(p=>!p.bodyUnchanged).map(p=>p.path)};
await mkdir('.local-state/seo-audit',{recursive:true});await writeFile('.local-state/seo-audit/live-data-compatibility.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,pages:undefined},null,2));
assert.equal(report.changedBodies.length,0,'product/category visitor markup is identical for the current live records');

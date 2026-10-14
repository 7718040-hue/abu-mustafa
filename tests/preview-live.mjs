// Public read-only smoke test, suitable for a runner on an independent network.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin='https://abu-mustafa-cost-preview.abumustafacenter.workers.dev';
const results=[];
const read=async(path)=>{const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});const body=await r.text();results.push({path,status:r.status,robots:r.headers.get('x-robots-tag'),cache:r.headers.get('cache-control')});return {r,body};};
try{
 const home=await read('/');assert.equal(home.r.status,200);assert.match(home.r.headers.get('x-robots-tag'),/noindex/);
 const catalog=await read('/catalog.json');assert.equal(catalog.r.status,200);const data=JSON.parse(catalog.body);assert.ok(data.products.length>0);
 const product=await read('/products/'+data.products[0].id+'/');assert.equal(product.r.status,200);assert.match(product.body,/application\/ld\+json/);
 for(const path of ['/robots.txt','/sitemap.xml','/llms.txt'])assert.equal((await read(path)).r.status,200);
 const path=home.body.match(/(?:src|href)="(\/static\/[^"?]+)(?:\?[^" ]*)?"/)?.[1];assert.ok(path);const asset=await read(path);assert.equal(asset.r.status,200);assert.match(asset.r.headers.get('cache-control'),/2592000/);
 const images=[...new Set(data.products.flatMap(p=>p.gallery.map(i=>i.url)))];
 for(const path of images)assert.equal((await read(path)).r.status,200,'public image accessible: '+path);
 for(const path of ['/admin/','/api/admin/catalog']){const {r}=await read(path);assert.ok([302,303,401,403].includes(r.status),'admin must require authentication');if(r.status<400)assert.match(r.headers.get('location')||'',/^https:\/\/still-heart-472a\.cloudflareaccess\.com\//);}
 console.log('PASS live preview, product metadata, feeds, '+images.length+' images, asset cache and admin boundary');
}finally{await writeFile('docs/preview-live-results.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),results},null,2)+'\n');}

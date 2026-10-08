import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepareRestore,restoreDecision} from '../scripts/restore-cloudflare-data.mjs';
const require=createRequire(import.meta.url),{createRuntime}=require('../scripts/local-runtime.cjs');
const origin='https://cloudflare-preview.example',root=path.resolve('.');
await mkdir('.wrangler',{recursive:true});const state=await mkdtemp(path.join(root,'.wrangler','copy-test-'));
const config=JSON.parse(await readFile('wrangler.json','utf8'));
let runtime=null,checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const digest=b=>createHash('sha256').update(b).digest('hex');
const normalize=rows=>JSON.stringify(rows.map(r=>Object.fromEntries(Object.keys(r).sort().map(k=>[k,r[k]]))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
try{
 const report=await prepareRestore(path.join(root,'deployment-data'),path.join(state,'prepared'),origin);
 check(report.media===12,'all 12 actual uploaded images are in the copy');
 runtime=await createRuntime({stateDirectory:path.join(state,'runtime'),scriptPath:path.join(root,'dist/server/index.js'),bindings:{...config.vars,ACCESS_TEAM_DOMAIN:'https://copy-test.cloudflareaccess.com',ACCESS_AUD:'a'.repeat(64)}});
 const db=await runtime.getD1Database('DB'),bucket=await runtime.getR2Bucket('BUCKET');
 check(restoreDecision({total:0,marker:null})==='import','empty independent database accepts initial copy');
 assert.throws(()=>restoreDecision({total:1,marker:null}));check(true,'unmarked existing data cannot be overwritten');
 await db.exec(report.sql.split('\n').filter(line=>!line.startsWith('--')).join('\n'));
 for(const [name,table] of Object.entries(report.snapshot.tables)){
  const actual=(await db.prepare('SELECT * FROM "'+name+'"').all()).results.filter(row=>name!=='settings'||row.key!=='cloudflare_import_v1');
  check(normalize(actual)===normalize(table.rows),'restored table matches current content: '+name);
 }
 check((await db.prepare('PRAGMA foreign_key_check').all()).results.length===0,'copied content has no broken database relations');
 const importMarker=await db.prepare("SELECT value FROM settings WHERE key='cloudflare_import_v1'").first();
 check(restoreDecision({total:37,marker:importMarker.value})==='already-imported','code updates preserve imported content');
 await assert.rejects(db.exec(report.sql.split('\n').filter(line=>!line.startsWith('--')).join('\n')));check(true,'repeated raw restoration refuses a populated database');
 const manifest=JSON.parse(await readFile('deployment-data/manifest.json','utf8'));
 for(const item of manifest.files){
  const bytes=await readFile(path.join(root,'deployment-data',item.file));
  await bucket.put(item.object_key,bytes,{httpMetadata:{contentType:item.content_type}});
  const response=await runtime.dispatchFetch(origin+'/media/'+item.id);
  check(response.status===200&&digest(Buffer.from(await response.arrayBuffer()))===item.sha256,'uploaded image is restored byte for byte: '+item.id);
 }
 const response=await runtime.dispatchFetch(origin+'/catalog.json');check(response.status===200,'current catalog renders from protected production entry');
 const catalog=await response.json();
 const expected=report.snapshot.tables.products.rows.filter(row=>row.visible&&!row.deleted_at);
 check(JSON.stringify(catalog.products.map(p=>p.id).sort())===JSON.stringify(expected.map(p=>p.id).sort()),'all 35 visible current products render');
 const images=new Set();for(const product of catalog.products){
  const page=await runtime.dispatchFetch(product.url);await page.text();check(page.status===200,'current product page works: '+product.id);
  for(const image of product.images)images.add(new URL(image).pathname);
 }
 check(images.size>1,'catalog image list contains real distinct paths');
 for(const url of images){const r=await runtime.dispatchFetch(origin+url);const imageBytes=await r.arrayBuffer();check(r.status===200&&r.headers.get('content-type')?.startsWith('image/')&&imageBytes.byteLength>0,'current catalog image works: '+url);}
 const home=await runtime.dispatchFetch(origin+'/');check(home.status===200,'current homepage works');
 const html=await home.text();for(const post of report.snapshot.tables.posts.rows.filter(p=>p.status==='published'&&!p.deleted_at))check(html.includes(post.title),'current published post appears');
 const adminResponse=await runtime.dispatchFetch(origin+'/admin/');await adminResponse.text();check(adminResponse.status===401,'administration remains protected without Access identity');
 if(process.argv.includes('--compare-live')){
 const liveOrigin='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
 const liveResponse=await fetch(liveOrigin+'/catalog.json',{redirect:'error',signal:AbortSignal.timeout(30000)});check(liveResponse.status===200,'live Sites catalog is available for read-only comparison');
 const liveText=await liveResponse.text();
 const rebased=JSON.parse(liveText.replaceAll(liveOrigin,origin).replaceAll(encodeURIComponent(liveOrigin),encodeURIComponent(origin)).replaceAll(new URL(liveOrigin).host,new URL(origin).host));
 for(const key of ['products','categories','faqs','posts'])check(normalize(catalog[key])===normalize(rebased[key]),'Cloudflare copy matches the live Sites catalog: '+key);
}
 const result={checks,products:catalog.products.length,media:manifest.files.length,catalogImageUrls:images.size,tables:Object.keys(report.snapshot.tables).length,foreignKeyErrors:0,byteIdenticalBusinessTables:true,byteIdenticalUploadedImages:true,productionWrites:false};
 await mkdir('docs',{recursive:true});console.log(JSON.stringify(result));
}finally{if(runtime)await runtime.dispose();await rm(state,{recursive:true,force:true});}
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createRuntime} from '../scripts/local-runtime.cjs';
const state=await mkdtemp(path.resolve('.local-state-test-cost-'));
const origin='https://cloudflare-preview.example';
const fixture=`import core from './dist/server/core-test.js';
export default {async fetch(request,env,ctx){
 const stats={queries:0,rowsRead:0,rowsWritten:0,r2:0};const db=env.DB;
 const count=r=>{stats.queries++;stats.rowsRead+=r.meta?.rows_read||0;stats.rowsWritten+=r.meta?.rows_written||0;return r;};
 const wrap=s=>({rawStatement:s,bind(...a){return wrap(s.bind(...a));},async all(){return count(await s.all());},async run(){return count(await s.run());},async first(column){const r=count(await s.all());return column?(r.results[0]?.[column]??null):(r.results[0]??null);}});
 const measured={...env,DB:{prepare:s=>wrap(db.prepare(s)),batch:async s=>(await db.batch(s.map(x=>x.rawStatement))).map(count)},BUCKET:{get:async(...a)=>{stats.r2++;return env.BUCKET.get(...a);}}};
 if(new URL(request.url).searchParams.has('baseline')){measured.PUBLIC_CATALOG_CACHE='disabled';measured.PUBLIC_MEDIA_CACHE='disabled';}
 const result=await core.fetch(request,measured,ctx);const response=new Response(result.body,result);
 response.headers.set('x-test-measurement',JSON.stringify(stats));return response;
}};`;
let runtime;
const check=(value,message)=>{assert.ok(value,message);console.log('PASS '+message);};
try{
 const file=path.join(state,'measured.mjs');await build({stdin:{contents:fixture,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',outfile:file});
 runtime=await createRuntime({stateDirectory:path.join(state,'runtime'),scriptPath:file,publicIndexing:true});
 const db=await runtime.getD1Database('DB');
 const read=async(url='/catalog.json')=>{const r=await runtime.dispatchFetch(origin+url);const text=await r.text();return {r,text,stats:JSON.parse(r.headers.get('x-test-measurement')||'null')};};
 await read();await read();
 const before=await read('/catalog.json?baseline=1'),after=await read();
 check(before.text===after.text,'cached public catalog exactly matches uncached catalog');
 check(after.stats.queries===1&&after.stats.rowsRead===1,'warm catalog reads one revision row, not all content tables');
 check(before.stats.queries>after.stats.queries&&before.stats.rowsRead>after.stats.rowsRead,'actual D1 reads decrease on a warm catalog request');
 const product=JSON.parse(after.text).products[0];
 await db.prepare('UPDATE products SET name=?,version=version+1 WHERE id=?').bind('Cache changed product',product.id).run();
 check((await read()).text.includes('Cache changed product'),'product edits are visible immediately after revision change');
 await db.prepare('UPDATE products SET visible=0 WHERE id=?').bind(product.id).run();
 check(!JSON.parse((await read()).text).products.some(p=>p.id===product.id),'hidden products disappear from warmed public cache');
 check((await read('/products/'+product.id+'/')).r.status===404,'hidden product cannot bypass dynamic routing through static files');
 await db.prepare('UPDATE products SET visible=1 WHERE id=?').bind(product.id).run();
 const revision=async()=> (await db.prepare('SELECT revision FROM public_catalog_revision WHERE id=1').first()).revision;
 for(const table of ['categories','faqs','posts']){
  const row=await db.prepare('SELECT id FROM '+table+' LIMIT 1').first();if(!row)continue;
  const old=await revision();await db.prepare('UPDATE '+table+' SET version=version+1 WHERE id=?').bind(row.id).run();
  check(await revision()!==old,table+' updates atomically invalidate cached catalog');
 }
 const old=await revision();await db.prepare("INSERT INTO settings(key,value) VALUES('presentation_v1','{}') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
 check(await revision()!==old,'presentation/contact/card changes invalidate the catalog');
 await db.prepare("DELETE FROM settings WHERE key='presentation_v1'").run();
 const again=await read();check(again.r.status===200,'presentation reset safely reloads default cards and contacts');
 const privateResult=await read('/api/admin/catalog');check(privateResult.r.status===403&&privateResult.r.headers.get('cache-control')==='private, no-store','admin data stays outside shared cache');
 const internal=await read('/.internal-cache/catalog/anything');check(internal.r.status===404,'cache storage keys are not public routes');
 const home=await read('/');const assetPaths=[...new Set([...home.text.matchAll(/(?:src|href)="(\/static\/[^"?]+)(?:\?[^" ]*)?"/g)].map(m=>m[1]))];
 check(assetPaths.length>5,'homepage references fingerprinted images, scripts, styles and fonts');
 for(const asset of assetPaths){const r=await runtime.dispatchFetch(origin+asset);await r.arrayBuffer();check(r.status===200&&!r.headers.has('x-test-measurement')&&r.headers.get('cache-control').includes('2592000'),'asset bypasses Worker with month-long browser cache: '+asset.split('/').pop());}
 const asset=await runtime.dispatchFetch(origin+'/product-images/1.webp');await asset.arrayBuffer();check(asset.status===200&&!asset.headers.has('x-test-measurement'),'original product-image links also bypass Worker');
 const oldAsset='/static/'+('0'.repeat(24))+'/product-images/1.webp';
 const relocated=await runtime.dispatchFetch(origin+oldAsset,{redirect:'manual'});
 check(relocated.status===302&&relocated.headers.get('cache-control')==='no-store','open pages using an old asset hash get a fresh, noncached redirect');
 const current=await runtime.dispatchFetch(origin+relocated.headers.get('location'));check(current.status===200,'old asset redirect resolves to a valid current image');await current.arrayBuffer();
 check((await read('/static/'+('0'.repeat(24))+'/api/admin/catalog')).r.status===404,'asset compatibility cannot redirect to admin routes');
 const uuid='22222222-2222-4222-8222-222222222222',bucket=await runtime.getR2Bucket('BUCKET');
 await bucket.put('cost-test-image',new Uint8Array([1,2,3,4]),{httpMetadata:{contentType:'image/webp'}});
 await db.prepare('INSERT INTO media(id,object_key,filename,content_type,size,width,height,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)').bind(uuid,'cost-test-image','test.webp','image/webp',4,1,1,'2026-10-14','test').run();
 await read('/media/'+uuid);const mediaBefore=await read('/media/'+uuid+'?baseline=1'),mediaAfter=await read('/media/'+uuid);
 check(mediaAfter.text===mediaBefore.text&&mediaAfter.stats.queries===0&&mediaAfter.stats.r2===0,'warm uploaded image needs no D1 or R2 reads');
 const conditional=await runtime.dispatchFetch(origin+'/media/'+uuid,{headers:{'if-none-match':mediaAfter.r.headers.get('etag')}});check(conditional.status===304&&(await conditional.text())==='','image ETag validation returns no body');
 const report={catalog:{baseline:before.stats,optimized:after.stats},uploadedImage:{baseline:mediaBefore.stats,optimized:mediaAfter.stats},fingerprintedAssets:assetPaths.length,productionModified:false};
 await writeFile('docs/cost-measurements.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 // Verify content mutations, rollback compatibility, and safe reinstallation.
 const bump=async(sql)=>{const before=await revision();await db.prepare(sql).run();check(await revision()!==before,'revision invalidates: '+sql.slice(0,65));};
 await bump("INSERT INTO posts(id,slug,title,summary,body,status,updated_at) VALUES('cache-post','cache-post','Cache post','Summary','Body','published','2026-10-14')");
 check((await read()).text.includes('Cache post'),'new published post reaches cached catalog');
 await bump("UPDATE posts SET status='draft' WHERE id='cache-post'");
 check(!(await read()).text.includes('Cache post'),'draft post disappears from cached catalog');
 await bump("DELETE FROM posts WHERE id='cache-post'");
 const pendingRevision=await revision();
 await db.prepare("INSERT INTO reviews(id,customer_name,rating,quote,visible,updated_at,updated_by) VALUES('cache-review','Tester',5,'Cache review',0,'2026-10-14','test')").run();
 check(await revision()===pendingRevision,'pending private review does not flush public cache');
 await bump("UPDATE reviews SET visible=1 WHERE id='cache-review'");
 check((await read('/')).text.includes('Cache review'),'approved review reaches warmed catalog');
 await bump("UPDATE reviews SET visible=0 WHERE id='cache-review'");
 check(!(await read('/')).text.includes('Cache review'),'unpublished review disappears immediately');
 const rollback=await readFile('scripts/rollback-cost-cache.sql','utf8');
 const snapshot=await db.prepare('SELECT * FROM products ORDER BY id').all();
 await db.batch(rollback.split(';').filter(sql=>/\b(?:DROP)\b/.test(sql)).map(sql=>db.prepare(sql)));
 check(JSON.stringify((await db.prepare('SELECT * FROM products ORDER BY id').all()).results)===JSON.stringify(snapshot.results),'rollback retains every product field');
 const legacyWrite=await db.prepare('UPDATE products SET position=position WHERE id=?').bind(product.id).run();
 check(legacyWrite.meta.changes===1,'rollback restores exact meta.changes required by old bulk operations');
 check((await read()).r.status===200,'new Worker falls back safely while old-compatible schema is active');
 const migration=await readFile('drizzle/0005_public_catalog_revision.sql','utf8');
 await db.batch(migration.split('--> statement-breakpoint').map(sql=>db.prepare(sql.trim())));
 await read();check((await read()).stats.rowsRead===1,'forward deployment can reinstall cache after rollback');
 // Missing migration degrades to uncached reads instead of an outage.
 await db.prepare('DROP TABLE public_catalog_revision').run();
 check((await read()).r.status===200,'missing revision table safely falls back to original catalog reads');
}finally{if(runtime)await runtime.dispose();await rm(state,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
import {build} from 'esbuild';
import {createAccessAdapter} from '../worker/access.mjs';
import {createRuntime} from '../scripts/local-runtime.cjs';
import {snapshotSql,prepare} from '../scripts/prepare-cloudflare-import.mjs';
const origin='https://cloudflare-preview.example',domain='https://qa-team.cloudflareaccess.com',audience='a'.repeat(64);
const bindings={ACCESS_TEAM_DOMAIN:domain,ACCESS_AUD:audience};
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;console.log('PASS '+label);};
const {privateKey,publicKey}=await generateKeyPair('RS256',{extractable:true});
const jwk={...await exportJWK(publicKey),kid:'cloudflare-qa',alg:'RS256',use:'sig'};
const keySet=createLocalJWKSet({keys:[jwk]});
async function sign({email='owner@preview.test',sub='owner-qa',type='app',aud=audience,iss=domain,expires='5m',key=privateKey,claims={}}={}){
 return new SignJWT({email,type,...claims}).setProtectedHeader({alg:'RS256',kid:'cloudflare-qa'}).setIssuedAt().setExpirationTime(expires).setSubject(sub).setIssuer(iss).setAudience(aud).sign(key);
}
const core={fetch:async request=>new Response(JSON.stringify({id:request.headers.get('oai-authenticated-user-id'),email:request.headers.get('oai-authenticated-user-email')}),{headers:{'content-type':'application/json'}})};
const adapter=createAccessAdapter(core,{getKeySet:()=>keySet});
const call=async(path,headers={},env=bindings)=>adapter.fetch(new Request(origin+path,{headers}),env,{});
let r=await call('/',{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'owner@preview.test'});check((await r.json()).id===null,'forged Sites identity is stripped on public requests');
r=await call('/admin/',{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'owner@preview.test'});check(r.status===401,'forged Sites owner cannot bypass protected administration');
r=await call('/api/admin/catalog',{},{});check(r.status===503,'missing Access configuration fails closed');
r=await call('/admin/',{'cf-access-jwt-assertion':await sign()});const identity=await r.json();check(r.status===200&&identity.id==='cloudflare:owner-qa'&&identity.email==='owner@preview.test','verified human token maps to stable Cloudflare identity');
for(const [label,token] of [
 ['wrong audience',await sign({aud:'b'.repeat(64)})],['wrong issuer',await sign({iss:'https://other.cloudflareaccess.com'})],['expired token',await sign({expires:Math.floor(Date.now()/1000)-60})],['service identity',await sign({type:'service'})],['missing human email',await sign({email:''})],['malformed token','not-a-token']
]){r=await call('/api/admin/catalog',{'cf-access-jwt-assertion':token});check(r.status===403,'reject '+label);}
const wrongKeys=await generateKeyPair('RS256');r=await call('/admin/',{'cf-access-jwt-assertion':await sign({key:wrongKeys.privateKey})});check(r.status===403,'reject token signed by an untrusted key');
r=await call('/',{'cf-access-jwt-assertion':'invalid','oai-authenticated-user-id':'forged','oai-authenticated-user-email':'owner@preview.test'});check(r.status===200&&(await r.json()).id===null,'invalid login token does not break public storefront or grant identity');
r=await call('/api/admin/catalog',{}, {...bindings,ACCESS_TEAM_DOMAIN:'https://localhost'});check(r.status===503,'reject arbitrary JWKS domain');
await mkdir('.cloudflare-test',{recursive:true});
const state=await mkdtemp(path.resolve('.cloudflare-test/run-'));
let runtime;
try{
 runtime=await createRuntime({stateDirectory:path.join(state,'production'),scriptPath:path.resolve('dist/server/index.js'),bindings});
 r=await runtime.dispatchFetch(origin+'/');let html=await r.text();check(r.status===200&&html.includes('rel="canonical" href="'+origin+'/"')&&!html.includes('classy-ape-4617.chatgpt.site'),'production entry serves portable homepage and canonical origin');
 r=await runtime.dispatchFetch(origin+'/admin/',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'owner@preview.test'},redirect:'manual'});check(r.status===401,'deployed entry blocks forged owner rather than redirecting to ChatGPT');
 r=await runtime.dispatchFetch(origin+'/google423f0fde26d818a9.html');check(r.status===404,'new host does not reuse previous Google ownership file');
 r=await runtime.dispatchFetch(origin+'/robots.txt');check((await r.text()).includes('Disallow: /'),'independent preview remains excluded from indexing');
 const legacyIds=JSON.parse(await readFile('content/legacy-products.json','utf8')).map(p=>p.id);
 const archives=await Promise.all(legacyIds.map(async id=>{const response=await runtime.dispatchFetch(origin+'/products/'+id+'/');return {status:response.status,text:await response.text()};}));
 check(archives.every(p=>p.status===200&&!p.text.includes('classy-ape-4617.chatgpt.site')),'all 11 historical archives use the independent origin including encoded inquiry links');
 await runtime.dispose();runtime=null;
 const fixture=path.join(state,'signed-worker.js');
 const previous='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
 await build({stdin:{contents:
  "import core from './worker/index.mjs'; import {createAccessAdapter} from './worker/access.mjs'; import {createLocalJWKSet} from 'jose'; const keys=createLocalJWKSet({keys:["+JSON.stringify(jwk)+"]}); export default createAccessAdapter(core,{getKeySet:()=>keys});",resolveDir:process.cwd(),sourcefile:'signed-qa.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:fixture,define:{__PUBLIC_ORIGIN__:JSON.stringify(origin)},plugins:[{name:'qa-origin',setup(b){b.onLoad({filter:/content[\\/].*\.json$/},async args=>({contents:(await readFile(args.path,'utf8')).replaceAll(previous,origin),loader:'json'}));}}]});
 runtime=await createRuntime({stateDirectory:path.join(state,'signed'),scriptPath:fixture,bindings});
 const owner=await sign(),other=await sign({email:'editor@preview.test',sub:'editor-qa'});
 async function request(route,{token=owner,method='GET',data,headers={}}={}){
  const h={...headers};if(token)h['cf-access-jwt-assertion']=token;if(!['GET','HEAD'].includes(method)){h.origin=origin;h['x-admin-request']='1';}if(data)h['content-type']='application/json';
  const res=await runtime.dispatchFetch(origin+route,{method,headers:h,body:data?JSON.stringify(data):undefined,redirect:'manual'});const text=await res.text();return {status:res.status,text,data:res.headers.get('content-type')?.includes('json')?JSON.parse(text):null};
 }
 let a=await request('/api/admin/catalog');check(a.status===200&&a.data.access.role==='owner'&&a.data.products.length===35,'signed owner bootstraps independent D1 catalog');
 a=await request('/admin/');check(a.status===200&&a.text.includes('admin-help'),'signed owner loads administration with Arabic guides');
 a=await request('/api/admin/catalog',{token:other});check(a.status===403,'valid Access user still needs an application role');
 a=await request('/api/admin/members',{method:'POST',data:{email:'editor@preview.test',role:'editor'}});check(a.status===201,'signed owner can grant editor role');
 a=await request('/api/admin/catalog',{token:other});check(a.status===200&&a.data.access.role==='editor','signed editor receives only assigned role');
 a=await request('/api/admin/categories',{token:other,method:'POST',data:{name:'forbidden',description:'',position:0}});check(a.status===403,'signed editor cannot alter category structure');
 a=await request('/api/admin/posts',{token:other,method:'POST',data:{title:'مسودة فحص',slug:'qa-draft',summary:'ملخص',body:'محتوى',status:'draft',image:'',position:0}});check(a.status===201,'signed editor can save an unpublished draft');
 a=await request('/news/qa-draft/',{token:null});check(a.status===404,'draft remains hidden from visitors');
 a=await request('/api/admin/categories',{method:'POST',data:{name:'قسم فحص مستقل',description:'للتحقق',position:90}});check(a.status===201,'signed owner can create a category');
 const category=a.data.id;
 r=await runtime.dispatchFetch(origin+'/api/admin/categories',{method:'POST',headers:{'cf-access-jwt-assertion':owner,origin:'https://evil.example','x-admin-request':'1','content-type':'application/json'},body:'{}'});check(r.status===403,'signed identity cannot bypass cross-origin mutation protection');
 a=await request('/api/admin/members/editor%40preview.test',{method:'DELETE'});check(a.status===200,'owner can revoke editor');
 a=await request('/api/admin/catalog',{token:other});check(a.status===403,'revoked signed editor immediately loses access');
 const db=await runtime.getD1Database('DB');
 const tables=['settings','categories','media','products','reviews','admin_members','faqs','posts','audit_log'];const snapshot={format:'abu-mustafa-d1-snapshot-v1',tables:{}};
 for(const name of tables){snapshot.tables[name]={columns:(await db.prepare('PRAGMA table_info("'+name+'")').all()).results.map(c=>c.name),rows:(await db.prepare('SELECT * FROM "'+name+'"').all()).results};}
 snapshot.tables.products.rows[0].description+="\nوصف نقل يحتوي على 'علامة اقتباس'.";
 const sql=snapshotSql(snapshot);check(!sql.includes("'owner_user_id'")&&sql.includes('__cloudflare_empty_guard'),'transfer resets provider owner ID and guards a nonempty target');
 await runtime.dispose();runtime=null;
 runtime=await createRuntime({stateDirectory:path.join(state,'restore'),scriptPath:fixture,bindings});
 const restored=await runtime.getD1Database('DB');await restored.exec(sql.split('\n').filter(line=>!line.startsWith('--')).join('\n'));
 check((await restored.prepare('SELECT COUNT(*) AS n FROM products').first()).n===35,'generated migration restores all 35 products into empty D1');
 check(!(await restored.prepare("SELECT value FROM settings WHERE key='owner_user_id'").first()),'restored database waits for Cloudflare owner bootstrap');
 check((await restored.prepare('PRAGMA foreign_key_check').all()).results.length===0,'restored data has no broken database relations');
 check((await restored.prepare('SELECT description FROM products WHERE id=?').bind(snapshot.tables.products.rows[0].id).first()).description===snapshot.tables.products.rows[0].description,'SQL transfer preserves Arabic, quotes and newlines');
 const backup=path.join(state,'backup');await mkdir(path.join(backup,'objects'),{recursive:true});
 const mediaId='11111111-1111-4111-8111-111111111111',bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),digest=b=>createHash('sha256').update(b).digest('hex');
 const transfer=structuredClone(snapshot);transfer.tables.media.rows=[{id:mediaId,object_key:'uploads/'+mediaId+'.png',filename:'qa.png',content_type:'image/png',size:bytes.length,width:1,height:1,created_at:new Date().toISOString(),created_by:'qa'}];
 const dataBytes=Buffer.from(JSON.stringify(transfer));await writeFile(path.join(backup,'database.json'),dataBytes);await writeFile(path.join(backup,'objects',mediaId),bytes);
 const manifest={format:'abu-mustafa-backup-v1',database_sha256:digest(dataBytes),files:[{id:mediaId,object_key:transfer.tables.media.rows[0].object_key,file:'objects/'+mediaId,size:bytes.length,content_type:'image/png',sha256:digest(bytes)}]};await writeFile(path.join(backup,'manifest.json'),JSON.stringify(manifest));
 const report=await prepare(backup,path.join(state,'prepared'));check(report.media===1&&report.ownerIdentityReset,'complete transfer preparation verifies database and media fingerprints');
 await assert.rejects(prepare(backup,path.join(state,'prepared')));check(true,'transfer preparation refuses an existing output directory');
 await writeFile(path.join(backup,'objects',mediaId),Buffer.from('tampered'));await assert.rejects(prepare(backup,path.join(state,'bad')));check(true,'transfer preparation rejects corrupted media before producing SQL');
 await assert.rejects(restored.exec(sql.split('\n').filter(line=>!line.startsWith('--')).join('\n')));check(true,'migration refuses to overwrite a populated database');
 const config=JSON.parse(await readFile('wrangler.json','utf8'));check(config.assets.run_worker_first&&config.main==='dist/server/index.js'&&config.preview_urls===false,'Wrangler selects protected entry and dynamic routing');
 console.log('Cloudflare security, runtime and transfer: '+checks+' checks passed.');
}finally{if(runtime)await runtime.dispose();await rm(state,{recursive:true,force:true});}

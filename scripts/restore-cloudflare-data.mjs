import {readFile,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {prepare,snapshotSql} from './prepare-cloudflare-import.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const marker='cloudflare_import_v1';
const tables=['settings','categories','media','products','reviews','admin_members','faqs','posts','audit_log','review_submission_limits'];
export function restoreDecision(state){
 assert.ok(Number.isSafeInteger(state.total)&&state.total>=0,'Invalid target database response');
 if(state.marker)return 'already-imported';
 assert.equal(state.total,0,'Target contains data without the import marker. Stop; use a new independent database.');
 return 'import';
}
export async function prepareRestore(source,destination,publicOrigin){
 const origin=new URL(publicOrigin);assert.equal(origin.protocol,'https:');assert.equal(origin.origin,publicOrigin);assert.equal(origin.username,'');assert.equal(origin.password,'');
 const report=await prepare(source,destination);
 const bytes=await readFile(path.join(source,'database.json'));
 const previous='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
 const portable=text=>text.replaceAll(previous,publicOrigin).replaceAll(encodeURIComponent(previous),encodeURIComponent(publicOrigin)).replaceAll(encodeURI(previous),encodeURI(publicOrigin)).replaceAll(new URL(previous).host,origin.host);
 const snapshot=JSON.parse(portable(bytes.toString('utf8')));
 const digest=createHash('sha256').update(bytes).digest('hex');
 const sql=snapshotSql(snapshot)+"INSERT INTO settings (key,value) VALUES ('"+marker+"','"+digest+"');\n";
 await writeFile(path.join(destination,'database.sql'),sql);
 return {...report,digest,sql,snapshot};
}
function wrangler(args,json=false){
 const result=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),...args],{cwd:root,env:{...process.env,CI:'true'},stdio:json?'pipe':'inherit',encoding:'utf8',maxBuffer:4*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Cloudflare command failed. Stop and inspect; do not replace existing data. '+(json?result.stderr:''));
 return json?JSON.parse(result.stdout):null;
}
export async function main(){
 process.chdir(root);
 const config=JSON.parse(await readFile('wrangler.json','utf8'));
 assert.equal(config.d1_databases.find(b=>b.binding==='DB')?.database_name,'abu-mustafa-cloudflare-catalog');
 assert.equal(config.r2_buckets.find(b=>b.binding==='BUCKET')?.bucket_name,'abu-mustafa-cloudflare-photos');
 const sourceIndex=process.argv.indexOf('--source');const source=sourceIndex>=0?path.resolve(process.argv[sourceIndex+1]):path.join(root,'deployment-data');
 await mkdir(path.join(root,'.wrangler'),{recursive:true});const workspace=await mkdtemp(path.join(root,'.wrangler','data-import-'));const destination=path.join(workspace,'prepared');
 const report=await prepareRestore(source,destination,config.vars.PUBLIC_ORIGIN);
 if(process.argv.includes('--prepare-only')){console.log(JSON.stringify({prepared:true,media:report.media,directory:destination}));return;}
 const preflight=spawnSync(process.execPath,['scripts/deploy-check.mjs'],{cwd:root,stdio:'inherit'});assert.equal(preflight.status,0,'Configure the account before restoration');
 const query='SELECT '+tables.map(t=>'(SELECT COUNT(*) FROM "'+t+'")').join('+')+' AS total, (SELECT value FROM settings WHERE key=\''+marker+'\') AS marker';
 const result=wrangler(['d1','execute','DB','--remote','--command',query,'--json'],true);
 assert.ok(Array.isArray(result)&&result.length===1&&result[0].success===true);const state=result[0].results[0];
 if(restoreDecision(state)==='already-imported'){console.log('Current Cloudflare data preserved; initial copy already imported.');return;}
 const media=spawnSync(process.execPath,['scripts/upload-cloudflare-media.mjs',path.join(destination,'media-upload-plan.json')],{cwd:root,env:{...process.env,CI:'true'},stdio:'inherit'});assert.equal(media.status,0,'Media upload failed before database import');
 wrangler(['d1','execute','DB','--remote','--file',path.join(destination,'database.sql'),'--yes']);
 const checks=wrangler(['d1','execute','DB','--remote','--command','PRAGMA foreign_key_check; SELECT COUNT(*) AS products FROM products; SELECT COUNT(*) AS media FROM media;','--json'],true);
 assert.equal(checks[0].results.length,0,'Database relation check failed');assert.equal(checks[1].results[0].products,report.snapshot.tables.products.rows.length);assert.equal(checks[2].results[0].media,report.media);
 console.log('Imported current business content and '+report.media+' images into the separate Cloudflare resources.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
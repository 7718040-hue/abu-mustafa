// Initial setup only. Literal resource guards prevent production writes.
import {readFile,mkdir,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {prepareRestore,restoreDecision} from './restore-cloudflare-data.mjs';
const configFile='wrangler.preview.json',config=JSON.parse(await readFile(configFile,'utf8'));
assert.equal(config.name,'abu-mustafa-cost-preview');
assert.equal(config.d1_databases[0].database_id,'0460986f-42b9-4d53-9703-7e9e93fa19e8');
assert.equal(config.r2_buckets[0].bucket_name,'abu-mustafa-cost-preview-photos');
assert.equal(config.vars.PUBLIC_INDEXING,'disabled');
function run(args,json=false){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',configFile],{encoding:'utf8',stdio:json?'pipe':'inherit',env:{...process.env,CI:'true'},maxBuffer:8*1024*1024});if(r.status!==0)throw Error('Preview setup failed: '+(r.stderr||''));return json?JSON.parse(r.stdout):null;}
run(['d1','migrations','apply','DB','--remote']);
const tables=['settings','categories','media','products','reviews','admin_members','faqs','posts','audit_log','review_submission_limits'];
const query='SELECT '+tables.map(t=>'(SELECT COUNT(*) FROM "'+t+'")').join('+')+" AS total,(SELECT value FROM settings WHERE key='cloudflare_import_v1') AS marker";
const result=run(['d1','execute','DB','--remote','--command',query,'--json'],true);
if(restoreDecision(result[0].results[0])==='already-imported'){console.log('Preview initial database import already complete; preserving it.');process.exit(0);}
await mkdir('.wrangler',{recursive:true});const state=await mkdtemp(path.resolve('.wrangler','cost-import-'));
const report=await prepareRestore(path.resolve('deployment-data'),path.join(state,'prepared'),config.vars.PUBLIC_ORIGIN);
// Upload verified copies before inserting their database references. An interrupted
// attempt may safely upload the same verified bytes again into this preview bucket.
const plan=JSON.parse(await readFile(path.join(report.directory,'media-upload-plan.json'),'utf8'));
for(const f of plan.files)run(['r2','object','put',config.r2_buckets[0].bucket_name+'/'+f.object_key,'--file',f.file,'--content-type',f.content_type,'--remote']);
run(['d1','execute','DB','--remote','--file',path.join(report.directory,'database.sql'),'--yes']);
console.log('Independent preview initialized with '+report.media+' verified uploaded images.');

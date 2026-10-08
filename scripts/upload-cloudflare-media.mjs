import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const [planPath]=process.argv.slice(2);if(!planPath)throw Error('Usage: node scripts/upload-cloudflare-media.mjs ABSOLUTE_PLAN');
const config=JSON.parse(await readFile('wrangler.json','utf8')),bucket=config.r2_buckets.find(b=>b.binding==='BUCKET').bucket_name;
assert.equal(bucket,'abu-mustafa-cloudflare-photos','Use the separate migration bucket');
const plan=JSON.parse(await readFile(planPath,'utf8'));assert.equal(plan.format,'abu-mustafa-cloudflare-media-v1');
// Validate the entire inventory before the first upload. No shell interpolation.
for(const f of plan.files){assert.match(f.object_key,/^[a-zA-Z0-9_./-]+$/);assert.ok(!f.object_key.split('/').includes('..'));const bytes=await readFile(f.file);assert.equal(bytes.length,f.size);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
for(const f of plan.files){const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',bucket+'/'+f.object_key,'--file',f.file,'--content-type',f.content_type,'--remote'],{stdio:'inherit'});assert.equal(result.status,0,'Upload failed; stop and inspect before retrying');}
console.log('Uploaded '+plan.files.length+' verified media files.');

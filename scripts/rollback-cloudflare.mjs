// Safe rollback to a pre-optimization release. Never restore an old data snapshot.
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {deploymentEnv} from './deployment-env.mjs';
import {exportDatabase} from './safe-cloudflare-export.mjs';
const production=process.argv.includes('--production');
if(!production&&!process.argv.includes('--preview'))throw Error('Specify --preview or --production');
if(production&&process.argv.includes('--preview'))throw Error('Choose one target');
const at=process.argv.indexOf('--version'),version=at<0?'':process.argv[at+1];
if(!/^[0-9a-f-]{36}$/.test(version||''))throw Error('Specify the verified Worker version with --version UUID');
const config=production?'wrangler.json':'wrangler.preview.json';
const env={...deploymentEnv(process.env),CI:'true'};
const run=args=>{const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args,'--config',config],{stdio:'inherit',env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);};
await mkdir('backups',{recursive:true});
exportDatabase(['node_modules/wrangler/bin/wrangler.js','d1','export','DB','--remote','--output','backups/pre-rollback-'+Date.now()+'.sql','--config',config],env);
// Removing the revision table makes the new Worker immediately fall back to D1.
// D1 executes the file transactionally; no business rows are removed.
run(['d1','execute','DB','--remote','--file','scripts/rollback-cost-cache.sql']);
run(['rollback',version,'--yes','--message','Reviewed rollback; cache migration removed, business data retained']);

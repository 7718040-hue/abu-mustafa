// Updates existing sites only. Never imports a snapshot or replaces business data.
import {spawnSync} from 'node:child_process';
import {deploymentEnv} from './deployment-env.mjs';
import {readFile,mkdir} from 'node:fs/promises';
const production=process.argv.includes('--production');
if(!production&&!process.argv.includes('--preview'))throw Error('Choose --preview or --production explicitly');
if(production&&process.argv.includes('--preview'))throw Error('Choose one target');
const configPath=production?'wrangler.json':'wrangler.preview.json';
const config=JSON.parse(await readFile(configPath,'utf8'));
const expected=production?['abu-mustafa-cloudflare','033a633e-1d39-4f26-aecf-2a333d4602ef']:['abu-mustafa-cost-preview','0460986f-42b9-4d53-9703-7e9e93fa19e8'];
if(config.name!==expected[0]||config.d1_databases[0].database_id!==expected[1])throw Error('Target changed: review deployment configuration');
if(production&&config.vars.PUBLIC_INDEXING!=='enabled-after-owner-approval')throw Error('Production indexing must be preserved');
if(!production&&config.vars.PUBLIC_INDEXING!=='disabled')throw Error('Preview must stay noindex');
const env={...deploymentEnv(process.env),CI:'true',PUBLIC_ORIGIN:config.vars.PUBLIC_ORIGIN,PUBLIC_INDEXING:config.vars.PUBLIC_INDEXING};
const run=args=>{const result=spawnSync(process.execPath,args,{stdio:'inherit',env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);};
run(['scripts/deploy-check.mjs','--config',configPath]);
await mkdir('backups',{recursive:true});
const backup='backups/'+config.name+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sql';
const cli=['node_modules/wrangler/bin/wrangler.js'];
run([...cli,'d1','export','DB','--remote','--config',configPath,'--output',backup]);
// The RETURNING-compatible code must be live before revision triggers exist.
run([...cli,'deploy','--config',configPath]);
run([...cli,'d1','migrations','apply','DB','--remote','--config',configPath]);
// Idempotent reinstall also works after the documented rollback removed triggers.
run([...cli,'d1','execute','DB','--remote','--config',configPath,'--file','drizzle/0005_public_catalog_revision.sql']);
console.log('Update complete. Business data retained. Backup: '+backup);

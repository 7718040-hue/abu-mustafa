import {spawnSync} from 'node:child_process';
const run=args=>{const r=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,PUBLIC_ORIGIN:'https://cloudflare-preview.example'}});if(r.status!==0)process.exit(r.status||1);};
run(['tests/deployment-env.test.mjs']);
run(['tests/safe-cloudflare-export.test.mjs']);
for(const config of ['wrangler.json','wrangler.preview.json'])run(['scripts/deploy-check.mjs','--config',config]);
run(['scripts/build-worker.mjs','--test-core']);
for(const file of process.argv.includes('--cloudflare-only')?['cloudflare']:['catalog','requirements','presentation','seo','cloudflare','transfer-copy','cost','cache-failures','assets-build'])run(['tests/'+file+'.test.mjs']);

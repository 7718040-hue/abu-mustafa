import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),state=await mkdtemp(path.resolve('.local-state-test-build-'));
const build=()=>{const r=spawnSync(process.execPath,[path.join(root,'scripts/build-worker.mjs')],{cwd:state,encoding:'utf8',env:{...process.env,PUBLIC_ORIGIN:'https://asset-test.example'}});assert.equal(r.status,0,r.stderr);};
try{
 for(const name of ['public','content','worker','wrangler.json'])await cp(name,path.join(state,name),{recursive:true});
 build();const before=JSON.parse(await readFile(path.join(state,'dist/static-paths.json'),'utf8'));
 const file=path.join(state,'public/app.js');await writeFile(file,(await readFile(file,'utf8'))+'\n// unrelated application update\n');
 build();const after=JSON.parse(await readFile(path.join(state,'dist/static-paths.json'),'utf8'));
 assert.notEqual(before['/app.js'],after['/app.js']);
 for(const [name,url] of Object.entries(before))if(name!=='/app.js')assert.equal(after[name],url,'unchanged asset must keep browser cache: '+name);
 const css=await readFile(path.join(state,'dist/client'+after['/style.css']),'utf8');assert.ok(css.includes(after['/assets/fonts/tajawal-400.ttf']));
 console.log('PASS JS-only update keeps all unchanged image/font/style cache keys and CSS references fingerprinted fonts');
}finally{await rm(state,{recursive:true,force:true});}

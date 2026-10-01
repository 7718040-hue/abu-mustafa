import { build } from 'esbuild';
import { cp, mkdir, rm, readFile } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await cp('public','dist/client',{recursive:true});
for(const file of ['report.html','research-bundle.zip','image-manifest.json'])await rm('dist/client/'+file,{force:true});
// Dynamic routes always reach the Worker; no stale static catalog shadows edits.
await rm('dist/client/index.html',{force:true});
await rm('dist/client/products.json',{force:true});
await rm('dist/client/catalog.csv',{force:true});
// robots.txt is environment-aware and must always come from the Worker.
await rm('dist/client/robots.txt',{force:true});
// The hosting asset router normalizes .html URLs before the Worker. Keep the
// original Google file in public as evidence, but serve its exact path in Worker.
await rm('dist/client/google423f0fde26d818a9.html',{force:true});
const products=JSON.parse(await readFile('content/products.json','utf8'));
for(const p of products) await rm('dist/client/products/'+p.id,{recursive:true,force:true});
await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',external:['cloudflare:workers']});
await mkdir('dist/.openai',{recursive:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built live catalog Worker, static assets and database migrations.');

import {build} from 'esbuild';
import {cp,mkdir,rm,readFile,readdir,writeFile} from 'node:fs/promises';
const config=JSON.parse(await readFile('wrangler.json','utf8'));
const raw=process.env.PUBLIC_ORIGIN||config.vars.PUBLIC_ORIGIN;
const url=new URL(raw);
if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_ORIGIN must be an HTTPS origin without a path');
const origin=url.origin,previous='https://abu-mustafa-ibb.classy-ape-4617.chatgpt.site';
const portable=text=>text.replaceAll(previous,origin).replaceAll(encodeURIComponent(previous),encodeURIComponent(origin)).replaceAll(encodeURI(previous),encodeURI(origin)).replaceAll(new URL(previous).host,new URL(origin).host);
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await cp('public','dist/client',{recursive:true});
for(const file of ['report.html','research-bundle.zip','image-manifest.json','index.html','products.json','catalog.csv','robots.txt','google423f0fde26d818a9.html'])await rm('dist/client/'+file,{force:true});
// Current products are rendered from D1. Keep only the 11 explicitly documented
// archive URLs; no stale generated catalog page may shadow an edited product.
const legacy=JSON.parse(await readFile('content/legacy-products.json','utf8'));
const archiveIds=new Set(legacy.map(p=>p.id));
for(const entry of await readdir('dist/client/products',{withFileTypes:true})){
  const dir='dist/client/products/'+entry.name;
  if(!entry.isDirectory()||!archiveIds.has(entry.name)){await rm(dir,{recursive:true,force:true});continue;}
  const file=dir+'/index.html';const html=await readFile(file,'utf8');
  await writeFile(file,portable(html));
}
const portableJson={name:'portable-origin',setup(b){b.onLoad({filter:/content[\\/].*\.json$/},async args=>({contents:portable(await readFile(args.path,'utf8')),loader:'json'}));}};
const options={bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],define:{__PUBLIC_ORIGIN__:JSON.stringify(origin)},plugins:[portableJson]};
await build({...options,entryPoints:['worker/cloudflare.mjs'],outfile:'dist/server/index.js'});
if(process.argv.includes('--test-core'))await build({...options,entryPoints:['worker/index.mjs'],outfile:'dist/server/core-test.js'});
console.log('Built Cloudflare Worker and assets for '+origin+'; no Sites hosting manifest included.');

import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {cp,mkdir,rm,readFile,readdir,writeFile} from 'node:fs/promises';
const configIndex=process.argv.indexOf('--config');
const config=JSON.parse(await readFile(configIndex>=0?process.argv[configIndex+1]:'wrangler.json','utf8'));
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
// Only public static files can bypass the Worker. Archived HTML and all
// administrative/API routes still pass through the existing security adapter.
await cp('dist/client/assets/photos','dist/client/product-images',{recursive:true});
async function filesAt(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){
  const path=dir+'/'+e.name;if(e.isDirectory())files.push(...await filesAt(path));else files.push(path);
}return files;}
const publicFiles=[...await filesAt('dist/client/assets'),...await filesAt('dist/client/product-images'),
  ...['style.css','app.js','admin.css','admin.js','favicon.ico'].map(p=>'dist/client/'+p)].sort();
const assetHash=createHash('sha256');
for(const file of publicFiles){assetHash.update(file.slice(11));assetHash.update(await readFile(file));}
const prefix='/static/'+assetHash.digest('hex').slice(0,24),staticPaths={};
for(const file of publicFiles)staticPaths['/'+file.slice(12)]=prefix+'/'+file.slice(12);
for(const file of publicFiles){
  const target='dist/client'+staticPaths['/'+file.slice(12)];await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
  if(file.endsWith('.css')){
    let css=await readFile(file,'utf8');
    css=css.replace(/\/assets\/[A-Za-z0-9_./-]+/g,path=>staticPaths[path]||path);await writeFile(target,css);
  }else await cp(file,target);
}
await writeFile('dist/static-paths.json',JSON.stringify(staticPaths,null,2));
const robots=(process.env.PUBLIC_INDEXING||config.vars.PUBLIC_INDEXING)==='enabled-after-owner-approval'?'index, follow, max-image-preview:large':'noindex, nofollow, noarchive';
await writeFile('dist/client/_headers',`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Robots-Tag: ${robots}
/assets/*
  Cache-Control: public, max-age=86400
/product-images/*
  Cache-Control: public, max-age=86400
/static/*
  Cache-Control: public, max-age=2592000, immutable
/style.css
  Cache-Control: no-cache
/app.js
  Cache-Control: no-cache
/admin.css
  Cache-Control: no-cache
/admin.js
  Cache-Control: no-cache
`);
const portableJson={name:'portable-origin',setup(b){b.onLoad({filter:/content[\\/].*\.json$/},async args=>({contents:portable(await readFile(args.path,'utf8')),loader:'json'}));}};
const cacheBuild=createHash('sha256');
for(const name of (await readdir('worker')).filter(n=>n.endsWith('.mjs')).sort())cacheBuild.update(await readFile('worker/'+name));
for(const name of (await readdir('content')).filter(n=>n.endsWith('.json')).sort())cacheBuild.update(await readFile('content/'+name));
cacheBuild.update(origin);cacheBuild.update(prefix);
const options={bundle:true,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers'],define:{__STATIC_PATHS__:JSON.stringify(staticPaths),__PUBLIC_ORIGIN__:JSON.stringify(origin),__CACHE_BUILD__:JSON.stringify(cacheBuild.digest('hex').slice(0,24))},plugins:[portableJson]};
await build({...options,entryPoints:['worker/cloudflare.mjs'],outfile:'dist/server/index.js'});
if(process.argv.includes('--test-core'))await build({...options,entryPoints:['worker/index.mjs'],outfile:'dist/server/core-test.js'});
console.log('Built Cloudflare Worker and assets for '+origin+'; no Sites hosting manifest included.');

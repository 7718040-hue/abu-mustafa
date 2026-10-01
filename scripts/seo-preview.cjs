// Local-only, read-only storefront preview. This does not change hosted access or indexing.
const http=require('node:http');
const {Readable}=require('node:stream');
const {createRuntime}=require('./local-runtime.cjs');
(async()=>{
 const runtime=await createRuntime({publicIndexing:true});
 const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Read-only SEO preview');}
  if(req.url.startsWith('/admin')||req.url.startsWith('/api/')){res.writeHead(403);return res.end('Administration is not enabled in this preview');}
  try{
   const r=await runtime.dispatchFetch('http://127.0.0.1:3001'+req.url,{method:req.method,redirect:'manual'});
   res.writeHead(r.status,Object.fromEntries(r.headers));
   if(req.method==='HEAD'||!r.body)res.end();else Readable.fromWeb(r.body).pipe(res);
  }catch(error){console.error(error.message);res.writeHead(503);res.end('Preview unavailable');}
 });
 server.listen(3001,'127.0.0.1',()=>console.log('SEO preview ready: http://127.0.0.1:3001/ (loopback only, read-only)'));
 const stop=()=>{server.close();runtime.dispose().finally(()=>process.exit(0));};
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
})().catch(error=>{console.error(error);process.exitCode=1;});

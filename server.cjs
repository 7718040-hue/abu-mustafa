// Supervised local preview server; never part of the hosted Worker bundle.
const http=require('http'),fs=require('fs'),path=require('path');
const {Readable}=require('stream');
const {createRuntime}=require('./scripts/local-runtime.cjs');
const args=process.argv,port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||3000;
const vars=fs.existsSync(path.join(__dirname,'.dev.vars'))?fs.readFileSync(path.join(__dirname,'.dev.vars'),'utf8'):'';
const previewOwner=/^LOCAL_ADMIN_PREVIEW=true$/m.test(vars);
(async()=>{
  const mf=await createRuntime();
  const server=http.createServer(async(req,res)=>{
    try{
      const localUrl=new URL(req.url,'http://terminal.local:4173');
      const qaFiles={'/__qa-responsive':'qa-responsive.html','/__qa-metrics.js':'qa-metrics.js'};
      if(qaFiles[localUrl.pathname]){const file=path.join(__dirname,'tests/fixtures',qaFiles[localUrl.pathname]);res.writeHead(200,{'content-type':localUrl.pathname.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(fs.readFileSync(file));}
      const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value&&!key.startsWith('oai-authenticated-user-')&&key!=='host')headers.set(key,Array.isArray(value)?value.join(','):value);
      if(previewOwner){headers.set('oai-authenticated-user-id','local-preview-owner');headers.set('oai-authenticated-user-email','owner@preview.test');}
      const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>9*1024*1024){res.writeHead(413);return res.end('Upload too large');}chunks.push(chunk);}
      const options={method:req.method,headers,redirect:'manual'};if(!['GET','HEAD'].includes(req.method))options.body=Buffer.concat(chunks);
      const result=await mf.dispatchFetch('http://terminal.local:4173'+req.url,options);
      if(localUrl.searchParams.has('__qa')&&result.headers.get('content-type')?.includes('text/html')){const body=(await result.text()).replace('</body>','<script src="/__qa-metrics.js" defer></script></body>');const responseHeaders=Object.fromEntries(result.headers);delete responseHeaders['content-length'];res.writeHead(result.status,responseHeaders);return res.end(body);}
      res.writeHead(result.status,Object.fromEntries(result.headers));if(result.body)Readable.fromWeb(result.body).pipe(res);else res.end();
    }catch(error){console.error('Local preview request:',error.message);res.writeHead(503);res.end('Preview unavailable');}
  });
  server.listen(port,'0.0.0.0',()=>console.log('Catalog preview listening on '+port));
  const shutdown=()=>{server.close();mf.dispose().finally(()=>process.exit(0));};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
})();

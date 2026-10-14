// Local-only browser verification. No hosted credentials or production mutations.
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {chromium}=process.env.PLAYWRIGHT_MODULE?createRequire(process.env.PLAYWRIGHT_MODULE)('playwright'):require('playwright');
const http=require('node:http'),{Readable}=require('node:stream'),fs=require('node:fs/promises'),path=require('node:path');
const {createRuntime}=require('../scripts/local-runtime.cjs');
(async()=>{
 const state=await fs.mkdtemp(path.resolve('.local-state-test-browser-'));
 let runtime,browser,server;const results=[];
 try{
  runtime=await createRuntime({stateDirectory:state,publicIndexing:true});
  server=http.createServer(async(req,res)=>{try{
   if(!['GET','HEAD'].includes(req.method)||/^\/(admin|api\/admin)/.test(req.url)){res.writeHead(403);res.end();return;}
   const r=await runtime.dispatchFetch('http://127.0.0.1'+req.url,{method:req.method});res.writeHead(r.status,Object.fromEntries(r.headers));if(r.body)Readable.fromWeb(r.body).pipe(res);else res.end();
  }catch(e){res.writeHead(500);res.end(String(e));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  for(const width of [390,1366]){
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});let page=await context.newPage();const errors=[];
   context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.product-card').count(),35);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal viewport overflow');
   await page.locator('#search').fill('zz-no-matching-product');assert.equal(await page.locator('.product-card:visible').count(),0);
   await page.locator('#search').fill('');assert.equal(await page.locator('.product-card:visible').count(),12);
   await page.locator('#load-more').click();await page.locator('#load-more').click();assert.equal(await page.locator('.product-card:visible').count(),35);
   for(const card of await page.locator('.product-card').all()){await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(img=>img.decode());}
   await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode())));
   await fs.mkdir('.browser-test',{recursive:true});await page.screenshot({path:'.browser-test/home-'+width+'.png',fullPage:false});
   await page.locator('.quick-button').first().click();await page.waitForLoadState('networkidle');
   assert.ok(new URL(page.url()).pathname.startsWith('/products/'));
   assert.ok(await page.locator('script[type="application/ld+json"]').count());
   await page.waitForFunction(()=>document.querySelector('.detail-image')?.complete&&document.querySelector('.detail-image').naturalWidth>0);
   const thumbnails=page.locator('[data-image]');
   if(await thumbnails.count()>1){await thumbnails.nth(1).click();await page.waitForFunction(()=>document.querySelector('.detail-image').complete&&document.querySelector('.detail-image').naturalWidth>0);}
   await page.locator('[data-zoom]').first().click();await page.locator('#zoom-dialog[open]').waitFor();await page.locator('#zoom-dialog [data-close]').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'product page fits viewport');
   await page.close();page=await context.newPage();const session=await context.newCDPSession(page);await session.send('Network.enable');let cached=0;
   session.on('Network.requestServedFromCache',()=>cached++);session.on('Network.responseReceived',e=>{if(e.response.fromDiskCache)cached++;});
   await page.goto(origin,{waitUntil:'networkidle'});assert.ok(cached>0,'returning visitor reuses browser cache');
   const broken=await page.locator('img').evaluateAll(images=>images.filter(i=>i.complete&&i.currentSrc&&!i.naturalWidth).map(i=>i.currentSrc));
   assert.deepEqual(broken,[]);assert.deepEqual(errors,[]);
   results.push({width,products:35,search:true,galleryAndZoom:true,productPage:true,overflow:false,errors,cachedRequestsOnReturn:cached});await context.close();
  }
  await fs.writeFile('docs/browser-cost-results.json',JSON.stringify({scope:'Local Chromium, desktop/mobile viewport, public storefront',results},null,2)+'\n');console.log(JSON.stringify(results));
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));if(runtime)await runtime.dispose();await fs.rm(state,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

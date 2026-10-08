import {createRemoteJWKSet,jwtVerify} from 'jose';
const keySets=new Map();
function productionKeySet(domain){
  if(!keySets.has(domain)){
    if(keySets.size>=8)keySets.clear();
    keySets.set(domain,createRemoteJWKSet(new URL(domain+'/cdn-cgi/access/certs'),{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:600000}));
  }
  return keySets.get(domain);
}
function configuration(env){
  const domain=String(env.ACCESS_TEAM_DOMAIN||'').trim().replace(/\/$/,'');
  const audience=String(env.ACCESS_AUD||'').trim();
  if(!/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(domain)||!/^[a-f0-9]{64}$/.test(audience))return null;
  return {domain,audience};
}
function denied(request,status,message){
  const api=new URL(request.url).pathname.startsWith('/api/');
  const body=api?JSON.stringify({error:message}):'<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دخول الإدارة</title><main style="max-width:640px;margin:80px auto;padding:24px;font-family:system-ui"><h1>دخول الإدارة محمي</h1><p>'+message+'</p><a href="/">العودة إلى الموقع</a></main></html>';
  return new Response(body,{status,headers:{'content-type':api?'application/json; charset=utf-8':'text/html; charset=utf-8','cache-control':'private, no-store','x-robots-tag':'noindex, nofollow, noarchive','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
// The only production entry calls this adapter. Untrusted Sites identity headers
// are removed before any database access, even on public routes.
export function createAccessAdapter(core,{getKeySet=productionKeySet}={}){
  return {async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    const protectedRoute=path==='/admin'||path.startsWith('/admin/')||path==='/api/admin'||path.startsWith('/api/admin/');
    const headers=new Headers(request.headers);
    for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-user-'))headers.delete(key);
    const token=headers.get('cf-access-jwt-assertion');headers.delete('cf-access-jwt-assertion');
    const config=configuration(env);
    if(protectedRoute&&!config)return denied(request,503,'لم يكتمل إعداد Cloudflare Access. راجع دليل الإعداد ثم أعد المحاولة.');
    if(protectedRoute&&!token)return denied(request,401,'سجّل الدخول بواسطة بريدك المصرّح به عبر Cloudflare Access. يجب حماية مسارات الإدارة من إعدادات الاستضافة.');
    if(token&&config){
      try{
        if(token.length>16384)throw Error('Oversized token');
        const {payload}=await jwtVerify(token,getKeySet(config.domain),{issuer:config.domain,audience:config.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],clockTolerance:5});
        if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(payload.email)||payload.type!=='app')throw Error('Human identity required');
        headers.set('oai-authenticated-user-id','cloudflare:'+payload.sub);
        headers.set('oai-authenticated-user-email',payload.email.trim().toLowerCase());
      }catch(error){if(protectedRoute)return denied(request,403,'تعذّر التحقق من تسجيل الدخول. افتح لوحة التحكم من رابط الموقع وأعد تسجيل الدخول.');}
    }
    // Search Console ownership must be verified again for the new hostname.
    if(path==='/google423f0fde26d818a9.html')return new Response('Not found',{status:404,headers:{'x-robots-tag':'noindex'}});
    return core.fetch(new Request(request,{headers}),env,ctx);
  }};
}

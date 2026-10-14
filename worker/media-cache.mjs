// Uploads receive unique IDs and are never overwritten. Cache only successful
// public image reads, with no cookies, identity headers, or error responses.
export async function publicMedia(request, env, load, cache=globalThis.caches?.default) {
  const url=new URL(request.url);
  const key=new Request(url.origin+'/.internal-cache/media/v1/'+encodeURIComponent(env.PUBLIC_INDEXING||'disabled')+url.pathname);
  const enabled=cache&&env.PUBLIC_MEDIA_CACHE!=='disabled';
  if(enabled){try{const hit=await cache.match(key);if(hit)return clientResponse(hit,request);}catch{}}
  const result=await load();
  if(result.status===200&&enabled&&request.method==='GET'){
    try{const copy=new Response(result.clone().body,result);copy.headers.set('cache-control','public, max-age=86400');await cache.put(key,copy);}catch{}
  }
  return clientResponse(result,request);
}
function clientResponse(response,request){
  const headers=new Headers(response.headers);
  // Keep the existing browser freshness period; this optimization shares reads
  // between visitors at the edge without changing the image retention promise.
  if(response.status===200)headers.set('cache-control','private, max-age=86400');
  const tag=headers.get('etag'),condition=request.headers.get('if-none-match');
  if(response.status===200&&tag&&condition&&condition.split(',').some(value=>value.trim()==='*'||value.trim().replace(/^W\//,'')===tag.replace(/^W\//,'')))return new Response(null,{status:304,headers});
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
}

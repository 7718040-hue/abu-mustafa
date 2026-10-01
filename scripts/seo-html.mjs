// The hosting layer appends a request-specific Cloudflare security script.
// Ignore only that injected script when comparing visitor markup. Never modify the served page.
export function siteBody(html){
 return (html.match(/<body[^>]*>(.*?)<\/body>/s)?.[1]||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,
  tag=>tag.includes('/cdn-cgi/challenge-platform/scripts/jsd/main.js')?'':tag);
}

// Generated at build time; paths change whenever bundled asset bytes change.
const paths = typeof __STATIC_PATHS__ === 'object' ? __STATIC_PATHS__ : {};
export function versionedHtml(html) {
  return html.replace(/(["'=])((?:\/assets\/|\/product-images\/)[A-Za-z0-9_./-]+|\/(?:style\.css|app\.js|admin\.css|admin\.js|favicon\.ico))(?=[?"'#)\s<])/g,
    (match, lead, path) => lead + (paths[path] || path));
}

// A page already open during a deployment can still reference the previous hash.
// Redirect only known public assets; never serve new bytes as immutable old bytes.
export function relocatedAsset(path) {
  const match=path.match(/^\/static\/[a-f0-9]{24}(\/.*)$/);
  const target=match&&paths[match[1]];
  return target&&target!==path?target:null;
}

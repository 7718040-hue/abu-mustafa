// Generated at build time; paths change whenever bundled asset bytes change.
const paths = typeof __STATIC_PATHS__ === 'object' ? __STATIC_PATHS__ : {};
export function versionedHtml(html) {
  return html.replace(/(["'=])((?:\/assets\/|\/product-images\/)[A-Za-z0-9_./-]+|\/(?:style\.css|app\.js|admin\.css|admin\.js|favicon\.ico))(?=[?"'#)\s<])/g,
    (match, lead, path) => lead + (paths[path] || path));
}

// Public catalog only. Never put rendered HTML, identity, or admin data here.
// D1 triggers change the revision in the same transaction as every content edit.
// A cache failure or missing migration safely falls back to the existing reads.
const build = typeof __CACHE_BUILD__ === 'string' ? __CACHE_BUILD__ : 'local-test';
export async function publicCatalog(env, origin, load, cache = globalThis.caches?.default) {
  if (!cache || env.PUBLIC_CATALOG_CACHE === 'disabled') return load();
  const revision = async () => (await env.DB.prepare('SELECT revision FROM public_catalog_revision WHERE id=1').first())?.revision;
  let before;
  try { before = await revision(); } catch { return load(); }
  if (!before) return load();
  const key = new Request(new URL('/.internal-cache/catalog/' + build + '/' + before, origin));
  try {
    const hit = await cache.match(key);
    if (hit) {
      const value = await hit.json();
      if (value.revision === before && value.catalog && Array.isArray(value.catalog.products) && value.catalog.presentation) return value.catalog;
    }
  } catch { /* An unavailable or invalid cache must not break the catalog. */ }
  const catalog = await load();
  try {
    // Do not retain a mixed snapshot if a write happened while reading the tables.
    if (await revision() === before) await cache.put(key, new Response(JSON.stringify({revision: before, catalog}), {
      headers: {'content-type': 'application/json', 'cache-control': 'public, max-age=86400'}
    }));
  } catch { /* The database result is still valid without caching. */ }
  return catalog;
}

# Cost optimization checkpoint
Date: 2026-10-14 (Asia/Aden)
Goal: reduce Cloudflare usage without losing functionality, verify in isolated staging before production.
Authorization: user approved implementation, testing, GitHub versioning, and persistent progress notes.
Production baseline: c221817c-9d01-4ee3-9a62-6859705a1832 (100% traffic), script ETag 08214614ab00e9ca922ef31a79625562f28a6a5e5385d9bfdc148993f17fb1d4.
Production indexing is enabled-after-owner-approval. Preserve this when eventually deploying production; staging must be noindex.
Source: origin/cloudflare-hosting (remote latest eef19a39, NOT old local 41c6cee).
Work folder: E:/abu-mustafa-website/cloudflare-cost-optimization-2026-10-14
Branch: cost-optimization
Completed: new independent clone; inspected baseline code and live versions; no production mutations.
Next: match remote to production, run existing suite baseline; implement cost changes with regression tests; staging isolated data; report measured before/after. Configure auto deploy only after tested release workflow.
Do not count edge-only HTTP checks as proof of accessibility on user mobile network. DNS issue separate.
Keep secrets out of Git and notes. Synced ChatGPT sources are read-only.

Baseline: catalog/requirements/presentation/SEO/Cloudflare suites passed; transfer-copy failed solely because Git CRLF conversion changed database.json bytes. Confirmed LF SHA256 matches original manifest exactly; protected snapshot bytes using .gitattributes, no manifest weakening.
Implemented pending verification: public-only revision cache, additive D1 invalidation triggers, build-scoped keys; admin remains uncached; quick-view uses existing product thumbnails.

Regression found and fixed before deployment: D1 meta.changes includes trigger side effects. Bulk copy/move now count SQL RETURNING ids, preserving atomic all-or-nothing guards. Migration requires new Worker first (cache falls back when migration absent). Rollback to old Worker must disable cache and remove new triggers first; test this explicitly.

2026-10-14 checkpoint: Existing regression suites passed through transfer-copy (116 transfer checks, 35 products, 12 byte-identical uploaded images). Added cost runtime test passed: warm public catalog 8 queries/145 rows -> 1 query/1 row; warm media 1 D1 +1 R2 -> 0/0; 47 fingerprinted homepage assets bypass Worker. These are local measured results, not full-site guaranteed savings.
Created preview-only D1 0460986f-42b9-4d53-9703-7e9e93fa19e8 and R2 abu-mustafa-cost-preview-photos. Access app 0a1ea5e6-1bc3-4695-8cf1-65c37f2f0981, owner-only policy cbe1490a-2bd5-4894-9b07-0be42389960f; production Access unchanged. Wrangler OAuth and Git push dry-run succeed.
Latest user constraint: preserve crawler access, public indexing, server-rendered products, JSON-LD, catalog/CSV/sitemap/llms feeds and crawlable images. Only preview has noindex. No promise of inclusion in AI answers.
Next: finish preview setup/deploy, browser testing, cache failure/race and rollback tests, CI/GitHub release setup, review production cutover.

Preview initialization succeeded (12 verified uploaded images); deployed Worker version after owner secret b5a01691-aca4-4520-a479-39203d8e636e. Production version rechecked unchanged. Local full existing suite: 84+35+28+75+40+116 checks passed. Expanded cost tests passed content post/review invalidation, rollback business-data retention, legacy meta.changes compatibility, and forward reinstall. Failure/race/cache tests passed. Browser initial tests passed at 390/1366; extended all-image decode verification underway. DNS ENOTFOUND persists on local network; public web tool also cannot open preview. Cloudflare Builds tokens list empty; CUA initialization fails (kernel asset path missing). CI/release files and safe data-preserving deploy scripts prepared, not yet committed/pushed. Need hosted HTTP validation, CI, draft PR and user-side GitHub deployment credential/environment setup.

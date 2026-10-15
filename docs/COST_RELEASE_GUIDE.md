# Cost optimization and versioned releases

Production has NOT been updated. Current reviewed baseline is Cloudflare version
`c221817c-9d01-4ee3-9a62-6859705a1832`; source branch `cloudflare-hosting`, commit
`eef19a39a077f91b2bd6e956041cbc7d5b870b9d`.

## Behavior and savings
- Public static files bypass Worker execution. Each asset has its own content fingerprint, so editing JavaScript preserves unchanged image/font URLs. Requests for missing previous fingerprints fall through to a noncached redirect for known public files only; dynamic catalog/admin routes always run the Worker. Their content-versioned paths allow 30-day browser caching. Original image URLs remain available to crawlers.
- Public catalog cache stores data only, not identity, admin responses, or HTML. Every request reads a revision row, and D1 triggers invalidate after content edits.
- Uploaded image edge cache removes repeated D1/R2 reads. An edge cache hit still invokes the Worker; browser cache hits avoid network requests while fresh. Caches can be evicted.
- HTML remains fresh; prices and availability are not frozen for a month. JSON-LD, SSR product pages, sitemap, catalog feeds, and llms.txt remain supported. No guarantee of AI answer inclusion.
- Admin and role checks remain uncached. No new recurring service or paid plan was enabled.
- Local measured warm catalog: 8 queries / 145 rows -> 1 query / 1 row. Cold caches and content edits still require original reads plus revision checks. Content writes add small revision-trigger writes.
- The sample is not a visitor quota or a guarantee of zero bills. Staging shares the account quotas. R2 overage and account plan must be checked separately.

## Isolated preview
Worker `abu-mustafa-cost-preview`, D1 `0460986f-42b9-4d53-9703-7e9e93fa19e8`, R2 `abu-mustafa-cost-preview-photos`.
URL: https://abu-mustafa-cost-preview.abumustafacenter.workers.dev/
Admin: https://abu-mustafa-cost-preview.abumustafacenter.workers.dev/admin/
Owner-only Cloudflare Access. Preview is noindex; production indexing remains enabled.
Preview data comes from the validated repository transfer snapshot, not a fresh production export.

## Update and rollback
1. Work on a branch and pass `npm ci` then `npm test`. Node 24 is used in CI.
2. Preview updates: `node scripts/update-cloudflare.mjs --preview`.
3. Review preview, mobile rendering, images, login, owner/supervisor operations and public indexing invariants before production approval.
4. After approval, merge the reviewed PR to `cloudflare-hosting`, then create a unique tag and GitHub Release (for example a new `v2.1.x` tag). Never move/reuse an existing release tag.
5. Published non-prerelease GitHub Releases trigger the release workflow. It verifies the commit belongs to `cloudflare-hosting`, retests, exports D1, deploys compatible code BEFORE applying cache triggers, and never imports old business data.
6. Configure the GitHub `production` environment with a required human reviewer and `CLOUDFLARE_API_TOKEN` secret before enabling releases. The token needs Workers Scripts edit and D1 edit for this Cloudflare account. Enter it in GitHub Settings, never in chat or Git. These settings are NOT yet configured or verified.
7. Emergency rollback to the pre-optimization baseline: `node scripts/rollback-cloudflare.mjs --production --version c221817c-9d01-4ee3-9a62-6859705a1832`.
   The script exports current D1, removes only cache triggers/table, then rolls back Worker code. It preserves business content and images. Do not use the dashboard rollback alone for this old version: triggers change D1 meta.changes and can break old bulk-operation guards.
8. Reinstall after rollback with the normal update script. The idempotent revision migration is deliberately rerun even if the migration journal already contains it.

D1 export files are in ignored `backups/`. On hosted CI runners these are temporary; D1 Time Travel is a separate recovery mechanism. Download a current backup locally before a reviewed production release and preserve it privately; do not upload private content as a public workflow artifact.

## Automated preview connection
Cloudflare currently has no build token in its Builds token list; no auto-deploy connection is claimed.
Either configure GitHub Actions deployment secrets or connect GitHub from the Cloudflare Worker Settings > Builds page. For preview choose repository `7718040-hue/abu-mustafa`, branch `cost-optimization`, tests `npm test`, deployment command `node scripts/update-cloudflare.mjs --preview`. Do not connect a broad branch wildcard to production.

## Verification limits
The current local network returns ENOTFOUND for workers.dev; no statement that ordinary mobile access is fixed is justified. DNS/ISP reachability is separate from code optimization. Hosted preview HTTP validation is required before cutover.
Browser QA script: `node tests/browser-cost.cjs` with installed Playwright/Chromium. It tests 390px and 1366px viewports, all 35 product cards, search/pagination, details/gallery/zoom, errors, overflow, and cache reuse after reopening a page in the same browser context. It does not simulate a month of storage or guarantee cache persistence after eviction.

## 2026-10-15 verification update
The user confirmed successful preview admin access and a login prompt in private browsing. This is a user-reported authentication check; it does not verify every admin action or prove access without VPN. The previous independent GitHub CI run is https://github.com/7718040-hue/abu-mustafa/actions/runs/38516007310 and the draft review is https://github.com/7718040-hue/abu-mustafa/pull/1. Additional per-file-fingerprint routing changes passed the full local suite and browser tests at 390px/1366px; they are not yet deployed.

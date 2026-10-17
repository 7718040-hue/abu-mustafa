# Cloudflare cost optimization: current release and recovery

## Published state (verified 2026-10-17)

Production: https://abu-mustafa-cloudflare.abumustafacenter.workers.dev/
Admin: https://abu-mustafa-cloudflare.abumustafacenter.workers.dev/admin/

- Cloudflare Worker version: `00bf2b32-0228-423e-9ac0-1770b80ab6f3`, 100% traffic.
- Deployed source: `332cadcc9008bc2ee59b0cbbb60b1f658daef7af` on `cost-optimization`.
- Immutable release reference: `v2.1.0-cost-20261017`.
- Owner explicitly approved production publication after preview testing.
- Independent production verification: https://github.com/7718040-hue/abu-mustafa/actions/runs/39051418466
- All 35 public product pages, 47 product images, feeds, public indexing headers/robots, asset caching and the administration authentication boundary passed.
- All business-table rows were identical in private SQL exports before and after publication. The database contains 37 products in total, of which 35 are public, and 12 uploaded media records.
- Local ordinary DNS still returns ENOTFOUND. Independent HTTP success does not prove ordinary accessibility on every mobile network. Authenticated production admin mutations were not exercised.

## Behavior and measured savings

- Public static files bypass Worker execution. Per-file fingerprints preserve unchanged image/font URLs across JavaScript updates. Fresh browser copies can be reused for 30 days; a cache eviction or another browser/device still needs a download.
- Missing old fingerprints redirect only known public assets; administrative and dynamic paths remain protected.
- Public catalog data is cached; requests read one revision row. D1 triggers invalidate it when content changes. Identity and administration responses are not cached.
- Uploaded-image edge hits avoid repeated D1/R2 reads but still invoke the Worker. Browser hits avoid network requests while fresh.
- Local warm-catalog measurement: 8 queries/145 rows -> 1 query/1 row. Warm uploaded image: 1 D1 + 1 R2 -> 0/0. These are workload measurements, not a guaranteed percentage saving for all traffic.
- Content edits and cold caches require additional work. Revision triggers add small writes. Staging shares account quotas.
- HTML, prices and availability are not frozen for a month. SSR, JSON-LD, sitemap, catalog feeds and llms.txt remain public. Search indexing and AI answer inclusion are not guaranteed.

## Isolated preview

- URL: https://abu-mustafa-cost-preview.abumustafacenter.workers.dev/
- Admin: https://abu-mustafa-cost-preview.abumustafacenter.workers.dev/admin/
- Worker: `abu-mustafa-cost-preview`; last deployed version `00c797b9-c0f5-4fcd-9b2f-6e0268290d00`.
- D1: `0460986f-42b9-4d53-9703-7e9e93fa19e8`.
- R2: `abu-mustafa-cost-preview-photos`.
- Owner-only Cloudflare Access; noindex; separate business data.
- Preview initialization used the validated repository transfer snapshot. It is not a live synchronized production copy.

## Data-preserving updates and code rollback

Use Node 24 and the project's installed Wrangler. Never import an old business snapshot just to deploy or roll back code.

1. Match current remote source, test locally and in preview, then get the owner's approval for production.
2. Preview: `node scripts/update-cloudflare.mjs --preview`.
3. Production after approval: `node scripts/update-cloudflare.mjs --production`.
4. The script exports D1, deploys the compatible Worker before cache triggers, applies additive migrations, and reinstalls cache triggers idempotently. It does not replace business data or upload old media.
5. Verify with `node tests/preview-live.mjs` or `node tests/preview-live.mjs --production`. Hosted execution is needed where ordinary local DNS cannot resolve workers.dev.
6. To restore the pre-optimization code: `node scripts/rollback-cloudflare.mjs --production --version c221817c-9d01-4ee3-9a62-6859705a1832`.
7. That rollback first exports current D1, removes only revision-cache triggers/table, then restores the prior Worker. Current products/posts/images remain. The dashboard's code-only rollback is insufficient for this old Worker because revision triggers affect its old bulk-operation counting.
8. A later forward update reinstalls the cache migration even if the D1 migration journal already records it.

The baseline rollback was exercised locally with data-retention checks, not destructively tested in production. Latest private backups are under ignored `backups/`; see `COST_OPTIMIZATION_PROGRESS.md` for exact filenames. Copy them to a separate private device for independent retention. Do not upload raw SQL to public Git or public workflow artifacts.

## Automation: verified and pending

Verified: pushes to `cost-optimization` validate and update preview with its environment secret. Deployment is serialized, stale queued commits are refused, and preview smoke tests run after deployment. The successful deployed-source run is https://github.com/7718040-hue/abu-mustafa/actions/runs/39004524451 .

Production was published manually from the verified source. PR #1 remains draft; `cloudflare-hosting` has not been merged, and repository default branch is `main`. The existing release-published workflow has not been established as a working production release path on the default branch. Do not claim automatic production releases are enabled.

Before future automatic production releases, finish:

- Persistent private backup upload before mutation; hosted-runner SQL exports alone are temporary.
- Explicit approved release/ref guards, prevention of stale release jobs, and a verified production credential/approval path.
- Automatic postdeploy production smoke tests and a saved previous Worker version.
- Source-branch alignment and unique version tags; never move/reuse release tags.

The repository is currently public. The owner asked whether making it private would work; visibility has not changed. On GitHub Free, private repositories have limited Actions minutes/storage and ignore environment secrets/protection rules. A private/free deployment design must be prepared before converting, or preview automation can fail. Source visibility is independent of the Cloudflare site's public visibility. The encrypted-artifact alternative is also awaiting the owner's choice; no recovery keys have been generated.

## Test scope

Full local regression, failure/race, rollback and per-file-cache tests passed for the published source. Browser tests at 390px/1366px covered product cards, search, pagination, details/gallery/zoom, image decoding, errors, overflow and repeated visits. They do not simulate a month of cache persistence or every physical device/browser.

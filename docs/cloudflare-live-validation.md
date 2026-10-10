# Cloudflare deployment verification - 11 October 2026

The independent Worker is deployed at https://abu-mustafa-cloudflare.abumustafacenter.workers.dev. Its D1 database is abu-mustafa-cloudflare-catalog and R2 bucket is abu-mustafa-cloudflare-photos. Six migrations and the guarded initial content import completed. Later deployments preserve the imported content and any subsequent edits.

Cloudflare Access protects /admin, /admin/*, /api/admin and /api/admin/* using the same application audience. Access allows the three owner-approved email addresses through One Time PIN and uses a 168-hour session. SITE_OWNER_EMAIL is configured remotely as a Worker secret, outside Git. The two approved Abu Mustafa emails have supervisor roles in D1. The owner is bound to a stable verified identity on first owner sign-in. Supervisors cannot manage memberships or change ownership.

## Verified live

The 322 initial checks below were performed before the account subdomain rename.

- Homepage and catalog returned HTTP 200.
- 35 visible products, six categories and the published post were accessible.
- Public product names and image references matched the current Sites catalog.
- All 209 packaged PNG/WebP images matched SHA-256 fingerprints over HTTPS.
- All 12 R2 images matched their original byte sizes and SHA-256 fingerprints.
- All 47 distinct catalog image URLs returned images.
- Five administration paths redirected to Cloudflare Access even with forged Sites identity headers.
- Sitemap uses the new origin. Preview indexing remains disabled. Old Google ownership file returns 404.
- Total: 322 successful live HTTP/data/asset checks.

## DNS and remaining user checks

Normal DNS on the user's connections returned NXDOMAIN, including on mobile data. Cloudflare's DNS-over-HTTPS answered with valid A records for the hostname. TLS-verified HTTPS requests using an explicit Cloudflare edge address returned the working site and Access login challenge. This establishes that deployment and hostname routing work, while DNS resolution on the tested networks still prevents normal browser access. Browser access with an alternative DNS resolver or network still needs confirmation.

Actual owner/supervisor sign-in, upload/edit through the live UI, and phone layout remain unverified. The earlier local permission tests are separate from this live check. This deployment does not change the original Sites service or GitHub main branch. GitHub automatic deployment connection has not been configured.

## Account subdomain rename - 11 October 2026

The account subdomain changed from 7718040 to abumustafacenter. The Worker remains abu-mustafa-cloudflare. PUBLIC_ORIGIN and all four Access destinations now use abu-mustafa-cloudflare.abumustafacenter.workers.dev. The Access audience, three approved emails, One Time PIN, 168-hour session and owner secret were preserved. No business data needed URL replacement.

Worker version 36b27cda-532a-4b51-b838-cd0cf0911674 passed 98 targeted live checks: catalog origin/counts, 35 product pages, six category pages, the published post, 47 catalog images, four protected administration paths with forged identity headers, sitemap and preview robots. The homepage returned HTTP 200 with the new canonical. These HTTPS checks validated TLS while connecting directly to a Cloudflare edge.

Normal DNS for the new hostname still returns ENOTFOUND on the tested connection. Cloudflare DNS-over-HTTPS returns valid A records. Renaming has therefore not resolved ordinary browser access on the affected networks. This is not a claim of working access from every device or network. The original Sites service remains unchanged.

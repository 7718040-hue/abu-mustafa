# Private review release — 12 September 2026

## Agreed scope

- Owner-only private hosting remains unchanged. No ownership transfer, public launch, external account modification, invented prices, or fabricated reviews.
- Sticky address and burgundy/gold brand strip, full store name and subtitles, responsive horizontal carousel with supplied storefront photo (also retained in contact section), manual-interaction pause and reduced-motion support.
- Department phone directory transcribed from supplied sign; only 770525525 marked as confirmed WhatsApp. Full address includes سوق الأسلحة، جوار برج المدينة، أمام القوسي للجنابي تمامًا.
- Charcoal/gold product cards, featured flag, badge, four card themes and validated optional accent color.
- Category hierarchy, bulk move/copy, FAQs, posts/drafts, recovery and audit records.
- Original review words, customer name and rating cannot be edited after capture. Hiding a visible review or deleting one requires a reason.

## Roles

| Role | Authority |
|---|---|
| Owner | All content controls and team membership |
| Supervisor | Product names/prices/publishing/style, category structure, FAQs, post publication, moderation, recovery and audit |
| Editor | Existing product images/descriptions, new product drafts and draft posts; no structural changes, moderation, team changes or publication |

App roles are separate from private Site admission. Staff require authorized admission to the private Site before their app role can be used. No staff were granted access in production during this release.

## Verification

- 73 automated assertions passed against isolated local D1/R2, including restart persistence, role restrictions, input escaping, optimistic concurrency, category hierarchy, move/copy, uploads, all 35 current and 11 historical product pages, 47 gallery images, review immutability, FAQs, posts, restoration and private indexing.
- Browser QA in Chrome: desktop 1363px and responsive iframe containers 360px, 390px and 768px (content widths 345px, 375px and 753px due to desktop scrollbars). No horizontal document overflow or broken images in the inspected final mobile/tablet layouts.
- Checked sticky identity, mobile navigation, search returning one matching product, product editor layout, and successful FAQ save through mobile management UI. Test records live only in local preview state, not deployment artifacts.
- These tests do not constitute a guarantee of zero defects, a penetration test, or physical-device testing on every phone/browser.

## Search and internal report

Server-rendered pages, Product/FAQ/Article data and current product/image sitemap remain available within the private Site. robots.txt and noindex remain restrictive. Public indexing needs a separate approved release; AI/search visibility is not guaranteed.

The previous review report was for development QA and source documentation, not a customer-facing feature. Its three public artifact routes are removed from deployment assets. Internal source records remain recoverable in version history.

## Rollback and later handover

The prior deployed version remains a code rollback point. Re-deploying old code does not revert content/database changes; preserve an export and images before any database restoration. The migration is additive and does not delete existing content.

Ownership transfer is deferred until the developer authorizes it after payment. Before handover, export current content and media, back up source and configuration, choose the destination in the shop owner's account, verify login/roles/storage on that destination, and only then switch the domain. Do not transfer the developer's entire account or share credentials. Provider-specific steps and domain ownership must be verified at handover time.

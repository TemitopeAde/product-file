# Product File Upload — Wix support matrix

Each capability the app depends on: the Wix API or package it uses, where the code runs and as whom, the permission scope, whether the call is elevated, and its status.

**Status key**
- **Verified**: the contract is confirmed in Wix docs or the installed SDK types, the feature is implemented, and it compiles and builds.
- **Live-verify**: implemented against the documented contract, but some behavior can only be proven on a real site. It must pass before release.
- **Unavailable**: Wix does not expose the capability securely in this context. The feature is not offered.

| # | Capability | Wix API / package | Runs in / identity | Scope (Dev Center → Permissions) | Elevated | Status |
|---|---|---|---|---|---|---|
| 1 | Verify the caller and derive the instance | `auth.getTokenInfo()` — `@wix/essentials` | HTTP endpoints; token sent by `httpClient.fetchWithAuth()` | — | No | Verified |
| 2 | Billing state, trial eligibility, Pro plan | `appInstances.getAppInstance()` — `@wix/app-management` | Backend, as app | Manage Your App (automatic) | Yes | Verified |
| 3 | Owner email and verification status for `INTERNAL_WIX` | `site.ownerInfo.email`, `emailStatus` from Get App Instance | Backend, as app | **Read Site Owner Email** | Yes | Verified. Without the scope `ownerInfo` is absent and nobody is internal (fails closed). |
| 4 | Trial end date | `billing.freeTrialInfo.endDate` | Backend | — | Yes | Verified: Wix populates it only after a trial ends, so the UI shows no end date during a trial. |
| 5 | Start a trial or upgrade | `https://www.wix.com/apps/upgrade/<APP_ID>?appInstanceId=<ID>` | Dashboard, new tab | — | — | Verified (documented pricing-page entry point) |
| 6 | Install date for the Basic anniversary period | `appInstances.onAppInstanceInstalled` event | Event extension | Manage Your App | — | Verified. The event has no `eventTime`, so receipt time is used; sites installed before this release fall back to the first-seen time. |
| 7 | App data storage | `items.*` — `@wix/data`, six app-owned collections (Data Collections extension) | Backend, as app | Granted by the extension | Yes (collections are `PRIVILEGED`) | Verified. The site needs the CMS app (see manual steps). |
| 8 | Atomic Basic quota reservation | Duplicate `_id` insert fails with `WDE0074 / WD_ITEM_ALREADY_EXISTS` (documented) | Backend | — | Yes | Verified by concurrency unit tests (exactly 1 grant at 9/10). Live-verify under real concurrent load. |
| 9 | Guarded state changes (compare-and-set) | `items.patch(..., { condition })`, `items.update(..., { condition })` | Backend | — | Yes | Live-verify: Wix does not document the error a failed condition raises, so the code re-reads the item to decide. |
| 10 | Private resumable upload URL | `files.generateFileResumableUploadUrl(mime, { private: true, labels, uploadProtocol: 'TUS', filePath })` — `@wix/media` | Backend, as app | Manage Media Manager (`SCOPE.DC-MEDIA.MANAGE-MEDIAMANAGER`) | Yes | Verified |
| 11 | Browser TUS upload and finalize PUT | tus-js-client → Wix `uploadUrl`; `PUT uploadUrl/uploadToken?filename=` | Site plugin, browser | — | — | Live-verify: CORS from site domains to the Wix upload endpoint is not documented. |
| 12 | Prove a finished file belongs to its reservation | Reservation label on the file + `files.getFileDescriptor()` | Backend | Manage Media Manager | Yes | Verified. Resumable URLs take no `externalInfo` in the SDK, so a unique label is used instead. |
| 13 | Finalize when the browser disappears | `files.onFileDescriptorFileReady` event | Event extension | Read Media Manager (`SCOPE.DC-MEDIA.READ-MEDIAMANAGER`) | Yes | Verified |
| 14 | React to a failed media import | `files.onFileDescriptorFileFailed` | — | — | — | **Unavailable**: the event carries only `externalInfo` (no file ID or labels). Failures are detected by completion polling and reservation expiry instead. |
| 15 | Merchant download | `files.generateFileDownloadUrl(fileId, { expirationInMinutes: 60 })` | Backend, dashboard caller (`USER`) | Manage Media Manager | Yes | Verified |
| 16 | Delete a file | `files.bulkDeleteFiles(ids, { permanent: false })` | Backend, dashboard caller | Manage Media Manager | Yes | Verified. Files go to the Media Manager trash (restorable). |
| 17 | File types and sizes | Catalog of every format in Wix's "Supported Media File Types and File Sizes" article (`src/shared/wix-media-formats.ts`): images, camera RAW, SVG, ICO, video, audio, documents, archives, 3D. Merchant limit is capped at Wix's per-format limit (e.g. SVG 250 KB, GIF 15 MB, video 4 GB). Known extensions declare a canonical MIME type to Wix; `mediaType` is checked after upload | Storefront pre-check + backend (authoritative) | — | — | Verified against the help article. Live-verify that Wix accepts the canonical MIME types for uncommon formats (JPEG 2000 codestreams, RAW, DivX/XviD, InDesign/CorelDRAW). Fonts are not offered because Wix doesn't list them. |
| 18 | Product catalog for rules | `catalogVersioning.getCatalogVersion`, `products.queryProducts` (V1), `productsV3.queryProducts` / `searchProducts` (V3) — `@wix/stores` | Backend, dashboard caller | `SCOPE.STORES.CATALOG_READ_LIMITED`, `SCOPE.DC-STORES.READ-PRODUCTS` (V1), `SCOPE.STORES.PRODUCT_READ` (V3); add `SCOPE.STORES.PRODUCT_READ_ADMIN` to list hidden V3 products | Yes | Verified |
| 19 | Product page uploader (both Stores versions) | Site plugin; placements on new page `a0c68605…/6a25b678…` and old page `1380b703…/13a94f09…`, slot `product-page-details-7`; props `product-id`, `selected-variant-id` | Site, visitor or member | — | No | Verified. Live-verify on one V1 and one V3 site. |
| 20 | Checkout attachments | Site plugin on `checkout:summary:lineItems:after`; props `checkout-id`, `checkout-updated-date`, `slot-brand`; `onRefreshCheckout` | Site, visitor or member | — | No | Verified. May not auto-add, so the dashboard offers `addSitePlugin`. |
| 21 | Read the visitor's checkout and enforce ownership | `cartV2.getCart(checkoutId)` (checkout ID = cart ID) — `@wix/ecom` | Backend, as app; owner matched against `customerInfo.visitorId`/`memberId`/`userId` | **Read Carts V2 (PII)** `SCOPE.ECOM.READ-CARTS-V2_LIMITED` | Yes (app identity only) | Verified. Checkout V1 APIs are removed 2027-02-01, so Cart V2 is used. |
| 22 | Block checkout without a required file | eCommerce Validations SPI `getValidationViolations` → `ERROR` on the line item | Service plugin | Added with the extension | Yes | Verified. Live-verify that the checkout-page line-item IDs in the request equal Cart V2 IDs. The handler fails open if the app's data is unavailable. |
| 23 | Link files to the order | `orders.onOrderCreated` — `order.checkoutId`, `purchaseFlowId`, `lineItems[]._id` | Event extension | Read Orders `SCOPE.DC-STORES.READ-ORDERS` | Yes | **Live-verify**: Wix does not document that order line-item IDs equal checkout line-item IDs. Mismatches are flagged "Needs review", never guessed. Required uploads stay locked until a real order proves the link on the site. |
| 24 | Placement status | `plugins.getPlacementStatus()` — `@wix/site-plugins` | Backend, dashboard caller | Read Site Plugin Status `SCOPE.SITE-PLUGIN.READ-PLACEMENT-STATUS` | Yes | Verified |
| 25 | Add plugins to their slots | `dashboard.addSitePlugin(pluginId, { placement })` — `@wix/dashboard` | Dashboard page | — | No | Verified. Needs at least one released app version. |
| 26 | Which product page a site uses | `site.installedWixApps` contains `a0c68605…` | Backend | Manage Your App | Yes | Verified |
| 27 | Order page panel | Dashboard plugin, slot `cb16162e-42aa-41bd-a644-dc570328c6cc`, props `orderId` | Dashboard, Wix user | — | No | Verified |
| 28 | Open an order from the app | `dashboard.navigate(pages.orderDetails({ id }))` — `@wix/ecom/dashboard` | Dashboard page | — | No | Verified |
| 29 | Wix AI assistant tools | App Tools + Tools Provider SPI (`runTool`) | Service plugin; restricted to `identity.wixUserId` | — | Yes | Verified. Read-only tools; Live-verify through the assistant. |
| 30 | Config for service plugins and events | `astro:env/server` published per request by `src/middleware.ts` | Astro middleware | — | — | Verified: extension bundles cannot import `astro:env`, but they run behind Astro's request pipeline. |

## Backend limits that shaped the design

- Backend extensions allow about 20 sub-requests and 1000 CPU ms per request. The validation SPI uses at most three Wix Data calls.
- Wix Data collections allow at most 3 indexes (1 unique). Preview rejected a fourth index on `uploads`.
- Wix Data has a per-site requests-per-minute quota (`WDE0014`). Very high-traffic stores should be load-tested.

## Release gate (from the spec)

Release only after all of the following pass on one Stores V1 and one Stores V3 development site:

1. The uploader appears on the product page and a file uploads, including an offline pause and resume.
2. In checkout, a file attaches to the right line item, including the same product added twice with different variants.
3. A test order links every file with status "Linked to line item", and Settings shows "Checkout verification: Verified".
4. After verification, a Required product cannot be checked out until its file is ready.
5. A Basic site at 9/10 accepts exactly one more upload when several are started at once.
6. Guest checkout works, an unverified owner email is not treated as internal, and cancelled or expired Pro falls back to Basic.

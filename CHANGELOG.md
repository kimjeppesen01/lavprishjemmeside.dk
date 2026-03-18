# Changelog

All notable changes to Lavpris CMS are documented here.

Format: `## [version] - YYYY-MM-DD` with sections `Added`, `Fixed`, `Changed`, and `Database migrations`.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- `PATCH` (`1.0.x`): bug fixes, copy changes, minor UI tweaks. No schema changes. Safe to merge anytime.
- `MINOR` (`1.x.0`): new features, new components, new admin pages. May include additive schema migrations.
- `MAJOR` (`x.0.0`): breaking changes to schema, API contracts, or env var names. Requires manual migration steps.

Change discipline:

- Every Engineer, Codex, and Claude Code change that affects Lavprishjemmeside CMS behavior, client-site management behavior, rollout process, or operator expectations must update `[Unreleased]` before handoff.
- Documentation and orchestration changes belong under `Changed`.
- If a change does not affect release notes, say that explicitly in the implementation handoff.

---

## [Unreleased]

### Added
- **Theme V2: 4 swappable CMS themes** — `ecommerce`, `portfolio`, `restaurant`, `service` are now fully registered CMS themes with:
  - Complete `src/themes/<key>/` package: manifest, CSS token overrides, layout shell (Nav + Footer), section variants, feature components, starter page preset
  - `src/themes/manifest-contract.ts` — enforced `ThemeManifest` interface with `ThemeFeature` literal union type
  - `src/themes/simple/layout/` — compatibility bridge wrapping existing Header/Footer
  - `src/lib/resolveSection.ts` — static import map routing section slugs to theme-specific variants
  - `src/lib/resolveFeature.ts` — static import map routing feature components (shop, booking, restaurant, portfolio)
  - Token layering in `generate-theme.mjs`: `src/themes/<key>/tokens/theme-overrides.css` is prepended before user API tokens in `theme.css`
  - `api/src/lib/theme-catalog.js` expanded with 4 new entries
  - Admin themes page now loads catalog dynamically from `/theme-catalog` API

### Changed
- `src/layouts/Layout.astro` — themeMode ternary replaced with 7-key allowlist pass-through; chrome delegated to `ThemeLayout` static map
- `src/pages/index.astro`, `src/pages/[...slug].astro` — section rendering now calls `resolveSection(slug, themeMode)` with fallback to existing `componentMap`

- Added a canonical V2 theme integration plan: Bolt's `/themes/*` work is now explicitly treated as source packages for a built-in CMS theme runtime rather than manual root-copy activation, and the Lavprishjemmeside roadmap now includes the schema migration, theme resolver, builder/preview/AI integration, and parent/client cutover guardrails needed to turn those themes into a real per-site CMS system
- Fixed a critical multi-domain build leak: client builds now resolve `PUBLIC_SITE_URL` and `PUBLIC_API_URL` from the install itself (`api/.env` or explicit env), the theme prebuild now fails hard instead of silently falling back to Lavprishjemmeside defaults, post-build verification now scans `dist/` for foreign-domain leakage, and deploy verification now checks public branding/meta isolation so a client site cannot silently ship Lavprishjemmeside URLs or brand strings again
- Fixed live publish requests so `POST /publish` no longer restarts the API from inside the same request; the old `touch api/tmp/restart.txt` behavior could cut the HTTP response mid-flight and leave the CMS publish button stuck on “Starter udrulning…”
- Fixed the page-builder "Forhåndsvis side" flow so the preview controls and iframe pane now unhide reliably and land in a stable grid column; the page no longer mixes inline `display:none!important` with JS toggles or conflicting `lg:col-span-*` spans that could leave the page preview effectively invisible
- Rebuilt `/admin/pages/` around a builder-first workflow: the page list is now a full-width collapsible mega tray, the component editor and preview stay side by side as the main workspace, and `SEO & Meta` now lives in its own standalone section instead of sharing the component card
- Tightened the `/admin/pages/` builder workspace again: preview now gets a much wider dominant column, the builder pane can be hidden from both the component header and preview header, page selection is grouped into compact collapsible-tray rows instead of oversized cards, and component rows now support “Indsæt under” so editors can insert a block exactly where they need it instead of only duplicating existing blocks
- Replaced the manual `Egne komponenter` registration form with an assistant-driven component request workspace: the client now names the component, chats with the site assistant to define backlog and constraints, gets assistant-produced token/build estimates, and can approve the request into Engineer's `Accepted` lane directly from the module
- Fixed the main `/admin/assistant/` visibility helpers so the wizard shell and chat shell now actually unhide when the assistant state loads; they previously toggled `style.display` without removing the `hidden-el` class, which could leave the chat permanently invisible on live sites
- Fixed the `Egne komponenter` request workspace so the assistant chat shell is visible immediately with a clear empty-state instruction; the module no longer looks like the assistant is missing before the first component request has been started
- Hardened the `Egne komponenter` request workspace bootstrap so the chat shell now renders with a visible server-side placeholder even before JavaScript hydrates, and secondary list-loading failures no longer block the assistant thread from initializing
- Added persisted component request records in `assistant_component_requests`, plus CMS API endpoints to start request sessions, generate approval drafts, and approve them into Accepted without exposing raw Agent Enterprise routing in the browser
- Updated the Lavpris client-agent packet contract so live client assistants explicitly understand custom component discovery, structured backlog shaping, rough token estimation, and rough DKK build estimation before an Engineer handoff
- Rebuilt the component preview + AI library sync path: component previews now use a dedicated preview layout instead of the full admin chrome, `/ai/context` now builds the component library from the active CMS registry rather than a stale hand-written index, the AI assembler now reads exact `schema_fields` and `default_content` from the registry, and fresh installs now apply `seed_components_incremental.sql` after `seed_components_v2.sql` so legacy component rows do not drift back into the active library
- Changed static security headers from `X-Frame-Options: DENY` to same-origin framing with `frame-ancestors 'self'` so the admin component preview modal and page preview iframe can render safely inside the local admin without allowing cross-origin embedding
- Fixed Master Hub tab switching so `Sites`, `AI Usage`, `Claude Code`, `Provider`, and `Abonnementer` now reveal their panels correctly again; the page now removes/adds the `hidden-el` class during tab switches instead of leaving non-default panels permanently hidden, and it no longer exports dead legacy tab helpers that could break script startup
- Added the commerce integration layer: shop collections and collection items (`schema_shop_collections.sql`), default storefront fallback from featured to newest active products, public collection APIs, admin collection CRUD + integration overview, product merchandising fields in the main product editor, and first-class product-aware content components (`product-grid`, `product-carousel`, `featured-product-spotlight`, `category-showcase`) that now work in normal pages, previews, and the AI assembler

### Phase 7 — Final Handoff, Operator Packet Consolidation, and Rollback Gate (2026-03-14)

- Produced `PHASE7_HANDOFF.md` with consolidated cPanel/operator rollout packet covering all Phase 4.1 and Phase 6 schema, env, and verification steps
- Updated `local-mirror/docs/SCHEMA_OVERVIEW.md` to include Phase 4.1 shop extension schema files and Phase 6 master/email schema files
- Added final blocker ledger and outside-folder follow-up ledger: email proxy routes, subscription snapshot cron, live billing integration, provider middleware, and release-health verification are explicitly handed off as outside-folder operator steps
- Confirmed `ROLLBACK_AND_REPAIR.md` baseline is still current (`2026-03-14`, commit `f25e38320c2fcfebb1a79c0e3e1dcc2ca037a685`)
- Sprint implementation complete within the in-folder boundary; no live rollout, cPanel execution, or release-health claimed complete
- Correction pass applied: page-builder preview now uses `window.location.origin` as the safe same-install fallback (no longer defaults to `lavprishjemmeside.dk` on client installs); email admin page reframed as an operator-bound foundation (interactive mailbox UI removed, honest status screen rendered instead until routes are wired); both CHANGELOG copies now byte-identical so release-health SHA gate passes; `alert()` calls replaced with `window.toast()` on `dashboard.astro`, `pages.astro`, `ai-assemble.astro`, `header-footer.astro`, `master.astro`, `media.astro`, and `styling.astro`; stale `touch api/tmp/restart.txt` instruction replaced with the current cPanel restart contract in `dashboard.astro` and `INSTALL_OPERATOR_PACKET.md`
- Local V2 integration hardening applied before rollout: installer now writes `DB_PASSWORD` correctly; schema runner no longer drops SQL statements when files begin with comments; shop checkout, admin emails, refund flows, and payment redirects now resolve against the current site URL instead of defaulting to `lavprishjemmeside.dk`; guest checkout accounts can now be upgraded into real customer logins; cart session capture no longer double-stringifies payloads; page creation and component insertion now seed valid default content; component library API now exposes `status` and `default_content`; preview buttons are limited to real previewable components; advanced AI assemble mode now reuses the same progress-state animation as standard mode

---

### Phase 6 — Master Console Uplift, Provider Switching, Subscriptions, Email Client Foundation (2026-03-14)

#### 6.1 AI Usage Tab Uplift
- Added fleet-level summary bar to Master Hub AI tab: total tokens, total cost, total requests, and active site count for the 30-day window
- Per-site cards now show request count alongside token and cost totals
- Stale activity signal: sites with no AI usage in the last 7+ days show an amber "Inaktiv Xd" pill
- Last-active date label shown on non-stale sites
- Activity chart date range labels added (first/last day of the 14-day window)
- Bar tooltips include request count in addition to token count
- DB-unavailable sites show a red "DB utilgængelig" error pill

#### 6.2 Provider Switching Tab (Tab 4)
- New "Provider" tab added to Master Hub (master-only, gated by existing master role check)
- Visual radio-card selector: Anthropic Claude vs OpenAI/Codex
- Provider choice loaded from and saved to DB (`provider_config` table — single-row config)
- Saving generates a formatted operator packet with exact `.env` changes and cPanel restart instructions
- "Kopier" button copies operator packet to clipboard
- Full audit trail: every provider change written to `provider_audit_log` and rendered in the UI
- No fake in-folder provider router: real switching is operator-executed via the generated packet
- New API endpoints: `GET /master/provider-config`, `POST /master/provider-config`

#### 6.3 Subscription Management Tab (Tab 5)
- New "Abonnementer" tab added to Master Hub
- Per-site subscription cards: plan badge (Starter/Growth/Pro), 4 usage bars (AI tokens, sider, lager, mail-konti)
- Usage bars colour-coded: green < 70%, amber 70–90%, red > 90%
- Billing status: overdue warning surfaced in-card with renewal date
- Upgrade request flow: select site + new plan → `POST /master/subscription-upgrade-request` → logged to DB
- Operator instructions panel with explicit numbered steps for live billing activation
- New API endpoints: `GET /master/subscriptions`, `POST /master/subscription-upgrade-request`

#### 6.4 Email Client Foundation
- New admin page: `src/pages/admin/email.astro`
- Setup notice shown always with required env vars listed
- Unconfigured state: graceful not-configured gate (checks `GET /email/config`)
- Configured state: 2-column split — folder list (left) + message list/viewer (right)
- Compose modal: To, Subject, Body fields with Send and Save Draft actions
- Reply flow: pre-populates To and Subject from message header

**New schema files** (operator-applied via cPanel phpMyAdmin):
- `api/src/schema_subscriptions.sql` — `subscriptions`, `subscription_usage_snapshots`, `subscription_upgrade_requests`, `provider_config`, `provider_audit_log`; seeds default `provider_config` row with `active_provider = 'anthropic'`
- `api/src/schema_email_client.sql` — `email_accounts`, `email_folders`, `email_messages`, `email_drafts`

**Operator actions required at rollout:**
1. Run `schema_subscriptions.sql` on the master DB via cPanel phpMyAdmin
2. Run `schema_email_client.sql` on each client DB where email is to be enabled
3. Add `EMAIL_IMAP_HOST`, `EMAIL_IMAP_PORT`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_ENCRYPTION_KEY` to `.env` for each client site where email is enabled
4. Wire `/email/*` IMAP/SMTP proxy routes (see `PHASE6_HANDOFF.md` route contract)
5. Restart Node app via cPanel > Setup Node.js App > Restart

---

### Phase 5 — CMS/Admin Productivity Uplift (2026-03-14)

#### 5.1 Dashboard Quick Actions
- Added four quick-action shortcut cards below the stat row: **Ny side med AI**, **Rediger sider**, **Upload medier**, **Publicer nu**
- "Publicer nu" quick card triggers the `/publish` API endpoint directly from the dashboard with visual confirmation feedback
- Responsive grid: 4 columns on desktop, 2 columns on narrow screens

#### 5.2 Pages Workflow Improvements
- Added **"+ Ny side"** button with a modal dialog (Enter to confirm, Esc to cancel) that creates a new page by path
- Pages sidebar now shows a summary badge row: total page count + published page count
- Each page button now shows a **status dot** (green = all components published, amber = partial, grey = none)
- Added per-component **visibility toggle button** (eye icon) that calls `POST /page-components/publish` to toggle `is_published` per component without the full page publish flow
- Added **Ctrl+S / Cmd+S** keyboard shortcut to save the currently open component edit modal

#### 5.3 Component Duplicate Button
- Added a **duplicate (⊕)** button to each component row in the page editor
- Clones the component into the same page at the next sort position, copying `content`, `is_published`, and `component_id`

#### 5.4 AI Assembler Improvements
- Both the Standard and Advanced page path inputs now use a `<datalist>` populated with existing page paths from the API — provides autocomplete suggestions
- Added an **animated step-by-step loading indicator** during generation: Analyserer → Vælger komponenter → Genererer tekster → Gemmer til databasen
- Steps animate sequentially and all turn green on success, providing clearer feedback during the 10–30 second generation process

#### 5.5 Media Library Bulk Delete
- Added **"Vælg"** button that activates bulk-select mode
- In bulk mode, clicking any image card toggles its checkbox selection (highlighted with blue ring)
- Bulk toolbar shows selected count with **Vælg alle**, **Fravælg alle**, and **Slet valgte** actions
- Bulk delete loops through selected IDs with individual DELETE calls and reports errors

#### 5.6 Assistant Quick-Prompt Chips
- Added five clickable **quick-prompt chips** above the chat textarea when a session is open
- Chips: _Hvad kan du hjælpe med?_, _Generer tekst til forsiden_, _Beskriv et nyt komponent jeg skal bruge_, _Hjælp mig med SEO-tekster_, _Skriv en ticket til engineer-teamet_
- Clicking a chip populates the textarea and hides the chip row for a clean chat flow

#### 5.7 Admin Layout Keyboard Shortcuts
- Added a **keyboard shortcut overlay** (`?` key or `?` button in the header) listing all global navigation shortcuts
- Navigation shortcuts: `g d` → Dashboard, `g p` → Sider, `g m` → Medier, `g a` → AI-assembler, `g s` → Shop, `g c` → Assistant
- `Esc` closes any open overlay or mobile menu
- Small `?` button added to the admin header topbar for discoverability

> Features developed on `main` but not yet tagged. Will become the next release.

### Added
- Implemented the first-party e-commerce module with shop schema, Flatpay / Frisbii payment integration, public storefront routes, admin shop management, and transactional order email support.

### Planned
- Phase 4.1 planning complete: scoped Ecommerce Functional Depth sprint covering admin shop dashboard, inventory reservation at checkout, storefront product search, refund/return workflow, and order notes as Tier 1 blockers; shipping zones, customer accounts, product filters, and email template customization as Tier 2 differentiators; back-in-stock notifications, abandoned cart recovery, product reviews, and bulk import/export as Tier 3. Full implementation plan in `PHASE4.1_HANDOFF.md`. No code changes in this entry.

### Phase 4.1 — Ecommerce Functional Depth (Tier 1 implementation)

**New schema files** (run via `node api/run-schema.cjs`):
- `schema_stock_reservations.sql` — `stock_reservations` table: session-scoped inventory reservations with `product_id`, `variant_id`, `quantity`, `session_token`, `expires_at`; indexed on product, token, and expiry for efficient lazy sweeps.
- `schema_order_notes.sql` — additive `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT NULL` for buyer-supplied order notes.

**New API endpoints:**
- `GET /shop/search?q=&limit=` — MySQL FULLTEXT search across `products.name` and `products.short_desc` with wildcard prefix matching; returns matching products with primary image and price.
- `POST /shop/cart/reserve` — atomic inventory reservation: sweeps expired rows, checks available stock (stock minus active reservations), creates a 15-minute session-scoped reservation row; returns HTTP 409 on insufficient stock.
- `POST /shop/admin/orders/:id/refund` — marks order `refunded`, optionally restores stock per line item, records `order_events` audit row, sends refund confirmation email best-effort.
- `POST /shop/admin/orders/:id/note` — appends an internal admin note as an `order_events` row with `event_type: internal_note`.
- Extended `GET /shop/admin/dashboard` to include `low_stock` (products with `stock ≤ 5` and `track_stock = 1`) and `daily_orders` (14-day daily order counts).

**New pages and components:**
- `src/pages/admin/shop/dashboard.astro` — admin shop overview with 4 KPI cards (revenue 30d, orders 30d, pending payment, ready to ship), pure-CSS 14-day daily orders bar chart, top 5 products list, recent orders table, and low-stock alert list.
- `src/components/SearchBar.astro` — reusable search input with debounced fetch (280ms), results dropdown, thumbnail/placeholder, price display, clear button, keyboard Escape dismiss, and outside-click close.

**Modified files:**
- `src/pages/shop/checkout.astro` — added "Note til butikken" textarea; added session token generation via `sessionStorage` + `crypto.getRandomValues`; reserve call before order creation with 409 error surfacing.
- `src/pages/admin/shop/orders.astro` — added refund modal (reason + restore-stock checkbox); internal note input section; customer note display box; full event timeline (no longer capped at 10); emoji prefix for internal note events.
- `src/layouts/AdminLayout.astro` — added "Shop-overblik" nav link to `/admin/shop/dashboard/` in the Shop section.
- `src/pages/shop/index.astro` — injected `SearchBar` above category grid.
- `src/components/Header.astro` — injected `SearchBar` into regular and modern layout nav rail (before CartIcon).
- `api/src/services/shop-email.cjs` — added `sendRefundConfirmation` email function.
- `api/run-schema.cjs` — registered `schema_stock_reservations.sql` and `schema_order_notes.sql` in `SCHEMA_ORDER`.

### Phase 4.1 — Ecommerce Functional Depth (Tier 2 implementation)

**New schema files** (run via `node api/run-schema.cjs`):
- `schema_shipping_zones.sql` — additive `ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS countries JSON NULL` for per-method country targeting.
- `schema_customer_accounts.sql` — additive columns on `customers` (`password_hash TEXT NULL`, `email_verified_at TIMESTAMP NULL`) plus new `customer_sessions` table (token, customer_id, expires_at) for light customer account sessions.
- `schema_email_templates.sql` — new `email_templates` table (slug, label, subject, html_body, updated_at) for admin-editable transactional email templates with hardcoded fallback.

**New API endpoints (public):**
- `POST /shop/auth/register` — customer self-registration with bcrypt password hash; returns 30-day session token.
- `POST /shop/auth/login` — customer login with bcrypt verify; returns session token.
- `POST /shop/auth/logout` — invalidates session token row.
- `GET /shop/auth/me` — returns current customer identity from session header.
- `GET /shop/orders/my` — returns authenticated customer's order history (requires `X-Customer-Session` or `Authorization` header).
- `GET /shop/products?min_price_ore=&max_price_ore=&in_stock_only=&sort=` — new optional filter params (price range, stock filter, sort order) added to existing products endpoint; fully backwards-compatible.
- `GET /shop/shipping/methods?country=DK` — new optional `country` query param filters methods by `countries` JSON column; NULL = all countries (backwards-compatible).

**New API endpoints (admin):**
- `GET /shop/admin/emails` — list all email templates.
- `GET /shop/admin/emails/:slug` — retrieve a single template by slug.
- `PUT /shop/admin/emails/:slug` — create or update an email template; used by the admin editor page.
- `PUT /shop/admin/shipping/:id` + `POST /shop/admin/shipping` — extended to accept optional `countries` array field.

**New admin page:**
- `src/pages/admin/shop/emails.astro` — email template editor with sidebar template list, subject and HTML body editor, `{{token}}` insertion pills, save button, and "reset to default" button. All four transactional templates (order confirmation, shipped, refund, admin new order) are editable.

**New storefront pages:**
- `src/pages/shop/konto/login.astro` — customer login form with session token storage in localStorage.
- `src/pages/shop/konto/register.astro` — customer registration form with first/last name, email, password.
- `src/pages/shop/konto/index.astro` — authenticated order history page with status badges and logout.

**New component:**
- `src/components/ProductFilters.astro` — filter sidebar with price range inputs, in-stock toggle, sort dropdown, apply button, reset button. Dispatches `pf:results` custom event with filtered product list.

**Modified files:**
- `src/pages/shop/[category].astro` — injected `ProductFilters` sidebar; switched to two-column layout; added `pf:results` event listener to re-render product grid without page reload.
- `api/src/services/shop-email.cjs` — all four email functions now check `email_templates` DB table first; fall back to hardcoded HTML if no DB row exists. Added `loadTemplate()` and `renderTemplate()` helpers; added `pool` import.
- `src/layouts/AdminLayout.astro` — added "E-mailskabeloner" nav link to `/admin/shop/emails/` in the Shop section.
- `api/run-schema.cjs` — registered `schema_shipping_zones.sql`, `schema_customer_accounts.sql`, and `schema_email_templates.sql` in `SCHEMA_ORDER`.

**Operator actions required at rollout:**
1. Run `node api/run-schema.cjs` to apply the three new Tier 2 schema files.
2. Trigger Astro build + deploy.

### Phase 4.1 — Ecommerce Functional Depth (Tier 3 implementation)

**New schema files** (run via `node api/run-schema.cjs`):
- `schema_stock_notifications.sql` — `stock_notifications` table: email opt-in for out-of-stock products/variants; indexed on product, variant, email, and notified_at.
- `schema_abandoned_carts.sql` — `cart_sessions` table: session_id, email, cart JSON, captured_at, last_activity_at, reminder_sent_at, recovered_at; used for abandoned cart recovery.
- `schema_product_reviews.sql` — `product_reviews` table: product_id, customer_email, customer_name, rating (1–5), body, approved flag, created_at; indexed on product and approval status.

**New API endpoints (public):**
- `POST /shop/notify/stock` — register email for back-in-stock notification; deduplicates per product/variant/email; rate-limited via existing `orderRateLimiter`.
- `POST /shop/products/:slug/review` — submit a product review (rate-limited, 5/hour per IP); stores as unapproved; returns `pending_approval: true`.
- `GET /shop/products/:slug/reviews` — return approved reviews with average rating and count.
- `POST /shop/cart/session` — upsert cart session row for abandoned cart tracking; called from cart client side; `ON DUPLICATE KEY UPDATE` pattern.

**New API endpoints (admin):**
- `GET /shop/admin/reviews` — list all reviews with optional `?approved=0|1` filter and pagination.
- `PUT /shop/admin/reviews/:id/approve` — approve or unapprove a review.
- `DELETE /shop/admin/reviews/:id` — permanently delete a review.
- `GET /shop/admin/cron/abandoned-carts` — operator/cPanel-cron callable endpoint; sends reminder emails to cart sessions with email captured, no reminder sent yet, and last activity > 2 hours ago; marks `reminder_sent_at`.
- `GET /shop/admin/products/export.csv` — download all products as UTF-8 CSV with BOM; correct CSV quoting.
- `POST /shop/admin/products/import` — multipart CSV upload (max 5 MB); validates required columns (`sku`, `name`, `slug`, `price_ore`); upserts by SKU via `ON DUPLICATE KEY UPDATE`; returns `{ upserted, skipped, errors }`.

**New admin page:**
- `src/pages/admin/shop/reviews.astro` — review moderation list with approve/unapprove/delete actions, filter by status, and pagination.

**Modified files:**
- `src/pages/shop/produkt/[slug].astro` — added approved review list with star rating display and average summary; added review submission form (name, email, star rating, body); added back-in-stock notification widget that appears when the add-to-cart button is disabled (out of stock).
- `src/pages/admin/shop/products.astro` — added "Eksporter CSV" and "Importer CSV" buttons to the page header; added import result message strip; added JS for client-side CSV download with `Authorization` header and file upload handling.
- `api/src/routes/shop-admin.cjs` — added `multer` import and `upload` instance; added all Tier 3 admin endpoints; wired back-in-stock notification dispatch into the refund stock-restore path.
- `src/layouts/AdminLayout.astro` — added "Anmeldelser" nav link to `/admin/shop/reviews/` in the Shop section.
- `api/run-schema.cjs` — registered `schema_stock_notifications.sql`, `schema_abandoned_carts.sql`, and `schema_product_reviews.sql` in `SCHEMA_ORDER`.

**Operator actions required at rollout:**
1. Run `node api/run-schema.cjs` to apply the three new Tier 3 schema files.
2. Trigger Astro build + deploy.
3. (Optional) Configure a cPanel cron job: `curl -s -H "Authorization: Bearer <admin_token>" https://api.lavprishjemmeside.dk/shop/admin/cron/abandoned-carts` — run every 30 minutes.

### Changed
- Uplifted all shop storefront, cart, checkout, and admin pages from Tailwind utility classes to scoped `<style>` blocks using CSS design tokens: `shop/index.astro`, `shop/[category].astro`, `shop/produkt/[slug].astro`, `shop/kurv.astro`, `shop/checkout.astro`, `shop/ordre/[token].astro`, `admin/shop/products.astro`, `admin/shop/orders.astro`, `admin/shop/settings.astro`. All Tailwind `hidden` class toggles replaced with `element.style.display` or semantic `.is-open` class patterns. Status badge class assignments in JS template literals replaced with semantic BEM-style classes defined in scoped CSS. No JavaScript logic, API contracts, or schema changes.
- Uplifted shop components (`ShopHero.astro`, `CartDrawer.astro`, `PriceDisplay.astro`) from Tailwind to scoped CSS. `CartDrawer` slide animation changed from `translate-x-full`/`translate-x-0` class toggling to `.is-open` CSS class with `transform: translateX()`. `PriceDisplay` size variants converted to `.price-display--sm/md/lg` modifier classes.
- Hardened installer (`scripts/setup.cjs`) with partial-install state persistence (`.setup-state.json`), `--reset` flag for full restart, `execWithRetry` for dependency and build steps, URL and required-field validation, resume-aware variable pre-fill, 90-second health polling with last-error reporting, API stderr capture on health failure, Agent Enterprise provisioning with 3-retry logic, JWT secret and provisioned token preservation across resume runs, numbered step headers, and explicit repair guidance on each failure.
- Hardened schema runner (`api/run-schema.cjs`) with per-statement execution (`multipleStatements: false`), `splitStatements()` DELIMITER-aware SQL splitter, `isIdempotentError()` for safe-to-skip MySQL error codes, `checkConnection()` pre-flight, missing-file warnings, per-file timing and applied/skipped counts, wrapped errors carrying `schemaFile`/`statementIndex`/`statementPreview`/`originalCode`, post-run summary table, and expanded `SCHEMA_ORDER` covering all 27 current schema files.
- Hardened assistant setup wizard (`src/pages/admin/assistant.astro`) with full scoped CSS system replacing all Tailwind dependencies, `STEP_REQUIRED_FIELDS` per-step validation map, `validateStep()`/`clearStepErrors()` functions, `setWizardStep(nextStep, skipValidation)` navigation gate that blocks forward progress on empty required fields, dismissible error banner, step progress indicators with active/complete/error-state styles, all visibility toggling moved from Tailwind `hidden` class to `element.style.display`, `escHtml()` XSS helper, and activation error recovery that re-enables the submit button on failure.
- Added `docs/INSTALL_OPERATOR_PACKET.md` with the complete cPanel operator handoff for new-client installs: pre-install DB creation, Node.js app setup, DNS pointing, SSH clone steps, full env variable reference table, post-install document-root configuration, Flatpay webhook registration, live verification checklist, and rollback guidance.
- Uplifted admin shell (`AdminLayout.astro`) with a dark `#0f1117` sidebar, SVG icon navigation, active-state left-border indicator, Master Hub violet accent, user avatar/email footer, sticky top bar with role badge and page title, and mobile slide-in overlay.
- Uplifted admin dashboard (`dashboard.astro`) with a dark version strip, auto-fill stat cards, three-column overview (Pages / Design / Indhold & SEO), inline SVG icons, status dots, responsive breakpoints, and cleaner publish/rollout UI.
- Uplifted master hub (`master.astro`) with a scoped CSS design system: tab bar with SVG icons and active underline, improved site cards (health dot, build pill, 4-col mini-stat row, rollout badge), AI usage bar chart with hover state, and Claude Code step grid with tinted gradient step panels and a dark terminal output area.
- Added `docs/V2_DESIGN_UPLIFT.md` documenting the Phase 2 design tokens, component patterns, CSS strategy, and contract-unchanged confirmation.
- Strengthened contract-documentation rules in `EXTERNAL_AGENT_INSTRUCTIONS.md` so the external sprint must explicitly document all structured contracts (schema, seed, API, env, workflow, outside-folder) with specific file updates, not vague summaries.
- Removed the remaining stale references to the retired duplicate planning location from the canonical V2 docs and authority maps after the planning set was moved fully into `programs/lavprishjemmeside/`.
- Tightened the external-agent startup contract so `EXTERNAL_AGENT_PROMPT.md` and `EXTERNAL_AGENT_INSTRUCTIONS.md` now force the in-folder trilogy, require explicit documentation/handoff completion, and treat cPanel/DB/env work as operator packets rather than improviseable implementation scope.
- Moved the canonical V2 planning trilogy into `programs/lavprishjemmeside/requirements.md`, `programs/lavprishjemmeside/design.md`, and `programs/lavprishjemmeside/tasks.md` so the external sprint reads the real plan directly inside the writable folder.
- Rebuilt the V2 handoff docs around a richer hybrid product vision that restores major design/admin uplift, CMS productivity ambition, install/wizard hardening, e-commerce expansion, master AI visibility, and rollback safety in one coherent plan.
- Added `CPANEL_HANDOFF_CONTRACT.md` so database, seed, env, live verification, and rollback packets are standardized whenever the external sprint reaches an operator-owned cPanel boundary.
- Retired `SPRINT_V2_MIRROR.md` as the full sprint authority and converted it into a start-here pointer to the canonical in-folder trilogy and cPanel operator contract.
- Added an explicit handoff-artifact rule for the external sprint so schema, API, env, and workflow contract changes must leave behind updated documentation instead of living only in code.
- Added `EXTERNAL_AGENT_PROMPT.md` as a ready-to-paste startup prompt that tells a fresh external agent what to read first and what to keep in context memory throughout the sprint.
- Replaced the stale CMS V2.0 pipeline plan with a real Lavprishjemmeside V2 external sprint plan covering documentation hardening, install hardening, wizard refinement, e-commerce uplift, master AI usage visibility, master-only provider switching, and rollback/repair gates.
- Added the external-agent handoff pack in the Lavprishjemmeside root: `EXTERNAL_AGENT_INSTRUCTIONS.md`, `SPRINT_V2_MIRROR.md`, `OUTSIDE_FOLDER_DEPENDENCIES.md`, `ROLLBACK_AND_REPAIR.md`, and `DOCUMENT_AUTHORITY_MAP.md`.
- Added a baseline snapshot package for the current working version under `baselines/2026-03-14/` so the parent site and `ljdesignstudio.dk` have a documented rollback reference before the V2 sprint starts.
- Hardened the Lavprishjemmeside docs for external-agent handoff by fixing the root read order, classifying canonical/reference/historical docs, and adding reference banners to non-authoritative docs inside the folder.
- Added the Lavprishjemmeside release gate, rollout-status service, and active path-health checks so pending parent rollouts, client update drift, and stale legacy path references are surfaced before handoff.
- Added standardized release telemetry to CMS `/health`, parent/client rollout-status endpoints, and dashboard warnings so the parent site shows pending rollouts while client sites show `Opdatering tilgængelig` when they are behind `lavprishjemmeside.dk`.
- Added the `LAVPRIS_PARENT_API_URL` override plus release-health runbook updates so rollout checks, CMS docs, and installer output stay aligned even if the parent API origin changes.
- Added a hard Lavprishjemmeside engineer completion gate that requires changelog evidence from `[Unreleased]` before tasks can be marked completed.
- Fixed the product-detail shop component so the cPanel Astro build no longer aborts on the stock-status expression during live rollout.
- Fixed CMS release telemetry to read `security_logs.action` for `site.publish.completed`, so `last_deployed_at` is reported correctly after SSH-first deployments.
- Consolidated the program root docs into the essential set: `README.md`, `PROJECT_CONTEXT.md`, `BRAND_VISION.md`, and `CHANGELOG.md`.
- Updated the Engineer, Father, Lavprishjemmeside master, client-agent templates, and live client assistant packets so they explicitly understand the CMS plus the e-commerce lane: catalog, checkout, orders, shipping, discounts, and Flatpay / Frisbii payment handling.
- Added the `lavprishjemmeside-master-orchestrator` project skill for enterprise CMS and client-site governance work inside Agent Enterprise.
- Updated the Lavprishjemmeside master and Engineer packets so CMS-facing work must consider changelog impact before handoff.
- Clarified the Lavprishjemmeside authority chain so Bolt.new syncs through the public GitHub repo before Agent Enterprise deploys the cPanel live runtime over SSH.
- Added the Lavpris public-ingress split so shared cPanel CMS installs reach Agent Enterprise through Tailscale Funnel while the full control plane remains private.
- Rewrote the program-level docs around the SSH-first and Funnel-backed assistant access contract so the root manifest no longer points engineers toward the retired CMS-side IAN model.
- Verified GitHub SSH read/write access and cPanel SSH write access for Lavprishjemmeside v2.0, then aligned the Lavprishjemmeside, Father, and Engineer packets on the `Bolt.new -> GitHub -> cPanel over SSH` rollout contract.
- Added a canonical local Lavprishjemmeside mirror workflow and sync-status checks so Agent Enterprise can compare GitHub, the local checkout, and the cPanel repo before rollout.
- Normalized the remote `api/package-lock.json` drift caused by the legacy SSH npm toolchain and restored a green Lavprishjemmeside sync baseline.
- Archived the still-active GitHub Actions deploy YAML in the local mirror so GitHub stops re-committing generated `dist/` output after source-only updates.
- Audited the Lavprishjemmeside doc set and marked the remaining pre-Agent Enterprise assistant and GitHub Actions references as historical-only so the live handoff path stays SSH-first, Funnel-backed, and Agent Enterprise-owned.
- Updated the root `docs/lavpris-ssh-first-operations.md` runbook so it matches the live Mac-hosted Agent Enterprise node, current `launchd` service names, and the current cPanel restart guidance.
- Deleted the remaining archive-only Lavprishjemmeside docs and placeholder markdown files that no longer add implementation value, including the retired IAN pointer doc, archived workflow copy, empty project stubs, and stray sync-test notes.
- Updated the handoff and runtime docs so the live e-commerce module, Flatpay env contract, public/admin shop routes, and manual `schema_shop.sql` bootstrap are documented as current behavior instead of future planning.
- Created the `info@ljdesignstudio.dk` cPanel mailbox and verified the account state through cPanel email APIs and the live mail files.
- Prepared Ljdesignstudio password recovery to use `info@ljdesignstudio.dk` as the primary admin and added SMTP fallback handling because the live Resend credential is not configured.
- Added a CMS version/build contract to `/health` and the admin dashboard so client installs expose a visible build ID before update and support work.
- Rolled the missing `Egne komponenter` feature into Ljdesignstudio by deploying the sidebar/page/API bundle, applying `schema_components_source.sql`, and rebuilding with `PUBLIC_API_URL=https://api.ljdesignstudio.dk` so the client admin points at the correct backend.
- Restored CMS-driven publishing for SSH-first client installs by replacing the disabled `/publish` route with a local build-and-rsync deploy flow that uses the client-specific `PUBLIC_SITE_URL` and `PUBLIC_API_URL`.

### Database migrations
- none

---

## [1.0.0] - 2026-02-19

Initial production release. Baseline for all client installations.

### Included features
- 27-component library (hero, FAQ, pricing, testimonials, gallery, and more)
- AI Assemble for page generation from prompts
- page builder with drag-and-drop component ordering
- design-system editor for colors, typography, radius, shadows, and feature toggles
- header and footer editor
- media library with Pexels integration
- traffic dashboard (Google Search Console plus GA4)
- password reset via email (Resend)
- GitHub Actions CI/CD with auto-build and SSH deploy on push to `main`
- multi-domain support via GitHub repository variables

### Database migrations
| File | Description |
|------|-------------|
| `schema.sql` | Core tables: users, sessions, components, page_components, content_pages, design_settings, theme_presets, events, security_logs, ai_usage |
| `schema_password_reset.sql` | `password_reset_tokens` table |
| `schema_phase6.sql` | Design settings columns, theme presets, media, AI prompt settings |
| `schema_header_footer.sql` | `header_footer_settings` table |
| `schema_media.sql` | `media` table |
| `schema_page_meta.sql` | SEO/meta columns on `content_pages` |
| `schema_ai_prompt_settings.sql` | `ai_prompt_settings` table |
| `schema_design_features.sql` | Feature toggle columns on `design_settings` |
| `schema_indexes.sql` | Performance indexes |

---

## [1.1.0] - TBD

> Template - fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Changed
- _[behavior or workflow change]: brief description_

### Database migrations
- _none_ or `schema_v1_1_xxx.sql`: description of what it adds

### Upgrade instructions for client installs
1. Merge upstream into the client repo
2. Run `node api/run-schema.cjs` on the server (safe to re-run if additive only)
3. Restart the Node app with the cPanel runtime command documented in `local-mirror/docs/SSH_FIRST_OPERATIONS.md` or `local-mirror/docs/UPSTREAM_UPDATES.md`
4. Rebuild and sync over SSH; use the admin Publish button only for content/theme rebuilds from code that is already live on the server

---

## [1.2.0] - TBD

> Template - fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Changed
- _[behavior or workflow change]: brief description_

### Database migrations
- _none_ or `schema_v1_2_xxx.sql`: description

### Upgrade instructions for client installs
1. Merge upstream into the client repo
2. Run `node api/run-schema.cjs` on the server
3. Restart the Node app with the cPanel runtime command documented in `local-mirror/docs/SSH_FIRST_OPERATIONS.md` or `local-mirror/docs/UPSTREAM_UPDATES.md`
4. Rebuild and sync over SSH; use the admin Publish button only for content/theme rebuilds from code that is already live on the server

---

## How to release a new version

1. Finish all features on `main`
2. Fill in the `[Unreleased]` section above and rename it to the new version plus date
3. Add a new empty `[Unreleased]` section at the top
4. Bump `"version"` in `package.json`
5. Commit: `git commit -m "chore: release vX.Y.Z"`
6. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
7. Create a GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md"`
8. Roll out to each client repo and verify site plus API health

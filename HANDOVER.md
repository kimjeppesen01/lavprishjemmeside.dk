# Handover: lavprishjemmeside.dk — Senior Developer Takeover

**Handover date:** 2026-02-15  
**Context:** AI-assisted development session; code needs senior review before production confidence.

---

## 1. Project Summary

| Item | Value |
|------|-------|
| **Live site** | https://lavprishjemmeside.dk |
| **API** | https://api.lavprishjemmeside.dk |
| **Repo** | https://github.com/kimjeppesen01/lavprishjemmeside.dk (public) |
| **Stack** | Astro v5 (static), Tailwind v4, Node.js/Express API, MySQL |
| **Hosting** | cPanel (Nordicway), GitHub Actions → SSH deploy |

---

## 2. What Was Done This Session

### Admin pages list fix
- **Problem:** `/admin/pages` never loaded — fetch called `/page-components` without `page` param; API returned 400.
- **Fix:** API now supports `?page=all`; frontend uses `fetch('/page-components?page=all')`.
- **Files:** `api/src/routes/page-components.js`, `src/pages/admin/pages.astro`

### Dynamic page rendering (`/priser`)
- **Problem:** `/priser` existed in DB but wasn’t rendered; `[...slug].astro` had been removed after earlier build failures.
- **Fix:** Restored `[...slug].astro` with prop normalization and safer handling.
- **Files:** `src/pages/[...slug].astro`

### API robustness
- `JSON.parse(row.content)` wrapped in try/catch — invalid JSON no longer crashes the API.
- `page_path` trimmed to handle trailing spaces (e.g. `/priser ` vs `/priser`).
- **Files:** `api/src/routes/page-components.js`

### Duplicate HTML `id` attributes
- Same component used multiple times on a page produced duplicate ids.
- Each component now receives `instanceId` from `page_component.id` and uses it in ids.
- **Files:** 14 components in `src/components/` (ContentImageSplit, FaqAccordion, PricingTable, etc.)

### Troubleshooting tooling
- `npm run verify-pages` — checks API → local build → live URL.
- **File:** `scripts/verify-pages.mjs`

### Error handling in admin
- Admin error display improved: HTTP status + API error body instead of generic "Fejl ved indlæsning af data".
- **File:** `src/pages/admin/pages.astro`

### Prop normalization fixes (ComparisonTable, TestimonialsCarousel, StatsBanner)
- **ComparisonTable:** AI sends `features: [{category, items: [{name, basis, udvidet, enterprise}]}]`. Added conversion to `products`/`features`/`data`.
- **TestimonialsCarousel:** AI uses `content` and `avatar`; component expects `quote` and `photo`. Added mapping.
- **StatsBanner:** AI uses `number`; component expects `value`. Added mapping.
- **File:** `src/pages/[...slug].astro`

### AI pages published by default + publish-page endpoint
- **Problem:** AI-created pages (e.g. `/om-os`) had `is_published = 0`; they didn't appear until published via admin.
- **Fix:** AI-generate now inserts with `is_published = 1` and trims `page_path`.
- **New endpoint:** `POST /page-components/publish-page` — publishes all components for a page by path (handles TRIM).
- **AI-assemble UI:** "Udløs udrulning nu" button to trigger GitHub Actions deploy after creating a page. Publish, edit, delete stay in /admin/pages only.
- **Files:** `api/src/routes/ai-generate.js`, `api/src/routes/page-components.js`, `src/pages/admin/ai-assemble.astro`

### Styling settings save + Live Preview
- **Problem:** Saving design settings failed with "Fejl ved gemning" — form sent `color_neutral_400` and `color_neutral_500`, but DB table only has 50,100,200,300,600,700,800,900.
- **Fix (API):** Whitelist of allowed columns in `design-settings/update`; unknown fields are ignored instead of causing SQL error.
- **Problem:** Live Preview didn't reflect form changes — form uses `color_secondary` (underscore), CSS uses `--color-secondary` (hyphen); replace never matched.
- **Fix (preview):** Added `toCssVar()` to convert underscore → hyphen; `border_radius`/`shadow_style` enums now map to valid CSS values.
- **Fix (errors):** Save errors now surface the API's actual message (not generic "Fejl ved gemning"); in-page error box instead of alert.
- **Files:** `api/src/routes/design-settings.js`, `src/pages/admin/styling.astro`

---

## 3. Code Quality Notes (Review Priorities)

### High priority

1. **`src/pages/[...slug].astro`**
   - `normalizeProps()` maps AI output to component schemas. Now covers: `faq-accordion`, `pricing-table`, `comparison-table`, `testimonials-carousel`, `stats-banner`.
   - Other components may still fail or render badly on unexpected AI output.
   - **Action:** Audit remaining components; add normalization or defaults as needed.

2. **`api/src/routes/page-components.js`**
   - Both GET routes (authenticated + public) share similar logic; some duplication.
   - `JSON.parse` fallback returns `{}` and logs a warning — invalid content becomes empty props.
   - **Action:** Consider extracting shared query logic; decide whether to reject invalid rows or keep current behavior.

3. **Component `instanceId` usage**
   - `instanceId` is passed but not declared in all Props interfaces.
   - Uses `Astro.props.instanceId ?? 'default'` — works but not type-safe.
   - **Action:** Add optional `instanceId?: string | number` to component Props.

### Medium priority

4. **Admin client-side logic**
   - Most admin pages use large inline `<script is:inline>` blocks.
   - Hard to test; logic is coupled to the DOM.
   - **Action:** Extract to separate JS modules or a small framework.

5. **ComparisonTable / TestimonialsCarousel / StatsBanner**
   - ✅ Fixed: normalization added for AI structure `features: [{category, items}]` (ComparisonTable), `content`→`quote`/`avatar`→`photo` (TestimonialsCarousel), `number`→`value` (StatsBanner).
   - **Action:** Test with additional AI output variants; consider JSON Schema validation before save.

### Low priority

7. **`scripts/verify-pages.mjs`**
   - Uses dynamic `import()` for Node built-ins; works but slightly unusual.
   - **Action:** Optional cleanup for consistency.

---

## 4. Architecture Overview

### Data flow for dynamic pages

```
1. Build time (GitHub Actions):
   getStaticPaths() in [...slug].astro
   → fetch(API + '/page-components/public?page=all')
   → Groups by page_path, generates paths for /priser, etc.
   → Static HTML built per path

2. Runtime:
   User visits /priser → serves pre-built dist/priser/index.html

3. Admin edits:
   /admin/pages fetches ?page=all (authenticated)
   → Components edited, "Publicer side" sets is_published=1
   → Next deploy rebuilds with new data

4. AI-create flow:
   AI-assemble creates page → is_published=1 by default → "Udløs udrulning nu" triggers deploy
```

### Database tables (Phase 6)

| Table | Purpose |
|-------|---------|
| `components` | Library of 18 component types (slug, schema_fields, default_content) |
| `page_components` | Instances: page_path, component_id, content (JSON), is_published, sort_order |
| `design_settings` | Site theme (colors, fonts, etc.) |
| `theme_presets` | Preset themes |
| `ai_usage` | AI token usage tracking |

### API routes (page-components)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/page-components?page=all` | JWT | Admin: all components |
| GET | `/page-components?page=/priser` | JWT | Admin: components for one page |
| GET | `/page-components/public?page=all` | None | Build: all published |
| GET | `/page-components/public?page=/priser` | None | Build: one published page |
| POST | `/` | JWT | Add component to page |
| POST | `/update` | JWT | Update component content |
| POST | `/reorder` | JWT | Change sort_order |
| POST | `/delete` | JWT | Remove component |
| POST | `/publish` | JWT | Toggle is_published (single component) |
| POST | `/publish-page` | JWT | Publish all components for a page (by path) |
| POST | `/delete-page` | JWT | Delete all components for a page |

---

## 5. Critical Gotchas

### cPanel / LiteSpeed / Node.js
- **API entry:** `server.cjs` (not `.js`) — root `package.json` has `"type": "module"`.
- **Restart:** `touch api/tmp/restart.txt`. Do NOT use `pkill` in GitHub Actions (exit 143).
- **Manual restart:** `pkill -f 'lsnode:.*lavprishjemmeside'`.
- **DB host:** Use `127.0.0.1`, not `localhost`.

### Build & deploy
- `dist/` is in `.gitignore`; GitHub Actions runs `git add dist/ --force` and commits.
- Always `git pull --rebase origin main` before pushing — Actions may have pushed dist.
- Build fetches API at build time — API must be up and returning data.

### Publish vs draft
- Only rows with `is_published = 1` appear in `/page-components/public`.
- **New AI pages** are published by default (`is_published = 1`).
- **Existing unpublished pages:** Use "Publicer side" in /admin/pages.

---

## 6. Commands Reference

```bash
# Local dev
npm run dev                    # Astro dev server
cd api && node server.cjs      # API (requires .env)

# Build & verify
npm run build                  # Must succeed before push
npm run verify-pages           # API + build + live check

# Deploy (manual step if needed)
git pull --rebase origin main
npm run build
git add -A && git commit -m "..." && git push origin main

# Troubleshooting
gh run list --limit 5          # GitHub Actions status
```

---

## 7. Known Issues / Technical Debt

1. **Prop mismatches:** AI-generated content often doesn’t match component schemas. `normalizeProps` now covers faq, pricing, comparison, testimonials, stats; remaining components may need mapping.
2. ~~**ComparisonTable:** Renders `[object Object]`~~ — Fixed (converts `features: [{category, items}]` to products/features/data).
3. ~~**TestimonialsCarousel:** Empty content~~ — Fixed (`content`→`quote`, `avatar`→`photo`).
4. **PROJECT_CONTEXT.md:** Section "Current State (After Revert)" is outdated; `[...slug].astro` is back and working.
5. **Admin password:** Default may still be `change_me_immediately` — change on first login.
6. **design_settings:** DB has `color_neutral_50,100,200,300,600,700,800,900` but not 400/500. The form collects 400/500; API whitelist ignores them. Add columns if those shades are needed.

---

## 8. File Map (Where to Look)

| Area | Key files |
|------|-----------|
| Dynamic pages | `src/pages/[...slug].astro` |
| Admin pages | `src/pages/admin/pages.astro` |
| Design / styling | `src/pages/admin/styling.astro`, `api/src/routes/design-settings.js` |
| Page components API | `api/src/routes/page-components.js` |
| Component library | `src/components/*.astro` (18 components) |
| AI assembly | `src/pages/admin/ai-assemble.astro`, `api/src/routes/ai-generate.js` |
| Deploy | `.github/workflows/deploy.yml` |
| Project context | `PROJECT_CONTEXT.md` (read first) |
| Cursor rules | `.cursor/rules/project-context.mdc` |

---

## 9. Recommended Next Steps

1. **Review** `[...slug].astro` and `normalizeProps()`.
2. **Audit** remaining components for `instanceId` and prop handling (ComparisonTable, TestimonialsCarousel, StatsBanner are fixed).
3. **Update** PROJECT_CONTEXT.md "Current State" section if needed.
4. **Run** `npm run verify-pages` before any deploy.

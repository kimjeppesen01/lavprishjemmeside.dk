# Theme V2 Full Integration — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Health audit + full CMS-native theme system with 4 swappable V2 themes

---

## Goal

Make `ecommerce`, `portfolio`, `restaurant`, and `service` fully swappable CMS themes. A user clicks a theme in admin, presses Publish, and their entire site — shell, nav, footer, section variants, feature layouts — updates. Their content, products, bookings, and orders are untouched.

---

## Non-Negotiables

- A theme swap must never touch content data
- A theme swap must never break an existing site
- Every theme must fall back gracefully for any section it does not declare a variant for
- No hardcoded demo content, business names, or Pexels images in any theme package
- No localStorage-only feature logic — all interactive features wire to CMS API
- Build must fail hard if `active_theme_key` is not in `THEME_CATALOG`
- The `simple`, `modern`, and `kreativ` compatibility keys must continue to work throughout migration
- Local mirror is the only source of truth; GitHub is not in the deployment chain

---

## Architecture

### Theme Resolution Model

Resolution happens at **build time**, not runtime. The static build model is preserved.

**Flow:**

1. `generate-theme.mjs` reads `active_theme_key` from `GET /theme-settings/public`
2. Validates key against `THEME_CATALOG` (hard fail if unknown — already implemented)
3. Copies `src/themes/<key>/tokens/theme-overrides.css` → `src/styles/theme.css`
4. Writes `PUBLIC_ACTIVE_THEME=<key>` into the Astro build environment
5. `src/layouts/Layout.astro` reads `PUBLIC_ACTIVE_THEME` and delegates to `src/themes/<key>/layout/ThemeLayout.astro`
6. The page renderer calls `resolveSection(sectionSlug, theme)` for every section — returns theme variant path if declared in manifest, default component path otherwise
7. Feature pages call `resolveFeature(feature, component, theme)` — returns theme feature component if the theme declares that feature, default otherwise

### Section Resolution

```
resolveSection('hero-section', 'ecommerce')
  → checks manifest.declared_sections includes 'hero-section'
  → returns src/themes/ecommerce/sections/hero-section.astro   ✓

resolveSection('text-section', 'ecommerce')
  → manifest does not declare 'text-section'
  → returns src/components/text-section.astro (default fallback) ✓
```

### Feature Resolution

```
resolveFeature('shop', 'ProductGrid', 'ecommerce')
  → manifest.features includes 'shop'
  → returns src/themes/ecommerce/features/shop/ProductGrid.astro ✓

resolveFeature('shop', 'ProductGrid', 'portfolio')
  → manifest.features does not include 'shop'
  → returns src/features/shop/ProductGrid.astro (default fallback) ✓
```

---

## Theme Package Contract

Every theme lives at `src/themes/<key>/` and must satisfy this structure:

```
src/themes/<key>/
  manifest.ts                      # Required. Capability flags + declared variants
  tokens/
    theme-overrides.css            # Required. CSS custom properties for this theme
  layout/
    ThemeLayout.astro              # Required. Full <html>/<head>/<body> shell
    Nav.astro                      # Required. Accepts CMS-driven props only
    Footer.astro                   # Required. Accepts CMS-driven props only
  sections/                        # Only sections declared in manifest.declared_sections
    <section-slug>.astro           # Same props contract as default component
  features/                        # Only features declared in manifest.features
    shop/                          # ecommerce only
      ProductGrid.astro
      ProductCard.astro
      CartDrawer.astro
      CheckoutForm.astro
    booking/                       # service only
      BookingWizard.astro
      ServiceCard.astro
      StaffCard.astro
    restaurant/                    # restaurant only
      MenuGrid.astro
      OrderBuilder.astro
    portfolio/                     # portfolio only
      PortfolioGrid.astro
      CaseStudyLayout.astro
  presets/
    starter-page.json              # Required. Suggested default page structure
```

### manifest.ts Contract

```ts
export const manifest = {
  theme_key: '<key>' as const,
  label: string,
  description: string,
  status: 'active' | 'draft' as const,
  supports_commerce: boolean,
  supports_booking: boolean,
  supports_restaurant: boolean,
  supports_page_builder: boolean,
  supports_ai_assembler: boolean,
  default_header_mode: 'regular' | 'minimal' | 'sticky' as const,
  default_footer_mode: 'regular' | 'minimal' as const,
  business_modes: readonly string[],
  supported_sections: readonly string[],    // all sections this theme can render (declared + fallback)
  declared_sections: readonly string[],     // sections where this theme provides its own variant
  features: readonly string[],             // 'shop' | 'booking' | 'restaurant' | 'portfolio'
};

export type ThemeManifest = typeof manifest;
```

### Nav.astro and Footer.astro Props Contract

Nav and Footer must accept only CMS-driven props. No hardcoded content.

```ts
// Nav props
interface NavProps {
  siteName: string;
  logoUrl?: string;
  navLinks: Array<{ label: string; href: string }>;
  themeKey: string;
  supportsCommerce?: boolean;
}

// Footer props
interface FooterProps {
  siteName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  navLinks: Array<{ label: string; href: string }>;
}
```

---

## The 4 Theme Specifications

### `ecommerce`

**Identity:** Clean, conversion-focused shop theme. Strong product presentation, persistent cart, streamlined checkout.

**Capability flags:**
- `supports_commerce: true`
- `supports_booking: false`
- `supports_restaurant: false`
- `business_modes: ['shop', 'ecommerce']`

**Declared section variants:** `hero-section`, `features-section`, `cta-section`

**Features:** `shop` — ProductGrid, ProductCard, CartDrawer, CheckoutForm (wired to existing Flatpay/shop API)

**CSS tokens:** Green-forward palette (`--color-primary: #1A4731`), DM Sans + Inter. Sourced from Bolt ecommerce `theme.css`, mapped to CMS token names.

---

### `portfolio`

**Identity:** Bold, visual agency theme. Full-bleed imagery, case study pages, strong typography hierarchy.

**Capability flags:**
- `supports_commerce: false`
- `supports_booking: false`
- `supports_restaurant: false`
- `business_modes: ['agency', 'designer', 'creative']`

**Declared section variants:** `hero-section`, `features-section`, `cta-section`, `testimonials-section`

**Features:** `portfolio` — PortfolioGrid, CaseStudyLayout (wired to CMS page content)

**CSS tokens:** High-contrast dark palette, expressive serif heading font. Sourced from Bolt portfolio `theme.css`.

---

### `restaurant`

**Identity:** Warm, appetite-forward restaurant theme. Menu grid, takeaway order builder, opening hours.

**Capability flags:**
- `supports_commerce: false`
- `supports_booking: false`
- `supports_restaurant: true`
- `business_modes: ['restaurant', 'cafe', 'food']`

**Declared section variants:** `hero-section`, `features-section`, `cta-section`, `contact-section`

**Features:** `restaurant` — MenuGrid, OrderBuilder (wired to CMS restaurant API routes)

**CSS tokens:** Warm amber/terracotta palette. Sourced from Bolt restaurant `theme.css`.

---

### `service`

**Identity:** Professional service/salon theme. 4-step booking wizard, staff profiles, service catalogue.

**Capability flags:**
- `supports_commerce: false`
- `supports_booking: true`
- `supports_restaurant: false`
- `business_modes: ['salon', 'clinic', 'service']`

**Declared section variants:** `hero-section`, `features-section`, `cta-section`, `testimonials-section`, `contact-section`

**Features:** `booking` — BookingWizard, ServiceCard, StaffCard (wired to CMS booking API)

**CSS tokens:** Soft neutral/blush palette. Sourced from Bolt service `theme.css`.

---

## Resolution Utilities

### `src/lib/resolveSection.ts`

```ts
import type { ThemeManifest } from '../themes/simple/manifest';

export function resolveSection(sectionSlug: string, themeKey: string): string {
  // Returns import path for the section component
  // Theme variant if declared in manifest, default otherwise
}
```

### `src/lib/resolveFeature.ts`

```ts
export function resolveFeature(feature: string, component: string, themeKey: string): string {
  // Returns import path for the feature component
  // Theme feature variant if theme declares that feature, default otherwise
}
```

---

## Admin UI Changes

### themes.astro (existing admin page)

- Replace hardcoded 3-card layout with dynamic render from `GET /theme-catalog`
- Each card shows: theme label, description, capability badges (commerce/booking/restaurant icons), active indicator
- One-click sets `active_theme_key` via `POST /theme-settings/update`
- On success: show "Tema aktiveret — tryk Udgiv for at anvende" with a direct Publish button
- No auto-publish — operator must confirm

---

## `generate-theme.mjs` Changes

Add after existing theme key validation:

1. Copy `src/themes/<key>/tokens/theme-overrides.css` → `src/styles/theme.css` (replaces current token-write logic)
2. Write `PUBLIC_ACTIVE_THEME=<key>` to `.env` or pass as build env var so `Layout.astro` can read it at build time

---

## THEME_CATALOG Updates

Add 4 new entries to `api/src/lib/theme-catalog.js` after the existing `kreativ` entry. Each entry mirrors its `manifest.ts` capability flags. The catalog remains the single source of truth for API consumers; the manifest is the build-time source of truth for the Astro renderer.

---

## Phase 0: Health Audit Checklist

### Local Mirror

- [ ] `git status` — zero uncommitted changes or untracked files outside `themes/`
- [ ] All 7 Theme V2 commits present (`git log --oneline`)
- [ ] `api/src/lib/theme-catalog.js` — has simple, modern, kreativ
- [ ] `api/src/lib/theme-catalog.mjs` — exists
- [ ] `api/src/lib/theme-resolver.js` — exists
- [ ] `api/src/routes/theme-catalog.js` — exists
- [ ] `api/src/schema_theme_key_varchar.sql` — exists
- [ ] `api/run-schema.cjs` — contains `schema_theme_key_varchar.sql` in SCHEMA_ORDER
- [ ] `api/src/routes/theme-settings.js` — uses `isValidThemeKey`, VARCHAR in CREATE TABLE
- [ ] `api/src/services/ai-context.js` — has `activeTheme` block
- [ ] `scripts/generate-theme.mjs` — has `Build afbrudt:` hard fail
- [ ] `src/themes/simple/manifest.ts` — exists and is correct
- [ ] `themes/ecommerce|portfolio|restaurant|service` — all 4 present and intact

### cPanel (SSH checks)

- [ ] `git stash list` — empty (no pending stash)
- [ ] `git status` — working tree clean or only expected untracked files
- [ ] `api/src/lib/theme-catalog.js` — present
- [ ] `api/src/lib/theme-resolver.js` — present
- [ ] `api/src/routes/theme-catalog.js` — present
- [ ] `api/src/services/ai-context.js` — has `resolveTheme` import
- [ ] `scripts/generate-theme.mjs` — has `Build afbrudt:` hard fail
- [ ] `src/themes/simple/` — present
- [ ] `themes/` — all 4 Bolt packages present
- [ ] Schema: `SHOW COLUMNS FROM site_theme_settings LIKE 'active_theme_key'` → `varchar(64)`
- [ ] Live API: `curl https://api.lavprishjemmeside.dk/theme-catalog` → returns 3 themes
- [ ] Live API: `curl https://api.lavprishjemmeside.dk/theme-settings/public` → returns valid JSON

---

## Implementation Sequence

### Phase 0: Health Audit + Drift Fix
Run all checklist items. Fix any drift before writing new code.

### Phase 1: Theme Package Rewrites (local mirror)
1. `simple` — verify and complete layout/ (Nav, Footer wired to props)
2. `ecommerce` — full rewrite from Bolt source, strip demo content, wire shop API
3. `portfolio` — full rewrite, wire CMS content
4. `restaurant` — full rewrite, wire restaurant API
5. `service` — full rewrite, wire booking API

Each theme: write → `npx astro check` passes → commit.

### Phase 2: Resolution Infrastructure
6. `src/lib/resolveSection.ts`
7. `src/lib/resolveFeature.ts`
8. `src/layouts/Layout.astro` theme router
9. Page renderer calls `resolveSection()`
10. Feature pages call `resolveFeature()`
11. `generate-theme.mjs` writes `PUBLIC_ACTIVE_THEME`
12. `api/src/lib/theme-catalog.js` — add 4 new entries

### Phase 3: Admin UI
13. `src/pages/admin/themes.astro` — dynamic catalog render + one-click swap

### Phase 4: CHANGELOG + Release Gate
14. `CHANGELOG.md [Unreleased]` — full entry for Theme V2
15. `npm run build` — must succeed for active theme
16. `npm run lavpris:release-health` — must pass
17. SSH push to `lavprishjemmeside.dk`

---

## Out of Scope

- `ljdesignstudio.dk` rollout (separate task after parent site is stable)
- Theme preview without publish (future: preview mode)
- Theme marketplace or external theme packages
- `modern` and `kreativ` V2 rewrites (these are compatibility keys; their visual update is a separate task)

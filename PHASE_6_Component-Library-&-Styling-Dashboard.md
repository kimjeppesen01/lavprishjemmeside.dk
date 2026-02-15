# Phase 6: Component Library, Design System & AI Website Agent — Implementation Plan

> **Project**: lavprishjemmeside.dk  
> **Vision**: Build a world-class, AI-powered website factory. An AI Content Writer crafts SEO copy. An AI Content Developer assembles it into pages using curated, documented components. The result: a finished, published, static webpage — fast, beautiful, and ranking.
>
> **This phase builds the three foundations that make the AI agents possible:**
> 1. A curated library of ~18 production-grade components (sourced from HyperUI, Flowbite, Preline)
> 2. A design token system (CSS variables) that skins every component to any brand
> 3. A machine-readable documentation format that gives the AI agents total clarity on what each component is, when to use it, and how to populate it

---

## The Full Pipeline (End-State Vision)

```
 ┌──────────────────────────────────────────────────────────────┐
 │                   1. AI CONTENT WRITER                       │
 │                                                              │
 │  Input:  Topic + target keyword + audience                   │
 │  Knows:  SEO best practices, heading hierarchy, Danish       │
 │  Output: Structured content brief (JSON)                     │
 │          - Page title, meta description                      │
 │          - H1, sections with H2s, paragraphs, CTAs           │
 │          - Internal link suggestions                         │
 │          - Schema.org type recommendation                    │
 └──────────────────────┬───────────────────────────────────────┘
                        │ passes structured content
                        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                   2. AI CONTENT DEVELOPER                    │
 │                                                              │
 │  Input:  Content brief + Component Docs + Design Tokens      │
 │  Knows:  Every component, its slots, SEO rules, constraints  │
 │  Output: page_components[] records ready for database        │
 │          - Which components to use, in what order             │
 │          - All content slots filled with the written copy     │
 │          - Correct heading levels preserved                   │
 └──────────────────────┬───────────────────────────────────────┘
                        │ saves to DB via API
                        ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                   3. PUBLISH PIPELINE                        │
 │                                                              │
 │  Trigger: POST /publish (or human clicks "Publicer")         │
 │  Action:  GitHub Actions → Astro build → static deploy       │
 │  Result:  Live static page in ~90 seconds                    │
 └──────────────────────────────────────────────────────────────┘
```

**Phase 6 builds layers 2 and 3.** The AI Content Writer (layer 1) is Phase 7.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                           │
│  /admin/styling/      → Design tokens (colors, fonts, etc)  │
│  /admin/components/   → Browse component library + docs     │
│  /admin/pages/        → Page builder (add/reorder/edit)     │
│  /admin/ai-assemble/  → AI Content Developer trigger        │
│                                                             │
│  Live Preview  |  [Publicer] button → triggers rebuild      │
└───────────────────────┬─────────────────────────────────────┘
                        │ JWT-authenticated API calls
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS API (Node.js)                     │
│  /design-settings     → CRUD design tokens                  │
│  /theme-presets       → Read preset themes                  │
│  /components          → Read component registry             │
│  /page-components     → CRUD page ↔ component instances     │
│  /ai/assemble         → Anthropic API: content → components │
│  /publish             → Trigger GitHub Actions rebuild       │
└───────────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
┌──────────────────┐    ┌──────────────────────────────────┐
│   MySQL Database  │    │  Component Documentation Files    │
│  design_settings  │    │  /api/src/component-docs/         │
│  theme_presets    │    │    hero-centered.md               │
│  components       │    │    features-grid.md               │
│  page_components  │    │    pricing-cards.md               │
│                   │    │    ...18 files                    │
└──────────────────┘    │  (Machine-readable specs the AI   │
                         │   reads before assembling pages)  │
                         └──────────────────────────────────┘
```

---

## Pre-requisites (Verify Before Starting)

- [ ] Phase 5 complete (auth, email, password reset all working)
- [ ] Admin login/dashboard functional at `/admin/dashboard/`
- [ ] API running at `api.lavprishjemmeside.dk` with JWT auth
- [ ] MySQL database `theartis_lavpris` accessible
- [ ] GitHub Actions CI/CD pipeline deploying correctly
- [ ] Tailwind CSS v4 with `@tailwindcss/vite` plugin working
- [ ] Node 22, `.cjs` entry point, `DB_HOST=127.0.0.1`

---

## Source Libraries (Curation Strategy)

We curate components from these **MIT-licensed, zero-dependency** open-source libraries:

| Library | License | Why | What we take |
|---------|---------|-----|-------------|
| **HyperUI** | MIT | Pure HTML + Tailwind v4, copy-paste, no JS deps, 226+ components | Hero, Features, CTA, FAQ, Pricing, Team, Blog Cards, Footers |
| **Flowbite** (free tier) | MIT | High-quality marketing blocks, well-structured HTML | Hero variants, Contact forms, Content sections |
| **Preline UI** (free tier) | MIT | Polished sections, excellent accessibility | Testimonials, Stats counters, specific hero layouts |

**Curation rules:**
1. Take the HTML + Tailwind classes only — no npm dependencies, no JS plugins
2. Replace all hardcoded colors with CSS custom properties (`var(--color-primary)`, etc.)
3. Ensure semantic HTML: proper `<section>`, `<article>`, heading hierarchy
4. Verify responsive: must work perfectly at 320px, 768px, 1280px
5. Add ARIA labels where missing
6. Wrap in Astro component with typed props interface

---

## The 18 Components (Curated Library)

Quality over quantity. Each component is selected because it fills a specific, common need in a business website. Together, they can assemble any typical service/product website.

### Tier 1: Page Openers (the first thing visitors see)

| # | Component | Slug | Source | Purpose |
|---|-----------|------|--------|---------|
| 1 | **Hero — Centered** | `hero-centered` | HyperUI Banners #1 | Single CTA, centered headline, subtext. The "default" opener. |
| 2 | **Hero — Split** | `hero-split` | HyperUI Banners #3 | Text left, image right. For visual products/services. |
| 3 | **Hero — With Background Image** | `hero-image-bg` | Flowbite Hero #2 | Full-bleed image with overlay text. High visual impact. |

### Tier 2: Value Proposition & Trust (convince the visitor)

| # | Component | Slug | Source | Purpose |
|---|-----------|------|--------|---------|
| 4 | **Features Grid** | `features-grid` | HyperUI Feature Grids #1 | 3-column icon + title + description. Core "what we do" section. |
| 5 | **Features Alternating** | `features-alternating` | Flowbite Feature #3 | Image-left/text-right, then swap. For detailed service descriptions. |
| 6 | **Stats / Numbers** | `stats-bar` | Preline Stats | "500+ kunder", "10 års erfaring" — social proof numbers in a row. |
| 7 | **Logo Cloud** | `logo-cloud` | HyperUI Logo Clouds #1 | Client/partner logos. Trust signal. |
| 8 | **Testimonials** | `testimonials-cards` | Preline Testimonials | 2–3 customer quotes with name + role. |

### Tier 3: Conversion Drivers (get the visitor to act)

| # | Component | Slug | Source | Purpose |
|---|-----------|------|--------|---------|
| 9 | **Pricing Cards** | `pricing-cards` | HyperUI Pricing #1 | 2–3 tier cards. Highlights "popular" tier. |
| 10 | **CTA Banner** | `cta-banner` | HyperUI CTAs #1 | Full-width call-to-action with headline + button. |
| 11 | **CTA Split** | `cta-split` | HyperUI CTAs #3 | Text left, button right. Subtler CTA for mid-page. |
| 12 | **Contact Form** | `contact-form` | Flowbite Contact #1 | Name, email, phone, message. Connects to form handler. |

### Tier 4: Content & Information (educate the visitor)

| # | Component | Slug | Source | Purpose |
|---|-----------|------|--------|---------|
| 13 | **FAQ Accordion** | `faq-accordion` | HyperUI FAQs #2 | Expandable questions. SEO gold (FAQ schema). |
| 14 | **Content Section** | `content-section` | HyperUI Sections #1 | Generic heading + rich text. Blog-style content blocks. |
| 15 | **Blog Cards Grid** | `blog-cards` | HyperUI Blog Cards #1 | 3-column card grid linking to articles. |
| 16 | **Team Grid** | `team-grid` | HyperUI Team Sections #1 | Photo + name + role grid for "Om os" pages. |

### Tier 5: Page Structure (navigation & footer)

| # | Component | Slug | Source | Purpose |
|---|-----------|------|--------|---------|
| 17 | **Header / Navbar** | `header-navbar` | HyperUI Headers #2 | Responsive nav with mobile hamburger. |
| 18 | **Footer — Multi-Column** | `footer-columns` | HyperUI Footers #3 | 3–4 column footer with links, contact, social icons. |

---

## Stage 1: Design Token System & Database

**Goal**: Define the CSS variable system and create all database tables. No UI yet — pure data layer.

### 1.1 — CSS Variable Architecture

**File**: `src/styles/theme.css`

Every component references these variables. Zero hardcoded colors anywhere.

```css
/* ===== DESIGN TOKENS ===== */
/* These values are generated at build time from the database */

:root {
  /* --- Brand Colors --- */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #DBEAFE;
  --color-secondary: #7C3AED;
  --color-secondary-hover: #6D28D9;
  --color-secondary-light: #EDE9FE;
  --color-accent: #F59E0B;
  --color-accent-hover: #D97706;

  /* --- Neutral Scale --- */
  --color-neutral-50: #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-200: #E5E7EB;
  --color-neutral-300: #D1D5DB;
  --color-neutral-600: #4B5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1F2937;
  --color-neutral-900: #111827;

  /* --- Semantic Colors --- */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-text-on-primary: #FFFFFF;
  --color-bg-page: #FFFFFF;
  --color-bg-section-alt: var(--color-neutral-50);
  --color-border: var(--color-neutral-200);

  /* --- Typography --- */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;
  --line-height-tight: 1.15;
  --line-height-normal: 1.6;

  /* --- Shapes --- */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  --radius-button: var(--radius-md);
  --radius-card: var(--radius-lg);
  --radius-input: var(--radius-md);

  /* --- Shadows --- */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
  --shadow-card: var(--shadow-md);

  /* --- Spacing (consistent section padding) --- */
  --section-padding-y: 4rem;
  --section-padding-y-lg: 6rem;
  --container-max-width: 80rem;
  --container-padding-x: 1.5rem;
}
```

### 1.2 — Tailwind v4 Integration

In `src/styles/global.css`, register the CSS variables as Tailwind custom utilities so they work in classes:

```css
@import "tailwindcss";
@import "./theme.css";

/* Register tokens as Tailwind v4 theme extensions */
@theme {
  --color-brand: var(--color-primary);
  --color-brand-hover: var(--color-primary-hover);
  --color-brand-light: var(--color-primary-light);
  --color-brand-secondary: var(--color-secondary);
  --color-brand-accent: var(--color-accent);
  --font-family-heading: var(--font-heading);
  --font-family-body: var(--font-body);
}
```

This lets components use classes like `bg-brand`, `text-brand`, `font-heading` — Tailwind utilities that resolve to our CSS variables.

### 1.3 — Database Schema

**File**: `api/src/schema_phase6.sql`

```sql
-- ============================================================
-- PHASE 6: Component Library & Design System
-- ============================================================

-- 1. DESIGN SETTINGS (one row per site, expandable)
CREATE TABLE IF NOT EXISTS design_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL DEFAULT 1,

  -- Brand Colors
  color_primary VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  color_primary_hover VARCHAR(7) NOT NULL DEFAULT '#1D4ED8',
  color_primary_light VARCHAR(7) NOT NULL DEFAULT '#DBEAFE',
  color_secondary VARCHAR(7) NOT NULL DEFAULT '#7C3AED',
  color_secondary_hover VARCHAR(7) NOT NULL DEFAULT '#6D28D9',
  color_secondary_light VARCHAR(7) NOT NULL DEFAULT '#EDE9FE',
  color_accent VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
  color_accent_hover VARCHAR(7) NOT NULL DEFAULT '#D97706',

  -- Neutral Scale
  color_neutral_50 VARCHAR(7) NOT NULL DEFAULT '#F9FAFB',
  color_neutral_100 VARCHAR(7) NOT NULL DEFAULT '#F3F4F6',
  color_neutral_200 VARCHAR(7) NOT NULL DEFAULT '#E5E7EB',
  color_neutral_300 VARCHAR(7) NOT NULL DEFAULT '#D1D5DB',
  color_neutral_600 VARCHAR(7) NOT NULL DEFAULT '#4B5563',
  color_neutral_700 VARCHAR(7) NOT NULL DEFAULT '#374151',
  color_neutral_800 VARCHAR(7) NOT NULL DEFAULT '#1F2937',
  color_neutral_900 VARCHAR(7) NOT NULL DEFAULT '#111827',

  -- Typography
  font_heading VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_body VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_size_base VARCHAR(10) NOT NULL DEFAULT '1rem',

  -- Shapes
  border_radius ENUM('none','small','medium','large','full') NOT NULL DEFAULT 'medium',
  shadow_style ENUM('none','subtle','medium','dramatic') NOT NULL DEFAULT 'subtle',

  -- Active theme preset (NULL = custom)
  active_preset_id INT DEFAULT NULL,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY idx_site_id (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default row
INSERT INTO design_settings (site_id) VALUES (1);


-- 2. THEME PRESETS
CREATE TABLE IF NOT EXISTS theme_presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  label_da VARCHAR(100) NOT NULL,
  description_da VARCHAR(255) DEFAULT NULL,
  settings JSON NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_preset_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO theme_presets (name, label_da, description_da, settings, is_default) VALUES
('business', 'Professionel', 'Klassisk og troværdig — perfekt til virksomheder og konsulenter', '{
  "color_primary":"#1E40AF","color_primary_hover":"#1E3A8A","color_primary_light":"#DBEAFE",
  "color_secondary":"#0F766E","color_secondary_hover":"#115E59","color_secondary_light":"#CCFBF1",
  "color_accent":"#D97706","color_accent_hover":"#B45309",
  "font_heading":"Inter","font_body":"Inter",
  "border_radius":"small","shadow_style":"subtle"
}', 1),
('vibrant', 'Kreativ', 'Farverig og energisk — til kreative brands og startups', '{
  "color_primary":"#7C3AED","color_primary_hover":"#6D28D9","color_primary_light":"#EDE9FE",
  "color_secondary":"#EC4899","color_secondary_hover":"#DB2777","color_secondary_light":"#FCE7F3",
  "color_accent":"#F59E0B","color_accent_hover":"#D97706",
  "font_heading":"Poppins","font_body":"Inter",
  "border_radius":"large","shadow_style":"medium"
}', 0),
('minimalist', 'Minimalistisk', 'Rent og simpelt — lader indholdet tale for sig selv', '{
  "color_primary":"#111827","color_primary_hover":"#030712","color_primary_light":"#F3F4F6",
  "color_secondary":"#6B7280","color_secondary_hover":"#4B5563","color_secondary_light":"#F9FAFB",
  "color_accent":"#2563EB","color_accent_hover":"#1D4ED8",
  "font_heading":"Inter","font_body":"Inter",
  "border_radius":"none","shadow_style":"none"
}', 0);


-- 3. COMPONENTS (the library registry)
CREATE TABLE IF NOT EXISTS components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL,
  name_da VARCHAR(100) NOT NULL,
  description_da TEXT NOT NULL,
  category ENUM('opener','trust','conversion','content','structure') NOT NULL,
  tier INT NOT NULL DEFAULT 1,

  -- Schema: JSON array defining the editable content fields
  schema_fields JSON NOT NULL,

  -- Default content: JSON object with example values
  default_content JSON NOT NULL,

  -- Docs reference
  doc_path VARCHAR(255) NOT NULL,

  -- SEO metadata for the AI
  seo_heading_level ENUM('h1','h2','none') NOT NULL DEFAULT 'h2',
  seo_schema_type VARCHAR(50) DEFAULT NULL,
  seo_notes TEXT DEFAULT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 4. PAGE COMPONENTS (content instances on pages)
CREATE TABLE IF NOT EXISTS page_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL,
  component_id INT NOT NULL,
  content JSON NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  heading_level_override ENUM('h1','h2','h3','none') DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE RESTRICT,
  INDEX idx_page_path (page_path),
  INDEX idx_page_sort (page_path, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.4 — API Routes

Create these route files in `api/src/routes/`:

**`design-settings.js`** — Design token CRUD

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/design-settings` | JWT | Get current design settings |
| `GET` | `/design-settings/public` | None | Read-only for build-time |
| `PUT` | `/design-settings` | JWT | Update design tokens |
| `POST` | `/design-settings/apply-preset` | JWT | Apply a theme preset |

**`theme-presets.js`** — Preset themes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/theme-presets` | JWT | List all presets |

**`components.js`** — Component registry

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/components` | JWT | List all active components |
| `GET` | `/components/:slug` | JWT | Single component with full schema |
| `GET` | `/components/:slug/doc` | JWT | Return the markdown doc file content |

**`page-components.js`** — Page content instances

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/page-components?page=/` | JWT | Components for a page (ordered) |
| `GET` | `/page-components/public?page=/` | None | Published only, for build-time |
| `POST` | `/page-components` | JWT | Add component to page |
| `PUT` | `/page-components/:id` | JWT | Update component content |
| `PUT` | `/page-components/:id/reorder` | JWT | Change sort_order |
| `DELETE` | `/page-components/:id` | JWT | Remove from page |

**`publish.js`** — Rebuild trigger

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/publish` | JWT | Trigger GitHub Actions workflow_dispatch |
| `GET` | `/publish/status` | JWT | Last publish timestamp |

### 1.5 — Testing Checkpoint

- [ ] All 4 tables created, seed data present
- [ ] All CRUD endpoints respond correctly with valid JWT
- [ ] Public endpoints return only `is_published = 1` data
- [ ] Invalid hex codes rejected with 400
- [ ] Content JSON validated against component `schema_fields`
- [ ] All mutations logged to `security_logs`

---

## Stage 2: Component Documentation System (for AI Agents)

**Goal**: Create a machine-readable documentation file for every component. This is the knowledge base the AI reads before assembling pages.

### 2.1 — Documentation Format

**Directory**: `api/src/component-docs/`

Each component gets a markdown file following a strict, parseable structure. The AI agent will read these files as context before making decisions.

### 2.2 — Documentation Template

Every `.md` file follows this exact structure:

```markdown
# Component: [name_da]
slug: [slug]
category: [opener|trust|conversion|content|structure]

## Purpose
[One paragraph: what this component does and WHY a website needs it]

## When to Use
- [Bullet: specific scenario where this component is the right choice]
- [Bullet: another scenario]

## When NOT to Use
- [Bullet: situations where a different component is better]

## SEO Rules
- heading_level: [h1|h2|none] — what heading tag the main title uses
- schema_type: [FAQPage|Service|Product|null] — applicable Schema.org type
- semantic_element: [section|article|aside|div] — HTML wrapper
- [Other SEO considerations specific to this component]

## Content Slots
| Slot Key | Type | Required | Label (DA) | Constraints | SEO Role |
|----------|------|----------|------------|-------------|----------|
| headline | text | yes | Overskrift | max 70 chars | H1 or H2 |
| ... | ... | ... | ... | ... | ... |

## Assembly Rules
- max_per_page: [1|2|unlimited]
- typical_position: [first|early|middle|late|last]
- pairs_well_with: [slugs of components that often follow this one]
- never_adjacent_to: [slugs that should not be placed next to this]

## Responsive Behavior
- mobile: [how the layout adapts at <768px]
- tablet: [768px–1024px behavior]
- desktop: [1024px+ behavior]

## HTML Skeleton
```html
[Minimal HTML structure showing semantic elements and key class patterns.
 NOT the full implementation — just enough for the AI to understand
 the structure and where content slots are injected.]
```
```

### 2.3 — Write All 18 Documentation Files

Here are the first 3 as detailed examples. The remaining 15 follow the same format.

---

#### `hero-centered.md`

```markdown
# Component: Hero — Centreret
slug: hero-centered
category: opener

## Purpose
The primary landing section of a page. Draws immediate attention with a large
headline, supporting text, and a prominent call-to-action button. Used as the
very first section visitors see. Sets the tone for the entire page.

## When to Use
- Homepage or any primary landing page
- When the page has a single clear message and CTA
- When no product/service image is needed above the fold

## When NOT to Use
- When a visual product showcase is needed → use hero-split or hero-image-bg
- Never use on sub-pages that already have a hero on the parent

## SEO Rules
- heading_level: h1 — the headline IS the page's H1
- schema_type: null (the page-level schema handles this)
- semantic_element: section
- The headline should contain the primary keyword naturally
- The subheadline should expand on the headline with secondary keywords
- Keep headline under 60 characters for optimal SERP display
- CTA button text should be action-oriented ("Få et gratis tilbud", not "Klik her")

## Content Slots
| Slot Key | Type | Required | Label (DA) | Constraints | SEO Role |
|----------|------|----------|------------|-------------|----------|
| headline | text | yes | Overskrift | max 70 chars | H1 — primary keyword |
| subheadline | text | no | Underoverskrift | max 160 chars | Supporting context |
| cta_text | text | yes | Knaptekst | max 30 chars | Action verb |
| cta_url | url | yes | Knaplink | valid URL | Internal link preferred |
| cta_secondary_text | text | no | Sekundær knaptekst | max 30 chars | — |
| cta_secondary_url | url | no | Sekundært link | valid URL | — |

## Assembly Rules
- max_per_page: 1
- typical_position: first (always the first section)
- pairs_well_with: [features-grid, stats-bar, logo-cloud]
- never_adjacent_to: [hero-split, hero-image-bg] (never two heroes)

## Responsive Behavior
- mobile: Single column, text centered, stacked CTA buttons, reduced heading size
- tablet: Same layout, slightly larger heading
- desktop: Full-width, generous vertical padding, large heading

## HTML Skeleton
```html
<section class="bg-[var(--color-bg-page)]">
  <div class="mx-auto max-w-screen-xl px-4 py-32 text-center">
    <h1 class="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl md:text-6xl"
        style="font-family: var(--font-heading)">
      {{headline}}
    </h1>
    <p class="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]"
       style="font-family: var(--font-body)">
      {{subheadline}}
    </p>
    <div class="mt-10 flex flex-wrap justify-center gap-4">
      <a href="{{cta_url}}"
         class="rounded-[var(--radius-button)] bg-[var(--color-primary)] px-8 py-3 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]">
        {{cta_text}}
      </a>
    </div>
  </div>
</section>
```
```

---

#### `features-grid.md`

```markdown
# Component: Feature Grid
slug: features-grid
category: trust

## Purpose
Displays 3 (or 6) key features/services in a responsive grid. Each feature has
an icon, title, and short description. This is the "what we offer" section that
builds understanding of the business value proposition.

## When to Use
- Immediately after a hero to explain services or features
- On service pages to list capabilities
- When you need to communicate 3–6 distinct value points

## When NOT to Use
- When features need long descriptions → use features-alternating
- When you only have 1–2 points → use content-section instead

## SEO Rules
- heading_level: h2 — the section title is an H2
- schema_type: Service (when describing business services)
- semantic_element: section
- Each feature title should be an H3 under the section H2
- Feature descriptions are excellent for long-tail keyword placement
- Keep each description to 1–2 sentences (40–80 words)

## Content Slots
| Slot Key | Type | Required | Label (DA) | Constraints | SEO Role |
|----------|------|----------|------------|-------------|----------|
| section_title | text | yes | Sektionstitel | max 60 chars | H2 — secondary keyword |
| section_subtitle | text | no | Beskrivelse | max 120 chars | Supporting context |
| features | array | yes | Features | 3 or 6 items | — |
| features[].icon | select | yes | Ikon | from icon set | — |
| features[].title | text | yes | Titel | max 40 chars | H3 — long-tail keyword |
| features[].description | textarea | yes | Beskrivelse | max 160 chars | Keyword-rich description |

## Assembly Rules
- max_per_page: 2
- typical_position: early (position 2–3, after hero)
- pairs_well_with: [hero-centered, hero-split, cta-banner, testimonials-cards]
- never_adjacent_to: [features-alternating] (too similar visually)

## Responsive Behavior
- mobile: Single column, stacked vertically
- tablet: 2-column grid
- desktop: 3-column grid (or 3×2 for 6 items)

## HTML Skeleton
```html
<section class="bg-[var(--color-bg-section-alt)]">
  <div class="mx-auto max-w-screen-xl px-4 py-16">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-[var(--color-text-primary)]">{{section_title}}</h2>
      <p class="mt-4 text-[var(--color-text-secondary)]">{{section_subtitle}}</p>
    </div>
    <div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {{#each features}}
      <div class="rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)]">
        <div class="text-[var(--color-primary)]">{{icon}}</div>
        <h3 class="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">{{title}}</h3>
        <p class="mt-2 text-[var(--color-text-secondary)]">{{description}}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>
```
```

---

#### `faq-accordion.md`

```markdown
# Component: FAQ Accordion
slug: faq-accordion
category: content

## Purpose
Displays frequently asked questions in an expandable accordion format.
Extremely valuable for SEO — eligible for FAQ rich results in Google
when combined with FAQPage schema markup.

## When to Use
- Any page where users have common questions
- Service pages: "Hvad koster det?", "Hvor lang tid tager det?"
- Dedicated FAQ pages
- When targeting question-based search queries

## When NOT to Use
- When you have fewer than 3 questions → use content-section instead
- When answers are very long (500+ words each) → use separate content pages

## SEO Rules
- heading_level: h2 — the section title is an H2
- schema_type: FAQPage — CRITICAL: this component auto-generates FAQPage JSON-LD
- semantic_element: section
- Each question becomes an H3 (or is wrapped in a summary/details pattern)
- Questions should match real search queries (use "Hvad", "Hvordan", "Hvor meget")
- Answers should be concise (40–100 words) to qualify for featured snippets
- Google displays FAQ rich results only when FAQPage schema is present

## Content Slots
| Slot Key | Type | Required | Label (DA) | Constraints | SEO Role |
|----------|------|----------|------------|-------------|----------|
| section_title | text | yes | Sektionstitel | max 60 chars | H2 |
| items | array | yes | Spørgsmål | 3–10 items | — |
| items[].question | text | yes | Spørgsmål | max 120 chars | H3 — match search queries |
| items[].answer | textarea | yes | Svar | max 500 chars | Featured snippet target |

## Assembly Rules
- max_per_page: 1
- typical_position: late (near bottom, before footer CTA)
- pairs_well_with: [cta-banner, contact-form]
- never_adjacent_to: [content-section] (too text-heavy together)

## Responsive Behavior
- mobile: Full-width accordion, touch-friendly tap targets (min 48px)
- tablet: Same layout with more padding
- desktop: Max-width constrained for readability (~768px content width)

## HTML Skeleton
```html
<section class="bg-[var(--color-bg-page)]">
  <div class="mx-auto max-w-screen-xl px-4 py-16">
    <h2 class="text-center text-3xl font-bold text-[var(--color-text-primary)]">{{section_title}}</h2>
    <div class="mx-auto mt-12 max-w-3xl divide-y divide-[var(--color-border)]">
      {{#each items}}
      <details class="group py-4">
        <summary class="flex cursor-pointer items-center justify-between font-medium text-[var(--color-text-primary)]">
          <h3>{{question}}</h3>
          <span class="transition group-open:rotate-180">▼</span>
        </summary>
        <p class="mt-4 leading-relaxed text-[var(--color-text-secondary)]">{{answer}}</p>
      </details>
      {{/each}}
    </div>
  </div>
</section>
<!-- Auto-generated FAQPage JSON-LD -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{{#each items}}{"@type":"Question","name":"{{question}}","acceptedAnswer":{"@type":"Answer","text":"{{answer}}"}}{{/each}}]
}
</script>
```
```

---

### 2.4 — Remaining 15 Documentation Files

Create following the same template. Here are the key details for each:

| Slug | heading_level | schema_type | max_per_page | typical_position | key SEO notes |
|------|--------------|-------------|-------------|-----------------|---------------|
| `hero-split` | h1 | null | 1 | first | Image alt text critical, lazy-load image |
| `hero-image-bg` | h1 | null | 1 | first | Ensure text contrast on image overlay, preload hero image |
| `features-alternating` | h2 | Service | 1 | early | Each feature block gets H3, images get descriptive alt |
| `stats-bar` | none | null | 1 | early | Numbers should use `<data>` element for semantics |
| `logo-cloud` | h2 | null | 1 | early-middle | All logos need company name as alt text |
| `testimonials-cards` | h2 | Review | 1 | middle | Quote text, person name + role. Review schema eligible |
| `pricing-cards` | h2 | Offer | 1 | middle | Use `<del>`/`<ins>` for price comparisons. Offer schema |
| `cta-banner` | h2 | null | 2 | middle/late | Short, action-focused. Contrasting background color |
| `cta-split` | h2 | null | 2 | middle | Subtler than cta-banner. Good for mid-page breaks |
| `contact-form` | h2 | null | 1 | last | Form `<label>` elements required for accessibility |
| `content-section` | h2 | null | unlimited | any | Generic rich text block. Proper `<p>` and `<ul>` usage |
| `blog-cards` | h2 | null | 1 | late | Each card links to article. Image alt text required |
| `team-grid` | h2 | Person | 1 | middle | Person schema, photo alt = person name |
| `header-navbar` | none | null | 1 | first (layout) | `<nav>` with `aria-label`, skip-to-content link |
| `footer-columns` | none | null | 1 | last (layout) | `<footer>` element, NAP (Name Address Phone) for local SEO |

### 2.5 — AI Context Bundle File

**File**: `api/src/component-docs/_COMPONENT_LIBRARY_INDEX.md`

A single master document the AI reads first to understand the full library:

```markdown
# Component Library Index — lavprishjemmeside.dk

## Overview
This library contains 18 curated, production-grade website components.
Each component is an Astro section that accepts content via JSON props
and is styled entirely with CSS custom properties (design tokens).

## Component Categories

### Openers (position: first on page)
Use EXACTLY ONE opener per page. The opener's headline is the page's H1.
- hero-centered: Centered text + CTA. Default choice.
- hero-split: Text left, image right. Use when product/service is visual.
- hero-image-bg: Full-bleed background image. High visual impact.

### Trust Builders (position: early, after opener)
Build credibility and explain the value proposition.
- features-grid: 3-column icon+title+description. The "what we do" section.
- features-alternating: Image+text alternating rows. For detailed explanations.
- stats-bar: Number highlights ("500+ kunder"). Social proof.
- logo-cloud: Client/partner logos. Trust signal.
- testimonials-cards: Customer quotes. Social proof.

### Conversion Drivers (position: middle or late)
Get the visitor to take action.
- pricing-cards: 2-3 tier pricing. For service/product pages.
- cta-banner: Full-width CTA. Use to break up content sections.
- cta-split: Subtler CTA. Good for mid-page.
- contact-form: Name/email/message form. Usually last before footer.

### Content (position: flexible)
Educate and inform visitors.
- faq-accordion: Expandable Q&A. Generates FAQPage schema.
- content-section: Generic heading + rich text. For any content.
- blog-cards: 3-column article card grid.
- team-grid: Photo + name + role grid. For "Om os" pages.

### Structure (position: fixed)
- header-navbar: Top navigation. One per site.
- footer-columns: Site footer. One per site.

## SEO Assembly Rules (CRITICAL)
1. Every page MUST have exactly ONE H1 (from the opener component)
2. Subsequent sections use H2 for their titles
3. Sub-elements within sections use H3
4. NEVER skip heading levels (no H1 → H3)
5. Components with schema_type auto-generate JSON-LD structured data
6. FAQ accordion: always include FAQPage schema
7. Every image MUST have descriptive alt text (not "image" or "foto")
8. CTA buttons: use action verbs ("Få tilbud", "Kontakt os", "Se priser")
9. Internal links are preferred over external links in CTAs

## Typical Page Blueprints

### Homepage (Forside)
1. hero-centered (H1: primary keyword + value prop)
2. features-grid (H2: "Hvad vi tilbyder")
3. stats-bar (social proof numbers)
4. testimonials-cards (H2: "Hvad vores kunder siger")
5. cta-banner (H2: action-oriented)
6. faq-accordion (H2: "Ofte stillede spørgsmål")

### Service Page (Ydelser)
1. hero-split (H1: service name + benefit)
2. features-alternating (H2: detailed service breakdown)
3. pricing-cards (H2: "Priser")
4. testimonials-cards (H2: social proof)
5. faq-accordion (H2: service-specific questions)
6. contact-form (H2: "Kontakt os")

### About Page (Om os)
1. hero-centered (H1: company identity statement)
2. content-section (H2: company story)
3. team-grid (H2: "Mød teamet")
4. stats-bar (company achievements)
5. cta-banner (H2: hiring or contact CTA)

### Contact Page (Kontakt)
1. hero-centered (H1: "Kontakt os")
2. contact-form (H2: form)
3. content-section (H2: address, phone, hours)
```

### 2.6 — Testing Checkpoint

- [ ] All 18 `.md` files exist in `api/src/component-docs/`
- [ ] `_COMPONENT_LIBRARY_INDEX.md` exists and covers all components
- [ ] `GET /components/:slug/doc` returns the correct markdown content
- [ ] Every file follows the exact template structure
- [ ] Every component's `schema_fields` in the database matches its doc file's Content Slots table
- [ ] SEO rules are specific and actionable (not vague)

---

## Stage 3: Astro Component Implementation

**Goal**: Create the actual `.astro` files for all 18 components. Each renders from props and uses only CSS variables for styling.

### 3.1 — Component Directory

```
src/components/sections/
├── HeroCentered.astro
├── HeroSplit.astro
├── HeroImageBg.astro
├── FeaturesGrid.astro
├── FeaturesAlternating.astro
├── StatsBar.astro
├── LogoCloud.astro
├── TestimonialsCards.astro
├── PricingCards.astro
├── CtaBanner.astro
├── CtaSplit.astro
├── ContactForm.astro
├── FaqAccordion.astro
├── ContentSection.astro
├── BlogCards.astro
├── TeamGrid.astro
├── HeaderNavbar.astro
└── FooterColumns.astro
```

### 3.2 — Implementation Rules (For Every Component)

1. **Props interface**: TypeScript `interface Props` matching the component's `schema_fields`
2. **CSS variables only**: Never `bg-blue-600`. Always `bg-[var(--color-primary)]` or the registered Tailwind `bg-brand`
3. **Semantic HTML**: Use `<section>`, `<article>`, `<nav>`, `<footer>`, `<details>` correctly
4. **Heading levels**: Accept as prop or use the component's default. Support `heading_level_override`
5. **Responsive**: Mobile-first. Test at 320px, 768px, 1280px
6. **Accessibility**: All interactive elements keyboard-navigable, proper `aria-*` attributes
7. **Schema.org**: Components with `seo_schema_type` auto-generate `<script type="application/ld+json">`
8. **No external JS dependencies**: Pure HTML + Tailwind. Only native `<details>/<summary>` for accordions
9. **Image handling**: Always include `alt`, `width`, `height`, `loading="lazy"` (except hero images which should be `loading="eager"`)

### 3.3 — ComponentRenderer.astro

**File**: `src/components/ComponentRenderer.astro`

```astro
---
// Maps slug → Astro component and renders the correct one

import HeroCentered from './sections/HeroCentered.astro';
import HeroSplit from './sections/HeroSplit.astro';
import HeroImageBg from './sections/HeroImageBg.astro';
import FeaturesGrid from './sections/FeaturesGrid.astro';
import FeaturesAlternating from './sections/FeaturesAlternating.astro';
import StatsBar from './sections/StatsBar.astro';
import LogoCloud from './sections/LogoCloud.astro';
import TestimonialsCards from './sections/TestimonialsCards.astro';
import PricingCards from './sections/PricingCards.astro';
import CtaBanner from './sections/CtaBanner.astro';
import CtaSplit from './sections/CtaSplit.astro';
import ContactForm from './sections/ContactForm.astro';
import FaqAccordion from './sections/FaqAccordion.astro';
import ContentSection from './sections/ContentSection.astro';
import BlogCards from './sections/BlogCards.astro';
import TeamGrid from './sections/TeamGrid.astro';

interface Props {
  slug: string;
  content: Record<string, any>;
  headingLevel?: 'h1' | 'h2' | 'h3';
}

const { slug, content, headingLevel } = Astro.props;

const componentMap: Record<string, any> = {
  'hero-centered': HeroCentered,
  'hero-split': HeroSplit,
  'hero-image-bg': HeroImageBg,
  'features-grid': FeaturesGrid,
  'features-alternating': FeaturesAlternating,
  'stats-bar': StatsBar,
  'logo-cloud': LogoCloud,
  'testimonials-cards': TestimonialsCards,
  'pricing-cards': PricingCards,
  'cta-banner': CtaBanner,
  'cta-split': CtaSplit,
  'contact-form': ContactForm,
  'faq-accordion': FaqAccordion,
  'content-section': ContentSection,
  'blog-cards': BlogCards,
  'team-grid': TeamGrid,
};

const Component = componentMap[slug];
---

{Component && <Component content={content} headingLevel={headingLevel} />}
```

### 3.4 — Sourcing the HTML

For each component, the developer should:

1. Go to the source library (HyperUI/Flowbite/Preline) and find the listed component variant
2. Copy the raw HTML
3. **Replace all hardcoded colors** with CSS variable references:
   - `bg-blue-600` → `bg-[var(--color-primary)]`
   - `text-gray-900` → `text-[var(--color-text-primary)]`
   - `text-gray-600` → `text-[var(--color-text-secondary)]`
   - `border-gray-200` → `border-[var(--color-border)]`
   - etc.
4. **Replace hardcoded border-radius** with `rounded-[var(--radius-card)]`, `rounded-[var(--radius-button)]`
5. **Replace hardcoded shadows** with `shadow-[var(--shadow-card)]`
6. **Replace hardcoded text** with `{{content.field_name}}` Astro prop references
7. **Wrap in proper semantic HTML** if the source lacks it
8. **Add the TypeScript Props interface** matching the schema_fields
9. **Test responsive behavior** at all 3 breakpoints

### 3.5 — Testing Checkpoint

- [ ] All 18 `.astro` files created and TypeScript-clean
- [ ] Each component renders with default_content from the database
- [ ] Zero hardcoded colors — everything uses CSS variables
- [ ] Heading levels are correct (H1 for openers, H2 for sections, H3 for sub-items)
- [ ] Schema.org JSON-LD generated for FAQ, Testimonials, Pricing, Team
- [ ] All components responsive at 320px, 768px, 1280px
- [ ] Lighthouse accessibility score ≥ 95 on test page with all components

---

## Stage 4: Build Pipeline & Publish Flow

**Goal**: Wire up the static site generation to read from the database and deploy on demand.

### 4.1 — Build-Time Data Fetching

**File**: `src/lib/cms.ts`

```typescript
const API_BASE = import.meta.env.PUBLIC_API_URL || 'https://api.lavprishjemmeside.dk';

export async function getDesignSettings(): Promise<DesignSettings> {
  const res = await fetch(`${API_BASE}/design-settings/public`);
  if (!res.ok) return DEFAULT_DESIGN_SETTINGS; // fallback
  return res.json();
}

export async function getPageComponents(pagePath: string): Promise<PageComponent[]> {
  const res = await fetch(`${API_BASE}/page-components/public?page=${encodeURIComponent(pagePath)}`);
  if (!res.ok) return DEFAULT_PAGE_COMPONENTS[pagePath] || [];
  return res.json();
}
```

**Critical**: Both functions have hardcoded fallbacks. The build must NEVER fail if the API is down.

### 4.2 — Theme CSS Generation Script

**File**: `scripts/generate-theme.mjs`

Runs as `prebuild` step. Fetches design settings from API, generates `src/styles/theme.css`.

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-theme.mjs",
    "build": "astro build"
  }
}
```

Maps the enum values to CSS:
- `border_radius: "small"` → `--radius-button: 0.25rem; --radius-card: 0.375rem;`
- `border_radius: "large"` → `--radius-button: 0.75rem; --radius-card: 1rem;`
- `shadow_style: "none"` → `--shadow-card: none;`
- `shadow_style: "dramatic"` → `--shadow-card: 0 10px 25px rgba(0,0,0,0.15);`

### 4.3 — Refactor Public Pages

**File**: `src/pages/index.astro` (and future pages)

```astro
---
import Layout from '../layouts/Layout.astro';
import ComponentRenderer from '../components/ComponentRenderer.astro';
import { getPageComponents } from '../lib/cms';

const components = await getPageComponents('/');
---
<Layout title="Billige Hjemmesider | Lavprishjemmeside.dk">
  {components.map(({ slug, content, heading_level_override }, index) => (
    <ComponentRenderer
      slug={slug}
      content={content}
      headingLevel={heading_level_override || (index === 0 ? 'h1' : 'h2')}
    />
  ))}
</Layout>
```

### 4.4 — GitHub Actions: Publish Trigger

Update `deploy.yml`:
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # ← allows API-triggered rebuilds
```

Implement `POST /publish` endpoint:
```javascript
// Trigger GitHub Actions via workflow_dispatch
const response = await fetch(
  'https://api.github.com/repos/kimjeppesen01/lavprishjemmeside.dk/actions/workflows/deploy.yml/dispatches',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({ ref: 'main' })
  }
);
```

Add `GITHUB_PAT` to server `.env`. Rate limit: max 1 publish per 2 minutes.

### 4.5 — Testing Checkpoint

- [ ] `npm run build` generates static pages with CMS content
- [ ] Fallback works: if API is down, build still succeeds with defaults
- [ ] `theme.css` is generated correctly from design_settings
- [ ] `POST /publish` triggers GitHub Actions run
- [ ] Full cycle: change content in DB → publish → site reflects changes within ~90 seconds

---

## Stage 5: AI Content Developer (Anthropic Integration)

**Goal**: Build the API endpoint that accepts a structured content brief and uses Claude to select components, order them, and populate all content slots.

### 5.1 — API Route

**File**: `api/src/routes/ai-assemble.js`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/ai/assemble` | JWT | AI assembles page from content brief |

### 5.2 — Request Format

```json
{
  "page_path": "/ydelser/webdesign",
  "content_brief": {
    "topic": "Webdesign services for small businesses",
    "target_keyword": "billigt webdesign",
    "audience": "Danish small business owners",
    "page_type": "service",
    "title": "Professionelt Webdesign til Små Virksomheder",
    "meta_description": "Få et professionelt webdesign til din virksomhed...",
    "sections": [
      {
        "heading": "Professionelt Webdesign fra 4.999 kr.",
        "content": "Vi bygger hurtige, moderne hjemmesider...",
        "intent": "hero"
      },
      {
        "heading": "Hvad er inkluderet?",
        "content": "Responsivt design, SEO-optimering, ...",
        "features": ["Responsivt design", "SEO-optimering", "CMS"],
        "intent": "features"
      }
    ],
    "faqs": [
      { "q": "Hvad koster en hjemmeside?", "a": "Priser starter fra 4.999 kr..." }
    ]
  }
}
```

### 5.3 — How the AI Agent Works

```javascript
const Anthropic = require('@anthropic-ai/sdk');

async function assemblePageComponents(contentBrief) {
  // 1. Load the component library index
  const libraryIndex = fs.readFileSync(
    path.join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md'), 'utf-8'
  );

  // 2. Load relevant component docs based on content brief intents
  const relevantDocs = loadRelevantDocs(contentBrief);

  // 3. Load current design settings context
  const designSettings = await db.query('SELECT * FROM design_settings WHERE site_id = 1');

  // 4. Call Anthropic API
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(libraryIndex, relevantDocs, designSettings),
    messages: [{ role: 'user', content: buildUserPrompt(contentBrief) }]
  });

  // 5. Parse response → array of page_components
  // 6. Validate each component's content against schema_fields
  // 7. Return validated components ready for database insertion
}
```

### 5.4 — System Prompt (What the AI Agent Knows)

```
You are a world-class web developer and SEO specialist building Danish business websites.

You receive a content brief and must select the optimal components from the component 
library to assemble a complete, SEO-optimized page.

COMPONENT LIBRARY:
{libraryIndex}

DETAILED COMPONENT SPECIFICATIONS:
{relevantDocs}

YOUR TASK:
1. Read the content brief
2. Select the best components for this page type
3. Order them following the assembly rules (opener first, CTA near end, etc.)
4. Fill every content slot with the provided copy
5. Ensure heading hierarchy: exactly ONE H1 (from opener), then H2s, then H3s
6. Return a JSON array of page_component objects

OUTPUT FORMAT (strict JSON):
[
  {
    "component_slug": "hero-centered",
    "sort_order": 1,
    "heading_level_override": "h1",
    "content": {
      "headline": "...",
      "subheadline": "...",
      "cta_text": "...",
      "cta_url": "..."
    }
  },
  ...
]

RULES:
- Every page needs exactly ONE opener (hero) component with H1
- Never place two hero variants on the same page
- Follow max_per_page limits from component docs
- Follow never_adjacent_to rules
- All text must be in Danish
- CTA text must use action verbs
- Every image alt text must be descriptive (never empty or "image")
- FAQ items should match real search queries Danish users would type
```

### 5.5 — Validation Layer

After the AI returns components, validate BEFORE inserting into the database:

```javascript
function validateAssembly(components) {
  const errors = [];

  // 1. Exactly one H1 exists
  const h1Count = components.filter(c => c.heading_level_override === 'h1').length;
  if (h1Count !== 1) errors.push('Page must have exactly one H1');

  // 2. First component is an opener
  const openerSlugs = ['hero-centered', 'hero-split', 'hero-image-bg'];
  if (!openerSlugs.includes(components[0]?.component_slug)) {
    errors.push('First component must be a hero/opener');
  }

  // 3. No duplicate openers
  const openers = components.filter(c => openerSlugs.includes(c.component_slug));
  if (openers.length > 1) errors.push('Only one opener per page');

  // 4. Validate each component's content against schema_fields
  for (const comp of components) {
    const schema = getSchemaForSlug(comp.component_slug);
    const contentErrors = validateContentAgainstSchema(comp.content, schema);
    errors.push(...contentErrors);
  }

  // 5. Check never_adjacent_to rules
  // ... adjacency validation

  return errors;
}
```

### 5.6 — Admin UI: AI Assembly Trigger

**File**: `src/pages/admin/ai-assemble.astro`

A simple form where the admin:
1. Pastes or types a content brief (or selects a pre-made one)
2. Clicks "Generer side" (Generate page)
3. Sees a preview of the AI's component selection
4. Can manually adjust (reorder, edit, remove) before confirming
5. Clicks "Gem" (Save) to persist to database
6. Clicks "Publicer" to trigger rebuild

### 5.7 — Environment Setup

Add to `api/.env`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
```

Add to `api/package.json` dependencies:
```json
"@anthropic-ai/sdk": "^0.39.0"
```

### 5.8 — Rate Limiting & Cost Control

- Rate limit: 10 AI assembly requests per hour per user
- Log every request to `security_logs` with token count
- Estimated cost: ~$0.01–0.03 per page assembly (Sonnet)
- Add a `ai_usage` table to track usage per user if needed later

### 5.9 — Testing Checkpoint

- [ ] `POST /ai/assemble` accepts content brief and returns valid component array
- [ ] AI selects appropriate components for different page types (homepage, service, about)
- [ ] Heading hierarchy is always correct (one H1, then H2s)
- [ ] Content slots validated against schema — invalid assemblies rejected
- [ ] Assembly rules respected (no adjacent forbidden pairs, max_per_page honored)
- [ ] Admin UI shows preview of AI's output before saving
- [ ] Full pipeline: content brief → AI assembly → save → publish → live page

---

## Stage 6: Admin Dashboard UI Pages

**Goal**: Build the admin interface for styling, component browsing, and page building.

### 6.1 — Styling Dashboard (`/admin/styling/`)

Color pickers, theme preset selector, typography and shape controls, live preview panel. See original Stage 2 in previous plan — that design remains valid.

### 6.2 — Component Library Browser (`/admin/components/`)

Card grid showing all 18 components with:
- Category filter tabs
- Component name + description (Danish)
- "Se dokumentation" button → shows the markdown doc rendered as HTML
- "Tilføj til side" → select which page to add it to

### 6.3 — Page Builder (`/admin/pages/`)

Select page → see components in order → reorder with ▲/▼ → edit content → preview → publish. See original Stage 4 design.

### 6.4 — Update AdminLayout Sidebar

```
Dashboard     → /admin/dashboard/
Styling       → /admin/styling/
Komponenter   → /admin/components/
Sider         → /admin/pages/
AI Assemble   → /admin/ai-assemble/
```

---

## Stage 7: Production Hardening

### 7.1 — Fallback System
- Build never fails: hardcoded defaults for design settings and homepage components
- `generate-theme.mjs` uses defaults if API unreachable
- `cms.ts` returns fallback component arrays if API unreachable

### 7.2 — Validation
- Server: hex colors validated, content validated against schema, SQL parameterized
- Client: hex format checked before save, required fields enforced

### 7.3 — Security
- All write endpoints: JWT admin auth + rate limiting + security_logs
- Public read endpoints: only `is_published = 1`, aggressive cache (5min TTL)
- `ANTHROPIC_API_KEY` and `GITHUB_PAT` in `.env` only (never committed)
- AI-generated HTML sanitized before database storage

### 7.4 — Documentation
- Update `PROJECT_CONTEXT.md` with Phase 6 completion
- Document all new API endpoints, tables, environment variables

---

## Complete File Inventory

### New Files

```
api/src/
├── schema_phase6.sql
├── component-docs/                      # 19 markdown files
│   ├── _COMPONENT_LIBRARY_INDEX.md      # Master index for AI
│   ├── hero-centered.md
│   ├── hero-split.md
│   ├── hero-image-bg.md
│   ├── features-grid.md
│   ├── features-alternating.md
│   ├── stats-bar.md
│   ├── logo-cloud.md
│   ├── testimonials-cards.md
│   ├── pricing-cards.md
│   ├── cta-banner.md
│   ├── cta-split.md
│   ├── contact-form.md
│   ├── faq-accordion.md
│   ├── content-section.md
│   ├── blog-cards.md
│   ├── team-grid.md
│   ├── header-navbar.md
│   └── footer-columns.md
├── routes/
│   ├── design-settings.js
│   ├── theme-presets.js
│   ├── components.js
│   ├── page-components.js
│   ├── ai-assemble.js
│   └── publish.js

scripts/
└── generate-theme.mjs

src/
├── lib/
│   └── cms.ts
├── styles/
│   └── theme.css
├── components/
│   ├── ComponentRenderer.astro
│   └── sections/                        # 18 Astro component files
│       ├── HeroCentered.astro
│       ├── HeroSplit.astro
│       ├── HeroImageBg.astro
│       ├── FeaturesGrid.astro
│       ├── FeaturesAlternating.astro
│       ├── StatsBar.astro
│       ├── LogoCloud.astro
│       ├── TestimonialsCards.astro
│       ├── PricingCards.astro
│       ├── CtaBanner.astro
│       ├── CtaSplit.astro
│       ├── ContactForm.astro
│       ├── FaqAccordion.astro
│       ├── ContentSection.astro
│       ├── BlogCards.astro
│       └── TeamGrid.astro
└── pages/admin/
    ├── styling.astro
    ├── components.astro
    ├── pages.astro
    └── ai-assemble.astro
```

### Modified Files

```
api/server.cjs                  # Register 6 new route files
api/.env.example                # Add ANTHROPIC_API_KEY, GITHUB_PAT
api/package.json                # Add @anthropic-ai/sdk dependency
src/styles/global.css           # Import theme.css, add @theme block
src/layouts/Layout.astro        # Load Google Fonts dynamically from design settings
src/layouts/AdminLayout.astro   # Add 4 new sidebar nav items
src/pages/index.astro           # Refactor to use CMS data via ComponentRenderer
.github/workflows/deploy.yml   # Add workflow_dispatch + PUBLIC_API_URL env
package.json                    # Add prebuild script
PROJECT_CONTEXT.md              # Document Phase 6
```

### New Environment Variables (server `.env`)

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

---

## Execution Order & Dependencies

```
Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5 → Stage 6 → Stage 7
 (DB &     (Comp     (Astro    (Build &   (AI        (Admin    (Harden)
  Tokens)   Docs)     Files)    Publish)   Agent)     UI)
```

**Each stage MUST be completed and tested before starting the next.**

| Stage | What | Effort |
|-------|------|--------|
| 1 | Design tokens + DB + API routes | 2 days |
| 2 | 18 component doc files + index | 2–3 days |
| 3 | 18 Astro components + ComponentRenderer | 3–4 days |
| 4 | Build pipeline + publish flow | 1–2 days |
| 5 | AI Content Developer (Anthropic) | 2–3 days |
| 6 | Admin dashboard UI (4 pages) | 3–4 days |
| 7 | Hardening + documentation | 1–2 days |
| **Total** | | **14–20 days** |

---

## Critical Reminders for the Developer

1. **Component HTML source**: Curate from HyperUI (MIT), Flowbite free (MIT), Preline free (MIT). Copy HTML only — zero npm dependencies from these libraries.
2. **Zero hardcoded colors**: Every component uses CSS variables. If you see `blue-600` in a component, it's a bug.
3. **Heading hierarchy is sacred**: One H1 per page (from opener). All section titles are H2. Sub-items are H3. Never skip levels.
4. **Component docs are the AI's brain**: The quality of AI page assembly directly depends on how well the component docs are written. Invest time here.
5. **All user-facing text in Danish**: Buttons, labels, error messages, toasts, placeholder content.
6. **Build must never fail if API is down**: Always provide fallback values in `cms.ts` and `generate-theme.mjs`.
7. **`.cjs` entry point for API, `DB_HOST=127.0.0.1`, `path.join(__dirname, '.env')`** — same gotchas as all previous phases.
8. **`git pull --rebase` before push** — GitHub Actions commits `dist/` back to `main`.
9. **Anthropic SDK**: Use `@anthropic-ai/sdk` npm package. Model: `claude-sonnet-4-20250514`. Keep AI calls server-side only.
10. **Test the full loop**: Content brief → AI assembly → validate → save → publish → live static page with correct heading hierarchy and Schema.org markup.

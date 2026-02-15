# TODO: Component Hardening & normalizeProps Cleanup

**Created:** 2026-02-15  
**Status:** ✅ Implemented 2026-02-15

**Context:** Senior review found that the AI generator was sending prop names the components didn't expect, causing build crashes. Two structural fixes were made; this document covers the remaining mechanical work.

---

## What Was Already Done (DO NOT REDO)

### 1. AI Prompt Fix (`api/src/services/anthropic.js`)
- `buildSystemPrompt()` now includes **exact TypeScript schemas and JSON examples** extracted from the component docs, so the AI generates correct prop names
- Temperature lowered from `0.7` → `0.3` (reliable structured JSON output)
- `max_tokens` raised from `4096` → `8192` (room for 8 complex components)
- New helper `buildComponentSchemaReference()` parses schemas from `api/src/component-docs/*.md`

### 2. Stack Trace Fix (`api/src/routes/ai-generate.js`)
- Removed `debug` and `stack` fields from the 500 error response (security)

### 3. Components Already Updated (safe defaults + `instanceId` in Props)
These files are DONE — don't touch them:
- `PricingTable.astro` — `tiers = []`, `instanceId`, guarded `tier.cta?.href`
- `HeroSection.astro` — `headline = ''`, `description = ''`, `instanceId`
- `CtaSection.astro` — `headline = ''`, `instanceId`, cleaned up `Astro.props.instanceId` → `instanceId`
- `VideoEmbed.astro` — `videoUrl = ''`, `instanceId`, cleaned up id reference
- `Breadcrumbs.astro` — `items = []`, `instanceId`
- `GalleryGrid.astro` — `images = []`, `instanceId`
- `LogoCloud.astro` — `logos = []`, `instanceId`, cleaned up id reference

---

## Task 1: Update Remaining Components (8 files)

For each file below, make exactly two changes:

### Change A: Add `instanceId` to the Props interface
Add this line before the closing `}` of the interface:
```typescript
  instanceId?: string | number;
```

### Change B: Add safe defaults to the destructuring
Change the `const { ... } = Astro.props;` line to include defaults for required array/string props and `instanceId = 'default'`.

### Change C: Clean up `Astro.props.instanceId ?? 'default'` references
If the template uses `Astro.props.instanceId ?? 'default'` anywhere, change it to just `instanceId` (since it's now destructured with a default).

---

### File-by-file instructions:

#### `src/components/ComparisonTable.astro`
**Current:**
```typescript
const { headline, products, features, data } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Sammenlign', products = [], features = [], data = [], instanceId = 'default' } = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/TestimonialsCarousel.astro`
**Current:**
```typescript
const { headline, testimonials } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Anmeldelser', testimonials = [], instanceId = 'default' } = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/StatsBanner.astro`
**Current:**
```typescript
const {
  stats,
  backgroundColor = 'default',
} = Astro.props;
```
**Change to:**
```typescript
const {
  stats = [],
  backgroundColor = 'default',
  instanceId = 'default',
} = Astro.props;
```

#### `src/components/FeaturesGrid.astro`
**Current:**
```typescript
const {
  headline,
  description,
  features,
  columns = 3,
} = Astro.props;
```
**Change to:**
```typescript
const {
  headline = 'Funktioner',
  description,
  features = [],
  columns = 3,
  instanceId = 'default',
} = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/IconCards.astro`
**Current:**
```typescript
const { headline, cards, columns = 3 } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Kort', cards = [], columns = 3, instanceId = 'default' } = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/TeamGrid.astro`
**Current:**
```typescript
const { headline, members, columns = 3 } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Vores team', members = [], columns = 3, instanceId = 'default' } = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/Timeline.astro`
**Current:**
```typescript
const { headline, events } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Tidslinje', events = [], instanceId = 'default' } = Astro.props;
```
**Also:** Change `Astro.props.instanceId ?? 'default'` → `instanceId` in the template.

#### `src/components/FaqAccordion.astro`
**Current:**
```typescript
const { headline, faqs, defaultOpen = 0, instanceId = 'default' } = Astro.props;
```
**Change to:**
```typescript
const { headline = 'Ofte stillede spørgsmål', faqs = [], defaultOpen = 0, instanceId = 'default' } = Astro.props;
```
(This file already has `instanceId` in Props — only add the defaults for `headline` and `faqs`.)

#### `src/components/NewsletterSignup.astro`
**Current Props interface** is missing `instanceId`. Add it:
```typescript
  instanceId?: string | number;
```
**Current destructuring:**
```typescript
const {
  headline,
  ...
```
**Change to:**
```typescript
const {
  headline = 'Nyhedsbrev',
  ...
```
(Rest of the destructuring already has `instanceId = 'default'`.)

---

## Task 2: Simplify `normalizeProps()` in `src/pages/[...slug].astro`

Now that the AI prompt includes exact schemas (Task already done), `normalizeProps()` should be a **thin safety net**, not a full prop-mapping layer.

### What to keep:
- The `switch` statement structure
- Default headlines for each component (fallback if headline is missing)
- Array safety: `if (!Array.isArray(props.X)) props.X = [];`

### What to REMOVE:
- **All prop renaming logic** — the AI now gets correct schemas, so `items → faqs`, `plans → tiers`, `content → quote`, `number → value`, `avatar → photo` mappings are no longer needed
- **The entire `comparison-table` case** with its complex `features[0]?.items` and `columns/rows` conversion — if the AI still sends wrong structure, the component will show an empty table instead of crashing (because of safe defaults)

### Simplified version:
```typescript
function normalizeProps(slug: string, rawProps: any): any {
  const props = JSON.parse(JSON.stringify(rawProps));

  switch (slug) {
    case 'faq-accordion':
      if (!Array.isArray(props.faqs)) props.faqs = [];
      if (!props.headline) props.headline = 'Ofte stillede spørgsmål';
      break;

    case 'pricing-table':
      if (!Array.isArray(props.tiers)) props.tiers = [];
      if (!props.headline) props.headline = 'Priser';
      break;

    case 'comparison-table':
      if (!Array.isArray(props.products)) props.products = [];
      if (!Array.isArray(props.features)) props.features = [];
      if (!Array.isArray(props.data)) props.data = [];
      if (!props.headline) props.headline = 'Sammenlign';
      break;

    case 'testimonials-carousel':
      if (!Array.isArray(props.testimonials)) props.testimonials = [];
      if (!props.headline) props.headline = 'Anmeldelser';
      break;

    case 'stats-banner':
      if (!Array.isArray(props.stats)) props.stats = [];
      break;

    case 'features-grid':
      if (!Array.isArray(props.features)) props.features = [];
      if (!props.headline) props.headline = 'Funktioner';
      break;

    case 'icon-cards':
      if (!Array.isArray(props.cards)) props.cards = [];
      if (!props.headline) props.headline = 'Kort';
      break;

    case 'team-grid':
      if (!Array.isArray(props.members)) props.members = [];
      if (!props.headline) props.headline = 'Vores team';
      break;

    case 'timeline':
      if (!Array.isArray(props.events)) props.events = [];
      if (!props.headline) props.headline = 'Tidslinje';
      break;

    case 'logo-cloud':
      if (!Array.isArray(props.logos)) props.logos = [];
      break;

    case 'gallery-grid':
      if (!Array.isArray(props.images)) props.images = [];
      break;

    case 'breadcrumbs':
      if (!Array.isArray(props.items)) props.items = [];
      break;

    default:
      break;
  }

  return props;
}
```

---

## Task 3: Test

After making all changes, run:
```bash
npm run build
```
The build MUST succeed before pushing. If it fails, check the error — it will tell you which component and which prop is undefined.

---

## Completed Implementation (2026-02-15)

- **Task 1:** FaqAccordion (headline + faqs defaults), NewsletterSignup (instanceId in Props, headline default). ComparisonTable, TestimonialsCarousel, StatsBanner, FeaturesGrid, IconCards, TeamGrid, Timeline were already done.
- **Task 2:** `normalizeProps()` simplified — removed all prop renaming (items→faqs, plans→tiers, content→quote, etc.), removed comparison-table complex conversion, removed pricing-table tier normalization. Kept array safety and default headlines for all components.
- **Task 3:** `npm run build` — succeeded.

---

## Rules

- **DO NOT** change any template HTML/CSS in the components — only the frontmatter (between the `---` markers)
- **DO NOT** add new features or refactor anything else
- **DO NOT** touch files listed in "Already Done" section
- **DO NOT** change the component docs in `api/src/component-docs/`
- Read `PROJECT_CONTEXT.md` first for full project context
- Each component edit is independent — if one fails, skip it and continue with the others

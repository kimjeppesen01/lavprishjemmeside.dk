# TODO: SEO Meta & Schema Markup — Handover for Next AI Agent

**Created:** 2026-02-15
**Status:** ✅ COMPLETE — All 8 tasks done
**Plan file:** `.claude/plans/cryptic-napping-cake.md`
**Context:** Read `HANDOVER.md` and `PROJECT_CONTEXT.md` first for full project context.

---

## What Was Already Done (DO NOT REDO)

### 1. ✅ `api/src/schema_page_meta.sql` — Created
New `page_meta` table with `meta_title`, `meta_description`, `og_image`, `schema_markup` (JSON).
**Action needed:** Run this SQL on the production database via phpMyAdmin.

### 2. ✅ `api/src/routes/page-components.js` — Page-meta endpoints added
Three new endpoints at the bottom of the file:
- `GET /page-components/public-meta?page=all` — No auth, returns `{ "/priser": { meta_title, meta_description, og_image, schema_markup }, ... }` for build
- `GET /page-components/page-meta?page=/priser` — Auth required, returns meta for one page
- `POST /page-components/page-meta/update` — Auth required, upserts page_meta row
Both GET endpoints gracefully handle `ER_NO_SUCH_TABLE` (returns empty/null).

### 3. ✅ `api/src/services/anthropic.js` — AI prompt + parser updated
- System prompt now has `## SEO Metadata` section with instructions for `meta_title` (max 60 chars), `meta_description` (max 160 chars), `schema_type` selection
- Output format changed from flat array to `{ "seo": {...}, "components": [...] }`
- `parseComponentsFromResponse()` handles both new object format and legacy array format (backwards compat)
- `generatePageContent()` now returns `{ components, seo, usage }`

### 4. ✅ `api/src/routes/ai-generate.js` — Saves SEO metadata
- After saving components (step 3), step 4 calls `buildSchemaMarkup()` and upserts into `page_meta`
- **BLOCKER:** `buildSchemaMarkup()` function is **NOT YET DEFINED** — this is the first remaining task

---

## Remaining Tasks (DO THESE IN ORDER)

### Task 5: Add `buildSchemaMarkup()` function to `ai-generate.js`

Add this function BEFORE `module.exports = router;` in `api/src/routes/ai-generate.js`:

```javascript
/**
 * Build structured data (JSON-LD) for a page based on AI's schema_type hint and actual component data.
 * Returns an array of schema.org objects.
 */
function buildSchemaMarkup(pagePath, seoData, components) {
  const siteUrl = 'https://www.lavprishjemmeside.dk';
  const schemas = [];

  // 1. BreadcrumbList — always included
  const segments = pagePath.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean);
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Forside', item: siteUrl + '/' }
  ];
  segments.forEach((seg, i) => {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: i + 2,
      name: seg.charAt(0).toUpperCase() + seg.slice(1),
      item: siteUrl + '/' + segments.slice(0, i + 1).join('/')
    });
  });
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems
  });

  // 2. WebPage (base — always included)
  const webPage = {
    '@context': 'https://schema.org',
    '@type': seoData.schema_type || 'WebPage',
    '@id': siteUrl + pagePath + '#webpage',
    name: seoData.meta_title || segments[segments.length - 1] || 'Side',
    url: siteUrl + pagePath,
    description: seoData.meta_description || '',
    inLanguage: 'da-DK',
    isPartOf: {
      '@type': 'WebSite',
      '@id': siteUrl + '/#website',
      name: 'Lavprishjemmeside.dk',
      url: siteUrl + '/'
    },
    publisher: { '@id': siteUrl + '/#organization' }
  };
  schemas.push(webPage);

  // 3. FAQPage — if page has faq-accordion components
  const faqComponent = components.find(c => c.component_slug === 'faq-accordion');
  if (faqComponent && Array.isArray(faqComponent.props_data.faqs)) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqComponent.props_data.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  // 4. Product — if page has pricing-table components
  const pricingComponent = components.find(c => c.component_slug === 'pricing-table');
  if (pricingComponent && Array.isArray(pricingComponent.props_data.tiers)) {
    pricingComponent.props_data.tiers.forEach(tier => {
      if (!tier.price) return;
      const priceNum = String(tier.price).replace(/[^0-9.,]/g, '').replace(',', '.');
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: tier.name || tier.title || 'Pakke',
        description: tier.description || '',
        brand: { '@type': 'Brand', name: 'Lavprishjemmeside.dk' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'DKK',
          price: priceNum,
          availability: 'https://schema.org/InStock',
          seller: { '@id': siteUrl + '/#organization' }
        }
      });
    });
  }

  return schemas;
}
```

Place this function right before `module.exports = router;` in `api/src/routes/ai-generate.js`. Reference `api/Schema_markup.md` for the full schema templates — the function above covers BreadcrumbList, WebPage, FAQPage, and Product. The Organization schema is referenced via `@id` but defined site-wide in Layout.astro (see Task 6).

### Task 6: Update `src/layouts/Layout.astro`

**Current Props interface (line 6-9):**
```typescript
interface Props {
  title: string;
  description?: string;
}
```

**Change to:**
```typescript
interface Props {
  title: string;
  description?: string;
  schemaMarkup?: any[];
  ogImage?: string;
}
```

**Current destructuring (line 11):**
```javascript
const { title, description = "Få en professionel hjemmeside..." } = Astro.props;
```

**Change to:**
```javascript
const { title, description = "Få en professionel hjemmeside til lav pris. Vi bygger moderne, hurtige og SEO-optimerede hjemmesider for danske virksomheder.", schemaMarkup = [], ogImage } = Astro.props;
```

**Current ogImage (line 15):**
```javascript
const ogImage = new URL('/favicon.svg', site).href;
```

**Change to:**
```javascript
const resolvedOgImage = ogImage || new URL('/favicon.svg', site).href;
```

Then update all references from `ogImage` to `resolvedOgImage` in the template (line 44: `content={resolvedOgImage}`).

**Add Organization schema** (from `Schema_markup.md`) to the existing `schemaOrg` object. Change the current basic WebSite schema (lines 17-24) to include Organization:

```javascript
const baseSchemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': site + '/#website',
    name: 'lavprishjemmeside.dk',
    url: site,
    description: description,
    inLanguage: 'da',
  },
  {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    '@id': site + '/#organization',
    name: 'Lavprishjemmeside.dk',
    url: site,
    description: 'Lavprishjemmeside.dk er et dansk webbureau beliggende i Fredericia. Vi specialiserer os i at levere professionelle, responsive og konverteringsoptimerede hjemmesider til overkommelige priser.',
    foundingDate: '2026',
    areaServed: { '@type': 'Country', name: 'Denmark' },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@lavprishjemmeside.dk',
      contactType: 'customer service',
      availableLanguage: ['da', 'en']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Høgevej 4',
      addressLocality: 'Fredericia',
      postalCode: '7000',
      addressCountry: 'DK'
    }
  }
];

const allSchemas = [...baseSchemas, ...schemaMarkup];
```

**Replace the single JSON-LD script tag (line 54):**
```html
<!-- Current: -->
<script type="application/ld+json" set:html={JSON.stringify(schemaOrg)} />

<!-- Change to: -->
{allSchemas.map(schema => (
  <script type="application/ld+json" set:html={JSON.stringify(schema)} />
))}
```

### Task 7: Update `src/pages/[...slug].astro`

**In `getStaticPaths()`** — after fetching `allPageComponents`, also fetch page meta:

```typescript
// After line: const allPageComponents = await response.json();
// Add:
let pageMeta = {};
try {
  const metaResponse = await fetch(`${API_URL}/page-components/public-meta?page=all`);
  if (metaResponse.ok) {
    pageMeta = await metaResponse.json();
  }
} catch (e) {
  console.warn('Could not fetch page meta:', e.message);
}
```

**In the paths generation loop** — pass pageMeta into props:

```typescript
// Change the props in paths.push to include pageMeta:
props: {
  pagePath,
  pageComponents: components,
  pageMeta: pageMeta[pagePath] || null,
},
```

**In the page template section** — destructure and pass to Layout:

```typescript
// Change line: const { pagePath, pageComponents } = Astro.props;
// To:
const { pagePath, pageComponents, pageMeta } = Astro.props;
```

**Change the Layout call:**
```astro
<!-- Current: -->
<Layout title={pageTitle}>

<!-- Change to: -->
<Layout
  title={pageMeta?.meta_title || pageTitle}
  description={pageMeta?.meta_description}
  schemaMarkup={pageMeta?.schema_markup || []}
  ogImage={pageMeta?.og_image}
>
```

### Task 8: Add SEO editor to `src/pages/admin/pages.astro`

Add an SEO section below the "Action buttons" div (after the Publicer side button area, around line 62). When a page is selected, show editable SEO fields:

**HTML to add (after the action buttons div, before the closing `</div>` of the components editor section):**
```html
<!-- SEO Section -->
<div id="seo-section" class="hidden border-t border-gray-200 pt-6 mt-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4">SEO & Meta</h3>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Meta titel <span id="seo-title-count" class="text-xs text-gray-400 ml-2">0/60</span>
      </label>
      <input type="text" id="seo-meta-title" maxlength="200"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Sidetitel | Lavprishjemmeside.dk" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Meta beskrivelse <span id="seo-desc-count" class="text-xs text-gray-400 ml-2">0/160</span>
      </label>
      <textarea id="seo-meta-description" maxlength="320" rows="3"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        placeholder="Kort beskrivelse af siden..."></textarea>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">OG billede URL</label>
      <div class="flex gap-2">
        <input type="text" id="seo-og-image"
          class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="https://lavprishjemmeside.dk/uploads/..." />
        <button onclick="openMediaPickerForSeo()" class="px-3 py-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-700 rounded-lg text-sm">Vælg</button>
      </div>
    </div>
    <button onclick="saveSeoMeta()" class="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
      Gem SEO
    </button>
    <span id="seo-save-status" class="text-sm text-green-600 ml-2 hidden">Gemt!</span>
  </div>
</div>
```

**JavaScript to add** (in the IIFE, add these functions):

```javascript
// Load SEO meta when page is selected
async function loadSeoMeta(page) {
  try {
    const res = await fetch(API + '/page-components/page-meta?page=' + encodeURIComponent(page), {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return;
    const meta = await res.json();
    document.getElementById('seo-meta-title').value = meta.meta_title || '';
    document.getElementById('seo-meta-description').value = meta.meta_description || '';
    document.getElementById('seo-og-image').value = meta.og_image || '';
    updateSeoCounters();
    document.getElementById('seo-section').classList.remove('hidden');
  } catch (e) {
    console.warn('Could not load SEO meta:', e.message);
  }
}

function updateSeoCounters() {
  var title = document.getElementById('seo-meta-title').value;
  var desc = document.getElementById('seo-meta-description').value;
  var titleCount = document.getElementById('seo-title-count');
  var descCount = document.getElementById('seo-desc-count');
  titleCount.textContent = title.length + '/60';
  titleCount.className = 'text-xs ml-2 ' + (title.length > 60 ? 'text-red-500' : 'text-gray-400');
  descCount.textContent = desc.length + '/160';
  descCount.className = 'text-xs ml-2 ' + (desc.length > 160 ? 'text-red-500' : 'text-gray-400');
}

document.getElementById('seo-meta-title').addEventListener('input', updateSeoCounters);
document.getElementById('seo-meta-description').addEventListener('input', updateSeoCounters);

window.saveSeoMeta = async function() {
  try {
    var res = await fetch(API + '/page-components/page-meta/update', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_path: selectedPage,
        meta_title: document.getElementById('seo-meta-title').value || null,
        meta_description: document.getElementById('seo-meta-description').value || null,
        og_image: document.getElementById('seo-og-image').value || null
      })
    });
    if (!res.ok) throw new Error('Fejl ved gemning');
    var status = document.getElementById('seo-save-status');
    status.classList.remove('hidden');
    setTimeout(function() { status.classList.add('hidden'); }, 2000);
  } catch (err) {
    alert('Fejl: ' + err.message);
  }
};

window.openMediaPickerForSeo = function() {
  openMediaPicker(function(url) {
    document.getElementById('seo-og-image').value = url;
  });
};
```

**Call `loadSeoMeta(page)` inside the `selectPage()` function** — add at the end of `selectPage()`:
```javascript
loadSeoMeta(page);
```

### Task 9: Build test

Run `npm run build` — it must succeed.

---

## Rules

- **DO NOT** change files listed in "Already Done" unless fixing a bug in them
- **DO NOT** change component templates (HTML/CSS) — only frontmatter and API code
- **DO NOT** add dependencies not mentioned here
- Read `PROJECT_CONTEXT.md` first for full project context
- Read `api/Schema_markup.md` for the full schema markup templates
- The Organization schema in Layout.astro should match the data in `Schema_markup.md` section 1
- Each task is independent — if one fails, skip it and continue
- After all tasks, run `npm run build` and ensure it succeeds

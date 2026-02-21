# Immersive Content Visual

**Category:** Content  
**Slug:** immersive-content-visual  
**File:** ImmersiveContentVisual.astro

## Description

A unified long-form text + visual section that combines the strengths of:
- `content-image-split` (clear editorial readability),
- `overlap-image-section` (depth through image overlap),
- `overlap-cards-section` (layered information cards).

Designed for modern 2026-style storytelling where longer text blocks need stronger hierarchy, rhythm, and visual depth.

**Common use cases:**
- Service/process explanations with longer narrative text
- Product deep-dives with primary + secondary visuals
- Strategy/method sections with supporting highlights
- "How we work" sections requiring both clarity and visual impact

---

## Props Schema

```typescript
interface Props {
  headline: string;
  leadText?: string;
  content: string; // HTML allowed
  imageUrl: string;
  imageAlt?: string;
  secondaryImageUrl?: string;
  secondaryImageAlt?: string;
  imagePlacement?: 'left' | 'right'; // default: 'right'

  // Main visual mode
  variant?: 'editorial-split' | 'cinematic-overlap' | 'stacked-cards'; // default: 'cinematic-overlap'
  theme?: 'default' | 'accent'; // default: 'default'
  overlapDepth?: number; // 0-120, default: 56

  highlights?: string[];
  visualCards?: Array<{
    title: string;
    content?: string;
    kicker?: string;
  }>;

  cta?: { text: string; href: string };
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Dokumentation med visuel tyngde",
  "leadText": "Når teksten er længere, skal layoutet skabe rytme og overblik.",
  "content": "<p>Denne komponent kombinerer overlap, dybde og klare fokuszoner.</p><p>Brug den til strategi, metode og implementering.</p>",
  "imageUrl": "https://images.unsplash.com/photo-1515378791036-0648a814c963?w=1400",
  "secondaryImageUrl": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900",
  "imagePlacement": "right",
  "variant": "cinematic-overlap",
  "theme": "accent",
  "overlapDepth": 64,
  "highlights": [
    "Understøtter lange tekstafsnit",
    "Skaber tydelig visuel hierarki",
    "Fungerer på tværs af desktop og mobil"
  ],
  "visualCards": [
    { "kicker": "Flow", "title": "Narrativ opdeling", "content": "Bryder lange sektioner i blokke." },
    { "kicker": "Signal", "title": "Fokusområder", "content": "Fremhæver nøglepunkter." }
  ],
  "cta": { "text": "Se løsning", "href": "/kontakt" }
}
```

---

## Visual Modes

- `editorial-split`: clean text/image split for readability-first layouts.
- `cinematic-overlap`: hero-style overlap with atmospheric depth and floating summary panel.
- `stacked-cards`: overlap card stack layered on top of the visual for key insight points.

---

## When AI Should Use This Component

Use **immersive-content-visual** as the **default choice** for long-form text + image sections when:
- content exceeds simple 1-paragraph split layout,
- you want a modern premium look,
- you need overlap effects without assembling multiple separate components.

Prefer this over combining `content-image-split` + `overlap-image-section` + `overlap-cards-section` manually.

---

## Accessibility

- Section uses `aria-labelledby` linked to the headline.
- Images require meaningful `imageAlt` / `secondaryImageAlt`.
- CTA keeps 44x44 minimum tap target.
- Overlap cards are decorative support, primary content remains readable in source order.

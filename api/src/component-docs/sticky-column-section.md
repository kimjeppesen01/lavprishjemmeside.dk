# Sticky Column Section

**Category:** Content Sections  
**Slug:** sticky-column-section  
**File:** StickyColumnSection.astro

## Description

A two-column layout: a sticky sidebar with heading and description that stays visible while a grid of info cards scrolls past. Clean, semantic structure. No JavaScript required—uses CSS `sticky`.

**Common use cases:**
- Plugin/feature compatibility showcase
- Service or product benefits with icons
- Team or partner highlights
- Value propositions with supporting cards

---

## Props Schema

```typescript
interface Props {
  tagline?: string;     // Small label above heading (uppercase)
  heading: string;      // Main section heading
  description?: string; // Supporting paragraph
  items: Array<{
    img: string;   // Image/icon URL
    title: string; // Card title
    desc: string;  // Card description
  }>;
}
```

### Example Props Object

```json
{
  "tagline": "Kompatibilitet",
  "heading": "Vi integrerer med dine værktøjer",
  "description": "Vores løsninger fungerer sammen med de mest populære platforme.",
  "items": [
    {
      "img": "/images/icons/responsiv.svg",
      "title": "Responsiv design",
      "desc": "Hjemmesider der fungerer på alle enheder."
    }
  ]
}
```

---

## CSS Variables Used

- `--color-text-primary` – Heading text
- `--color-text-secondary` – Tagline, description, card desc
- `--color-border` – Card border
- `--radius-card` – Card corners
- `--shadow-sm` / `--shadow-md` – Card shadows
- `--color-bg-page` – Card background

---

## Accessibility Notes

- Section has `aria-labelledby` linking to heading
- Images have descriptive `alt` (from title)
- Semantic `<article>` for each card
- `loading="lazy"` on images

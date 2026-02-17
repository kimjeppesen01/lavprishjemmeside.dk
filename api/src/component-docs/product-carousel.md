# Product Carousel

**Category:** Content Sections  
**Slug:** product-carousel  
**File:** ProductCarousel.astro

## Description

A scroll-pinned horizontal carousel that stays fixed while the whole carousel scales from 50% to 100% and slides move left on vertical scroll. Mimics premium site builders' "scroll to explore" pattern. Uses GSAP ScrollTrigger for smooth, performant animations. The carousel scales up as you scroll (scrub-linked).

**Common use cases:**
- Showcase product images or case studies
- Portfolio or project highlights
- Feature spotlights with large visuals

---

## Props Schema

```typescript
interface Props {
  slides: Array<{
    img: string;      // Image URL
    alt?: string;     // Alt text (default: caption or "Produkt")
    caption?: string; // Optional caption (sr-only for accessibility)
  }>;
  heading?: string;   // Section heading (sr-only by default), default: "Udvalgte produkter"
}
```

### Example Props Object

```json
{
  "slides": [
    { "img": "/images/produkt-1.jpg", "alt": "Hjemmeside design" },
    { "img": "/images/produkt-2.jpg", "alt": "SEO & marketing" }
  ],
  "heading": "Udvalgte produkter"
}
```

---

## CSS Variables Used

- `--radius-card` – Image border radius
- `--shadow-card` – Card shadow
- `--color-text-primary` – (via theme)

---

## Dependencies

- **GSAP** – `npm install gsap` (ScrollTrigger plugin used)

---

## Accessibility Notes

- Section has `aria-labelledby` linking to heading
- Heading is `sr-only` by default (visible to screen readers)
- Images have `alt` or `caption`
- Lazy loading enabled

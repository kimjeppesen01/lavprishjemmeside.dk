# Gallery Grid

**Category:** Utilities  
**Slug:** gallery-grid  
**File:** GalleryGrid.astro

## Description

A responsive grid of images with optional captions. Supports lightbox functionality for full-size viewing. Used for portfolios, project showcases, or image collections.

**Common use cases:**
- Portfolio project galleries
- Before/after showcases
- Product or service image galleries

---

## Props Schema

```typescript
interface Props {
  // Required props
  images: Array<{
    url: string;              // Image URL
    alt: string;              // Accessible alt text
    caption?: string;         // Optional caption below image
  }>;

  // Optional props
  columns?: 2 | 3 | 4;       // Desktop column count (default: 3)
  lightbox?: boolean;        // Enable click-to-enlarge (default: true)
}
```

### Example Props Object

```json
{
  "images": [
    {
      "url": "/images/projekter/kunde1-hero.jpg",
      "alt": "Forside af hjemmeside for Nielsen & Co",
      "caption": "Forside"
    },
    {
      "url": "/images/projekter/kunde1-services.jpg",
      "alt": "Ydelser-side",
      "caption": "Ydelser"
    }
  ],
  "columns": 3,
  "lightbox": true
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-border` - Image border (optional)
- `--color-text-secondary` - Captions

**Typography:**
- `--font-body` - Captions

**Shapes:**
- `--radius-lg` - Image corners
- `--shadow-card` - Image or lightbox overlay shadow

---

## Copy Guidelines (Danish)

**Tone:** Descriptive

**Alt text tips:**
- Describe what the image shows
- Avoid "Billede af" unless adding value

**Caption tips:**
- Short labels ("Forside", "Ydelser", "Resultat")

**Good examples:**

✅ "Forside af hjemmeside for Nielsen & Co"  
✅ "Ydelser-side"

**Avoid:**

❌ "img_001.jpg" (not descriptive)

---

## Accessibility

- **ARIA:** Lightbox: `role="dialog"`, `aria-modal="true"`, `aria-label` or `aria-labelledby`. Close button: `aria-label="Luk"`.
- **Keyboard:** Lightbox: Escape to close; focus trap when open; focus return to trigger on close.
- **Screen reader:** Images need descriptive `alt`. Lightbox should announce image context.
- **Focus management:** When lightbox opens, focus first focusable element (e.g., close button).

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ [img]   │  │ [img]   │  │ [img]   │  │ [img]   │       │
│  │ Caption │  │ Caption │  │ Caption │  │ Caption │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Use `loading="lazy"` for images below the fold.
- Lightbox: overlay with full-size image; prevent body scroll when open.
- Grid collapses to 1–2 columns on mobile.
- Consider `aspect-ratio` for consistent thumbnail sizing.

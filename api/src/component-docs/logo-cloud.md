# Logo Cloud

**Category:** Social Proof  
**Slug:** logo-cloud  
**File:** LogoCloud.astro

## Description

A grid of client or partner logos. Logos can be grayscale by default with optional color on hover. Used to show credibility and social proof.

**Common use cases:**
- "Kunder der stoler på os"
- Partner or technology logos
- Trusted by / as seen in sections

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline (e.g., "Kunder der stoler på os")
  logos: Array<{
    imageUrl: string;         // Logo image URL
    alt: string;              // Accessible alt text (company name)
    link?: string;            // Optional link URL
  }>;

  // Optional props
  grayscale?: boolean;        // Render logos in grayscale (default: true)
}
```

### Example Props Object

```json
{
  "headline": "Kunder der stoler på os",
  "logos": [
    { "imageUrl": "/images/logos/kunde1.svg", "alt": "Nielsen & Co", "link": "https://nielsen.dk" },
    { "imageUrl": "/images/logos/kunde2.svg", "alt": "Andersen A/S" }
  ],
  "grayscale": true
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-text-secondary` - Grayscale logo opacity
- `--color-primary` - Optional hover color tint

**Typography:**
- `--font-heading` - Headline

**Shapes:**
- `--radius-sm` - Optional logo container rounding

---

## Copy Guidelines (Danish)

**Tone:** Confident, understated

**Headline tips:**
- "Kunder der stoler på os" or "Vores partnere"
- Keep it short

**Alt text tips:**
- Use company/brand name for each logo
- Never "Logo" or "Image" alone

**Good examples:**

✅ "Kunder der stoler på os"  
✅ "Vores partnere"

**Avoid:**

❌ "Se disse kunder" (sounds pushy)

---

## Accessibility

- **ARIA:** Section with `aria-labelledby`. Logos are decorative if no link; with link, `alt` describes destination.
- **Keyboard:** Linked logos must be focusable.
- **Screen reader:** Meaningful `alt` for each logo (company name).
- **Focus management:** Visible focus on links.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  [Logo1]  [Logo2]  [Logo3]  [Logo4]  [Logo5]  [Logo6]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Use `filter: grayscale(100%)` for grayscale; remove on hover if desired.
- Ensure consistent logo height; width can vary. Use `object-contain`.
- Logos should be SVG or high-res PNG for sharp display.
- If many logos, consider horizontal scroll on mobile.

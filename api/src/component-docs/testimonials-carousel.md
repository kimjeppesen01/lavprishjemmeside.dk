# Testimonials Carousel

**Category:** Social Proof  
**Slug:** testimonials-carousel  
**File:** TestimonialsCarousel.astro

## Description

A carousel/slider of customer testimonials with quotes, author names, roles, companies, optional photos, and optional star ratings. Used to showcase social proof and build trust.

**Common use cases:**
- Customer reviews on homepage
- Case study quotes
- Trust-building sections before pricing or contact

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  testimonials: Array<{
    quote: string;             // The testimonial text
    author: string;            // Full name
    role: string;              // Job title or role
    company: string;           // Company name
    photo?: string;            // Optional portrait URL
    rating?: number;           // Optional 1-5 star rating
  }>;

  // Optional props
  // (none specified)
}
```

### Example Props Object

```json
{
  "headline": "Hvad vores kunder siger",
  "testimonials": [
    {
      "quote": "Professionel service og hurtig levering. Vi er meget tilfredse med vores nye hjemmeside.",
      "author": "Anna Nielsen",
      "role": "Marketingchef",
      "company": "Nielsen & Co",
      "photo": "/images/testimonials/anna.jpg",
      "rating": 5
    }
  ]
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Star rating, accent
- `--color-text-primary` - Author, quote
- `--color-text-secondary` - Role, company

**Typography:**
- `--font-heading` - Headline
- `--font-body` - Quote text

**Shapes:**
- `--radius-card` - Testimonial card
- `--shadow-card` - Card shadow

---

## Copy Guidelines (Danish)

**Tone:** Authentic, varied (reflect customer voices)

**Quote tips:**
- Keep quotes 1–3 sentences
- Use real or realistic-sounding testimonials
- Focus on outcomes, not generic praise

**Good examples:**

✅ "Professionel service og hurtig levering. Vi er meget tilfredse."  
✅ "De forstod vores behov fra starten."

**Avoid:**

❌ "God service" (too short, not specific)

---

## Accessibility

- **ARIA:** Carousel should use `role="region"`, `aria-roledescription="carousel"`, `aria-label` for navigation. Each slide `aria-roledescription="slide"`.
- **Keyboard:** Previous/next buttons must be focusable; arrow keys should advance slides if interactive.
- **Screen reader:** Pause auto-advance or provide control to pause; ensure current slide is announced.
- **Focus management:** Focus visible on prev/next controls; consider focus trap within carousel when modal.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  [<]  ┌─────────────────────────────────────┐  [>]         │
│       │  "Quote text..."                     │               │
│       │  ★★★★★                               │               │
│       │  [Photo] Anna Nielsen                │               │
│       │         Marketingchef, Nielsen & Co  │               │
│       └─────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Support touch swipe on mobile.
- Consider reduced motion: respect `prefers-reduced-motion` for auto-advance.
- Photo: use `aspect-ratio` and `object-fit: cover` for circular or square avatar.
- Rating: display 1–5 stars using `--color-primary` for filled stars.

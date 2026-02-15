# Hero Section

**Category:** Hero & CTAs  
**Slug:** hero-section  
**File:** HeroSection.astro

## Description

A large, attention-grabbing header section that appears at the top of landing pages and homepages. Typically includes a headline, supporting description, primary and optional secondary CTA buttons, and an optional background or side image. This is often the first thing visitors see.

**Common use cases:**
- Homepage hero with value proposition and sign-up/contact CTAs
- Landing page headers for specific campaigns
- Product or service launch announcements

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Main headline (h1)
  description: string;        // Supporting paragraph text

  // Optional props
  primaryCta?: {             // Primary call-to-action button
    text: string;
    href: string;
  };
  secondaryCta?: {           // Secondary/outline button
    text: string;
    href: string;
  };
  backgroundImage?: string;  // URL for background or side image (default: none)
  alignment?: 'left' | 'center';  // Text alignment (default: 'left')
}
```

### Example Props Object

```json
{
  "headline": "Professionelle rengøringsydelser til erhverv",
  "description": "Vi tilbyder skræddersyede løsninger til kontorer, butikker og industrivirksomheder i hele Danmark.",
  "primaryCta": {
    "text": "Få et gratis tilbud",
    "href": "/kontakt"
  },
  "secondaryCta": {
    "text": "Se vores priser",
    "href": "/priser"
  },
  "backgroundImage": "/images/hero-cleaning.jpg",
  "alignment": "left"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Primary CTA button background
- `--color-primary-hover` - Primary button hover state
- `--color-text-primary` - Headline text
- `--color-text-secondary` - Description text

**Typography:**
- `--font-heading` - Headline font family
- `--font-body` - Description font family
- `--font-size-4xl` / `--font-size-5xl` - Large headline sizes

**Shapes:**
- `--radius-button` - CTA button border radius
- `--shadow-card` - Optional card shadow for overlays

---

## Copy Guidelines (Danish)

**Tone:** Professional, confident, action-oriented

**Headline tips:**
- Lead with the main benefit or value proposition
- Keep it concise (5–10 words ideal)
- Use active, concrete language

**Description tips:**
- Expand on the headline with 1–2 sentences
- Include a geographic or target audience qualifier when relevant
- End with a clear next step implied

**Good examples:**

✅ "Professionelle rengøringsydelser til erhverv"  
✅ "Få mere ud af din hjemmeside med os"  
✅ "Din partner til digital tilstedeværelse"

**Avoid:**

❌ "Velkommen til vores hjemmeside" (too generic)

---

## Accessibility

- **ARIA:** Use `aria-label` on CTA buttons if the link text alone is insufficient. Ensure `role="banner"` or semantic `<header>` for the hero.
- **Keyboard:** All buttons/links must be focusable and operable via Enter/Space.
- **Screen reader:** Headline must be a single `<h1>`. Description in `<p>`. Ensure sufficient contrast for text on any background image.
- **Focus management:** Natural tab order: headline → description → primary CTA → secondary CTA.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Optional background image, possibly with overlay]          │
│                                                              │
│  Headline (h1)                                               │
│  Supporting description text                                 │
│                                                              │
│  [Primary CTA]  [Secondary CTA]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- On mobile, stack content vertically. CTAs may stack or sit side-by-side depending on space.
- If `backgroundImage` is set, consider a semi-transparent overlay for text readability.
- Use `object-fit: cover` for background images to maintain aspect ratio.
- Ensure minimum touch target size (44×44px) for CTA buttons on mobile.

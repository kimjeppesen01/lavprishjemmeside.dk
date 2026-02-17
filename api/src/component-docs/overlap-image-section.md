# Overlap Image Section

**Category:** Content  
**Slug:** overlap-image-section  
**File:** OverlapImageSection.astro

## Description

Section with headline, content, and a main visual that extends downward and overlaps the next section. Supports alternating section backgrounds, optional wavy bottom divider, bullet points, and CTA. Ideal for product features, process steps, or quality/traceability sections where a device mockup or hero visual creates depth.

**Common use cases:**
- Product features with device mockup (desktop, smartphones)
- "How it works" with a central visual
- Quality control / traceability sections
- Process explanation with screenshots

---

## Props Schema

```typescript
interface Props {
  headline: string;
  content: string;
  imageUrl: string;
  imageAlt?: string;
  imagePlacement?: 'left' | 'right' | 'center';
  overlapAmount?: number;
  backgroundColor?: 'default' | 'primary' | 'alt';
  bottomDivider?: 'straight' | 'wave';
  bulletPoints?: string[];
  cta?: { text: string; href: string };
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Historik af produktion",
  "content": "<p>Systemet tillader registrering og overvågning af aktiviteter i produktionen.</p>",
  "imageUrl": "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800",
  "imageAlt": "Skærmbillede af produktionsoversigt",
  "imagePlacement": "right",
  "overlapAmount": 80,
  "backgroundColor": "primary",
  "bottomDivider": "wave",
  "bulletPoints": [
    "Sikker adgang til registrering",
    "Sporbarhed online",
    "Specifikke rapporter"
  ],
  "cta": { "text": "Se specifikationer", "href": "/specs" }
}
```

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Headline                                                    │
│  Content                                                     │
│  • Bullet 1                                                  │
│  • Bullet 2                                                  │
│  [CTA]              │  [     Image extends down     ]       │
│                     │  │                                     │
├─────────────────────┼──┼─────────────────────────────────────┤
│  (next section)     │  │  ← image overlaps into this area   │
│                     └──┘                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## When AI Should Use This Component

Use **overlap-image-section** when the page needs a section with a prominent visual (product shot, device mockup, hero image) that creates depth by overlapping the next section. Ideal for: product features, "how it works", quality/traceability sections.

**Image tips:** Use `search_pexels` with "desktop monitor" or "smartphone app" for device-style visuals; landscape for center/wide, portrait for side placements.

**overlapAmount:** 60–120px typical; 0 on very small screens.

---

## Copy Guidelines (Danish)

- Headline: Konkret, handlingsorienteret (fx "Kontroller kvaliteten")
- Content: 1–3 afsnit
- Bullet points: Korte punkter med værdi

---

## Accessibility

- Section with `aria-labelledby` for headline
- Image requires meaningful `alt` (use `imageAlt` or derive from headline)
- CTA: min 44×44px tap target

# Overlap Image Section

**Category:** Content  
**Slug:** overlap-image-section  
**File:** OverlapImageSection.astro

## Description

A highly visual section designed to blend into adjacent blocks using negative margin overlaps and stylized dividers. Supports both centered intro (headline + introText at top, like iMac sections) and column-based layout. Ideal for showcasing device mockups (iMacs, iPhones) that break the container boundary to create 3D depth.

**Common use cases:**
- Product features with device mockup (desktop, smartphones)
- "How it works" with centered intro + split content
- Quality control / traceability sections
- Process explanation with screenshots

---

## Props Schema

```typescript
interface Props {
  headline: string;
  /** Optional centered text above the split columns (matches top section in design) */
  introText?: string;
  /** Main column text (HTML allowed) */
  content?: string;
  bulletPoints?: string[];
  imageUrl: string;
  imageAlt?: string;
  /** Controls column order: 'left' puts image left, 'right' puts image right. 'center' stacks them. */
  imagePlacement?: 'left' | 'right' | 'center';
  /** How many pixels the image should pull downward into the next section */
  overlapAmount?: number;
  /** 'teal' matches primary accent, 'white' matches light section — uses design tokens */
  theme?: 'teal' | 'white';
  /** The styled edge at the bottom of the section */
  bottomDivider?: 'none' | 'zigzag' | 'straight';
  cta?: { text: string; href: string; icon?: 'chevron-down' | 'arrow-right' };
  instanceId?: string | number;
}
```

### Example Props Object (centered intro)

```json
{
  "headline": "Fuld kontrol over din produktion",
  "introText": "Se hvordan systemet giver dig overblik i realtid.",
  "content": "<p>Med vores platform har du altid fingeren på pulsen.</p>",
  "imageUrl": "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800",
  "imageAlt": "Skærmbillede af produktionsoversigt",
  "imagePlacement": "right",
  "overlapAmount": 80,
  "theme": "teal",
  "bottomDivider": "zigzag",
  "bulletPoints": ["Sikker adgang", "Sporbarhed online", "Specifikke rapporter"],
  "cta": { "text": "Se specifikationer", "href": "/specs", "icon": "arrow-right" }
}
```

### Example Props Object (column layout)

```json
{
  "headline": "Historik af produktion",
  "content": "<p>Systemet tillader registrering og overvågning af aktiviteter i produktionen.</p>",
  "imageUrl": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800",
  "imagePlacement": "right",
  "overlapAmount": 80,
  "theme": "white",
  "bottomDivider": "none",
  "bulletPoints": ["Sikker adgang til registrering", "Sporbarhed online"],
  "cta": { "text": "Læs mere", "href": "/specs" }
}
```

---

## Visual Layout

**With introText (centered at top):**
```
┌─────────────────────────────────────────────────────────────┐
│              HEADLINE (centered)                             │
│              IntroText (centered)                            │
│                                                             │
│  Content / Bullets / CTA     │  [  Image extends down  ]    │
│                             │  │                            │
├─────────────────────────────┼──┼────────────────────────────┤
│  (next section)             │  │  ← overlap                 │
│                             └──┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Without introText (headline in column):**
```
┌─────────────────────────────────────────────────────────────┐
│  Headline                                                    │
│  Content                                                     │
│  • Bullet 1                                                  │
│  [CTA]              │  [     Image extends down     ]       │
├─────────────────────┼──┼─────────────────────────────────────┤
│  (next section)     │  │  ← image overlaps                   │
└─────────────────────┴──┴─────────────────────────────────────┘
```

---

## When AI Should Use This Component

Use **overlap-image-section** when the page needs a section with a prominent visual (product shot, device mockup, hero image) that creates depth by overlapping the next section. Ideal for: product features, "how it works", quality/traceability sections.

**introText vs column layout:** Provide `introText` for centered iMac-style sections. Omit it for column layout with headline beside the image.

**Image tips:** Use `search_pexels` with "desktop monitor" or "smartphone app" for device-style visuals; landscape for center/wide, portrait for side placements.

**theme:** Use `teal` for accent blocks (primary color), `white` for light sections that blend with page alternation.

**bottomDivider:** `zigzag` for stylized serrated edge, `straight` for thin line, `none` for seamless blend.

---

## Copy Guidelines (Danish)

- Headline: Konkret, handlingsorienteret (fx "Kontroller kvaliteten")
- introText: Kort, leder-ind-i-sektionen (1–2 sætninger)
- Content: 1–3 afsnit
- Bullet points: Korte punkter med værdi

---

## Accessibility

- Section with `aria-labelledby` for headline
- Image requires meaningful `alt` (use `imageAlt` or derive from headline)
- CTA: min 44×44px tap target

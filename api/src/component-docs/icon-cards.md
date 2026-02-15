# Icon Cards

**Category:** Content Sections  
**Slug:** icon-cards  
**File:** IconCards.astro

## Description

Card-based layout where each card has an icon, title, description, and optional link. More compact than features-grid and suitable for navigation to deeper content or service categories.

**Common use cases:**
- Service category overview with links to detail pages
- Product benefit cards with "Læs mere" links
- Quick navigation blocks

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  cards: Array<{
    icon: string;             // Icon identifier or emoji
    title: string;            // Card title
    description: string;      // Short description
    link?: {                  // Optional link
      text: string;
      href: string;
    };
  }>;

  // Optional props
  columns?: 2 | 3 | 4;       // Desktop column count (default: 3)
}
```

### Example Props Object

```json
{
  "headline": "Vores ydelser",
  "cards": [
    {
      "icon": "web",
      "title": "Hjemmesider",
      "description": "Moderne, responsive hjemmesider til alle behov.",
      "link": { "text": "Læs mere", "href": "/ydelser/hjemmesider" }
    },
    {
      "icon": "seo",
      "title": "Søgemaskineoptimering",
      "description": "Bliv fundet af dine kunder på Google.",
      "link": { "text": "Læs mere", "href": "/ydelser/seo" }
    }
  ],
  "columns": 2
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Icon color, link hover
- `--color-text-primary` - Titles
- `--color-text-secondary` - Descriptions

**Typography:**
- `--font-heading` - Headline and card titles
- `--font-body` - Descriptions

**Shapes:**
- `--radius-card` - Card border radius
- `--shadow-card` - Card shadow

---

## Copy Guidelines (Danish)

**Tone:** Informative, inviting

**Title tips:**
- Use clear category names
- Match internal page titles when linking

**Link text tips:**
- "Læs mere" is standard; "Se mere" for galleries/lists

**Good examples:**

✅ "Hjemmesider" / "Læs mere"  
✅ "Søgemaskineoptimering" / "Se ydelser"

**Avoid:**

❌ "Klik her" (not descriptive)

---

## Accessibility

- **ARIA:** Cards with links should be in a list or grid with `aria-labelledby`.
- **Keyboard:** All links must be focusable; entire card can be clickable if link wraps.
- **Screen reader:** Link text must be descriptive; avoid "Læs mere" alone if multiple identical links—add context via `aria-label`.
- **Focus management:** Visible focus ring on links.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ [icon]       │  │ [icon]       │  │ [icon]       │       │
│  │ Title        │  │ Title        │  │ Title        │       │
│  │ Description  │  │ Description  │  │ Description  │       │
│  │ [Link]       │  │ [Link]       │  │ [Link]       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Cards with links: ensure minimum 44×44px tap target for the link.
- Hover state on cards can use `--color-primary-light` for subtle highlight.
- Grid collapses to single column on mobile.

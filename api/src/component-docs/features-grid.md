# Features Grid

**Category:** Content Sections  
**Slug:** features-grid  
**File:** FeaturesGrid.astro

## Description

A grid of feature blocks, each with an icon, title, and description. Ideal for presenting service offerings, product features, or value propositions in a scannable layout.

**Common use cases:**
- "Hvorfor vælge os" sections
- Service or product feature lists
- Benefits overview on homepage or landing pages

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  features: Array<{
    icon: string;             // Icon identifier or emoji
    title: string;            // Feature title
    description: string;      // Short description
  }>;

  // Optional props
  description?: string;       // Section-level description
  columns?: 2 | 3 | 4;       // Desktop column count (default: 3)
}
```

### Example Props Object

```json
{
  "headline": "Hvorfor vælge os",
  "description": "Vi skil os ud med kvalitet, service og erfaring.",
  "features": [
    {
      "icon": "check",
      "title": "Skræddersyet til dig",
      "description": "Hver løsning tilpasses dine behov og budget."
    },
    {
      "icon": "clock",
      "title": "Hurtig levering",
      "description": "Typisk levering inden for 2-3 uger."
    },
    {
      "icon": "support",
      "title": "Personlig support",
      "description": "Vi er altid tilgængelige til spørgsmål."
    }
  ],
  "columns": 3
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Icon accent
- `--color-text-primary` - Headlines and titles
- `--color-text-secondary` - Descriptions

**Typography:**
- `--font-heading` - Headline and feature titles
- `--font-body` - Descriptions

**Shapes:**
- `--radius-card` - Feature card corners
- `--shadow-card` - Feature card shadow

---

## Copy Guidelines (Danish)

**Tone:** Professional, benefit-focused

**Title tips:**
- Lead with the benefit or differentiator
- Keep titles short (2–5 words)

**Description tips:**
- One sentence per feature
- Be specific (numbers, timeframes) when possible

**Good examples:**

✅ "Skræddersyet til dig"  
✅ "Hurtig levering"  
✅ "Personlig support"

**Avoid:**

❌ "Vi er gode" (too vague)

---

## Accessibility

- **ARIA:** Use `role="list"` for the grid. `aria-labelledby` on section linking to headline.
- **Keyboard:** No interactive elements; decorative.
- **Screen reader:** Icons should be `aria-hidden="true"` if purely decorative.
- **Focus management:** N/A.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│  Section description                                         │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ [icon]  │  │ [icon]  │  │ [icon]  │  │ [icon]  │        │
│  │ Title   │  │ Title   │  │ Title   │  │ Title   │        │
│  │ Desc    │  │ Desc    │  │ Desc    │  │ Desc    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Grid collapses to single column on mobile.
- Use `columns` to control `grid-cols-2`, `grid-cols-3`, or `grid-cols-4` on desktop.
- Icons can be SVG, icon font, or emoji; ensure consistent sizing.

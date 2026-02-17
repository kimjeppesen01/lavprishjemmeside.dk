# Stats Banner

**Category:** Hero & CTAs  
**Slug:** stats-banner  
**File:** StatsBanner.astro

## Description

A horizontal banner displaying key statistics such as customer counts, satisfaction rates, or years in business. Uses icons, large numbers, and short labels to build trust and credibility quickly.

**Common use cases:**
- Social proof numbers (e.g., "500+ kunder", "99% tilfredshed")
- Achievement highlights
- Trust indicators below hero or above footer

---

## Props Schema

```typescript
interface Props {
  // Required props
  stats: Array<{
    value: string;      // Display value (e.g., "500+", "99%", "15"); count-up when numeric
    label: string;      // Label (e.g., "tilfredse kunder", "Pre-Made Demos")
    icon?: string;     // Icon emoji (optional)
    highlight?: boolean; // Dark card style (default: true for first stat)
  }>;

  // Optional intro (left column)
  headline?: string;
  description?: string;

  // Optional right column
  updateText?: string;  // e.g. "Last Major Update - v1.5.6 - (21 MAR 2025)"
  infoItems?: string[]; // Bottom row items, e.g. ["2 New Demos Monthly", "Weekly Updates"]

  // Layout
  backgroundColor?: 'default' | 'primary' | 'alt';  // (default: 'default')
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Ongoing Innovation: Stay Ahead with Saren",
  "description": "By choosing Saren®, you're investing in a theme that grows with you.",
  "updateText": "Last Major Update - v1.5.6 - (21 MAR 2025)",
  "stats": [
    { "value": "28+", "label": "Pre-Made Demos", "highlight": true },
    { "value": "50+", "label": "Custom Widgets" },
    { "value": "250+", "label": "Inner Pages" },
    { "value": "900+", "label": "Template Blocks" }
  ],
  "infoItems": ["2 New Demos Monthly", "Weekly Updates", "6 - Months Support"],
  "backgroundColor": "alt"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Accent for numbers or icons
- `--color-text-primary` - Stat value and label
- `--color-text-secondary` - Optional muted labels
- `--color-bg-section-alt` - Alternate background

**Typography:**
- `--font-heading` - Stat value (large numbers)
- `--font-body` - Labels

**Shapes:**
- `--radius-card` - Optional card styling for each stat

---

## Copy Guidelines (Danish)

**Tone:** Factual, confident

**Label tips:**
- Use plural where appropriate ("kunder", "projekter")
- Keep labels short (2–4 words)

**Good examples:**

✅ "tilfredse kunder"  
✅ "år i branchen"  
✅ "leveringsdage i gennemsnit"

**Avoid:**

❌ "Antal kunder vi har haft" (too long)

---

## Accessibility

- **ARIA:** Use `role="list"` for stat items. Consider `aria-label` for the section (e.g., "Nøgletal").
- **Keyboard:** No interactive elements; decorative focus not required.
- **Screen reader:** Ensure numbers are read correctly (e.g., "500+" as "500 plus" or similar).
- **Focus management:** N/A (no focusable elements).

---

## Visual Layout

Two-column layout on desktop: intro text left, stats and info boxes right.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Headline                    │  Last Major Update - v1.5.6 - (21 MAR 2025)       │
│  Description text            │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│                              │  │ 28+  │ │ 50+  │ │ 250+ │ │ 900+ │               │
│                              │  │Demos │ │Widgets│Pages │Blocks │               │
│                              │  └──────┘ └──────┘ └──────┘ └──────┘               │
│                              │  [2 New Demos Monthly] [Weekly Updates] [Support]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Clean Tailwind layout; no nested Elementor-style markup.
- Stats as rounded cards: first stat dark (highlight), others light.
- **Growing numbers:** numeric values (e.g. "28+", "99%", "15") get a count-up animation on scroll-into-view; all stats get a scale/opacity grow-in.
- Use a responsive grid (2 cols mobile, 4 on desktop for stats; 1–3 for info items).

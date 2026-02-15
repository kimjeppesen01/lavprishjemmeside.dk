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
    value: string;    // Display value (e.g., "500+", "99%", "15")
    label: string;    // Danish label (e.g., "tilfredse kunder", "år i branchen")
    icon?: string;   // Icon name or emoji (optional)
  }>;

  // Optional props
  backgroundColor?: 'default' | 'primary' | 'alt';  // (default: 'default')
}
```

### Example Props Object

```json
{
  "stats": [
    { "value": "500+", "label": "tilfredse kunder", "icon": "users" },
    { "value": "99%", "label": "tilfredshedsrate", "icon": "star" },
    { "value": "15", "label": "år i branchen", "icon": "calendar" }
  ],
  "backgroundColor": "default"
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

```
┌─────────────────────────────────────────────────────────────────────┐
│   [icon] 500+     [icon] 99%       [icon] 15                        │
│   tilfredse       tilfredshedsrate  år i branchen                   │
│   kunder                                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Use a responsive grid (2 columns on mobile, 3–4 on desktop).
- Ensure numbers stand out visually (larger font, `--color-primary` or bold).
- Icons should be decorative; do not rely on them for meaning alone.

# Breadcrumbs

**Category:** Utilities  
**Slug:** breadcrumbs  
**File:** Breadcrumbs.astro

## Description

A navigation breadcrumb trail showing the user's path (e.g., Forside > Ydelser > Hjemmesider). Improves wayfinding and SEO. Typically placed below header, above main content.

**Common use cases:**
- Inner page navigation (produkter, blog, ydelser)
- E-commerce category paths
- Multi-level content hierarchy

---

## Props Schema

```typescript
interface Props {
  // Required props
  items: Array<{
    label: string;            // Display text (e.g., "Ydelser", "Hjemmesider")
    href: string;             // URL (use "#" or "" for current page, non-link)
  }>;

  // Optional props
  separator?: string;         // Between items (default: ">")
}
```

### Example Props Object

```json
{
  "items": [
    { "label": "Forside", "href": "/" },
    { "label": "Ydelser", "href": "/ydelser" },
    { "label": "Hjemmesider", "href": "" }
  ],
  "separator": ">"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Link color
- `--color-text-secondary` - Current page, separators

**Typography:**
- `--font-body` - All text

**Shapes:**
- (Minimal; typically no radius or shadow)

---

## Copy Guidelines (Danish)

**Tone:** Neutral, navigational

**Label tips:**
- Match page titles
- Use short, clear labels
- "Forside" not "Home" for root

**Good examples:**

✅ Forside > Ydelser > Hjemmesider  
✅ Forside > Kontakt

**Avoid:**

❌ "Home" (use "Forside")

---

## Accessibility

- **ARIA:** Use `nav` with `aria-label="Brødkrummesti"`. Current page: `aria-current="page"`. Breadcrumb list: `role="list"`.
- **Keyboard:** Links must be focusable. Last item (current) may not be a link.
- **Screen reader:** Separator between items; current page announced.
- **Focus management:** Standard tab order through links.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Forside  >  Ydelser  >  Hjemmesider                        │
│   (link)      (link)     (current, no link)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Last item typically has no `href` or `href=""` and is not a link; use `aria-current="page"`.
- Separator: use visually hidden or `aria-hidden` so screen readers don't spell it out.
- Schema.org `BreadcrumbList` JSON-LD recommended for SEO.
- Keep padding/margin minimal; breadcrumbs are secondary UI.

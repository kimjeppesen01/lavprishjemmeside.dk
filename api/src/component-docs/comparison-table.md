# Comparison Table

**Category:** Commerce & Forms  
**Slug:** comparison-table  
**File:** ComparisonTable.astro

## Description

A side-by-side comparison of products or services. Rows represent features; columns represent options. Cells can contain checkmarks, crosses, or text. Used to help users choose between alternatives.

**Common use cases:**
- Product vs product comparison
- Plan differences (Basis vs Professionel)
- Service tiers comparison

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  products: string[];          // Column headers (product/plan names)
  features: string[];          // Row labels (feature names)
  data: (string | boolean | null)[][];  // 2D array: data[featureIndex][productIndex]
                                         // string = text, true = check, false = cross, null = empty

  // Optional props
  // (none specified)
}
```

### Example Props Object

```json
{
  "headline": "Sammenlign planerne",
  "products": ["Basis", "Professionel", "Enterprise"],
  "features": ["Antal sider", "SEO-optimering", "Support", "Pris"],
  "data": [
    ["5 sider", "10 sider", "Ubegrænset"],
    [false, true, true],
    ["E-mail", "Prioriteret", "Dedikeret"],
    ["499 kr/md", "999 kr/md", "Kontakt os"]
  ]
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Checkmarks, header accent
- `--color-text-primary` - Headers, feature names
- `--color-text-secondary` - Cell values
- `--color-border` - Table borders

**Typography:**
- `--font-heading` - Headline, column headers
- `--font-body` - Cell content

**Shapes:**
- `--radius-md` - Table corners

---

## Copy Guidelines (Danish)

**Tone:** Clear, factual

**Feature tips:**
- Use consistent phrasing across rows
- Short labels

**Good examples:**

✅ "Antal sider"  
✅ "Prioriteret support"

**Avoid:**

❌ "Hvor mange sider får jeg?" (too long for table header)

---

## Accessibility

- **ARIA:** Use proper `<table>` with `<th>`, `<thead>`, `<tbody>`. `scope="col"` for product headers, `scope="row"` for feature headers.
- **Keyboard:** If table is wide, ensure horizontal scroll is keyboard-accessible.
- **Screen reader:** Use `✓` and `✗` with `aria-label` or `sr-only` text ("Inkluderet" / "Ikke inkluderet").
- **Focus management:** N/A (static table).

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  ┌──────────────┬──────────┬──────────────┬──────────────┐  │
│  │              │ Basis    │ Professionel │ Enterprise   │  │
│  ├──────────────┼──────────┼──────────────┼──────────────┤  │
│  │ Antal sider  │ 5 sider  │ 10 sider     │ Ubegrænset   │  │
│  │ SEO          │ ✗        │ ✓            │ ✓            │  │
│  │ Support      │ E-mail   │ Prioriteret  │ Dedikeret    │  │
│  │ Pris         │ 499 kr/md│ 999 kr/md    │ Kontakt os   │  │
│  └──────────────┴──────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- On mobile: consider card layout per product, or horizontal scroll with sticky first column.
- `data` rows must align with `features` length; columns must match `products` length.
- For boolean: render ✓ (true) or ✗ (false); for null, render dash or blank.
- Use `--color-primary` for checkmarks.

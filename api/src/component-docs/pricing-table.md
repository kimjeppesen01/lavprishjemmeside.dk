# Pricing Table

**Category:** Commerce & Forms  
**Slug:** pricing-table  
**File:** PricingTable.astro

## Description

A table of pricing tiers, each with name, price, billing period, feature list, and CTA button. Supports a "featured" tier for visual emphasis. Used on pricing pages.

**Common use cases:**
- Subscription plans
- Service packages
- Product tiers

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  tiers: Array<{
    name: string;             // Tier name (e.g., "Basis", "Professionel")
    price: string;            // Price display (e.g., "499", "999")
    period: string;          // Billing period (e.g., "kr/md", "kr/måned")
    features: string[];      // List of included features
    cta: {                   // CTA button
      text: string;
      href: string;
    };
    featured?: boolean;      // Highlight this tier (default: false)
  }>;

  // Optional props
  // (none specified)
}
```

### Example Props Object

```json
{
  "headline": "Vælg den plan der passer dig",
  "tiers": [
    {
      "name": "Basis",
      "price": "499",
      "period": "kr/måned",
      "features": ["5 sider", "Responsiv design", "E-mail support"],
      "cta": { "text": "Vælg Basis", "href": "/kontakt?plan=basis" },
      "featured": false
    },
    {
      "name": "Professionel",
      "price": "999",
      "period": "kr/måned",
      "features": ["10 sider", "SEO-optimering", "Prioriteret support"],
      "cta": { "text": "Vælg Professionel", "href": "/kontakt?plan=pro" },
      "featured": true
    }
  ]
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - CTA buttons, featured border
- `--color-primary-hover` - Button hover
- `--color-text-primary` - Tier names, price
- `--color-text-secondary` - Features

**Typography:**
- `--font-heading` - Headline, tier names
- `--font-body` - Features

**Shapes:**
- `--radius-card` - Tier cards
- `--shadow-card` - Card shadow (stronger for featured)

---

## Copy Guidelines (Danish)

**Tone:** Clear, professional

**Period tips:**
- "kr/måned", "kr/år", "én gang" (one-time)
- Use "måned" not "month" for Danish

**Feature tips:**
- Short, scannable items
- Use checkmarks or bullets

**Good examples:**

✅ "499 kr/måned"  
✅ "5 sider"  
✅ "Prioriteret support"

**Avoid:**

❌ "Cheap" (use "Basis" or "Start" instead)

---

## Accessibility

- **ARIA:** Use `role="group"` or `region` per tier. `aria-labelledby` for headline.
- **Keyboard:** All CTA buttons must be focusable.
- **Screen reader:** Ensure price and period are associated (e.g., "499 kroner per måned").
- **Focus management:** Visible focus on buttons.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Basis       │  │ Professionel │  │ Enterprise  │          │
│  │ 499 kr/md   │  │ 999 kr/md ★ │  │ Kontakt os  │          │
│  │ • feature   │  │ • feature   │  │ • feature   │          │
│  │ • feature   │  │ • feature   │  │ • feature   │          │
│  │ [CTA]       │  │ [CTA]       │  │ [CTA]       │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Featured tier: border, shadow, or scale to emphasize.
- On mobile, stack tiers vertically; consider horizontal scroll for 3+ tiers.
- Price: consider `period` as separate for accessibility (e.g., "499 kr" + "per måned").
- Currency: use "kr" or "DKK" consistently.

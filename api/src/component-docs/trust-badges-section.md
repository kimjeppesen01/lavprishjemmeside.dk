# Trust Badges Section

**Category:** Trust  
**Slug:** trust-badges-section  
**File:** TrustBadgesSection.astro

## Description

A compact strip of trust indicators: SSL, payment icons (Visa, etc.), guarantees. Often placed near CTA or in footer to reduce purchase anxiety.

**Common use cases:**
- Above or below pricing/CTA
- Footer trust strip
- Checkout reassurance

---

## Props Schema

```typescript
interface Props {
  badges: Array<{
    type: 'ssl' | 'payment' | 'guarantee' | 'custom';
    label: string;
    icon?: string;
  }>;
  layout?: 'horizontal' | 'compact';
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "badges": [
    { "type": "ssl", "label": "Sikker betaling", "icon": "🔒" },
    { "type": "guarantee", "label": "30 dages fuld refusion", "icon": "✓" },
    { "type": "payment", "label": "Visa, Mastercard, MobilePay", "icon": "💳" }
  ],
  "layout": "horizontal"
}
```

---

## Copy Guidelines (Danish)

Keep labels short and factual. "Sikker betaling", "30 dages refusion", "Visa, Mastercard".

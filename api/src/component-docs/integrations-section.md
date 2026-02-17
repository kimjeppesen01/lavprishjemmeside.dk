# Integrations Section

**Category:** Content  
**Slug:** integrations-section  
**File:** IntegrationsSection.astro

## Description

Grid of apps/tools that work with your product. Similar to logo-cloud but with integration messaging (headline, description, optional per-item descriptions).

**Common use cases:**
- "Vi integrerer med" / "Works with"
- E-mail, CRM, betaling, booking
- Platform-/økosystem-sektion

---

## Props Schema

```typescript
interface Props {
  headline: string;
  description?: string;
  integrations: Array<{
    name: string;
    logoUrl: string;
    link?: string;
    description?: string;
  }>;
  columns?: 2 | 3 | 4;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Integrerer med dine værktøjer",
  "description": "Vores løsning fungerer sammen med de mest populære platforme.",
  "integrations": [
    { "name": "Mailchimp", "logoUrl": "/logos/mailchimp.svg", "link": "https://mailchimp.com" },
    { "name": "Stripe", "logoUrl": "/logos/stripe.svg", "description": "Betalingshåndtering" }
  ],
  "columns": 4
}
```

---

## Copy Guidelines (Danish)

- Headline: "Integrerer med dine værktøjer", "Works with", "Kompatibel med"
- Per-item description: Kort, fx "E-mail marketing", "Betalingsgateway"

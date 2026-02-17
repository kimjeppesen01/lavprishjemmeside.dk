# Tabs Section

**Category:** Content  
**Slug:** tabs-section  
**File:** TabsSection.astro

## Description

Tabbed interface to organize dense content (e.g. features, pricing). Uses proper ARIA roles for accessibility.

**Common use cases:**
- Feature comparison
- Pricing details
- Product specs
- FAQ by category

---

## Props Schema

```typescript
interface Props {
  headline: string;
  tabs: Array<{ label: string; content: string }>;
  defaultTab?: number;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Vælg din plan",
  "tabs": [
    { "label": "Basis", "content": "<p>5 sider, SSL, e-mail support.</p>" },
    { "label": "Pro", "content": "<p>10 sider, SEO, prioriteret support.</p>" }
  ],
  "defaultTab": 0
}
```

---

## Copy Guidelines (Danish)

- Tab labels: Korte, klare (fx "Basis", "Pro", "Enterprise")
- Content: HTML tilladt (p, ul, etc.)

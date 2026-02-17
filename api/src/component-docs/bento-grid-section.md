# Bento Grid Section

**Category:** Content  
**Slug:** bento-grid-section  
**File:** BentoGridSection.astro

## Description

Asymmetric grid layout for feature highlights. Cards can have different sizes (small, medium, large) for visual interest.

**Common use cases:**
- Feature highlights
- Dashboard-style layout
- Produktoversigt med varierende kortstørrelser

---

## Props Schema

```typescript
interface Props {
  headline: string;
  items: Array<{
    title: string;
    description?: string;
    size?: 'small' | 'medium' | 'large';
  }>;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Vores løsninger",
  "items": [
    { "title": "Hjemmesider", "description": "Moderne, responsive sider.", "size": "large" },
    { "title": "SEO", "size": "small" },
    { "title": "Hosting", "size": "medium" }
  ]
}
```

---

## Copy Guidelines (Danish)

- Large cards: Hovedydelser eller centrale funktioner
- Small/medium: Supplerende punkter

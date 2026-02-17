# Case Studies Section

**Category:** Content  
**Slug:** case-studies-section  
**File:** CaseStudiesSection.astro

## Description

Project showcase with headline and items. Each item has image, title, client, outcome. Optional link to detail page.

**Common use cases:**
- Portfolio / referencer
- Kundecases
- Projektvisning

---

## Props Schema

```typescript
interface Props {
  headline: string;
  description?: string;
  cases: Array<{
    image: string;
    title: string;
    client: string;
    outcome: string;
    link?: string;
  }>;
  columns?: 2 | 3;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Vores referencer",
  "description": "Se hvordan vi har hjulpet andre virksomheder.",
  "cases": [
    {
      "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
      "title": "Ny hjemmeside for detailhandler",
      "client": "Jensen ApS",
      "outcome": "40% stigning i online konvertering.",
      "link": "/referencer/jensen"
    }
  ],
  "columns": 3
}
```

---

## Copy Guidelines (Danish)

- Headline: "Vores referencer", "Kundecases", "Se vores projekter"
- Outcome: Kort, konkret resultat (fx procent, antal, kvalitetsforbedring)

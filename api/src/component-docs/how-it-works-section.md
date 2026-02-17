# How it Works Section

**Category:** Content  
**Slug:** how-it-works-section  
**File:** HowItWorksSection.astro

## Description

A step-by-step process explanation. 3–5 numbered steps with title and description. Common on SaaS and service landing pages. Differs from Timeline (which is for history) — this is for "how to get started" or "our process".

**Common use cases:**
- "Sådan fungerer det" on homepage
- Onboarding process
- Service flow explanation

---

## Props Schema

```typescript
interface Props {
  headline: string;
  description?: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Sådan fungerer det",
  "description": "Tre enkle trin til din nye hjemmeside.",
  "steps": [
    {
      "title": "Book en snak",
      "description": "Kontakt os for en uforpligtende samtale om dine behov."
    },
    {
      "title": "Design og godkendelse",
      "description": "Vi sender et forslag til din godkendelse inden vi bygger."
    },
    {
      "title": "Levering og opdateringer",
      "description": "Din side går live, og vi hjælper med opdateringer og support."
    }
  ]
}
```

---

## CSS Variables Used

- `--color-primary` – Step number circle
- `--color-text-primary` – Headlines and titles
- `--color-text-secondary` – Descriptions
- `--radius-card` – Card corners

---

## Copy Guidelines (Danish)

**Title tips:** Action-oriented, short (2–4 words)

**Good examples:** "Book en snak", "Design og godkendelse", "Levering"

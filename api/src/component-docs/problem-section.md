# Problem Section

**Category:** Content  
**Slug:** problem-section  
**File:** ProblemSection.astro

## Description

A section that states relatable user pain points and positions the product or service as the solution. Common on modern marketing and SaaS landing pages. Uses a grid of 2–4 problems with icons and short descriptions.

**Common use cases:**
- Above features or pricing to establish relevance
- Problem-solution framing on homepage
- Landing pages for specific offerings

---

## Props Schema

```typescript
interface Props {
  headline: string;
  description?: string;
  problems: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Kender du disse udfordringer?",
  "description": "Mange virksomheder står over for de samme udfordringer. Vi kan hjælpe.",
  "problems": [
    {
      "icon": "⏱️",
      "title": "For lange leveringstider",
      "description": "Ubegrænset ventetid og utydelige frister fra udviklere."
    },
    {
      "icon": "💰",
      "title": "Uforudsigelige priser",
      "description": "Skjulte gebyrer og løbende omkostninger du ikke regnede med."
    },
    {
      "icon": "📞",
      "title": "Svært at få svar",
      "description": "Support der ikke svarer eller ikke forstår dit behov."
    }
  ]
}
```

---

## CSS Variables Used

- `--color-primary` – Icon accent
- `--color-text-primary` – Headlines and titles
- `--color-text-secondary` – Descriptions
- `--radius-card` – Card corners
- `--shadow-sm` – Card shadow

---

## Copy Guidelines (Danish)

**Tone:** Relatable, empathetic, problem-focused

**Title tips:** Short (2–5 words), specific pain point

**Good examples:** "For lange leveringstider", "Uforudsigelige priser", "Svært at få svar"

---

## Accessibility

- Section has `aria-labelledby` linking to headline
- Problems use `role="listitem"` within implicit list
- Icons are `aria-hidden="true"`

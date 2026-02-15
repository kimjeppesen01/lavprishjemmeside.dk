# Timeline

**Category:** Content Sections  
**Slug:** timeline  
**File:** Timeline.astro

## Description

A vertical timeline showing events, process steps, or company history. Each item has a year (or date), title, and description. Ideal for "Our story" or "How we work" sections.

**Common use cases:**
- Company history ("Fra 2010 til i dag")
- Process or workflow steps
- Project milestones

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  events: Array<{
    year: string;            // Year or date (e.g., "2010", "2020")
    title: string;           // Event title
    description: string;     // Event description
  }>;

  // Optional props
  // (none specified)
}
```

### Example Props Object

```json
{
  "headline": "Vores historie",
  "events": [
    {
      "year": "2010",
      "title": "Grundlagt i København",
      "description": "Vi startede med at hjælpe små virksomheder med deres første hjemmesider."
    },
    {
      "year": "2015",
      "title": "100 kunder",
      "description": "Vi nåede 100 tilfredse kunder og udvidede teamet."
    },
    {
      "year": "2025",
      "title": "I dag",
      "description": "Vi servicerer virksomheder i hele Danmark med moderne web-løsninger."
    }
  ]
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Timeline line, year accent
- `--color-text-primary` - Titles
- `--color-text-secondary` - Descriptions
- `--color-border` - Timeline line (alternative)

**Typography:**
- `--font-heading` - Headline and event titles
- `--font-body` - Descriptions

**Shapes:**
- `--radius-full` - Timeline node/dot

---

## Copy Guidelines (Danish)

**Tone:** Narrative, proud but not boastful

**Title tips:**
- Be specific ("Grundlagt i København" vs "Start")
- Use past tense for historical events

**Description tips:**
- One or two sentences per event
- Include concrete details when possible

**Good examples:**

✅ "Grundlagt i København"  
✅ "100 tilfredse kunder"

**Avoid:**

❌ "Vi blev større" (too vague)

---

## Accessibility

- **ARIA:** Use `role="list"` for events; `aria-labelledby` for section.
- **Keyboard:** No interactive elements; decorative.
- **Screen reader:** Ensure chronological order is clear (year first in each item).
- **Focus management:** N/A.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  2010 ●─── Grundlagt i København                             │
│        │   Description text...                              │
│        │                                                     │
│  2015 ●─── 100 kunder                                        │
│        │   Description text...                               │
│        │                                                     │
│  2025 ●─── I dag                                            │
│            Description text...                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Vertical line connects nodes; nodes can be circles or squares.
- Mobile: consider horizontal scroll or stacked layout if many events.
- Year can be visually emphasized (larger, `--color-primary`).
- Ensure sufficient spacing between events for readability.

# FAQ Accordion

**Category:** Utilities  
**Slug:** faq-accordion  
**File:** FaqAccordion.astro

## Description

Collapsible FAQ items. Each item has a question and answer; users expand/collapse to read. Reduces scrolling and helps users find specific answers quickly.

**Common use cases:**
- FAQ page
- Support section
- Product or service clarification

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  faqs: Array<{
    question: string;         // FAQ question
    answer: string;          // FAQ answer (can be HTML or plain text)
  }>;

  // Optional props
  defaultOpen?: number;      // Index of item open by default (0-based, -1 = none) (default: 0)
}
```

### Example Props Object

```json
{
  "headline": "Ofte stillede spørgsmål",
  "faqs": [
    {
      "question": "Hvor lang tid tager det at lave en hjemmeside?",
      "answer": "Typisk 2-4 uger afhængigt af størrelse og kompleksitet. Vi giver dig et præcist tidsestimat efter vores indledende samtale."
    },
    {
      "question": "Hvad koster en hjemmeside?",
      "answer": "Vores priser starter ved 5.000 kr for en enkel side. Komplekse løsninger koster mere. Kontakt os for et uforpligtende tilbud."
    }
  ],
  "defaultOpen": 0
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Expand icon, focus ring
- `--color-text-primary` - Questions
- `--color-text-secondary` - Answers
- `--color-border` - Dividers between items

**Typography:**
- `--font-heading` - Headline, questions
- `--font-body` - Answers

**Shapes:**
- `--radius-md` - Item corners (optional)

---

## Copy Guidelines (Danish)

**Tone:** Helpful, clear

**Question tips:**
- Phrase as users would ask ("Hvor lang tid...?", "Hvad koster...?")
- Keep questions concise

**Answer tips:**
- Direct, helpful responses
- Include specifics (numbers, links) when relevant

**Good examples:**

✅ "Hvor lang tid tager det at lave en hjemmeside?"  
✅ "Hvad koster en hjemmeside?"

**Avoid:**

❌ "Tid?" (too vague)

---

## Accessibility

- **ARIA:** Use `<details>`/`<summary>` or custom with `aria-expanded`, `aria-controls`, `aria-labelledby`. `role="button"` on summary.
- **Keyboard:** Summary must be focusable; Enter/Space toggles expand.
- **Screen reader:** Expanded state must be announced. Answer content should be in region with `id` referenced by `aria-controls`.
- **Focus management:** When expanding, optional move focus to answer for long content.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  ▶ Hvor lang tid tager det at lave en hjemmeside?            │
│  ─────────────────────────────────────────────────────────  │
│  ▼ Hvad koster en hjemmeside?                    [expanded]  │
│    Typisk 2-4 uger afhængigt af størrelse...                 │
│  ─────────────────────────────────────────────────────────  │
│  ▶ Tilbyder I også vedligeholdelse?                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Prefer native `<details>`/`<summary>` for simplicity and accessibility.
- If custom JS: only one open at a time (accordion) or allow multiple (expandable).
- Animate height transition for smooth expand/collapse.
- Ensure `defaultOpen` applies on initial render (SSR/hydration).

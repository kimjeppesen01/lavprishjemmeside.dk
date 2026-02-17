# Modal Section

**Category:** Utilities  
**Slug:** modal-section  
**File:** ModalSection.astro

## Description

Reusable modal/dialog overlay for forms, CTAs, or media. Uses native `<dialog>` for accessibility (focus trap, Escape to close).

**Common use cases:**
- "Læs mere" / expandable content
- Kontakt-formular i popup
- Video eller billede i overlay

---

## Props Schema

```typescript
interface Props {
  triggerText: string;
  headline: string;
  content: string;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "triggerText": "Læs mere",
  "headline": "Vigtig information",
  "content": "<p>Her er mere indhold der vises i modalen.</p>"
}
```

---

## Copy Guidelines (Danish)

- triggerText: Kort, handlingsorienteret ("Læs mere", "Se detaljer")
- headline: Tydelig overskrift for modalindholdet

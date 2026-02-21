# Overlap Cards Section

**Category:** Content  
**Slug:** overlap-cards-section  
**File:** OverlapCardsSection.astro

## Description

Two or three cards displayed in a row with horizontal overlap (one card slightly in front of the next). Each card can have image, title, content, and CTA. Creates a layered, connected feel for feature comparison or process steps.

> **Note:** For a single consolidated long-form section (text + image + overlap cards), prefer `immersive-content-visual`.

**Common use cases:**
- Feature comparison (2–3 features)
- Process overview (steps 1, 2, 3)
- Product highlights with layered cards

---

## Props Schema

```typescript
interface Props {
  headline?: string;
  cards: Array<{
    imageUrl?: string;
    imageAlt?: string;
    title: string;
    content: string;
    cta?: { text: string; href: string };
  }>;
  overlapOffset?: number;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "headline": "Vælg din løsning",
  "cards": [
    {
      "imageUrl": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400",
      "title": "Produktvisning",
      "content": "<p>Se hvordan produktet fungerer i praksis.</p>",
      "cta": { "text": "Læs mere", "href": "/produkt" }
    },
    {
      "title": "Funktionsliste",
      "content": "<p>Punkt 1, punkt 2, punkt 3.</p>" 
    }
  ],
  "overlapOffset": 40
}
```

---

## Visual Layout

```
┌──────────────┐
│   Card 1     │ ← z-index 3 (front)
└──────────────┘
    ┌──────────────┐
    │   Card 2     │ ← z-index 2, margin-left: -40px
    └──────────────┘
        ┌──────────────┐
        │   Card 3     │ ← z-index 1, margin-left: -40px
        └──────────────┘
```

---

## When AI Should Use This Component

Use **overlap-cards-section** when presenting 2–3 related features or steps in a layered card layout. Good for: feature comparison, process overview, product highlights.

**Card count:** 2–3 cards recommended. More than 3 becomes cluttered.

---

## Copy Guidelines (Danish)

- Card titles: Korte, klare (fx "Produktvisning", "Specifikationer")
- Content: 1–2 sætninger per kort

---

## Accessibility

- Section with optional `aria-labelledby`
- Images require `imageAlt` when present
- CTA links: min 44×44px

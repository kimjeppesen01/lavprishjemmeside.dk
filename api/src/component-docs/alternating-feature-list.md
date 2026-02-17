# Alternating Feature List

**Category:** Content  
**Slug:** alternating-feature-list  
**File:** AlternatingFeatureList.astro

## Description

A composite component that renders 2–4 `OverlapImageSection` blocks as one coherent module. Themes alternate (teal/white/teal), image placement alternates (left/right), and images overlap strongly into the next section. No spacers between items—seamless blending. Zigzag dividers appear when transitioning between themes.

**Common use cases:**
- Multiple product features in a flowing visual block
- "How it works" or process steps with alternating text/image layout
- Feature comparisons or benefits presented as overlapping sections

---

## Props Schema

```typescript
interface Feature {
  headline: string;
  introText?: string;
  content?: string;
  bulletPoints?: string[];
  imageUrl: string;
  imageAlt?: string;
  cta?: { text: string; href: string; icon?: 'chevron-down' | 'arrow-right' };
}

interface Props {
  features: Feature[];
  /** First theme: 'teal' or 'white'. Rest alternate. */
  firstTheme?: 'teal' | 'white';
  /** Overlap amount in pixels (except last item uses 0) */
  overlapAmount?: number;
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "features": [
    {
      "headline": "Produktionsoversigt",
      "introText": "Se hvordan systemet giver dig overblik.",
      "content": "<p>Med vores platform har du altid fingeren på pulsen.</p>",
      "imageUrl": "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800",
      "imageAlt": "Skærmbillede",
      "bulletPoints": ["Sikker adgang", "Sporbarhed online"],
      "cta": { "text": "Se specifikationer", "href": "/specs", "icon": "arrow-right" }
    },
    {
      "headline": "Avanceret rapportering",
      "introText": "Detaljerede rapporter tilgængelige når det passer dig.",
      "content": "<p>Træk data ud i Excel eller PDF.</p>",
      "imageUrl": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
      "bulletPoints": ["Fleksible filformater", "Planlagte rapporter"],
      "cta": { "text": "Læs mere", "href": "/rapporter", "icon": "arrow-right" }
    }
  ],
  "firstTheme": "teal",
  "overlapAmount": 80
}
```

---

## Visual Layout

```
┌─────────────────────────────────────┐
│ Section 1: teal, image right        │
│ [Text]              [Image ▄▄▄]     │
│                      ▄▄▄▄▄▄▄▄▄▄▄▄▄  │ ← overlap 80px
└────────────────────────────────────┘
  ▄▄▄▄▄▄▄▄▄▄▄▄  zigzag
┌─────────────────────────────────────┐
│ Section 2: white, image left        │
│ ▄▄▄▄▄▄▄▄▄▄▄▄  [Image]    [Text]     │
│ ▄▄▄                                 │ ← overlap 80px
└────────────────────────────────────┘
  zigzag
┌─────────────────────────────────────┐
│ Section 3: teal, image right (last) │
│ [Text]              [Image]         │ ← no overlap
└─────────────────────────────────────┘
```

---

## When AI Should Use This

- Use **alternating-feature-list** when the page needs 2–4 overlapping text/image blocks that blend visually (teal/white alternation, images overlapping into the next section).
- Prefer this over multiple separate `overlap-image-section` instances when content naturally forms a coherent feature list or process sequence.
- Maximum 4 features; minimum 2.

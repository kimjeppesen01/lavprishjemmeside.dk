# Content Image Split

**Category:** Content Sections  
**Slug:** content-image-split  
**File:** ContentImageSplit.astro

## Description

A section with text content (headline, body) on one side and an image on the other. Supports alternating layout (image left/right) for visual variety. Used for detailed explanations, about sections, or feature highlights.

**Common use cases:**
- About us sections with team or office photo
- Feature explanation with product screenshot
- Process or methodology descriptions

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  content: string;            // HTML or plain text content (body)
  imageUrl: string;           // Image URL

  // Optional props
  imagePosition?: 'left' | 'right';  // Which side the image is on (default: 'right')
  backgroundColor?: 'default' | 'alt';  // Section background (default: 'default')
}
```

### Example Props Object

```json
{
  "headline": "Vi bygger hjemmesider der virker",
  "content": "Med over 10 års erfaring hjælper vi virksomheder med at komme online. Vi fokuserer på brugervenlige løsninger og troværdig design, der hjælper dig med at nå dine kunder.",
  "imageUrl": "/images/om-os-team.jpg",
  "imagePosition": "right",
  "backgroundColor": "default"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-text-primary` - Headline
- `--color-text-secondary` - Body text
- `--color-bg-section-alt` - Alternate section background

**Typography:**
- `--font-heading` - Headline
- `--font-body` - Body content

**Shapes:**
- `--radius-lg` - Image border radius

---

## Copy Guidelines (Danish)

**Tone:** Professional, trustworthy

**Headline tips:**
- Summarize the main message
- Avoid generic phrases like "Om os"

**Content tips:**
- 1–3 short paragraphs
- Include concrete details (years, numbers) when relevant

**Good examples:**

✅ "Vi bygger hjemmesider der virker"  
✅ "Sådan arbejder vi sammen"

**Avoid:**

❌ "Vores historie" (too vague without context)

---

## Accessibility

- **ARIA:** Section with `aria-labelledby` for headline.
- **Keyboard:** No interactive elements in base layout.
- **Screen reader:** Image must have meaningful `alt` text—derive from headline or provide prop.
- **Focus management:** N/A.

---

## Visual Layout

**Image right:**
```
┌─────────────────────────────────────────────────────────────┐
│  Headline              │                                     │
│  Content paragraph 1   │  [     Image     ]                   │
│  Content paragraph 2   │                                     │
└─────────────────────────────────────────────────────────────┘
```

**Image left:**
```
┌─────────────────────────────────────────────────────────────┐
│  [     Image     ]     │  Headline                           │
│                        │  Content paragraphs                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- On mobile, stack: content first, then image (or vice versa based on design).
- Use `object-fit: cover` or `contain` for image; maintain aspect ratio.
- Consider `loading="lazy"` for images below the fold.
- Content may support simple HTML (e.g., `<p>`, `<strong>`) if needed.

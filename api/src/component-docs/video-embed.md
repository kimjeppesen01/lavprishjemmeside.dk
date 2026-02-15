# Video Embed

**Category:** Content Sections  
**Slug:** video-embed  
**File:** VideoEmbed.astro

## Description

Responsive embed of a video from YouTube or Vimeo, with optional title and description. Used for product demos, testimonials, or instructional content.

**Common use cases:**
- Product demo video
- Customer testimonial video
- "How it works" or tutorial content

---

## Props Schema

```typescript
interface Props {
  // Required props
  videoUrl: string;           // Full YouTube or Vimeo URL

  // Optional props
  title?: string;             // Video title (displayed above or with video)
  description?: string;       // Supporting text below video
  thumbnail?: string;         // Custom thumbnail URL (optional; provider default used if omitted)
  provider?: 'youtube' | 'vimeo';  // Can be auto-detected from URL if not specified
}
```

### Example Props Object

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=abcdef",
  "title": "Se hvordan det virker",
  "description": "I denne video viser vi, hvordan du nemt kan komme i gang med vores løsning.",
  "provider": "youtube"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-text-primary` - Title
- `--color-text-secondary` - Description

**Typography:**
- `--font-heading` - Title
- `--font-body` - Description

**Shapes:**
- `--radius-lg` - Video container border radius

---

## Copy Guidelines (Danish)

**Tone:** Informative, engaging

**Title tips:**
- Use action-oriented phrasing ("Se hvordan...", "Lær mere om...")
- Keep it short

**Description tips:**
- One sentence summarizing what the video shows

**Good examples:**

✅ "Se hvordan det virker"  
✅ "Lær mere om vores proces"

**Avoid:**

❌ "Video" (not descriptive)

---

## Accessibility

- **ARIA:** Use `aria-label` on the iframe describing the video (e.g., "Video: Se hvordan det virker").
- **Keyboard:** Ensure play button/link is focusable if using custom thumbnail.
- **Screen reader:** Title and description provide context; iframe should have descriptive `title` attribute.
- **Focus management:** If custom controls, ensure keyboard operability.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Title                                                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │              [  Video Player  ]                      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Description                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Use 16:9 aspect-ratio wrapper for responsive embed (padding-bottom: 56.25%).
- Extract video ID from URL for YouTube (`v=...`) or Vimeo.
- Consider privacy-enhanced mode for YouTube (`youtube-nocookie.com`).
- Lazy-load iframe when video is near viewport.

# CTA Section

**Category:** Hero & CTAs  
**Slug:** cta-section  
**File:** CtaSection.astro

## Description

A conversion-focused call-to-action banner typically placed midway or at the bottom of a page. Can be centered or split layout. Used to drive specific actions such as contacting, requesting a quote, or starting a trial.

**Common use cases:**
- Mid-page conversion section ("Få et gratis tilbud")
- End-of-page CTA before footer
- Newsletter or lead-capture promotions

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  description?: string;       // Supporting text (optional)

  // Optional props
  ctaButton?: {               // Primary CTA
    text: string;
    href: string;
  };
  backgroundColor?: 'default' | 'primary' | 'alt';  // Section background (default: 'primary')
  layout?: 'centered' | 'split';  // Content layout (default: 'centered')
}
```

### Example Props Object

```json
{
  "headline": "Klar til at komme i gang?",
  "description": "Få et uforpligtende tilbud inden for 24 timer. Vi vender tilbage hurtigst muligt.",
  "ctaButton": {
    "text": "Kontakt os i dag",
    "href": "/kontakt"
  },
  "backgroundColor": "primary",
  "layout": "centered"
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - CTA button background (when on alt bg) or section background
- `--color-bg-section-alt` - Alternative section background
- `--color-text-on-primary` - Text on primary-colored background
- `--color-text-primary` - Headline when on light background

**Typography:**
- `--font-heading` - Headline font
- `--font-body` - Description font

**Shapes:**
- `--radius-button` - CTA button border radius

---

## Copy Guidelines (Danish)

**Tone:** Direct, inviting, low-pressure

**Headline tips:**
- Use a question or gentle prompt ("Klar til...?", "Har du brug for...?")
- Keep it short and action-oriented

**Description tips:**
- Reinforce the benefit or reduce friction (e.g., "uforpligtende", "hurtigst muligt")

**Good examples:**

✅ "Klar til at komme i gang?"  
✅ "Få hjælp til din næste projekt"  
✅ "Tilmeld dig vores nyhedsbrev"

**Avoid:**

❌ "Klik her" (too vague)

---

## Accessibility

- **ARIA:** Use `aria-label` on CTA if needed. Section can use `role="region"` with `aria-labelledby` pointing to headline.
- **Keyboard:** CTA button/link must be focusable.
- **Screen reader:** Ensure sufficient contrast between text and background in all `backgroundColor` variants.
- **Focus management:** Logical tab order through headline, description, CTA.

---

## Visual Layout

**Centered:**
```
┌─────────────────────────────────────────────┐
│                                             │
│         Headline                            │
│         Description                         │
│         [CTA Button]                        │
│                                             │
└─────────────────────────────────────────────┘
```

**Split:**
```
┌─────────────────────────────────────────────┐
│  Headline + Description    │  [CTA Button]   │
└─────────────────────────────────────────────┘
```

---

## Implementation Notes

- `backgroundColor: 'primary'` should use `--color-primary` for section bg and `--color-text-on-primary` for text.
- `layout: 'split'` typically shows text left, CTA right on desktop; stack on mobile.
- Use `--section-padding-y` for consistent vertical spacing.

# Newsletter Signup

**Category:** Utilities  
**Slug:** newsletter-signup  
**File:** NewsletterSignup.astro

## Description

An email signup form for newsletters. Typically includes headline, short description, email input, submit button, and privacy notice (GDPR). Placed in footer or as a standalone section.

**Common use cases:**
- Footer newsletter signup
- Blog sidebar or inline CTA
- Lead magnet capture

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline

  // Optional props
  description?: string;       // Short description
  placeholder?: string;       // Email input placeholder (default: "Din e-mail")
  buttonText?: string;       // Submit button text (default: "Tilmeld")
  privacyText?: string;      // GDPR/privacy notice (default: Danish standard notice)
}
```

### Example Props Object

```json
{
  "headline": "Få nyheder og tips i din indbakke",
  "description": "Tilmeld dig vores nyhedsbrev og modtag nyheder, tilbud og nyttige tips.",
  "placeholder": "Din e-mail",
  "buttonText": "Tilmeld mig",
  "privacyText": "Vi sender kun nyhedsbreve og deler aldrig din e-mail med tredjeparter. Du kan afmelde dig når som helst."
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Button background
- `--color-primary-hover` - Button hover
- `--color-border` - Input border
- `--color-text-primary` - Headline
- `--color-text-secondary` - Description, privacy text

**Typography:**
- `--font-heading` - Headline
- `--font-body` - Description, privacy

**Shapes:**
- `--radius-input` - Input
- `--radius-button` - Button

---

## Copy Guidelines (Danish)

**Tone:** Friendly, reassuring

**Headline tips:**
- Focus on benefit ("Få nyheder og tips")
- Keep it inviting

**Privacy text tips:**
- Must mention: no sharing, easy unsubscribe
- GDPR-compliant language

**Good examples:**

✅ "Få nyheder og tips i din indbakke"  
✅ "Vi deler aldrig din e-mail med tredjeparter."

**Avoid:**

❌ Omitting privacy notice (required for GDPR)

---

## Accessibility

- **ARIA:** Email input: `type="email"`, `autocomplete="email"`. Label must be associated. Error: `aria-describedby` + `aria-invalid`.
- **Keyboard:** Input and button focusable.
- **Screen reader:** Success/error messages announced (`role="alert"`).
- **Focus management:** On error, focus input; on success, focus success message.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Headline                                                    │
│  Description                                                 │
│                                                              │
│  [ Din e-mail                    ] [ Tilmeld mig ]           │
│                                                              │
│  Privacy text (small, muted)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Validate email format client-side; double opt-in recommended for GDPR.
- Submit to newsletter API (e.g., Mailchimp, SendGrid, custom).
- Show success state ("Tak! Tjek din indbakke for bekræftelse.").
- Privacy text: small font, `--color-text-secondary`. Required for Danish/EU sites.

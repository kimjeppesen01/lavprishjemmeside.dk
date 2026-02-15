# Contact Form

**Category:** Commerce & Forms  
**Slug:** contact-form  
**File:** ContactForm.astro

## Description

A contact form with configurable fields, validation, and submission. Used for lead generation and customer inquiries. Supports various field types and custom success messages.

**Common use cases:**
- Contact page form
- Lead capture on landing pages
- Request quote forms

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline

  // Optional props
  description?: string;       // Supporting text above form
  fields?: Array<{
    type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    name: string;              // Form field name
    label: string;             // Danish label
    required?: boolean;        // (default: false)
    options?: string[];        // For select: option labels
  }>;
  submitText?: string;        // Submit button text (default: "Send")
  successMessage?: string;    // Message shown after successful submit (default: "Tak for din henvendelse!")
}
```

### Example Props Object

```json
{
  "headline": "Kontakt os",
  "description": "Udfyld formularen, så vender vi tilbage hurtigst muligt.",
  "fields": [
    { "type": "text", "name": "name", "label": "Navn", "required": true },
    { "type": "email", "name": "email", "label": "E-mail", "required": true },
    { "type": "tel", "name": "phone", "label": "Telefon" },
    { "type": "textarea", "name": "message", "label": "Besked", "required": true }
  ],
  "submitText": "Send besked",
  "successMessage": "Tak for din henvendelse! Vi vender tilbage inden for 24 timer."
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Submit button, focus ring
- `--color-primary-hover` - Button hover
- `--color-border` - Input borders
- `--color-text-primary` - Labels
- `--color-text-secondary` - Placeholders

**Typography:**
- `--font-heading` - Headline
- `--font-body` - Labels, input text

**Shapes:**
- `--radius-input` - Input and button border radius
- `--shadow-card` - Optional form container shadow

---

## Copy Guidelines (Danish)

**Tone:** Professional, helpful

**Label tips:**
- Use Danish labels: "Navn", "E-mail", "Telefon", "Besked"
- Keep labels short and clear

**Success message tips:**
- Thank the user and set expectations ("inden for 24 timer")

**Good examples:**

✅ "Send besked"  
✅ "Tak for din henvendelse! Vi vender tilbage hurtigst muligt."

**Avoid:**

❌ "Submit" (use "Send" or "Send besked")

---

## Accessibility

- **ARIA:** Each input needs associated `<label>` (use `for`/`id` or wrap). Required fields: `aria-required="true"`. Errors: `aria-describedby` linking to error message.
- **Keyboard:** All form controls must be focusable and operable.
- **Screen reader:** Error messages must be announced (e.g., `role="alert"`).
- **Focus management:** On success, focus success message or headline. On error, focus first invalid field.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Headline                                                    │
│  Description                                                 │
│                                                              │
│  Navn *        [________________]                            │
│  E-mail *      [________________]                            │
│  Telefon       [________________]                            │
│  Besked *      [________________]                            │
│                [________________]                            │
│                                                              │
│                [ Send besked ]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Client-side validation (required, email format). Server-side validation required for security.
- Submit: POST to API endpoint; handle loading and error states.
- Default fields if `fields` omitted: name, email, message.
- Use `--radius-input` for inputs; `--radius-button` for button.
- Ensure form works without JavaScript for basic accessibility (progressive enhancement).

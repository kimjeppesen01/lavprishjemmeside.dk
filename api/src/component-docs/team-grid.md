# Team Grid

**Category:** Social Proof  
**Slug:** team-grid  
**File:** TeamGrid.astro

## Description

A grid of team member cards, each with photo, name, role, optional bio, and optional social links. Used to introduce the people behind the company.

**Common use cases:**
- About page team section
- Leadership or key personnel
- "Mød teamet" sections

---

## Props Schema

```typescript
interface Props {
  // Required props
  headline: string;           // Section headline
  members: Array<{
    name: string;              // Full name
    role: string;              // Job title
    photo: string;             // Image URL
    bio?: string;              // Short bio (optional)
    social?: Array<{           // Social links (optional)
      platform: string;       // e.g., "linkedin", "twitter"
      url: string;
    }>;
  }>;

  // Optional props
  columns?: 2 | 3 | 4;       // Desktop column count (default: 3)
}
```

### Example Props Object

```json
{
  "headline": "Mød teamet",
  "members": [
    {
      "name": "Lars Petersen",
      "role": "Grundlægger",
      "photo": "/images/team/lars.jpg",
      "bio": "Lars har 15 års erfaring inden for webudvikling.",
      "social": [
        { "platform": "linkedin", "url": "https://linkedin.com/in/lars" }
      ]
    }
  ],
  "columns": 3
}
```

---

## CSS Variables Used

This component uses the following design tokens from `theme.css`:

**Colors:**
- `--color-primary` - Social icon hover
- `--color-text-primary` - Name, role
- `--color-text-secondary` - Bio

**Typography:**
- `--font-heading` - Headline, names
- `--font-body` - Bio

**Shapes:**
- `--radius-card` - Card and photo border radius
- `--shadow-card` - Card shadow

---

## Copy Guidelines (Danish)

**Tone:** Professional, approachable

**Role tips:**
- Use Danish job titles ("Grundlægger", "Projektleder", "Udvikler")
- Keep consistent style across members

**Bio tips:**
- One short sentence
- Focus on relevant expertise

**Good examples:**

✅ "Grundlægger"  
✅ "15 års erfaring inden for webudvikling"

**Avoid:**

❌ "CEO" (prefer "Direktør" or "Grundlægger" for Danish sites)

---

## Accessibility

- **ARIA:** Grid as `role="list"`; each card `role="listitem"`. Social links need `aria-label` (e.g., "LinkedIn profil for Lars Petersen").
- **Keyboard:** Social links must be focusable.
- **Screen reader:** Photos need descriptive `alt` (e.g., "Portræt af Lars Petersen").
- **Focus management:** Visible focus on links.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Section Headline                                            │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ [Photo] │  │ [Photo] │  │ [Photo] │                     │
│  │ Name    │  │ Name    │  │ Name    │                     │
│  │ Role    │  │ Role    │  │ Role    │                     │
│  │ Bio     │  │ Bio     │  │ Bio     │                     │
│  │ [icons] │  │ [icons] │  │ [icons] │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

- Photo aspect ratio: typically 1:1 or 3:4 for portraits.
- Social icons: use `aria-hidden` on icon; text in `aria-label`.
- Grid collapses to 1–2 columns on mobile.

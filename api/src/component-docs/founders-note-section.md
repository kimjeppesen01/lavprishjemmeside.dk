# Founder's Note Section

**Category:** Trust  
**Slug:** founders-note-section  
**File:** FoundersNoteSection.astro

## Description

Personal message from founder: quote, optional photo, optional CTA. Builds trust through authenticity.

**Common use cases:**
- Om os / about
- Før CTA eller pricing
- Personlig introduktion

---

## Props Schema

```typescript
interface Props {
  quote: string;
  author: string;
  role?: string;
  photo?: string;
  cta?: { text: string; href: string };
  instanceId?: string | number;
}
```

### Example Props Object

```json
{
  "quote": "Jeg startede denne virksomhed for at gøre professionelle hjemmesider tilgængelige for alle.",
  "author": "Kim Jeppesen",
  "role": "Grundlægger & CEO",
  "photo": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=320",
  "cta": { "text": "Kontakt mig", "href": "/kontakt" }
}
```

---

## Copy Guidelines (Danish)

- Quote: Autentisk, personlig tone. Undgå corporate-jargon.
- Role: "Grundlægger", "CEO", "Ejer"

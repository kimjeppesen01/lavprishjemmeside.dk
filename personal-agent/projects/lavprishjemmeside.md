# lavprishjemmeside.dk — Product Context

## What It Is

A Danish CMS for small businesses. Drag-and-drop page builder with 27 components (hero, features, testimonials, pricing, FAQ, contact form, etc.), built-in design system (colors, fonts, themes), Danish UI, and static site generation. Clients get their own website on their own domain.

**Tech**: Astro (static) + Node.js API + MySQL. Hosting via cPanel. No e-commerce yet (planned).

---

## Admin URLs

| What | URL |
|------|-----|
| Login | `/admin/` |
| Dashboard (traffic, metrics) | `/admin/dashboard/` |
| Traffic (GA4, Search Console) | `/admin/traffic/` |
| **Pages** (page builder, add/edit/reorder components) | `/admin/pages/` |
| **Design & styling** (colors, fonts, themes, presets) | `/admin/styling/` |
| Header & Footer (logo, menus, footer) | `/admin/header-footer/` |
| **Components** (browse library) | `/admin/components/` |
| **AI-assembler** (generate page from prompt) | `/admin/ai-assemble/` |
| Media (upload images) | `/admin/media/` |

---

## Common Support Questions

### "Hvordan ændrer jeg farverne / designet?"
Go to **Admin → Design & styling**. Use color pickers or choose a theme preset (Professionel, Kreativ, Minimalistisk).

### "Hvordan tilføjer jeg en ny side?"
Admin → Sider → vælg eller opret side → Tilføj komponenter → vælg fra biblioteket → Gem → **Publicer side**.

### "Hvordan publicerer jeg ændringer?"
Efter du har gemt: klik **"Publicer side"** på siden. Det triggger en genopbygning (ca. 60–90 sekunder). Siden er derefter live.

### "Hvordan ændrer jeg header / logo / menu?"
Admin → **Header & Footer**. Her kan du ændre logo, menupunkter og footer.

### "Hvordan bruger jeg AI til at lave indhold?"
Admin → **AI-assembler**. Skriv en beskrivelse af siden, og AI genererer komponenter med tekst. Du kan redigere og gemme.

### "Hvordan uploader jeg billeder?"
Admin → **Media** → Upload. Derefter kan du vælge billeder i komponent-editoren (når du klikker "Rediger" på en komponent).

### "Glemt password"
På login-siden: "Glemt password?" → indtast email → tjek din indbakke. Linket udløber efter 60 min.

### "Tilpasning af domæne / eget domæne"
Konfigureres via hosting (cPanel). Kontakt support for hjælp til DNS og domæne-opsætning.

### "Fakturering / betaling"
Kontakt support@lavprishjemmeside.dk med din konto-email.

---

## Escalation

Hvis problemet ikke kan løses i denne kanal:

> "Send en email til support@lavprishjemmeside.dk med din konto-email og en beskrivelse af problemet. Vores team vender tilbage inden for 24 timer."

---

## Tone

Varm, professionel, ikke teknisk. De fleste kunder er små virksomhedsejere, ikke udviklere. Match altid kundens sprog (dansk eller engelsk).

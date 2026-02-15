# Globale funktionsindstillinger & Header/Footer

## Header & Footer

Konfigurer headeren og footeren under **Admin → Header & Footer**.

### Header-layouts

1. **Regular** — Tre kolonner: Logo venstre, Menu 1 i midten, Menu 2 (knapper) til højre.
2. **Modern** — Logo centreret over Menu 1 (én kolonne).
3. **Mega** — Brugerdefineret HTML. Klik "Kopier skabelon", tilpas HTML'en, og indsæt i tekstfeltet.

### Mega menu

Ved Mega-layout giver vi en HTML-skabelon med et eksempel på et dropdown-mega-menu. Kopier skabelonen, rediger den til dit indhold (ydelser, sider, links), og indsæt den færdige HTML i feltet. Brug CSS-variabler fra `theme.css` (fx `var(--color-primary)`) for farver.

### Footer

Footer har kolonner med enten:
- Titel + beskrivelsestekst
- Titel + links (URL + label)

Tilføj eller fjern kolonner efter behov. Copyright-teksten vises nederst.

---

# Globale funktionsindstillinger

Kontroller globale styling-funktioner under **Admin → Design & styling → Funktionsindstillinger**.

---

## Smooth scroll

**Beskrivelse:** Gør anchor-links og indre side-navigation mere behagelig ved at rulle blødt i stedet for et hurtigt spring.

**Teknisk:** Sætter `scroll-behavior: smooth` på `<html>` via CSS-klasse `smooth-scroll`.

---

## Korn-overlay

**Beskrivelse:** En subtil støjtekstur over hele siden for et let visuelt lag.

**Teknisk:** Et fast `div` med SVG-noise, `opacity: 0.03`, `pointer-events: none`, så indholdet stadig kan klikkes.

---

## Sideloader

**Beskrivelse:** En fuldskærms-overlay der vises mens siden loader. Forbedrer oplevelsen ved langsomme forbindelser.

**Indstillinger:**
- **Tekst** – Brugerdefineret tekst (fx "Indlæser...", "Vent venligst"). Maks. 100 tegn.
- **Vis logo** – Viser sitets favicon/logo i loaderen.
- **Varighed (0,5–3 sek.)** – Minimumstid loaderen vises. Siden skjuler loaderen når `window.load` fyres eller varigheden er nået (hvad der sker først).

Slå funktionen fra for ingen loader.

---

## Klæbende header

**Beskrivelse:** Headeren bliver ved toppen når brugeren scroller, og får en let skygge for bedre adskillelse fra indholdet.

**Teknisk:** Bruger `position: sticky` og tilføjer `shadow-sm` når scroll-afstand > 8px.

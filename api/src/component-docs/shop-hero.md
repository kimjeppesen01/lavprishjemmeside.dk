# ShopHero

**Component name (AI):** `shop-hero`
**Astro file:** `src/components/ShopHero.astro`

## Description
Full-width hero section for the shop landing page. Two-column layout on desktop: text content (heading, subheading, CTA buttons) on the left, optional product/lifestyle image on the right. Includes optional badge pill and secondary CTA.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `heading` | `string` | **required** | Main heading |
| `subheading` | `string` | — | Supporting text below heading |
| `ctaLabel` | `string` | `'Se alle produkter'` | Primary CTA button label |
| `ctaHref` | `string` | `'/shop/'` | Primary CTA destination |
| `secondaryLabel` | `string` | — | Secondary link label (optional) |
| `secondaryHref` | `string` | — | Secondary link destination (optional) |
| `imageUrl` | `string` | — | Hero image URL (optional; hides image col if absent) |
| `imageAlt` | `string` | `''` | Alt text for image |
| `badge` | `string` | — | Small pill label above heading (optional) |

## Usage example

```astro
---
import ShopHero from '../components/ShopHero.astro';
---
<ShopHero
  heading="Vores shop"
  subheading="Kvalitetsprodukter til gode priser — hurtig levering overalt i Danmark."
  ctaLabel="Se alle produkter"
  ctaHref="/shop/"
  secondaryLabel="Alle kategorier"
  secondaryHref="/shop/#kategorier"
  imageUrl="/uploads/shop-hero.jpg"
  imageAlt="Shopbillede"
  badge="Officiel shop"
/>
```

## Notes
- Uses `data-reveal` for scroll-reveal animation on both columns
- Primary button styled with `btn-gradient` (theme colour)
- Responsive: stacked on mobile, side-by-side on md+
- Image is `aspect-[6/5]`, `object-cover`, with rounded corners and shadow

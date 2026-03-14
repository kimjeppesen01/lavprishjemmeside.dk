# ProductGrid

**Component name (AI):** `product-grid`
**Astro file:** `src/components/ProductGrid.astro`

## Description
Responsive product grid that renders 2–4 columns of ProductCard tiles. Used on shop landing, category pages, and anywhere a curated product list is needed. SSG-compatible — products are passed as props from API data fetched at build time.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `products` | `Product[]` | `[]` | Array of product objects from `/shop/products` API |
| `title` | `string` | — | Optional section heading above the grid |
| `description` | `string` | — | Optional subheading below the title |
| `columns` | `2 \| 3 \| 4` | `3` | Number of columns on large screens |
| `showEmpty` | `boolean` | `true` | Show empty state when no products |
| `emptyText` | `string` | `'Ingen produkter fundet.'` | Custom empty-state message |

## Product object shape

```json
{
  "id": 1,
  "name": "Produkt A",
  "slug": "produkt-a",
  "short_desc": "Kort beskrivelse",
  "price_ore": 9995,
  "compare_ore": 12995,
  "primary_image": "/uploads/produkt-a.jpg",
  "category_slug": "elektronik",
  "is_featured": false,
  "stock": 10,
  "track_stock": true
}
```

## Usage example (Astro page)

```astro
---
import ProductGrid from '../components/ProductGrid.astro';
const res = await fetch(`${apiUrl}/shop/products?featured=1&limit=8`);
const { products } = await res.json();
---
<ProductGrid
  products={products}
  title="Udvalgte produkter"
  description="Håndplukkede favoritter"
  columns={4}
/>
```

## API data source
`GET /shop/products` — supports query params: `category`, `featured`, `search`, `page`, `limit`

## Notes
- "Tilføj"-button fires `addToCart()` from `src/scripts/cart.js`
- Gives visual feedback (1.5s "Tilføjet ✓" state)
- Stock-out products show "Udsolgt" and disable button
- Uses `<ProductCard>` internally for each product

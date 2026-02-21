# Shopping Module — Implementation Plan

> **Project:** lavprishjemmeside.dk
> **Stack:** Astro 5 MPA + Express API (`.cjs`) + MySQL + cPanel/LiteSpeed + Node 22
> **Payment:** Quickpay (Dankort, Visa/MC, MobilePay, Apple Pay)
> **Scope:** Own shop, physical products only
> **Status:** Plan — ready for implementation
> **Last revised:** 2026-02-16

---

## 1) Vision

A full e-commerce experience integrated into the existing platform. Customers browse products, add to cart, check out via Quickpay, and receive order confirmation — all without leaving the site. Admins manage products, orders, shipping, and discounts from the existing admin panel.

**Architecture strategy: static pages + client-side JS islands**

```
Product pages ──→ Built at deploy time (SSG) ──→ Great SEO
Cart/Checkout ──→ Client-side JS + API calls  ──→ Real-time interactivity
Payments      ──→ Quickpay Payment Window      ──→ Zero PCI scope
Orders        ──→ Server-side + webhooks       ──→ Reliable processing
Stock checks  ──→ Client-side fetch on load    ──→ Always current
```

This matches the existing pattern: static pages for content, API for dynamic data, vanilla JS for interactivity.

---

## 2) Database Schema (11 new tables)

### `product_categories`
```sql
CREATE TABLE product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_da VARCHAR(255) NOT NULL,
  description_da TEXT,
  parent_id INT DEFAULT NULL,
  image_id INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `products`
```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name_da VARCHAR(255) NOT NULL,
  description_da TEXT,
  description_short_da VARCHAR(500),
  category_id INT DEFAULT NULL,
  -- Pricing (in øre — 9995 = 99,95 kr)
  price_ore INT NOT NULL,
  compare_at_price_ore INT DEFAULT NULL,
  cost_price_ore INT DEFAULT NULL,
  -- Tax
  vat_rate DECIMAL(5,2) DEFAULT 25.00,
  -- Inventory
  track_inventory TINYINT(1) DEFAULT 1,
  stock_quantity INT DEFAULT 0,
  allow_backorder TINYINT(1) DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  -- Physical
  weight_grams INT DEFAULT NULL,
  -- SEO
  meta_title VARCHAR(70),
  meta_description VARCHAR(170),
  -- Status
  status ENUM('draft','active','archived') DEFAULT 'draft',
  featured TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_featured (featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `product_variants`
```sql
CREATE TABLE product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku VARCHAR(100) UNIQUE,
  name_da VARCHAR(255) NOT NULL,
  option1_name VARCHAR(50),
  option1_value VARCHAR(100),
  option2_name VARCHAR(50),
  option2_value VARCHAR(100),
  price_ore INT DEFAULT NULL,
  compare_at_price_ore INT DEFAULT NULL,
  stock_quantity INT DEFAULT 0,
  weight_grams INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id),
  INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `product_images`
```sql
CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  media_id INT NOT NULL,
  variant_id INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_primary TINYINT(1) DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `customers`
```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'DK',
  order_count INT DEFAULT 0,
  total_spent_ore BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `shipping_methods`
```sql
CREATE TABLE shipping_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_da VARCHAR(255) NOT NULL,
  description_da VARCHAR(500),
  carrier ENUM('postnord','gls','dao','pickup','custom') NOT NULL,
  price_ore INT NOT NULL,
  free_shipping_threshold_ore INT DEFAULT NULL,
  estimated_days_min INT DEFAULT 1,
  estimated_days_max INT DEFAULT 3,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `discount_codes`
```sql
CREATE TABLE discount_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('percentage','fixed_amount','free_shipping') NOT NULL,
  value INT NOT NULL,
  min_order_ore INT DEFAULT NULL,
  max_uses INT DEFAULT NULL,
  used_count INT DEFAULT 0,
  starts_at TIMESTAMP DEFAULT NULL,
  expires_at TIMESTAMP DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `orders`
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  order_token VARCHAR(64) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  status ENUM(
    'pending_payment','paid','processing',
    'shipped','delivered','cancelled','refunded'
  ) DEFAULT 'pending_payment',
  -- Financials (all in øre)
  subtotal_ore INT NOT NULL,
  shipping_ore INT NOT NULL DEFAULT 0,
  discount_ore INT NOT NULL DEFAULT 0,
  vat_ore INT NOT NULL,
  total_ore INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'DKK',
  -- Shipping
  shipping_method_id INT DEFAULT NULL,
  shipping_name VARCHAR(255),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_postal_code VARCHAR(10),
  shipping_city VARCHAR(100),
  shipping_country VARCHAR(2) DEFAULT 'DK',
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  -- Quickpay
  quickpay_payment_id VARCHAR(50),
  quickpay_order_id VARCHAR(20),
  -- Discount
  discount_code_id INT DEFAULT NULL,
  -- Notes
  customer_note TEXT,
  admin_note TEXT,
  -- Timestamps
  paid_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id) ON DELETE SET NULL,
  FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_order_token (order_token),
  INDEX idx_status (status),
  INDEX idx_customer (customer_id),
  INDEX idx_created (created_at),
  INDEX idx_quickpay (quickpay_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `order_items`
```sql
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT DEFAULT NULL,
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255),
  sku VARCHAR(100),
  quantity INT NOT NULL DEFAULT 1,
  unit_price_ore INT NOT NULL,
  total_ore INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `order_events`
```sql
CREATE TABLE order_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  description VARCHAR(500),
  metadata JSON,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### `shop_settings`
```sql
CREATE TABLE shop_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT DEFAULT 1,
  shop_name VARCHAR(255) DEFAULT 'Lavprishjemmeside.dk Shop',
  shop_email VARCHAR(255),
  shop_phone VARCHAR(30),
  company_name VARCHAR(255),
  cvr_number VARCHAR(20),
  address_line1 VARCHAR(255),
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(2) DEFAULT 'DK',
  quickpay_merchant_id VARCHAR(50),
  quickpay_api_key_encrypted VARCHAR(500),
  quickpay_private_key_encrypted VARCHAR(500),
  quickpay_test_mode TINYINT(1) DEFAULT 1,
  order_number_prefix VARCHAR(10) DEFAULT 'LPH',
  order_number_next INT DEFAULT 10001,
  send_order_confirmation TINYINT(1) DEFAULT 1,
  send_shipping_notification TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3) API Endpoints

### Public (no auth — storefront)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/shop/products` | List products (filter: category, featured, search, pagination) |
| GET | `/shop/products/:slug` | Single product with variants, images, category |
| GET | `/shop/categories` | Category tree |
| POST | `/shop/cart/validate` | Validate cart items (stock check, current prices) |
| GET | `/shop/shipping/methods` | Active shipping methods with prices |
| POST | `/shop/discount/validate` | Validate discount code for cart |
| POST | `/shop/orders` | Create order → returns Quickpay payment link |
| GET | `/shop/orders/:token` | Order status by public token |
| POST | `/shop/quickpay/callback` | Quickpay webhook (checksum verified) |

### Admin (JWT required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/shop/admin/products` | List / create products |
| PUT/DELETE | `/shop/admin/products/:id` | Update / delete product |
| GET/POST | `/shop/admin/products/:id/variants` | Manage variants |
| POST | `/shop/admin/products/:id/images` | Link media to product |
| GET/POST | `/shop/admin/categories` | Category CRUD |
| GET | `/shop/admin/orders` | List orders (filter, search, pagination) |
| GET | `/shop/admin/orders/:id` | Order detail with items + events |
| POST | `/shop/admin/orders/:id/status` | Update order status |
| POST | `/shop/admin/orders/:id/tracking` | Add tracking number |
| GET/POST | `/shop/admin/shipping` | Shipping method CRUD |
| GET/POST | `/shop/admin/discounts` | Discount code CRUD |
| GET/POST | `/shop/admin/settings` | Shop settings |
| GET | `/shop/admin/dashboard` | Revenue, order count, top products |

### Files

```
api/src/
  routes/
    shop-public.cjs       ← Public storefront endpoints
    shop-admin.cjs        ← Admin product/order management
    shop-quickpay.cjs     ← Quickpay callback handler (isolated)
  services/
    quickpay.cjs          ← Quickpay API client
    shop-email.cjs        ← Order email templates
  schema_shop.sql         ← All 11 tables in one migration
```

---

## 4) Quickpay Payment Flow

### Step-by-step

```
1. Customer clicks "Betal" on checkout page
   → Frontend POSTs to /shop/orders with:
     { items, customer, shipping_method_id, discount_code }

2. Server validates:
   - Stock availability for each item
   - Prices match current DB prices (prevent tampering)
   - Discount code validity
   - Shipping method exists

3. Server creates:
   - Customer record (upsert by email)
   - Order record (status: pending_payment)
   - Order items (snapshot product names + prices)
   - Quickpay payment (POST https://api.quickpay.net/payments)
   - Quickpay payment link (PUT /payments/{id}/link)

4. Server returns:
   { order_token, payment_url }

5. Frontend redirects to payment_url (Quickpay hosted page)
   - Customer sees Dankort, Visa/MC, MobilePay options
   - Pays → Quickpay redirects to continueurl (/shop/ordre/{order_token})

6. Quickpay POSTs callback to /shop/quickpay/callback
   - Server verifies checksum (HMAC-SHA256 with private key)
   - Updates order status: pending_payment → paid
   - Decrements stock quantities
   - Sends order confirmation email
   - Logs order_event

7. Customer sees confirmation page (fetches order by token)
```

### Quickpay API client (`services/quickpay.cjs`)

```
Core functions:
  createPayment({ orderId, currency })          → POST /payments
  createPaymentLink({ paymentId, amount, ... }) → PUT /payments/{id}/link
  getPayment(paymentId)                         → GET /payments/{id}
  capturePayment(paymentId, amount)             → POST /payments/{id}/capture
  cancelPayment(paymentId)                      → DELETE /payments/{id}/cancel
  refundPayment(paymentId, amount)              → POST /payments/{id}/refund
  verifyChecksum(body, checksum)                → HMAC-SHA256 verification
```

### Checksum verification (webhook security)

```javascript
const crypto = require('crypto');
function verifyChecksum(rawBody, checksumHeader, privateKey) {
  const computed = crypto.createHmac('sha256', privateKey)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(checksumHeader, 'hex')
  );
}
```

### Environment variables

```env
# Quickpay
QUICKPAY_MERCHANT_ID=
QUICKPAY_API_KEY=
QUICKPAY_PRIVATE_KEY=
QUICKPAY_TEST_MODE=true
QUICKPAY_CALLBACK_URL=https://api.lavprishjemmeside.dk/shop/quickpay/callback
QUICKPAY_CONTINUE_URL=https://lavprishjemmeside.dk/shop/ordre/{order_token}
QUICKPAY_CANCEL_URL=https://lavprishjemmeside.dk/shop/checkout?cancelled=1
```

---

## 5) Frontend: Pages & Components

### New pages

```
src/pages/shop/
  index.astro              ← Shop landing (categories + featured)
  [category].astro         ← Category page (product grid)
  produkt/[slug].astro     ← Product detail page
  kurv.astro               ← Cart page (client-side rendered)
  checkout.astro           ← Checkout form (client-side)
  ordre/[token].astro      ← Order confirmation

src/pages/admin/shop/
  products.astro           ← Product management
  orders.astro             ← Order management
  settings.astro           ← Shop + shipping + discount settings
```

### New components

```
src/components/
  ProductCard.astro        ← Product thumbnail card
  ProductGrid.astro        ← Grid of ProductCards (responsive 2-4 cols)
  ProductDetail.astro      ← Full product page (gallery, variants, add-to-cart)
  CartDrawer.astro         ← Slide-out cart panel (client-side JS)
  CartIcon.astro           ← Header cart icon with item count badge
  ShopHero.astro           ← Shop landing hero with category links
  PriceDisplay.astro       ← Formatted Danish price (kr. 99,95 inkl. moms)
```

### Cart architecture (client-side, localStorage)

```json
{
  "items": [
    {
      "product_id": 5,
      "variant_id": 12,
      "quantity": 2,
      "name": "Produkt A",
      "variant_name": "Stor / Rød",
      "price_ore": 9995,
      "image_url": "/uploads/produkt-a.jpg"
    }
  ],
  "updated_at": "2026-02-16T14:00:00Z"
}
```

**Cart module** (`src/scripts/cart.js`):
- `addItem(product, variant, quantity)` — add or increment
- `removeItem(productId, variantId)` — remove
- `updateQuantity(productId, variantId, quantity)` — change qty
- `getCart()` / `getItemCount()` / `getTotal()`
- `clear()` — empty cart
- `validate()` — POST `/shop/cart/validate` (verify stock + prices server-side)

**Cross-page communication** via `CustomEvent`:
```javascript
window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
```

### Product page: client-side stock check

Each product detail page fetches real-time data on load:
```javascript
const product = await fetch(`${API}/shop/products/${slug}`).then(r => r.json());
// Update stock status, price, variant availability in the DOM
```

Ensures current stock despite static pages.

---

## 6) Danish Localization

### Pricing
- Store in **øre** (smallest unit): `9995` = `99,95 kr.`
- Display: `kr. 99,95 inkl. moms`
- Danish decimal separator: comma (`,`)
- Compare-at: ~~kr. 149,95~~ **kr. 99,95**

### VAT (moms)
- Standard rate: **25%**
- All B2C prices include moms
- Order receipts: Subtotal, Moms (25%), Total
- Calculation: `vat_ore = price_ore / 1.25 * 0.25`

### Shipping (pre-seeded)
1. **PostNord Pakke** — 49 kr, 1-3 dage
2. **GLS Pakke** — 45 kr, 1-2 dage
3. **DAO Pakkeshop** — 39 kr, 2-4 dage
4. **Afhentning** — 0 kr

### Email templates (Danish)
- Ordrebekræftelse: "Din ordre #{number} er modtaget"
- Betaling bekræftet: "Betaling modtaget for ordre #{number}"
- Afsendt: "Din ordre #{number} er afsendt" (med tracking)

---

## 7) AI Integration

### New components for the AI toolkit

Register in `components` table:
```sql
INSERT INTO components (slug, name_da, category, tier, is_active) VALUES
  ('product-grid', 'Produktgitter', 'content', 2, 1),
  ('shop-hero', 'Shop Hero', 'opener', 2, 1);
```

Create component docs (`.md` files) so the AI knows the props schema.

### AI can generate shop pages

When admin prompts "Lav en butikside med vores produkter":
1. `shop-hero` for the landing section
2. `product-grid` to display products (fetches by category client-side)
3. Standard components (`features-grid`, `cta-section`) for supporting content
4. `search_pexels` for lifestyle/ambient images

### Product images via Pexels

The existing `POST /media/pexels/search` and `/media/pexels/download` endpoints can be used to find product images during admin product creation.

---

## 8) Order & Email Notifications

### `services/shop-email.cjs`

Reuses existing Resend/Nodemailer from `services/email.js`.

**Templates:**
1. **Order confirmation** — sent on order creation (items, totals, address)
2. **Payment confirmed** — sent on Quickpay callback (estimated delivery)
3. **Shipped** — sent when admin marks shipped (tracking link)
4. **Refunded** — sent on refund (amount, reason)

### Admin notifications
- New paid order alert to `shop_email`
- Low stock alert when product hits `low_stock_threshold`

---

## 9) Security

- **No card data on our server** — Quickpay handles all card input
- **HMAC-SHA256 webhook verification** on every callback
- **Server-side stock validation** — never trust client quantities
- **Server-side price recalculation** — ignore client-sent prices
- **Rate limiting** on order creation
- **Crypto-random order tokens** (64-char hex, not sequential)
- **All admin endpoints** behind `requireAuth`
- **Audit logging** to `security_logs` for all order events

---

## 10) Implementation Tickets

### Ticket 1 — Database schema + shop settings
- `schema_shop.sql` with all 11 tables
- Run migration
- Seed shipping methods + shop settings

### Ticket 2 — Quickpay service
- `services/quickpay.cjs` — API client, payment creation, checksum
- `.env.example` updates
- Test mode integration

### Ticket 3 — Product catalog API
- `routes/shop-admin.cjs` — Product + variant + category CRUD
- `routes/shop-public.cjs` — Public listing + detail
- Product images linked to existing `media` table

### Ticket 4 — Cart validation + order creation
- Cart validation (stock + price checks)
- Shipping + discount endpoints
- Order creation → Quickpay payment link
- Quickpay callback handler

### Ticket 5 — Order management API
- Admin order listing (filters, search, pagination)
- Status updates (ship, cancel, refund)
- Tracking, event history

### Ticket 6 — Email notifications
- `services/shop-email.cjs` — Danish templates
- Order confirmation, payment, shipped, refunded

### Ticket 7 — Frontend: Product components
- `ProductCard`, `ProductGrid`, `ProductDetail`
- `ShopHero`, `PriceDisplay`
- Component docs for AI

### Ticket 8 — Frontend: Shop pages
- Shop index, category, product detail
- `getStaticPaths()` from API
- Client-side stock checking

### Ticket 9 — Frontend: Cart + checkout
- `cart.js` localStorage module
- `CartDrawer` + `CartIcon` (Header integration)
- Cart page, checkout page, Quickpay redirect, confirmation

### Ticket 10 — Admin: Shop pages
- `/admin/shop/products.astro`
- `/admin/shop/orders.astro`
- `/admin/shop/settings.astro`

### Ticket 11 — AI component registration
- Register `product-grid` and `shop-hero` in DB
- Component docs
- Test AI generation with shop components

---

## 11) Verification

### End-to-end test flow
1. Create product with variants in admin
2. Browse shop, add items to cart
3. Checkout → fill address → select shipping
4. Redirect to Quickpay (test mode) → pay
5. Verify order confirmation page
6. Admin sees paid order → marks shipped → customer gets email
7. AI generates shop landing page with `product-grid`

### Deployment checks
- All new files are `.cjs`
- `touch tmp/restart.txt` restarts API
- Static shop pages build in GitHub Actions
- Quickpay callback URL accessible externally

---

## 12) Files Overview

### New files (26)
```
api/src/schema_shop.sql
api/src/services/quickpay.cjs
api/src/services/shop-email.cjs
api/src/routes/shop-public.cjs
api/src/routes/shop-admin.cjs
api/src/routes/shop-quickpay.cjs
src/components/ProductCard.astro
src/components/ProductGrid.astro
src/components/ProductDetail.astro
src/components/CartDrawer.astro
src/components/CartIcon.astro
src/components/ShopHero.astro
src/components/PriceDisplay.astro
src/scripts/cart.js
src/pages/shop/index.astro
src/pages/shop/[category].astro
src/pages/shop/produkt/[slug].astro
src/pages/shop/kurv.astro
src/pages/shop/checkout.astro
src/pages/shop/ordre/[token].astro
src/pages/admin/shop/products.astro
src/pages/admin/shop/orders.astro
src/pages/admin/shop/settings.astro
api/src/component-docs/product-grid.md
api/src/component-docs/shop-hero.md
```

### Modified files (4)
```
api/server.cjs             ← Mount shop routes
api/.env.example           ← Add Quickpay env vars
src/layouts/Layout.astro   ← Add CartIcon to header
src/components/Header.astro ← Add cart badge + shop nav link
```

-- ============================================================
-- Shop module schema — Flatpay/Frisbii integration
-- Run after main schema.sql
-- ============================================================

-- 1. Product categories (supports nesting via parent_id)
CREATE TABLE IF NOT EXISTS product_categories (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id     INT UNSIGNED NULL REFERENCES product_categories(id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  description   TEXT,
  image_url     VARCHAR(500),
  sort_order    SMALLINT UNSIGNED DEFAULT 0,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent (parent_id),
  INDEX idx_slug (slug),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id     INT UNSIGNED NULL REFERENCES product_categories(id) ON DELETE SET NULL,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,
  description     TEXT,
  short_desc      VARCHAR(500),
  -- Prices stored in øre (integer). 9995 = 99,95 DKK
  price_ore       INT UNSIGNED NOT NULL DEFAULT 0,
  compare_ore     INT UNSIGNED NULL,          -- "was" price for strikethrough
  vat_rate        DECIMAL(5,4) NOT NULL DEFAULT 0.2500,  -- 25% moms
  sku             VARCHAR(100),
  stock           INT NOT NULL DEFAULT 0,     -- NULL = unlimited
  track_stock     TINYINT(1) DEFAULT 1,
  is_active       TINYINT(1) DEFAULT 1,
  is_featured     TINYINT(1) DEFAULT 0,
  weight_g        SMALLINT UNSIGNED NULL,
  meta_title      VARCHAR(200),
  meta_desc       VARCHAR(300),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_category (category_id),
  INDEX idx_active_featured (is_active, is_featured),
  FULLTEXT idx_ft_search (name, short_desc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Product variants (size, colour, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,   -- e.g. "Stor / Rød"
  sku         VARCHAR(100),
  price_ore   INT UNSIGNED NULL,       -- NULL = inherit from product
  stock       INT NOT NULL DEFAULT 0,
  sort_order  SMALLINT UNSIGNED DEFAULT 0,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product images
CREATE TABLE IF NOT EXISTS product_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  alt         VARCHAR(300),
  sort_order  SMALLINT UNSIGNED DEFAULT 0,
  is_primary  TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_primary (product_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(200) NOT NULL UNIQUE,
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  phone       VARCHAR(30),
  address1    VARCHAR(200),
  address2    VARCHAR(200),
  city        VARCHAR(100),
  zip         VARCHAR(20),
  country     CHAR(2) DEFAULT 'DK',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Shipping methods
CREATE TABLE IF NOT EXISTS shipping_methods (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,   -- e.g. "PostNord 1-3 dage"
  carrier     VARCHAR(50),             -- postnord, gls, dao, pickup
  price_ore   INT UNSIGNED NOT NULL DEFAULT 0,
  free_above_ore INT UNSIGNED NULL,    -- free shipping threshold (øre)
  est_days_min TINYINT UNSIGNED DEFAULT 1,
  est_days_max TINYINT UNSIGNED DEFAULT 5,
  is_active   TINYINT(1) DEFAULT 1,
  sort_order  SMALLINT UNSIGNED DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE,
  type            ENUM('percent','fixed','free_shipping') NOT NULL DEFAULT 'percent',
  value           DECIMAL(10,2) NOT NULL DEFAULT 0,  -- percent or øre value
  min_order_ore   INT UNSIGNED DEFAULT 0,
  max_uses        INT UNSIGNED NULL,     -- NULL = unlimited
  uses_count      INT UNSIGNED DEFAULT 0,
  valid_from      DATETIME NULL,
  valid_to        DATETIME NULL,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Orders
CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number        VARCHAR(20) NOT NULL UNIQUE,  -- LPH-10001
  -- 64-char hex token for public order page (crypto-random)
  token               CHAR(64) NOT NULL UNIQUE,
  customer_id         INT UNSIGNED NULL REFERENCES customers(id) ON DELETE SET NULL,
  status              ENUM('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')
                      NOT NULL DEFAULT 'pending_payment',
  -- Prices in øre
  subtotal_ore        INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_ore        INT UNSIGNED NOT NULL DEFAULT 0,
  discount_ore        INT UNSIGNED NOT NULL DEFAULT 0,
  total_ore           INT UNSIGNED NOT NULL DEFAULT 0,
  vat_ore             INT UNSIGNED NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'DKK',
  -- Shipping
  shipping_method_id  INT UNSIGNED NULL REFERENCES shipping_methods(id) ON DELETE SET NULL,
  shipping_name       VARCHAR(100),
  -- Discount
  discount_code_id    INT UNSIGNED NULL REFERENCES discount_codes(id) ON DELETE SET NULL,
  discount_code       VARCHAR(50),
  -- Delivery address (snapshot at order time)
  ship_first_name     VARCHAR(100),
  ship_last_name      VARCHAR(100),
  ship_email          VARCHAR(200),
  ship_phone          VARCHAR(30),
  ship_address1       VARCHAR(200),
  ship_address2       VARCHAR(200),
  ship_city           VARCHAR(100),
  ship_zip            VARCHAR(20),
  ship_country        CHAR(2) DEFAULT 'DK',
  -- Flatpay/Frisbii
  flatpay_session_id  VARCHAR(100),
  flatpay_charge_id   VARCHAR(100),
  -- Tracking
  tracking_number     VARCHAR(100),
  tracking_carrier    VARCHAR(50),
  notes               TEXT,
  -- Metadata
  paid_at             DATETIME NULL,
  shipped_at          DATETIME NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_status (status),
  INDEX idx_customer (customer_id),
  INDEX idx_created (created_at),
  INDEX idx_flatpay_session (flatpay_session_id),
  INDEX idx_flatpay_charge (flatpay_charge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Order items (snapshot of product name/price at order time)
CREATE TABLE IF NOT EXISTS order_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      INT UNSIGNED NULL REFERENCES products(id) ON DELETE SET NULL,
  variant_id      INT UNSIGNED NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name    VARCHAR(200) NOT NULL,
  variant_name    VARCHAR(200),
  sku             VARCHAR(100),
  quantity        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price_ore  INT UNSIGNED NOT NULL DEFAULT 0,
  total_price_ore INT UNSIGNED NOT NULL DEFAULT 0,
  image_url       VARCHAR(500),
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Order events (status change history + webhook log)
CREATE TABLE IF NOT EXISTS order_events (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type  VARCHAR(60) NOT NULL,  -- status_changed, webhook_received, email_sent, note_added
  old_status  VARCHAR(30),
  new_status  VARCHAR(30),
  message     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Shop settings (single-row config)
CREATE TABLE IF NOT EXISTS shop_settings (
  id                              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_name                       VARCHAR(200) DEFAULT 'Lavprishjemmeside Shop',
  shop_email                      VARCHAR(200),
  cvr_number                      VARCHAR(20),
  -- Flatpay / Frisbii credentials (AES-256 encrypted at rest)
  flatpay_api_key_encrypted       VARCHAR(500),
  flatpay_webhook_secret_encrypted VARCHAR(500),
  flatpay_test_mode               TINYINT(1) DEFAULT 1,
  -- Order number sequence
  order_sequence_start            INT UNSIGNED DEFAULT 10001,
  -- Email notifications
  notify_admin_email              VARCHAR(200),
  send_customer_confirmation      TINYINT(1) DEFAULT 1,
  send_shipping_notification      TINYINT(1) DEFAULT 1,
  -- Processed webhook IDs (JSON array, replay protection)
  processed_webhook_ids           JSON,
  created_at                      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed data
-- ============================================================

-- Default shipping methods
INSERT IGNORE INTO shipping_methods (name, carrier, price_ore, free_above_ore, est_days_min, est_days_max, is_active, sort_order)
VALUES
  ('PostNord Pakke 1-3 dage',       'postnord', 4900, 59900, 1, 3, 1, 1),
  ('GLS Pakke 1-2 dage',            'gls',      4500, 49900, 1, 2, 1, 2),
  ('DAO Pakke 2-4 dage',            'dao',      3900, 49900, 2, 4, 1, 3),
  ('Afhentning (Fredericia)',        'pickup',   0,    NULL,  0, 1, 1, 4);

-- Default shop settings row
INSERT IGNORE INTO shop_settings (id, shop_name, shop_email, flatpay_test_mode)
VALUES (1, 'Lavprishjemmeside Shop', 'info@lavprishjemmeside.dk', 1);

'use strict';

/**
 * Public shop endpoints — no auth required.
 * Mounted at /shop in server.cjs
 */

const express = require('express');
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');
const pool = require('../db');
const { createCheckoutSession } = require('../services/flatpay.cjs');

const router = express.Router();

const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'For mange forsøg. Prøv igen om 15 minutter.' }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate next order number: LPH-10001 */
async function nextOrderNumber(conn) {
  const [[settings]] = await conn.query('SELECT order_sequence_start FROM shop_settings WHERE id = 1');
  const start = settings?.order_sequence_start || 10001;
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM orders');
  return `LPH-${start + Number(cnt)}`;
}

/** Safe integer øre parser (rejects negative / non-int) */
function parseOre(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─── GET /shop/products ──────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const { category, featured, search, page = 1, limit = 24 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 24);
    const pageSize = Math.min(100, parseInt(limit) || 24);

    let where = ['p.is_active = 1'];
    const params = [];

    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (featured === '1' || featured === 'true') {
      where.push('p.is_featured = 1');
    }
    if (search) {
      where.push('MATCH(p.name, p.short_desc) AGAINST(? IN BOOLEAN MODE)');
      params.push(search + '*');
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [products] = await pool.query(`
      SELECT p.id, p.name, p.slug, p.short_desc, p.price_ore, p.compare_ore,
             p.is_featured, p.stock, p.track_stock,
             c.name AS category_name, c.slug AS category_slug,
             (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      ${whereClause}
    `, params);

    res.json({ products, total, page: parseInt(page), limit: pageSize });
  } catch (err) {
    console.error('GET /shop/products:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente produkter' });
  }
});

// ─── GET /shop/products/:slug ────────────────────────────────────────────────
router.get('/products/:slug', async (req, res) => {
  try {
    const [[product]] = await pool.query(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `, [req.params.slug]);

    if (!product) return res.status(404).json({ error: 'Produkt ikke fundet' });

    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order',
      [product.id]
    );
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );

    res.json({ ...product, variants, images });
  } catch (err) {
    console.error('GET /shop/products/:slug:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente produkt' });
  }
});

// ─── GET /shop/categories ────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM product_categories WHERE is_active = 1 ORDER BY sort_order, name'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /shop/categories:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

// ─── POST /shop/cart/validate ────────────────────────────────────────────────
router.post('/cart/validate', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Ingen varer i kurven' });
    }

    const results = [];
    for (const item of items) {
      const pid = parseInt(item.product_id);
      const vid = item.variant_id ? parseInt(item.variant_id) : null;
      const qty = parseInt(item.quantity) || 1;

      const [[product]] = await pool.query(
        'SELECT id, name, price_ore, stock, track_stock FROM products WHERE id = ? AND is_active = 1',
        [pid]
      );
      if (!product) {
        results.push({ product_id: pid, ok: false, error: 'Produkt ikke tilgængeligt' });
        continue;
      }

      let priceOre = product.price_ore;
      let stock = product.stock;

      if (vid) {
        const [[variant]] = await pool.query(
          'SELECT id, price_ore, stock FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1',
          [vid, pid]
        );
        if (!variant) {
          results.push({ product_id: pid, variant_id: vid, ok: false, error: 'Variant ikke tilgængelig' });
          continue;
        }
        if (variant.price_ore !== null) priceOre = variant.price_ore;
        stock = variant.stock;
      }

      const stockOk = !product.track_stock || stock >= qty;
      results.push({
        product_id: pid,
        variant_id: vid,
        ok: stockOk,
        price_ore: priceOre,
        stock_available: stock,
        error: stockOk ? null : `Kun ${stock} på lager`,
      });
    }

    res.json({ items: results });
  } catch (err) {
    console.error('POST /shop/cart/validate:', err.message);
    res.status(500).json({ error: 'Validering fejlede' });
  }
});

// ─── GET /shop/shipping/methods ──────────────────────────────────────────────
router.get('/shipping/methods', async (req, res) => {
  try {
    const [methods] = await pool.query(
      'SELECT * FROM shipping_methods WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json(methods);
  } catch (err) {
    console.error('GET /shop/shipping/methods:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente forsendelsesmetoder' });
  }
});

// ─── POST /shop/discount/validate ───────────────────────────────────────────
router.post('/discount/validate', async (req, res) => {
  try {
    const { code, subtotal_ore } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode mangler' });

    const [[dc]] = await pool.query(`
      SELECT * FROM discount_codes
      WHERE code = ? AND is_active = 1
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to >= NOW())
        AND (max_uses IS NULL OR uses_count < max_uses)
    `, [code.trim().toUpperCase()]);

    if (!dc) return res.status(404).json({ error: 'Ugyldig eller udløbet rabatkode' });

    const sub = parseInt(subtotal_ore) || 0;
    if (dc.min_order_ore > 0 && sub < dc.min_order_ore) {
      return res.status(400).json({ error: `Rabatkoden kræver minimum ${(dc.min_order_ore / 100).toFixed(2).replace('.', ',')} kr.` });
    }

    let discountOre = 0;
    if (dc.type === 'percent') {
      discountOre = Math.round(sub * (dc.value / 100));
    } else if (dc.type === 'fixed') {
      discountOre = Math.min(Math.round(dc.value * 100), sub);
    }

    res.json({
      ok: true,
      code: dc.code,
      type: dc.type,
      value: dc.value,
      discount_ore: discountOre,
    });
  } catch (err) {
    console.error('POST /shop/discount/validate:', err.message);
    res.status(500).json({ error: 'Validering fejlede' });
  }
});

// ─── POST /shop/orders ───────────────────────────────────────────────────────
router.post('/orders', orderRateLimiter, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { items, customer, shipping_method_id, discount_code } = req.body;

    // Basic input validation
    if (!Array.isArray(items) || items.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Ingen varer i kurven' });
    }
    if (!customer?.email || !customer?.first_name || !customer?.last_name) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Kundeoplysninger mangler' });
    }
    if (!shipping_method_id) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Vælg en forsendelsesmetode' });
    }

    // Fetch shipping method
    const [[shipping]] = await conn.query(
      'SELECT * FROM shipping_methods WHERE id = ? AND is_active = 1',
      [parseInt(shipping_method_id)]
    );
    if (!shipping) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Ugyldig forsendelsesmetode' });
    }

    // Server-side price + stock validation for each item
    let subtotalOre = 0;
    const validatedItems = [];

    for (const item of items) {
      const pid = parseInt(item.product_id);
      const vid = item.variant_id ? parseInt(item.variant_id) : null;
      const qty = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));

      const [[product]] = await conn.query(
        'SELECT id, name, slug, price_ore, stock, track_stock FROM products WHERE id = ? AND is_active = 1',
        [pid]
      );
      if (!product) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: `Produkt id ${pid} er ikke tilgængeligt` });
      }

      let priceOre = product.price_ore;
      let variantName = null;
      let variantSku = null;
      let stockToCheck = product.stock;
      let trackStock = product.track_stock;

      if (vid) {
        const [[variant]] = await conn.query(
          'SELECT id, name, sku, price_ore, stock FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1',
          [vid, pid]
        );
        if (!variant) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ error: `Variant id ${vid} er ikke tilgængelig` });
        }
        if (variant.price_ore !== null) priceOre = variant.price_ore;
        variantName = variant.name;
        variantSku = variant.sku;
        stockToCheck = variant.stock;
      }

      if (trackStock && stockToCheck < qty) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: `Utilstrækkelig lager for "${product.name}"` });
      }

      // Fetch primary image
      const [[img]] = await conn.query(
        'SELECT url FROM product_images WHERE product_id = ? AND is_primary = 1 LIMIT 1',
        [pid]
      );

      const totalLine = priceOre * qty;
      subtotalOre += totalLine;

      validatedItems.push({
        product_id: pid,
        variant_id: vid,
        product_name: product.name,
        variant_name: variantName,
        sku: variantSku || null,
        quantity: qty,
        unit_price_ore: priceOre,
        total_price_ore: totalLine,
        image_url: img?.url || null,
      });
    }

    // Discount
    let discountOre = 0;
    let discountCodeId = null;
    let discountCodeStr = null;

    if (discount_code) {
      const [[dc]] = await conn.query(`
        SELECT * FROM discount_codes
        WHERE code = ? AND is_active = 1
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_to IS NULL OR valid_to >= NOW())
          AND (max_uses IS NULL OR uses_count < max_uses)
      `, [discount_code.trim().toUpperCase()]);

      if (dc) {
        if (dc.type === 'percent') {
          discountOre = Math.round(subtotalOre * (dc.value / 100));
        } else if (dc.type === 'fixed') {
          discountOre = Math.min(Math.round(dc.value * 100), subtotalOre);
        } else if (dc.type === 'free_shipping') {
          discountOre = shipping.price_ore;
        }
        discountCodeId = dc.id;
        discountCodeStr = dc.code;
      }
    }

    // Shipping price (free if above threshold)
    let shippingOre = shipping.price_ore;
    if (shipping.free_above_ore !== null && subtotalOre >= shipping.free_above_ore) {
      shippingOre = 0;
    }
    if (discountCodeStr && discountOre === shipping.price_ore) {
      shippingOre = 0;
      discountOre = shipping.price_ore;
    }

    const vatRate = 0.25;
    const totalOre = Math.max(0, subtotalOre + shippingOre - discountOre);
    const vatOre = Math.round(totalOre - totalOre / (1 + vatRate));

    // Upsert customer
    const emailNorm = customer.email.trim().toLowerCase();
    await conn.query(`
      INSERT INTO customers (email, first_name, last_name, phone, address1, address2, city, zip, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name), last_name = VALUES(last_name),
        phone = VALUES(phone), address1 = VALUES(address1),
        address2 = VALUES(address2), city = VALUES(city),
        zip = VALUES(zip), country = VALUES(country),
        updated_at = NOW()
    `, [
      emailNorm,
      customer.first_name?.trim() || '',
      customer.last_name?.trim() || '',
      customer.phone?.trim() || null,
      customer.address1?.trim() || '',
      customer.address2?.trim() || null,
      customer.city?.trim() || '',
      customer.zip?.trim() || '',
      customer.country?.trim() || 'DK',
    ]);

    const [[cust]] = await conn.query('SELECT id FROM customers WHERE email = ?', [emailNorm]);
    const customerId = cust.id;

    // Create order
    const orderNumber = await nextOrderNumber(conn);
    const token = crypto.randomBytes(32).toString('hex');

    const [orderResult] = await conn.query(`
      INSERT INTO orders (
        order_number, token, customer_id, status,
        subtotal_ore, shipping_ore, discount_ore, total_ore, vat_ore,
        shipping_method_id, shipping_name,
        discount_code_id, discount_code,
        ship_first_name, ship_last_name, ship_email, ship_phone,
        ship_address1, ship_address2, ship_city, ship_zip, ship_country
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      orderNumber, token, customerId, 'pending_payment',
      subtotalOre, shippingOre, discountOre, totalOre, vatOre,
      shipping.id, shipping.name,
      discountCodeId, discountCodeStr,
      customer.first_name?.trim(), customer.last_name?.trim(), emailNorm,
      customer.phone?.trim() || null,
      customer.address1?.trim(), customer.address2?.trim() || null,
      customer.city?.trim(), customer.zip?.trim(), customer.country?.trim() || 'DK',
    ]);

    const orderId = orderResult.insertId;

    // Insert order items
    for (const it of validatedItems) {
      await conn.query(`
        INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, sku, quantity, unit_price_ore, total_price_ore, image_url)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `, [orderId, it.product_id, it.variant_id, it.product_name, it.variant_name, it.sku, it.quantity, it.unit_price_ore, it.total_price_ore, it.image_url]);
    }

    // Create Frisbii checkout session
    const acceptBaseUrl = process.env.FLATPAY_ACCEPT_URL || 'https://lavprishjemmeside.dk/shop/ordre';
    const cancelUrl = process.env.FLATPAY_CANCEL_URL || 'https://lavprishjemmeside.dk/shop/checkout?cancelled=1';

    const { sessionId } = await createCheckoutSession({
      orderHandle: orderNumber,
      amountOre: totalOre,
      orderText: `Ordre ${orderNumber}`,
      customer: {
        handle: emailNorm,
        first_name: customer.first_name?.trim() || '',
        last_name: customer.last_name?.trim() || '',
        email: emailNorm,
      },
      acceptUrl: `${acceptBaseUrl}/${token}`,
      cancelUrl,
    });

    // Save session ID to order
    await conn.query('UPDATE orders SET flatpay_session_id = ? WHERE id = ?', [sessionId, orderId]);

    // Log order event
    await conn.query(
      'INSERT INTO order_events (order_id, event_type, new_status, message) VALUES (?,?,?,?)',
      [orderId, 'status_changed', 'pending_payment', `Ordre oprettet, Frisbii session ${sessionId}`]
    );

    // Increment discount code usage
    if (discountCodeId) {
      await conn.query('UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = ?', [discountCodeId]);
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      order_token: token,
      order_number: orderNumber,
      frisbii_session_id: sessionId,
      total_ore: totalOre,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /shop/orders:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette ordre. Prøv igen.' });
  }
});

// ─── GET /shop/orders/:token ─────────────────────────────────────────────────
router.get('/orders/:token', async (req, res) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) {
      return res.status(404).json({ error: 'Ordre ikke fundet' });
    }

    const [[order]] = await pool.query(`
      SELECT o.*, sm.name AS shipping_method_name
      FROM orders o
      LEFT JOIN shipping_methods sm ON o.shipping_method_id = sm.id
      WHERE o.token = ?
    `, [req.params.token]);

    if (!order) return res.status(404).json({ error: 'Ordre ikke fundet' });

    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );

    // Strip internal IDs from public response
    const { flatpay_session_id, flatpay_charge_id, customer_id, ...publicOrder } = order;

    res.json({ ...publicOrder, items });
  } catch (err) {
    console.error('GET /shop/orders/:token:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente ordre' });
  }
});

module.exports = router;

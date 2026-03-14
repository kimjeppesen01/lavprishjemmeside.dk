'use strict';

/**
 * Admin shop endpoints — JWT required.
 * Mounted at /shop/admin in server.cjs.
 */

const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendShippingNotification } = require('../services/shop-email.cjs');

const router = express.Router();

// All admin shop routes require authentication
router.use(requireAuth);

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

// GET /shop/admin/products
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, active } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 50);
    const pageSize = Math.min(100, parseInt(limit) || 50);

    let where = [];
    const params = [];

    if (search) {
      where.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where.push('p.category_id = ?');
      params.push(parseInt(category));
    }
    if (active !== undefined) {
      where.push('p.is_active = ?');
      params.push(active === '1' || active === 'true' ? 1 : 0);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [products] = await pool.query(`
      SELECT p.*, c.name AS category_name,
             (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
             (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
      params
    );

    res.json({ products, total, page: parseInt(page), limit: pageSize });
  } catch (err) {
    console.error('GET /shop/admin/products:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente produkter' });
  }
});

// POST /shop/admin/products
router.post('/products', async (req, res) => {
  try {
    const {
      category_id, name, slug, description, short_desc,
      price_ore, compare_ore, sku, stock, track_stock,
      is_active, is_featured, weight_g, meta_title, meta_desc, vat_rate,
    } = req.body;

    if (!name || !slug) return res.status(400).json({ error: 'Navn og slug er påkrævet' });
    if (price_ore == null || isNaN(parseInt(price_ore))) return res.status(400).json({ error: 'Pris er påkrævet' });

    const [result] = await pool.query(`
      INSERT INTO products
        (category_id, name, slug, description, short_desc, price_ore, compare_ore, vat_rate, sku,
         stock, track_stock, is_active, is_featured, weight_g, meta_title, meta_desc)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      category_id || null, name, slug, description || null, short_desc || null,
      parseInt(price_ore), compare_ore ? parseInt(compare_ore) : null,
      vat_rate ? parseFloat(vat_rate) : 0.25,
      sku || null, parseInt(stock) || 0,
      track_stock !== false && track_stock !== '0' ? 1 : 0,
      is_active !== false && is_active !== '0' ? 1 : 0,
      is_featured ? 1 : 0, weight_g ? parseInt(weight_g) : null,
      meta_title || null, meta_desc || null,
    ]);

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug er allerede i brug' });
    console.error('POST /shop/admin/products:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette produkt' });
  }
});

// PUT /shop/admin/products/:id
router.put('/products/:id', async (req, res) => {
  try {
    const {
      category_id, name, slug, description, short_desc,
      price_ore, compare_ore, sku, stock, track_stock,
      is_active, is_featured, weight_g, meta_title, meta_desc, vat_rate,
    } = req.body;

    await pool.query(`
      UPDATE products SET
        category_id=?, name=?, slug=?, description=?, short_desc=?,
        price_ore=?, compare_ore=?, vat_rate=?, sku=?,
        stock=?, track_stock=?, is_active=?, is_featured=?,
        weight_g=?, meta_title=?, meta_desc=?, updated_at=NOW()
      WHERE id=?
    `, [
      category_id || null, name, slug, description || null, short_desc || null,
      parseInt(price_ore), compare_ore ? parseInt(compare_ore) : null,
      vat_rate ? parseFloat(vat_rate) : 0.25,
      sku || null, parseInt(stock) || 0,
      track_stock !== false && track_stock !== '0' ? 1 : 0,
      is_active !== false && is_active !== '0' ? 1 : 0,
      is_featured ? 1 : 0, weight_g ? parseInt(weight_g) : null,
      meta_title || null, meta_desc || null,
      parseInt(req.params.id),
    ]);

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug er allerede i brug' });
    console.error('PUT /shop/admin/products/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere produkt' });
  }
});

// DELETE /shop/admin/products/:id
router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/products/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette produkt' });
  }
});

// GET /shop/admin/products/:id — full product with variants + images
router.get('/products/:id', async (req, res) => {
  try {
    const [[product]] = await pool.query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?',
      [parseInt(req.params.id)]
    );
    if (!product) return res.status(404).json({ error: 'Produkt ikke fundet' });

    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );

    res.json({ ...product, variants, images });
  } catch (err) {
    console.error('GET /shop/admin/products/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente produkt' });
  }
});

// ─── VARIANTS ────────────────────────────────────────────────────────────────

// POST /shop/admin/products/:id/variants
router.post('/products/:id/variants', async (req, res) => {
  try {
    const { name, sku, price_ore, stock, sort_order, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'Navn er påkrævet' });

    const [result] = await pool.query(`
      INSERT INTO product_variants (product_id, name, sku, price_ore, stock, sort_order, is_active)
      VALUES (?,?,?,?,?,?,?)
    `, [
      parseInt(req.params.id), name, sku || null,
      price_ore != null ? parseInt(price_ore) : null,
      parseInt(stock) || 0,
      parseInt(sort_order) || 0,
      is_active !== false && is_active !== '0' ? 1 : 0,
    ]);

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('POST /shop/admin/products/:id/variants:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette variant' });
  }
});

// PUT /shop/admin/variants/:id
router.put('/variants/:id', async (req, res) => {
  try {
    const { name, sku, price_ore, stock, sort_order, is_active } = req.body;
    await pool.query(`
      UPDATE product_variants SET name=?, sku=?, price_ore=?, stock=?, sort_order=?, is_active=?
      WHERE id=?
    `, [
      name, sku || null,
      price_ore != null ? parseInt(price_ore) : null,
      parseInt(stock) || 0,
      parseInt(sort_order) || 0,
      is_active !== false && is_active !== '0' ? 1 : 0,
      parseInt(req.params.id),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /shop/admin/variants/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere variant' });
  }
});

// DELETE /shop/admin/variants/:id
router.delete('/variants/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM product_variants WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/variants/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette variant' });
  }
});

// POST /shop/admin/products/:id/images
router.post('/products/:id/images', async (req, res) => {
  try {
    const { url, alt, sort_order, is_primary } = req.body;
    if (!url) return res.status(400).json({ error: 'URL er påkrævet' });

    const pid = parseInt(req.params.id);
    if (is_primary) {
      await pool.query('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', [pid]);
    }
    const [result] = await pool.query(
      'INSERT INTO product_images (product_id, url, alt, sort_order, is_primary) VALUES (?,?,?,?,?)',
      [pid, url, alt || null, parseInt(sort_order) || 0, is_primary ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('POST /shop/admin/products/:id/images:', err.message);
    res.status(500).json({ error: 'Kunne ikke tilføje billede' });
  }
});

// DELETE /shop/admin/images/:id
router.delete('/images/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM product_images WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/images/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette billede' });
  }
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY sort_order, name');
    res.json(rows);
  } catch (err) {
    console.error('GET /shop/admin/categories:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente kategorier' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { parent_id, name, slug, description, image_url, sort_order, is_active } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Navn og slug er påkrævet' });

    const [result] = await pool.query(
      'INSERT INTO product_categories (parent_id, name, slug, description, image_url, sort_order, is_active) VALUES (?,?,?,?,?,?,?)',
      [parent_id || null, name, slug, description || null, image_url || null, parseInt(sort_order) || 0, is_active !== false ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug er allerede i brug' });
    console.error('POST /shop/admin/categories:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette kategori' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { parent_id, name, slug, description, image_url, sort_order, is_active } = req.body;
    await pool.query(
      'UPDATE product_categories SET parent_id=?, name=?, slug=?, description=?, image_url=?, sort_order=?, is_active=?, updated_at=NOW() WHERE id=?',
      [parent_id || null, name, slug, description || null, image_url || null, parseInt(sort_order) || 0, is_active !== false ? 1 : 0, parseInt(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slug er allerede i brug' });
    console.error('PUT /shop/admin/categories/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere kategori' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM product_categories WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/categories/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette kategori' });
  }
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 50);
    const pageSize = Math.min(100, parseInt(limit) || 50);

    let where = [];
    const params = [];

    if (status) {
      where.push('o.status = ?');
      params.push(status);
    }
    if (search) {
      where.push('(o.order_number LIKE ? OR o.ship_email LIKE ? OR o.ship_last_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [orders] = await pool.query(`
      SELECT o.id, o.order_number, o.token, o.status, o.total_ore, o.currency,
             o.ship_first_name, o.ship_last_name, o.ship_email,
             o.shipping_name, o.paid_at, o.shipped_at, o.created_at
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, pageSize, offset]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o ${whereClause}`,
      params
    );

    res.json({ orders, total, page: parseInt(page), limit: pageSize });
  } catch (err) {
    console.error('GET /shop/admin/orders:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente ordrer' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const [[order]] = await pool.query(
      'SELECT o.*, sm.name AS shipping_method_name FROM orders o LEFT JOIN shipping_methods sm ON o.shipping_method_id = sm.id WHERE o.id = ?',
      [parseInt(req.params.id)]
    );
    if (!order) return res.status(404).json({ error: 'Ordre ikke fundet' });

    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const [events] = await pool.query('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at DESC', [order.id]);

    res.json({ ...order, items, events });
  } catch (err) {
    console.error('GET /shop/admin/orders/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente ordre' });
  }
});

// POST /shop/admin/orders/:id/status
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Ugyldig status' });
    }

    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Ordre ikke fundet' });

    const updates = { status, updated_at: new Date() };
    if (status === 'shipped' && !order.shipped_at) updates.shipped_at = new Date();
    if (status === 'paid' && !order.paid_at) updates.paid_at = new Date();

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await pool.query(
      `UPDATE orders SET ${setClauses} WHERE id = ?`,
      [...Object.values(updates), order.id]
    );

    await pool.query(
      'INSERT INTO order_events (order_id, event_type, old_status, new_status, message) VALUES (?,?,?,?,?)',
      [order.id, 'status_changed', order.status, status, note || null]
    );

    // Send shipping email
    if (status === 'shipped' && order.ship_email) {
      const siteUrl = 'https://lavprishjemmeside.dk';
      sendShippingNotification({ order: { ...order, status: 'shipped', ...updates }, siteUrl })
        .catch((e) => console.error('Shipping notification email failed:', e.message));

      await pool.query(
        'INSERT INTO order_events (order_id, event_type, message) VALUES (?,?,?)',
        [order.id, 'email_sent', 'Forsendelsesnotifikation sendt til kunde']
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /shop/admin/orders/:id/status:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere status' });
  }
});

// POST /shop/admin/orders/:id/tracking
router.post('/orders/:id/tracking', async (req, res) => {
  try {
    const { tracking_number, tracking_carrier } = req.body;
    await pool.query(
      'UPDATE orders SET tracking_number = ?, tracking_carrier = ?, updated_at = NOW() WHERE id = ?',
      [tracking_number || null, tracking_carrier || null, parseInt(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /shop/admin/orders/:id/tracking:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere sporings-id' });
  }
});

// ─── SHIPPING METHODS ─────────────────────────────────────────────────────────

router.get('/shipping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM shipping_methods ORDER BY sort_order');
    res.json(rows);
  } catch (err) {
    console.error('GET /shop/admin/shipping:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente forsendelsesmetoder' });
  }
});

router.post('/shipping', async (req, res) => {
  try {
    const { name, carrier, price_ore, free_above_ore, est_days_min, est_days_max, is_active, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Navn er påkrævet' });
    const [result] = await pool.query(
      'INSERT INTO shipping_methods (name, carrier, price_ore, free_above_ore, est_days_min, est_days_max, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [name, carrier || null, parseInt(price_ore) || 0, free_above_ore ? parseInt(free_above_ore) : null,
       parseInt(est_days_min) || 1, parseInt(est_days_max) || 5, is_active !== false ? 1 : 0, parseInt(sort_order) || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('POST /shop/admin/shipping:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette forsendelsesmetode' });
  }
});

router.put('/shipping/:id', async (req, res) => {
  try {
    const { name, carrier, price_ore, free_above_ore, est_days_min, est_days_max, is_active, sort_order } = req.body;
    await pool.query(
      'UPDATE shipping_methods SET name=?, carrier=?, price_ore=?, free_above_ore=?, est_days_min=?, est_days_max=?, is_active=?, sort_order=? WHERE id=?',
      [name, carrier || null, parseInt(price_ore) || 0, free_above_ore ? parseInt(free_above_ore) : null,
       parseInt(est_days_min) || 1, parseInt(est_days_max) || 5, is_active !== false ? 1 : 0,
       parseInt(sort_order) || 0, parseInt(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /shop/admin/shipping/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere forsendelsesmetode' });
  }
});

router.delete('/shipping/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM shipping_methods WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/shipping/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette forsendelsesmetode' });
  }
});

// ─── DISCOUNT CODES ───────────────────────────────────────────────────────────

router.get('/discounts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM discount_codes ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /shop/admin/discounts:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente rabatkoder' });
  }
});

router.post('/discounts', async (req, res) => {
  try {
    const { code, type, value, min_order_ore, max_uses, valid_from, valid_to, is_active } = req.body;
    if (!code || !type || value == null) return res.status(400).json({ error: 'Kode, type og værdi er påkrævet' });

    const [result] = await pool.query(
      'INSERT INTO discount_codes (code, type, value, min_order_ore, max_uses, valid_from, valid_to, is_active) VALUES (?,?,?,?,?,?,?,?)',
      [code.trim().toUpperCase(), type, parseFloat(value), parseInt(min_order_ore) || 0,
       max_uses ? parseInt(max_uses) : null, valid_from || null, valid_to || null, is_active !== false ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Kode er allerede i brug' });
    console.error('POST /shop/admin/discounts:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette rabatkode' });
  }
});

router.put('/discounts/:id', async (req, res) => {
  try {
    const { code, type, value, min_order_ore, max_uses, valid_from, valid_to, is_active } = req.body;
    await pool.query(
      'UPDATE discount_codes SET code=?, type=?, value=?, min_order_ore=?, max_uses=?, valid_from=?, valid_to=?, is_active=? WHERE id=?',
      [code.trim().toUpperCase(), type, parseFloat(value), parseInt(min_order_ore) || 0,
       max_uses ? parseInt(max_uses) : null, valid_from || null, valid_to || null,
       is_active !== false ? 1 : 0, parseInt(req.params.id)]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Kode er allerede i brug' });
    console.error('PUT /shop/admin/discounts/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke opdatere rabatkode' });
  }
});

router.delete('/discounts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM discount_codes WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /shop/admin/discounts/:id:', err.message);
    res.status(500).json({ error: 'Kunne ikke slette rabatkode' });
  }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const [[settings]] = await pool.query('SELECT * FROM shop_settings WHERE id = 1');
    if (!settings) return res.json({});

    // Mask encrypted keys — never expose actual values to frontend
    const safe = { ...settings };
    if (safe.flatpay_api_key_encrypted) safe.flatpay_api_key_encrypted = '••••••••';
    if (safe.flatpay_webhook_secret_encrypted) safe.flatpay_webhook_secret_encrypted = '••••••••';

    res.json(safe);
  } catch (err) {
    console.error('GET /shop/admin/settings:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente indstillinger' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const {
      shop_name, shop_email, cvr_number,
      flatpay_api_key, flatpay_webhook_secret, flatpay_test_mode,
      notify_admin_email, send_customer_confirmation, send_shipping_notification,
    } = req.body;

    const updates = [];
    const params = [];

    if (shop_name !== undefined) { updates.push('shop_name = ?'); params.push(shop_name); }
    if (shop_email !== undefined) { updates.push('shop_email = ?'); params.push(shop_email); }
    if (cvr_number !== undefined) { updates.push('cvr_number = ?'); params.push(cvr_number); }
    if (flatpay_test_mode !== undefined) { updates.push('flatpay_test_mode = ?'); params.push(flatpay_test_mode ? 1 : 0); }
    if (notify_admin_email !== undefined) { updates.push('notify_admin_email = ?'); params.push(notify_admin_email); }
    if (send_customer_confirmation !== undefined) { updates.push('send_customer_confirmation = ?'); params.push(send_customer_confirmation ? 1 : 0); }
    if (send_shipping_notification !== undefined) { updates.push('send_shipping_notification = ?'); params.push(send_shipping_notification ? 1 : 0); }

    // Only update encrypted fields if new (non-masked) values provided
    if (flatpay_api_key && !flatpay_api_key.includes('•')) {
      updates.push('flatpay_api_key_encrypted = ?');
      params.push(flatpay_api_key);
    }
    if (flatpay_webhook_secret && !flatpay_webhook_secret.includes('•')) {
      updates.push('flatpay_webhook_secret_encrypted = ?');
      params.push(flatpay_webhook_secret);
    }

    if (updates.length === 0) return res.json({ ok: true });

    updates.push('updated_at = NOW()');
    await pool.query(
      `UPDATE shop_settings SET ${updates.join(', ')} WHERE id = 1`,
      params
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /shop/admin/settings:', err.message);
    res.status(500).json({ error: 'Kunne ikke gemme indstillinger' });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const [[revenue]] = await pool.query(`
      SELECT
        SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total_ore ELSE 0 END) AS total_revenue_ore,
        SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN total_ore ELSE 0 END) AS revenue_30d_ore,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS orders_30d,
        SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'paid' OR status = 'processing' THEN 1 ELSE 0 END) AS to_ship
      FROM orders
    `);

    const [recentOrders] = await pool.query(`
      SELECT id, order_number, status, total_ore, ship_first_name, ship_last_name, created_at
      FROM orders ORDER BY created_at DESC LIMIT 10
    `);

    const [topProducts] = await pool.query(`
      SELECT oi.product_name, SUM(oi.quantity) AS qty_sold, SUM(oi.total_price_ore) AS revenue_ore
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('paid','processing','shipped','delivered')
      GROUP BY oi.product_name
      ORDER BY qty_sold DESC
      LIMIT 5
    `);

    res.json({ revenue, recent_orders: recentOrders, top_products: topProducts });
  } catch (err) {
    console.error('GET /shop/admin/dashboard:', err.message);
    res.status(500).json({ error: 'Kunne ikke hente dashboard' });
  }
});

module.exports = router;

'use strict';

/**
 * Flatpay / Frisbii webhook handler.
 * Mounted at /shop/flatpay in server.cjs.
 *
 * NOTE: This router must receive the RAW request body before express.json() parses it,
 * because we need to be able to access the raw body for future raw-body HMAC needs.
 * In practice, Frisbii signs using header values (timestamp + webhook_id), not the body,
 * so express.json() is fine here. Mount BEFORE express.json() only if body-based signing
 * is needed.
 */

const express = require('express');
const pool = require('../db');
const { verifyWebhookSignature } = require('../services/flatpay.cjs');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/shop-email.cjs');

const router = express.Router();

// POST /shop/flatpay/webhook
router.post('/webhook', async (req, res) => {
  try {
    const timestamp = req.headers['x-frisbii-timestamp'] || req.headers['x-reepay-timestamp'] || '';
    const signature = req.headers['x-frisbii-signature'] || req.headers['x-reepay-signature'] || '';
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const webhookId = payload.id || '';
    const eventType = payload.event_type || payload.event || '';

    // Verify HMAC-SHA256 signature
    if (!verifyWebhookSignature(webhookId, timestamp, signature)) {
      console.warn(`Flatpay webhook: invalid signature for webhook_id=${webhookId}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Replay protection — check if this webhook ID was already processed
    const [[settings]] = await pool.query('SELECT id, processed_webhook_ids FROM shop_settings WHERE id = 1');
    const processed = Array.isArray(settings?.processed_webhook_ids)
      ? settings.processed_webhook_ids
      : (settings?.processed_webhook_ids ? JSON.parse(settings.processed_webhook_ids) : []);

    if (webhookId && processed.includes(webhookId)) {
      console.log(`Flatpay webhook: duplicate webhook_id=${webhookId}, skipping`);
      return res.json({ ok: true, duplicate: true });
    }

    // Only handle charge_settled events
    if (eventType !== 'charge_settled') {
      // Record webhook receipt but do nothing else
      await logAndAck(settings, processed, webhookId, pool);
      return res.json({ ok: true, ignored: true });
    }

    // Extract order handle and charge ID
    // Frisbii payload shape: { id, event_type, charge: { handle, id, amount, ... } }
    const charge = payload.charge || payload;
    const orderHandle = charge.order_id || charge.handle || (charge.order && charge.order.handle) || null;
    const chargeId = charge.id || null;

    if (!orderHandle) {
      console.error('Flatpay webhook: missing order handle in payload', JSON.stringify(payload));
      return res.status(400).json({ error: 'Missing order handle' });
    }

    // Find the order
    const [[order]] = await pool.query(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderHandle]
    );

    if (!order) {
      console.error(`Flatpay webhook: order not found for handle=${orderHandle}`);
      // Still ack to avoid retries for a genuinely unknown order
      await logAndAck(settings, processed, webhookId, pool);
      return res.json({ ok: true, order_not_found: true });
    }

    // Idempotent: already paid?
    if (order.status !== 'pending_payment') {
      await logAndAck(settings, processed, webhookId, pool);
      return res.json({ ok: true, already_paid: true });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Update order: mark paid
      await conn.query(`
        UPDATE orders
        SET status = 'paid',
            flatpay_charge_id = ?,
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [chargeId, order.id]);

      // Decrement stock for each order item
      const [items] = await conn.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      for (const item of items) {
        if (item.variant_id) {
          await conn.query(
            'UPDATE product_variants SET stock = GREATEST(0, stock - ?) WHERE id = ?',
            [item.quantity, item.variant_id]
          );
        } else if (item.product_id) {
          await conn.query(
            'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ? AND track_stock = 1',
            [item.quantity, item.product_id]
          );
        }
      }

      // Log event
      await conn.query(`
        INSERT INTO order_events (order_id, event_type, old_status, new_status, message)
        VALUES (?, 'webhook_received', 'pending_payment', 'paid', ?)
      `, [order.id, `Frisbii charge_settled: charge_id=${chargeId}, webhook_id=${webhookId}`]);

      // Mark webhook as processed
      const newProcessed = [...processed.slice(-499), webhookId].filter(Boolean);
      await conn.query(
        'UPDATE shop_settings SET processed_webhook_ids = ? WHERE id = 1',
        [JSON.stringify(newProcessed)]
      );

      await conn.commit();
      conn.release();

      // Send confirmation emails (best-effort, outside transaction)
      const siteUrl = process.env.FLATPAY_ACCEPT_URL
        ? process.env.FLATPAY_ACCEPT_URL.replace('/shop/ordre', '')
        : 'https://lavprishjemmeside.dk';

      const updatedOrder = { ...order, status: 'paid', flatpay_charge_id: chargeId };

      sendOrderConfirmation({ order: updatedOrder, items, siteUrl }).catch((e) =>
        console.error('Order confirmation email failed:', e.message)
      );

      const [[shopSettings]] = await pool.query('SELECT notify_admin_email FROM shop_settings WHERE id = 1');
      if (shopSettings?.notify_admin_email) {
        sendAdminOrderNotification({
          order: updatedOrder,
          items,
          adminEmail: shopSettings.notify_admin_email,
        }).catch((e) => console.error('Admin order notification failed:', e.message));
      }

      // Log email sent event
      await pool.query(
        'INSERT INTO order_events (order_id, event_type, message) VALUES (?, ?, ?)',
        [order.id, 'email_sent', 'Ordrebekræftelse sendt til kunde']
      );

    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Flatpay webhook error:', err.message);
    // Return 500 so Frisbii retries
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function logAndAck(settings, processed, webhookId, db) {
  if (!webhookId) return;
  const newProcessed = [...processed.slice(-499), webhookId].filter(Boolean);
  await db.query(
    'UPDATE shop_settings SET processed_webhook_ids = ? WHERE id = 1',
    [JSON.stringify(newProcessed)]
  );
}

module.exports = router;

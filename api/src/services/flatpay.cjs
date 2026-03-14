'use strict';

/**
 * Flatpay / Frisbii (Billwerk+/ReePay) API client
 *
 * Flatpay merchants use the Frisbii Checkout API under the hood.
 * Auth: HTTP Basic — private key as username, empty password.
 */

const https = require('https');
const crypto = require('crypto');

const FRISBII_CHECKOUT_BASE = 'https://checkout-api.frisbii.com';
const FRISBII_API_BASE = 'https://api.frisbii.com';

function getApiKey() {
  return process.env.FLATPAY_API_KEY || '';
}

function getWebhookSecret() {
  return process.env.FLATPAY_WEBHOOK_SECRET || '';
}

function basicAuth(apiKey) {
  return 'Basic ' + Buffer.from(apiKey + ':').toString('base64');
}

/**
 * Low-level HTTPS request helper (no external deps).
 * @param {string} method
 * @param {string} url
 * @param {object|null} body
 * @param {string} apiKey
 * @returns {Promise<{status: number, data: any}>}
 */
function request(method, url, body, apiKey) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': basicAuth(apiKey),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Frisbii API request timed out'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Create a Frisbii Checkout session.
 *
 * @param {object} opts
 * @param {string} opts.orderHandle   - Unique order ID, e.g. "LPH-10001"
 * @param {number} opts.amountOre     - Amount in øre (9995 = 99,95 DKK)
 * @param {string} opts.orderText     - Human-readable order description
 * @param {object} opts.customer      - { handle, first_name, last_name, email }
 * @param {string} opts.acceptUrl     - Redirect after successful payment
 * @param {string} opts.cancelUrl     - Redirect after cancelled payment
 * @returns {Promise<{sessionId: string}>}
 */
async function createCheckoutSession({ orderHandle, amountOre, orderText, customer, acceptUrl, cancelUrl }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('FLATPAY_API_KEY is not configured');

  const body = {
    order: {
      handle: orderHandle,
      amount: amountOre,
      currency: 'DKK',
      ordertext: orderText || `Ordre ${orderHandle}`,
      customer: {
        handle: customer.handle || customer.email,
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email,
      },
    },
    accept_url: acceptUrl,
    cancel_url: cancelUrl,
  };

  const url = `${FRISBII_CHECKOUT_BASE}/v1/session/charge`;
  const { status, data } = await request('POST', url, body, apiKey);

  if (status !== 200 && status !== 201) {
    throw new Error(`Frisbii createSession failed (${status}): ${JSON.stringify(data)}`);
  }

  if (!data.id) {
    throw new Error(`Frisbii createSession: missing session ID in response: ${JSON.stringify(data)}`);
  }

  return { sessionId: data.id };
}

/**
 * Fetch a charge by ID.
 * @param {string} chargeId
 * @returns {Promise<object>}
 */
async function getCharge(chargeId) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('FLATPAY_API_KEY is not configured');

  const url = `${FRISBII_API_BASE}/v1/charge/${encodeURIComponent(chargeId)}`;
  const { status, data } = await request('GET', url, null, apiKey);

  if (status !== 200) {
    throw new Error(`Frisbii getCharge failed (${status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Verify an incoming Frisbii webhook signature.
 *
 * Signature scheme: HMAC-SHA256(webhook_secret, timestamp + webhook_id) hex-encoded.
 *
 * @param {string} webhookId    - ID of the webhook event (from payload)
 * @param {string} timestamp    - Timestamp from X-Frisbii-Timestamp header
 * @param {string} signature    - Hex signature from X-Frisbii-Signature header
 * @param {string} [secret]     - Override secret (defaults to env var)
 * @returns {boolean}
 */
function verifyWebhookSignature(webhookId, timestamp, signature, secret) {
  const webhookSecret = secret || getWebhookSecret();
  if (!webhookSecret) {
    throw new Error('FLATPAY_WEBHOOK_SECRET is not configured');
  }
  if (!webhookId || !timestamp || !signature) return false;

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(timestamp + webhookId)
    .digest('hex');

  // Timing-safe comparison
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  createCheckoutSession,
  getCharge,
  verifyWebhookSignature,
};

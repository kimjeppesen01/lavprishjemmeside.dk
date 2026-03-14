'use strict';

/**
 * Shop email templates — Danish
 * Uses the existing sendEmail service (Resend/SMTP).
 */

const { sendEmail } = require('./email');

/** Format øre to Danish price string: 9995 → "99,95 kr. inkl. moms" */
function formatPrice(ore) {
  const dkk = (ore / 100).toFixed(2).replace('.', ',');
  return `${dkk} kr.`;
}

/** Format øre to short: 9995 → "99,95 kr." */
function formatPriceShort(ore) {
  return (ore / 100).toFixed(2).replace('.', ',') + ' kr.';
}

function orderItemsHtml(items) {
  return items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <strong>${item.product_name}</strong>
        ${item.variant_name ? `<br><span style="color:#666;font-size:13px;">${item.variant_name}</span>` : ''}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${formatPriceShort(item.unit_price_ore)}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${formatPriceShort(item.total_price_ore)}</td>
    </tr>
  `).join('');
}

function baseEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">Lavprishjemmeside.dk</p>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h1 style="margin:0;font-size:22px;color:#111;">${title}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:20px 32px 32px;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f0f0f0;padding:16px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:12px;color:#888;">Lavprishjemmeside.dk &bull; Høgevej 4, 7000 Fredericia &bull; info@lavprishjemmeside.dk</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send order confirmation email to customer (after payment).
 */
async function sendOrderConfirmation({ order, items, siteUrl }) {
  const orderUrl = `${siteUrl || 'https://lavprishjemmeside.dk'}/shop/ordre/${order.token}`;
  const subject = `Ordrebekræftelse #${order.order_number} — Lavprishjemmeside.dk`;

  const itemsHtml = orderItemsHtml(items);

  const bodyHtml = `
    <p style="color:#333;">Hej ${order.ship_first_name || 'der'},</p>
    <p style="color:#333;">Tak for din ordre! Vi har modtaget din betaling og behandler din bestilling hurtigst muligt.</p>

    <h2 style="font-size:16px;margin:24px 0 12px;">Ordreoversigt</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;">
      <thead>
        <tr style="background:#f8f8f8;">
          <th style="padding:8px 0;text-align:left;">Produkt</th>
          <th style="padding:8px 0;text-align:center;">Antal</th>
          <th style="padding:8px 0;text-align:right;">Styk</th>
          <th style="padding:8px 0;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;margin-top:12px;">
      <tr>
        <td>Subtotal</td>
        <td style="text-align:right;">${formatPriceShort(order.subtotal_ore)}</td>
      </tr>
      <tr>
        <td>Fragt (${order.shipping_name || 'standard'})</td>
        <td style="text-align:right;">${order.shipping_ore === 0 ? 'Gratis' : formatPriceShort(order.shipping_ore)}</td>
      </tr>
      ${order.discount_ore > 0 ? `<tr><td>Rabat (${order.discount_code || ''})</td><td style="text-align:right;">−${formatPriceShort(order.discount_ore)}</td></tr>` : ''}
      <tr style="font-weight:bold;border-top:2px solid #111;">
        <td style="padding-top:8px;">I alt inkl. moms</td>
        <td style="padding-top:8px;text-align:right;">${formatPrice(order.total_ore)}</td>
      </tr>
      <tr>
        <td style="color:#888;font-size:12px;">Heraf moms (25%)</td>
        <td style="color:#888;font-size:12px;text-align:right;">${formatPriceShort(order.vat_ore)}</td>
      </tr>
    </table>

    <h2 style="font-size:16px;margin:24px 0 12px;">Leveringsadresse</h2>
    <p style="color:#333;margin:0;line-height:1.6;">
      ${order.ship_first_name} ${order.ship_last_name}<br>
      ${order.ship_address1}${order.ship_address2 ? '<br>' + order.ship_address2 : ''}<br>
      ${order.ship_zip} ${order.ship_city}<br>
      Danmark
    </p>

    <div style="margin-top:24px;">
      <a href="${orderUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
        Se din ordre
      </a>
    </div>

    <p style="margin-top:24px;font-size:13px;color:#888;">
      Har du spørgsmål? Skriv til os på <a href="mailto:info@lavprishjemmeside.dk" style="color:#1a1a2e;">info@lavprishjemmeside.dk</a>
    </p>
  `;

  const text = `Ordrebekræftelse #${order.order_number}\n\nHej ${order.ship_first_name || 'der'},\n\nTak for din ordre! Se ordren her: ${orderUrl}\n\nI alt: ${formatPrice(order.total_ore)}\n\nHilsen Lavprishjemmeside.dk`;

  await sendEmail({
    to: order.ship_email,
    subject,
    html: baseEmailHtml(`Ordrebekræftelse #${order.order_number}`, bodyHtml),
    text,
  });
}

/**
 * Send shipping notification to customer.
 */
async function sendShippingNotification({ order, siteUrl }) {
  const orderUrl = `${siteUrl || 'https://lavprishjemmeside.dk'}/shop/ordre/${order.token}`;
  const subject = `Din ordre #${order.order_number} er afsendt`;

  const trackingHtml = (order.tracking_number && order.tracking_carrier)
    ? `<p style="color:#333;">Sporings-id: <strong>${order.tracking_number}</strong> (${order.tracking_carrier})</p>`
    : '';

  const bodyHtml = `
    <p style="color:#333;">Hej ${order.ship_first_name || 'der'},</p>
    <p style="color:#333;">Din ordre <strong>#${order.order_number}</strong> er nu afsendt til dig!</p>
    ${trackingHtml}
    <p style="color:#333;">Levering til:<br>
      ${order.ship_first_name} ${order.ship_last_name}<br>
      ${order.ship_address1}<br>
      ${order.ship_zip} ${order.ship_city}
    </p>
    <div style="margin-top:24px;">
      <a href="${orderUrl}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
        Se din ordre
      </a>
    </div>
  `;

  const text = `Din ordre #${order.order_number} er afsendt!\n\nSe ordren her: ${orderUrl}`;

  await sendEmail({
    to: order.ship_email,
    subject,
    html: baseEmailHtml(`Ordre #${order.order_number} er afsendt`, bodyHtml),
    text,
  });
}

/**
 * Notify admin of a new paid order.
 */
async function sendAdminOrderNotification({ order, items, adminEmail }) {
  if (!adminEmail) return;
  const subject = `Ny ordre #${order.order_number} — ${formatPrice(order.total_ore)}`;

  const itemsText = items.map(i => `${i.product_name}${i.variant_name ? ' / ' + i.variant_name : ''} × ${i.quantity}`).join('\n');

  const bodyHtml = `
    <p>Ny betalt ordre modtaget.</p>
    <p><strong>Ordre:</strong> #${order.order_number}<br>
       <strong>Kunde:</strong> ${order.ship_first_name} ${order.ship_last_name} &lt;${order.ship_email}&gt;<br>
       <strong>Total:</strong> ${formatPrice(order.total_ore)}
    </p>
    <p><strong>Produkter:</strong><br>${items.map(i => `${i.product_name}${i.variant_name ? ' / ' + i.variant_name : ''} × ${i.quantity}`).join('<br>')}</p>
    <p><a href="https://lavprishjemmeside.dk/admin/shop/orders/" style="color:#1a1a2e;">Åbn i admin →</a></p>
  `;

  await sendEmail({
    to: adminEmail,
    subject,
    html: baseEmailHtml(`Ny ordre #${order.order_number}`, bodyHtml),
    text: `Ny ordre #${order.order_number}\nKunde: ${order.ship_email}\nTotal: ${formatPrice(order.total_ore)}\n\n${itemsText}`,
  });
}

module.exports = {
  sendOrderConfirmation,
  sendShippingNotification,
  sendAdminOrderNotification,
};

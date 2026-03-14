const nodemailer = require('nodemailer');

/**
 * Email service for sending transactional emails
 * Uses Resend SMTP when configured, otherwise falls back to domain SMTP.
 */

function normalizeBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

function hasValue(value) {
  return Boolean(value && String(value).trim());
}

function createTransportConfig() {
  if (hasValue(process.env.RESEND_API_KEY)) {
    return {
      kind: 'resend',
      config: {
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY
        }
      }
    };
  }

  if (hasValue(process.env.SMTP_HOST) && hasValue(process.env.SMTP_USER) && hasValue(process.env.SMTP_PASSWORD)) {
    return {
      kind: 'smtp',
      config: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: normalizeBool(process.env.SMTP_SECURE, true),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        pool: true,
        maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5),
        maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100)
      }
    };
  }

  return null;
}

const transportConfig = createTransportConfig();
const transporter = transportConfig ? nodemailer.createTransport(transportConfig.config) : null;

if (transporter) {
  transporter.verify((err) => {
    if (err) {
      console.error(`Email transporter verification failed (${transportConfig.kind}):`, err.message);
    } else {
      console.log(`Email transporter ready (${transportConfig.kind})`);
    }
  });
} else {
  console.error('Email transporter not configured: set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASSWORD');
}

/**
 * Send email helper function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email content
 * @param {string} options.text - Plain text email content
 * @returns {Promise<Object>} - Result object with ok and messageId
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!transporter) {
      throw new Error('Email transporter is not configured');
    }
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Lavprishjemmeside.dk'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@lavprishjemmeside.dk'}>`,
      to,
      subject,
      html,
      text
    });
    console.log('Email sent:', info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    throw err;
  }
}

module.exports = { sendEmail, transporter, transportKind: transportConfig ? transportConfig.kind : null };

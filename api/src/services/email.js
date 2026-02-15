const nodemailer = require('nodemailer');

/**
 * Email service for sending transactional emails
 * Uses Resend SMTP for reliable delivery
 */

// Resend configuration (primary)
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY
  }
});

// cPanel SMTP fallback configuration (if Resend not used)
// Uncomment and configure if switching to cPanel email
// const transporter = nodemailer.createTransport({
//   host: 'mail.lavprishjemmeside.dk',
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.SMTP_USER, // e.g., noreply@lavprishjemmeside.dk
//     pass: process.env.SMTP_PASSWORD
//   },
//   pool: true, // Connection pooling for better performance
//   maxConnections: 5,
//   maxMessages: 100
// });

// Verify transporter on startup
transporter.verify((err, success) => {
  if (err) {
    console.error('Email transporter verification failed:', err.message);
  } else {
    console.log('Email transporter ready');
  }
});

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

module.exports = { sendEmail, transporter };

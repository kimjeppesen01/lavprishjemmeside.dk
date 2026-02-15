/**
 * Password reset email template
 * Generates Danish language email with HTML and plain text versions
 */

/**
 * Generate password reset email content
 * @param {Object} options - Template options
 * @param {string} options.resetUrl - Password reset URL with token
 * @param {number} options.expiryMinutes - Token expiry time in minutes (default: 60)
 * @returns {Object} - Email content with html, text, and subject
 */
function passwordResetEmail({ resetUrl, expiryMinutes = 60 }) {
  const html = `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nulstil adgangskode</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #111827;">
                Nulstil din adgangskode
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Vi har modtaget en anmodning om at nulstille adgangskoden til din konto. Klik på knappen nedenfor for at nulstille den.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
                      Nulstil adgangskode
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Dette link udløber om <strong>${expiryMinutes} minutter</strong>.
              </p>
              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Hvis du ikke har anmodet om at nulstille din adgangskode, kan du ignorere denne e-mail.
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;">
                Hvis knappen ovenfor ikke virker, kan du kopiere og indsætte følgende link i din browser:
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; line-height: 1.5; color: #2563eb; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                &copy; ${new Date().getFullYear()} Lavprishjemmeside.dk. Alle rettigheder forbeholdes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Nulstil din adgangskode

Vi har modtaget en anmodning om at nulstille adgangskoden til din konto.

Klik på linket nedenfor for at nulstille den:
${resetUrl}

Dette link udløber om ${expiryMinutes} minutter.

Hvis du ikke har anmodet om at nulstille din adgangskode, kan du ignorere denne e-mail.

---
© ${new Date().getFullYear()} Lavprishjemmeside.dk. Alle rettigheder forbeholdes.
  `.trim();

  return {
    html,
    text,
    subject: 'Nulstil din adgangskode - Lavprishjemmeside.dk'
  };
}

module.exports = { passwordResetEmail };

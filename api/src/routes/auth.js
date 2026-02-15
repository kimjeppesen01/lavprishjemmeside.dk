const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { loginRateLimiter, passwordResetRateLimiter } = require('../middleware/rateLimit');
const { sendEmail } = require('../services/email');
const { passwordResetEmail } = require('../templates/passwordReset');
const router = express.Router();

// POST /auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['auth.login.success', req.ip, req.headers['user-agent'], user.id, JSON.stringify({ email })]
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/register (admin only — creates new users)
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.execute(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, hash, name || null, role || 'user']
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /auth/me — check current token
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/forgot-password — request password reset
router.post('/forgot-password', passwordResetRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail er påkrævet' });
    }

    // Always return success to prevent email enumeration
    // (Don't reveal whether email exists in database)
    const successResponse = {
      ok: true,
      message: 'Hvis e-mailen findes i systemet, er der sendt en nulstillingsmail'
    };

    // Check if user exists
    const [rows] = await pool.execute('SELECT id, email, name FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      // Log failed attempt (email not found)
      await pool.execute(
        'INSERT INTO security_logs (action, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
        [
          'auth.forgot_password.email_not_found',
          req.ip,
          req.headers['user-agent'],
          JSON.stringify({ email })
        ]
      );

      // Still return success to prevent enumeration
      return res.json(successResponse);
    }

    const user = rows[0];

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiryMinutes = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '60', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store token in database
    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, token, req.ip, req.headers['user-agent'], expiresAt]
    );

    // Generate reset URL
    const baseUrl = process.env.PASSWORD_RESET_BASE_URL || 'https://lavprishjemmeside.dk';
    const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;

    // Send email
    const emailContent = passwordResetEmail({ resetUrl, expiryMinutes });
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    // Log successful request
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'auth.forgot_password.success',
        req.ip,
        req.headers['user-agent'],
        user.id,
        JSON.stringify({ email })
      ]
    );

    res.json(successResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);

    // Log error
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
      [
        'auth.forgot_password.error',
        req.ip,
        req.headers['user-agent'],
        JSON.stringify({ error: err.message })
      ]
    ).catch(() => {}); // Ignore logging errors

    res.status(500).json({ error: 'Der opstod en fejl. Prøv igen senere' });
  }
});

// POST /auth/reset-password — reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token og adgangskode er påkrævet' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Adgangskoden skal være mindst 8 tegn' });
    }

    // Find valid token
    const [tokenRows] = await pool.execute(
      `SELECT prt.*, u.id as user_id, u.email, u.name, u.role
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
      [token]
    );

    if (tokenRows.length === 0) {
      // Log invalid token attempt
      await pool.execute(
        'INSERT INTO security_logs (action, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
        [
          'auth.reset_password.invalid_token',
          req.ip,
          req.headers['user-agent'],
          JSON.stringify({ token: token.slice(0, 10) + '...' })
        ]
      );

      return res.status(400).json({ error: 'Ugyldigt eller udløbet link' });
    }

    const resetToken = tokenRows[0];
    const user = {
      id: resetToken.user_id,
      email: resetToken.email,
      name: resetToken.name,
      role: resetToken.role
    };

    // Hash new password
    const hash = await bcrypt.hash(password, 12);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hash, user.id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [resetToken.id]
    );

    // Log successful password reset
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'auth.reset_password.success',
        req.ip,
        req.headers['user-agent'],
        user.id,
        JSON.stringify({ email: user.email })
      ]
    );

    // Generate new JWT token (automatically log user in)
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      ok: true,
      token: jwtToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('Reset password error:', err.message);

    // Log error
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
      [
        'auth.reset_password.error',
        req.ip,
        req.headers['user-agent'],
        JSON.stringify({ error: err.message })
      ]
    ).catch(() => {});

    res.status(500).json({ error: 'Der opstod en fejl. Prøv igen senere' });
  }
});

module.exports = router;

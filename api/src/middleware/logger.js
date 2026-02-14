const pool = require('../db');

async function requestLogger(req, res, next) {
  if (req.path === '/health') return next();

  try {
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, details) VALUES (?, ?, ?, ?)',
      [
        `${req.method} ${req.path}`,
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
        (req.headers['user-agent'] || '').slice(0, 500),
        JSON.stringify({ query: req.query })
      ]
    );
  } catch {
    // Don't block requests if logging fails
  }

  next();
}

module.exports = { requestLogger };

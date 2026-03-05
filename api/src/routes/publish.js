const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const DISABLED_MESSAGE =
  'Publicering via GitHub workflow er deaktiveret. Brug SSH-first deploy scripts.';

// POST /publish — intentionally disabled in SSH-first mode
router.post('/', requireAuth, async (req, res) => {
  try {
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'site.publish.disabled',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ mode: 'ssh-first', timestamp: new Date().toISOString() }),
      ]
    );
  } catch (err) {
    console.error('publish disabled log error:', err.message);
  }

  return res.status(503).json({
    ok: false,
    mode: 'ssh-first',
    error: DISABLED_MESSAGE,
  });
});

// GET /publish/status — explicit disabled state
router.get('/status', requireAuth, async (req, res) => {
  res.json({
    mode: 'ssh-first',
    enabled: false,
    message: DISABLED_MESSAGE,
  });
});

module.exports = router;

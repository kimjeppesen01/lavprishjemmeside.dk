const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { eventRateLimiter } = require('../middleware/rateLimit');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const router = express.Router();

// POST /events — track an event (public, called from frontend)
router.post('/', eventRateLimiter, async (req, res) => {
  try {
    const { event_type, event_name, page_url, referrer, session_id, metadata } = req.body;

    if (!event_type || !event_name) {
      return res.status(400).json({ error: 'event_type and event_name are required' });
    }

    await pool.execute(
      `INSERT INTO events (event_type, event_name, page_url, referrer, user_agent, ip_address, session_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_type,
        event_name,
        (page_url || '').slice(0, 500),
        (referrer || '').slice(0, 500),
        (req.headers['user-agent'] || '').slice(0, 500),
        req.ip || req.headers['x-forwarded-for'] || 'unknown',
        session_id || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    // Upsert session
    if (session_id) {
      await pool.execute(
        `INSERT INTO sessions (session_id, ip_address, user_agent, first_page, last_page, page_count)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE last_page = VALUES(last_page), page_count = page_count + 1, last_activity = CURRENT_TIMESTAMP`,
        [
          session_id,
          req.ip || req.headers['x-forwarded-for'] || 'unknown',
          (req.headers['user-agent'] || '').slice(0, 500),
          (page_url || '').slice(0, 500),
          (page_url || '').slice(0, 500)
        ]
      );
    }

    // Invalidate cache after successful write
    invalidateCache(['events:summary', 'sessions:summary']);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Event tracking error:', err.message);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// GET /events/summary — dashboard stats (admin only)
router.get('/summary', requireAuth, cacheMiddleware('events:summary'), async (req, res) => {
  try {
    const [totalEvents] = await pool.execute('SELECT COUNT(*) as count FROM events');
    const [todayEvents] = await pool.execute('SELECT COUNT(*) as count FROM events WHERE DATE(created_at) = CURDATE()');
    const [topEvents] = await pool.execute(
      'SELECT event_name, event_type, COUNT(*) as count FROM events GROUP BY event_name, event_type ORDER BY count DESC LIMIT 10'
    );
    const [recentEvents] = await pool.execute(
      'SELECT event_type, event_name, page_url, created_at FROM events ORDER BY created_at DESC LIMIT 20'
    );

    res.json({
      total: totalEvents[0].count,
      today: todayEvents[0].count,
      top_events: topEvents,
      recent: recentEvents
    });
  } catch (err) {
    console.error('Summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;

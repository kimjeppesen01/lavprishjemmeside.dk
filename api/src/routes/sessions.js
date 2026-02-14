const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /sessions/summary — session statistics (admin only)
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [totalSessions] = await pool.execute('SELECT COUNT(*) as count FROM sessions');
    const [todaySessions] = await pool.execute(
      'SELECT COUNT(*) as count FROM sessions WHERE DATE(started_at) = CURDATE()'
    );
    const [avgPageCount] = await pool.execute(
      'SELECT ROUND(AVG(page_count), 1) as avg_pages FROM sessions'
    );
    const [topPages] = await pool.execute(
      `SELECT first_page, COUNT(*) as count
       FROM sessions
       GROUP BY first_page
       ORDER BY count DESC
       LIMIT 10`
    );
    const [recentSessions] = await pool.execute(
      `SELECT session_id, first_page, last_page, page_count, started_at, last_activity
       FROM sessions
       ORDER BY last_activity DESC
       LIMIT 20`
    );

    res.json({
      total: totalSessions[0].count,
      today: todaySessions[0].count,
      avg_pages: avgPageCount[0].avg_pages || 0,
      top_pages: topPages,
      recent: recentSessions
    });
  } catch (err) {
    console.error('Sessions summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch session summary' });
  }
});

module.exports = router;

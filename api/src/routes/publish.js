const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Rate limiter specifically for publish (1 per 2 minutes)
const rateLimit = require('express-rate-limit');
const publishRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Publicering er allerede i gang. Vent 2 minutter' });
  }
});

// POST /publish — Trigger GitHub Actions rebuild
router.post('/', requireAuth, publishRateLimiter, async (req, res) => {
  try {
    // Check if GITHUB_PAT is configured
    if (!process.env.GITHUB_PAT) {
      return res.status(500).json({ error: 'GitHub PAT ikke konfigureret' });
    }

    // Trigger GitHub Actions workflow_dispatch (repo from env for multi-domain)
    const repo = process.env.GITHUB_REPO || 'kimjeppesen01/lavprishjemmeside.dk';
    const [owner, repoName] = repo.includes('/') ? repo.split('/') : [repo, 'lavprishjemmeside.dk'];
    const workflowUrl = `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/deploy.yml/dispatches`;
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': process.env.CORS_ORIGIN ? new URL(process.env.CORS_ORIGIN).hostname + '-api' : 'lavprishjemmeside.dk-api'
      },
      body: JSON.stringify({ ref: 'main' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub Actions trigger failed:', response.status, errorText);
      throw new Error(`GitHub API returnerede fejl: ${response.status}`);
    }

    // Log successful publish trigger
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'site.publish.trigger',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ timestamp: new Date().toISOString() })
      ]
    );

    res.json({
      ok: true,
      message: 'Publicering startet. Siden er klar om ~90 sekunder',
      estimated_completion: new Date(Date.now() + 90000).toISOString()
    });
  } catch (error) {
    console.error('Error triggering publish:', error.message);

    // Log failed publish attempt
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'site.publish.error',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ error: error.message })
      ]
    );

    res.status(500).json({ error: 'Kunne ikke starte publicering' });
  }
});

// GET /publish/status — Get last publish timestamp
router.get('/status', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT created_at, user_id, details
       FROM security_logs
       WHERE action = 'site.publish.trigger'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ last_publish: null });
    }

    const lastPublish = rows[0];

    res.json({
      last_publish: lastPublish.created_at,
      user_id: lastPublish.user_id
    });
  } catch (error) {
    console.error('Error fetching publish status:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente publiceringsstatus' });
  }
});

module.exports = router;

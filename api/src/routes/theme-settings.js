const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

function normalize(row) {
  if (!row) {
    return {
      site_id: 1,
      active_theme_key: 'simple',
      motion_profile: 'standard',
    };
  }
  return {
    site_id: row.site_id || 1,
    active_theme_key: ['simple', 'modern', 'kreativ'].includes(row.active_theme_key) ? row.active_theme_key : 'simple',
    motion_profile: ['standard', 'reduced', 'expressive'].includes(row.motion_profile) ? row.motion_profile : 'standard',
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null,
  };
}

// GET /theme-settings/public
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT site_id, active_theme_key, motion_profile, updated_at, updated_by FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
    );
    return res.json(normalize(rows[0]));
  } catch (error) {
    console.error('Error fetching public theme settings:', error.message);
    return res.status(500).json({ error: 'Kunne ikke hente tema indstillinger' });
  }
});

// GET /theme-settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT site_id, active_theme_key, motion_profile, updated_at, updated_by FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
    );
    return res.json(normalize(rows[0]));
  } catch (error) {
    console.error('Error fetching theme settings:', error.message);
    return res.status(500).json({ error: 'Kunne ikke hente tema indstillinger' });
  }
});

// POST /theme-settings/update
router.post('/update', requireAuth, async (req, res) => {
  try {
    const active_theme_key = String(req.body.active_theme_key || 'simple').toLowerCase();
    const motion_profile = String(req.body.motion_profile || 'standard').toLowerCase();

    if (!['simple', 'modern', 'kreativ'].includes(active_theme_key)) {
      return res.status(400).json({ error: 'Ugyldig active_theme_key' });
    }
    if (!['standard', 'reduced', 'expressive'].includes(motion_profile)) {
      return res.status(400).json({ error: 'Ugyldig motion_profile' });
    }

    await pool.execute(
      `INSERT INTO site_theme_settings (site_id, active_theme_key, motion_profile, updated_by)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         active_theme_key = VALUES(active_theme_key),
         motion_profile = VALUES(motion_profile),
         updated_by = VALUES(updated_by)`,
      [active_theme_key, motion_profile, req.user.id]
    );

    const [rows] = await pool.execute(
      'SELECT site_id, active_theme_key, motion_profile, updated_at, updated_by FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
    );
    return res.json(normalize(rows[0]));
  } catch (error) {
    console.error('Error updating theme settings:', error.message);
    return res.status(500).json({ error: 'Kunne ikke opdatere tema indstillinger' });
  }
});

module.exports = router;

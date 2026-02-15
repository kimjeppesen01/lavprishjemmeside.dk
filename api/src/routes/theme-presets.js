const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /theme-presets — List all theme presets
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, label_da, description_da, is_default, created_at FROM theme_presets ORDER BY is_default DESC, name ASC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching theme presets:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente tema presets' });
  }
});

// GET /theme-presets/:id — Get single preset with full settings
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM theme_presets WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tema preset ikke fundet' });
    }

    // Parse JSON settings
    const preset = rows[0];
    preset.settings = JSON.parse(preset.settings);

    res.json(preset);
  } catch (error) {
    console.error('Error fetching theme preset:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente tema preset' });
  }
});

module.exports = router;

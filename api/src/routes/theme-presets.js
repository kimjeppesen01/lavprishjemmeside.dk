const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

function normalizePreset(preset) {
  const out = { ...preset };
  const n = String(out.name || '').toLowerCase();
  const l = String(out.label_da || '').toLowerCase();
  const isModern =
    n.includes('modern') ||
    n.includes('minimal') ||
    l.includes('modern') ||
    l.includes('minimal');
  const isSimple =
    n.includes('simple') ||
    n.includes('professionel') ||
    n.includes('professional') ||
    l.includes('simple') ||
    l.includes('professionel') ||
    l.includes('professional');

  if (isModern) {
    out.name = 'modern';
    out.label_da = 'Modern';
    if (!out.description_da) out.description_da = 'Markant redesign med moderne design language.';
  } else if (isSimple) {
    out.name = 'simple';
    out.label_da = 'Simple';
    if (!out.description_da) out.description_da = 'Kendt professionel stil med klassisk struktur.';
  }

  if (out.settings && typeof out.settings === 'object') {
    if (isModern) out.settings.theme_mode = 'modern';
    if (isSimple) out.settings.theme_mode = 'simple';
  }

  return out;
}

// GET /theme-presets — List all theme presets
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, label_da, description_da, is_default, created_at FROM theme_presets ORDER BY is_default DESC, name ASC'
    );

    res.json(rows.map(normalizePreset));
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

    res.json(normalizePreset(preset));
  } catch (error) {
    console.error('Error fetching theme preset:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente tema preset' });
  }
});

module.exports = router;

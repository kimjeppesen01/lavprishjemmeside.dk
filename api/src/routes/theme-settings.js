const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

async function ensureThemeTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_theme_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_id INT NOT NULL DEFAULT 1,
        active_theme_key ENUM('simple','modern','kreativ') NOT NULL DEFAULT 'simple',
        motion_profile ENUM('standard','reduced','expressive') NOT NULL DEFAULT 'standard',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT DEFAULT NULL,
        UNIQUE KEY idx_site_id (site_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      INSERT INTO site_theme_settings (site_id, active_theme_key, motion_profile)
      VALUES (1, 'simple', 'standard')
      ON DUPLICATE KEY UPDATE site_id = VALUES(site_id)
    `);

    // Self-heal older table variants (created in earlier iterations).
    const [updatedByCols] = await pool.query(`SHOW COLUMNS FROM site_theme_settings LIKE 'updated_by'`);
    if (!Array.isArray(updatedByCols) || updatedByCols.length === 0) {
      await pool.query(`ALTER TABLE site_theme_settings ADD COLUMN updated_by INT DEFAULT NULL`);
    }

    const [motionCols] = await pool.query(`SHOW COLUMNS FROM site_theme_settings LIKE 'motion_profile'`);
    if (!Array.isArray(motionCols) || motionCols.length === 0) {
      await pool.query(`ALTER TABLE site_theme_settings ADD COLUMN motion_profile ENUM('standard','reduced','expressive') NOT NULL DEFAULT 'standard'`);
    } else {
      const type = String(motionCols[0].Type || '').toLowerCase();
      if (!type.includes('expressive')) {
        await pool.query(`ALTER TABLE site_theme_settings MODIFY COLUMN motion_profile ENUM('standard','reduced','expressive') NOT NULL DEFAULT 'standard'`);
      }
    }

    const [themeCols] = await pool.query(`SHOW COLUMNS FROM site_theme_settings LIKE 'active_theme_key'`);
    if (!Array.isArray(themeCols) || themeCols.length === 0) {
      await pool.query(`ALTER TABLE site_theme_settings ADD COLUMN active_theme_key ENUM('simple','modern','kreativ') NOT NULL DEFAULT 'simple'`);
    } else {
      const type = String(themeCols[0].Type || '').toLowerCase();
      if (!type.includes('kreativ')) {
        await pool.query(`ALTER TABLE site_theme_settings MODIFY COLUMN active_theme_key ENUM('simple','modern','kreativ') NOT NULL DEFAULT 'simple'`);
      }
    }

    await pool.query(`
      UPDATE site_theme_settings sts
      JOIN design_settings ds ON ds.site_id = sts.site_id
      SET sts.active_theme_key = CASE
        WHEN ds.theme_mode = 'modern' THEN 'modern'
        ELSE sts.active_theme_key
      END
      WHERE sts.site_id = 1
    `).catch(() => {});

    return true;
  } catch (error) {
    console.warn('theme-settings: falling back to legacy storage:', error.message);
    return false;
  }
}

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

async function readLegacyTheme() {
  const [themeModeCols] = await pool.query(`SHOW COLUMNS FROM design_settings LIKE 'theme_mode'`);
  const hasThemeMode = Array.isArray(themeModeCols) && themeModeCols.length > 0;

  if (hasThemeMode) {
    const [rows] = await pool.query('SELECT site_id, updated_at, updated_by, theme_mode FROM design_settings WHERE site_id = 1 LIMIT 1');
    const row = rows && rows[0] ? rows[0] : {};
    const mode = row.theme_mode === 'modern' ? 'modern' : 'simple';
    return normalize({
      site_id: row.site_id || 1,
      active_theme_key: mode,
      motion_profile: 'standard',
      updated_at: row.updated_at || null,
      updated_by: row.updated_by || null,
    });
  }

  // Legacy fallback without theme_mode: infer from active preset name/label.
  const [rows] = await pool.query(`
    SELECT ds.site_id, ds.updated_at, ds.updated_by, ds.active_preset_id, tp.name AS preset_name, tp.label_da
    FROM design_settings ds
    LEFT JOIN theme_presets tp ON tp.id = ds.active_preset_id
    WHERE ds.site_id = 1
    LIMIT 1
  `);
  const row = rows && rows[0] ? rows[0] : {};
  const name = String(row.preset_name || '').toLowerCase();
  const label = String(row.label_da || '').toLowerCase();
  const mode =
    name.includes('modern') ||
    name.includes('minimal') ||
    label.includes('modern') ||
    label.includes('minimal')
      ? 'modern'
      : 'simple';
  return normalize({
    site_id: row.site_id || 1,
    active_theme_key: mode,
    motion_profile: 'standard',
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null,
  });
}

async function writeLegacyTheme(activeThemeKey, userId) {
  const mapped = activeThemeKey === 'modern' ? 'modern' : 'simple';
  const [themeModeCols] = await pool.query(`SHOW COLUMNS FROM design_settings LIKE 'theme_mode'`);
  const hasThemeMode = Array.isArray(themeModeCols) && themeModeCols.length > 0;

  if (hasThemeMode) {
    await pool.query(
      'UPDATE design_settings SET theme_mode = ?, updated_by = ? WHERE site_id = 1',
      [mapped, userId]
    );
  } else {
    // Persist theme via active_preset_id if theme_mode column is unavailable.
    const [presetRows] = await pool.query(
      `SELECT id, name, label_da
       FROM theme_presets
       WHERE LOWER(name) IN (?, ?, ?, ?)
          OR LOWER(COALESCE(label_da,'')) IN (?, ?, ?, ?)
       ORDER BY is_default DESC, id ASC
       LIMIT 1`,
      mapped === 'modern'
        ? ['modern', 'minimalist', 'minimalistisk', 'minimalistic', 'modern', 'minimalist', 'minimalistisk', 'minimalistic']
        : ['simple', 'business', 'professionel', 'professional', 'simple', 'business', 'professionel', 'professional']
    );
    const presetId = presetRows && presetRows[0] ? presetRows[0].id : null;
    if (presetId) {
      await pool.query(
        'UPDATE design_settings SET active_preset_id = ?, updated_by = ? WHERE site_id = 1',
        [presetId, userId]
      );
    } else {
      await pool.query(
        'UPDATE design_settings SET updated_by = ? WHERE site_id = 1',
        [userId]
      );
    }
  }

  return normalize({
    site_id: 1,
    active_theme_key: mapped,
    motion_profile: 'standard',
    updated_by: userId,
  });
}

// GET /theme-settings/public
router.get('/public', async (req, res) => {
  try {
    const ready = await ensureThemeTable();
    if (!ready) {
      return res.json(await readLegacyTheme());
    }
    try {
      const [rows] = await pool.execute(
        'SELECT site_id, active_theme_key, motion_profile, updated_at, updated_by FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
      );
      return res.json(normalize(rows[0]));
    } catch (_) {
      return res.json(await readLegacyTheme());
    }
  } catch (error) {
    console.error('Error fetching public theme settings:', error.message);
    return res.json(normalize(null));
  }
});

// GET /theme-settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const ready = await ensureThemeTable();
    if (!ready) {
      return res.json(await readLegacyTheme());
    }
    try {
      const [rows] = await pool.execute(
        'SELECT site_id, active_theme_key, motion_profile, updated_at, updated_by FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
      );
      return res.json(normalize(rows[0]));
    } catch (_) {
      return res.json(await readLegacyTheme());
    }
  } catch (error) {
    console.error('Error fetching theme settings:', error.message);
    return res.json(normalize(null));
  }
});

// POST /theme-settings/update
router.post('/update', requireAuth, async (req, res) => {
  try {
    const ready = await ensureThemeTable();
    const active_theme_key = String(req.body.active_theme_key || 'simple').toLowerCase();
    const motion_profile = String(req.body.motion_profile || 'standard').toLowerCase();

    if (!['simple', 'modern', 'kreativ'].includes(active_theme_key)) {
      return res.status(400).json({ error: 'Ugyldig active_theme_key' });
    }
    if (!['standard', 'reduced', 'expressive'].includes(motion_profile)) {
      return res.status(400).json({ error: 'Ugyldig motion_profile' });
    }

    if (!ready) {
      return res.json(await writeLegacyTheme(active_theme_key, req.user.id));
    }

    try {
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
      console.warn('theme-settings write fallback to legacy:', error.message);
      return res.json(await writeLegacyTheme(active_theme_key, req.user.id));
    }
  } catch (error) {
    console.error('Error updating theme settings:', error.message);
    return res.status(500).json({ error: `Kunne ikke opdatere tema indstillinger (${error.message})` });
  }
});

module.exports = router;

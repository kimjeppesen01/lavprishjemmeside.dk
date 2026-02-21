const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// Hex color validation regex
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

// GET /design-settings — Get current design settings (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Design indstillinger ikke fundet' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching design settings:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente design indstillinger' });
  }
});

// GET /design-settings/public — Public read-only endpoint (for build-time)
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );

    if (rows.length === 0) {
      // Return defaults if no settings exist
      return res.json({
        theme_mode: 'simple',
        feature_smooth_scroll: 1,
        feature_grain_overlay: 1,
        feature_page_loader: 1,
        feature_sticky_header: 1,
        page_loader_text: 'Indlæser...',
        page_loader_show_logo: 1,
        page_loader_duration: 2.5,
        color_primary: '#2563EB',
        color_primary_hover: '#1D4ED8',
        color_primary_light: '#DBEAFE',
        color_secondary: '#7C3AED',
        color_secondary_hover: '#6D28D9',
        color_secondary_light: '#EDE9FE',
        color_accent: '#F59E0B',
        color_accent_hover: '#D97706',
        color_neutral_50: '#F9FAFB',
        color_neutral_100: '#F3F4F6',
        color_neutral_200: '#E5E7EB',
        color_neutral_300: '#D1D5DB',
        color_neutral_600: '#4B5563',
        color_neutral_700: '#374151',
        color_neutral_800: '#1F2937',
        color_neutral_900: '#111827',
        font_heading: 'Inter',
        font_body: 'Inter',
        font_size_base: '1rem',
        border_radius: 'medium',
        shadow_style: 'subtle'
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching public design settings:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente design indstillinger' });
  }
});

// POST /design-settings/update — Update design settings
router.post('/update', requireAuth, async (req, res) => {
  try {
    const {
      color_primary,
      color_primary_hover,
      color_primary_light,
      color_secondary,
      color_secondary_hover,
      color_secondary_light,
      color_accent,
      color_accent_hover,
      color_neutral_50,
      color_neutral_100,
      color_neutral_200,
      color_neutral_300,
      color_neutral_600,
      color_neutral_700,
      color_neutral_800,
      color_neutral_900,
      font_heading,
      font_body,
      font_size_base,
      border_radius,
      shadow_style
    } = req.body;

    // Validate hex colors if provided
    const colorFields = {
      color_primary,
      color_primary_hover,
      color_primary_light,
      color_secondary,
      color_secondary_hover,
      color_secondary_light,
      color_accent,
      color_accent_hover,
      color_neutral_50,
      color_neutral_100,
      color_neutral_200,
      color_neutral_300,
      color_neutral_600,
      color_neutral_700,
      color_neutral_800,
      color_neutral_900
    };

    for (const [key, value] of Object.entries(colorFields)) {
      if (value !== undefined && !HEX_COLOR_REGEX.test(value)) {
        return res.status(400).json({ error: `Ugyldig hex farve for ${key}: ${value}` });
      }
    }

    // Validate enums if provided
    if (border_radius !== undefined && !['none', 'small', 'medium', 'large', 'full'].includes(border_radius)) {
      return res.status(400).json({ error: 'Ugyldig border_radius værdi' });
    }

    if (shadow_style !== undefined && !['none', 'subtle', 'medium', 'dramatic'].includes(shadow_style)) {
      return res.status(400).json({ error: 'Ugyldig shadow_style værdi' });
    }
    if (req.body.theme_mode !== undefined && !['simple', 'modern'].includes(req.body.theme_mode)) {
      return res.status(400).json({ error: 'Ugyldig theme_mode værdi' });
    }

    // Validate feature toggles (0 or 1)
    const featureFields = ['feature_smooth_scroll', 'feature_grain_overlay', 'feature_page_loader', 'feature_sticky_header', 'page_loader_show_logo'];
    for (const key of featureFields) {
      const v = req.body[key];
      if (v !== undefined && v !== 0 && v !== 1 && v !== true && v !== false) {
        return res.status(400).json({ error: `Ugyldig værdi for ${key}: brug 0 eller 1` });
      }
    }

    // Validate page loader
    if (req.body.page_loader_text !== undefined) {
      const t = String(req.body.page_loader_text);
      if (t.length > 100) return res.status(400).json({ error: 'page_loader_text må max være 100 tegn' });
    }
    if (req.body.page_loader_duration !== undefined) {
      const d = parseFloat(req.body.page_loader_duration);
      if (isNaN(d) || d < 0.5 || d > 3) {
        return res.status(400).json({ error: 'page_loader_duration skal være mellem 0,5 og 3 sekunder' });
      }
    }

    // Whitelist of columns that exist in design_settings (DB has no color_neutral_400/500)
    const allowedColumns = new Set([
      'color_primary', 'color_primary_hover', 'color_primary_light',
      'color_secondary', 'color_secondary_hover', 'color_secondary_light',
      'color_accent', 'color_accent_hover',
      'color_neutral_50', 'color_neutral_100', 'color_neutral_200', 'color_neutral_300',
      'color_neutral_600', 'color_neutral_700', 'color_neutral_800', 'color_neutral_900',
      'font_heading', 'font_body', 'font_size_base', 'border_radius', 'shadow_style',
      'theme_mode',
      'feature_smooth_scroll', 'feature_grain_overlay', 'feature_page_loader', 'feature_sticky_header',
      'page_loader_text', 'page_loader_show_logo', 'page_loader_duration'
    ]);

    const updates = [];
    const values = [];

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && key !== 'site_id' && key !== 'id' && allowedColumns.has(key)) {
        updates.push(`${key} = ?`);
        // Normalize feature toggles to 0/1 for MySQL TINYINT(1)
        const boolFields = ['feature_smooth_scroll', 'feature_grain_overlay', 'feature_page_loader', 'feature_sticky_header', 'page_loader_show_logo'];
        if (boolFields.includes(key)) {
          values.push(value === true || value === 1 || value === '1' ? 1 : 0);
        } else if (key === 'page_loader_duration') {
          values.push(Math.min(3, Math.max(0.5, parseFloat(value) || 2.5)));
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Ingen felter at opdatere' });
    }

    // Add updated_by and WHERE clause
    updates.push('updated_by = ?');
    values.push(req.user.id);
    values.push(1); // site_id

    await pool.execute(
      `UPDATE design_settings SET ${updates.join(', ')} WHERE site_id = ?`,
      values
    );

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'design.settings.update',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ changed_fields: Object.keys(req.body) })
      ]
    );

    // Fetch and return updated settings
    const [rows] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );

    res.json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error('Error updating design settings:', error.message);
    res.status(500).json({ error: 'Kunne ikke opdatere design indstillinger' });
  }
});

// POST /design-settings/apply-preset — Apply a theme preset
router.post('/apply-preset', requireAuth, async (req, res) => {
  try {
    const { preset_id } = req.body;

    if (!preset_id) {
      return res.status(400).json({ error: 'preset_id er påkrævet' });
    }

    // Fetch preset
    const [presets] = await pool.execute(
      'SELECT * FROM theme_presets WHERE id = ?',
      [preset_id]
    );

    if (presets.length === 0) {
      return res.status(404).json({ error: 'Tema preset ikke fundet' });
    }

    const preset = presets[0];
    const settings = JSON.parse(preset.settings);
    const presetName = String(preset.name || '').toLowerCase();
    const presetLabel = String(preset.label_da || '').toLowerCase();
    const inferredModern =
      presetName.includes('modern') ||
      presetName.includes('minimal') ||
      presetLabel.includes('modern') ||
      presetLabel.includes('minimal');
    const presetThemeMode = settings.theme_mode || (inferredModern ? 'modern' : 'simple');

    // Apply preset settings
    const updates = [];
    const values = [];

    Object.entries(settings).forEach(([key, value]) => {
      if (key === 'theme_mode') return;
      updates.push(`${key} = ?`);
      values.push(value);
    });

    updates.push('active_preset_id = ?');
    values.push(preset_id);
    updates.push('theme_mode = ?');
    values.push(presetThemeMode);
    updates.push('updated_by = ?');
    values.push(req.user.id);
    values.push(1); // site_id

    await pool.execute(
      `UPDATE design_settings SET ${updates.join(', ')} WHERE site_id = ?`,
      values
    );

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'design.preset.apply',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ preset_id, preset_name: preset.name })
      ]
    );

    // Fetch and return updated settings
    const [rows] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );

    res.json({ ok: true, data: rows[0], preset: preset.name });
  } catch (error) {
    console.error('Error applying preset:', error.message);
    res.status(500).json({ error: 'Kunne ikke anvende tema preset' });
  }
});

module.exports = router;

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

    // Whitelist of columns that exist in design_settings (DB has no color_neutral_400/500)
    const allowedColumns = new Set([
      'color_primary', 'color_primary_hover', 'color_primary_light',
      'color_secondary', 'color_secondary_hover', 'color_secondary_light',
      'color_accent', 'color_accent_hover',
      'color_neutral_50', 'color_neutral_100', 'color_neutral_200', 'color_neutral_300',
      'color_neutral_600', 'color_neutral_700', 'color_neutral_800', 'color_neutral_900',
      'font_heading', 'font_body', 'font_size_base', 'border_radius', 'shadow_style'
    ]);

    const updates = [];
    const values = [];

    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && key !== 'site_id' && key !== 'id' && allowedColumns.has(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
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

    // Apply preset settings
    const updates = [];
    const values = [];

    Object.entries(settings).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      values.push(value);
    });

    updates.push('active_preset_id = ?');
    values.push(preset_id);
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

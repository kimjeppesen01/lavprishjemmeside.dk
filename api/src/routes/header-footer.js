const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const DEFAULT_MENU_1 = [{ href: '/', label: 'Forside' }, { href: '/priser', label: 'Priser' }, { href: '/om-os', label: 'Om os' }, { href: '/kontakt', label: 'Kontakt' }];
const DEFAULT_MENU_2 = [{ href: '/kontakt', label: 'Få et tilbud' }];
const DEFAULT_FOOTER = [
  { title: 'lavprishjemmeside.dk', text: 'Professionelle hjemmesider til lav pris for danske virksomheder.' },
  { title: 'Sider', links: [{ href: '/', label: 'Forside' }, { href: '/priser', label: 'Priser' }, { href: '/om-os', label: 'Om os' }, { href: '/kontakt', label: 'Kontakt' }] },
  { title: 'Kontakt', links: [{ href: 'mailto:info@lavprishjemmeside.dk', label: 'info@lavprishjemmeside.dk' }] },
];

function parseJsonField(val, fallback) {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function parseMegaMenu(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'object' && Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

// GET /header-footer — Authenticated
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM header_footer_settings WHERE site_id = 1');
    if (rows.length === 0) {
      return res.json({
        header_layout: 'regular',
        header_logo_url: '/favicon.svg',
        header_logo_text: 'lavprishjemmeside.dk',
        header_menu_1: DEFAULT_MENU_1,
        header_menu_2: DEFAULT_MENU_2,
        header_mega_html: null,
        header_mega_menu: null,
        footer_columns: DEFAULT_FOOTER,
        footer_copyright: null,
      });
    }
    const r = rows[0];
    res.json({
      ...r,
      header_menu_1: parseJsonField(r.header_menu_1, DEFAULT_MENU_1),
      header_menu_2: parseJsonField(r.header_menu_2, DEFAULT_MENU_2),
      header_mega_menu: parseMegaMenu(r.header_mega_menu),
      footer_columns: parseJsonField(r.footer_columns, DEFAULT_FOOTER),
    });
  } catch (error) {
    console.error('Error fetching header-footer:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente indstillinger' });
  }
});

// GET /header-footer/public — Build-time (no auth)
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM header_footer_settings WHERE site_id = 1');
    if (rows.length === 0) {
      return res.json({
        header_layout: 'regular',
        header_logo_url: '/favicon.svg',
        header_logo_text: 'lavprishjemmeside.dk',
        header_menu_1: DEFAULT_MENU_1,
        header_menu_2: DEFAULT_MENU_2,
        header_mega_html: null,
        header_mega_menu: null,
        footer_columns: DEFAULT_FOOTER,
        footer_copyright: null,
      });
    }
    const r = rows[0];
    res.json({
      ...r,
      header_menu_1: parseJsonField(r.header_menu_1, DEFAULT_MENU_1),
      header_menu_2: parseJsonField(r.header_menu_2, DEFAULT_MENU_2),
      header_mega_menu: parseMegaMenu(r.header_mega_menu),
      footer_columns: parseJsonField(r.footer_columns, DEFAULT_FOOTER),
    });
  } catch (error) {
    console.error('Error fetching public header-footer:', error.message);
    // Return defaults on error (e.g. table not created yet)
    res.status(200).json({
      header_layout: 'regular',
      header_logo_url: '/favicon.svg',
      header_logo_text: 'lavprishjemmeside.dk',
      header_menu_1: DEFAULT_MENU_1,
      header_menu_2: DEFAULT_MENU_2,
      header_mega_html: null,
      footer_columns: DEFAULT_FOOTER,
      footer_copyright: null,
    });
  }
});

// POST /header-footer/update — Authenticated
router.post('/update', requireAuth, async (req, res) => {
  try {
    const {
      header_layout,
      header_logo_url,
      header_logo_text,
      header_menu_1,
      header_menu_2,
      header_mega_html,
      header_mega_menu,
      footer_columns,
      footer_copyright,
    } = req.body;

    if (header_layout && !['regular', 'modern', 'mega', 'modern-mega'].includes(header_layout)) {
      return res.status(400).json({ error: 'Ugyldig header_layout' });
    }

    const menu1 = Array.isArray(header_menu_1) ? header_menu_1 : parseJsonField(header_menu_1, DEFAULT_MENU_1);
    const menu2 = Array.isArray(header_menu_2) ? header_menu_2 : parseJsonField(header_menu_2, DEFAULT_MENU_2);
    const footer = Array.isArray(footer_columns) ? footer_columns : parseJsonField(footer_columns, DEFAULT_FOOTER);
    const megaMenu = header_mega_menu != null && Array.isArray(header_mega_menu) ? header_mega_menu : null;

    const [existing] = await pool.execute('SELECT id FROM header_footer_settings WHERE site_id = 1');
    const payload = {
      header_layout: header_layout ?? 'regular',
      header_logo_url: header_logo_url ?? '/favicon.svg',
      header_logo_text: (header_logo_text ?? 'lavprishjemmeside.dk').slice(0, 100),
      header_menu_1: JSON.stringify(menu1),
      header_menu_2: JSON.stringify(menu2),
      header_mega_html: header_mega_html ?? null,
      header_mega_menu: megaMenu ? JSON.stringify(megaMenu) : null,
      footer_columns: JSON.stringify(footer),
      footer_copyright: (footer_copyright ?? '').slice(0, 255) || null,
      updated_by: req.user.id,
    };

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE header_footer_settings SET
          header_layout = ?, header_logo_url = ?, header_logo_text = ?,
          header_menu_1 = ?, header_menu_2 = ?, header_mega_html = ?, header_mega_menu = ?,
          footer_columns = ?, footer_copyright = ?, updated_by = ?
        WHERE site_id = 1`,
        [payload.header_layout, payload.header_logo_url, payload.header_logo_text, payload.header_menu_1, payload.header_menu_2, payload.header_mega_html, payload.header_mega_menu, payload.footer_columns, payload.footer_copyright, payload.updated_by]
      );
    } else {
      await pool.execute(
        `INSERT INTO header_footer_settings (site_id, header_layout, header_logo_url, header_logo_text, header_menu_1, header_menu_2, header_mega_html, header_mega_menu, footer_columns, footer_copyright, updated_by)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payload.header_layout, payload.header_logo_url, payload.header_logo_text, payload.header_menu_1, payload.header_menu_2, payload.header_mega_html, payload.header_mega_menu, payload.footer_columns, payload.footer_copyright, payload.updated_by]
      );
    }

    const [rows] = await pool.execute('SELECT * FROM header_footer_settings WHERE site_id = 1');
    const r = rows[0] || {};
    res.json({
      ok: true,
      data: {
        ...r,
        header_menu_1: parseJsonField(r.header_menu_1, DEFAULT_MENU_1),
        header_menu_2: parseJsonField(r.header_menu_2, DEFAULT_MENU_2),
        header_mega_menu: parseMegaMenu(r.header_mega_menu),
        footer_columns: parseJsonField(r.footer_columns, DEFAULT_FOOTER),
      },
    });
  } catch (error) {
    console.error('Error updating header-footer:', error.message);
    res.status(500).json({ error: 'Kunne ikke opdatere indstillinger' });
  }
});

module.exports = router;

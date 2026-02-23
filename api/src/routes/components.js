const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// GET /components — List all components (authenticated)
// Query: category=…, source=library|custom|all (default all)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, source: sourceFilter } = req.query;

    const baseCols = `id, slug, name_da AS name, description_da AS description, category, schema_fields AS default_props, doc_path AS documentation`;
    let query = `SELECT ${baseCols}, source, created_at, updated_at FROM components WHERE is_active = 1`;
    const params = [];

    if (sourceFilter && sourceFilter !== 'all') {
      query += ' AND source = ?';
      params.push(sourceFilter);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY sort_order ASC, name_da ASC';

    let rows;
    try {
      [rows] = await pool.execute(query, params);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage && err.sqlMessage.includes('source')) {
        query = `SELECT ${baseCols}, created_at, updated_at FROM components WHERE is_active = 1`;
        const paramsFallback = [];
        if (sourceFilter && sourceFilter !== 'all') {
          query += sourceFilter === 'custom' ? " AND slug LIKE 'custom/%'" : " AND (slug NOT LIKE 'custom/%' OR slug IS NULL)";
        }
        if (category) {
          query += ' AND category = ?';
          paramsFallback.push(category);
        }
        query += ' ORDER BY sort_order ASC, name_da ASC';
        const [r] = await pool.execute(query, paramsFallback);
        rows = (r || []).map((row) => ({ ...row, source: row.slug && String(row.slug).startsWith('custom/') ? 'custom' : 'library' }));
      } else {
        throw err;
      }
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching components:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Kunne ikke hente komponenter', debug: error.message });
  }
});

// POST /components/register-custom — Register a custom component (slug must be custom/<kebab-name>)
router.post('/register-custom', requireAuth, async (req, res) => {
  try {
    const { slug, name_da, description_da, category, schema_fields, default_content } = req.body;
    if (!slug || !String(slug).startsWith('custom/')) {
      return res.status(400).json({ error: 'slug er påkrævet og skal starte med custom/' });
    }
    const name = name_da || slug.replace('custom/', '').replace(/-/g, ' ');
    const desc = description_da || 'Egen komponent';
    const cat = category || 'content';
    const schema = schema_fields ? JSON.stringify(schema_fields) : JSON.stringify({});
    const def = default_content ? JSON.stringify(default_content) : JSON.stringify({});
    await pool.execute(
      `INSERT INTO components (slug, source, name_da, description_da, category, tier, schema_fields, default_content, doc_path, is_active, sort_order)
       VALUES (?, 'custom', ?, ?, ?, 1, ?, ?, ?, 1, 999)`,
      [slug, name, desc, cat, schema, def, `${slug.replace('/', '-')}.md`]
    );
    const [rows] = await pool.execute('SELECT id, slug, name_da, source FROM components WHERE slug = ?', [slug]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Komponenten findes allerede' });
    }
    console.error('Error registering custom component:', error.message);
    res.status(500).json({ error: 'Kunne ikke registrere komponent', debug: error.message });
  }
});

// GET /components/:slug — Get single component with full schema
router.get('/:slug', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM components WHERE slug = ?',
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    const component = rows[0];

    // Parse JSON props_schema if it's a string
    if (typeof component.props_schema === 'string') {
      component.props_schema = JSON.parse(component.props_schema);
    }

    res.json(component);
  } catch (error) {
    console.error('Error fetching component:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente komponent' });
  }
});

// GET /components/:slug/doc — Return the markdown documentation file
router.get('/:slug/doc', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const docPath = path.join(__dirname, '../component-docs', `${slug}.md`);

    if (!fs.existsSync(docPath)) {
      return res.status(404).json({ error: 'Dokumentation ikke fundet' });
    }

    const docContent = fs.readFileSync(docPath, 'utf-8');

    res.json({ slug, content: docContent });
  } catch (error) {
    console.error('Error fetching component documentation:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente dokumentation' });
  }
});

module.exports = router;

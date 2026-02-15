const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// GET /components — List all components (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category } = req.query;

    let query = `SELECT
      id, slug,
      name_da AS name,
      description_da AS description,
      category,
      schema_fields AS default_props,
      doc_path AS documentation,
      created_at, updated_at
    FROM components WHERE is_active = 1`;
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY sort_order ASC, name_da ASC';

    const [rows] = await pool.execute(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching components:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Kunne ikke hente komponenter', debug: error.message });
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

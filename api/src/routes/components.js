const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// GET /components — List all active components
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT id, slug, name_da, description_da, category, tier, seo_heading_level, seo_schema_type, is_active, sort_order FROM components WHERE is_active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, sort_order ASC';

    const [rows] = await pool.execute(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching components:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente komponenter' });
  }
});

// GET /components/:slug — Get single component with full schema
router.get('/:slug', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM components WHERE slug = ? AND is_active = 1',
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    const component = rows[0];

    // Parse JSON fields
    component.schema_fields = JSON.parse(component.schema_fields);
    component.default_content = JSON.parse(component.default_content);

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

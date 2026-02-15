const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /page-components?page=/ — Get components for a page (ordered)
// GET /page-components?page=all — Get all (admin pages list)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page } = req.query;

    if (!page) {
      return res.status(400).json({ error: 'page query parameter er påkrævet' });
    }

    let query, params;
    if (page === 'all') {
      query = `SELECT pc.*, c.slug, c.name_da, c.category
               FROM page_components pc
               JOIN components c ON pc.component_id = c.id
               ORDER BY pc.page_path ASC, pc.sort_order ASC`;
      params = [];
    } else {
      query = `SELECT pc.*, c.slug, c.name_da, c.category
               FROM page_components pc
               JOIN components c ON pc.component_id = c.id
               WHERE pc.page_path = ?
               ORDER BY pc.sort_order ASC`;
      params = [page];
    }

    const [rows] = await pool.execute(query, params);

    // Parse JSON content field (resilient to invalid JSON)
    const components = rows.map(row => {
      let content = {};
      try {
        content = row.content ? JSON.parse(row.content) : {};
      } catch (e) {
        console.warn(`Invalid content JSON for page_component id=${row.id}:`, e.message);
      }
      return {
        ...row,
        page_path: (row.page_path || '').trim(),
        content,
      };
    });

    res.json(components);
  } catch (error) {
    console.error('Error fetching page components:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente side komponenter' });
  }
});

// GET /page-components/public?page=/ — Published components only (for build-time)
// GET /page-components/public?page=all — All published components from all pages
router.get('/public', async (req, res) => {
  try {
    const { page } = req.query;

    if (!page) {
      return res.status(400).json({ error: 'page query parameter er påkrævet' });
    }

    let query, params;

    if (page === 'all') {
      // Return all published components from all pages
      query = `SELECT pc.*, c.slug, c.name_da, c.category
               FROM page_components pc
               JOIN components c ON pc.component_id = c.id
               WHERE pc.is_published = 1
               ORDER BY pc.page_path ASC, pc.sort_order ASC`;
      params = [];
    } else {
      // Return published components for specific page
      query = `SELECT pc.*, c.slug, c.name_da, c.category
               FROM page_components pc
               JOIN components c ON pc.component_id = c.id
               WHERE pc.page_path = ? AND pc.is_published = 1
               ORDER BY pc.sort_order ASC`;
      params = [page];
    }

    const [rows] = await pool.execute(query, params);

    // Parse JSON content field (resilient to invalid JSON)
    const components = rows.map(row => {
      let content = {};
      try {
        content = row.content ? JSON.parse(row.content) : {};
      } catch (e) {
        console.warn(`Invalid content JSON for page_component id=${row.id}:`, e.message);
      }
      return {
        ...row,
        page_path: (row.page_path || '').trim(),
        content,
      };
    });

    res.json(components);
  } catch (error) {
    console.error('Error fetching public page components:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente side komponenter' });
  }
});

// POST /page-components — Add component to page
router.post('/', requireAuth, async (req, res) => {
  try {
    const { page_path, component_id, content, sort_order, heading_level_override } = req.body;

    if (!page_path || !component_id || !content) {
      return res.status(400).json({ error: 'page_path, component_id og content er påkrævet' });
    }

    // Verify component exists
    const [components] = await pool.execute(
      'SELECT id FROM components WHERE id = ? AND is_active = 1',
      [component_id]
    );

    if (components.length === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    // Insert page component
    const [result] = await pool.execute(
      `INSERT INTO page_components
       (page_path, component_id, content, sort_order, heading_level_override, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        page_path,
        component_id,
        JSON.stringify(content),
        sort_order || 0,
        heading_level_override || null,
        req.user.id
      ]
    );

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page_component.create',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ page_path, component_id, inserted_id: result.insertId })
      ]
    );

    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    console.error('Error creating page component:', error.message);
    res.status(500).json({ error: 'Kunne ikke oprette komponent' });
  }
});

// POST /page-components/update — Update component content
router.post('/update', requireAuth, async (req, res) => {
  try {
    const { id, content, heading_level_override } = req.body;

    if (!id || !content) {
      return res.status(400).json({ error: 'id og content er påkrævet' });
    }

    const [result] = await pool.execute(
      `UPDATE page_components
       SET content = ?, heading_level_override = ?
       WHERE id = ?`,
      [JSON.stringify(content), heading_level_override || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page_component.update',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ id })
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating page component:', error.message);
    res.status(500).json({ error: 'Kunne ikke opdatere komponent' });
  }
});

// POST /page-components/reorder — Change sort_order
router.post('/reorder', requireAuth, async (req, res) => {
  try {
    const { id, sort_order } = req.body;

    if (!id || sort_order === undefined) {
      return res.status(400).json({ error: 'id og sort_order er påkrævet' });
    }

    const [result] = await pool.execute(
      'UPDATE page_components SET sort_order = ? WHERE id = ?',
      [sort_order, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page_component.reorder',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ id, sort_order })
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error reordering page component:', error.message);
    res.status(500).json({ error: 'Kunne ikke omorganisere komponent' });
  }
});

// POST /page-components/delete — Remove component from page
router.post('/delete', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'id er påkrævet' });
    }

    const [result] = await pool.execute(
      'DELETE FROM page_components WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page_component.delete',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ id })
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting page component:', error.message);
    res.status(500).json({ error: 'Kunne ikke slette komponent' });
  }
});

// POST /page-components/publish-page — Publish all components for a page (by path)
router.post('/publish-page', requireAuth, async (req, res) => {
  try {
    const page_path = (req.body.page_path || '').trim();
    if (!page_path) {
      return res.status(400).json({ error: 'page_path er påkrævet' });
    }

    const [result] = await pool.execute(
      `UPDATE page_components SET is_published = 1 
       WHERE TRIM(page_path) = ?`,
      [page_path]
    );

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page.publish',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ page_path, count: result.affectedRows })
      ]
    );

    res.json({ ok: true, count: result.affectedRows });
  } catch (error) {
    console.error('Error publishing page:', error.message);
    res.status(500).json({ error: 'Kunne ikke publicere side' });
  }
});

// POST /page-components/publish — Toggle published status (single component)
router.post('/publish', requireAuth, async (req, res) => {
  try {
    const { id, is_published } = req.body;

    if (!id || is_published === undefined) {
      return res.status(400).json({ error: 'id og is_published er påkrævet' });
    }

    const [result] = await pool.execute(
      'UPDATE page_components SET is_published = ? WHERE id = ?',
      [is_published ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Komponent ikke fundet' });
    }

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        is_published ? 'page_component.publish' : 'page_component.unpublish',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ id })
      ]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error publishing page component:', error.message);
    res.status(500).json({ error: 'Kunne ikke publicere komponent' });
  }
});

// POST /page-components/delete-page — Delete entire page (all components)
router.post('/delete-page', requireAuth, async (req, res) => {
  try {
    const { page_path } = req.body;

    if (!page_path) {
      return res.status(400).json({ error: 'page_path er påkrævet' });
    }

    // Get count before deletion for logging
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM page_components WHERE page_path = ?',
      [page_path]
    );

    const componentCount = countResult[0].count;

    if (componentCount === 0) {
      return res.status(404).json({ error: 'Ingen komponenter fundet for denne side' });
    }

    // Delete all components for this page
    const [result] = await pool.execute(
      'DELETE FROM page_components WHERE page_path = ?',
      [page_path]
    );

    // Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'page.delete',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ page_path, components_deleted: result.affectedRows })
      ]
    );

    res.json({
      ok: true,
      message: `Deleted ${result.affectedRows} component(s) from page ${page_path}`,
      deleted_count: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting page:', error.message);
    res.status(500).json({ error: 'Kunne ikke slette siden' });
  }
});

// ── Page Meta (SEO) endpoints ──

// GET /page-components/public-meta?page=all — Public: all page meta for build
router.get('/public-meta', async (req, res) => {
  try {
    const { page } = req.query;

    if (!page) {
      return res.status(400).json({ error: 'page query parameter er påkrævet' });
    }

    let query, params;

    if (page === 'all') {
      query = 'SELECT page_path, meta_title, meta_description, og_image, schema_markup FROM page_meta';
      params = [];
    } else {
      query = 'SELECT page_path, meta_title, meta_description, og_image, schema_markup FROM page_meta WHERE page_path = ?';
      params = [page];
    }

    const [rows] = await pool.execute(query, params);

    // Return as a map keyed by page_path
    const result = {};
    for (const row of rows) {
      let schemaMarkup = row.schema_markup;
      if (typeof schemaMarkup === 'string') {
        try { schemaMarkup = JSON.parse(schemaMarkup); } catch (_) { schemaMarkup = null; }
      }
      result[row.page_path] = {
        meta_title: row.meta_title,
        meta_description: row.meta_description,
        og_image: row.og_image,
        schema_markup: schemaMarkup
      };
    }

    res.json(result);
  } catch (error) {
    // Table may not exist yet — return empty
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({});
    }
    console.error('Error fetching public page meta:', error.message);
    res.status(500).json({ error: 'Fejl ved hentning af side-meta' });
  }
});

// GET /page-components/page-meta?page=/priser — Admin: get meta for one page
router.get('/page-meta', requireAuth, async (req, res) => {
  try {
    const { page } = req.query;

    if (!page) {
      return res.status(400).json({ error: 'page query parameter er påkrævet' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM page_meta WHERE page_path = ?',
      [page]
    );

    if (rows.length === 0) {
      return res.json({ page_path: page, meta_title: null, meta_description: null, og_image: null, schema_markup: null });
    }

    const row = rows[0];
    let schemaMarkup = row.schema_markup;
    if (typeof schemaMarkup === 'string') {
      try { schemaMarkup = JSON.parse(schemaMarkup); } catch (_) { schemaMarkup = null; }
    }

    res.json({
      ...row,
      schema_markup: schemaMarkup
    });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ page_path: req.query.page, meta_title: null, meta_description: null, og_image: null, schema_markup: null });
    }
    console.error('Error fetching page meta:', error.message);
    res.status(500).json({ error: 'Fejl ved hentning af side-meta' });
  }
});

// POST /page-components/page-meta/update — Admin: upsert page meta
router.post('/page-meta/update', requireAuth, async (req, res) => {
  try {
    const { page_path, meta_title, meta_description, og_image, schema_markup } = req.body;

    if (!page_path) {
      return res.status(400).json({ error: 'page_path er påkrævet' });
    }

    const schemaJson = schema_markup ? JSON.stringify(schema_markup) : null;

    await pool.execute(
      `INSERT INTO page_meta (page_path, meta_title, meta_description, og_image, schema_markup, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         meta_title = VALUES(meta_title),
         meta_description = VALUES(meta_description),
         og_image = VALUES(og_image),
         schema_markup = VALUES(schema_markup)`,
      [page_path.trim(), meta_title || null, meta_description || null, og_image || null, schemaJson, req.user.id]
    );

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['page_meta.update', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ page_path })]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating page meta:', error.message);
    res.status(500).json({ error: 'Fejl ved opdatering af side-meta' });
  }
});

module.exports = router;

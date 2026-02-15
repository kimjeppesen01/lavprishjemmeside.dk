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

    // Parse JSON content field
    const components = rows.map(row => ({
      ...row,
      content: JSON.parse(row.content)
    }));

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

    // Parse JSON content field
    const components = rows.map(row => ({
      ...row,
      content: JSON.parse(row.content)
    }));

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

// POST /page-components/publish — Toggle published status
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

module.exports = router;

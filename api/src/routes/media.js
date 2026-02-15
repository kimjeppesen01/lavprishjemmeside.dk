const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(require('os').homedir(), 'lavprishjemmeside.dk', 'uploads');
const UPLOAD_URL_BASE = process.env.UPLOAD_URL_BASE || 'https://lavprishjemmeside.dk/uploads';

// Ensure upload directory exists
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.error('Could not create upload directory:', UPLOAD_DIR, err.message);
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Kun billeder er tilladt (JPEG, PNG, GIF, WebP, SVG)'));
    }
  }
});

// POST /media/upload — Upload one or more images
router.post('/upload', requireAuth, function (req, res, next) {
  upload.array('files', 10)(req, res, function (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fil er for stor (maks 5MB)' });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Ingen filer uploadet' });
    }

    const altText = req.body.alt_text || '';
    const results = [];

    for (const file of req.files) {
      const [result] = await pool.execute(
        'INSERT INTO media (filename, original_name, mime_type, file_size, alt_text, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [file.filename, file.originalname, file.mimetype, file.size, altText, req.user.id]
      );

      results.push({
        id: result.insertId,
        filename: file.filename,
        url: UPLOAD_URL_BASE + '/' + file.filename,
        original_name: file.originalname,
        alt_text: altText
      });
    }

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['media.upload', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ count: results.length })]
    );

    res.json({ ok: true, files: results });
  } catch (err) {
    console.error('Media upload error:', err.message);
    res.status(500).json({ error: 'Fejl ved upload af billeder' });
  }
});

// GET /media — List all media (with optional search)
router.get('/', requireAuth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    let query, params;

    if (search) {
      const like = '%' + search + '%';
      query = 'SELECT * FROM media WHERE alt_text LIKE ? OR original_name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [like, like, limit, offset];
    } else {
      query = 'SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [limit, offset];
    }

    const [rows] = await pool.execute(query, params);

    const media = rows.map(row => ({
      ...row,
      url: UPLOAD_URL_BASE + '/' + row.filename
    }));

    res.json(media);
  } catch (err) {
    console.error('Media list error:', err.message);
    res.status(500).json({ error: 'Fejl ved hentning af medier' });
  }
});

// POST /media/update — Update alt text
router.post('/update', requireAuth, async (req, res) => {
  try {
    const { id, alt_text } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Manglende id' });
    }

    await pool.execute('UPDATE media SET alt_text = ? WHERE id = ?', [alt_text || '', id]);

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['media.update', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ media_id: id })]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Media update error:', err.message);
    res.status(500).json({ error: 'Fejl ved opdatering' });
  }
});

// POST /media/delete — Delete media file and DB record
router.post('/delete', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Manglende id' });
    }

    const [rows] = await pool.execute('SELECT filename FROM media WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Medie ikke fundet' });
    }

    const filePath = path.join(UPLOAD_DIR, rows[0].filename);
    try {
      fs.unlinkSync(filePath);
    } catch (fsErr) {
      console.warn('Could not delete file:', filePath, fsErr.message);
    }

    await pool.execute('DELETE FROM media WHERE id = ?', [id]);

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['media.delete', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ media_id: id, filename: rows[0].filename })]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Media delete error:', err.message);
    res.status(500).json({ error: 'Fejl ved sletning' });
  }
});

// Helper for AI context — returns available images with alt text
async function getMediaForAi() {
  try {
    const [rows] = await pool.execute(
      "SELECT id, filename, alt_text FROM media WHERE alt_text != '' AND alt_text IS NOT NULL ORDER BY created_at DESC LIMIT 100"
    );
    return rows.map(row => ({
      url: UPLOAD_URL_BASE + '/' + row.filename,
      alt: row.alt_text
    }));
  } catch (err) {
    console.warn('getMediaForAi error:', err.message);
    return [];
  }
}

module.exports = router;
module.exports.getMediaForAi = getMediaForAi;

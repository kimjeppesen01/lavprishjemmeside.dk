/**
 * Pexels API client for search, download, and media registration.
 * Single-responsibility: API calls, rate limiting, image download, DB insert.
 *
 * See PEXELS_AUTOMATION_PLAN.md for full spec.
 */

const path = require('path');
const fs = require('fs');
const pool = require('../db');

const PEXELS_BASE = 'https://api.pexels.com/v1';
const API_KEY = process.env.PEXELS_API_KEY;
const LOCALE = process.env.PEXELS_DEFAULT_LOCALE || 'da-DK';
const MAX_FILE_MB = parseInt(process.env.PEXELS_MAX_FILE_SIZE_MB, 10) || 15;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(require('os').homedir(), 'lavprishjemmeside.dk', 'uploads');
const UPLOAD_URL_BASE = process.env.UPLOAD_URL_BASE || 'https://lavprishjemmeside.dk/uploads';

const STATE_DIR = path.join(__dirname, '../../state');
const BUDGET_FILE = path.join(STATE_DIR, 'pexels-rate-budget.json');

// --- Rate budget (in-memory + persisted) ---

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadRateBudget() {
  ensureStateDir();
  try {
    const data = fs.readFileSync(BUDGET_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveRateBudget(budget) {
  ensureStateDir();
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2), 'utf-8');
}

function getRateBudget() {
  const b = loadRateBudget();
  if (!b) return { remaining: 999, reset: Math.floor(Date.now() / 1000) + 3600 };
  if (Date.now() >= (b.reset || 0) * 1000) {
    return { remaining: 200, reset: Math.floor(Date.now() / 1000) + 3600 };
  }
  return b;
}

function updateRateBudget(remaining, reset) {
  const budget = {
    remaining: remaining != null ? remaining : getRateBudget().remaining - 1,
    reset: reset != null ? reset : getRateBudget().reset,
    last_updated: new Date().toISOString(),
  };
  saveRateBudget(budget);
  return budget;
}

// --- slugify (Danish-aware) ---

function slugify(str) {
  if (!str || typeof str !== 'string') return 'image';
  const map = { æ: 'ae', ø: 'oe', å: 'aa', Æ: 'ae', Ø: 'oe', Å: 'aa' };
  let s = str.trim().toLowerCase();
  for (const [k, v] of Object.entries(map)) s = s.replace(new RegExp(k, 'g'), v);
  s = s.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'image';
}

// --- searchPhotos ---

async function searchPhotos(opts = {}) {
  const {
    query,
    page = 1,
    per_page = 15,
    locale = LOCALE,
    orientation,
    size,
  } = opts;

  if (!API_KEY) {
    throw new Error('PEXELS_API_KEY is not set');
  }

  const budget = getRateBudget();
  if (budget.remaining <= 0 && Date.now() < budget.reset * 1000) {
    throw new Error('Pexels rate limit exceeded. Wait until reset.');
  }

  const params = new URLSearchParams({
    query: query || 'nature',
    page: String(page),
    per_page: String(Math.min(per_page, 80)),
    locale,
  });
  if (orientation) params.set('orientation', orientation);
  if (size) params.set('size', size);

  const url = `${PEXELS_BASE}/search?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: API_KEY },
  });

  if (res.status === 429) {
    const reset = parseInt(res.headers.get('x-ratelimit-reset'), 10) || Math.floor(Date.now() / 1000) + 60;
    updateRateBudget(0, reset);
    throw new Error('Pexels rate limit (429). Pause until reset.');
  }

  if (!res.ok) {
    throw new Error(`Pexels API error: ${res.status} ${res.statusText}`);
  }

  const remaining = parseInt(res.headers.get('x-ratelimit-remaining'), 10);
  const reset = parseInt(res.headers.get('x-ratelimit-reset'), 10);
  if (remaining != null) {
    updateRateBudget(remaining, reset);
  }

  const data = await res.json();
  return {
    photos: data.photos || [],
    total_results: data.total_results || 0,
    page: data.page || 1,
    per_page: data.per_page || per_page,
    rate_limit: { remaining: getRateBudget().remaining, reset: getRateBudget().reset },
  };
}

// --- getPhotoById ---

async function getPhotoById(id) {
  if (!API_KEY) throw new Error('PEXELS_API_KEY is not set');

  const budget = getRateBudget();
  if (budget.remaining <= 0 && Date.now() < budget.reset * 1000) {
    throw new Error('Pexels rate limit exceeded.');
  }

  const res = await fetch(`${PEXELS_BASE}/photos/${id}`, {
    headers: { Authorization: API_KEY },
  });

  if (res.status === 429) {
    const reset = parseInt(res.headers.get('x-ratelimit-reset'), 10) || Math.floor(Date.now() / 1000) + 60;
    updateRateBudget(0, reset);
    throw new Error('Pexels rate limit (429).');
  }

  if (!res.ok) {
    throw new Error(`Pexels API error: ${res.status}`);
  }

  const remaining = parseInt(res.headers.get('x-ratelimit-remaining'), 10);
  const reset = parseInt(res.headers.get('x-ratelimit-reset'), 10);
  if (remaining != null) updateRateBudget(remaining, reset);

  return res.json();
}

// --- scoreAndSelectPhoto ---

async function scoreAndSelectPhoto(photos, orientation, uploadedBy = null) {
  if (!photos || photos.length === 0) return null;

  const existingIds = new Set();
  try {
    const ids = photos.map((p) => p.id).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT pexels_photo_id, id AS media_id FROM media WHERE pexels_photo_id IN (${placeholders})`,
        ids
      );
      for (const r of rows) {
        if (r.pexels_photo_id) existingIds.set(r.pexels_photo_id, r.media_id);
      }
    }
  } catch (e) {
    // ignore
  }

  let best = null;
  let bestScore = -1;

  for (const photo of photos) {
    const w = photo.width || 0;
    const h = photo.height || 0;
    const resolution = w * h;
    let score = (resolution > 0 ? Math.min(3, Math.log10(resolution) / 6) : 0) * 3;
    if (photo.alt && String(photo.alt).trim()) score += 2;

    const isLandscape = w >= h * 1.2;
    const isPortrait = h >= w * 1.2;
    const isSquare = Math.abs(w - h) / Math.max(w, h, 1) < 0.2;
    if (orientation === 'landscape' && isLandscape) score += 2;
    else if (orientation === 'portrait' && isPortrait) score += 2;
    else if (orientation === 'square' && isSquare) score += 2;

    if (!existingIds.has(photo.id)) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = photo;
    }
  }

  if (best && existingIds.has(best.id)) {
    return { alreadyInLibrary: true, media_id: existingIds.get(best.id), photo: best };
  }
  return best;
}

/** Return photos sorted by score (best first). For CLI batch ingestion. */
async function scoreAndRankPhotos(photos, orientation, uploadedBy = null) {
  if (!photos || photos.length === 0) return [];
  const existingIds = new Map();
  try {
    const ids = photos.map((p) => p.id).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT pexels_photo_id FROM media WHERE pexels_photo_id IN (${placeholders})`,
        ids
      );
      for (const r of rows) {
        if (r.pexels_photo_id) existingIds.set(r.pexels_photo_id, true);
      }
    }
  } catch (e) {
    // ignore
  }

  const scored = photos.map((photo) => {
    const w = photo.width || 0;
    const h = photo.height || 0;
    const resolution = w * h;
    let score = (resolution > 0 ? Math.min(3, Math.log10(resolution) / 6) : 0) * 3;
    if (photo.alt && String(photo.alt).trim()) score += 2;
    const isLandscape = w >= h * 1.2;
    const isPortrait = h >= w * 1.2;
    const isSquare = Math.abs(w - h) / Math.max(w, h, 1) < 0.2;
    if (orientation === 'landscape' && isLandscape) score += 2;
    else if (orientation === 'portrait' && isPortrait) score += 2;
    else if (orientation === 'square' && isSquare) score += 2;
    if (!existingIds.has(photo.id)) score += 1;
    return { photo, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.photo);
}

// --- downloadAndRegister ---

async function downloadAndRegister(opts) {
  const { photo, keyword, uploadedBy = null } = opts;
  if (!photo || !photo.id) throw new Error('Invalid photo object');

  // 1. Deduplication
  const [existing] = await pool.execute('SELECT id, filename FROM media WHERE pexels_photo_id = ?', [
    photo.id,
  ]);
  if (existing.length > 0) {
    const url = UPLOAD_URL_BASE + '/' + existing[0].filename;
    const row = existing[0];
    const [meta] = await pool.execute(
      'SELECT alt_text, width, height FROM media WHERE id = ?',
      [row.id]
    );
    return {
      media_id: row.id,
      filename: row.filename,
      url,
      alt_text: (meta[0] && meta[0].alt_text) || photo.alt || '',
      width: (meta[0] && meta[0].width) || photo.width,
      height: (meta[0] && meta[0].height) || photo.height,
    };
  }

  // 2. Pick URL: large2x preferred (940*2 ≈ 1880px)
  const src = photo.src || {};
  const downloadUrl = src.large2x || src.large || src.original;
  if (!downloadUrl) throw new Error('No download URL in photo');

  if (!downloadUrl.startsWith('https://images.pexels.com/')) {
    throw new Error('Invalid Pexels URL');
  }

  // 3. Stream download
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('image/')) throw new Error('Response is not an image');

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES) throw new Error(`File too large (max ${MAX_FILE_MB}MB)`);

  const ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : '.jpg';
  const w = photo.width || 0;
  const h = photo.height || 0;
  const slug = slugify(keyword || 'image').slice(0, 50);
  const filename = `${slug}--${photo.id}--${w}x${h}${ext}`;

  const filePath = path.join(UPLOAD_DIR, filename);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(filePath, buf);

  // 4. Insert into media
  const altText = (photo.alt && String(photo.alt).trim()) || '';
  const mimeType = ct.split(';')[0].trim() || 'image/jpeg';
  const photographerUrl = photo.photographer_url || '';
  const pageUrl = photo.url || `https://www.pexels.com/photo/${photo.id}/`;

  await pool.execute(
    `INSERT INTO media (
      filename, original_name, mime_type, file_size, alt_text,
      width, height, source, pexels_photo_id,
      pexels_photographer, pexels_photographer_url, pexels_page_url,
      tags, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pexels', ?, ?, ?, ?, ?, ?)`,
    [
      filename,
      filename,
      mimeType,
      buf.length,
      altText,
      w || null,
      h || null,
      photo.id,
      photo.photographer || null,
      photographerUrl || null,
      pageUrl || null,
      (keyword && String(keyword).trim()) || '',
      uploadedBy,
    ]
  );

  const [insertResult] = await pool.execute('SELECT LAST_INSERT_ID() AS id');
  const mediaId = insertResult[0]?.id;

  return {
    media_id: mediaId,
    filename,
    url: UPLOAD_URL_BASE + '/' + filename,
    alt_text: altText,
    width: w,
    height: h,
  };
}

// --- Tool handler for AI: search + download + return URL ---

async function handleSearchPexelsTool(args, uploadedBy = null) {
  const { query, orientation, size } = args || {};
  const result = await searchPhotos({ query: query || 'professional', orientation, size, per_page: 15 });
  const selected = await scoreAndSelectPhoto(result.photos, orientation, uploadedBy);

  if (!selected) {
    return { error: 'Ingen passende billeder fundet for søgningen.' };
  }

  if (selected.alreadyInLibrary && selected.media_id) {
    const [rows] = await pool.execute(
      'SELECT filename, alt_text, width, height FROM media WHERE id = ?',
      [selected.media_id]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        url: UPLOAD_URL_BASE + '/' + r.filename,
        alt_text: r.alt_text || '',
        width: r.width,
        height: r.height,
        media_id: selected.media_id,
      };
    }
  }

  const reg = await downloadAndRegister({
    photo: selected.photo || selected,
    keyword: query,
    uploadedBy,
  });
  return reg;
}

module.exports = {
  searchPhotos,
  getPhotoById,
  downloadAndRegister,
  slugify,
  scoreAndSelectPhoto,
  scoreAndRankPhotos,
  handleSearchPexelsTool,
  getRateBudget,
};

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireMaster } = require('../middleware/auth');
const { claudeRunRateLimiter } = require('../middleware/rateLimit');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Claude OAuth constants (extracted from claude CLI source)
const CLAUDE_OAUTH = {
  CLIENT_ID:    '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  REDIRECT_URI: 'https://platform.claude.com/oauth/code/callback',
  TOKEN_URL:    'https://platform.claude.com/v1/oauth/token',
  AUTH_URL:     'https://claude.ai/oauth/authorize',
  SCOPE:        'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers',
};

// Active claude CLI processes keyed by taskId
const activeTasks = new Map();
// Concurrency lock — one claude task at a time per server instance
let runningTaskId = null;
// Interactive auth session (claude auth login) — persists between SSE disconnect and code submission
let authSession = null;

// Repo path convention: /home/theartis/repositories/<domain>
const REPO_BASE = '/home/theartis/repositories';
const MASTER_STEP_UP_REQUIRED = process.env.MASTER_STEP_UP_REQUIRED === '1';
const MASTER_STEP_UP_TTL_MIN = Math.min(Math.max(parseInt(process.env.MASTER_STEP_UP_TTL_MIN || '30', 10), 5), 120);
const PLAN_MAX_CHARS = 24000;

const TASK_MD_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS kanban_task_md_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_task_file (task_id, file_path),
  INDEX idx_task_id (task_id)
)`;

async function getSitesRepoMap() {
  const [rows] = await pool.query('SELECT id, name, domain, api_url, admin_url FROM sites WHERE is_active = 1 ORDER BY id ASC');
  const map = {};
  const list = [];
  for (const r of rows) {
    const repoPath = `${REPO_BASE}/${r.domain}`;
    map[r.domain] = repoPath;
    map[String(r.id)] = repoPath;
    list.push({ id: r.id, name: r.name, domain: r.domain, repo_path: repoPath, api_url: r.api_url, admin_url: r.admin_url });
  }
  return { map, list };
}

// Path to the claude wrapper script (uses Node 22)
const CLAUDE_BIN = '/home/theartis/local/bin/claude';

// Model ID mapping for Claude Code CLI --model flag
const MODEL_MAP = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus:   'claude-opus-4-6',
};

function readStepUpToken(req) {
  const hdr = req.headers['x-master-step-up-token'];
  if (hdr) return String(hdr).trim();
  const auth = req.headers.authorization || '';
  if (auth.startsWith('MasterStepUp ')) return auth.slice('MasterStepUp '.length).trim();
  return null;
}

function verifyStepUpToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function requireMasterStepUp(req, res, next) {
  if (!MASTER_STEP_UP_REQUIRED) return next();
  const payload = verifyStepUpToken(readStepUpToken(req));
  if (!payload || payload.type !== 'master_step_up' || payload.user_id !== req.user?.id) {
    return res.status(403).json({ error: 'Step-up authentication required', code: 'STEP_UP_REQUIRED' });
  }
  next();
}

async function ensureTaskMdTable() {
  await pool.query(TASK_MD_TABLE_SQL);
}

function slugifyFilename(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'plan';
}

function normalizeRepoRelativeMdPath(repoRoot, relPath) {
  if (!relPath || typeof relPath !== 'string') return null;
  const clean = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean.toLowerCase().endsWith('.md')) return null;
  const abs = path.resolve(repoRoot, clean);
  const root = path.resolve(repoRoot);
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return { rel: clean, abs };
}

function gatherMdFiles(repoRoot) {
  // Canonical planning source for Claude task runs.
  const roots = ['tasks'];
  const files = [];
  for (const base of roots) {
    const start = path.join(repoRoot, base);
    if (!fs.existsSync(start)) continue;
    const stack = [start];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!e.isFile() || !e.name.toLowerCase().endsWith('.md')) continue;
        const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
        files.push(rel);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function buildPlanTemplate(task, repo, filePath) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `# Plan: ${task.title}`,
    '',
    `- Task ID: ${task.id}`,
    `- Version Target: ${task.version_target || '1.1.0'}`,
    `- Repository: ${repo}`,
    `- Plan File: ${filePath}`,
    `- Created: ${today}`,
    '',
    '## Scope',
    task.description || 'Define the exact scope for this task.',
    '',
    '## Constraints',
    '- Keep existing architecture patterns and security safeguards.',
    '- Avoid unrelated refactors.',
    '',
    '## Acceptance Criteria',
    '- [ ] UI flow is clear and deterministic',
    '- [ ] API validation prevents unscoped AI runs',
    '- [ ] Audit metadata is complete for post-mortem reviews',
    '',
    '## Risks',
    '- Missing linkage between task and plan file',
    '- Prompt context too large or irrelevant',
    '',
    '## Implementation Checklist',
    '- [ ] Backend endpoints implemented',
    '- [ ] Frontend flow implemented',
    '- [ ] Validation and error states handled',
    '- [ ] Basic manual test completed',
    '',
  ].join('\n');
}

// Strip ANSI escape codes from CLI output before sending to browser
function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*[mGKHFJA-Da-z]/g, '');
}

// Auth for IAN Python agent (no JWT needed)
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!process.env.MASTER_API_KEY || key !== process.env.MASTER_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Audit: log every /master/* request (user, path, method, ip, optional meta)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}

async function logMasterAudit(req, meta = {}) {
  const combined = { ...(req.masterAuditMeta || {}), ...meta };
  try {
    await pool.query(
      'INSERT INTO master_audit_log (user_id, email, path, method, meta, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user?.id ?? null,
        req.user?.email ?? null,
        (req.originalUrl || req.url || req.path || '').slice(0, 255),
        req.method,
        Object.keys(combined).length ? JSON.stringify(combined) : null,
        getClientIp(req),
      ]
    );
  } catch (err) {
    console.error('master_audit_log insert error:', err.message);
  }
}

router.use((req, res, next) => {
  req.masterAuditMeta = {};
  res.on('finish', () => { logMasterAudit(req).catch(() => {}); });
  next();
});

// Optional: restrict /master/* to specific IPs (MASTER_ALLOWED_IPS comma-separated)
const MASTER_ALLOWED_IPS = process.env.MASTER_ALLOWED_IPS
  ? process.env.MASTER_ALLOWED_IPS.split(',').map((s) => s.trim()).filter(Boolean)
  : null;
router.use((req, res, next) => {
  if (!MASTER_ALLOWED_IPS || MASTER_ALLOWED_IPS.length === 0) return next();
  const ip = getClientIp(req);
  if (ip && MASTER_ALLOWED_IPS.includes(ip)) return next();
  return res.status(403).json({ error: 'Access denied', code: 'IP_NOT_ALLOWED' });
});

// Open a short-lived connection to a remote site DB
async function siteConn(site) {
  return mysql.createConnection({
    host: site.db_host || '127.0.0.1',
    user: site.db_user,
    password: site.db_password,
    database: site.db_name,
    connectTimeout: 5000,
  });
}

// ─── Master check (no requireMaster — so non-master can learn they lack access) ───

// GET /master/me — returns is_master for current user (used by frontend to redirect /admin/master)
router.get('/me', requireAuth, (req, res) => {
  res.json({ is_master: req.user.role === 'master' });
});

router.get('/step-up-status', requireAuth, requireMaster, (req, res) => {
  if (!MASTER_STEP_UP_REQUIRED) return res.json({ required: false, verified: true });
  const payload = verifyStepUpToken(readStepUpToken(req));
  const verified = Boolean(payload && payload.type === 'master_step_up' && payload.user_id === req.user.id);
  res.json({ required: true, verified, expires_at: verified ? payload.exp * 1000 : null });
});

router.post('/step-up', requireAuth, requireMaster, async (req, res) => {
  const password = req.body?.password;
  if (!password) return res.status(400).json({ error: 'password required' });
  try {
    const [rows] = await pool.query('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign(
      { type: 'master_step_up', user_id: req.user.id, email: req.user.email, role: 'master' },
      process.env.JWT_SECRET,
      { expiresIn: `${MASTER_STEP_UP_TTL_MIN}m` }
    );
    res.json({ ok: true, token, expires_in_min: MASTER_STEP_UP_TTL_MIN });
  } catch (err) {
    console.error('POST /master/step-up error:', err);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// GET /master/claude-repos — list repos for Claude tab (from sites table, convention path)
router.get('/claude-repos', requireAuth, requireMaster, async (req, res) => {
  try {
    const { list } = await getSitesRepoMap();
    res.json(list.map(({ id, name, domain, repo_path }) => ({ id, name, domain, repo_path })));
  } catch (err) {
    console.error('GET /master/claude-repos error:', err);
    res.status(500).json({ error: 'Failed to load repos' });
  }
});

// ─── Sites ────────────────────────────────────────────────────────────────────

// GET /master/sites — list all sites with live stats
router.get('/sites', requireAuth, requireMaster, async (req, res) => {
  try {
    const [sites] = await pool.query('SELECT * FROM sites WHERE is_active = 1 ORDER BY id ASC');

    const results = await Promise.all(sites.map(async (site) => {
      const row = {
        id: site.id,
        name: site.name,
        domain: site.domain,
        api_url: site.api_url,
        admin_url: site.admin_url,
        version: site.version,
        health: 'unknown',
        db_connected: false,
        pages: 0,
        components_used: 0,
        media: 0,
        db_size_mb: 0,
        ai_tokens: 0,
        ai_cost_usd: 0,
      };

      // Health check
      try {
        const resp = await Promise.race([
          fetch(`${site.api_url}/health`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        if (resp.ok) {
          const json = await resp.json();
          row.health = 'online';
          row.db_connected = json.db === 'connected';
        } else {
          row.health = 'degraded';
        }
      } catch {
        row.health = 'offline';
      }

      // DB stats (only if we have credentials)
      if (site.db_name && site.db_user) {
        let conn;
        try {
          conn = await siteConn(site);
          const [[pages]] = await conn.query('SELECT COUNT(*) AS n FROM content_pages');
          const [[comps]] = await conn.query('SELECT COUNT(*) AS n FROM page_components');
          const [[med]] = await conn.query('SELECT COUNT(*) AS n FROM media');
          const [[ai]] = await conn.query(
            "SELECT COALESCE(SUM(tokens_used),0) AS t, COALESCE(SUM(cost_usd),0) AS c FROM ai_usage WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
          );
          const [[dbSize]] = await conn.query(
            "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS mb FROM information_schema.TABLES WHERE table_schema = ?",
            [site.db_name]
          );
          row.pages = pages.n;
          row.components_used = comps.n;
          row.media = med.n;
          row.ai_tokens = Number(ai.t);
          row.ai_cost_usd = Number(ai.c);
          row.db_size_mb = Number(dbSize.mb) || 0;
          row.db_connected = true;
        } catch {
          // DB unreachable or missing credentials — leave defaults
        } finally {
          if (conn) conn.end().catch(() => {});
        }
      }

      return row;
    }));

    res.json(results);
  } catch (err) {
    console.error('GET /master/sites error:', err);
    res.status(500).json({ error: 'Failed to load sites' });
  }
});

// POST /master/sites — register new site
router.post('/sites', requireAuth, requireMaster, async (req, res) => {
  const { name, domain, api_url, admin_url, version, db_name, db_user, db_password, db_host } = req.body;
  if (!name || !domain || !api_url || !admin_url) {
    return res.status(400).json({ error: 'name, domain, api_url, admin_url required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO sites (name, domain, api_url, admin_url, version, db_name, db_user, db_password, db_host) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, domain, api_url, admin_url, version || '1.0.0', db_name || null, db_user || null, db_password || null, db_host || '127.0.0.1']
    );
    res.json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Domain already exists' });
    console.error('POST /master/sites error:', err);
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// PUT /master/sites/:id — update site record
router.put('/sites/:id', requireAuth, requireMaster, async (req, res) => {
  const { name, domain, api_url, admin_url, version, db_name, db_user, db_password, db_host, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE sites SET name=?, domain=?, api_url=?, admin_url=?, version=?, db_name=?, db_user=?, db_password=?, db_host=?, is_active=? WHERE id=?',
      [name, domain, api_url, admin_url, version, db_name, db_user, db_password, db_host || '127.0.0.1', is_active ?? 1, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /master/sites/:id error:', err);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// ─── Kanban ───────────────────────────────────────────────────────────────────

// GET /master/kanban — all items grouped by column
router.get('/kanban', requireAuth, requireMaster, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kanban_items ORDER BY column_name, sort_order ASC, id ASC');
    const grouped = { backlog: [], in_progress: [], review: [], done: [] };
    for (const r of rows) {
      if (grouped[r.column_name]) grouped[r.column_name].push(r);
    }
    res.json(grouped);
  } catch (err) {
    console.error('GET /master/kanban error:', err);
    res.status(500).json({ error: 'Failed to load kanban' });
  }
});

// GET /master/kanban-tasks — flat list for Claude task selector
router.get('/kanban-tasks', requireAuth, requireMaster, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, column_name, priority, assigned_to, version_target FROM kanban_items ORDER BY FIELD(column_name, "in_progress","backlog","review","done"), sort_order ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /master/kanban-tasks error:', err);
    res.status(500).json({ error: 'Failed to load kanban tasks' });
  }
});

// POST /master/kanban — create item (JWT or API key)
router.post('/kanban', [
  (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (process.env.MASTER_API_KEY && key === process.env.MASTER_API_KEY) return next();
    requireAuth(req, res, () => requireMaster(req, res, next));
  }
], async (req, res) => {
  const { title, description, column_name, priority, assigned_to, version_target, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO kanban_items (title, description, column_name, priority, assigned_to, version_target, sort_order) VALUES (?,?,?,?,?,?,?)',
      [title, description || null, column_name || 'backlog', priority || 'medium', assigned_to || 'human', version_target || null, sort_order || 0]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('POST /master/kanban error:', err);
    res.status(500).json({ error: 'Failed to create kanban item' });
  }
});

// PUT /master/kanban/:id — update item (JWT or API key)
router.put('/kanban/:id', [
  (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (process.env.MASTER_API_KEY && key === process.env.MASTER_API_KEY) return next();
    requireAuth(req, res, () => requireMaster(req, res, next));
  }
], async (req, res) => {
  const { title, description, column_name, priority, assigned_to, version_target, sort_order } = req.body;
  try {
    const fields = [];
    const vals = [];
    if (title !== undefined) { fields.push('title=?'); vals.push(title); }
    if (description !== undefined) { fields.push('description=?'); vals.push(description); }
    if (column_name !== undefined) { fields.push('column_name=?'); vals.push(column_name); }
    if (priority !== undefined) { fields.push('priority=?'); vals.push(priority); }
    if (assigned_to !== undefined) { fields.push('assigned_to=?'); vals.push(assigned_to); }
    if (version_target !== undefined) { fields.push('version_target=?'); vals.push(version_target); }
    if (sort_order !== undefined) { fields.push('sort_order=?'); vals.push(sort_order); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE kanban_items SET ${fields.join(',')} WHERE id=?`, vals);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /master/kanban/:id error:', err);
    res.status(500).json({ error: 'Failed to update kanban item' });
  }
});

// DELETE /master/kanban/:id
router.delete('/kanban/:id', requireAuth, requireMaster, async (req, res) => {
  try {
    await pool.query('DELETE FROM kanban_items WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /master/kanban/:id error:', err);
    res.status(500).json({ error: 'Failed to delete kanban item' });
  }
});

// GET /master/task-md-files?task_id=...&repo=...
router.get('/task-md-files', requireAuth, requireMaster, async (req, res) => {
  const taskId = parseInt(req.query.task_id, 10);
  const repo = String(req.query.repo || '');
  if (!taskId) return res.status(400).json({ error: 'task_id required' });
  try {
    const { map } = await getSitesRepoMap();
    const cwd = map[repo] || map['lavprishjemmeside.dk'];
    if (!cwd) return res.status(400).json({ error: 'Invalid repo' });
    fs.accessSync(cwd, fs.constants.R_OK);

    await ensureTaskMdTable();
    const [taskRows] = await pool.query('SELECT id, title, version_target FROM kanban_items WHERE id = ?', [taskId]);
    if (!taskRows.length) return res.status(404).json({ error: 'Task not found' });
    const task = taskRows[0];

    const [linkedRows] = await pool.query(
      'SELECT file_path FROM kanban_task_md_files WHERE task_id = ? ORDER BY created_at DESC',
      [taskId]
    );
    const linked = linkedRows.map((r) => r.file_path);
    const all = gatherMdFiles(cwd);

    const titleWords = String(task.title || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    const suggested = all.filter((p) => {
      const l = p.toLowerCase();
      if (linked.includes(p)) return false;
      if (task.version_target && l.includes(String(task.version_target).toLowerCase())) return true;
      return titleWords.some((w) => l.includes(w));
    }).slice(0, 25);

    res.json({ task_id: taskId, associated: linked, suggested, all });
  } catch (err) {
    console.error('GET /master/task-md-files error:', err);
    res.status(500).json({ error: 'Failed to load task markdown files' });
  }
});

// POST /master/task-md-files — create new task plan or link existing .md
router.post('/task-md-files', requireAuth, requireMaster, async (req, res) => {
  const taskId = parseInt(req.body?.task_id, 10);
  const repo = String(req.body?.repo || '');
  const mode = String(req.body?.mode || 'create');
  const rawPath = req.body?.file_path ? String(req.body.file_path) : null;
  if (!taskId) return res.status(400).json({ error: 'task_id required' });
  if (!repo) return res.status(400).json({ error: 'repo required' });
  try {
    const { map } = await getSitesRepoMap();
    const cwd = map[repo] || map['lavprishjemmeside.dk'];
    if (!cwd) return res.status(400).json({ error: 'Invalid repo' });

    await ensureTaskMdTable();
    const [taskRows] = await pool.query('SELECT id, title, description, version_target FROM kanban_items WHERE id = ?', [taskId]);
    if (!taskRows.length) return res.status(404).json({ error: 'Task not found' });
    const task = taskRows[0];

    let filePath;
    let absPath;
    let createdNewPlan = false;

    if (mode === 'link') {
      const norm = normalizeRepoRelativeMdPath(cwd, rawPath);
      if (!norm) return res.status(400).json({ error: 'file_path must be a repo-relative .md path' });
      if (!fs.existsSync(norm.abs)) return res.status(404).json({ error: 'File not found' });
      filePath = norm.rel;
      absPath = norm.abs;
    } else {
      const dir = path.join(cwd, 'tasks', 'kanban');
      fs.mkdirSync(dir, { recursive: true });
      const base = `${task.version_target || 'v1-1'}-task-${task.id}-${slugifyFilename(task.title)}`;
      filePath = `tasks/kanban/${base}.md`;
      absPath = path.join(cwd, filePath);
      if (!fs.existsSync(absPath)) {
        fs.writeFileSync(absPath, buildPlanTemplate(task, repo, filePath), 'utf8');
        createdNewPlan = true;
      }
    }

    await pool.query(
      'INSERT IGNORE INTO kanban_task_md_files (task_id, file_path, created_by_user_id) VALUES (?, ?, ?)',
      [taskId, filePath, req.user.id]
    );

    res.json({ ok: true, task_id: taskId, file_path: filePath, created_new_plan: createdNewPlan });
  } catch (err) {
    console.error('POST /master/task-md-files error:', err);
    res.status(500).json({ error: 'Failed to save task markdown file' });
  }
});

// ─── IAN Agent ────────────────────────────────────────────────────────────────

// POST /master/ian-heartbeat — IAN Python agent posts its status (API key, no JWT)
router.post('/ian-heartbeat', requireApiKey, async (req, res) => {
  const { agent_type, status, current_task, messages_sent_today, tokens_used_today, cost_usd_today, metadata } = req.body;
  if (!agent_type) return res.status(400).json({ error: 'agent_type required' });
  try {
    await pool.query(
      `INSERT INTO ian_heartbeat (agent_type, status, current_task, messages_sent_today, tokens_used_today, cost_usd_today, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status=VALUES(status),
         current_task=VALUES(current_task),
         messages_sent_today=VALUES(messages_sent_today),
         tokens_used_today=VALUES(tokens_used_today),
         cost_usd_today=VALUES(cost_usd_today),
         metadata=VALUES(metadata),
         last_seen=NOW()`,
      [agent_type, status || 'online', current_task || null,
       messages_sent_today || 0, tokens_used_today || 0, cost_usd_today || 0,
       metadata ? JSON.stringify(metadata) : null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /master/ian-heartbeat error:', err);
    res.status(500).json({ error: 'Failed to save heartbeat' });
  }
});

// GET /master/ian-status — latest heartbeat per agent type
router.get('/ian-status', requireAuth, requireMaster, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ian_heartbeat ORDER BY agent_type ASC');
    res.json(rows);
  } catch (err) {
    console.error('GET /master/ian-status error:', err);
    res.status(500).json({ error: 'Failed to load IAN status' });
  }
});

// GET /master/ai-usage — aggregate ai_usage from all active sites
router.get('/ai-usage', requireAuth, requireMaster, async (req, res) => {
  try {
    const [sites] = await pool.query('SELECT * FROM sites WHERE is_active = 1 AND db_name IS NOT NULL');
    const results = [];

    await Promise.all(sites.map(async (site) => {
      if (!site.db_user) return;
      let conn;
      try {
        conn = await siteConn(site);
        const [rows] = await conn.query(
          `SELECT
            DATE(created_at) AS day,
            SUM(tokens_used) AS tokens,
            SUM(cost_usd) AS cost_usd,
            COUNT(*) AS requests
           FROM ai_usage
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           GROUP BY day
           ORDER BY day ASC`
        );
        results.push({ site: site.name, domain: site.domain, usage: rows });
      } catch {
        results.push({ site: site.name, domain: site.domain, usage: [], error: true });
      } finally {
        if (conn) conn.end().catch(() => {});
      }
    }));

    res.json(results);
  } catch (err) {
    console.error('GET /master/ai-usage error:', err);
    res.status(500).json({ error: 'Failed to load AI usage' });
  }
});

// ─── Claude Code Runner ───────────────────────────────────────

// GET /master/claude-accounts — list available Claude.ai account sessions
// Uses CLAUDE_CONFIG_DIR_<NAME> env vars; always includes the default ~/.claude session
router.get('/claude-accounts', requireAuth, requireMaster, (req, res) => {
  const accounts = [{ label: 'Default', configDir: '/home/theartis/.claude' }];
  Object.keys(process.env)
    .filter(k => k.startsWith('CLAUDE_CONFIG_DIR_') && process.env[k])
    .forEach(k => accounts.push({
      label: k.replace('CLAUDE_CONFIG_DIR_', ''),
      configDir: process.env[k],
    }));
  res.json(accounts);
});

// POST /master/claude-run — spawn claude CLI and stream output via SSE
// Uses Claude Pro account login (NOT ANTHROPIC_API_KEY) — same auth as VS Code
router.post('/claude-run', requireAuth, requireMaster, requireMasterStepUp, claudeRunRateLimiter, async (req, res) => {
  const { prompt, repo, model, account_dir, timeout_min, task_id, md_path, created_new_plan } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  if (!md_path || typeof md_path !== 'string' || !md_path.toLowerCase().endsWith('.md')) {
    return res.status(400).json({
      error: 'A planning .md file is required before running Claude. Should we plan a new .md file?',
      code: 'PLAN_MD_REQUIRED',
    });
  }
  if (runningTaskId) return res.status(409).json({ error: 'A task is already running', taskId: runningTaskId });

  let repoMap, sitesList;
  try {
    const out = await getSitesRepoMap();
    repoMap = out.map;
    sitesList = out.list;
  } catch (err) {
    console.error('claude-run getSitesRepoMap:', err);
    return res.status(500).json({ error: 'Failed to load sites' });
  }

  const cwd = repoMap[repo] || repoMap['lavprishjemmeside.dk'];
  if (!cwd) return res.status(400).json({ error: 'Invalid repo; use a site domain or id from claude-repos' });
  try {
    fs.accessSync(cwd, fs.constants.R_OK);
  } catch {
    return res.status(400).json({ error: `Repo path not found or not readable: ${cwd}` });
  }

  const normMd = normalizeRepoRelativeMdPath(cwd, md_path);
  if (!normMd) return res.status(400).json({ error: 'Invalid md_path; must be a repo-relative .md file' });
  if (!fs.existsSync(normMd.abs)) return res.status(400).json({ error: `Selected .md file not found: ${normMd.rel}` });

  let planContent = '';
  try {
    planContent = fs.readFileSync(normMd.abs, 'utf8').slice(0, PLAN_MAX_CHARS);
  } catch {
    return res.status(400).json({ error: `Could not read selected .md file: ${normMd.rel}` });
  }

  const modelId = MODEL_MAP[model] || MODEL_MAP.sonnet;
  const taskId = crypto.randomUUID();
  req.masterAuditMeta = {
    repo: repo || null,
    taskId,
    prompt_length: (prompt && prompt.length) || 0,
    prompt_preview: (typeof prompt === 'string' ? prompt.slice(0, 200) : ''),
    kanban_task_id: task_id || null,
    md_path: normMd.rel,
    created_new_plan: Boolean(created_new_plan),
  };
  const timeoutMs = Math.min(Math.max((parseInt(timeout_min) || 10), 1), 60) * 60_000;

  const contextBlock = [
    '[Context: You are working in the repository for one of the following sites. All sites use the same CMS codebase; each has its own DB and deploy.',
    'Sites: ' + sitesList.map((s) => `${s.name} (${s.domain}) api=${s.api_url} admin=${s.admin_url} repo=${s.repo_path}`).join(' | '),
    `Current repo for this task: ${repo} (${cwd})]`,
    `[Task anchor: kanban_task_id=${task_id || 'n/a'} plan_file=${normMd.rel}]`,
    `[Plan markdown content start]\n${planContent}\n[Plan markdown content end]`,
  ].join('\n');
  const fullPrompt = contextBlock + '\n\n' + (typeof prompt === 'string' ? prompt : String(prompt));

  // Build spawn env: delete ANTHROPIC_API_KEY so Claude Code uses account OAuth login
  const spawnEnv = { ...process.env };
  delete spawnEnv.ANTHROPIC_API_KEY;
  spawnEnv.PATH = `/home/theartis/local/bin:/opt/alt/alt-nodejs22/root/usr/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`;
  spawnEnv.HOME = '/home/theartis';
  spawnEnv.CLAUDE_CONFIG_DIR = account_dir || '/home/theartis/.claude';
  spawnEnv.GH_TOKEN = process.env.GITHUB_PAT || ''; // enables git push + gh CLI
  // Inject OAuth token directly — claude recognises CLAUDE_CODE_OAUTH_TOKEN natively,
  // bypassing any credentials file format issues
  try {
    const creds = JSON.parse(fs.readFileSync(path.join(spawnEnv.CLAUDE_CONFIG_DIR, '.credentials.json'), 'utf8'));
    const tok = creds?.claudeAiOauth?.accessToken || creds?.accessToken?.token || null;
    if (tok) spawnEnv.CLAUDE_CODE_OAUTH_TOKEN = tok;
  } catch {}

  // Suppress update checks and non-essential traffic so claude doesn't block on interactive prompts
  spawnEnv.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  spawnEnv.DISABLE_AUTOUPDATER = '1';
  spawnEnv.NO_UPDATE_NOTIFIER = '1';
  spawnEnv.CI = '1'; // suppress interactive prompts in many CLI tools
  spawnEnv.TERM = 'dumb';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Task-Id', taskId);
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  runningTaskId = taskId;
  res.write(`data: ${JSON.stringify({ type: 'start', taskId, cwd, model: modelId, md_path: normMd.rel, kanban_task_id: task_id || null })}\n\n`);

  const proc = spawn(CLAUDE_BIN, ['--print', '--dangerously-skip-permissions', '--model', modelId, '-p', fullPrompt], {
    cwd,
    env: spawnEnv,
    stdio: ['ignore', 'pipe', 'pipe'], // stdin → /dev/null prevents blocking on TTY reads
  });

  activeTasks.set(taskId, proc);
  const killTimer = setTimeout(() => {
    proc.kill();
    activeTasks.delete(taskId);
    runningTaskId = null;
  }, timeoutMs);

  // Heartbeat: keep SSE alive and visible to LiteSpeed every 5s
  const heartbeat = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(heartbeat); }
  }, 5000);

  const cleanup = () => { clearTimeout(killTimer); clearInterval(heartbeat); activeTasks.delete(taskId); runningTaskId = null; };

  proc.stdout.on('data', (d) => {
    try { res.write(`data: ${JSON.stringify({ type: 'out', text: stripAnsi(d.toString()) })}\n\n`); } catch {}
  });
  proc.stderr.on('data', (d) => {
    const txt = stripAnsi(d.toString());
    console.error(`[claude-run ${taskId}] stderr:`, txt.trim());
    try { res.write(`data: ${JSON.stringify({ type: 'err', text: txt })}\n\n`); } catch {}
  });
  proc.on('close', (code) => {
    cleanup();
    try {
      res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
      res.end();
    } catch {}
  });
  proc.on('error', (err) => {
    cleanup();
    try {
      res.write(`data: ${JSON.stringify({ type: 'err', text: 'Failed to start claude: ' + err.message })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', code: 1 })}\n\n`);
      res.end();
    } catch {}
  });

  req.on('close', () => {
    cleanup();
    proc.kill();
  });
});

// DELETE /master/claude-run/:taskId — kill a running task
router.delete('/claude-run/:taskId', requireAuth, requireMaster, requireMasterStepUp, (req, res) => {
  const proc = activeTasks.get(req.params.taskId);
  if (!proc) return res.status(404).json({ error: 'Task not found or already finished' });
  proc.kill();
  activeTasks.delete(req.params.taskId);
  runningTaskId = null;
  res.json({ ok: true });
});

// POST /master/claude-auth-start — generate PKCE OAuth URL without spawning claude auth login.
// The server generates code_verifier/challenge, builds the authorization URL, stores the session,
// and returns the URL. The user opens it in their browser, authorizes, and copies the auth code.
// This bypasses the claude auth login spawn entirely (avoids TTY issues + claude.ai network block).
router.post('/claude-auth-start', requireAuth, requireMaster, requireMasterStepUp, (req, res) => {
  // Kill any dangling auth session
  if (authSession) authSession = null;

  const account_dir = (req.body && req.body.account_dir) || '/home/theartis/.claude';

  // Generate PKCE params
  const codeVerifier  = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state         = crypto.randomBytes(32).toString('base64url'); // matches CLI format

  // Build authorization URL (same as claude CLI does internally)
  const params = new URLSearchParams({
    code:                  'true',
    client_id:             CLAUDE_OAUTH.CLIENT_ID,
    response_type:         'code',
    redirect_uri:          CLAUDE_OAUTH.REDIRECT_URI,
    scope:                 CLAUDE_OAUTH.SCOPE,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  const url = `${CLAUDE_OAUTH.AUTH_URL}?${params.toString()}`;

  authSession = { codeVerifier, account_dir, state };

  res.json({ ok: true, url, account_dir });
});

// POST /master/claude-auth-code — complete the OAuth flow by exchanging the auth code for tokens.
// The "Authentication Code" copied from the callback page is either:
//   - Just the auth code (if from the text field on the callback page)
//   - "authcode#code_verifier" (if the callback page bundles both — older CLI behaviour)
// We always use the code_verifier we generated in claude-auth-start.
router.post('/claude-auth-code', requireAuth, requireMaster, requireMasterStepUp, async (req, res) => {
  const { code: rawCode } = req.body || {};
  if (!rawCode) return res.status(400).json({ error: 'code required' });
  if (!authSession) return res.status(404).json({ error: 'No active auth session — click Start Auth first' });

  const { codeVerifier, account_dir, state } = authSession;

  // The callback page shows "code#state_value". The part after # is the OAuth state (CSRF token),
  // NOT the code_verifier. Always use our stored codeVerifier — confirmed from CLI source:
  // WT8(code, state, this.codeVerifier, ...) — verifier is always the locally-stored one.
  const authCode = rawCode.trim().split('#')[0].trim();
  const effectiveVerifier = codeVerifier;

  if (!authCode) {
    authSession = null;
    return res.status(400).json({ error: 'Auth code is empty after parsing — did you paste the correct value?' });
  }

  // Token exchange — JSON only (exactly what the CLI does, confirmed from CLI source WT8 function).
  // Required fields: grant_type, code, redirect_uri, client_id, code_verifier, state.
  // The `state` field is REQUIRED by the server — omitting it causes "Invalid request format".
  let tokenRes;
  const tokenParams = {
    grant_type:    'authorization_code',
    code:          authCode,
    redirect_uri:  CLAUDE_OAUTH.REDIRECT_URI,
    client_id:     CLAUDE_OAUTH.CLIENT_ID,
    code_verifier: effectiveVerifier,
    state,
  };

  try {
    tokenRes = await fetch(CLAUDE_OAUTH.TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(tokenParams),
    });
  } catch (err) {
    authSession = null;
    return res.status(502).json({ error: 'Token exchange request failed: ' + err.message });
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    authSession = null;
    return res.status(400).json({
      error: `Token exchange failed (${tokenRes.status})`,
      detail: body.slice(0, 300),
    });
  }

  let tokens;
  try {
    tokens = await tokenRes.json();
  } catch (err) {
    authSession = null;
    return res.status(502).json({ error: 'Invalid JSON from token endpoint' });
  }

  if (!tokens.access_token) {
    authSession = null;
    return res.status(400).json({ error: 'No access_token in response', detail: JSON.stringify(tokens).slice(0, 300) });
  }

  // Build credentials in the exact format the claude CLI reads:
  // { claudeAiOauth: { accessToken (string), refreshToken, expiresAt (ms), scopes, subscriptionType, rateLimitTier } }
  const scopes = (tokens.scope || '').split(' ').filter(Boolean);
  const expiresAt = Date.now() + (tokens.expires_in || 86400) * 1000;

  // Fetch user profile to get subscription info and populate oauthAccount in .claude.json
  let subscriptionType = null;
  let rateLimitTier    = null;
  let profileEmail     = null;
  try {
    const profileRes = await fetch('https://api.anthropic.com/api/oauth/profile', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    });
    if (profileRes.ok) {
      const p = await profileRes.json();
      profileEmail  = p.account?.email || null;
      rateLimitTier = p.organization?.rate_limit_tier || null;
      const orgTypeMap = { claude_max: 'max', claude_pro: 'pro', claude_enterprise: 'enterprise', claude_team: 'team' };
      subscriptionType = orgTypeMap[p.organization?.organization_type] || null;

      // Write oauthAccount to .claude.json so claude knows the user details
      const claudeJsonPath = path.join(account_dir, '.claude.json');
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8')); } catch {}
      cfg.oauthAccount = {
        accountUuid:           p.account?.uuid,
        emailAddress:          p.account?.email,
        organizationUuid:      p.organization?.uuid,
        displayName:           p.account?.display_name || null,
        hasExtraUsageEnabled:  p.organization?.has_extra_usage_enabled ?? false,
        billingType:           p.organization?.billing_type || null,
        accountCreatedAt:      p.account?.created_at,
        subscriptionCreatedAt: p.organization?.subscription_created_at || null,
      };
      fs.writeFileSync(claudeJsonPath, JSON.stringify(cfg, null, 2), { mode: 0o600 });
    }
  } catch (err) {
    console.warn('[claude-auth] profile fetch failed:', err.message); // non-fatal
  }

  const credentials = {
    claudeAiOauth: {
      accessToken:      tokens.access_token,
      refreshToken:     tokens.refresh_token || null,
      expiresAt,
      scopes,
      subscriptionType,
      rateLimitTier,
    },
  };

  // Write credentials to the config directory
  try {
    fs.mkdirSync(account_dir, { recursive: true });
    fs.writeFileSync(path.join(account_dir, '.credentials.json'), JSON.stringify(credentials, null, 2), { mode: 0o600 });
  } catch (err) {
    authSession = null;
    return res.status(500).json({ error: 'Failed to write credentials: ' + err.message });
  }

  const displayEmail = profileEmail ? ` (${profileEmail})` : '';
  authSession = null;
  res.json({ ok: true, output: `Authentication successful${displayEmail}. Token saved to ${account_dir}/.credentials.json` });
});

// GET /master/claude-auth-status?account_dir=... — check if credentials exist and are valid
router.get('/claude-auth-status', requireAuth, requireMaster, requireMasterStepUp, (req, res) => {
  const account_dir = req.query.account_dir || '/home/theartis/.claude';
  const credPath    = path.join(account_dir, '.credentials.json');
  const cfgPath     = path.join(account_dir, '.claude.json');

  let creds;
  try {
    creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch {
    return res.json({ authenticated: false });
  }

  // Support both the correct format (claudeAiOauth) and the old wrong format (accessToken object)
  const oauth    = creds?.claudeAiOauth;
  const token    = oauth?.accessToken || creds?.accessToken?.token || null;
  const expiresOn = oauth?.expiresAt   || creds?.accessToken?.expiresOnTimestamp || null;
  const expired  = expiresOn ? Date.now() > expiresOn : false;

  if (!token) return res.json({ authenticated: false });

  // Read email/name from .claude.json oauthAccount (populated during auth)
  let email = null;
  let name  = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    email = cfg?.oauthAccount?.emailAddress || null;
    name  = cfg?.oauthAccount?.displayName  || null;
  } catch {}

  res.json({ authenticated: !expired, expired, email, name, subscriptionType: oauth?.subscriptionType || null });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const mysql = require('mysql2/promise');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

// Known repo working directories on the server
const REPO_DIRS = {
  'lavprishjemmeside.dk': '/home/theartis/repositories/lavprishjemmeside.dk',
  'ljdesignstudio.dk':    '/home/theartis/repositories/ljdesignstudio.dk',
};

// Path to the claude wrapper script (uses Node 22)
const CLAUDE_BIN = '/home/theartis/local/bin/claude';

// Model ID mapping for Claude Code CLI --model flag
const MODEL_MAP = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus:   'claude-opus-4-6',
};

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

// ─── Sites ────────────────────────────────────────────────────────────────────

// GET /master/sites — list all sites with live stats
router.get('/sites', requireAuth, async (req, res) => {
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
router.post('/sites', requireAuth, async (req, res) => {
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
router.put('/sites/:id', requireAuth, async (req, res) => {
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
router.get('/kanban', requireAuth, async (req, res) => {
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

// POST /master/kanban — create item (JWT or API key)
router.post('/kanban', [
  (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (process.env.MASTER_API_KEY && key === process.env.MASTER_API_KEY) return next();
    requireAuth(req, res, next);
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
    requireAuth(req, res, next);
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
router.delete('/kanban/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM kanban_items WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /master/kanban/:id error:', err);
    res.status(500).json({ error: 'Failed to delete kanban item' });
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
router.get('/ian-status', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ian_heartbeat ORDER BY agent_type ASC');
    res.json(rows);
  } catch (err) {
    console.error('GET /master/ian-status error:', err);
    res.status(500).json({ error: 'Failed to load IAN status' });
  }
});

// GET /master/ai-usage — aggregate ai_usage from all active sites
router.get('/ai-usage', requireAuth, async (req, res) => {
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
router.get('/claude-accounts', requireAuth, (req, res) => {
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
router.post('/claude-run', requireAuth, (req, res) => {
  const { prompt, repo, model, account_dir, timeout_min } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  if (runningTaskId) return res.status(409).json({ error: 'A task is already running', taskId: runningTaskId });

  const cwd = REPO_DIRS[repo] || REPO_DIRS['lavprishjemmeside.dk'];
  const modelId = MODEL_MAP[model] || MODEL_MAP.sonnet;
  const taskId = crypto.randomUUID();
  const timeoutMs = Math.min(Math.max((parseInt(timeout_min) || 10), 1), 60) * 60_000;

  // Build spawn env: delete ANTHROPIC_API_KEY so Claude Code uses account OAuth login
  const spawnEnv = { ...process.env };
  delete spawnEnv.ANTHROPIC_API_KEY;
  spawnEnv.PATH = `/home/theartis/local/bin:/opt/alt/alt-nodejs22/root/usr/bin:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`;
  spawnEnv.HOME = '/home/theartis';
  spawnEnv.CLAUDE_CONFIG_DIR = account_dir || '/home/theartis/.claude';
  spawnEnv.GH_TOKEN = process.env.GITHUB_PAT || ''; // enables git push + gh CLI

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Task-Id', taskId);

  runningTaskId = taskId;
  res.write(`data: ${JSON.stringify({ type: 'start', taskId, cwd, model: modelId })}\n\n`);

  const proc = spawn(CLAUDE_BIN, ['--print', '--dangerously-skip-permissions', '--model', modelId, '-p', prompt], {
    cwd,
    env: spawnEnv,
  });

  activeTasks.set(taskId, proc);
  const killTimer = setTimeout(() => {
    proc.kill();
    activeTasks.delete(taskId);
    runningTaskId = null;
  }, timeoutMs);

  proc.stdout.on('data', (d) => {
    try { res.write(`data: ${JSON.stringify({ type: 'out', text: stripAnsi(d.toString()) })}\n\n`); } catch {}
  });
  proc.stderr.on('data', (d) => {
    try { res.write(`data: ${JSON.stringify({ type: 'err', text: stripAnsi(d.toString()) })}\n\n`); } catch {}
  });
  proc.on('close', (code) => {
    clearTimeout(killTimer);
    activeTasks.delete(taskId);
    runningTaskId = null;
    try {
      res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
      res.end();
    } catch {}
  });
  proc.on('error', (err) => {
    clearTimeout(killTimer);
    activeTasks.delete(taskId);
    runningTaskId = null;
    try {
      res.write(`data: ${JSON.stringify({ type: 'err', text: 'Failed to start claude: ' + err.message })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', code: 1 })}\n\n`);
      res.end();
    } catch {}
  });

  req.on('close', () => {
    clearTimeout(killTimer);
    proc.kill();
    activeTasks.delete(taskId);
    runningTaskId = null;
  });
});

// DELETE /master/claude-run/:taskId — kill a running task
router.delete('/claude-run/:taskId', requireAuth, (req, res) => {
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
router.post('/claude-auth-start', requireAuth, (req, res) => {
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
router.post('/claude-auth-code', requireAuth, async (req, res) => {
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

  // Build credentials in the format the claude CLI expects
  const now = Date.now();
  const expiresIn = (tokens.expires_in || 86400) * 1000;
  const credentials = {
    accessToken: {
      token:                tokens.access_token,
      expiresOnTimestamp:   now + expiresIn,
      refreshAfterTimestamp: now + Math.floor(expiresIn * 0.9),
      tokenType:            'Bearer',
    },
    refreshToken: tokens.refresh_token || null,
  };

  // Write credentials to the config directory
  try {
    fs.mkdirSync(account_dir, { recursive: true });
    fs.writeFileSync(path.join(account_dir, '.credentials.json'), JSON.stringify(credentials, null, 2), { mode: 0o600 });
  } catch (err) {
    authSession = null;
    return res.status(500).json({ error: 'Failed to write credentials: ' + err.message });
  }

  authSession = null;
  res.json({ ok: true, output: `Authentication successful. Token saved to ${account_dir}/.credentials.json` });
});

module.exports = router;

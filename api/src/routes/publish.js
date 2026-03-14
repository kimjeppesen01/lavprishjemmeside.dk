const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const API_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_REPO_ROOT = path.resolve(API_ROOT, '..');
const NODE22_BIN_DIR = '/opt/alt/alt-nodejs22/root/usr/bin';
const OUTPUT_LIMIT = 4000;

let activePublish = null;

function parsePrimaryUrl(value) {
  if (!value) return null;
  const first = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .find(Boolean);

  if (!first) return null;

  try {
    return new URL(first).toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function getApiUrl(req) {
  const explicit = parsePrimaryUrl(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL);
  if (explicit) return explicit;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');

  return host ? `${protocol}://${host}` : null;
}

function getSiteUrl() {
  return parsePrimaryUrl(
    process.env.PUBLIC_SITE_URL ||
    process.env.CORS_ORIGIN ||
    process.env.PASSWORD_RESET_BASE_URL
  );
}

function resolveRepoRoot() {
  const configured = process.env.DEPLOY_REPO_PATH;
  if (!configured) return DEFAULT_REPO_ROOT;
  return path.isAbsolute(configured) ? configured : path.join(os.homedir(), configured);
}

function resolveSiteRoot(siteUrl) {
  const configured = process.env.DEPLOY_SITE_ROOT;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(os.homedir(), configured);
  }

  const hostname = new URL(siteUrl).hostname;
  return path.join(os.homedir(), hostname);
}

function trimOutput(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (text.length <= OUTPUT_LIMIT) return text;
  return text.slice(text.length - OUTPUT_LIMIT);
}

async function writeSecurityLog(action, req, details) {
  try {
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        action,
        req.ip,
        req.headers['user-agent'],
        req.user?.id ?? null,
        JSON.stringify(details || {}),
      ]
    );
  } catch (err) {
    console.error('publish security log error:', err.message);
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runShellCommand(script, options) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-lc', script], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      err.stdout = trimOutput(stdout);
      err.stderr = trimOutput(stderr);
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          stdout: trimOutput(stdout),
          stderr: trimOutput(stderr),
        });
        return;
      }

      const err = new Error(`bash -lc ${script} exited with code ${code}`);
      err.code = code;
      err.stdout = trimOutput(stdout);
      err.stderr = trimOutput(stderr);
      reject(err);
    });
  });
}

async function touchRestartFile() {
  const tmpDir = path.join(API_ROOT, 'tmp');
  const restartFile = path.join(tmpDir, 'restart.txt');
  const now = new Date();

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(restartFile, '', { flag: 'a' });
  await fs.utimes(restartFile, now, now);
}

async function getLastDeployedAt() {
  try {
    const [rows] = await pool.execute(
      'SELECT MAX(last_deployed_at) AS last_deployed_at FROM content_pages'
    );
    if (rows?.[0]?.last_deployed_at) {
      return rows[0].last_deployed_at;
    }

    const [logRows] = await pool.execute(
      "SELECT created_at FROM security_logs WHERE action = 'site.publish.completed' ORDER BY id DESC LIMIT 1"
    );
    return logRows?.[0]?.created_at || null;
  } catch (err) {
    console.error('publish status read error:', err.message);
    return null;
  }
}

async function performPublish(req) {
  const siteUrl = getSiteUrl();
  const apiUrl = getApiUrl(req);

  if (!siteUrl || !apiUrl) {
    throw new Error('PUBLIC_SITE_URL/PUBLIC_API_URL could not be resolved for publish.');
  }

  const repoRoot = resolveRepoRoot();
  const siteRoot = resolveSiteRoot(siteUrl);
  const env = {
    ...process.env,
    HOME: process.env.HOME || os.homedir(),
    PATH: `${NODE22_BIN_DIR}:${process.env.PATH || ''}`,
    PUBLIC_SITE_URL: siteUrl,
    PUBLIC_API_URL: apiUrl,
  };

  await fs.mkdir(siteRoot, { recursive: true });

  const build = await runShellCommand('npm run build', { cwd: repoRoot, env });
  const sync = await runShellCommand(
    `rsync -a --delete dist/ ${shellQuote(`${siteRoot}/`)}`,
    {
      cwd: repoRoot,
      env,
    }
  );

  await touchRestartFile();
  await pool.execute(
    "UPDATE content_pages SET last_deployed_at = NOW() WHERE status = 'published'"
  );

  return {
    mode: 'ssh-first-local-build',
    site_url: siteUrl,
    api_url: apiUrl,
    repo_root: repoRoot,
    site_root: siteRoot,
    build_stdout: build.stdout,
    build_stderr: build.stderr,
    sync_stdout: sync.stdout,
    sync_stderr: sync.stderr,
    deployed_at: new Date().toISOString(),
  };
}

router.post('/', requireAuth, async (req, res) => {
  if (activePublish) {
    return res.status(409).json({
      ok: false,
      mode: 'ssh-first-local-build',
      error: 'En publicering kører allerede.',
      started_at: activePublish.started_at,
      started_by: activePublish.user_id,
    });
  }

  await writeSecurityLog('site.publish.requested', req, {
    mode: 'ssh-first-local-build',
  });

  activePublish = {
    started_at: new Date().toISOString(),
    user_id: req.user.id,
  };

  try {
    const result = await performPublish(req);
    await writeSecurityLog('site.publish.completed', req, {
      mode: result.mode,
      site_url: result.site_url,
      api_url: result.api_url,
      site_root: result.site_root,
      repo_root: result.repo_root,
      deployed_at: result.deployed_at,
    });

    return res.json({
      ok: true,
      mode: result.mode,
      site_url: result.site_url,
      api_url: result.api_url,
      site_root: result.site_root,
      deployed_at: result.deployed_at,
      last_deployed_at: await getLastDeployedAt(),
    });
  } catch (err) {
    await writeSecurityLog('site.publish.failed', req, {
      mode: 'ssh-first-local-build',
      error: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    });

    return res.status(500).json({
      ok: false,
      mode: 'ssh-first-local-build',
      error: 'Publicering mislykkedes.',
      detail: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    });
  } finally {
    activePublish = null;
  }
});

router.get('/status', requireAuth, async (req, res) => {
  const siteUrl = getSiteUrl();
  const apiUrl = getApiUrl(req);

  res.json({
    mode: 'ssh-first-local-build',
    enabled: Boolean(siteUrl && apiUrl),
    running: Boolean(activePublish),
    started_at: activePublish?.started_at || null,
    started_by: activePublish?.user_id || null,
    site_url: siteUrl,
    api_url: apiUrl,
    site_root: siteUrl ? resolveSiteRoot(siteUrl) : null,
    repo_root: resolveRepoRoot(),
    last_deployed_at: await getLastDeployedAt(),
  });
});

module.exports = router;

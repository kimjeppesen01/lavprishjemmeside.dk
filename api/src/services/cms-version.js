const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const rootPackagePath = path.join(repoRoot, 'package.json');
const apiPackagePath = path.join(repoRoot, 'api', 'package.json');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');

let cachedStaticVersion = null;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (_) {
    return null;
  }
}

function isDirtyWorktree() {
  const status = runGit(['status', '--porcelain']);
  return Boolean(status);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function changelogState() {
  try {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const updatedAt =
      runGit(['log', '-1', '--format=%cI', '--', 'CHANGELOG.md']) || null;

    return {
      changelog_sha: sha256(content),
      changelog_updated_at: updatedAt,
    };
  } catch (_) {
    return {
      changelog_sha: null,
      changelog_updated_at: null,
    };
  }
}

async function getLastDeployedAt(pool) {
  try {
    const [contentRows] = await pool.execute(
      'SELECT MAX(last_deployed_at) AS last_deployed_at FROM content_pages'
    );
    if (contentRows?.[0]?.last_deployed_at) {
      return new Date(contentRows[0].last_deployed_at).toISOString();
    }
  } catch (_) {}

  try {
    const [logRows] = await pool.execute(
      `SELECT MAX(created_at) AS last_deployed_at
         FROM security_logs
        WHERE action = 'site.publish.completed'`
    );
    if (logRows?.[0]?.last_deployed_at) {
      return new Date(logRows[0].last_deployed_at).toISOString();
    }
  } catch (_) {}

  return null;
}

async function getCmsVersionInfo(pool) {
  if (!cachedStaticVersion) {
    const rootPackage = readJson(rootPackagePath) || {};
    const apiPackage = readJson(apiPackagePath) || {};
    const releaseVersion = rootPackage.version || apiPackage.version || '0.0.0';
    const apiVersion = apiPackage.version || releaseVersion;
    const commit = process.env.APP_COMMIT_SHA || runGit(['rev-parse', 'HEAD']);
    const commitShort = commit ? commit.slice(0, 7) : null;
    const tag = runGit(['describe', '--tags', '--always', '--dirty']);
    const committedAt = runGit(['show', '-s', '--format=%cI', 'HEAD']);
    const dirty = isDirtyWorktree();
    const buildBase = commitShort ? `${releaseVersion}+${commitShort}` : releaseVersion;
    const build = dirty ? `${buildBase}.dirty` : buildBase;
    const changelog = changelogState();

    cachedStaticVersion = {
      release_version: releaseVersion,
      api_version: apiVersion,
      build,
      commit,
      commit_short: commitShort,
      git_ref: tag,
      git_committed_at: committedAt,
      dirty,
      update_channel: 'lavprishjemmeside-cms',
      changelog_sha: changelog.changelog_sha,
      changelog_updated_at: changelog.changelog_updated_at,
    };
  }

  return {
    ...cachedStaticVersion,
    last_deployed_at: pool ? await getLastDeployedAt(pool) : null,
  };
}

module.exports = { getCmsVersionInfo, getLastDeployedAt };

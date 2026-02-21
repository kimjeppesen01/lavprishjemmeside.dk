#!/usr/bin/env node
/**
 * Interactive prompts for a new domain setup. Outputs suggested api/.env
 * and a checklist of cPanel/GitHub steps. Does not create files or connect to DB.
 *
 * Run: node scripts/setup-domain.mjs
 * Or: SETUP_INTERACTIVE=0 PUBLIC_SITE_URL=... PUBLIC_API_URL=... node scripts/setup-domain.mjs
 *     (non-interactive: uses env vars and prints template)
 */
import readline from 'readline';

function ask(rl, prompt, defaultVal = '') {
  const def = defaultVal ? ` [${defaultVal}]` : '';
  return new Promise((resolve) => {
    rl.question(`${prompt}${def}: `, (answer) => resolve((answer || defaultVal).trim()));
  });
}

function envBlock(obj) {
  return Object.entries(obj)
    .map(([k, v]) => (v === '' ? `${k}=` : `${k}=${v}`))
    .join('\n');
}

async function main() {
  const interactive = process.env.SETUP_INTERACTIVE !== '0';

  let siteUrl = process.env.PUBLIC_SITE_URL || '';
  let apiUrl = process.env.PUBLIC_API_URL || '';
  let dbHost = process.env.DB_HOST || '127.0.0.1';
  let dbName = process.env.DB_NAME || '';
  let dbUser = process.env.DB_USER || '';
  let dbPass = process.env.DB_PASSWORD || '';
  let githubRepo = process.env.GITHUB_REPO || '';
  let adminEmail = process.env.ADMIN_EMAIL || '';
  let deployRepoPath = process.env.DEPLOY_REPO_PATH || '';
  let deploySiteRoot = process.env.DEPLOY_SITE_ROOT || '';

  if (interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n=== New domain setup (suggested values only)\n');
    const domain = await ask(rl, 'Site domain (e.g. app.client.dk)', 'app.client.dk');
    const apiSubdomain = await ask(rl, 'API subdomain', `api.${domain}`);
    siteUrl = siteUrl || `https://${domain.replace(/^https?:\/\//, '')}`;
    apiUrl = apiUrl || `https://${apiSubdomain.replace(/^https?:\/\//, '')}`;

    dbHost = await ask(rl, 'DB host', dbHost || '127.0.0.1');
    dbName = await ask(rl, 'DB name', dbName);
    dbUser = await ask(rl, 'DB user', dbUser);
    dbPass = await ask(rl, 'DB password', dbPass);

    githubRepo = await ask(rl, 'GitHub repo (owner/repo)', githubRepo);
    adminEmail = await ask(rl, 'Admin email for first login', adminEmail || `admin@${domain}`);

    const repoDir = await ask(rl, 'Server repo path under ~ (e.g. repositories/app.client.dk)', deployRepoPath || `repositories/${domain}`);
    const siteRoot = await ask(rl, 'Server document root path under ~ for dist/', deploySiteRoot || domain.split('/').pop() || domain);
    deployRepoPath = repoDir;
    deploySiteRoot = siteRoot;
    rl.close();
  } else {
    if (!siteUrl) siteUrl = 'https://app.example.dk';
    if (!apiUrl) apiUrl = 'https://api.app.example.dk';
    if (!deployRepoPath) deployRepoPath = 'repositories/app.example.dk';
    if (!deploySiteRoot) deploySiteRoot = 'app.example.dk';
  }

  const hostname = siteUrl ? new URL(siteUrl).hostname : 'app.example.dk';

  const apiEnv = {
    DB_HOST: dbHost,
    DB_USER: dbUser,
    DB_PASSWORD: dbPass,
    DB_NAME: dbName,
    JWT_SECRET: '<generate a long random string>',
    PORT: '3000',
    CORS_ORIGIN: siteUrl,
    PASSWORD_RESET_BASE_URL: siteUrl,
    RESEND_API_KEY: '',
    EMAIL_FROM_NAME: hostname,
    EMAIL_FROM_ADDRESS: `noreply@${hostname}`,
    GITHUB_PAT: '<your GitHub PAT>',
    ...(githubRepo ? { GITHUB_REPO: githubRepo } : {}),
  };

  console.log('\n--- Suggested api/.env (fill in secrets) ---\n');
  console.log(envBlock(apiEnv));
  console.log('\n--- Root / build env (or GitHub Variables) ---\n');
  console.log(`PUBLIC_SITE_URL=${siteUrl}`);
  console.log(`PUBLIC_API_URL=${apiUrl}`);
  console.log('\n--- GitHub Actions Variables ---\n');
  console.log(`PUBLIC_SITE_URL=${siteUrl}`);
  console.log(`PUBLIC_API_URL=${apiUrl}`);
  console.log(`DEPLOY_REPO_PATH=${deployRepoPath}`);
  console.log(`DEPLOY_SITE_ROOT=${deploySiteRoot}`);
  console.log('\n--- Checklist ---');
  console.log('1. cPanel: Addon domain, MySQL DB + user, API subdomain.');
  console.log('2. Server: Clone repo, create api/.env with the block above.');
  console.log('3. Run schema + seed (see docs/DEPLOY_NEW_DOMAIN.md order).');
  console.log('4. Set admin: UPDATE users SET email=?, password_hash=? WHERE role=\'admin\' LIMIT 1;');
  console.log('5. cPanel: Setup Node.js App (root=api folder, startup=server.cjs).');
  console.log('6. GitHub: Add secrets (FTP_SERVER, FTP_USERNAME, SSH_PRIVATE_KEY, SSH_PORT) and variables above.');
  console.log('7. Point site document root to ~/' + deploySiteRoot + '/');
  console.log('8. Push to main or run deploy workflow.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

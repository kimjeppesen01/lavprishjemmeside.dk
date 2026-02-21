/**
 * 1-click installer: prompts (or env), write api/.env, run schema, seed, spawn API, build, copy dist.
 * Run: npm run setup
 * Non-interactive: SETUP_INTERACTIVE=0 PUBLIC_SITE_URL=... PUBLIC_API_URL=... DB_HOST=... DB_NAME=... DB_USER=... DB_PASSWORD=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/setup.cjs
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'api');
const ENV_DIST = path.join(API_DIR, '.env.dist');
const ENV_FILE = path.join(API_DIR, '.env');

function ask(rl, prompt, defaultVal) {
  const def = defaultVal !== undefined && defaultVal !== '' ? ` [${defaultVal}]` : '';
  return new Promise((resolve) => {
    rl.question(`${prompt}${def}: `, (ans) => resolve(ans !== undefined && ans.trim() !== '' ? ans.trim() : (defaultVal || '')));
  });
}

function checkNode() {
  const v = process.version.slice(1).split('.').map(Number);
  if (v[0] < 18) {
    console.error('Node 18+ required. Current:', process.version);
    process.exit(1);
  }
}

function buildEnv(vars) {
  const hostname = vars.siteUrl ? new URL(vars.siteUrl).hostname : 'app.example.dk';
  return [
    `DB_HOST=${vars.dbHost}`,
    `DB_USER=${vars.dbUser}`,
    `DB_PASSWORD=${vars.dbPassword}`,
    `DB_NAME=${vars.dbName}`,
    `JWT_SECRET=${vars.jwtSecret || require('crypto').randomBytes(32).toString('hex')}`,
    'PORT=3000',
    `CORS_ORIGIN=${vars.siteUrl}`,
    `PASSWORD_RESET_BASE_URL=${vars.siteUrl}`,
    'PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=60',
    'RESEND_API_KEY=',
    `EMAIL_FROM_NAME=${hostname}`,
    `EMAIL_FROM_ADDRESS=noreply@${hostname}`,
    'ANTHROPIC_API_KEY=',
    'GITHUB_PAT=',
    'GITHUB_REPO=',
    'GOOGLE_SITE_URL=',
    'GOOGLE_GA4_PROPERTY_ID=',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL=',
    'GOOGLE_PRIVATE_KEY=',
    '',
  ].join('\n');
}

async function pollHealth(maxMs) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch('http://localhost:3000/health');
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  checkNode();
  const interactive = process.env.SETUP_INTERACTIVE !== '0';

  let siteUrl = process.env.PUBLIC_SITE_URL || '';
  let apiUrl = process.env.PUBLIC_API_URL || '';
  let dbHost = process.env.DB_HOST || '127.0.0.1';
  let dbName = process.env.DB_NAME || '';
  let dbUser = process.env.DB_USER || '';
  let dbPass = process.env.DB_PASSWORD || '';
  let adminEmail = process.env.ADMIN_EMAIL || '';
  let adminPassword = process.env.ADMIN_PASSWORD || '';
  let outputPath = process.env.SETUP_OUTPUT_PATH || '';

  if (interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\n=== Lavpris CMS — 1-click setup\n');
    const domain = await ask(rl, 'Site domain (e.g. app.client.dk)', 'app.client.dk');
    const apiSub = await ask(rl, 'API subdomain', `api.${domain}`);
    siteUrl = siteUrl || `https://${domain.replace(/^https?:\/\//, '')}`;
    apiUrl = apiUrl || `https://${apiSub.replace(/^https?:\/\//, '')}`;

    dbHost = await ask(rl, 'DB host', dbHost || '127.0.0.1');
    dbName = await ask(rl, 'DB name', dbName);
    dbUser = await ask(rl, 'DB user', dbUser);
    dbPass = await ask(rl, 'DB password', dbPass);
    adminEmail = await ask(rl, 'Admin email', adminEmail || `admin@${domain}`);
    adminPassword = await ask(rl, 'Admin password', adminPassword);
    outputPath = await ask(rl, 'Output path for dist (default: ./deploy-output)', outputPath || './deploy-output');
    rl.close();
  } else {
    if (!siteUrl) siteUrl = 'https://app.example.dk';
    if (!apiUrl) apiUrl = 'https://api.app.example.dk';
    if (!outputPath) outputPath = './deploy-output';
  }

  if (!dbName || !dbUser || !dbPass || !adminEmail || !adminPassword) {
    console.error('Missing required: DB_NAME, DB_USER, DB_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }

  console.log('\n1. Writing api/.env');
  const envContent = buildEnv({
    siteUrl,
    apiUrl,
    dbHost,
    dbName,
    dbUser,
    dbPassword: dbPass,
  });
  fs.writeFileSync(ENV_FILE, envContent, 'utf8');

  console.log('2. Installing dependencies (root + api)');
  execSync('npm ci', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm ci --omit=dev', { cwd: API_DIR, stdio: 'inherit' });

  console.log('3. Running schema + seed');
  execSync('node api/run-schema.cjs', { cwd: ROOT, stdio: 'inherit' });

  console.log('4. Setting admin user');
  execSync(`node api/set-admin.cjs`, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword },
  });

  console.log('5. Starting API (background)');
  const apiProcess = spawn('node', ['server.cjs'], {
    cwd: API_DIR,
    stdio: 'pipe',
    env: { ...process.env, PORT: '3000' },
  });
  apiProcess.on('error', (err) => {
    console.error('Failed to start API:', err.message);
    process.exit(1);
  });

  console.log('6. Waiting for API /health (max 60s)');
  const ok = await pollHealth(60000);
  if (!ok) {
    apiProcess.kill();
    console.error('API did not become ready.');
    process.exit(1);
  }

  console.log('7. Building site (PUBLIC_SITE_URL + PUBLIC_API_URL)');
  execSync('npm run build', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PUBLIC_SITE_URL: siteUrl, PUBLIC_API_URL: apiUrl },
  });

  console.log('8. Stopping API');
  apiProcess.kill();

  const outAbs = path.resolve(ROOT, outputPath);
  console.log('9. Copying dist to', outAbs);
  if (!fs.existsSync(outAbs)) fs.mkdirSync(outAbs, { recursive: true });
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    const entries = fs.readdirSync(distDir, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(distDir, e.name);
      const dest = path.join(outAbs, e.name);
      if (e.isDirectory()) {
        if (fs.existsSync(dest)) {
          try { fs.rmSync(dest, { recursive: true }); } catch (_) {}
        }
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }

  console.log('\n=== Setup complete ===');
  console.log('Next steps:');
  console.log('1) cPanel → Setup Node.js App. Application root: [full path to]/api. Startup: server.cjs. URL: ' + (apiUrl ? new URL(apiUrl).hostname : 'api.yourdomain.dk'));
  console.log('2) Point site document root to: ' + outAbs);
  console.log('3) Admin: ' + siteUrl + '/admin/ — log in with ' + adminEmail);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

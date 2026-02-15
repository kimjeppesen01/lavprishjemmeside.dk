#!/usr/bin/env node
/**
 * Troubleshoot dynamic pages: verify API data, build output, and live URL.
 * Run: node scripts/verify-pages.mjs
 */
const API = 'https://api.lavprishjemmeside.dk';
const SITE = 'https://lavprishjemmeside.dk';

async function main() {
  console.log('=== Page verification ===\n');

  // 1. API: fetch published page components
  console.log('1. API /page-components/public?page=all');
  let apiData;
  try {
    const res = await fetch(`${API}/page-components/public?page=all`);
    if (!res.ok) {
      console.log(`   ❌ HTTP ${res.status}`);
      return;
    }
    apiData = await res.json();
    const pages = [...new Set(apiData.map((pc) => pc.page_path?.trim()).filter(Boolean))];
    console.log(`   ✓ ${apiData.length} components, pages: ${pages.join(', ') || '(none)'}`);
    if (pages.length === 0) {
      console.log('   ⚠ No pages (except /). Publish pages in admin.');
    }
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
    return;
  }

  // 2. Build: run build and check dist
  console.log('\n2. Local build');
  const { execSync } = await import('child_process');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  try {
    execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
  } catch (e) {
    console.log('   ❌ Build failed (see above)');
    return;
  }
  const distDir = path.join(__dirname, 'dist');
  const priserPath = path.join(distDir, 'priser', 'index.html');
  const hasPriser = fs.existsSync(priserPath);
  console.log(`   ✓ Build OK, dist/priser/index.html: ${hasPriser ? 'yes' : 'no'}`);

  // 3. Live site: HEAD request
  console.log('\n3. Live site /priser/');
  try {
    const res = await fetch(`${SITE}/priser/`, { method: 'HEAD' });
    console.log(`   ${res.ok ? '✓' : '❌'} HTTP ${res.status}`);
    if (!res.ok) {
      console.log('   Deploy may not have run yet, or dist not copied correctly.');
    }
  } catch (e) {
    console.log(`   ❌ ${e.message}`);
  }

  console.log('\n=== Done ===');
}

main();

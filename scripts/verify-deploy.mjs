#!/usr/bin/env node
/**
 * Verify a deployed API: health, design-settings, page-components.
 * Use after deploy or to check a remote API. Exits 0 if all pass.
 *
 * Run: npm run verify
 * Or:  PUBLIC_API_URL=https://api.client.dk npm run verify
 * Or:  node scripts/verify-deploy.mjs
 */
const API = process.env.PUBLIC_API_URL || 'https://api.lavprishjemmeside.dk';
const SITE = process.env.PUBLIC_SITE_URL || '';

async function main() {
  let failed = false;

  console.log(`Verifying API: ${API}\n`);

  // 1. Health
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log(`❌ /health HTTP ${res.status}`);
      failed = true;
    } else if (data.database !== 'connected') {
      console.log('❌ /health database not connected');
      failed = true;
    } else {
      console.log('✓ /health OK (database connected)');
    }
  } catch (e) {
    console.log(`❌ /health ${e.message}`);
    failed = true;
  }

  // 2. Design settings (public)
  try {
    const res = await fetch(`${API}/design-settings/public`);
    if (!res.ok) {
      console.log(`❌ /design-settings/public HTTP ${res.status}`);
      failed = true;
    } else {
      const data = await res.json();
      const keys = data && typeof data === 'object' ? Object.keys(data).length : 0;
      console.log(`✓ /design-settings/public OK (${keys} keys)`);
    }
  } catch (e) {
    console.log(`❌ /design-settings/public ${e.message}`);
    failed = true;
  }

  // 3. Page components (public)
  try {
    const res = await fetch(`${API}/page-components/public?page=all`);
    if (!res.ok) {
      console.log(`❌ /page-components/public HTTP ${res.status}`);
      failed = true;
    } else {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      const pages = [...new Set((data || []).map((pc) => pc.page_path?.trim()).filter(Boolean))];
      console.log(`✓ /page-components/public OK (${count} components, pages: ${pages.join(', ') || '/'})`);
    }
  } catch (e) {
    console.log(`❌ /page-components/public ${e.message}`);
    failed = true;
  }

  // 4. Optional: live site HEAD
  if (SITE) {
    try {
      const res = await fetch(`${SITE.replace(/\/$/, '')}/`, { method: 'HEAD' });
      if (res.ok) {
        console.log(`✓ Site ${SITE} reachable`);
      } else {
        console.log(`⚠ Site ${SITE} HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`⚠ Site ${SITE} ${e.message}`);
    }
  }

  console.log('');
  if (failed) process.exit(1);
}

main();

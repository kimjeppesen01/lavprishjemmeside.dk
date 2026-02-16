#!/usr/bin/env node
/**
 * CLI batch ingestion of Pexels images into media library.
 * Usage:
 *   node api/scripts/pexels-ingest.cjs --keywords "webdesign, hjemmeside pris" --max-per-keyword 3 --orientation landscape [--translate-alt]
 *
 * See PEXELS_AUTOMATION_PLAN.md for full spec.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const pool = require('../src/db');
const pexels = require('../src/services/pexels.cjs');

const MANIFESTS_DIR = path.join(__dirname, '../manifests');
const UPLOAD_URL_BASE = process.env.UPLOAD_URL_BASE || 'https://lavprishjemmeside.dk/uploads';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    keywords: [],
    maxPerKeyword: 3,
    orientation: null,
    translateAlt: false,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords' && args[i + 1]) {
      opts.keywords = args[++i].split(',').map((k) => k.trim()).filter(Boolean);
    } else if (args[i] === '--max-per-keyword' && args[i + 1]) {
      opts.maxPerKeyword = Math.max(1, parseInt(args[++i], 10) || 3);
    } else if (args[i] === '--orientation' && args[i + 1]) {
      const v = args[++i].toLowerCase();
      if (['landscape', 'portrait', 'square'].includes(v)) opts.orientation = v;
    } else if (args[i] === '--translate-alt') {
      opts.translateAlt = true;
    }
  }
  return opts;
}

async function translateAltToDanish(englishAlt, keyword) {
  if (!englishAlt || typeof englishAlt !== 'string') return '';
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 128,
      system: 'Du oversætter kun billedbeskrivelser til dansk. Svar KUN med den danske tekst, ingen andre ord.',
      messages: [
        {
          role: 'user',
          content: `Oversæt denne billedbeskrivelse til dansk (SEO-optimeret, 80-125 tegn):\nEngelsk: "${englishAlt}"\nKontekst-nøgleord: "${keyword || ''}"\n\nSvar KUN med den danske oversættelse.`,
        },
      ],
    });
    const text = msg.content?.[0]?.text;
    return text ? String(text).trim().slice(0, 500) : englishAlt;
  } catch (err) {
    console.warn('  [translate-alt fejl]', err.message);
    return englishAlt;
  }
}

async function isPhotoInLibrary(pexelsPhotoId) {
  const [rows] = await pool.execute('SELECT id FROM media WHERE pexels_photo_id = ?', [pexelsPhotoId]);
  return rows.length > 0;
}

async function run() {
  const opts = parseArgs();
  if (opts.keywords.length === 0) {
    console.error('Brug: node api/scripts/pexels-ingest.cjs --keywords "word1, word2" [--max-per-keyword 3] [--orientation landscape] [--translate-alt]');
    process.exit(1);
  }

  if (!process.env.PEXELS_API_KEY) {
    console.error('PEXELS_API_KEY er ikke sat i .env');
    process.exit(1);
  }

  const runId = `run-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
  const manifestDir = path.join(MANIFESTS_DIR, runId);
  fs.mkdirSync(manifestDir, { recursive: true });

  const stats = { searched: 0, downloaded: 0, skipped_duplicate: 0, rate_limit_remaining: null };
  const images = [];

  for (const keyword of opts.keywords) {
    process.stdout.write(`  ${keyword}: `);
    stats.searched += 1;

    try {
      const result = await pexels.searchPhotos({
        query: keyword,
        per_page: 15,
        orientation: opts.orientation,
      });

      const photos = result.photos || [];
      if (photos.length === 0) {
        console.log('0 resultater');
        continue;
      }

      const ranked = await pexels.scoreAndRankPhotos(photos, opts.orientation);
      let added = 0;
      let skipped = 0;

      for (const photo of ranked) {
        if (added >= opts.maxPerKeyword) break;
        if (!photo || !photo.id) continue;

        const inLibrary = await isPhotoInLibrary(photo.id);
        if (inLibrary) {
          skipped += 1;
          stats.skipped_duplicate += 1;
          continue;
        }

        const reg = await pexels.downloadAndRegister({
          photo,
          keyword,
          uploadedBy: null,
        });

        added += 1;
        stats.downloaded += 1;

        let altTextDa = reg.alt_text || '';
        if (opts.translateAlt && reg.alt_text) {
          altTextDa = await translateAltToDanish(reg.alt_text, keyword);
        }

        const pageUrl = photo.url || `https://www.pexels.com/photo/${photo.id}/`;
        const photographer = photo.photographer || '';
        const photographerUrl = photo.photographer_url || '';
        const attributionHtml = photographer
          ? `Foto af <a href="${photographerUrl}">${photographer}</a> fra <a href="${pageUrl}">Pexels</a>`
          : '';

        images.push({
          media_id: reg.media_id,
          keyword,
          filename: reg.filename,
          url: reg.url || UPLOAD_URL_BASE + '/' + reg.filename,
          alt_text: reg.alt_text,
          alt_text_da: altTextDa,
          pexels_photo_id: photo.id,
          photographer,
          photographer_url: photographerUrl,
          pexels_page_url: pageUrl,
          width: reg.width || photo.width,
          height: reg.height || photo.height,
          attribution_html: attributionHtml,
        });
      }

      const budget = pexels.getRateBudget();
      stats.rate_limit_remaining = budget?.remaining ?? null;

      console.log(`${added} nye${skipped > 0 ? ` (${skipped} dubletter)` : ''}`);
    } catch (err) {
      console.log(`fejl: ${err.message}`);
    }
  }

  const manifest = {
    run_id: runId,
    keywords: opts.keywords,
    images,
    stats,
  };

  fs.writeFileSync(
    path.join(manifestDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  console.log('');
  console.log(`✓ Total: ${stats.downloaded} billeder tilføjet til mediebiblioteket`);
  if (stats.skipped_duplicate > 0) {
    console.log(`  (${stats.skipped_duplicate} dubletter sprunget over)`);
  }
  if (stats.rate_limit_remaining != null) {
    console.log(`  Rate limit: ${stats.rate_limit_remaining} tilbage`);
  }
  console.log(`  Manifest: ${path.join(manifestDir, 'manifest.json')}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

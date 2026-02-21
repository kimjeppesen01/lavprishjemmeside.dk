# Pexels Media Automation — Integrated Implementation Plan

> **Project:** lavprishjemmeside.dk
> **Stack:** Astro 5 MPA + Express API (`.cjs`) + MySQL + cPanel/LiteSpeed + Node 22
> **Status:** Plan — ready for implementation
> **Last revised:** 2026-02-16

---

## 1) Vision

When an admin types "Lav mig en side om webdesign priser" into the AI assembler, the system should produce a **fully finished page** — real images included — without any manual upload step.

**The pipeline:**

```
Admin prompt
  → AI selects components + writes content
  → AI calls Pexels tool for each image slot
  → Images download to disk + register in media table
  → Components saved with real image URLs
  → Page is ready to publish
```

This plan unifies Pexels automation with the existing media system. No parallel silos — every Pexels image lands in the same `media` table, appears in the admin media library, and is available to all future AI generations.

---

## 2) Architecture overview

### What changes

```
api/
  src/
    services/
      pexels.cjs          ← NEW  Pexels API client (search, download, rate limiting)
    routes/
      media.js            ← MODIFY  Add Pexels search + ingest endpoints
    services/
      anthropic.js        ← MODIFY  Add tool_use for Pexels image search
      ai-context.js       ← MODIFY  Enhanced media context for AI
    schema_media_v2.sql   ← NEW  Migration: extend media table
  scripts/
    pexels-ingest.cjs     ← NEW  CLI entry point for batch ingestion
```

### What stays the same

- All existing media endpoints (`GET /media`, `POST /media/upload`, `/update`, `/delete`)
- Admin media UI at `/admin/media`
- AI generation endpoints (`POST /ai-generate/page`, `/page-advanced`)
- The `getMediaForAi()` helper — enhanced, not replaced
- Deploy flow (GitHub Actions → SSH → `touch tmp/restart.txt`)

---

## 3) Database: extend the media table

Single migration. Non-breaking — all new columns are nullable or have defaults.

### `schema_media_v2.sql`

```sql
-- v2: Add dimensions, source tracking, and Pexels metadata
ALTER TABLE media
  ADD COLUMN width INT DEFAULT NULL AFTER file_size,
  ADD COLUMN height INT DEFAULT NULL AFTER width,
  ADD COLUMN source ENUM('upload', 'pexels') DEFAULT 'upload' AFTER height,
  ADD COLUMN pexels_photo_id INT DEFAULT NULL AFTER source,
  ADD COLUMN pexels_photographer VARCHAR(255) DEFAULT NULL AFTER pexels_photo_id,
  ADD COLUMN pexels_photographer_url VARCHAR(500) DEFAULT NULL AFTER pexels_photographer,
  ADD COLUMN pexels_page_url VARCHAR(500) DEFAULT NULL AFTER pexels_photographer_url,
  ADD COLUMN tags VARCHAR(500) DEFAULT '' AFTER pexels_page_url,
  ADD UNIQUE INDEX idx_pexels_photo_id (pexels_photo_id);
```

**Column purposes:**

| Column | Why |
|--------|-----|
| `width`, `height` | AI can pick images by aspect ratio; `<img>` gets real dimensions for CLS |
| `source` | Filter uploads vs Pexels in admin UI; prevent re-downloading |
| `pexels_photo_id` | Deduplication — unique index prevents saving the same Pexels photo twice |
| `pexels_photographer` + `_url` | Pexels license compliance (attribution) |
| `pexels_page_url` | Link back to Pexels page (required by their guidelines) |
| `tags` | Comma-separated keywords used to find this image. Powers smarter AI selection |

**Backwards compatibility:** Existing rows get `source='upload'` and `NULL` for all new columns. No code changes needed for current upload flow.

---

## 4) Pexels service (`services/pexels.cjs`)

Single-responsibility module. Handles API communication, rate limiting, downloading, and media table registration.

### 4.1 API client

```
searchPhotos({ query, page, per_page, locale, orientation, size })
  → { photos: [...], total_results, rate_limit: { remaining, reset } }

getPhotoById(id)
  → Photo object
```

- `Authorization` header from `PEXELS_API_KEY`
- Default `locale=da-DK`, `per_page=15`
- Parse `X-Ratelimit-Remaining` and `X-Ratelimit-Reset` from every response

### 4.2 Rate limiting

Track rate budget in memory + persist to `api/state/pexels-rate-budget.json`:

```json
{
  "remaining": 195,
  "reset": 1708099200,
  "last_updated": "2026-02-16T14:00:00Z"
}
```

Rules:
- Before each request, check `remaining > 0` and `Date.now() < reset * 1000`
- On 429: pause until stored `reset`. Do NOT retry immediately
- On 5xx/timeout: exponential backoff (200ms → 400ms → 800ms → 1600ms), max 4 attempts
- On 4xx (non-429): fail immediately, do not retry

### 4.3 Image download + registration

```
downloadAndRegister({ photo, keyword, uploadedBy })
  → { media_id, filename, url }
```

This is the core function. It:

1. **Checks deduplication** — `SELECT id FROM media WHERE pexels_photo_id = ?`. If exists, return existing record
2. **Picks download URL** — `photo.src.large2x` (1880px wide, good balance of quality/size). Falls back to `photo.src.original` if `large2x` unavailable
3. **Streams download** to `UPLOAD_DIR` (same directory as manual uploads)
4. **Validates** — Content-Type starts with `image/`, file size < 15MB
5. **Generates filename** — deterministic, SEO-safe:
   ```
   <keyword-slug>--pexels-<photo_id>--<w>x<h>.<ext>
   ```
6. **Inserts into `media` table** with all metadata:
   ```sql
   INSERT INTO media (
     filename, original_name, mime_type, file_size, alt_text,
     width, height, source, pexels_photo_id,
     pexels_photographer, pexels_photographer_url, pexels_page_url,
     tags, uploaded_by
   ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pexels', ?, ?, ?, ?, ?, ?)
   ```
7. **Returns** `{ media_id, filename, url, alt_text, width, height }`

### 4.4 Danish slugify utility

```
slugify("Billig hjemmeside pris")  → "billig-hjemmeside-pris"
slugify("Økologisk Blåbær")        → "oekologisk-blaabaer"
```

Rules:
- `æ→ae`, `ø→oe`, `å→aa`
- Lowercase, spaces → `-`, strip non-alphanumeric, collapse hyphens

### 4.5 Image selection scoring

When multiple photos are returned from a search, score them:

| Factor | Weight | Logic |
|--------|--------|-------|
| Resolution | 3 | Higher `width * height` scores better |
| Has alt text | 2 | `photo.alt` is non-empty |
| Orientation match | 2 | Matches requested orientation (landscape/portrait/square) |
| Not already used | 1 | `pexels_photo_id` not in media table |

Return the top-scoring photo. If all are already in the library, return the existing media record instead of re-downloading.

---

## 5) AI tool use: `search_pexels` tool

**This is the key integration.** Instead of the AI choosing from a static list of uploaded images, we give the AI a tool it can call during page generation to search Pexels for the perfect image.

### 5.1 Tool definition (for Anthropic API)

```json
{
  "name": "search_pexels",
  "description": "Search Pexels for a royalty-free image and download it to the media library. Returns a URL you can use directly in component props. Use this when you need an image for a component and no existing media library image is a good match. Search in Danish or English — Pexels handles both.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search keyword(s). Be specific: 'dansk webdesigner arbejder ved skrivebord' is better than 'webdesign'"
      },
      "orientation": {
        "type": "string",
        "enum": ["landscape", "portrait", "square"],
        "description": "Image orientation. Use 'landscape' for hero sections and content-image-split, 'portrait' for team photos, 'square' for gallery grids"
      },
      "size": {
        "type": "string",
        "enum": ["large", "medium", "small"],
        "description": "Image size. Default 'large' for hero/full-width, 'medium' for cards and splits"
      }
    },
    "required": ["query"]
  }
}
```

### 5.2 Tool handler (server-side)

When the AI calls `search_pexels`, the server:

1. Calls `pexels.searchPhotos({ query, orientation, size })`
2. Selects the best photo using the scoring algorithm (§4.5)
3. Calls `pexels.downloadAndRegister({ photo, keyword: query })`
4. Returns to the AI:

```json
{
  "url": "https://lavprishjemmeside.dk/uploads/webdesign--pexels-12345--1880x1253.jpg",
  "alt_text": "Webdesigner arbejder ved computer med moderne interface",
  "width": 1880,
  "height": 1253,
  "media_id": 47
}
```

The AI then uses this `url` and `alt_text` directly in the component props it's building.

### 5.3 Budget guard

To prevent runaway costs or accidental API exhaustion:

- **Max 6 Pexels searches per page generation** (configurable via `PEXELS_MAX_PER_GENERATION`)
- If the AI tries to call the tool beyond this limit, return a message: "Pexels-grænse nået for denne generation. Brug et billede fra mediebiblioteket eller en placeholder."
- Track per-request, not globally — each `/ai-generate/page` call gets its own counter

### 5.4 Media library fallback

Before calling Pexels, the AI should check existing media first. The system prompt instructs:

> "Check the media library first. Only call `search_pexels` if no existing image is relevant. Prefer reusing images already in the library."

This reduces API calls and builds a growing library of reusable assets over time.

---

## 6) Changes to `anthropic.js`

### 6.1 Add tool-use loop to `generatePageContent`

Current flow:
```
user message → single AI response → parse JSON
```

New flow:
```
user message → AI response (may contain tool_use blocks)
  → handle each tool call (search_pexels)
  → send tool_result back
  → AI continues generating
  → ... repeat until AI returns final JSON (end_turn)
  → parse JSON
```

This is a standard Anthropic tool-use conversation loop. The model naturally interleaves tool calls with its reasoning — it might call `search_pexels` for the hero image, then for a content-image-split, then produce the final JSON with all real URLs embedded.

### 6.2 Updated system prompt additions

Add to the existing system prompt (after the media library section):

```
## Billedsøgning med Pexels

Du har adgang til værktøjet `search_pexels` som søger i Pexels' billedbibliotek
og downloader billedet direkte til vores mediebibliotek.

### Regler for billedvalg:
1. **Tjek mediebiblioteket først** — brug eksisterende billeder hvis de passer
2. **Kald search_pexels** for hvert billedfelt hvor intet eksisterende billede passer
3. **Søg specifikt** — "kvinde der arbejder ved laptop i lyst kontor" er bedre end "kontor"
4. **Vælg korrekt orientation** — landscape til hero/splits, portrait til team, square til gallerier
5. **Maks 6 søgninger per side** — prioriter de vigtigste billedfelter (hero, splits)
6. **Brug URL'en præcist** som den returneres — ændr ikke URL'en

Brug ALDRIG placeholder-URLs (placehold.co). Alle sider skal have ægte billeder.
```

### 6.3 Token usage tracking

Tool-use conversations consume more tokens (multiple round-trips). Update the `ai_usage` logging to capture:
- Total input + output tokens across all rounds
- Number of tool calls made
- Which tools were called (for cost analysis)

---

## 7) Changes to `ai-context.js`

### 7.1 Enhanced `getMediaForAi()`

Current: returns `{ url, alt }` for the 100 most recent media with alt text.

Enhanced: return richer metadata for smarter selection:

```javascript
async function getMediaForAi() {
  const [rows] = await pool.execute(
    `SELECT id, filename, alt_text, width, height, source, tags
     FROM media
     WHERE alt_text != '' AND alt_text IS NOT NULL
     ORDER BY created_at DESC LIMIT 100`
  );
  return rows.map(row => ({
    url: UPLOAD_URL_BASE + '/' + row.filename,
    alt: row.alt_text,
    width: row.width,
    height: row.height,
    source: row.source || 'upload',
    tags: row.tags || ''
  }));
}
```

The AI now sees dimensions and tags, letting it make better choices before falling back to Pexels.

---

## 8) Changes to `media.js` (routes)

### 8.1 New endpoint: `POST /media/pexels/search` (admin)

Exposed for the admin UI and CLI. Not called by the AI directly (AI uses the tool handler).

```
POST /media/pexels/search
Authorization: Bearer <jwt>
Body: { "query": "webdesign", "orientation": "landscape", "per_page": 15 }

Response: {
  "photos": [
    {
      "pexels_id": 12345,
      "url": "https://images.pexels.com/...",
      "alt": "...",
      "photographer": "...",
      "width": 1880,
      "height": 1253,
      "already_in_library": false
    }
  ],
  "rate_limit": { "remaining": 194 }
}
```

### 8.2 New endpoint: `POST /media/pexels/download` (admin)

Download a specific Pexels photo by ID and register it.

```
POST /media/pexels/download
Authorization: Bearer <jwt>
Body: { "pexels_photo_id": 12345, "keyword": "webdesign" }

Response: {
  "ok": true,
  "media": {
    "id": 47,
    "filename": "webdesign--pexels-12345--1880x1253.jpg",
    "url": "https://lavprishjemmeside.dk/uploads/webdesign--pexels-12345--1880x1253.jpg",
    "alt_text": "Webdesigner arbejder ved computer",
    "width": 1880,
    "height": 1253
  }
}
```

### 8.3 Updated `GET /media` response

Add the new columns to the list response. The admin UI can use `source` to show a Pexels badge, and `pexels_page_url` to link attribution.

### 8.4 Updated URL resolution

Currently, `url` is built as `UPLOAD_URL_BASE + '/' + row.filename`. This stays the same — Pexels images are stored in the same `UPLOAD_DIR`. No path bifurcation.

---

## 9) Alt text strategy

### 9.1 Default: Pexels `photo.alt` (English)

Every Pexels photo comes with an `alt` field. It's usually English and reasonably descriptive.

### 9.2 Enhancement: Danish translation via Anthropic

Since we already have the Anthropic SDK loaded and the AI is generating the page, we get Danish alt text **for free** — the AI writes `alt_text` props in Danish as part of its normal component generation. The Pexels `alt` is stored in the `media` table as a baseline, but the component's `props_data` will contain the AI's Danish alt text.

For batch ingestion (CLI), optionally translate:

```
Translate this image alt text to Danish (SEO-optimized, 80-125 chars):
English: "Woman working at laptop in bright modern office"
Context keyword: "webdesign"
→ "Kvinde arbejder ved laptop i lyst moderne kontor med webdesign på skærmen"
```

This uses a single cheap API call per image. Optional — controlled by `--translate-alt` CLI flag.

---

## 10) CLI batch ingestion (`scripts/pexels-ingest.cjs`)

For pre-populating the media library outside of AI page generation.

### Usage

```bash
node api/scripts/pexels-ingest.cjs \
  --keywords "webdesign, hjemmeside pris, grafisk design" \
  --max-per-keyword 3 \
  --orientation landscape \
  --translate-alt
```

### Behavior

1. For each keyword:
   - Search Pexels (`per_page=15`, score and rank)
   - Download top N (skipping duplicates already in `media` table)
   - Register in `media` table with `source='pexels'`
   - Optionally translate alt text to Danish
2. Output summary to stdout:
   ```
   ✓ webdesign: 3 new images (2 skipped as duplicates)
   ✓ hjemmeside pris: 3 new images
   ✓ grafisk design: 2 new images (1 skipped, rate limit: 189 remaining)
   Total: 8 images added to media library
   ```
3. Write manifest to `api/manifests/run-YYYYMMDD-HHMM/manifest.json`

### Manifest format

```json
{
  "run_id": "run-20260216-1430",
  "keywords": ["webdesign", "hjemmeside pris"],
  "images": [
    {
      "media_id": 47,
      "keyword": "webdesign",
      "filename": "webdesign--pexels-12345--1880x1253.jpg",
      "url": "https://lavprishjemmeside.dk/uploads/webdesign--pexels-12345--1880x1253.jpg",
      "alt_text": "Webdesigner arbejder ved computer",
      "alt_text_da": "Kvinde arbejder ved laptop i lyst kontor",
      "pexels_photo_id": 12345,
      "photographer": "John Doe",
      "photographer_url": "https://www.pexels.com/@johndoe",
      "pexels_page_url": "https://www.pexels.com/photo/12345/",
      "width": 1880,
      "height": 1253,
      "attribution_html": "Foto af <a href=\"https://www.pexels.com/@johndoe\">John Doe</a> fra <a href=\"https://www.pexels.com/photo/12345/\">Pexels</a>"
    }
  ],
  "stats": {
    "searched": 3,
    "downloaded": 8,
    "skipped_duplicate": 3,
    "rate_limit_remaining": 189
  }
}
```

---

## 11) Environment variables

### Add to `api/.env.example`

```env
# Pexels API (media automation)
PEXELS_API_KEY=
PEXELS_DEFAULT_LOCALE=da-DK
PEXELS_MAX_PER_GENERATION=6
PEXELS_MAX_FILE_SIZE_MB=15
```

No separate storage paths needed — Pexels images use the existing `UPLOAD_DIR` and `UPLOAD_URL_BASE`.

---

## 12) Security & compliance

### Pexels license compliance

- **Attribution stored** per image (`pexels_photographer`, `pexels_photographer_url`, `pexels_page_url`)
- **Attribution HTML** generated in manifests for pages that need visible credit
- **No searchable gallery** — images are used within page components, not exposed as a browsable Pexels mirror
- **API key server-side only** — never exposed to frontend

### Download security

- Only download from URLs matching `https://images.pexels.com/*` (validate before streaming)
- Validate `Content-Type` starts with `image/`
- Enforce max file size (`PEXELS_MAX_FILE_SIZE_MB`, default 15MB)
- Stream to temp file, validate, then rename to final path (atomic-ish)

### API endpoint security

- All Pexels endpoints require JWT admin auth (`requireAuth`)
- AI tool calls are server-side only (no client exposure)
- Rate limiting: respect Pexels API limits + our own per-generation cap
- Audit logging: all Pexels downloads logged to `security_logs`

---

## 13) Deployment constraints (cPanel)

- **File extension**: All new service files are `.cjs` (root repo is ESM `"type": "module"`)
- **Restart method**: `mkdir -p tmp && touch tmp/restart.txt` — no `pkill`
- **File permissions**: API process must be able to write to `UPLOAD_DIR` (already working for manual uploads)
- **No new dependencies beyond `node-fetch`** (or use Node 22 native `fetch`) for Pexels API calls — no heavy SDKs
- **State file**: `api/state/pexels-rate-budget.json` — ensure `api/state/` directory exists and is writable

---

## 14) Complete flow: AI generates a page with real images

Here's the end-to-end sequence when an admin clicks "Generér side":

```
1. Admin submits: "Lav en side om professionelt webdesign til små virksomheder"

2. Server builds AI context:
   - Design tokens, component schemas, prompt settings
   - Existing media library (enhanced: includes dimensions + tags)
   - Pexels tool definition

3. AI receives context + tools. Reasons about page structure:
   "I need a hero-section with a landscape image, a content-image-split
    about webdesign services, a features-grid, a pricing-table,
    and a CTA section."

4. AI calls search_pexels({ query: "professionel webdesign kontor", orientation: "landscape" })
   → Server searches Pexels → downloads best match → registers in media table
   → Returns: { url: ".../webdesign-kontor--pexels-98765--1880x1253.jpg", ... }

5. AI calls search_pexels({ query: "webdesigner samarbejder med kunde", orientation: "landscape" })
   → Same flow → returns URL for content-image-split

6. AI produces final JSON with real image URLs:
   {
     "seo": { "meta_title": "Professionelt Webdesign | Lavprishjemmeside.dk", ... },
     "components": [
       {
         "component_slug": "hero-section",
         "props_data": {
           "headline": "Professionelt Webdesign til Små Virksomheder",
           "description": "...",
           "backgroundImage": "https://lavprishjemmeside.dk/uploads/webdesign-kontor--pexels-98765--1880x1253.jpg",
           "primaryCta": { "text": "Se Priser", "href": "/priser" }
         },
         "sort_order": 1
       },
       {
         "component_slug": "content-image-split",
         "props_data": {
           "headline": "Vi Skaber Hjemmesider Der Virker",
           "body": "...",
           "imageUrl": "https://lavprishjemmeside.dk/uploads/webdesigner-kunde--pexels-11111--1880x1253.jpg",
           "imageAlt": "Webdesigner samarbejder med kunde om ny hjemmeside",
           "imagePosition": "right"
         },
         "sort_order": 2
       },
       ...
     ]
   }

7. Server saves components to page_components table (existing flow)
8. Server saves SEO metadata to page_meta table (existing flow)
9. Page is ready — all images are real, hosted, and in the media library
```

No manual upload step. No placeholders. No second pass.

---

## 15) Implementation tickets

### Ticket 1 — Schema migration

**Files:** `api/src/schema_media_v2.sql`

**Deliverables:**
- Migration SQL to extend `media` table with `width`, `height`, `source`, `pexels_photo_id`, `pexels_photographer`, `pexels_photographer_url`, `pexels_page_url`, `tags`
- Run on production database

**Acceptance criteria:**
- Migration runs without error on existing data
- Existing upload flow works unchanged
- `source` defaults to `'upload'` for existing rows

---

### Ticket 2 — Pexels service

**Files:** `api/src/services/pexels.cjs`

**Deliverables:**
- `searchPhotos()` — Pexels API search with rate-limit tracking
- `downloadAndRegister()` — download + media table insert + deduplication
- `slugify()` — Danish-aware slug generation
- `scoreAndSelectPhoto()` — image selection algorithm
- Rate budget persistence (`api/state/pexels-rate-budget.json`)
- `.env.example` updates

**Acceptance criteria:**
- Can search Pexels, download an image, and see it in the `media` table
- Duplicate detection works (same photo_id → returns existing record)
- Rate limit tracking persists across server restarts

---

### Ticket 3 — API endpoints

**Files:** `api/src/routes/media.js`

**Deliverables:**
- `POST /media/pexels/search` — search Pexels (admin-only)
- `POST /media/pexels/download` — download specific photo (admin-only)
- Enhanced `GET /media` — include new columns in response
- Enhanced `getMediaForAi()` — return dimensions + tags
- Audit logging for all Pexels operations

**Acceptance criteria:**
- Admin can search Pexels from API and download selected images
- Downloaded images appear in admin media library alongside manual uploads
- `getMediaForAi()` returns enhanced metadata

---

### Ticket 4 — AI tool integration

**Files:** `api/src/services/anthropic.js`, `api/src/services/ai-context.js`

**Deliverables:**
- `search_pexels` tool definition added to Anthropic API calls
- Tool-use conversation loop in `generatePageContent()` and `generatePageContentAdvanced()`
- Per-generation tool call budget (`PEXELS_MAX_PER_GENERATION`)
- Updated system prompt with Pexels search instructions
- Enhanced token usage tracking (multi-turn)

**Acceptance criteria:**
- AI can call `search_pexels` during page generation
- Generated pages contain real Pexels image URLs (no placeholders)
- Tool calls are capped at configured maximum
- Token usage reflects all conversation rounds

---

### Ticket 5 — CLI batch ingestion

**Files:** `api/scripts/pexels-ingest.cjs`

**Deliverables:**
- CLI script with `--keywords`, `--max-per-keyword`, `--orientation`, `--translate-alt` flags
- Manifest output (JSON) to `api/manifests/`
- Summary statistics to stdout

**Acceptance criteria:**
- Can run via SSH on cPanel and populate media library in bulk
- Manifests contain full attribution data
- Deduplication works across runs

---

### Ticket 6 (optional) — Admin UI enhancements

**Files:** `src/pages/admin/media.astro`

**Deliverables:**
- Pexels search panel in admin media page (keyword input + search button)
- Preview Pexels results with "Download" button per image
- Visual badge on Pexels-sourced images in the media grid
- Attribution display (photographer + link) on Pexels images

**Acceptance criteria:**
- Admin can search and import Pexels images from the media library UI
- Pexels images are visually distinguishable from manual uploads

---

## 16) Definition of done

An admin can:
1. Type a page description into the AI assembler
2. The AI generates a complete page with 4-8 components
3. Every image slot contains a real, high-quality Pexels image (no placeholders)
4. All images are registered in the `media` table with full attribution
5. The page is ready to publish immediately
6. Images appear in the admin media library for future reuse
7. The entire flow works on cPanel Node 22 + LiteSpeed without breaking existing deploy/build

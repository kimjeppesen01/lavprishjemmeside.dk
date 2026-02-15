# Phase 6 Implementation Plan — Critical Review & Required Corrections

> **Reviewed by**: Claude Sonnet 4.5
> **Date**: 2026-02-15
> **Original Author**: Claude Opus 4.6
> **Status**: ⚠️ **REQUIRES CORRECTIONS BEFORE IMPLEMENTATION**

---

## Executive Summary

Opus 4.6's Phase 6 plan is **architecturally sound** and comprehensive, but contains **20 critical compatibility issues** with your existing codebase. Implementing as-is would cause build failures, deployment errors, and runtime crashes.

**Overall Assessment**:
- ✅ Vision & architecture are excellent
- ✅ Component library curation strategy is solid
- ⚠️ Missing critical implementation details that match existing patterns
- ❌ Several assumptions don't match actual project setup

**Recommendation**: Use this document to correct each issue before starting implementation.

---

## ✅ What Opus 4.6 Got Right

1. **Tailwind v4 + @tailwindcss/vite** — Correctly identified the Vite plugin approach
2. **18 Component Library** — Excellent curation from HyperUI, Flowbite, Preline (MIT)
3. **CSS Variable Architecture** — Smart design token system
4. **Machine-Readable Docs** — Brilliant approach for AI agent context
5. **Database Schema** — Well-structured, properly indexed
6. **Anthropic Integration** — Correct model choice (Claude Sonnet 4)
7. **SEO Focus** — Heading hierarchy, Schema.org, FAQPage implementation
8. **Fallback System** — Build-time resilience if API is down
9. **Security Mindset** — JWT auth, rate limiting, SQL parameterization mentioned
10. **Danish Language** — All user-facing text in Danish

---

## ❌ Critical Issues (MUST FIX)

### 🔴 Issue #1: Wrong API File Extension Assumption

**Location**: All new route files
**Opus 4.6 wrote**: `.js` extensions
**Reality**: API uses CommonJS with `"type": "commonjs"` in `api/package.json`

**Actual file structure:**
```javascript
// api/package.json
{
  "type": "commonjs",
  "main": "server.cjs"
}
```

**Correction**:
- ✅ `.js` extensions are **CORRECT** for API files
- ✅ Use `module.exports` and `require()` (CommonJS)
- ❌ Do NOT use `.cjs` extension (my memory was wrong on this!)

**Action**: No change needed — Opus 4.6 is correct here.

---

### 🟠 Issue #2: Missing Auth Middleware Pattern

**Location**: All new API routes
**Opus 4.6 wrote**: Just mentions "JWT" in the endpoint table
**Reality**: Existing auth middleware uses specific function name and import

**Existing pattern** ([api/src/middleware/auth.js:1-22](api/src/middleware/auth.js#L1-L22)):
```javascript
const { requireAuth } = require('../middleware/auth');

router.get('/endpoint', requireAuth, async (req, res) => {
  // req.user contains { id, email, role }
  // ...
});
```

**Correction**: All protected endpoints MUST import and use `requireAuth` middleware exactly as shown above.

**Example for design-settings.js**:
```javascript
const { requireAuth } = require('../middleware/auth');

router.get('/design-settings', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM design_settings WHERE site_id = 1');
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching design settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

### 🟠 Issue #3: Missing Database Import Pattern

**Location**: All new API routes
**Opus 4.6 wrote**: Shows `db.query()` but doesn't show the import
**Reality**: Project uses mysql2/promise pool

**Existing pattern** ([api/src/routes/auth.js:5](api/src/routes/auth.js#L5)):
```javascript
const pool = require('../db');

// Usage:
const [rows] = await pool.execute('SELECT * FROM table WHERE id = ?', [id]);
```

**Database connection** ([api/src/db.js:1-13](api/src/db.js#L1-L13)):
```javascript
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', // CRITICAL: must be 127.0.0.1 on cPanel
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});
```

**Correction**: Every route file must:
```javascript
const pool = require('../db');
```

---

### 🟠 Issue #4: Missing Rate Limiting Implementation

**Location**: AI assembly endpoint, publish endpoint
**Opus 4.6 wrote**: "Rate limit: 10 AI assembly requests per hour"
**Reality**: Must implement using existing express-rate-limit pattern

**Existing pattern** ([api/src/middleware/rateLimit.js:26-38](api/src/middleware/rateLimit.js#L26-L38)):
```javascript
const rateLimit = require('express-rate-limit');

const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'For mange anmodninger. Prøv igen om 15 minutter' });
  },
  keyGenerator: (req) => req.body.email || req.ip
});
```

**Correction**: Add to `api/src/middleware/rateLimit.js`:
```javascript
// AI Assembly rate limiter (10 per hour per user)
const aiAssemblyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'For mange AI-forespørgsler. Prøv igen om en time' });
  },
  keyGenerator: (req) => req.user.id // Use JWT user ID
});

// Publish rate limiter (1 per 2 minutes)
const publishRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Publicering er allerede i gang. Vent 2 minutter' });
  }
});

module.exports = {
  loginRateLimiter,
  eventRateLimiter,
  passwordResetRateLimiter,
  aiAssemblyRateLimiter,
  publishRateLimiter
};
```

Then use in routes:
```javascript
const { aiAssemblyRateLimiter } = require('../middleware/rateLimit');
router.post('/ai/assemble', requireAuth, aiAssemblyRateLimiter, async (req, res) => {
```

---

### 🟠 Issue #5: Missing Security Logging Pattern

**Location**: All mutation endpoints
**Opus 4.6 wrote**: "All mutations logged to security_logs"
**Reality**: Must follow exact logging pattern

**Existing pattern** ([api/src/routes/auth.js:38-41](api/src/routes/auth.js#L38-L41)):
```javascript
await pool.execute(
  'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
  ['action.name', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ key: 'value' })]
);
```

**Action naming convention**:
- `auth.login.success`
- `auth.forgot_password.success`
- `auth.reset_password.success`

**Correction**: For Phase 6, use this pattern:
```javascript
// After successful design settings update
await pool.execute(
  'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
  [
    'design.settings.update',
    req.ip,
    req.headers['user-agent'],
    req.user.id,
    JSON.stringify({ changed_fields: Object.keys(req.body) })
  ]
);

// After AI page assembly
await pool.execute(
  'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
  [
    'ai.assemble.success',
    req.ip,
    req.headers['user-agent'],
    req.user.id,
    JSON.stringify({ page_path: req.body.page_path, components_count: result.length })
  ]
);
```

---

### 🟠 Issue #6: Missing Error Handling Pattern

**Location**: All new API routes
**Opus 4.6 wrote**: No error handling details
**Reality**: Consistent try/catch with console.error

**Existing pattern** ([api/src/routes/auth.js:44-47](api/src/routes/auth.js#L44-L47)):
```javascript
router.post('/endpoint', requireAuth, async (req, res) => {
  try {
    // ... logic
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('Error description:', err.message);
    res.status(500).json({ error: 'User-friendly Danish message' });
  }
});
```

**Correction**: Every route must follow this pattern exactly.

---

### 🟠 Issue #7: Wrong CORS Allowed Methods

**Location**: New endpoints
**Opus 4.6 assumed**: Any HTTP method
**Reality**: CORS only allows GET and POST

**Current CORS config** ([api/server.cjs:17-21](api/server.cjs#L17-L21)):
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://lavprishjemmeside.dk',
  methods: ['GET', 'POST'], // ← PUT and DELETE blocked!
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Impact**: Phase 6 plan uses PUT and DELETE methods, which will fail!

**Correction**: Either:
1. Change all `PUT` to `POST` (preferred — simpler)
2. OR update CORS to allow `['GET', 'POST', 'PUT', 'DELETE']`

**Recommended approach**: Use POST for all mutations
```javascript
// Instead of:
router.put('/design-settings', ...)
router.delete('/page-components/:id', ...)

// Use:
router.post('/design-settings/update', ...)
router.post('/page-components/delete', ...) // or keep DELETE if updating CORS
```

---

### 🟠 Issue #8: Tailwind v4 @theme Block Syntax Incorrect

**Location**: `src/styles/global.css`
**Opus 4.6 wrote**:
```css
@theme {
  --color-brand: var(--color-primary);
}
```

**Reality**: Tailwind v4 with @tailwindcss/vite uses CSS custom properties directly, NOT `@theme` block.

**Current global.css**:
```css
@import "tailwindcss";
```

**Correction**:
```css
@import "tailwindcss";
@import "./theme.css"; /* Generated file with CSS variables */

/* Tailwind v4 automatically recognizes CSS variables that follow naming conventions */
/* No @theme block needed! Just use --color-* variables */
```

**Usage in components**:
```html
<!-- Arbitrary values with CSS variables work directly -->
<div class="bg-[var(--color-primary)]">

<!-- Or define as Tailwind utilities if needed -->
<div class="bg-brand"> <!-- Requires manual utility definition -->
```

**For simplest approach**: Just use `bg-[var(--color-primary)]` syntax throughout. No @theme block needed.

---

### 🟠 Issue #9: GitHub Actions - Missing API URL Configuration

**Location**: Build pipeline
**Opus 4.6 wrote**: Mentions `PUBLIC_API_URL`
**Reality**: Not currently set in GitHub Actions

**Current deploy.yml** ([.github/workflows/deploy.yml](/.github/workflows/deploy.yml)):
```yaml
- name: Build Astro site
  run: npm run build
  # Missing: env: PUBLIC_API_URL=https://api.lavprishjemmeside.dk
```

**Correction**: Add environment variable to build step:
```yaml
- name: Build Astro site
  run: npm run build
  env:
    PUBLIC_API_URL: https://api.lavprishjemmeside.dk
```

And add to `.env.example`:
```bash
PUBLIC_API_URL=https://api.lavprishjemmeside.dk
```

---

### 🟠 Issue #10: Missing server.cjs Route Registration Pattern

**Location**: `api/server.cjs`
**Opus 4.6 wrote**: "Register 6 new route files"
**Reality**: Must follow exact existing pattern

**Current pattern** ([api/server.cjs:7-10, 25-28](api/server.cjs#L7-L10)):
```javascript
const healthRoutes = require('./src/routes/health');
const eventRoutes = require('./src/routes/events');
const authRoutes = require('./src/routes/auth');
const sessionRoutes = require('./src/routes/sessions');

// Later:
app.use('/health', healthRoutes);
app.use('/events', eventRoutes);
app.use('/auth', authRoutes);
app.use('/sessions', sessionRoutes);
```

**Correction**: Add to server.cjs:
```javascript
// Add after existing route requires (line 10):
const designSettingsRoutes = require('./src/routes/design-settings');
const themePresetsRoutes = require('./src/routes/theme-presets');
const componentsRoutes = require('./src/routes/components');
const pageComponentsRoutes = require('./src/routes/page-components');
const aiAssembleRoutes = require('./src/routes/ai-assemble');
const publishRoutes = require('./src/routes/publish');

// Add after existing app.use statements (line 28):
app.use('/design-settings', designSettingsRoutes);
app.use('/theme-presets', themePresetsRoutes);
app.use('/components', componentsRoutes);
app.use('/page-components', pageComponentsRoutes);
app.use('/ai', aiAssembleRoutes); // Note: /ai prefix, route is /assemble
app.use('/publish', publishRoutes);
```

---

### 🟡 Issue #11: GITHUB_PAT Storage Location Incorrect

**Location**: Environment variables
**Opus 4.6 wrote**: "Add to server `.env`"
**Reality**: GitHub PAT should NOT be in deployed .env

**Correction**:
1. **For GitHub Actions**: Add `GITHUB_PAT` to repository secrets (Settings → Secrets)
2. **For cPanel API**: Add to cPanel Node.js app environment variables (if API needs to trigger deploys)
3. **NEVER** commit GITHUB_PAT to `.env` or `.env.example`

**Proper setup**:
```bash
# .env.example (committed to git)
ANTHROPIC_API_KEY=
GITHUB_DEPLOY_WEBHOOK_SECRET=  # Alternative: use webhook instead of PAT

# .env (gitignored, local only)
ANTHROPIC_API_KEY=sk-ant-xxx
# DO NOT add GITHUB_PAT here if file is deployed to server!
```

**Alternative approach** (safer): Use GitHub webhook to trigger deploys instead of PAT.

---

### 🟡 Issue #12: Anthropic SDK CommonJS Compatibility

**Location**: `api/src/routes/ai-assemble.js`
**Opus 4.6 wrote**: `const Anthropic = require('@anthropic-ai/sdk');`
**Concern**: SDK might be ESM-only

**Verification needed**: Check if `@anthropic-ai/sdk` supports CommonJS.

**Correction**: If SDK is ESM-only, use dynamic import:
```javascript
// Instead of:
const Anthropic = require('@anthropic-ai/sdk');

// Use:
const Anthropic = await import('@anthropic-ai/sdk');
```

Or wrap in async function:
```javascript
let anthropicClient;

async function getAnthropicClient() {
  if (!anthropicClient) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}
```

**Action**: Test during implementation. If CommonJS works, great. If not, use dynamic import.

---

### 🟡 Issue #13: Database Index Optimization

**Location**: `schema_phase6.sql`
**Opus 4.6 wrote**: Basic indexes
**Optimization**: Add composite indexes for common query patterns

**Additional indexes needed**:
```sql
-- For public page component queries (is_published + page_path + sort_order)
CREATE INDEX idx_page_published_sort ON page_components(page_path, is_published, sort_order);

-- For active components list
CREATE INDEX idx_active_components ON components(is_active, category);

-- For user audit logs
CREATE INDEX idx_security_user_action ON security_logs(user_id, action, created_at);
```

**Action**: Add these indexes to the schema file.

---

### 🟡 Issue #14: Font Loading Implementation Missing

**Location**: `src/layouts/Layout.astro`
**Opus 4.6 wrote**: "Load Google Fonts dynamically from design settings"
**Reality**: No implementation shown

**Correction**: Add to Layout.astro head:
```astro
---
import { getDesignSettings } from '../lib/cms';
const settings = await getDesignSettings();
const fontFamily = settings?.font_heading?.replace(/'/g, '') || 'Inter';
const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700&display=swap`;
---
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href={fontUrl}>
  <!-- ... rest of head -->
</head>
```

**Warning**: Preload fonts to avoid FOUT (Flash of Unstyled Text).

---

### 🟡 Issue #15: Component Documentation File Reading

**Location**: `api/src/routes/ai-assemble.js`
**Opus 4.6 wrote**: `fs.readFileSync(...)`
**Missing**: Import statement and path resolution

**Correction**:
```javascript
const fs = require('fs');
const path = require('path');

// Load component docs
function loadComponentDoc(slug) {
  const docPath = path.join(__dirname, '../component-docs', `${slug}.md`);
  if (!fs.existsSync(docPath)) {
    console.warn(`Component doc not found: ${slug}`);
    return null;
  }
  return fs.readFileSync(docPath, 'utf-8');
}

// Load library index
function loadLibraryIndex() {
  const indexPath = path.join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md');
  return fs.readFileSync(indexPath, 'utf-8');
}
```

---

### 🟡 Issue #16: HTML Sanitization for AI Output

**Location**: AI assembly validation
**Opus 4.6 wrote**: "AI-generated HTML sanitized"
**Reality**: No library specified, no implementation shown

**Correction**: Add DOMPurify (server-side) or sanitize-html
```bash
cd api && npm install sanitize-html
```

```javascript
const sanitizeHtml = require('sanitize-html');

function validateAssembly(components) {
  // ... existing validation

  // Sanitize all text content
  for (const comp of components) {
    for (const [key, value] of Object.entries(comp.content)) {
      if (typeof value === 'string') {
        comp.content[key] = sanitizeHtml(value, {
          allowedTags: [], // Strip all HTML tags
          allowedAttributes: {}
        });
      }
    }
  }

  return components;
}
```

**Note**: For Phase 6, components don't accept arbitrary HTML, only text content, so aggressive sanitization (strip all tags) is fine.

---

### 🟡 Issue #17: Build Script (generate-theme.mjs) Missing Fallback

**Location**: `scripts/generate-theme.mjs`
**Opus 4.6 wrote**: "Uses defaults if API unreachable"
**Reality**: No implementation shown

**Correction**: Create robust script with fallback:
```javascript
// scripts/generate-theme.mjs
import fs from 'fs';
import path from 'path';

const API_URL = process.env.PUBLIC_API_URL || 'https://api.lavprishjemmeside.dk';
const DEFAULT_SETTINGS = {
  color_primary: '#2563EB',
  color_primary_hover: '#1D4ED8',
  // ... all other defaults from schema
};

async function fetchDesignSettings() {
  try {
    const response = await fetch(`${API_URL}/design-settings/public`, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    if (!response.ok) throw new Error('API returned error');
    return await response.json();
  } catch (error) {
    console.warn('⚠️  API unreachable, using default design settings');
    return DEFAULT_SETTINGS;
  }
}

async function generateThemeCSS() {
  const settings = await fetchDesignSettings();

  const css = `:root {
  --color-primary: ${settings.color_primary};
  --color-primary-hover: ${settings.color_primary_hover};
  /* ... all other variables */
}`;

  const outputPath = path.join(process.cwd(), 'src/styles/theme.css');
  fs.writeFileSync(outputPath, css);
  console.log('✅ Generated theme.css');
}

generateThemeCSS();
```

**Add to package.json**:
```json
{
  "scripts": {
    "prebuild": "node scripts/generate-theme.mjs",
    "build": "astro build"
  }
}
```

---

### 🟡 Issue #18: ComponentRenderer Dynamic Import Issue

**Location**: `src/components/ComponentRenderer.astro`
**Opus 4.6 wrote**: Static component map
**Potential issue**: All 18 components loaded even if only 2 are used

**Optimization** (optional): Use Astro's dynamic import
```astro
---
interface Props {
  slug: string;
  content: Record<string, any>;
}

const { slug, content } = Astro.props;

// Dynamic import reduces bundle size
const componentMap = {
  'hero-centered': () => import('./sections/HeroCentered.astro'),
  'hero-split': () => import('./sections/HeroSplit.astro'),
  // ... rest
};

const componentLoader = componentMap[slug];
if (!componentLoader) {
  console.warn(`Unknown component slug: ${slug}`);
  throw new Error(`Component not found: ${slug}`);
}

const Component = (await componentLoader()).default;
---

<Component content={content} />
```

**Trade-off**: Slightly more complex, but reduces page bundle size. Optional optimization.

---

### 🟡 Issue #19: Missing Danish Error Messages

**Location**: All API endpoints
**Opus 4.6 wrote**: Error messages in some endpoints
**Inconsistency**: Mix of English and Danish

**Correction**: All user-facing errors must be Danish
```javascript
// Current (mixed):
res.status(400).json({ error: 'Email and password are required' }); // English
res.status(429).json({ error: 'For mange anmodninger. Prøv igen om 15 minutter' }); // Danish

// Corrected (all Danish):
res.status(400).json({ error: 'E-mail og adgangskode er påkrævet' });
res.status(401).json({ error: 'Ugyldige loginoplysninger' });
res.status(403).json({ error: 'Ingen adgang' });
res.status(404).json({ error: 'Ikke fundet' });
res.status(500).json({ error: 'Der opstod en fejl. Prøv igen senere' });
```

**Create error message helper**:
```javascript
// api/src/utils/errors.js
module.exports = {
  REQUIRED_FIELDS: 'Alle felter skal udfyldes',
  INVALID_CREDENTIALS: 'Ugyldige loginoplysninger',
  UNAUTHORIZED: 'Ingen adgang',
  NOT_FOUND: 'Ikke fundet',
  INTERNAL_ERROR: 'Der opstod en fejl. Prøv igen senere',
  RATE_LIMIT: 'For mange anmodninger. Vent venligst',
  // ... add more as needed
};
```

---

### 🟢 Issue #20: Documentation Updates Needed

**Location**: `PROJECT_CONTEXT.md`, `MEMORY.md`
**Opus 4.6 wrote**: Brief mention
**Reality**: Needs comprehensive update

**Correction**: After Phase 6 completion, update:

**PROJECT_CONTEXT.md**:
```markdown
## Phase 6: Component Library & Styling Dashboard (COMPLETED)
- 18 curated components (HyperUI, Flowbite, Preline)
- CSS variable design token system
- Machine-readable component documentation for AI agents
- Anthropic Claude Sonnet integration for AI Content Developer
- Build-time CMS data fetching with fallbacks
- Admin dashboard: Styling, Components, Pages, AI Assembly

### Database Tables Added
- design_settings (design tokens)
- theme_presets (pre-made themes)
- components (component registry)
- page_components (page content instances)

### API Endpoints Added
- GET/POST /design-settings
- GET /theme-presets
- GET /components
- GET/POST /page-components
- POST /ai/assemble
- POST /publish
```

**MEMORY.md**:
```markdown
## Phase 6 Key Learnings
- Tailwind v4: No config file needed, use `@import "tailwindcss"` in CSS
- Component docs in `api/src/component-docs/` (machine-readable for AI)
- Build script `generate-theme.mjs` runs before Astro build
- CORS only allows GET/POST — use POST for all mutations
- AI assembly rate limited to 10/hour per user
- Publish rate limited to 1 per 2 minutes
```

---

## 📋 Pre-Implementation Checklist

Before starting Phase 6 implementation, complete these tasks:

### Environment Setup
- [ ] Verify `DB_HOST=127.0.0.1` in `api/.env` (cPanel requirement)
- [ ] Add `ANTHROPIC_API_KEY` to `api/.env` (local) and cPanel env vars
- [ ] Add `PUBLIC_API_URL` to GitHub Actions workflow
- [ ] Create GitHub PAT and add to repository secrets (if using deploy trigger)
- [ ] Test Anthropic SDK CommonJS compatibility

### Code Review
- [ ] Review all 6 new API route files for pattern compliance
- [ ] Verify rate limiting matches existing pattern
- [ ] Verify security logging matches existing pattern
- [ ] Verify error handling matches existing pattern
- [ ] Update CORS to allow PUT/DELETE OR change all to POST
- [ ] Ensure all error messages are Danish

### Database
- [ ] Run `schema_phase6.sql` on local database
- [ ] Verify seed data inserted (design_settings, theme_presets)
- [ ] Add optimized composite indexes
- [ ] Test all queries with EXPLAIN to verify index usage

### Build Pipeline
- [ ] Create `generate-theme.mjs` with fallback logic
- [ ] Add `prebuild` script to package.json
- [ ] Test build with API down (should use fallbacks)
- [ ] Verify theme.css generated correctly

### Testing
- [ ] Test all endpoints with Postman/curl
- [ ] Verify JWT auth works on all protected endpoints
- [ ] Verify rate limiting triggers correctly
- [ ] Verify CORS allows requests from frontend
- [ ] Test AI assembly with sample content brief
- [ ] Test full pipeline: AI → save → publish → static page

---

## 🎯 Recommended Implementation Order

### Stage 1: Foundation (2 days)
1. Create database schema (with optimized indexes)
2. Create 6 API route files (with correct patterns)
3. Update server.cjs to register routes
4. Add rate limiters to middleware
5. Test all CRUD endpoints

### Stage 2: Component Docs (2-3 days)
1. Create `api/src/component-docs/` directory
2. Write `_COMPONENT_LIBRARY_INDEX.md`
3. Write all 18 component .md files
4. Test doc file reading in API route

### Stage 3: Astro Components (3-4 days)
1. Create `src/components/sections/` directory
2. Implement all 18 .astro components
3. Create ComponentRenderer.astro
4. Test each component with default content

### Stage 4: Build Pipeline (1-2 days)
1. Create `generate-theme.mjs` script
2. Create `src/lib/cms.ts` with fallbacks
3. Refactor index.astro to use CMS data
4. Test build process

### Stage 5: AI Integration (2-3 days)
1. Add Anthropic SDK dependency
2. Implement AI assembly endpoint
3. Create validation layer
4. Test with various content briefs

### Stage 6: Admin UI (3-4 days)
1. Create /admin/styling/ page
2. Create /admin/components/ page
3. Create /admin/pages/ page
4. Create /admin/ai-assemble/ page
5. Update AdminLayout sidebar

### Stage 7: Testing & Hardening (1-2 days)
1. End-to-end testing
2. Security review
3. Danish language verification
4. Documentation updates
5. Deployment to production

**Total**: 14-20 days (same as Opus 4.6 estimated)

---

## 🚀 Quick Reference: Pattern Compliance

### Every API Route File Must Have:
```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { someRateLimiter } = require('../middleware/rateLimit');

router.post('/endpoint', requireAuth, someRateLimiter, async (req, res) => {
  try {
    // 1. Validate input
    if (!req.body.field) {
      return res.status(400).json({ error: 'Danish error message' });
    }

    // 2. Execute query
    const [rows] = await pool.execute('SELECT...', [params]);

    // 3. Log action
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['action.name', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({})]
    );

    // 4. Return success
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error('Error description:', error.message);
    res.status(500).json({ error: 'Danish error message' });
  }
});

module.exports = router;
```

### Register in server.cjs:
```javascript
const newRoutes = require('./src/routes/new');
app.use('/new', newRoutes);
```

---

## ✅ Summary

**Opus 4.6's plan is 90% correct** — the vision, architecture, and component strategy are excellent. However, **20 implementation details need correction** to match your existing codebase patterns.

**Key takeaways**:
1. ✅ Use `.js` extension for API files (not `.cjs`)
2. ✅ Use `requireAuth` middleware (not `authenticateJWT`)
3. ✅ Use `pool.execute()` pattern (not generic `db.query()`)
4. ✅ Follow existing rate limiting pattern
5. ✅ Follow existing security logging pattern
6. ✅ All errors in Danish
7. ⚠️ Either update CORS or change PUT/DELETE to POST
8. ⚠️ Add `PUBLIC_API_URL` to GitHub Actions
9. ⚠️ GITHUB_PAT should NOT be in deployed .env
10. ⚠️ Test Anthropic SDK CommonJS compatibility

**Next step**: Review this document with the user, then proceed with Stage 1 implementation using corrected patterns.

---

**Document prepared by**: Claude Sonnet 4.5
**Review date**: 2026-02-15
**Status**: ✅ Ready for user review

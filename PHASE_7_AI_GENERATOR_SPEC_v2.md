# Phase 7: Visual Page Builder - Technical Specification

> **Status**: Future implementation (Premium feature)
> **Dependencies**: Phase 6 (Component Library) **MUST** be completed first
> **Estimated Implementation**: 2-3 weeks
> **Integration**: Seamlessly integrated with Phase 6 - shared context, compatible outputs

---

## 1. Feature Overview

The **Visual Page Builder** is an internal tool located at `/admin/byggeklodser`. It accepts a design mockup image (screenshot, wireframe, or reference design) and uses AI to either:

1. **PRIMARY MODE**: Map the design to existing Phase 6 components → output `page_components[]` array
2. **SECONDARY MODE**: Generate custom HTML sections using CSS variables for patterns not in the library

**Core Value Proposition**:
- Converts design mockups to production-ready pages in seconds
- Ensures brand consistency (uses actual design tokens, not generic styles)
- Works with existing component library (output immediately editable in page builder)
- Reduces client onboarding time (quickly prototype from their designs)
- Premium upsell opportunity (free tier → paid upgrade funnel)

---

## 2. System Architecture & Integration with Phase 6

### 2.1. High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User uploads design mockup (frontend)                       │
│     Optional: text instructions for clarification               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. POST /ai/generate (Express API)                             │
│     - Multer receives file upload                               │
│     - JWT auth middleware verifies user                         │
│     - aiRateLimiter checks quota (10/hour, shared with Phase 6) │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Load Dynamic AI Context (shared with Phase 6)               │
│     GET /ai/context returns:                                    │
│     - Current design_settings (colors, fonts, radius, shadows)  │
│     - Component library index (_COMPONENT_LIBRARY_INDEX.md)     │
│     - Detailed component docs (all 18 .md files)                │
│     NO STATIC FILES - all generated from DB + component-docs/   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. AI Vision Analysis (user chooses provider)                  │
│     OPTION A: OpenAI GPT-4o (specialized for image-to-code)     │
│     OPTION B: Anthropic Claude Sonnet (same as Phase 6)         │
│                                                                 │
│     System Prompt: Design tokens + component library + rules    │
│     User Prompt: Base64 image + optional text instructions      │
│     Response: PRIMARY = page_components[], SECONDARY = HTML     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Post-processing & Validation                                │
│     - Parse JSON response (page_components[] or custom HTML)    │
│     - Validate: heading hierarchy, schema compliance            │
│     - Sanitize HTML (strip <script>, dangerous attributes)      │
│     - Log to security_logs table                                │
│     - Track to ai_usage table (shared with Phase 6)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Return JSON response to frontend                            │
│     PRIMARY: { mode: "components", data: [...] }                │
│     SECONDARY: { mode: "html", data: "<section>...</section>" } │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Frontend renders preview + allows editing                   │
│     - Preview tab: <iframe> with design tokens injected         │
│     - Components tab: Editable component list (if PRIMARY mode) │
│     - Code tab: Syntax-highlighted HTML (if SECONDARY mode)     │
│     - "Gem til side" → saves to page_components table           │
│     - "Publicer" → triggers rebuild                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Integration Points with Phase 6

| Phase 6 Asset | How Phase 7 Uses It |
|---------------|---------------------|
| `design_settings` table | Dynamic AI context (current colors, fonts, shapes) |
| `component-docs/` folder | AI reads to understand available components |
| `_COMPONENT_LIBRARY_INDEX.md` | AI's master reference for component selection |
| `components` table | AI knows which components exist, their schemas |
| `page_components` table | Phase 7 saves output here (same as Phase 6 AI) |
| `ai_usage` table | Shared usage tracking (Phase 6 = page_assembly, Phase 7 = visual_generation) |
| `aiRateLimiter` middleware | Shared rate limiting (10 AI calls/hour total) |
| `/ai/context` endpoint | **NEW** - generates dynamic context for both AI agents |

---

## 3. File Structure & Integration

### 3.1. New Files to Create

```
lavprishjemmeside.dk/
├── api/
│   ├── .env                            # Add: AI_PROVIDER (openai or anthropic)
│   │                                   # Add: OPENAI_API_KEY (if using OpenAI)
│   ├── package.json                    # Add: openai (optional), multer
│   ├── src/
│   │   └── routes/
│   │       ├── ai-context.js           # NEW: Dynamic context generator (shared)
│   │       └── ai-generate.js          # NEW: Visual page builder endpoint
└── src/
    └── pages/
        └── admin/
            └── byggeklodser.astro      # NEW: Frontend UI for visual builder
```

### 3.2. Files to Modify

| File | Changes |
|------|---------|
| `api/package.json` | Add dependencies: `multer`, optionally `openai` |
| `api/server.cjs` | Import and mount `/ai/generate` route, `/ai/context` route |
| `api/.env.example` | Add `AI_PROVIDER=anthropic` (or `openai`), `OPENAI_API_KEY=` (if using OpenAI) |
| `src/layouts/AdminLayout.astro` | Already updated in Phase 6 with "Byggeklodser" link |
| `api/src/middleware/rateLimit.js` | Already updated in Phase 6 with shared `aiRateLimiter` |

---

## 4. Dynamic AI Context System (Shared with Phase 6)

### 4.1. Why Dynamic Context is Critical

**Problem with static files**: Design tokens change. Colors, fonts, border radius, shadows — all controlled by `design_settings` table. If we hardcoded "use bg-blue-600" in a static file, the AI would generate blue components even when the client's brand is purple.

**Solution**: Generate AI context **dynamically** at request time from database + component docs.

### 4.2. Dynamic Context Endpoint

**File**: `api/src/routes/ai-context.js`

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// GET /ai/context — Generate dynamic AI context
router.get('/context', requireAuth, async (req, res) => {
  try {
    // 1. Load current design settings from database
    const [settings] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );
    const tokens = settings[0];

    // 2. Load component library index
    const indexPath = path.join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md');
    const libraryIndex = fs.readFileSync(indexPath, 'utf-8');

    // 3. Optionally load all component docs (for detailed context)
    const componentDocs = loadAllComponentDocs(); // Helper function

    // 4. Build dynamic context
    const context = {
      designTokens: {
        colors: {
          primary: tokens.color_primary,
          primary_hover: tokens.color_primary_hover,
          primary_light: tokens.color_primary_light,
          secondary: tokens.color_secondary,
          secondary_hover: tokens.color_secondary_hover,
          secondary_light: tokens.color_secondary_light,
          accent: tokens.color_accent,
          accent_hover: tokens.color_accent_hover,
          neutral_50: tokens.color_neutral_50,
          neutral_100: tokens.color_neutral_100,
          neutral_200: tokens.color_neutral_200,
          neutral_300: tokens.color_neutral_300,
          neutral_600: tokens.color_neutral_600,
          neutral_700: tokens.color_neutral_700,
          neutral_800: tokens.color_neutral_800,
          neutral_900: tokens.color_neutral_900
        },
        typography: {
          font_heading: tokens.font_heading,
          font_body: tokens.font_body,
          font_size_base: tokens.font_size_base
        },
        shapes: {
          border_radius: tokens.border_radius, // 'small', 'medium', 'large', etc.
          shadow_style: tokens.shadow_style     // 'none', 'subtle', 'medium', 'dramatic'
        }
      },
      componentLibrary: {
        index: libraryIndex,
        components: componentDocs
      },
      cssVariableSyntax: {
        colors: 'bg-[var(--color-primary)]',
        text: 'text-[var(--color-text-primary)]',
        radius: 'rounded-[var(--radius-button)]',
        shadow: 'shadow-[var(--shadow-card)]',
        critical: 'NEVER use hardcoded Tailwind classes like bg-blue-600. Always use CSS variables.'
      }
    };

    res.json(context);
  } catch (error) {
    console.error('Error generating AI context:', error.message);
    res.status(500).json({ error: 'Kunne ikke generere AI-kontekst' });
  }
});

// Helper: Load all component docs
function loadAllComponentDocs() {
  const docsDir = path.join(__dirname, '../component-docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && f !== '_COMPONENT_LIBRARY_INDEX.md');

  const docs = {};
  for (const file of files) {
    const slug = file.replace('.md', '');
    docs[slug] = fs.readFileSync(path.join(docsDir, file), 'utf-8');
  }

  return docs;
}

module.exports = router;
```

### 4.3. How AI Agents Use This Context

**Phase 6 AI (Content Assembly)**:
```javascript
const contextRes = await fetch(`${API_BASE}/ai/context`, {
  headers: { Authorization: `Bearer ${token}` }
});
const context = await contextRes.json();

// Use in Anthropic prompt:
const systemPrompt = `
You are assembling a page from a content brief.

CURRENT DESIGN TOKENS:
Primary Color: ${context.designTokens.colors.primary}
Font Heading: ${context.designTokens.typography.font_heading}
Border Radius: ${context.designTokens.shapes.border_radius}

${context.cssVariableSyntax.critical}

COMPONENT LIBRARY:
${context.componentLibrary.index}
...
`;
```

**Phase 7 AI (Visual Generation)**:
```javascript
const contextRes = await fetch(`${API_BASE}/ai/context`, {
  headers: { Authorization: `Bearer ${token}` }
});
const context = await contextRes.json();

// Use in OpenAI/Anthropic vision prompt:
const systemPrompt = `
You are analyzing a design mockup and generating production-ready HTML.

CURRENT DESIGN TOKENS (use these exact values):
- Primary Button: bg-[var(--color-primary)] (currently ${context.designTokens.colors.primary})
- Text Primary: text-[var(--color-text-primary)] (currently ${context.designTokens.colors.neutral_900})
- Button Radius: rounded-[var(--radius-button)] (currently ${context.designTokens.shapes.border_radius})

${context.cssVariableSyntax.critical}

AVAILABLE COMPONENTS:
${context.componentLibrary.index}
...
`;
```

---

## 5. Visual Page Builder Endpoint

### 5.1. API Route Implementation

**File**: `api/src/routes/ai-generate.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimit');
const sanitizeHtml = require('sanitize-html');

// Configure multer for image uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Kun JPG, PNG og WebP billeder er tilladt'));
    }
  }
});

// POST /ai/generate — Visual page builder
router.post('/generate', requireAuth, aiRateLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Billede er påkrævet' });
    }

    const { instructions, mode } = req.body; // mode: 'components' (default) or 'html'
    const imageBase64 = req.file.buffer.toString('base64');
    const imageMimeType = req.file.mimetype;

    // 1. Load dynamic AI context
    const context = await loadAIContext();

    // 2. Choose AI provider (configurable via .env)
    const provider = process.env.AI_PROVIDER || 'anthropic'; // 'anthropic' or 'openai'
    let result;

    if (provider === 'openai') {
      result = await generateWithOpenAI(imageBase64, imageMimeType, instructions, context, mode);
    } else {
      result = await generateWithAnthropic(imageBase64, imageMimeType, instructions, context, mode);
    }

    // 3. Validate & sanitize
    if (result.mode === 'components') {
      result.data = validateComponentArray(result.data);
    } else {
      result.data = sanitizeHtml(result.data, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['section', 'article', 'header', 'footer', 'nav']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['class', 'style', 'id']
        }
      });
    }

    // 4. Track AI usage
    await pool.execute(
      `INSERT INTO ai_usage (user_id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, input_metadata, output_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'visual_generation',
        result.model,
        result.usage.prompt_tokens,
        result.usage.completion_tokens,
        result.usage.total_tokens,
        result.usage.cost_usd,
        JSON.stringify({ image_size: req.file.size, instructions, mode }),
        JSON.stringify({ output_mode: result.mode, components_count: result.mode === 'components' ? result.data.length : null })
      ]
    );

    // 5. Log security event
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'ai.visual_generation.success',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ mode: result.mode, provider })
      ]
    );

    // 6. Return result
    res.json({
      ok: true,
      mode: result.mode,
      data: result.data,
      provider,
      usage: result.usage
    });

  } catch (error) {
    console.error('Visual generation error:', error.message);

    // Log error
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'ai.visual_generation.error',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ error: error.message })
      ]
    );

    res.status(500).json({ error: 'Billedgenerering fejlede. Prøv igen' });
  }
});

// Helper: Load AI context from context endpoint
async function loadAIContext() {
  // Simulates internal call to /ai/context
  const [settings] = await pool.execute('SELECT * FROM design_settings WHERE site_id = 1');
  const libraryIndex = fs.readFileSync(
    require('path').join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md'),
    'utf-8'
  );

  return {
    designTokens: {
      colors: {
        primary: settings[0].color_primary,
        // ... all other colors
      },
      typography: {
        font_heading: settings[0].font_heading,
        font_body: settings[0].font_body
      },
      shapes: {
        border_radius: settings[0].border_radius,
        shadow_style: settings[0].shadow_style
      }
    },
    componentLibrary: libraryIndex
  };
}

// Helper: Generate with OpenAI GPT-4o Vision
async function generateWithOpenAI(imageBase64, imageMimeType, instructions, context, mode) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = buildSystemPrompt(context, mode);
  const userPrompt = instructions || 'Analyser dette design og generer en side';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096
  });

  const output = response.choices[0].message.content;

  return {
    mode: mode === 'html' ? 'html' : 'components',
    data: parseAIOutput(output, mode),
    model: 'gpt-4o',
    usage: {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
      cost_usd: calculateOpenAICost(response.usage)
    }
  };
}

// Helper: Generate with Anthropic Claude Sonnet Vision
async function generateWithAnthropic(imageBase64, imageMimeType, instructions, context, mode) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildSystemPrompt(context, mode);
  const userPrompt = instructions || 'Analyser dette design og generer en side';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageMimeType,
              data: imageBase64
            }
          }
        ]
      }
    ]
  });

  const output = response.content[0].text;

  return {
    mode: mode === 'html' ? 'html' : 'components',
    data: parseAIOutput(output, mode),
    model: 'claude-sonnet-4-20250514',
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      cost_usd: calculateAnthropicCost(response.usage)
    }
  };
}

// Helper: Build system prompt
function buildSystemPrompt(context, mode) {
  const basePrompt = `
You are a world-class web developer analyzing a design mockup to generate production-ready code.

CURRENT DESIGN TOKENS (use these exact values in your output):
Colors:
- Primary: ${context.designTokens.colors.primary}
- Secondary: ${context.designTokens.colors.secondary}
- Accent: ${context.designTokens.colors.accent}
Typography:
- Heading Font: ${context.designTokens.typography.font_heading}
- Body Font: ${context.designTokens.typography.font_body}
Shapes:
- Border Radius: ${context.designTokens.shapes.border_radius}
- Shadow Style: ${context.designTokens.shapes.shadow_style}

CRITICAL CSS VARIABLE RULES:
- ALWAYS use bg-[var(--color-primary)] NOT bg-blue-600
- ALWAYS use text-[var(--color-text-primary)] NOT text-gray-900
- ALWAYS use rounded-[var(--radius-button)] NOT rounded-lg
- ALWAYS use shadow-[var(--shadow-card)] NOT shadow-md

AVAILABLE COMPONENT LIBRARY:
${context.componentLibrary}
`;

  if (mode === 'html') {
    return basePrompt + `
OUTPUT MODE: Custom HTML
Generate semantic HTML using Tailwind v4 utilities and CSS variables.
Wrap in a single <section> element.
Use proper heading hierarchy (start with H2, use H3 for sub-headings).
Return ONLY the HTML, no explanations.
`;
  } else {
    return basePrompt + `
OUTPUT MODE: Component Mapping (PRIMARY)
Analyze the mockup and identify which existing components from the library match the design.
Return a JSON array of page_components in this exact format:
[
  {
    "component_slug": "hero-centered",
    "sort_order": 1,
    "heading_level_override": "h1",
    "content": {
      "headline": "...",
      "subheadline": "...",
      "cta_text": "...",
      "cta_url": "..."
    }
  },
  ...
]

Rules:
- First component must be an opener (hero-centered, hero-split, or hero-image-bg) with H1
- All subsequent sections use H2
- Match mockup sections to existing components when possible
- Fill content slots with placeholder Danish text if not readable in mockup
- Return ONLY valid JSON, no markdown code fences
`;
  }
}

// Helper: Parse AI output
function parseAIOutput(output, mode) {
  if (mode === 'html') {
    // Strip markdown code fences if present
    let html = output.trim();
    if (html.startsWith('```html')) {
      html = html.replace(/```html\n?/, '').replace(/\n?```$/, '');
    } else if (html.startsWith('```')) {
      html = html.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    return html.trim();
  } else {
    // Parse JSON
    let json = output.trim();
    if (json.startsWith('```json')) {
      json = json.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (json.startsWith('```')) {
      json = json.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    return JSON.parse(json);
  }
}

// Helper: Validate component array
function validateComponentArray(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('AI returnerede ingen komponenter');
  }

  // Basic validation
  const openerSlugs = ['hero-centered', 'hero-split', 'hero-image-bg'];
  if (!openerSlugs.includes(components[0].component_slug)) {
    throw new Error('Første komponent skal være en hero');
  }

  const h1Count = components.filter(c => c.heading_level_override === 'h1').length;
  if (h1Count !== 1) {
    throw new Error('Der skal være præcis én H1');
  }

  return components;
}

// Helper: Calculate OpenAI cost
function calculateOpenAICost(usage) {
  // GPT-4o pricing (as of 2025): ~$5/1M input tokens, ~$15/1M output tokens
  const inputCost = (usage.prompt_tokens / 1000000) * 5;
  const outputCost = (usage.completion_tokens / 1000000) * 15;
  return inputCost + outputCost;
}

// Helper: Calculate Anthropic cost
function calculateAnthropicCost(usage) {
  // Claude Sonnet pricing: ~$3/1M input tokens, ~$15/1M output tokens
  const inputCost = (usage.input_tokens / 1000000) * 3;
  const outputCost = (usage.output_tokens / 1000000) * 15;
  return inputCost + outputCost;
}

module.exports = router;
```

### 5.2. Key Implementation Details

**AI Provider Choice**:
- User can choose between OpenAI (gpt-4o) or Anthropic (claude-sonnet-4) via `.env`
- OpenAI may have better image-to-code quality (specialized training)
- Anthropic uses same model as Phase 6 (consistency, single API key)
- Cost tracking works for both

**Output Modes**:
1. **PRIMARY (components)**: AI maps mockup → existing components → returns `page_components[]`
2. **SECONDARY (html)**: AI generates custom HTML with CSS variables for unique sections

**Rate Limiting**: Shared `aiRateLimiter` (10/hour total across Phase 6 + Phase 7)

**Usage Tracking**: Shared `ai_usage` table with `operation = 'visual_generation'`

---

## 6. Frontend UI (`/admin/byggeklodser`)

### 6.1. Page Layout

**File**: `src/pages/admin/byggeklodser.astro`

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
---

<AdminLayout title="Byggeklodser">
  <div class="max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-2">Visual Page Builder</h1>
    <p class="text-gray-600 mb-8">Upload et designmockup og lad AI generere din side</p>

    <!-- Upload Form -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">1. Upload Mockup</h2>

      <div id="dropzone" class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition">
        <input type="file" id="imageInput" accept="image/*" class="hidden">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mt-2 text-sm text-gray-600">Klik for at uploade eller træk billede hertil</p>
        <p class="text-xs text-gray-500 mt-1">JPG, PNG eller WebP (max 5MB)</p>
      </div>

      <div id="preview" class="mt-4 hidden">
        <img id="previewImage" class="max-w-full h-auto rounded border">
        <button id="removeImage" class="mt-2 text-sm text-red-600 hover:underline">Fjern billede</button>
      </div>

      <!-- Instructions (optional) -->
      <div class="mt-4">
        <label class="block text-sm font-medium mb-2">Instruktioner (valgfrit)</label>
        <textarea
          id="instructions"
          rows="3"
          class="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Eks: 'Fokuser på hero-sektionen' eller 'Ignorer sidefoden'"
        ></textarea>
      </div>

      <!-- Mode Selection -->
      <div class="mt-4">
        <label class="block text-sm font-medium mb-2">Output Mode</label>
        <div class="flex gap-4">
          <label class="flex items-center">
            <input type="radio" name="mode" value="components" checked class="mr-2">
            <span>Komponenter (anbefalet)</span>
          </label>
          <label class="flex items-center">
            <input type="radio" name="mode" value="html" class="mr-2">
            <span>Custom HTML (avanceret)</span>
          </label>
        </div>
      </div>

      <!-- Generate Button -->
      <button
        id="generateBtn"
        class="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled
      >
        Generer Side
      </button>
      <span id="loadingText" class="ml-3 text-sm text-gray-600 hidden">Genererer... (dette tager 10-30 sekunder)</span>
    </div>

    <!-- Results -->
    <div id="results" class="hidden">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">2. Gennemse & Rediger</h2>

        <!-- Tabs -->
        <div class="border-b mb-4">
          <button id="previewTab" class="px-4 py-2 border-b-2 border-blue-600 font-medium">Preview</button>
          <button id="codeTab" class="px-4 py-2 border-b-2 border-transparent hover:border-gray-300">Kode</button>
          <button id="componentsTab" class="px-4 py-2 border-b-2 border-transparent hover:border-gray-300 hidden">Komponenter</button>
        </div>

        <!-- Preview Panel -->
        <div id="previewPanel">
          <iframe id="previewIframe" class="w-full h-[600px] border rounded"></iframe>
        </div>

        <!-- Code Panel -->
        <div id="codePanel" class="hidden">
          <pre><code id="codeOutput" class="language-html"></code></pre>
          <button id="copyCodeBtn" class="mt-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Kopier Kode</button>
        </div>

        <!-- Components Panel (only for component mode) -->
        <div id="componentsPanel" class="hidden">
          <div id="componentList" class="space-y-4"></div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-4">
          <button id="saveToPageBtn" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
            Gem til Side
          </button>
          <button id="publishBtn" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Publicer
          </button>
          <button id="newGenerationBtn" class="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300">
            Ny Generering
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Implementation details...
    // File upload, drag-and-drop, API call to /ai/generate, result rendering
    // See full implementation in Phase 7 detailed spec
  </script>
</AdminLayout>
```

### 6.2. Preview iframe with Design Tokens

**CRITICAL**: The preview iframe must inject current design tokens, NOT use generic Tailwind CDN.

```javascript
function renderPreview(html) {
  // Fetch current design tokens
  const tokens = await fetch('/api/design-settings', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }).then(r => r.json());

  const iframeDoc = `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --color-primary: ${tokens.color_primary};
      --color-primary-hover: ${tokens.color_primary_hover};
      --color-primary-light: ${tokens.color_primary_light};
      --color-secondary: ${tokens.color_secondary};
      --color-accent: ${tokens.color_accent};
      --color-text-primary: ${tokens.color_neutral_900};
      --color-text-secondary: ${tokens.color_neutral_600};
      --color-bg-page: #FFFFFF;
      --color-bg-section-alt: ${tokens.color_neutral_50};
      --color-border: ${tokens.color_neutral_200};
      --font-heading: ${tokens.font_heading}, sans-serif;
      --font-body: ${tokens.font_body}, sans-serif;
      --radius-button: ${mapRadiusToCSS(tokens.border_radius)};
      --radius-card: ${mapRadiusToCSS(tokens.border_radius, true)};
      --shadow-card: ${mapShadowToCSS(tokens.shadow_style)};
    }
    body {
      font-family: var(--font-body);
      margin: 0;
      padding: 0;
    }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=${tokens.font_heading}:wght@400;500;600;700&family=${tokens.font_body}:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  ${html}
</body>
</html>
  `;

  document.getElementById('previewIframe').srcdoc = iframeDoc;
}
```

---

## 7. Environment Variables

### 7.1. Required Variables

Add to `api/.env`:
```bash
# AI Provider (choose one)
AI_PROVIDER=anthropic  # or 'openai'

# Anthropic API Key (already set from Phase 6)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# OpenAI API Key (only if AI_PROVIDER=openai)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

Add to `api/.env.example`:
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

## 8. Dependencies

Add to `api/package.json`:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",  // Already added in Phase 6
    "openai": "^4.47.0",              // NEW (optional, only if using OpenAI)
    "multer": "^1.4.5-lts.1",         // NEW
    "sanitize-html": "^2.13.0"        // NEW
  }
}
```

---

## 9. Testing & Validation

### 9.1. Test Cases

**Upload & Generation**:
- [ ] Upload PNG mockup → receives component array
- [ ] Upload JPG mockup → receives component array
- [ ] Upload with instructions → AI follows instructions
- [ ] Select "Custom HTML" mode → receives HTML string
- [ ] Rate limit triggers after 10 requests in 1 hour
- [ ] Invalid file type rejected (PDF, GIF)
- [ ] File > 5MB rejected

**Output Validation**:
- [ ] Component mode: exactly one H1, all components have valid slugs
- [ ] HTML mode: no `<script>` tags, no dangerous attributes
- [ ] CSS variables used throughout (no hardcoded `bg-blue-600`)
- [ ] Preview iframe renders with current design tokens

**Integration with Phase 6**:
- [ ] Generated components save to `page_components` table
- [ ] Components editable in `/admin/pages` page builder
- [ ] Publish flow works end-to-end
- [ ] AI usage tracked in shared `ai_usage` table
- [ ] Rate limiter shared between Phase 6 & Phase 7 endpoints

### 9.2. Quality Checks

**AI Output Quality**:
- Test with various mockup types (wireframes, high-fidelity designs, screenshots)
- Compare OpenAI vs Anthropic output quality
- Verify heading hierarchy is always correct
- Ensure Danish language in generated content

**Security**:
- HTML sanitization blocks XSS attempts
- File upload doesn't accept executables
- Rate limiting prevents abuse
- Security logs capture all generations

---

## 10. Cost Tracking & Monetization

### 10.1. Current Free Tier

No monetization in MVP. All authenticated users have:
- 10 AI operations/hour (shared between Phase 6 content assembly + Phase 7 visual generation)
- Unlimited manual page building
- Unlimited design token changes

### 10.2. Future Premium Tier (Phase 8+)

**Suggested structure** (not implemented yet):
- **Free tier**: 10 AI operations/month total
- **Starter tier (299 kr/mo)**: 50 AI operations/month
- **Pro tier (799 kr/mo)**: Unlimited AI operations

Track usage with:
```sql
SELECT COUNT(*) FROM ai_usage WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 MONTH);
```

### 10.3. Cost Analysis

**Per Generation Estimate**:
- OpenAI GPT-4o: ~$0.10 (with large images)
- Anthropic Claude Sonnet: ~$0.05
- Average: **~$0.07 per generation**

**Monthly Cost @ 100 Generations/Month**: ~$7
**Revenue @ 299 kr tier**: ~€40 (~$44)
**Margin**: ~84%

---

## 11. Future Enhancements (Phase 8+)

### 11.1. "Save as Component" (Component Library Expansion)

Allow admin to save AI-generated HTML sections as new reusable components:

1. AI generates custom HTML (SECONDARY mode)
2. Admin reviews output
3. Click "Gem som Komponent"
4. Admin annotates content slots (which parts are editable)
5. System generates `schema_fields` JSON
6. New component saved to `components` table
7. Immediately available in page builder + for AI Content Developer

**Implementation complexity**: HIGH (requires content slot annotation UI)
**Value**: Allows component library to grow organically with each client project

### 11.2. Batch Generation

Upload multiple mockup images → generate multi-page site in one operation.

### 11.3. Style Transfer

"Apply this design's styling to all existing pages" — extracts colors/fonts from mockup, updates `design_settings`.

### 11.4. Figma/Adobe XD Plugin Integration

Direct integration with design tools (requires API access + plugin development).

---

## 12. Summary

**Phase 7 Visual Page Builder** is a seamless extension of Phase 6:

✅ **Shared Infrastructure**:
- Same `aiRateLimiter` (10/hour for all AI ops)
- Same `ai_usage` table (operation type: 'visual_generation')
- Same component documentation system
- Same security logging pattern

✅ **Dynamic Context System**:
- `/ai/context` endpoint generates context from DB + component docs
- No static files that can go stale
- Always uses current design tokens

✅ **Flexible AI Provider**:
- Choose OpenAI (gpt-4o) or Anthropic (claude-sonnet-4)
- Both support vision analysis
- User can A/B test quality

✅ **Compatible Output**:
- PRIMARY mode: `page_components[]` (works with Phase 6 page builder)
- SECONDARY mode: Custom HTML with CSS variables

✅ **Production-Ready**:
- HTML sanitization (XSS prevention)
- File upload validation
- Rate limiting
- Usage tracking
- Error handling

**Estimated Implementation**: 2-3 weeks
**Integration Effort**: LOW (Phase 6 did the heavy lifting)
**Client Value**: HIGH (visual mockup → production page in 30 seconds)

---

**Document version**: 2.0 (Integrated with Phase 6)
**Last updated**: 2026-02-15
**Status**: ✅ Ready for implementation after Phase 6 completion

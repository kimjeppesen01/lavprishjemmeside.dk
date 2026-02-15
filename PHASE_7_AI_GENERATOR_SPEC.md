# Phase 7: AI Building Block Generator - Technical Specification

> **Status**: Future implementation (Premium feature)
> **Dependencies**: Phase 6 (Component Library) should be completed first
> **Estimated Implementation**: 2-3 weeks
> **Monetization**: Free tier (5 generations/month) + Premium (unlimited)

---

## 1. Feature Overview

The **AI Building Block Generator** is an internal tool located within the protected `/admin/byggeklodser` dashboard route. It accepts a reference image (design mockup, screenshot, wireframe) and optional unstyled HTML structure. It utilizes the **OpenAI Vision API (`gpt-4o`)** alongside a local **"Context Library"** of the site's existing Tailwind v4 utility classes and component patterns to generate production-ready, brand-aligned HTML.

**Core Value Proposition**:
- Converts design mockups to code in seconds (vs hours of manual coding)
- Ensures brand consistency (uses site's actual colors/fonts, not generic Tailwind)
- Reduces client onboarding time (quickly prototype components from their designs)
- Premium upsell opportunity (free tier → paid upgrade funnel)

---

## 2. System Architecture & Integration Points

### 2.1. High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User uploads design mockup + optional HTML (frontend)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. POST /api/ai/generate-component (Express API)              │
│     - Multer receives file upload                               │
│     - JWT auth middleware verifies user                         │
│     - Rate limiter checks quota (10/hour)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Load Context Library (api/src/ai-context/)                 │
│     - colors-typography.md (brand colors, fonts, spacing)       │
│     - buttons.html (standard button styles)                     │
│     - cards.html (card component examples)                      │
│     - ... (other component examples)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. OpenAI Vision API (gpt-4o)                                  │
│     - System Prompt: Design system context + rules             │
│     - User Prompt: Base64 image + optional HTML + instructions │
│     - Response: Production-ready Tailwind HTML                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Post-processing & Security                                  │
│     - Strip markdown code fences (```html)                      │
│     - Sanitize HTML (DOMPurify on server)                       │
│     - Log to security_logs table                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Return JSON response to frontend                            │
│     { success: true, data: { generatedHtml: "..." } }          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Frontend renders preview + code view                        │
│     - Preview tab: <iframe srcdoc="..."> for isolation         │
│     - Code tab: Syntax-highlighted <pre><code>                 │
│     - Copy to clipboard button                                  │
│     - "Save as Component" → stores in components table         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure & Integration

### 3.1. New Files to Create

```
lavprishjemmeside.dk/
├── api/
│   ├── package.json                    # Add: openai, multer, dompurify
│   ├── .env                            # Add: OPENAI_API_KEY
│   ├── src/
│   │   ├── ai-context/                 # NEW: Context library (RAG for UI)
│   │   │   ├── README.md               # How to update context library
│   │   │   ├── colors-typography.md    # Brand colors, fonts, spacing
│   │   │   ├── buttons.html            # Standard button examples
│   │   │   ├── cards.html              # Card component examples
│   │   │   ├── forms.html              # Form input examples
│   │   │   └── sections.html           # Full section examples (hero, features)
│   │   └── routes/
│   │       └── ai-generator.cjs        # NEW: Express route for OpenAI integration
└── src/
    └── pages/
        └── admin/
            └── byggeklodser.astro      # NEW: Frontend UI for the generator
```

### 3.2. Files to Modify

| File | Changes |
|------|---------|
| `api/package.json` | Add dependencies: `openai`, `multer`, `dompurify` |
| `api/server.cjs` | Import and mount `/ai/generate-component` route |
| `api/.env.example` | Add `OPENAI_API_KEY=sk-...` |
| `src/layouts/AdminLayout.astro` | Add "Byggeklodser" link to sidebar nav |
| `api/src/middleware/rateLimit.js` | Add `aiGeneratorRateLimiter` (10/hour per user) |

---

## 4. The "Context Library" (RAG for UI)

### 4.1. Why Context is Critical

**Problem**: Without context, OpenAI will:
- Use default Tailwind colors (`bg-blue-500`) instead of your brand colors
- Generate inconsistent button styles
- Hallucinate component patterns that don't match your design system
- Produce HTML that looks generic, not brand-aligned

**Solution**: Feed the AI your **actual design system** as part of the system prompt.

### 4.2. Context Library Structure

**File**: `api/src/ai-context/colors-typography.md`

```markdown
# Design System Context (lavprishjemmeside.dk)

## Brand Colors (Tailwind v4 CSS Variables)

**Primary Action Colors:**
- Primary Button: `bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`
- Secondary Button: `bg-slate-200 text-slate-900 hover:bg-slate-300`
- Danger Button: `bg-red-600 text-white hover:bg-red-700`

**Background Colors:**
- Light Background: `bg-slate-50`
- White Background: `bg-white`
- Dark Background: `bg-slate-900`
- Accent Background: `bg-blue-50`

**Text Colors:**
- Heading Text: `text-slate-900`
- Body Text: `text-slate-600`
- Muted Text: `text-slate-400`
- Link Text: `text-blue-600 hover:text-blue-700`

## Typography Scale

**Headings:**
- H1 (Hero): `text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900`
- H2 (Section): `text-3xl md:text-4xl font-bold tracking-tight text-slate-900`
- H3 (Subsection): `text-2xl md:text-3xl font-semibold text-slate-900`

**Body Text:**
- Large Body: `text-lg md:text-xl leading-relaxed text-slate-600`
- Normal Body: `text-base leading-relaxed text-slate-600`
- Small Text: `text-sm text-slate-500`

## Spacing System

**Section Padding:**
- Standard Sections: `py-16 md:py-24 px-4 sm:px-6 lg:px-8`
- Compact Sections: `py-8 md:py-12 px-4 sm:px-6 lg:px-8`
- Hero Sections: `py-20 md:py-32 px-4 sm:px-6 lg:px-8`

**Container Widths:**
- Max Width Container: `max-w-7xl mx-auto`
- Narrow Content: `max-w-3xl mx-auto`
- Wide Content: `max-w-6xl mx-auto`

## Border Radius & Shadows

**Border Radius:**
- Buttons: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Images: `rounded-2xl` (16px)

**Shadows:**
- Card Shadow: `shadow-lg`
- Button Hover: `hover:shadow-xl`
- Elevated Card: `shadow-2xl`
```

**File**: `api/src/ai-context/buttons.html`

```html
<!-- Standard Primary Button -->
<button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
  Primær knap
</button>

<!-- Secondary Button -->
<button class="bg-slate-200 text-slate-900 px-6 py-3 rounded-lg hover:bg-slate-300 transition-colors font-medium">
  Sekundær knap
</button>

<!-- Large CTA Button -->
<button class="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg">
  Få et gratis tilbud
</button>

<!-- Icon Button -->
<button class="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors">
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
  </svg>
</button>
```

**File**: `api/src/ai-context/cards.html`

```html
<!-- Feature Card -->
<div class="bg-white rounded-xl shadow-lg p-8">
  <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
    <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  </div>
  <h3 class="text-xl font-semibold text-slate-900 mb-2">Hurtig levering</h3>
  <p class="text-base text-slate-600 leading-relaxed">
    Vi leverer din hjemmeside inden for 2 uger. Intet bøvl, bare resultater.
  </p>
</div>

<!-- Pricing Card -->
<div class="bg-white rounded-xl shadow-lg p-8 border-2 border-blue-600">
  <div class="text-center">
    <h3 class="text-2xl font-bold text-slate-900 mb-2">Basis</h3>
    <div class="mb-4">
      <span class="text-4xl font-bold text-slate-900">4.999 kr</span>
      <span class="text-slate-600">/engangsbeløb</span>
    </div>
    <ul class="text-left space-y-3 mb-8">
      <li class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="text-slate-600">5 sider inkluderet</span>
      </li>
      <li class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="text-slate-600">Mobilvenligt design</span>
      </li>
    </ul>
    <button class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
      Vælg plan
    </button>
  </div>
</div>
```

### 4.3. Loading Context in Backend

**File**: `api/src/routes/ai-generator.cjs`

```javascript
const fs = require('fs');
const path = require('path');

// Load entire context library on startup (cache for performance)
function loadContextLibrary() {
  const contextDir = path.join(__dirname, '../ai-context');
  const files = fs.readdirSync(contextDir).filter(f => f !== 'README.md');

  let context = '';
  files.forEach(file => {
    const filePath = path.join(contextDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    context += `\n\n--- ${file} ---\n${content}`;
  });

  return context;
}

const DESIGN_SYSTEM_CONTEXT = loadContextLibrary();
```

---

## 5. API Endpoint Specification

### 5.1. Route Definition

**Endpoint**: `POST /api/ai/generate-component`
**File**: `api/src/routes/ai-generator.cjs` (Must use `.cjs` per cPanel ESM restrictions)
**Authentication**: Required (JWT via `auth.js` middleware)
**Rate Limiting**: 10 requests/hour per user (`aiGeneratorRateLimiter`)

### 5.2. Middleware Stack

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth.js');
const { aiGeneratorRateLimiter } = require('../middleware/rateLimit.js');
const { logSecurityEvent } = require('../middleware/logger.js');

// Multer memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP allowed.'));
    }
  }
});

router.post(
  '/generate-component',
  authenticateToken,           // Verify JWT
  aiGeneratorRateLimiter,      // Rate limit: 10/hour
  upload.single('image'),      // Parse multipart/form-data
  async (req, res) => {
    // Implementation below
  }
);

module.exports = router;
```

### 5.3. Request Payload (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | Yes | Reference design image (PNG/JPG/WEBP, max 5MB) |
| `html` | String | No | Raw, unstyled HTML structure. If empty, AI generates structure from image. |
| `instructions` | String | No | Additional user prompts (e.g., "Make the button red instead of blue") |

**Example cURL request**:

```bash
curl -X POST https://api.lavprishjemmeside.dk/api/ai/generate-component \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@mockup.png" \
  -F "html=<div><h1>Velkommen</h1><p>Vi bygger websites</p></div>" \
  -F "instructions=Use a darker blue for the button"
```

### 5.4. OpenAI Prompt Engineering

**System Prompt** (Hardcoded in `ai-generator.cjs`):

```javascript
const SYSTEM_PROMPT = `
You are an expert frontend developer building UI components for lavprishjemmeside.dk, a Danish web agency.

Your task is to output production-ready HTML using STRICTLY Tailwind CSS v4 utility classes.

DESIGN SYSTEM CONTEXT:
${DESIGN_SYSTEM_CONTEXT}

STRICT RULES:
1. ONLY output valid HTML code. No markdown formatting, no explanations, no \`\`\`html wrappers.
2. You MUST heavily rely on the specific classes provided in the DESIGN SYSTEM CONTEXT above.
3. Ensure full mobile responsiveness using sm:, md:, and lg: breakpoints.
4. All dummy text MUST be in Danish.
5. Use semantic HTML5 elements (<section>, <article>, <nav>, etc.).
6. If raw HTML is provided by the user, apply styles to that structure. If no HTML is provided, deduce the structure from the image.
7. Always use aria-labels for accessibility where appropriate.
8. Never use inline styles or <style> tags. Only Tailwind utility classes.
9. Follow mobile-first design principles.
10. Use the EXACT color classes from the context (e.g., bg-blue-600, NOT bg-blue-500).
`.trim();
```

**User Prompt** (Dynamic, constructed from request data):

```javascript
const userPrompt = `
REFERENCE IMAGE: [see attached image]

${req.body.html ? `EXISTING HTML STRUCTURE:\n${req.body.html}\n` : 'Generate HTML structure from the image.'}

${req.body.instructions ? `ADDITIONAL INSTRUCTIONS:\n${req.body.instructions}\n` : ''}

OUTPUT: Production-ready HTML using Tailwind v4 classes from the design system context.
`.trim();
```

### 5.5. OpenAI API Call

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Convert image buffer to base64 data URI
const imageBase64 = req.file.buffer.toString('base64');
const imageMimeType = req.file.mimetype;
const imageDataUri = `data:${imageMimeType};base64,${imageBase64}`;

// Call OpenAI Vision API
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  temperature: 0.1, // Low temperature for deterministic code generation
  max_tokens: 2000,
  messages: [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: imageDataUri } }
      ]
    }
  ]
});

let generatedHtml = completion.choices[0].message.content;
```

### 5.6. Post-Processing & Security

```javascript
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 1. Strip markdown code fences if AI ignored instructions
generatedHtml = generatedHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '');

// 2. Sanitize HTML (remove <script>, onclick, etc.)
generatedHtml = DOMPurify.sanitize(generatedHtml, {
  ALLOWED_TAGS: ['section', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'img', 'svg', 'path', 'ul', 'ol', 'li', 'span', 'strong', 'em'],
  ALLOWED_ATTR: ['class', 'href', 'src', 'alt', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'aria-label']
});

// 3. Log generation to security_logs
await logSecurityEvent({
  action: 'ai.generate_component.success',
  userId: req.user.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  details: {
    hasHtml: !!req.body.html,
    hasInstructions: !!req.body.instructions,
    imageSize: req.file.size,
    generatedLength: generatedHtml.length
  }
});
```

### 5.7. Response Payload

**Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "generatedHtml": "<section class=\"py-16 md:py-24 bg-slate-50\">\n  <div class=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\">\n    <h2 class=\"text-3xl md:text-4xl font-bold tracking-tight text-slate-900 text-center mb-4\">Velkommen til lavprishjemmeside.dk</h2>\n    <p class=\"text-lg leading-relaxed text-slate-600 text-center max-w-3xl mx-auto\">Vi bygger moderne websites der konverterer besøgende til kunder.</p>\n  </div>\n</section>",
    "usage": {
      "promptTokens": 1234,
      "completionTokens": 456,
      "totalTokens": 1690
    }
  }
}
```

**Error Responses**:

| Status | Error | Reason |
|--------|-------|--------|
| 400 | `No image file provided` | Missing `image` field |
| 400 | `Invalid file type` | Not JPG/PNG/WEBP |
| 413 | `File too large` | Image > 5MB |
| 401 | `Unauthorized` | Invalid/missing JWT |
| 429 | `Rate limit exceeded` | >10 requests/hour |
| 500 | `OpenAI API error` | OpenAI request failed |

---

## 6. Frontend UI Specification

### 6.1. Page Location & Layout

**File**: `src/pages/admin/byggeklodser.astro`
**Layout**: Wrapped in `<AdminLayout title="Byggeklodser">` (inherits JWT auth guard)
**URL**: `https://lavprishjemmeside.dk/admin/byggeklodser/`

### 6.2. UI Components

**Split-pane Layout** (Tailwind grid):

```astro
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Left Pane: Inputs -->
  <div class="bg-white rounded-xl shadow-lg p-6">
    <!-- Inputs here -->
  </div>

  <!-- Right Pane: Output -->
  <div class="bg-white rounded-xl shadow-lg p-6">
    <!-- Preview/Code tabs here -->
  </div>
</div>
```

**Input Components** (Left Pane):

1. **Image Upload** (Drag-and-drop zone):
   ```html
   <div id="drop-zone" class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
     <input type="file" id="image-input" accept="image/*" class="hidden">
     <p class="text-slate-600 mb-2">Træk og slip et billede her</p>
     <p class="text-sm text-slate-400">eller klik for at vælge (max 5MB)</p>
     <img id="image-preview" class="hidden mt-4 max-h-64 mx-auto rounded-lg">
   </div>
   ```

2. **HTML Input** (Optional):
   ```html
   <label for="html-input" class="block text-sm font-medium text-slate-700 mb-2">
     HTML Struktur (valgfri)
   </label>
   <textarea
     id="html-input"
     rows="6"
     placeholder="<div>&#10;  <h1>Overskrift</h1>&#10;  <p>Tekst</p>&#10;</div>"
     class="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
   ></textarea>
   ```

3. **Instructions Input** (Optional):
   ```html
   <label for="instructions" class="block text-sm font-medium text-slate-700 mb-2">
     Ekstra instruktioner (valgfri)
   </label>
   <input
     type="text"
     id="instructions"
     placeholder="F.eks. 'Brug mørkeblå knap i stedet'"
     class="w-full px-3 py-2 border border-slate-300 rounded-lg"
   >
   ```

4. **Generate Button**:
   ```html
   <button
     id="generate-btn"
     class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
   >
     <span id="btn-text">Generer Byggeklods</span>
     <svg id="btn-spinner" class="hidden animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
       <!-- Spinner SVG -->
     </svg>
   </button>
   ```

**Output Components** (Right Pane):

1. **Tabs** (Preview | Code):
   ```html
   <div class="border-b border-slate-200 mb-4">
     <nav class="flex gap-4">
       <button id="tab-preview" class="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
         Preview
       </button>
       <button id="tab-code" class="px-4 py-2 border-b-2 border-transparent text-slate-600 hover:text-slate-900">
         Kode
       </button>
     </nav>
   </div>
   ```

2. **Preview Tab Content**:
   ```html
   <div id="preview-container" class="border border-slate-200 rounded-lg p-4 min-h-96">
     <iframe
       id="preview-iframe"
       sandbox="allow-same-origin"
       class="w-full border-0"
       style="min-height: 400px;"
     ></iframe>
   </div>
   ```

3. **Code Tab Content**:
   ```html
   <div id="code-container" class="hidden">
     <div class="flex justify-between items-center mb-2">
       <span class="text-sm text-slate-600">Genereret HTML</span>
       <button id="copy-btn" class="text-sm text-blue-600 hover:text-blue-700">
         <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
         </svg>
         Kopier kode
       </button>
     </div>
     <pre><code id="code-output" class="language-html bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm"></code></pre>
   </div>
   ```

### 6.3. Client-Side Logic (Inline Script)

```javascript
<script is:inline>
(function() {
  const API = 'https://api.lavprishjemmeside.dk';
  const token = localStorage.getItem('admin_token');

  // Elements
  const dropZone = document.getElementById('drop-zone');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');
  const htmlInput = document.getElementById('html-input');
  const instructionsInput = document.getElementById('instructions');
  const generateBtn = document.getElementById('generate-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  const tabPreview = document.getElementById('tab-preview');
  const tabCode = document.getElementById('tab-code');
  const previewContainer = document.getElementById('preview-container');
  const codeContainer = document.getElementById('code-container');
  const previewIframe = document.getElementById('preview-iframe');
  const codeOutput = document.getElementById('code-output');
  const copyBtn = document.getElementById('copy-btn');

  let uploadedFile = null;

  // Drag-and-drop handlers
  dropZone.addEventListener('click', () => imageInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-600', 'bg-blue-50');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-600', 'bg-blue-50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-600', 'bg-blue-50');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  });

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
  });

  function handleImageUpload(file) {
    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // Generate component
  generateBtn.addEventListener('click', async () => {
    if (!uploadedFile) {
      alert('Upload venligst et billede først');
      return;
    }

    // Show loading state
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    generateBtn.disabled = true;

    const formData = new FormData();
    formData.append('image', uploadedFile);
    if (htmlInput.value.trim()) formData.append('html', htmlInput.value.trim());
    if (instructionsInput.value.trim()) formData.append('instructions', instructionsInput.value.trim());

    try {
      const res = await fetch(API + '/api/ai/generate-component', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Generering mislykkedes');
      }

      // Display results
      const html = result.data.generatedHtml;

      // Preview tab: render in isolated iframe
      const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <script src="https://cdn.tailwindcss.com"><\/script>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `);
      iframeDoc.close();

      // Code tab: display raw HTML
      codeOutput.textContent = html;

      // Auto-switch to preview tab
      showPreviewTab();

    } catch (err) {
      alert('Fejl: ' + err.message);
      if (err.message.includes('Unauthorized')) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/';
      }
    } finally {
      // Reset button state
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
      generateBtn.disabled = false;
    }
  });

  // Tab switching
  tabPreview.addEventListener('click', showPreviewTab);
  tabCode.addEventListener('click', showCodeTab);

  function showPreviewTab() {
    tabPreview.classList.add('border-blue-600', 'text-blue-600');
    tabPreview.classList.remove('border-transparent', 'text-slate-600');
    tabCode.classList.remove('border-blue-600', 'text-blue-600');
    tabCode.classList.add('border-transparent', 'text-slate-600');
    previewContainer.classList.remove('hidden');
    codeContainer.classList.add('hidden');
  }

  function showCodeTab() {
    tabCode.classList.add('border-blue-600', 'text-blue-600');
    tabCode.classList.remove('border-transparent', 'text-slate-600');
    tabPreview.classList.remove('border-blue-600', 'text-blue-600');
    tabPreview.classList.add('border-transparent', 'text-slate-600');
    codeContainer.classList.remove('hidden');
    previewContainer.classList.add('hidden');
  }

  // Copy to clipboard
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeOutput.textContent).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Kopieret!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    });
  });
})();
</script>
```

---

## 7. Security Considerations

### 7.1. Rate Limiting

**File**: `api/src/middleware/rateLimit.js`

```javascript
const aiGeneratorRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per user
  keyGenerator: (req) => req.user.id, // Rate limit by user ID (from JWT)
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'For mange anmodninger. Prøv igen om en time.'
    });
  }
});
```

### 7.2. Input Validation & Sanitization

1. **File Upload Validation**:
   - Max size: 5MB
   - Allowed types: JPG, PNG, WEBP only
   - Multer configured to reject other types

2. **HTML Sanitization**:
   - Use DOMPurify on server to strip `<script>`, `onclick`, etc.
   - Allow only safe HTML tags and Tailwind classes

3. **OpenAI Response Validation**:
   - Check for valid HTML structure
   - Strip markdown code fences
   - Reject responses >10,000 characters (prevent abuse)

### 7.3. Security Logging

**Log all generations** to `security_logs` table:

```sql
INSERT INTO security_logs (user_id, action, ip_address, user_agent, details)
VALUES (
  ?,
  'ai.generate_component.success',
  ?,
  ?,
  JSON_OBJECT(
    'hasHtml', ?,
    'hasInstructions', ?,
    'imageSize', ?,
    'generatedLength', ?
  )
);
```

### 7.4. API Key Protection

- Store `OPENAI_API_KEY` in `.env` (gitignored)
- Never expose API key to frontend
- Rotate API key monthly
- Monitor OpenAI usage dashboard for anomalies

---

## 8. Monetization & Usage Tracking

### 8.1. Database Schema for Usage Tracking

**New Table**: `ai_generations`

```sql
CREATE TABLE ai_generations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  generated_html TEXT NOT NULL,
  image_url VARCHAR(255),              -- S3/CDN URL if we save uploaded images
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_usd DECIMAL(10, 4),             -- Track OpenAI cost per request
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 8.2. Quota Enforcement

**Free Tier**: 5 generations/month
**Premium**: Unlimited generations

```javascript
// Check user quota before calling OpenAI
const usageThisMonth = await db.query(
  `SELECT COUNT(*) as count FROM ai_generations
   WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
  [req.user.id]
);

const isPremium = req.user.role === 'premium'; // Or check separate subscription table
const monthlyLimit = isPremium ? Infinity : 5;

if (usageThisMonth[0].count >= monthlyLimit) {
  return res.status(403).json({
    success: false,
    error: 'Månedlig kvote nået. Opgrader til Premium for ubegrænsede genereringer.'
  });
}
```

### 8.3. Cost Tracking

**OpenAI Pricing** (as of 2025):
- gpt-4o: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- Average image = ~1,500 tokens (input)
- Average HTML output = ~500 tokens (output)
- **Cost per generation**: ~$0.03 USD

**Store cost** after each generation:

```javascript
const costUsd = (
  (usage.promptTokens / 1000) * 0.01 +
  (usage.completionTokens / 1000) * 0.03
);

await db.query(
  `INSERT INTO ai_generations
   (user_id, generated_html, prompt_tokens, completion_tokens, total_tokens, cost_usd)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [req.user.id, generatedHtml, usage.promptTokens, usage.completionTokens, usage.totalTokens, costUsd]
);
```

---

## 9. Implementation Checklist

### Phase 1: Backend (Week 1)

- [ ] Install dependencies: `npm install openai multer dompurify jsdom`
- [ ] Create `api/src/ai-context/` directory
- [ ] Write context library files:
  - [ ] `colors-typography.md`
  - [ ] `buttons.html`
  - [ ] `cards.html`
  - [ ] `forms.html`
  - [ ] `sections.html`
- [ ] Create `api/src/routes/ai-generator.cjs`
- [ ] Implement context library loader
- [ ] Implement OpenAI API integration
- [ ] Implement HTML sanitization
- [ ] Add rate limiter to `rateLimit.js`
- [ ] Create `ai_generations` table in database
- [ ] Test locally with `curl` and sample images

### Phase 2: Frontend (Week 1)

- [ ] Create `src/pages/admin/byggeklodser.astro`
- [ ] Implement drag-and-drop file upload
- [ ] Implement form inputs (HTML, instructions)
- [ ] Implement generate button with loading state
- [ ] Implement tab switching (Preview | Code)
- [ ] Implement iframe preview rendering
- [ ] Implement code display with syntax highlighting
- [ ] Implement copy-to-clipboard
- [ ] Test UI flow end-to-end

### Phase 3: Production Deployment (Week 2)

- [ ] Add `OPENAI_API_KEY` to server `.env` via SSH
- [ ] Update `api/server.cjs` to mount new route
- [ ] Deploy to cPanel via GitHub Actions
- [ ] Manually restart API: `pkill -f 'lsnode:.*lavprishjemmeside'`
- [ ] Test on production with real images
- [ ] Monitor `security_logs` for errors
- [ ] Monitor OpenAI usage dashboard

### Phase 4: Monetization (Week 2-3)

- [ ] Add "Premium" role to `users` table
- [ ] Implement quota enforcement (5/month for free users)
- [ ] Add upgrade prompt in UI when quota reached
- [ ] Create `/admin/opgrader` page with pricing tiers
- [ ] Integrate payment (Stripe Checkout or similar)
- [ ] Send email notifications on upgrade

---

## 10. Testing Strategy

### 10.1. Unit Tests (Backend)

```javascript
// Test context library loader
describe('loadContextLibrary', () => {
  it('should load all .md and .html files', () => {
    const context = loadContextLibrary();
    expect(context).toContain('Brand Colors');
    expect(context).toContain('Standard Primary Button');
  });
});

// Test HTML sanitization
describe('sanitizeHtml', () => {
  it('should remove <script> tags', () => {
    const dirty = '<div><script>alert("XSS")</script><p>Safe</p></div>';
    const clean = DOMPurify.sanitize(dirty, {...});
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('<p>Safe</p>');
  });
});
```

### 10.2. Integration Tests (API)

```bash
# Test successful generation
curl -X POST http://localhost:3000/api/ai/generate-component \
  -H "Authorization: Bearer $JWT" \
  -F "image=@test-mockup.png" \
  -F "instructions=Use a red button"

# Expected: 200 OK with generatedHtml

# Test rate limiting
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/ai/generate-component \
    -H "Authorization: Bearer $JWT" \
    -F "image=@test-mockup.png"
done

# Expected: 11th request returns 429 Rate Limit Exceeded

# Test file size limit
curl -X POST http://localhost:3000/api/ai/generate-component \
  -H "Authorization: Bearer $JWT" \
  -F "image=@large-10mb-image.jpg"

# Expected: 413 Payload Too Large
```

### 10.3. Manual Testing Checklist

- [ ] Upload valid image → generates HTML successfully
- [ ] Upload image + HTML structure → styles applied to structure
- [ ] Upload image + instructions → instructions followed
- [ ] Test with different image types (JPG, PNG, WEBP)
- [ ] Test with oversized image (>5MB) → error message
- [ ] Test with invalid file type (PDF) → error message
- [ ] Test without authentication → 401 error
- [ ] Test rate limiting → 429 after 10 requests
- [ ] Preview tab shows rendered HTML correctly
- [ ] Code tab shows raw HTML
- [ ] Copy-to-clipboard works
- [ ] Tab switching works smoothly
- [ ] Verify HTML sanitization (no <script> tags in output)

---

## 11. Future Enhancements (Post-MVP)

### 11.1. Save as Component Template

**Button in UI**: "Gem som komponent"

When clicked:
1. Prompt user for component name and type (Hero, Feature, etc.)
2. Store in `components` table (from Phase 6 schema)
3. Make available in Page Builder

### 11.2. Multi-Image Upload

- Upload 3-5 images of different sections
- AI generates full page HTML (hero + features + pricing + footer)
- Stitch sections together intelligently

### 11.3. Style Transfer

- Upload image of Component A (existing)
- Upload image of Component B (new design)
- AI applies styling from A to structure of B
- Useful for maintaining consistency across components

### 11.4. A/B Testing Variants

- Single image input
- AI generates 3 variations with different:
  - Color schemes
  - Typography scales
  - Layout structures
- User picks favorite, discards others

### 11.5. Export to Figma/Sketch

- Reverse direction: HTML → Design tool
- Generate Figma file from generated component
- Use Figma API to create frames/layers

---

## 12. Appendix

### 12.1. Example OpenAI Response

**User uploads hero section mockup with large heading + CTA button**

**AI Output**:

```html
<section class="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50">
  <div class="max-w-7xl mx-auto text-center">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
      Få en professionel hjemmeside til en lav pris
    </h1>
    <p class="text-lg md:text-xl leading-relaxed text-slate-600 max-w-3xl mx-auto mb-8">
      Vi bygger moderne websites der konverterer besøgende til kunder. Intet bøvl, bare resultater.
    </p>
    <button class="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg">
      Få et gratis tilbud
    </button>
  </div>
</section>
```

### 12.2. Environment Variables Reference

**File**: `api/.env`

```bash
# Existing variables
DB_HOST=127.0.0.1
DB_USER=theartis_lavapi
DB_PASSWORD=your_password
DB_NAME=theartis_lavpris
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=re_xxxxx
EMAIL_FROM_NAME=Lavprishjemmeside.dk
EMAIL_FROM_ADDRESS=info@lavprishjemmeside.dk

# NEW: Phase 7 variables
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
AI_GENERATOR_RATE_LIMIT=10               # Requests per hour
AI_GENERATOR_FREE_TIER_MONTHLY=5         # Free tier quota
```

### 12.3. Dependencies to Install

```bash
cd api
npm install openai multer dompurify jsdom
```

**New dependencies**:
- `openai` - Official OpenAI Node.js library (v4.x)
- `multer` - Multipart/form-data parsing (file uploads)
- `dompurify` - HTML sanitization (XSS prevention)
- `jsdom` - DOM implementation for DOMPurify (server-side)

---

## 13. Success Criteria

This feature is considered **production-ready** when:

- [ ] API endpoint accepts image upload and generates HTML
- [ ] Generated HTML uses site's actual design system (not generic Tailwind)
- [ ] HTML is sanitized and safe (no XSS vulnerabilities)
- [ ] Frontend UI is intuitive and responsive
- [ ] Rate limiting prevents abuse
- [ ] Free tier quota enforcement works
- [ ] All generations logged to database
- [ ] OpenAI costs tracked per request
- [ ] Error handling covers all edge cases
- [ ] Performance: <5 seconds from upload to result
- [ ] Security audit passed (no API key exposure, no injection attacks)

---

**End of Specification**

This document should be referenced during implementation and updated as requirements evolve.

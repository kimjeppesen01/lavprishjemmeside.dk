# Stage 6: Admin Dashboard UI - Implementation Guide

## Overview
Build 4 admin dashboard pages for managing design tokens, components, pages, and AI content generation.

**Tech Stack:**
- Astro pages (SSR mode for admin routes)
- Vanilla JavaScript (no frameworks)
- Tailwind CSS v4 + CSS variables
- Fetch API for backend calls
- JWT authentication (token in localStorage)

---

## Page 1: Design Token Editor (`/admin/styling`)

**File:** `src/pages/admin/styling.astro`

**Features:**
- Edit design_settings table (colors, typography, shapes)
- Live preview of changes
- Save button → PUT /design-settings/1
- Apply theme presets → POST /theme-presets/apply/:id

**Layout:**
```
┌─────────────────────────────────────────┐
│ Header: "Design System Editor"         │
├─────────────────────────────────────────┤
│ ┌─────────────┐  ┌───────────────────┐ │
│ │ Settings    │  │ Live Preview      │ │
│ │ Form        │  │ (sample cards)    │ │
│ │             │  │                   │ │
│ │ Colors      │  │ [Primary Button]  │ │
│ │ Typography  │  │ [Secondary Button]│ │
│ │ Shapes      │  │ [Card Example]    │ │
│ │             │  │                   │ │
│ │ [Save]      │  │                   │ │
│ └─────────────┘  └───────────────────┘ │
└─────────────────────────────────────────┘
```

**Form Fields:**

1. **Colors Section** (color inputs with hex values)
   - Primary (color_primary)
   - Primary Hover (color_primary_hover)
   - Primary Light (color_primary_light)
   - Secondary (color_secondary)
   - Secondary Hover (color_secondary_hover)
   - Secondary Light (color_secondary_light)
   - Accent (color_accent)
   - Accent Hover (color_accent_hover)
   - Neutral 50-900 (8 neutral shades)

2. **Typography Section**
   - Font Heading (text input)
   - Font Body (text input)
   - Base Font Size (select: 0.875rem, 1rem, 1.125rem)

3. **Shapes Section**
   - Border Radius (select: none, small, medium, large, full)
   - Shadow Style (select: none, subtle, medium, dramatic)

**JavaScript Logic:**
```javascript
// On page load
const token = localStorage.getItem('token');
if (!token) window.location.href = '/admin/';

// Fetch current settings
const res = await fetch('https://api.lavprishjemmeside.dk/design-settings/1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const settings = await res.json();

// Populate form with current values
// Update live preview on input change
// Save button handler
async function saveSettings() {
  const formData = { /* collect all form values */ };
  const res = await fetch('https://api.lavprishjemmeside.dk/design-settings/1', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  if (res.ok) {
    alert('✓ Indstillinger gemt');
  } else {
    alert('✗ Fejl ved gemning');
  }
}
```

**Live Preview:**
- Use CSS variables (`var(--color-primary)`, etc.)
- Dynamically update `<style>` tag when inputs change
- Show: primary button, secondary button, card with shadow

---

## Page 2: Component Library Browser (`/admin/components`)

**File:** `src/pages/admin/components.astro`

**Features:**
- List all components from database (GET /components)
- Show component preview (if test data exists)
- Click to view full documentation
- Search/filter by name or category

**Layout:**
```
┌──────────────────────────────────────┐
│ Header: "Component Library"         │
├──────────────────────────────────────┤
│ [Search: _____________]              │
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌───────┐│
│ │ Hero     │ │ CTA      │ │ Stats ││
│ │ Section  │ │ Section  │ │ Banner││
│ │          │ │          │ │       ││
│ │ [View]   │ │ [View]   │ │ [View]││
│ └──────────┘ └──────────┘ └───────┘│
│                                      │
│ ┌──────────┐ ┌──────────┐ ┌───────┐│
│ │ Features │ │ ...      │ │ ...   ││
│ └──────────┘ └──────────┘ └───────┘│
└──────────────────────────────────────┘
```

**JavaScript Logic:**
```javascript
const token = localStorage.getItem('token');
const res = await fetch('https://api.lavprishjemmeside.dk/components', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const components = await res.json();

// Render component cards
components.forEach(comp => {
  // Create card with name, slug, category
  // "View" button → opens modal with documentation
});
```

**Component Card:**
- Title: `comp.name`
- Slug: `comp.slug`
- Category: `comp.category`
- Props count: `Object.keys(comp.default_props).length`
- [View Documentation] button → modal with `comp.documentation`

---

## Page 3: Page Builder (`/admin/pages`)

**File:** `src/pages/admin/pages.astro`

**Features:**
- List all unique page_path values (GET /page-components?groupBy=page_path)
- For each page: show components, reorder, delete, publish/unpublish
- Add new component to page

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Header: "Page Manager"                      │
├──────────────────────────────────────────────┤
│ Pages:                                       │
│ ┌──────────────────────────────────────────┐│
│ │ / (Homepage)               [Edit]        ││
│ │ /priser                    [Edit]        ││
│ │ /test                      [Edit]        ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Selected: /priser                            │
│ ┌──────────────────────────────────────────┐│
│ │ 1. Hero Section           ↑↓ [Delete]   ││
│ │ 2. Pricing Table          ↑↓ [Delete]   ││
│ │ 3. CTA Section            ↑↓ [Delete]   ││
│ │                                          ││
│ │ [+ Add Component] [Publish Page]        ││
│ └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

**JavaScript Logic:**
```javascript
// Fetch pages
const res = await fetch('https://api.lavprishjemmeside.dk/page-components', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const allComponents = await res.json();

// Group by page_path
const pages = {};
allComponents.forEach(pc => {
  if (!pages[pc.page_path]) pages[pc.page_path] = [];
  pages[pc.page_path].push(pc);
});

// Reorder: Update sort_order via PUT /page-components/:id
// Delete: DELETE /page-components/:id
// Publish: PUT /page-components/:id with is_published=1
```

---

## Page 4: AI Content Developer UI (`/admin/ai-assemble`)

**File:** `src/pages/admin/ai-assemble.astro`

**Features:**
- Form: page_path + prompt
- Generate button → POST /ai-generate/page
- Show loading state (Anthropic can take 20s)
- Display results: component count, token usage, cost

**Layout:**
```
┌──────────────────────────────────────────┐
│ Header: "AI Content Developer"          │
├──────────────────────────────────────────┤
│ Page Path: [/____________]               │
│                                          │
│ Prompt (Danish):                         │
│ ┌──────────────────────────────────────┐│
│ │ Lav en priser-side med 3 pakker...  ││
│ │                                      ││
│ │                                      ││
│ └──────────────────────────────────────┘│
│                                          │
│ [Generate Page with AI] ⚡               │
│                                          │
│ Result:                                  │
│ ┌──────────────────────────────────────┐│
│ │ ✓ Generated 5 components             ││
│ │ Tokens: 3,204                        ││
│ │ Cost: $0.0096                        ││
│ │                                      ││
│ │ [View Page Builder →]                ││
│ └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**JavaScript Logic:**
```javascript
async function generatePage() {
  const page_path = document.getElementById('page_path').value;
  const prompt = document.getElementById('prompt').value;

  // Show loading (spinner)
  showLoading();

  const res = await fetch('https://api.lavprishjemmeside.dk/ai-generate/page', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page_path, prompt })
  });

  const result = await res.json();
  hideLoading();

  if (result.ok) {
    showResult({
      count: result.count,
      tokens: result.usage.tokens,
      cost: result.usage.cost_usd
    });
  } else {
    alert('Error: ' + result.error);
  }
}
```

---

## Common Patterns

### Authentication Check (All Pages)
```javascript
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/admin/';
}
```

### Error Handling
```javascript
if (!res.ok) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/admin/';
  } else {
    const error = await res.json();
    alert('Fejl: ' + error.error);
  }
}
```

### Success Messages
Use green background alert:
```html
<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
  ✓ Ændringer gemt
</div>
```

---

## Styling Guidelines

1. **Use Tailwind CSS v4** (no custom CSS files)
2. **Danish labels** (Gem = Save, Annuller = Cancel, etc.)
3. **Consistent spacing:** `p-6` for containers, `mb-4` for form groups
4. **Buttons:**
   - Primary: `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded`
   - Secondary: `bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded`
5. **Input fields:**
   ```html
   <input type="text" class="border border-gray-300 rounded px-3 py-2 w-full">
   ```
6. **Color inputs:**
   ```html
   <input type="color" class="w-16 h-10 border border-gray-300 rounded">
   ```

---

## API Endpoints Reference

### Design Settings
- **GET** `/design-settings/1` - Get current settings
- **PUT** `/design-settings/1` - Update settings
- **GET** `/design-settings/public` - Public view (no auth)

### Components
- **GET** `/components` - List all components
- **GET** `/components/:slug` - Get one component

### Page Components
- **GET** `/page-components` - List all (filter by ?page_path=/priser)
- **POST** `/page-components` - Create new
- **PUT** `/page-components/:id` - Update
- **DELETE** `/page-components/:id` - Delete

### AI Generate
- **POST** `/ai-generate/page` - Generate page with AI
  - Body: `{ "prompt": "...", "page_path": "/..." }`

### Authentication
- **POST** `/auth/login` - Get JWT token
- All requests need: `Authorization: Bearer <token>`

---

## File Structure

```
src/pages/admin/
├── index.astro          (Login page - already exists)
├── dashboard.astro      (Already exists)
├── styling.astro        (NEW - Design Token Editor)
├── components.astro     (NEW - Component Browser)
├── pages.astro          (NEW - Page Builder)
└── ai-assemble.astro    (NEW - AI Content Developer)
```

---

## Testing Checklist

After building each page:

### `/admin/styling`
- [ ] Load current design settings from API
- [ ] Edit color values → live preview updates
- [ ] Change border radius → preview updates
- [ ] Save → API returns 200, shows success message
- [ ] Reload page → changes persist

### `/admin/components`
- [ ] Fetch and display all 18 components
- [ ] Click component card → modal shows documentation
- [ ] Search filters components by name

### `/admin/pages`
- [ ] List all page_path values from database
- [ ] Select page → show components in order
- [ ] Reorder components → sort_order updates in DB
- [ ] Delete component → removed from page
- [ ] Publish toggle works

### `/admin/ai-assemble`
- [ ] Enter prompt + page_path
- [ ] Click generate → loading indicator shows
- [ ] Success → displays component count, tokens, cost
- [ ] Generated components appear in Page Builder

---

## Deliverables

1. **4 new Astro files** in `src/pages/admin/`
2. **Test each page** manually (use browser devtools)
3. **Commit message:** "Add Stage 6: Admin Dashboard UI (4 pages)"
4. **Report any bugs** or missing API endpoints

---

## Notes

- Use existing `/admin/dashboard.astro` as reference for auth + layout
- Keep it simple - no React/Vue, just vanilla JS
- Danish language for all UI text
- Mobile-responsive (Tailwind's responsive classes)
- Handle loading states (disable buttons during API calls)

Good luck! 🚀

# Component Editor — Developer Reference

**File:** `src/pages/admin/pages.astro`
**Route:** `/admin/pages/`
**Purpose:** Admin interface for building and editing the content of every page on the site.

---

## Overview

The component editor is the core of the page-building system. It lets an admin pick which Astro components appear on a page, set their order, and edit all their content fields — without touching code.

The editor works in three layers:

```
Database (schema_fields + content)
    ↓  API returns schema + current values
Admin editor (builds a form from the schema)
    ↓  User edits, clicks "Gem ændringer"
Database updated (new content JSON saved)
    ↓  Admin clicks "Publicer" → GitHub Actions webhook
Static site rebuilt (Astro SSG reads DB at build time → new HTML)
```

**Key architectural point:** The editor only runs in the browser on the `/admin/pages/` page. None of its JavaScript ships to the public site. Published pages are purely static HTML — zero runtime overhead.

---

## Database Relationship

Two tables drive the editor:

### `components` — the template library

| Column | Type | Purpose |
|---|---|---|
| `slug` | VARCHAR | Identifier matching the Astro component filename (e.g. `hero-section` → `HeroSection.astro`) |
| `schema_fields` | JSON | Describes every editable prop: its type, enum options, required flag, nested properties |
| `default_content` | JSON | Example values used when the component is first added to a page |
| `name_da` | VARCHAR | Human-readable label shown in the editor UI |
| `category` | ENUM | `opener` / `trust` / `conversion` / `content` / `structure` |

### `page_components` — content instances

| Column | Type | Purpose |
|---|---|---|
| `page_path` | VARCHAR | URL path the component lives on (e.g. `/`, `/hjemmeside`) |
| `component_id` | INT | FK → `components.id` |
| `content` | JSON | The live content for this instance (what the editor saves) |
| `sort_order` | INT | Controls render order on the page |
| `is_published` | TINYINT | Whether this component is included in the next build |

### API aliasing — important!

`GET /components` returns `schema_fields` **aliased as `default_props`**:

```javascript
// api/src/routes/components.js, line 18
schema_fields AS default_props
```

The editor reads the schema as `component.default_props`. If you ever rename or restructure this alias, the form builder will silently fall back to the raw JSON textarea.

---

## `schema_fields` JSON Format

This is the contract between the database and the editor UI. Every component must have a correct `schema_fields` entry for the editor to generate a form.

### Basic structure

```json
{
  "fieldName": {
    "type": "string | number | boolean | object | array",
    "required": true,
    "default": "optional default value",
    "enum": ["option1", "option2"],
    "format": "image",
    "properties": { "subKey": "string" },
    "items": {
      "type": "object",
      "properties": { "subKey": "string" }
    }
  }
}
```

### Field type → UI control mapping

| `type` | Extras | UI rendered |
|---|---|---|
| `string` | — | Single-line text input |
| `string` | field name contains `description/content/text/body/note` OR value > 80 chars | Multi-line textarea |
| `string` | `"format": "image"` OR current value is an image URL | Thumbnail preview + "Skift billede" button (opens media picker) |
| `string` | `enum: [...]` | A/B button group — one button per option, blue = active |
| `number` | — | Number input |
| `number` | `enum: [2,3,4]` | A/B button group (e.g. column count selector) |
| `boolean` | — | CSS toggle switch (on/off) |
| `object` | `properties: {...}` | Bordered card with a sub-input per property |
| `array` | `items.type: "object"` | Repeatable cards with "+ Tilføj" and × remove buttons |
| `array` | items is `stringarray` | Textarea, one value per line |

### Image detection (two methods)

The editor shows the image picker if **either** is true:
1. The schema descriptor has `"format": "image"` — **always shows the picker**, even when the field is empty
2. The current value matches: extension `.jpg/.png/.webp/etc`, contains `/uploads/`, `unsplash.com`, or `pexels.com`

**Always use `"format": "image"` on image URL fields in `schema_fields`** — do not rely solely on value detection.

---

## Component Versions (Styling Variants)

Some components support multiple **visual versions** — different layouts or styling presets selectable in the editor.

### How it works

1. Add a `version` field to `schema_fields` with `type: "string"` and an `enum` of allowed values.
2. The editor renders this as an **A/B button group** (same as other enum fields).
3. The Astro component reads the `version` prop and conditionally renders different markup or classes.

### Schema pattern

```json
"version": {
  "type": "string",
  "enum": ["default", "minimal", "split"],
  "default": "default"
}
```

### Components with versions (as of schema_component_versions.sql)

| Component      | Versions | Description |
|----------------|----------|-------------|
| **hero-section** | `default` \| `minimal` \| `split` | default: full hero with overlay; minimal: tighter, lighter overlay; split: text left, image right |
| **stats-banner** | `cards` \| `inline` | cards: Saren-style card grid; inline: compact horizontal row |
| **cta-section**  | `default` \| `minimal` | default: full CTA; minimal: headline + button only, compact |

### Migration

Run `node api/run-schema.cjs` to apply all schemas (including component versions). If you only need this specific migration: `mysql -u DB_USER -p'DB_PASS' -h 127.0.0.1 DB_NAME < api/src/schema_component_versions.sql`.

---

## Editor Flow (Step by Step)

### 1. Opening the modal

```
User clicks "Rediger" on a component card
    → window.editComponent(id)
    → Looks up page_component by id in allPageComponents[]
    → Looks up component definition by component_id in allComponents[]
    → Reads component.default_props (= schema_fields from DB)
    → Calls buildFormFromSchema(formPanel, schema, currentContent)
    → Sets JSON textarea to current content JSON
    → Shows modal (removes 'hidden' class)
```

### 2. Form generation — `buildFormFromSchema(container, schema, values)`

Iterates every key in `schema_fields`. For each key:

1. Reads `descriptor.type` and `descriptor.enum`
2. Dispatches to the appropriate builder function
3. Appends the resulting DOM element to `container`

If schema is null or empty → shows an amber "Ingen schema" notice and the raw JSON textarea is the only editing option.

Any keys present in the **content** but **not** in the schema are rendered in an "Andre felter" section at the bottom as generic text inputs, so no data is ever hidden or silently lost.

### 3. Field builders

All builders return a DOM element. They do **not** use innerHTML for user content (safe from XSS). Every interactive element receives `data-field` / `data-subfield` attributes that `collectFormValues()` uses on save.

| Function | What it builds |
|---|---|
| `buildStringField(key, descriptor, value)` | `<input>` or `<textarea>` based on key name / value length |
| `buildNumberField(key, descriptor, value)` | `<input type="number">` |
| `buildEnumField(key, descriptor, value)` | Button group — active button gets `border-blue-500 bg-blue-50` classes |
| `buildBooleanField(key, descriptor, value)` | CSS toggle: `<input type="checkbox" class="sr-only peer">` + styled track/thumb divs |
| `buildImageField(key, descriptor, value)` | `<img>` preview + URL input + "Skift billede" button wired to `openMediaPicker()` |
| `buildObjectField(key, descriptor, value)` | Bordered `<div>` with sub-inputs per `descriptor.properties` key |
| `buildArrayField(key, descriptor, value)` | Container with `buildArrayItemCard()` per item + "+ Tilføj" button |
| `buildArrayItemCard(arrayKey, index, itemProps, itemValues, arrayWrap)` | Single repeatable card with `data-array-item` attribute and × delete button |

### 4. Value collection — `collectFormValues()`

Called when the user clicks "Gem ændringer". Walks the DOM of `#edit-form-panel` and reads `data-field` / `data-subfield` / `data-type` / `data-subtype` attributes:

```
formPanel.querySelectorAll('[data-field]')
    → for each: read type, extract value
    → "enum"      → find button with class .border-blue-500, read data-value
    → "boolean"   → checkbox.checked
    → "number"    → Number(el.value)
    → "string"    → el.value
    → "json"      → tryParseJson(el.value)
    → "object"    → collectObjectValues(el)
    → "array"     → collectArrayValues(el)
```

`collectObjectValues(el)` handles dot-notation sub-fields (`data-subfield="cta.text"`) by splitting on `.` and building nested objects.

`collectArrayValues(el)` reads all `[data-array-item]` cards within the array container, collecting sub-fields per card.

`parseEnumValue(str)` type-coerces enum button values: `"true"` → `true`, `"3"` → `3`, else string. This preserves the original JSON type.

### 5. Saving

```
saveComponentEdit()
    → collectFormValues() → content {}
    → POST /page-components/update  { id, content }
    → On success: updates allPageComponents[] in memory
    → Closes modal, re-renders component list
    → Alert "✓ Komponent opdateret"
```

The save does **not** trigger a site rebuild. That requires a separate "Publicer side" action, which calls `POST /publish` to trigger GitHub Actions.

---

## Advanced JSON Section

A collapsible panel below the form gives direct JSON access.

- **Opening it** syncs current form values → JSON textarea first (so it always reflects the form state)
- **"Formatér JSON"** pretty-prints the textarea content
- **"Anvend JSON til formular"** parses the textarea and rebuilds the entire form from the new values

This is an escape hatch for edge cases (pasting AI-generated content, bulk editing) and for components with no schema. The form and JSON are kept in sync manually — they do not live-sync on every keystroke.

---

## Media Picker Integration

`openMediaPicker(callback)` opens the media picker modal (`z-[60]` so it layers above the edit modal at `z-50`). When the user selects an image:

```
callback(url)
    → Sets the image URL input value
    → Updates the <img> preview src
```

The media picker is also available for SEO OG image and for array/object sub-fields that are image URLs.

---

## Adding a New Component — Checklist

When you create a new Astro component and want it to appear in the editor:

1. **Create the Astro file** in `src/components/` (e.g. `MyNewComponent.astro`)
2. **Register it in `[...slug].astro`** — add to `componentMap` and `normalizeProps()`
3. **Add to `seed_components_v2.sql`** with correct:
   - `slug` matching the componentMap key
   - `schema_fields` JSON (every editable prop, with correct types and `"format":"image"` on image fields)
   - `default_content` JSON (realistic example values)
   - `category` ENUM: `opener | trust | conversion | content | structure`
4. **Run the schema**: `node api/run-schema.cjs` (or for seed only: `mysql -u DB_USER -p'DB_PASS' -h 127.0.0.1 DB_NAME < api/src/seed_components_v2.sql`)
5. **Test the editor** by adding the component to a page and opening the edit modal — verify every field generates the correct control
6. **(Optional) Add version variants** — if the component has multiple distinct layouts (e.g. cards vs inline), add a `version` enum to `schema_fields` and implement conditional rendering in the Astro component. See *Component Versions* above.

---

## Schema Versioning — Old vs New

The original `seed_components.sql` used **wrong column names** and was never applied successfully:

| Old (broken) | New (correct) |
|---|---|
| `props_schema` | `schema_fields` |
| `docs_content` | `doc_path` |
| Category as free text | Category as ENUM |
| No `default_content` | `default_content JSON NOT NULL` |

**Always use `seed_components_v2.sql` as the reference.** The old file exists only as history.

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| Image picker inside array sub-fields only shows for fields that already have an image URL (value detection, not schema) | Use the "Avanceret JSON" section to paste the URL first, then re-open the field |
| Boolean sub-fields inside arrays render as a plain checkbox (no styled toggle) | Acceptable for now — the value is still correct |
| Nested objects more than 2 levels deep (object → object) are not supported by the form builder | Flatten the schema or use the JSON textarea |
| Re-ordering array items is not supported (no drag-and-drop) | Delete and re-add in the desired order |

---

## File Map

| File | Role |
|---|---|
| `src/pages/admin/pages.astro` | The entire editor UI + all JS (modal HTML, form builder, value collector, media picker, save/publish) |
| `api/src/routes/components.js` | `GET /components` — returns component library with `schema_fields` aliased as `default_props` |
| `api/src/routes/page-components.js` | `GET /page-components`, `POST /page-components/update`, `POST /page-components/publish`, `POST /page-components/delete-page` |
| `api/src/seed_components_v2.sql` | Authoritative seed for all 20 components with correct `schema_fields` |
| `api/src/schema_component_versions.sql` | Migration: adds `version` enum to hero-section, stats-banner, cta-section |
| `src/pages/[...slug].astro` | Reads `page_components` at build time, renders components as static HTML |
| `api/src/schema_phase6.sql` | Defines the `components` and `page_components` table schemas |

# Schema and seed run order — single overview

**All required schema and seed runs are executed automatically.** No manual SQL steps.

## How to run

From the **repository root**, with `api/.env` present (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME):

```bash
node api/run-schema.cjs
```

- Used by **`npm run setup`** (scripts/setup.cjs) during 1-click install.
- Safe to **re-run**: duplicate table/column/index errors are ignored (additive only).
- Loads `api/.env` via dotenv; uses mysql2 to execute each file in order.

---

## Order of execution

**Source of truth:** [api/run-schema.cjs](api/run-schema.cjs) — `SCHEMA_ORDER` and seed files.

### 1. Schema files (in this order)

| # | File | Purpose |
|---|------|---------|
| 1 | `schema.sql` | Base tables (users, events, sessions, content_pages, security_logs) |
| 2 | `schema_password_reset.sql` | password_reset_tokens |
| 3 | `schema_phase6.sql` | components, page_components, design_settings, theme_presets |
| 4 | `schema_components_source.sql` | components.source (library/custom); index on source |
| 5 | `schema_header_footer.sql` | Header/footer content tables |
| 6 | `schema_media.sql` | media table |
| 7 | `schema_page_meta.sql` | Page meta / SEO |
| 8 | `schema_ai_prompt_settings.sql` | ai_prompt_settings |
| 9 | `schema_design_features.sql` | design_settings feature toggles (smooth_scroll, etc.) |
| 10 | `schema_theme_modes.sql` | Theme mode support |
| 11 | `schema_theme_settings.sql` | Theme settings |
| 12 | `schema_master.sql` | sites, kanban_items, master tables |
| 13 | `schema_ian_control_plane.sql` | IAN control plane |
| 14 | `schema_indexes.sql` | Production indexes |

### 2. Seed files (after schemas)

| File | Purpose |
|------|---------|
| `seed_components_v2.sql` | Component library (27 components); ON DUPLICATE KEY UPDATE only for `source = 'library'` |
| `seed_master.sql` | Master/sites seed if present |

---

## Optional: Refresh Kanban (remove test items)

To delete the two most recent Kanban items (e.g. Haiku/Sonnet test responses), from repo root with DB available:

```bash
node api/refresh-kanban.cjs
```

Uses `api/.env` (DB_*). Safe to run; only removes the latest two items.

---

## Other SQL files in `api/src/`

These are **not** in the default runner. Run only if needed for a specific migration or one-off:

| File | When to run |
|------|-------------|
| `schema_master_role.sql` | Add `master` to users.role ENUM (if not in schema_master) |
| `schema_master_audit.sql` | master_audit_log (if not in schema_master) |
| `schema_media_v2.sql` | Media table v2 changes |
| `schema_phase6`-related add-ons | e.g. schema_overlap_module, schema_component_versions, schema_add_product_carousel_sticky_column, schema_immersive_content_visual, schema_migrate_* — run manually if required by your version |
| `seed_master_user_info.sql` | Example: set a user to role master (after schema_master_role) |

When in doubt, run **`node api/run-schema.cjs`** first; it is idempotent for the files it includes.

---

## Reference

- **Setup:** [scripts/setup.cjs](../scripts/setup.cjs) calls `node api/run-schema.cjs` after writing `api/.env`.
- **Rollout:** [ROLLOUT_MANUAL.md](ROLLOUT_MANUAL.md) and [UPSTREAM_UPDATES.md](UPSTREAM_UPDATES.md) refer to running schema on server (same command).
- **Runner:** [api/run-schema.cjs](../api/run-schema.cjs).

# Changelog

All notable changes to Lavpris CMS are documented here.

Format: `## [version] - YYYY-MM-DD` with sections **Added**, **Fixed**, **Changed**, **Database migrations**.
Versions follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **PATCH** (1.0.x): Bug fixes, copy changes, minor UI tweaks. No schema changes. Safe to merge anytime.
- **MINOR** (1.x.0): New features, new components, new admin pages. May include additive schema migrations.
- **MAJOR** (x.0.0): Breaking changes to schema, API contracts, or env var names. Requires manual migration steps.

---

## [Unreleased]

> Features developed on `main` but not yet tagged. Will become the next release.

---

## [1.0.0] - 2026-02-19

Initial production release. Baseline for all client installations.

### Included features
- 27-component library (hero, FAQ, pricing, testimonials, gallery, etc.)
- AI Assemble — generate full pages from a prompt using Claude API
- Page builder — drag-and-drop component ordering per page
- Design System Editor — colors, typography, border radius, shadows, feature toggles
- Header/Footer editor
- Media library with Pexels integration
- Traffic dashboard (Google Search Console + GA4)
- Password reset via email (Resend)
- GitHub Actions CI/CD — auto-build and SSH deploy on push to `main`
- Multi-domain support via GitHub repository variables

### Database migrations (run by `api/run-schema.cjs` in this order)
| File | Description |
|------|-------------|
| `schema.sql` | Core tables: users, sessions, components, page_components, content_pages, design_settings, theme_presets, events, security_logs, ai_usage |
| `schema_password_reset.sql` | password_reset_tokens table |
| `schema_phase6.sql` | Design settings columns, theme presets, media, AI prompt settings |
| `schema_header_footer.sql` | header_footer_settings table |
| `schema_media.sql` | media table |
| `schema_page_meta.sql` | SEO/meta columns on content_pages |
| `schema_ai_prompt_settings.sql` | ai_prompt_settings table |
| `schema_design_features.sql` | Feature toggle columns on design_settings (smooth scroll, page loader, grain overlay, sticky header) |
| `schema_indexes.sql` | Performance indexes |

---

## [1.1.0] - TBD

> Template — fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Database migrations
- _none_ / `schema_v1_1_xxx.sql`: description of what it adds

### Upgrade instructions for client installs
1. Merge upstream into client repo (see `docs/UPSTREAM_UPDATES.md`)
2. Run `node api/run-schema.cjs` on server (safe to re-run; additive only)
3. Restart API: `touch api/tmp/restart.txt`
4. Trigger deploy: push to `main` or use admin Publish button

---

## [1.2.0] - TBD

> Template — fill in when features are ready to release.

### Added
- _[feature name]: brief description_

### Fixed
- _[bug]: brief description_

### Database migrations
- _none_ / `schema_v1_2_xxx.sql`: description

### Upgrade instructions for client installs
1. Merge upstream into client repo (see `docs/UPSTREAM_UPDATES.md`)
2. Run `node api/run-schema.cjs` on server
3. Restart API: `touch api/tmp/restart.txt`
4. Trigger deploy

---

## How to release a new version

1. Finish all features on `main`
2. Fill in the `[Unreleased]` section above, rename it to the new version + date
3. Add a new empty `[Unreleased]` section at the top
4. Bump `"version"` in `package.json`
5. Commit: `git commit -m "chore: release vX.Y.Z"`
6. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
7. Create GitHub Release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "See CHANGELOG.md"`
8. Roll out to each client repo (see `docs/UPSTREAM_UPDATES.md`)

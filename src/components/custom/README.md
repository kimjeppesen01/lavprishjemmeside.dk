# Custom (user-generated) components

This folder is for **user-generated** or **customized** components. Files here are **not** overwritten by CMS library updates, seed scripts, or deployment.

- **Claude Code / plans:** May create or edit only files under this folder when implementing component changes. Do not edit CMS library components in `src/components/*.astro` (outside `custom/`).
- **Slug convention:** A file `PricingTable.astro` is exposed as slug `custom/pricing-table`. Use this slug when registering the component in the CMS and when adding it to pages.
- **Build:** Custom components are loaded at build time via `import.meta.glob` and merged into the page component map. Ensure the component is registered in the `components` table (slug `custom/<kebab-name>`) so it can be added to pages in the admin.

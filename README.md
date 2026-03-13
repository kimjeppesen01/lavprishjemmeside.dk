# lavprishjemmeside.dk

Lavprishjemmeside is an Astro frontend plus Node.js API CMS for `lavprishjemmeside.dk`, `api.lavprishjemmeside.dk`, and governed client-site installs.

## Deployment Rule

- Source authority is the Git repo, not committed `dist/` output.
- `dist/` is generated build output and remains gitignored.
- `scripts/generate-theme.mjs` regenerates `public/.htaccess`, and Astro copies that file to `dist/.htaccess` during build.
- The legacy GitHub Actions deploy workflow was archived out of `.github/workflows` on 2026-03-13 because GitHub still executes any YAML file in that directory, even when renamed `*.disabled.yml`.
- Canonical release path is now SSH-first deployment via Agent Enterprise or an equivalent manual SSH rollout, not GitHub Actions committing `dist/` back to `main`.

Reference copy of the archived workflow lives at `.github/workflow-archive/deploy.disabled.yml.txt`.

## Commands

| Command | Action |
| :------ | :----- |
| `npm install` | Install frontend dependencies |
| `npm run dev` | Start Astro dev server |
| `npm run build` | Generate `public/.htaccess`, then build Astro into `dist/` |
| `npm run preview` | Preview built frontend locally |
| `node api/server.cjs` | Start the API directly when working inside the API runtime |

## Key Paths

```text
/
├── api/                        Node.js CMS/API runtime
├── public/.htaccess            Generated security headers source
├── scripts/generate-theme.mjs  Build-time token + .htaccess generator
├── src/                        Astro source
└── dist/                       Generated output; not source authority
```

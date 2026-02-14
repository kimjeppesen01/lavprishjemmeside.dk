# lavprishjemmeside.dk — Full Project Context

## Overview
A Danish business website offering affordable web development services. Built as a static Multi-Page Application (MPA) using Astro + Tailwind CSS, deployed to a Nordicway cPanel server via automated CI/CD.

**Live URL**: https://lavprishjemmeside.dk
**GitHub**: https://github.com/kimjeppesen01/lavprishjemmeside.dk (public)

---

## Tech Stack
- **Frontend**: Astro v5.17+ (static site generator)
- **CSS**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin, NOT the older PostCSS approach)
- **Integrations**: `@astrojs/sitemap` for auto-generated sitemaps
- **Language**: TypeScript (strict mode)
- **Hosting**: cPanel on Nordicway (LiteSpeed web server)
- **CI/CD**: GitHub Actions → SSH deploy to cPanel
- **Analytics**: Google Analytics GA4 (`G-GWCL1R11WP`)
- **SEO**: Google Search Console (verified via HTML meta tag)

---

## Hosting & Server Details
| Key | Value |
|-----|-------|
| cPanel server | `cp10.nordicway.dk` |
| SSH port | `33` |
| cPanel username | `theartis` |
| Server IP | `176.9.90.24` |
| Domain document root | `/home/theartis/lavprishjemmeside.dk/` |
| Git repo on server | `/home/theartis/repositories/lavprishjemmeside.dk/` |
| SSL | AutoSSL (Let's Encrypt), expires May 2026, HTTPS forced |
| Nameservers | `ns3.nordicway.dk`, `ns4.nordicway.dk` |

**Important**: The same cPanel account hosts a WordPress site on a different domain using `public_html`. Never write to `public_html`.

---

## CI/CD Pipeline (GitHub Actions)

**Workflow file**: `.github/workflows/deploy.yml`

**Flow**:
1. Push to `main` branch triggers the workflow
2. GitHub Actions checks out code, installs deps (`npm ci`), runs `npm run build`
3. The built `dist/` folder is committed back to `main` by the `github-actions` bot
4. SSH into cPanel server using `appleboy/ssh-action@v1`
5. On the server: `git fetch origin && git reset --hard origin/main && cp -Rf dist/* ~/lavprishjemmeside.dk/`

**GitHub Secrets** (configured on the repo):
- `FTP_SERVER` — `176.9.90.24`
- `FTP_USERNAME` — `theartis`
- `FTP_PASSWORD` — FTP password (may need updating)
- `SSH_PORT` — `33`
- `SSH_PRIVATE_KEY` — ed25519 private key for SSH deploy (public key authorized in cPanel SSH Access as `cpanel_deploy`)

**Known quirks**:
- cPanel Git Version Control UI's "Update from Remote" sometimes gets stuck. Use SSH terminal as fallback: `cd ~/repositories/lavprishjemmeside.dk && git fetch origin && git reset --hard origin/main`
- The `.cpanel.yml` file exists but cPanel Git deploy is unreliable; the SSH step in GitHub Actions is the actual deploy mechanism
- Always `git pull` locally before pushing, because GitHub Actions commits `dist/` back to `main`

---

## Project Structure

```
lavprishjemmeside.dk/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── .cpanel.yml                  # cPanel deploy config (backup, SSH is primary)
├── astro.config.mjs             # Astro config (site URL, Tailwind vite plugin, sitemap)
├── package.json
├── package-lock.json
├── tsconfig.json
├── dist/                        # Built output (committed by GitHub Actions)
│   ├── index.html
│   ├── favicon.ico
│   ├── favicon.svg
│   └── sitemap-index.xml
├── public/
│   ├── favicon.ico
│   └── favicon.svg
└── src/
    ├── styles/
    │   └── global.css           # Tailwind v4 entry: `@import "tailwindcss";`
    ├── layouts/
    │   └── Layout.astro         # Base layout (Danish lang, SEO meta, GA4, Search Console)
    ├── components/
    │   ├── Header.astro         # Nav bar with links: Forside, Priser, Om os, Kontakt
    │   └── Footer.astro         # 3-column footer with links and contact info
    └── pages/
        └── index.astro          # Homepage (hero, features, CTA)
```

---

## Key Files Content Summary

### `astro.config.mjs`
- `site`: `https://lavprishjemmeside.dk`
- Vite plugin: `@tailwindcss/vite` (Tailwind v4 approach — NOT PostCSS)
- Integration: `@astrojs/sitemap`

### `src/layouts/Layout.astro`
- Props: `title` (required), `description` (optional, has Danish default)
- `<html lang="da">`
- Includes: favicon links, viewport, description meta, generator meta
- Google Search Console verification: `<meta name="google-site-verification" content="d7dWCSM6V-nAjgcm2GJtBf13c_xq44QPs4AMMmHIaB8" />`
- GA4 tracking script: `G-GWCL1R11WP` (using `is:inline` to prevent Astro bundling)
- Body: `min-h-screen flex flex-col bg-white text-gray-900 antialiased`

### `src/components/Header.astro`
- Logo text: "lavprishjemmeside.dk" (blue, links to `/`)
- Nav links: Forside (`/`), Priser (`/priser`), Om os (`/om-os`), Kontakt (`/kontakt`)
- CTA button: "Få et tilbud" → `/kontakt`
- Responsive: nav hidden on mobile (`hidden md:flex`)

### `src/components/Footer.astro`
- 3-column grid: brand description, page links, contact info
- Email: `info@lavprishjemmeside.dk`
- Dynamic year in copyright

### `src/pages/index.astro`
- Uses Layout, Header, Footer components
- Hero section: gradient background, headline, two CTA buttons
- Features section: 3-column grid (Lave priser, SEO-optimeret, Lynhurtig)
- CTA section: blue background, "Klar til at komme i gang?"

### `.github/workflows/deploy.yml`
```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code (actions/checkout@v4)
      - Setup Node.js 20 with npm cache
      - npm ci
      - npm run build
      - Commit dist/ back to main (github-actions bot)
      - SSH into cPanel (appleboy/ssh-action@v1, port from secrets)
        → git fetch, git reset --hard origin/main, cp dist/* to domain root
```

### `.cpanel.yml`
```yaml
deployment:
  tasks:
    - export DEPLOYPATH=/home/theartis/lavprishjemmeside.dk/
    - /bin/cp -Rf dist/* $DEPLOYPATH
```

---

## Phase 2 — Planned (Not Yet Built)

### Step 5: Remaining Pages
- `/priser` — Pricing page
- `/om-os` — About us page
- `/kontakt` — Contact page (form)

### Step 8: Backend Dashboard Architecture
Planned architecture:
- **API**: PHP REST API on `api.lavprishjemmeside.dk` (cPanel native, zero config)
- **Database**: MySQL (cPanel MySQL)
- **Dashboard**: Future admin frontend on `admin.lavprishjemmeside.dk`

Planned database tables:
| Table | Purpose |
|-------|---------|
| `events` | Button clicks, page views, funnels |
| `users` | Sign-ups and credentials |
| `content_pages` | Track pages, last updated, SEO status |
| `security_logs` | Login attempts, API access, errors |
| `sessions` | Visitor sessions (supplement GA4) |

---

## Development Workflow

1. Edit files locally in `~/lavprishjemmeside.dk/`
2. Test with `npm run dev` (localhost:4321)
3. `git pull` (important — GitHub Actions may have pushed dist/ commits)
4. `git add <files> && git commit -m "message" && git push`
5. GitHub Actions auto-builds and deploys via SSH
6. Site is live within ~30 seconds

---

## Important Notes for AI Agents

- **Tailwind v4**: Uses `@tailwindcss/vite` plugin, NOT the old `@astrojs/tailwind` PostCSS integration. The CSS entry point is `@import "tailwindcss";` in `global.css`.
- **Always commit lockfile**: `package-lock.json` must be committed or builds fail on GitHub.
- **Always pull before push**: GitHub Actions commits `dist/` back to `main`, so local will be behind after every deploy.
- **Danish language**: All user-facing text is in Danish. `<html lang="da">`.
- **Don't touch public_html**: WordPress site lives there for a different domain.
- **SSH key**: ed25519 key named `cpanel_deploy`, authorized in cPanel SSH Access.
- **zsh quirk**: Use single quotes for values containing `!` in shell commands (e.g., `gh secret set ... -b 'password!'`).

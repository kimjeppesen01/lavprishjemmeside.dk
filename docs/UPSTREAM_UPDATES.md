# Upstream Updates: Pulling CMS Changes Into Your Site

If your site is a **fork** or **template copy** of the main lavprishjemmeside.dk CMS repo, you can pull upstream changes to get new features, components, and fixes while keeping your content and config.

**Principle:** Only **config** (and optionally a few project-specific files) are local. All code (`src/`, `api/`, `.github/`) is updated from upstream. Your **content lives in your database** and is not touched by pulls.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

---

## 0. Check your current version

```bash
git describe --tags
```

Example output: `v1.0.0` or `v1.0.0-3-gabcdef` (3 commits ahead of v1.0.0). Compare to the latest tag on upstream to know if you are behind.

---

## 1. Add upstream (one-time)

```bash
git remote add upstream https://github.com/kimjeppesen01/lavprishjemmeside.dk.git
# Verify:
git remote -v
```

---

## 2. What to keep local (do not overwrite)

| Item | Why |
|------|-----|
| `api/.env` | Your DB credentials, CORS_ORIGIN, PASSWORD_RESET_BASE_URL, GITHUB_REPO, ANTHROPIC_API_KEY, etc. Never commit; never overwrite with upstream. |
| `src/components/custom/` | Client-specific components. Do not overwrite with upstream; merge strategy should preserve this folder and its contents. |
| Project-specific config | Any file you changed for this domain. Prefer not to change core code so merges stay simple. |

**Recommendation:** Do not customize files under `src/`, `api/src/`, or `.github/` unless you are prepared to resolve merge conflicts. Use env vars and DB content for per-site differences.

---

## 3. Pull and merge upstream

### Option A — Merge a specific release tag (recommended)

```bash
git fetch upstream
git checkout main
git pull --rebase origin main     # sync any CI dist commits first
git merge upstream/v1.1.0         # replace with target version tag
```

### Option B — Track upstream main (latest)

```bash
git fetch upstream
git checkout main
git pull --rebase origin main
git merge upstream/main
```

**Conflict resolution:**
- If there are conflicts, fix them in the reported files, then:
  ```bash
  git add .
  git commit -m "Merge upstream v1.1.0, resolve conflicts"
  ```
- `dist/` conflicts always favour HEAD: `git checkout HEAD -- dist/`

---

## 4. Apply database migrations

After merging, always run the schema runner — it is **safe to re-run** on existing databases (all migrations use `IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`):

```bash
ssh thirdwave "export PATH=/opt/alt/alt-nodejs22/root/usr/bin:\$PATH \
  && cd ~/repositories/yourdomain.dk \
  && node api/run-schema.cjs \
  && touch api/tmp/restart.txt \
  && echo 'Schema OK, API restarting'"
```

Check [CHANGELOG.md](CHANGELOG.md) under the version you merged for the specific SQL files added and what they do.

**New env vars?** If the release added new env vars (listed in CHANGELOG), add them to `api/.env` on the server and restart.

---

## 5. Deploy

Push the merged branch — GitHub Actions builds and deploys automatically:

```bash
git push origin main        # for lavprishjemmeside.dk
# or
git push ljdesign main --force   # for client repos (force because CI commits dist back)
```

Wait for the workflow to go green in GitHub Actions.

---

## 6. Verify

```bash
PUBLIC_API_URL=https://api.yourdomain.dk PUBLIC_SITE_URL=https://yourdomain.dk npm run verify
```

---

## 7. Conflict avoidance

| Do | Don't |
|----|--------|
| Keep `api/.env` out of git and maintain it manually. | Commit `.env` or overwrite it from upstream. |
| Use repository Variables for PUBLIC_SITE_URL / PUBLIC_API_URL. | Hardcode domain URLs in code. |
| Add new pages/content via Admin; schema changes via migrations. | Edit core schema or seed files without a migration strategy. |
| Prefer upstream's `.github/workflows/deploy.yml` and override behaviour with Variables. | Heavily edit the workflow so it no longer merges. |
| Merge specific release tags (`v1.1.0`) not `upstream/main` in production. | Pull `upstream/main` directly to a live client without testing first. |

---

## 8. When upstream has breaking changes (MAJOR version bump)

A MAJOR version (e.g. v2.0.0) may require:
- Manual data migration steps (documented in CHANGELOG.md under that release)
- New required env vars in `api/.env`
- Changes to GitHub Secrets/Variables

Always read CHANGELOG.md for the target version **before** merging a major release.

Your **content** (pages, design settings, media, users) stays in your database; only code and optional schema updates come from upstream.

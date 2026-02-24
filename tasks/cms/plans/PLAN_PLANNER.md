I have everything I need. Here is the full implementation plan.

---

# Implementation Plan — Public Pricing Page with Smart Tier Selection & Dynamic Cost Calculator

**Task:** Build Public-Facing Pricing Page with Smart Tier Selection & Dynamic Cost Calculator
**Domain:** lavprishjemmeside.dk
**Date:** 2026-02-22

---

## 1. Technical Approach

Build a new **static Astro page** at `/priser` that renders three pricing tier cards (Starter, Advanced, Professional) with toggle-able add-ons and a sticky dynamic cost calculator.

**Architecture decisions:**

- **Astro page + vanilla JS island** — No framework. The pricing logic is a self-contained `<script>` block inside the Astro page. State lives in a plain JS object. DOM updates are direct. Zero bundle overhead.
- **No API calls at runtime** — All pricing data is defined as a JS constant in the page. Prices are hardcoded (or pulled from a JSON config file). This keeps the page fully static and deploy-safe.
- **CSS Variables for theming** — All colors use `var(--color-primary)` etc. so the page inherits the active design theme automatically.
- **"Continue" button fires a custom event** — `window.dispatchEvent(new CustomEvent('pricing:selection', { detail: selection }))`. The future signup modal (separate task) listens for this event. Zero coupling between this task and that one.
- **Mobile-first layout** — Cards stack vertically on mobile. Calculator becomes a fixed bottom bar on mobile, sticky sidebar on desktop.

**Integration with existing stack:**
- Uses `Layout.astro` (public layout — includes GA4, sitemap, canonical)
- Follows section background alternation (`section-bg-page` / `section-bg-alt`)
- No DB changes required — pricing data is static config
- No new API endpoints required

---

## 2. Files to Modify

| File | Change | Lines affected |
|------|--------|----------------|
| `src/pages/index.astro` | Add CTA link pointing to `/priser` in the hero section and any existing pricing CTA | ~5 lines |
| `public/sitemap.xml` (if manually maintained) | Add `/priser` entry | ~3 lines |
| `astro.config.mjs` | No change needed — `@astrojs/sitemap` auto-includes new pages | — |

---

## 3. New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/priser.astro` | Main pricing page — tier cards, add-on toggles, dynamic calculator, CTA |
| `src/data/pricing.ts` | Single source of truth for tier definitions, add-on prices, and feature lists |
| `src/components/PricingCalculator.astro` | Reusable calculator UI component (sticky sidebar / bottom bar) |
| `src/components/PricingTierCard.astro` | Single tier card component (name, price, features, select button) |
| `src/components/PricingAddOn.astro` | Individual add-on toggle row (label, description, monthly price, checkbox) |

---

## 4. Database Changes

**None.** Pricing data is static. If pricing needs to be editable from the admin in the future, a `pricing_config` table can be added — that is a separate task.

---

## 5. API Changes

**None.** No new endpoints required.

The "Continue" button dispatches a `CustomEvent` on `window`:

```js
window.dispatchEvent(new CustomEvent('pricing:selection', {
  detail: {
    tier: 'advanced',          // 'starter' | 'advanced' | 'professional'
    addons: ['hosting', 'backup'],
    monthly_total: 599,
    annual_total: 5990,
    annual_savings_pct: 17
  }
}));
```

The future signup modal task subscribes to this event. No API contract needed now.

---

## 6. UI Changes

### `/priser` page structure (top to bottom)

```
[Hero section]
  H1: "Vælg den pakke, der passer til dig"
  Subtext: value prop (1 sentence)
  Billing toggle: [Månedlig] [Årlig — spar 17%]

[Tier Cards — 3 columns desktop, stacked mobile]
  Each card:
    - Tier name (Starter / Advanced / Professional)
    - Most popular badge (Advanced only)
    - Monthly price (large) + "pr. måned"
    - Annual price shown below (dimmed) if annual toggle active
    - Feature list (5–7 items, checkmarks)
    - "Vælg denne pakke" button — highlights card on click

[Add-ons section]
  H2: "Tilpas din pakke"
  Toggle rows (checkbox + label + price):
    - Hosting (X kr/md)
    - Backup (X kr/md)
    - Billedgenerator AI (X kr/md)
    - E-mail support (X kr/md)
    - Prioriteret support (X kr/md)

[Calculator — sticky sidebar desktop / fixed bottom bar mobile]
  Selected tier name
  Selected add-ons list
  Monthly total: X kr/md
  Annual total: X kr/år  (save X%)
  [Fortsæt →] button (fires CustomEvent)
```

### Mobile behaviour
- Tier cards: single column, full width
- Add-ons: full width toggle rows
- Calculator: fixed bottom bar (`position: fixed; bottom: 0`) — shows tier name + monthly total + "Fortsæt" button. Tapping expands to full breakdown drawer.

### States
- **Default:** Starter selected, no add-ons, monthly billing
- **Card selected:** border becomes `var(--color-primary)`, button becomes filled
- **Add-on toggled:** row gets checkmark, calculator updates instantly
- **Annual billing active:** prices recalculate, savings badge appears on each card

---

## 7. Testing Approach

**Manual checklist (no automated tests required for this task):**

```
[ ] Page loads at /priser with no console errors
[ ] All three tier cards render with correct feature lists
[ ] Clicking a card highlights it and deselects the others
[ ] Toggling an add-on updates the calculator total instantly
[ ] Monthly ↔ Annual billing toggle recalculates all prices
[ ] Annual savings percentage is correct (e.g. 10 months price for 12)
[ ] "Fortsæt" button fires window CustomEvent with correct payload
[ ] CustomEvent detail contains: tier, addons[], monthly_total, annual_total
[ ] Mobile: cards stack, calculator becomes fixed bottom bar
[ ] Mobile: calculator expands/collapses on tap
[ ] Page title and meta description are correct (Danish, SEO)
[ ] /priser appears in sitemap after rebuild
[ ] No hardcoded colors — all use CSS variables
[ ] Design theme change in admin reflects on pricing page after rebuild
```

**Test the CustomEvent in browser console:**
```js
window.addEventListener('pricing:selection', e => console.log(e.detail));
// Then click "Fortsæt" and confirm payload logs correctly
```

---

## 8. Deployment Steps

1. **Local:** `npm run dev` — verify page at `localhost:4321/priser`
2. **Build check:** `npm run build` — must succeed with zero errors
3. **Pull before push:** `git pull --rebase origin main` (GitHub Actions commits `dist/` back)
4. **Commit:** `git add src/pages/priser.astro src/data/pricing.ts src/components/Pricing*.astro`
5. **Push:** `git push origin main`
6. GitHub Actions builds and deploys — ~60 seconds
7. **Verify live:** `curl -I https://lavprishjemmeside.dk/priser` → expect `200`
8. **Verify sitemap:** `curl https://lavprishjemmeside.dk/sitemap-index.xml | grep priser`
9. **Smoke test on mobile:** open on phone, verify stacked layout and fixed calculator bar

**No server-side changes. No DB migrations. No API restarts needed.**

---

## 9. Timeline Estimate

| Phase | Task | Hours |
|-------|------|-------|
| 1 | `src/data/pricing.ts` — define all tiers, features, add-ons, prices | 1h |
| 2 | `PricingTierCard.astro` + `PricingAddOn.astro` components | 2h |
| 3 | `PricingCalculator.astro` — sticky sidebar + mobile bottom bar | 2h |
| 4 | `priser.astro` — assemble page, billing toggle, connect JS state | 3h |
| 5 | Calculator JS logic — state management, totals, CustomEvent | 2h |
| 6 | Mobile responsiveness pass | 1.5h |
| 7 | Manual testing checklist | 1h |
| 8 | Deploy and live verification | 0.5h |
| **Total** | | **~13 hours** |

---

## 10. Complexity Assessment

**Medium**

- 5 new files, 1 modified
- No DB changes
- No API changes
- Moderate JS state logic (calculator + toggle interactions)
- Mobile layout requires careful attention (sticky/fixed calculator)
- Clean separation from future signup modal via CustomEvent

---

## Cost Estimate

- Estimated input tokens for implementation run: ~18,000 (PROJECT_CONTEXT + 5 new files to read/generate)
- Estimated output tokens: ~6,000 (new Astro components + pricing data + JS logic)
- API cost (Sonnet @ $3/1M in, $15/1M out): ~$0.0540 + $0.0900 = ~$0.1440
- **Your cost (×20 real-world rate): ~$2.88**

---
# Future Implementations (Nice-to-Have)

> Items in this file are **not critical** for MVP or initial product launch. They may be implemented later based on client needs, feedback, or strategic direction.

---

## Performance & Monitoring

### Accessibility Audit (WCAG Compliance)
**Status**: Deferred - AI will handle component generation with accessibility built-in

**Rationale**:
- Phase 7 (AI Building Block Generator) will generate accessible HTML
- Semantic HTML and ARIA labels will be part of AI prompt constraints
- Can run manual audits if specific client requires WCAG certification

**When to implement**:
- If government or enterprise client requires WCAG 2.1 AA compliance
- After Phase 7 (AI generator) is live to ensure consistency

---

### Core Web Vitals Tracking
**Status**: Ad-hoc monitoring sufficient for now

**Current approach**:
- Google Search Console provides CWV metrics
- Lighthouse CI can be run manually when needed
- No real-time tracking required for MVP

**When to implement**:
- If clients start complaining about performance
- If competing on performance benchmarks becomes critical
- After 100+ client sites are live (to justify monitoring overhead)

**Implementation** (if needed later):
```javascript
// Add web-vitals library
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(metric => sendToAnalytics('CLS', metric.value));
getFID(metric => sendToAnalytics('FID', metric.value));
getLCP(metric => sendToAnalytics('LCP', metric.value));
```

---

### Error Monitoring (Sentry, LogRocket)
**Status**: Not necessary - standardized components reduce error surface area

**Rationale**:
- All sites use same component library → bugs fixed once, applied everywhere
- Static site generation → no runtime errors on production
- API errors logged to `security_logs` table (already implemented)
- Client-side JS is minimal (Tracker.astro + form validation)

**When to implement**:
- If client-specific bugs start appearing frequently
- If custom component development becomes common (beyond AI generator)
- If API error rate exceeds acceptable threshold

---

### Performance Budget (Lighthouse CI in GitHub Actions)
**Status**: No need - Astro's build-time optimization is sufficient

**Rationale**:
- Astro automatically optimizes bundles (tree-shaking, minification)
- Static sites don't have runtime performance issues
- Image optimization (Tier 1) addresses largest perf bottleneck
- Component library will be standardized → predictable bundle size

**When to implement**:
- If bundle size starts creeping up (>500KB)
- If client sites need guaranteed performance SLA
- If Google PageSpeed score becomes sales differentiator

---

## Security

### Advanced Security Headers
**Status**: Will add down the road

**Current state**:
- HTTPS enforced (Let's Encrypt SSL)
- Rate limiting on API endpoints
- JWT auth with secure password hashing

**Missing headers**:
- Content Security Policy (CSP)
- X-Frame-Options (clickjacking protection)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options

**When to implement**:
- Before launching white-label product to paying clients
- If security audit is required by client
- If competing with enterprise-grade solutions

**Implementation** (cPanel .htaccess):
```apache
Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
Header set X-Frame-Options "DENY"
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header set X-Content-Type-Options "nosniff"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

---

## Testing

### Automated Test Suite
**Status**: Deferred - manual testing sufficient for MVP

**Rationale**:
- Component library will be manually tested before release
- Client sites use same components → test once, deploy many
- AI-generated components can be previewed before saving
- Small team → manual testing faster than writing tests initially

**When to implement**:
- When team size > 2 developers
- When component library has >50 components
- When regression bugs start appearing
- Before open-sourcing or selling to enterprise clients

**Recommended stack** (if needed):
- **Unit tests**: Vitest (for utility functions, API routes)
- **Component tests**: Storybook (visual regression)
- **E2E tests**: Playwright (critical user flows: login, page builder, publish)

---

## Advanced Features

### Progressive Web App (PWA)
**Status**: Not planned - static MPA is sufficient

**Why not PWA**:
- Business websites don't need offline functionality
- No app-like experience required
- Static MPA already fast and cacheable
- Adds complexity without clear client value

**When to reconsider**:
- If building mobile-first SaaS product
- If clients request "add to home screen" functionality
- If offline editing becomes a requirement

---

### Internationalization (i18n)
**Status**: Not needed - DK market only

**Current language**: Danish only (`<html lang="da">`)

**When to implement**:
- If expanding to Sweden, Norway (similar languages)
- If enterprise clients operate internationally
- If Phase 6 (Component Library) includes multi-language CMS

**Recommended approach** (if needed):
- Astro i18n routing (`/da/`, `/en/`, `/sv/`)
- Database schema: add `language` column to `page_components`
- UI language selector in admin dashboard

---

## Performance Optimizations

### CDN / Edge Network
**Status**: cPanel is sufficient for DK-only clients

**Current setup**: Nordicway cPanel hosting (Denmark-based)

**Why no CDN**:
- All clients are Denmark-based
- cPanel server is in Denmark → low latency for target audience
- Static files served fast from LiteSpeed
- Cost savings (no CDN fees)

**When to reconsider**:
- If expanding to international markets (Sweden, Norway, Germany)
- If client sites see >10,000 visitors/month
- If Lighthouse "Server Response Time" exceeds 200ms
- If DDoS protection becomes necessary

**Quick win** (if needed later):
- Add Cloudflare (free tier) in front of cPanel
- Enable caching, minification, Brotli compression
- ~10 min setup, zero code changes

---

### Advanced Caching Strategies
**Status**: Astro's default caching is sufficient

**Current state**:
- Static HTML cached by browser
- API has 60s query cache (already implemented)
- No stale-while-revalidate needed (static sites)

**When to implement**:
- If API response times become bottleneck
- If database queries slow down (>100ms)
- If real-time data updates are required

---

## Developer Experience

### Component Documentation (Storybook)
**Status**: Not needed for MVP - internal use only

**When to implement**:
- If onboarding new developers
- If open-sourcing component library
- If clients want to preview components before purchasing

---

### Visual Regression Testing
**Status**: Deferred

**When to implement**:
- After 50+ components in library
- If clients report visual bugs
- If selling to enterprise (QA requirements)

---

## Analytics

### Advanced Analytics (Session Replay, Heatmaps)
**Status**: Not needed - GA4 + custom events sufficient

**Current analytics**:
- GA4 for traffic, conversions, user flow
- Custom event tracking (pageviews, clicks) to API
- Dashboard shows top events, sessions, landing pages

**When to implement**:
- If clients want to optimize conversion rates
- If UX research becomes bottleneck
- If competing with all-in-one platforms (Hotjar, FullStory)

---

## Summary

**Focus NOW** (Tier 1 - Critical):
1. ✅ Cloudflare CDN (optional - revisit if performance issues)
2. ✅ Image optimization (Astro `<Image />` component)
3. ✅ Schema.org + Open Graph tags (SEO fundamentals)
4. ✅ Font optimization (preload, font-display)

**Later** (Nice-to-Have - this file):
5. Accessibility audit (AI will handle)
6. Core Web Vitals tracking (ad-hoc)
7. Security headers (before client launch)
8. Error monitoring (if needed)
9. Performance budget (if needed)
10. Testing suite (when team grows)
11. PWA, i18n, advanced features (not planned)

**Pragmatic approach**: Build MVP fast, validate with clients, add features as needed.

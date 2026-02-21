import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.PUBLIC_API_URL || 'https://api.lavprishjemmeside.dk';
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://lavprishjemmeside.dk';
const THEME_FILE = path.join(__dirname, '../src/styles/theme.css');
const FEATURES_FILE = path.join(__dirname, '../src/data/design-features.json');
const HEADER_FOOTER_FILE = path.join(__dirname, '../src/data/header-footer.json');

const DEFAULT_HEADER_FOOTER = {
  header_layout: 'regular',
  header_logo_url: '/favicon.svg',
  header_logo_text: new URL(SITE_URL).hostname || 'lavprishjemmeside.dk',
  header_menu_1: [{ href: '/', label: 'Forside' }, { href: '/priser', label: 'Priser' }, { href: '/om-os', label: 'Om os' }, { href: '/kontakt', label: 'Kontakt' }],
  header_menu_2: [{ href: '/kontakt', label: 'Få et tilbud' }],
  header_mega_html: null,
  header_mega_menu: null,
  footer_columns: [
    { title: new URL(SITE_URL).hostname || 'lavprishjemmeside.dk', text: 'Professionelle hjemmesider til lav pris for danske virksomheder.' },
    { title: 'Sider', links: [{ href: '/', label: 'Forside' }, { href: '/priser', label: 'Priser' }, { href: '/om-os', label: 'Om os' }, { href: '/kontakt', label: 'Kontakt' }] },
    { title: 'Kontakt', links: [{ href: `mailto:info@${new URL(SITE_URL).hostname}`, label: `info@${new URL(SITE_URL).hostname}` }] },
  ],
  footer_copyright: null,
};

// Default tokens (fallback if API fails)
const DEFAULT_TOKENS = {
  color_primary: '#2563EB',
  color_primary_hover: '#1D4ED8',
  color_primary_light: '#DBEAFE',
  color_secondary: '#7C3AED',
  color_secondary_hover: '#6D28D9',
  color_secondary_light: '#EDE9FE',
  color_accent: '#F59E0B',
  color_accent_hover: '#D97706',
  color_neutral_50: '#F9FAFB',
  color_neutral_100: '#F3F4F6',
  color_neutral_200: '#E5E7EB',
  color_neutral_300: '#D1D5DB',
  color_neutral_600: '#4B5563',
  color_neutral_700: '#374151',
  color_neutral_800: '#1F2937',
  color_neutral_900: '#111827',
  font_heading: 'Inter',
  font_body: 'Inter',
  font_size_base: '1rem',
  border_radius: 'medium',
  shadow_style: 'subtle',
  feature_smooth_scroll: 1,
  feature_grain_overlay: 1,
  feature_page_loader: 1,
  feature_sticky_header: 1,
  page_loader_text: 'Indlæser...',
  page_loader_show_logo: 1,
  page_loader_duration: 2.5,
};

const DEFAULT_THEME_SETTINGS = {
  active_theme_key: 'simple',
  motion_profile: 'standard',
};

async function generateTheme() {
  try {
    console.log('Fetching design tokens from API...');
    const response = await fetch(`${API_URL}/design-settings/public`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const apiData = await response.json();
    console.log('✓ Design tokens fetched successfully');

    // Merge API data with defaults (API may omit some fields)
    const tokens = { ...DEFAULT_TOKENS, ...apiData };

    const css = buildCSS(tokens);
    fs.writeFileSync(THEME_FILE, css, 'utf-8');
    console.log(`✓ Generated ${THEME_FILE}`);

    // Fetch decoupled theme settings (separate from styling tokens)
    let themeSettings = { ...DEFAULT_THEME_SETTINGS };
    try {
      const themeRes = await fetch(`${API_URL}/theme-settings/public`);
      if (themeRes.ok) {
        const t = await themeRes.json();
        themeSettings.active_theme_key = ['simple', 'modern', 'kreativ'].includes(t.active_theme_key) ? t.active_theme_key : 'simple';
        themeSettings.motion_profile = ['standard', 'reduced', 'expressive'].includes(t.motion_profile) ? t.motion_profile : 'standard';
      }
    } catch (_) {
      // Theme endpoint may not exist on older installs; fallback is simple/standard.
    }

    // Write feature flags and page loader config for Layout/Header
    const features = {
      themeMode: themeSettings.active_theme_key,
      motionProfile: themeSettings.motion_profile,
      smoothScroll: (tokens.feature_smooth_scroll ?? 1) !== 0,
      grainOverlay: (tokens.feature_grain_overlay ?? 1) !== 0,
      pageLoader: (tokens.feature_page_loader ?? 1) !== 0,
      stickyHeader: (tokens.feature_sticky_header ?? 1) !== 0,
      pageLoaderText: String(tokens.page_loader_text ?? 'Indlæser...').slice(0, 100),
      pageLoaderShowLogo: (tokens.page_loader_show_logo ?? 1) !== 0,
      pageLoaderDuration: Math.min(3, Math.max(0.5, parseFloat(tokens.page_loader_duration) || 2.5)),
      borderRadius: String(tokens.border_radius ?? 'medium'),
    };
    const featuresDir = path.dirname(FEATURES_FILE);
    if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2), 'utf-8');
    console.log(`✓ Generated ${FEATURES_FILE}`);

    let hfRes;
    for (let attempt = 1; attempt <= 3; attempt++) {
      hfRes = await fetch(`${API_URL}/header-footer/public`);
      if (hfRes.ok) break;
      if (attempt < 3) {
        console.warn(`⚠ header-footer/public returned ${hfRes.status}, retrying (${attempt}/3)...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    const hfDir = path.dirname(HEADER_FOOTER_FILE);
    if (!fs.existsSync(hfDir)) fs.mkdirSync(hfDir, { recursive: true });
    if (hfRes.ok) {
      const hf = await hfRes.json();
      fs.writeFileSync(HEADER_FOOTER_FILE, JSON.stringify(hf, null, 2), 'utf-8');
      console.log(`✓ Generated ${HEADER_FOOTER_FILE} (layout: ${hf.header_layout ?? 'regular'})`);
    } else {
      console.warn(`⚠ header-footer/public returned ${hfRes.status}, using defaults`);
      fs.writeFileSync(HEADER_FOOTER_FILE, JSON.stringify(DEFAULT_HEADER_FOOTER, null, 2), 'utf-8');
      console.log(`✓ Generated ${HEADER_FOOTER_FILE} (with defaults)`);
    }
  } catch (error) {
    console.warn('⚠ API fetch failed, using defaults:', error.message);
    const css = buildCSS(DEFAULT_TOKENS);
    fs.writeFileSync(THEME_FILE, css, 'utf-8');
    console.log(`✓ Generated ${THEME_FILE} (with defaults)`);
    const features = {
      themeMode: 'simple',
      motionProfile: 'standard',
      smoothScroll: true,
      grainOverlay: true,
      pageLoader: true,
      stickyHeader: true,
      pageLoaderText: 'Indlæser...',
      pageLoaderShowLogo: true,
      pageLoaderDuration: 2.5,
      borderRadius: 'medium',
    };
    const featuresDir = path.dirname(FEATURES_FILE);
    if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });
    fs.writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2), 'utf-8');
    console.log(`✓ Generated ${FEATURES_FILE} (with defaults)`);
    const hfDir = path.dirname(HEADER_FOOTER_FILE);
    if (!fs.existsSync(hfDir)) fs.mkdirSync(hfDir, { recursive: true });
    fs.writeFileSync(HEADER_FOOTER_FILE, JSON.stringify(DEFAULT_HEADER_FOOTER, null, 2), 'utf-8');
    console.log(`✓ Generated ${HEADER_FOOTER_FILE} (with defaults)`);
  }

  // Write public/.htaccess with CSP connect-src using API_URL (multi-domain)
  const htaccessPath = path.join(__dirname, '../public/.htaccess');
  const htaccessContent = `# Security headers (Future_implementations.md)
# Requires mod_headers (enabled on cPanel/LiteSpeed by default)

<IfModule mod_headers.c>
  Header set X-Frame-Options "DENY"
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  # CSP: allow self, GA, Google Fonts, inline styles (Tailwind)
  Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${API_URL} https://www.google-analytics.com"
</IfModule>
`;
  fs.writeFileSync(htaccessPath, htaccessContent, 'utf-8');
  console.log(`✓ Generated ${htaccessPath}`);
}

function buildCSS(tokens) {
  function isValidHex(hex) {
    return /^#([a-f\d]{6})$/i.test(String(hex || '').trim());
  }

  function normalizeHex(hex, fallback) {
    const value = String(hex || '').trim();
    if (isValidHex(value)) return value.toUpperCase();
    return fallback;
  }

  function hexToRgb(hex) {
    const m = String(hex || '').trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return null;
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    };
  }

  function relChannel(v) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    return 0.2126 * relChannel(rgb.r) + 0.7152 * relChannel(rgb.g) + 0.0722 * relChannel(rgb.b);
  }

  function contrastRatio(fgHex, bgHex) {
    const l1 = luminance(fgHex);
    const l2 = luminance(bgHex);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function onColor(bgHex) {
    // Choose the higher contrast foreground for accessibility.
    const white = '#FFFFFF';
    const dark = '#111827';
    return contrastRatio(white, bgHex) >= contrastRatio(dark, bgHex) ? white : dark;
  }

  const safeTokens = {
    ...tokens,
    color_primary: normalizeHex(tokens.color_primary, DEFAULT_TOKENS.color_primary),
    color_primary_hover: normalizeHex(tokens.color_primary_hover, DEFAULT_TOKENS.color_primary_hover),
    color_primary_light: normalizeHex(tokens.color_primary_light, DEFAULT_TOKENS.color_primary_light),
    color_secondary: normalizeHex(tokens.color_secondary, DEFAULT_TOKENS.color_secondary),
    color_secondary_hover: normalizeHex(tokens.color_secondary_hover, DEFAULT_TOKENS.color_secondary_hover),
    color_secondary_light: normalizeHex(tokens.color_secondary_light, DEFAULT_TOKENS.color_secondary_light),
    color_accent: normalizeHex(tokens.color_accent, DEFAULT_TOKENS.color_accent),
    color_accent_hover: normalizeHex(tokens.color_accent_hover, DEFAULT_TOKENS.color_accent_hover),
    color_neutral_50: normalizeHex(tokens.color_neutral_50, DEFAULT_TOKENS.color_neutral_50),
    color_neutral_100: normalizeHex(tokens.color_neutral_100, DEFAULT_TOKENS.color_neutral_100),
    color_neutral_200: normalizeHex(tokens.color_neutral_200, DEFAULT_TOKENS.color_neutral_200),
    color_neutral_300: normalizeHex(tokens.color_neutral_300, DEFAULT_TOKENS.color_neutral_300),
    color_neutral_600: normalizeHex(tokens.color_neutral_600, DEFAULT_TOKENS.color_neutral_600),
    color_neutral_700: normalizeHex(tokens.color_neutral_700, DEFAULT_TOKENS.color_neutral_700),
    color_neutral_800: normalizeHex(tokens.color_neutral_800, DEFAULT_TOKENS.color_neutral_800),
    color_neutral_900: normalizeHex(tokens.color_neutral_900, DEFAULT_TOKENS.color_neutral_900),
  };

  // Map database border_radius enum to CSS values
  const radiusMap = {
    none: {
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      full: '0',
      button: '0',
      card: '0',
      input: '0',
    },
    small: {
      sm: '0.125rem',
      md: '0.25rem',
      lg: '0.375rem',
      xl: '0.5rem',
      full: '9999px',
      button: '0.25rem',
      card: '0.375rem',
      input: '0.25rem',
    },
    medium: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
      button: '0.5rem',
      card: '0.75rem',
      input: '0.5rem',
    },
    large: {
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
      full: '9999px',
      button: '0.75rem',
      card: '1rem',
      input: '0.75rem',
    },
    full: {
      sm: '1.5rem',
      md: '3rem',
      lg: '3rem',
      xl: '3rem',
      full: '9999px',
      button: '3rem',
      card: '3rem',
      input: '3rem',
    },
  };

  // Map shadow_style enum to CSS values
  const shadowMap = {
    none: {
      sm: 'none',
      md: 'none',
      lg: 'none',
      card: 'none',
    },
    subtle: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px -1px rgba(0,0,0,0.1)',
      lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
      card: '0 4px 6px -1px rgba(0,0,0,0.1)',
    },
    medium: {
      sm: '0 2px 4px rgba(0,0,0,0.1)',
      md: '0 8px 12px -2px rgba(0,0,0,0.15)',
      lg: '0 16px 24px -4px rgba(0,0,0,0.15)',
      card: '0 8px 12px -2px rgba(0,0,0,0.15)',
    },
    dramatic: {
      sm: '0 4px 8px rgba(0,0,0,0.15)',
      md: '0 12px 20px -4px rgba(0,0,0,0.25)',
      lg: '0 24px 40px -8px rgba(0,0,0,0.3)',
      card: '0 12px 20px -4px rgba(0,0,0,0.25)',
    },
  };

  const radius =
    radiusMap[safeTokens.border_radius] || radiusMap.medium;
  const shadow = shadowMap[safeTokens.shadow_style] || shadowMap.subtle;
  const textOnPrimary = onColor(safeTokens.color_primary);
  const textOnSecondary = onColor(safeTokens.color_secondary);
  const textOnAccent = onColor(safeTokens.color_accent);

  return `/* ===== DESIGN TOKENS ===== */
/* Generated at build time from database */
/* Source: ${API_URL}/design-settings/public */
/* Last updated: ${new Date().toISOString()} */

:root {
  /* --- Brand Colors --- */
  --color-primary: ${safeTokens.color_primary};
  --color-primary-hover: ${safeTokens.color_primary_hover};
  --color-primary-light: ${safeTokens.color_primary_light};
  --color-secondary: ${safeTokens.color_secondary};
  --color-secondary-hover: ${safeTokens.color_secondary_hover};
  --color-secondary-light: ${safeTokens.color_secondary_light};
  --color-accent: ${safeTokens.color_accent};
  --color-accent-hover: ${safeTokens.color_accent_hover};

  /* --- Neutral Scale --- */
  --color-neutral-50: ${safeTokens.color_neutral_50};
  --color-neutral-100: ${safeTokens.color_neutral_100};
  --color-neutral-200: ${safeTokens.color_neutral_200};
  --color-neutral-300: ${safeTokens.color_neutral_300};
  --color-neutral-600: ${safeTokens.color_neutral_600};
  --color-neutral-700: ${safeTokens.color_neutral_700};
  --color-neutral-800: ${safeTokens.color_neutral_800};
  --color-neutral-900: ${safeTokens.color_neutral_900};

  /* --- Semantic Colors --- */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-text-on-primary: ${textOnPrimary};
  --color-text-on-secondary: ${textOnSecondary};
  --color-text-on-accent: ${textOnAccent};
  --color-bg-page: #FFFFFF;
  --color-bg-section-alt: var(--color-neutral-50);
  --color-border: var(--color-neutral-200);

  /* --- Typography --- */
  --font-heading: '${safeTokens.font_heading}', sans-serif;
  --font-body: '${safeTokens.font_body}', sans-serif;
  --font-size-base: ${safeTokens.font_size_base};
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;
  --line-height-tight: 1.15;
  --line-height-normal: 1.6;

  /* --- Shapes (border radius: ${safeTokens.border_radius}) --- */
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-full: ${radius.full};
  --radius-button: ${radius.button};
  --radius-card: ${radius.card};
  --radius-input: ${radius.input};

  /* --- Shadows (style: ${safeTokens.shadow_style}) --- */
  --shadow-sm: ${shadow.sm};
  --shadow-md: ${shadow.md};
  --shadow-lg: ${shadow.lg};
  --shadow-card: ${shadow.card};

  /* --- Spacing (consistent section padding) --- */
  --section-padding-y: 4rem;
  --section-padding-y-lg: 6rem;
  --container-max-width: 80rem;
  --container-padding-x: ${safeTokens.border_radius === 'full' ? '2rem' : '1.5rem'};
  --card-padding: ${safeTokens.border_radius === 'full' ? '1.5rem' : '1.25rem'};
  --card-padding-lg: ${safeTokens.border_radius === 'full' ? '1.75rem' : '1.5rem'};
}
`;
}

generateTheme();

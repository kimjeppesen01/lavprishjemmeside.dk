import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.PUBLIC_API_URL || 'https://api.lavprishjemmeside.dk';
const THEME_FILE = path.join(__dirname, '../src/styles/theme.css');

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
  } catch (error) {
    console.warn('⚠ API fetch failed, using defaults:', error.message);
    const css = buildCSS(DEFAULT_TOKENS);
    fs.writeFileSync(THEME_FILE, css, 'utf-8');
    console.log(`✓ Generated ${THEME_FILE} (with defaults)`);
  }
}

function buildCSS(tokens) {
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
      sm: '9999px',
      md: '9999px',
      lg: '9999px',
      xl: '9999px',
      full: '9999px',
      button: '9999px',
      card: '9999px',
      input: '9999px',
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
    radiusMap[tokens.border_radius] || radiusMap.medium;
  const shadow = shadowMap[tokens.shadow_style] || shadowMap.subtle;

  return `/* ===== DESIGN TOKENS ===== */
/* Generated at build time from database */
/* Source: ${API_URL}/design-settings/public */
/* Last updated: ${new Date().toISOString()} */

:root {
  /* --- Brand Colors --- */
  --color-primary: ${tokens.color_primary};
  --color-primary-hover: ${tokens.color_primary_hover};
  --color-primary-light: ${tokens.color_primary_light};
  --color-secondary: ${tokens.color_secondary};
  --color-secondary-hover: ${tokens.color_secondary_hover};
  --color-secondary-light: ${tokens.color_secondary_light};
  --color-accent: ${tokens.color_accent};
  --color-accent-hover: ${tokens.color_accent_hover};

  /* --- Neutral Scale --- */
  --color-neutral-50: ${tokens.color_neutral_50};
  --color-neutral-100: ${tokens.color_neutral_100};
  --color-neutral-200: ${tokens.color_neutral_200};
  --color-neutral-300: ${tokens.color_neutral_300};
  --color-neutral-600: ${tokens.color_neutral_600};
  --color-neutral-700: ${tokens.color_neutral_700};
  --color-neutral-800: ${tokens.color_neutral_800};
  --color-neutral-900: ${tokens.color_neutral_900};

  /* --- Semantic Colors --- */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-text-on-primary: #FFFFFF;
  --color-bg-page: #FFFFFF;
  --color-bg-section-alt: var(--color-neutral-50);
  --color-border: var(--color-neutral-200);

  /* --- Typography --- */
  --font-heading: '${tokens.font_heading}', sans-serif;
  --font-body: '${tokens.font_body}', sans-serif;
  --font-size-base: ${tokens.font_size_base};
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;
  --line-height-tight: 1.15;
  --line-height-normal: 1.6;

  /* --- Shapes (border radius: ${tokens.border_radius}) --- */
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-full: ${radius.full};
  --radius-button: ${radius.button};
  --radius-card: ${radius.card};
  --radius-input: ${radius.input};

  /* --- Shadows (style: ${tokens.shadow_style}) --- */
  --shadow-sm: ${shadow.sm};
  --shadow-md: ${shadow.md};
  --shadow-lg: ${shadow.lg};
  --shadow-card: ${shadow.card};

  /* --- Spacing (consistent section padding) --- */
  --section-padding-y: 4rem;
  --section-padding-y-lg: 6rem;
  --container-max-width: 80rem;
  --container-padding-x: 1.5rem;
}
`;
}

generateTheme();

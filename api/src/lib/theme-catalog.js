// api/src/lib/theme-catalog.js
'use strict';

/**
 * Code-owned theme catalog.
 * Add new entries here when a new V2 theme package is ready.
 * Keys must be lowercase slugs that match site_theme_settings.active_theme_key.
 */
const THEME_CATALOG = [
  {
    theme_key: 'simple',
    label: 'Simple',
    description: 'Klassisk professionel stil. Kompatibilitetsbro for eksisterende installationer.',
    status: 'active',
    supports_commerce: true,
    supports_booking: false,
    supports_restaurant: false,
    supports_page_builder: true,
    supports_ai_assembler: true,
    default_header_mode: 'regular',
    default_footer_mode: 'regular',
    business_modes: ['service', 'portfolio', 'content'],
    supported_sections: [
      'hero-section', 'features-section', 'text-section', 'cta-section',
      'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
    ],
  },
  {
    theme_key: 'modern',
    label: 'Modern',
    description: 'Markant redesign med moderne design language.',
    status: 'active',
    supports_commerce: true,
    supports_booking: false,
    supports_restaurant: false,
    supports_page_builder: true,
    supports_ai_assembler: true,
    default_header_mode: 'regular',
    default_footer_mode: 'regular',
    business_modes: ['service', 'portfolio'],
    supported_sections: [
      'hero-section', 'features-section', 'text-section', 'cta-section',
      'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
    ],
  },
  {
    theme_key: 'kreativ',
    label: 'Kreativ',
    description: 'Ekspressivt layout med stærk visuel identitet.',
    status: 'active',
    supports_commerce: true,
    supports_booking: false,
    supports_restaurant: false,
    supports_page_builder: true,
    supports_ai_assembler: true,
    default_header_mode: 'regular',
    default_footer_mode: 'regular',
    business_modes: ['portfolio', 'creative'],
    supported_sections: [
      'hero-section', 'features-section', 'text-section', 'cta-section',
      'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
    ],
  },
];

/**
 * Returns the catalog entry for a given key, or null if not found.
 * @param {string} key
 * @returns {object|null}
 */
function getThemeEntry(key) {
  return THEME_CATALOG.find((t) => t.theme_key === key) ?? null;
}

/**
 * Returns true if the key exists in the catalog with status 'active'.
 * @param {string} key
 * @returns {boolean}
 */
function isValidThemeKey(key) {
  const entry = getThemeEntry(key);
  return entry !== null && entry.status === 'active';
}

module.exports = { THEME_CATALOG, getThemeEntry, isValidThemeKey };

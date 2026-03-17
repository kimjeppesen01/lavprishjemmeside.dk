// src/themes/simple/manifest.ts
export const manifest = {
  theme_key: 'simple' as const,
  label: 'Simple',
  description: 'Klassisk professionel stil. Kompatibilitetsbro for eksisterende installationer.',
  status: 'active' as const,
  supports_commerce: true,
  supports_booking: false,
  supports_restaurant: false,
  supports_page_builder: true,
  supports_ai_assembler: true,
  default_header_mode: 'regular' as const,
  default_footer_mode: 'regular' as const,
  business_modes: ['service', 'portfolio', 'content'] as const,
  /**
   * Sections this theme actively supports.
   * Used by AI assembler and page builder to filter component recommendations.
   */
  supported_sections: [
    'hero-section',
    'features-section',
    'text-section',
    'cta-section',
    'testimonials-section',
    'contact-section',
    'pricing-section',
    'faq-section',
  ] as const,
};

export type ThemeManifest = typeof manifest;

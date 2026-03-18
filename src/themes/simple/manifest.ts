// src/themes/simple/manifest.ts
import type { ThemeManifest } from '../manifest-contract';

export const manifest: ThemeManifest = {
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
  declared_sections: [],
  features: [],
};

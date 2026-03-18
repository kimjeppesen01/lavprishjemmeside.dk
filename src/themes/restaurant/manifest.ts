import type { ThemeManifest } from '../manifest-contract';

export const manifest: ThemeManifest = {
  theme_key: 'restaurant',
  label: 'Restaurant & Café',
  description: 'Varmt, appetitvækkende restauranttema med menugitter, takeaway-bestilling og åbningstider.',
  status: 'active',
  supports_commerce: false,
  supports_booking: false,
  supports_restaurant: true,
  supports_page_builder: true,
  supports_ai_assembler: true,
  default_header_mode: 'regular',
  default_footer_mode: 'regular',
  business_modes: ['restaurant', 'cafe', 'food'],
  supported_sections: [
    'hero-section', 'features-section', 'text-section', 'cta-section',
    'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
  ],
  declared_sections: ['hero-section', 'features-section', 'cta-section', 'contact-section'],
  features: ['restaurant'],
};

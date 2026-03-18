import type { ThemeManifest } from '../manifest-contract';

export const manifest: ThemeManifest = {
  theme_key: 'service',
  label: 'Service & Salon',
  description: 'Professionelt servicetema med 4-trins bookingguide, personaleprofiler og servicekataloget.',
  status: 'active',
  supports_commerce: false,
  supports_booking: true,
  supports_restaurant: false,
  supports_page_builder: true,
  supports_ai_assembler: true,
  default_header_mode: 'regular',
  default_footer_mode: 'regular',
  business_modes: ['salon', 'clinic', 'service'],
  supported_sections: [
    'hero-section', 'features-section', 'text-section', 'cta-section',
    'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
  ],
  declared_sections: ['hero-section', 'features-section', 'cta-section', 'testimonials-section', 'contact-section'],
  features: ['booking'],
};

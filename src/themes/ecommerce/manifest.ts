import type { ThemeManifest } from '../manifest-contract';

export const manifest: ThemeManifest = {
  theme_key: 'ecommerce',
  label: 'E-handel',
  description: 'Konverteringsfokuseret shoptema med stærk produktpræsentation, vedvarende kurv og strømlinet checkout.',
  status: 'active',
  supports_commerce: true,
  supports_booking: false,
  supports_restaurant: false,
  supports_page_builder: true,
  supports_ai_assembler: true,
  default_header_mode: 'sticky',
  default_footer_mode: 'regular',
  business_modes: ['shop', 'ecommerce'],
  supported_sections: [
    'hero-section', 'features-section', 'text-section', 'cta-section',
    'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
  ],
  declared_sections: ['hero-section', 'features-section', 'cta-section'],
  features: ['shop'],
};

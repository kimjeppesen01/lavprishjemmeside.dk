import type { ThemeManifest } from '../manifest-contract';

export const manifest: ThemeManifest = {
  theme_key: 'portfolio',
  label: 'Portfolio & Bureau',
  description: 'Modigt visuelt bureautema med fuld bredde, casestudier og stærk typografihierarki.',
  status: 'active',
  supports_commerce: false,
  supports_booking: false,
  supports_restaurant: false,
  supports_page_builder: true,
  supports_ai_assembler: true,
  default_header_mode: 'minimal',
  default_footer_mode: 'minimal',
  business_modes: ['agency', 'designer', 'creative'],
  supported_sections: [
    'hero-section', 'features-section', 'text-section', 'cta-section',
    'testimonials-section', 'contact-section', 'pricing-section', 'faq-section',
  ],
  declared_sections: ['hero-section', 'features-section', 'cta-section', 'testimonials-section'],
  features: ['portfolio'],
};

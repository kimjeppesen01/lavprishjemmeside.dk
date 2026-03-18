// src/lib/resolveSection.ts
// Static import map for theme section variants. All imports are statically declared
// so Astro's build can resolve them. AstroComponentFactory is not exported from 'astro',
// so we use `any` for the component map value type.

// Note: No default section components exist in src/components/ (components use PascalCase,
// not the kebab-case section convention). DEFAULT_SECTIONS is empty; all sections are
// resolved via theme-specific variants in SECTION_MAP.

// Ecommerce section variants
import EcommerceHeroSection from '../themes/ecommerce/sections/hero-section.astro';
import EcommerceFeaturesSection from '../themes/ecommerce/sections/features-section.astro';
import EcommerceCtaSection from '../themes/ecommerce/sections/cta-section.astro';

// Portfolio section variants
import PortfolioHeroSection from '../themes/portfolio/sections/hero-section.astro';
import PortfolioFeaturesSection from '../themes/portfolio/sections/features-section.astro';
import PortfolioCtaSection from '../themes/portfolio/sections/cta-section.astro';
import PortfolioTestimonialsSection from '../themes/portfolio/sections/testimonials-section.astro';

// Restaurant section variants
import RestaurantHeroSection from '../themes/restaurant/sections/hero-section.astro';
import RestaurantFeaturesSection from '../themes/restaurant/sections/features-section.astro';
import RestaurantCtaSection from '../themes/restaurant/sections/cta-section.astro';
import RestaurantContactSection from '../themes/restaurant/sections/contact-section.astro';

// Service section variants
import ServiceHeroSection from '../themes/service/sections/hero-section.astro';
import ServiceFeaturesSection from '../themes/service/sections/features-section.astro';
import ServiceCtaSection from '../themes/service/sections/cta-section.astro';
import ServiceTestimonialsSection from '../themes/service/sections/testimonials-section.astro';
import ServiceContactSection from '../themes/service/sections/contact-section.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_SECTIONS: Record<string, any> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_MAP: Record<string, Record<string, any>> = {
  ecommerce: {
    'hero-section': EcommerceHeroSection,
    'features-section': EcommerceFeaturesSection,
    'cta-section': EcommerceCtaSection,
  },
  portfolio: {
    'hero-section': PortfolioHeroSection,
    'features-section': PortfolioFeaturesSection,
    'cta-section': PortfolioCtaSection,
    'testimonials-section': PortfolioTestimonialsSection,
  },
  restaurant: {
    'hero-section': RestaurantHeroSection,
    'features-section': RestaurantFeaturesSection,
    'cta-section': RestaurantCtaSection,
    'contact-section': RestaurantContactSection,
  },
  service: {
    'hero-section': ServiceHeroSection,
    'features-section': ServiceFeaturesSection,
    'cta-section': ServiceCtaSection,
    'testimonials-section': ServiceTestimonialsSection,
    'contact-section': ServiceContactSection,
  },
};

/**
 * Returns the Astro component for a section slug under the given theme.
 * Falls back to the default component if the theme has no declared variant.
 * Returns undefined if neither the theme nor the default map has the section.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveSection(sectionSlug: string, themeKey: string): any {
  return SECTION_MAP[themeKey]?.[sectionSlug] ?? DEFAULT_SECTIONS[sectionSlug];
}

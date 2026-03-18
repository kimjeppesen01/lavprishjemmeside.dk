// src/themes/manifest-contract.ts
// Enforced contract for all theme packages. Every src/themes/<key>/manifest.ts must satisfy this interface.

/** The four feature modules a theme can declare. Used by resolveFeature() and the AI assembler. */
export type ThemeFeature = 'shop' | 'booking' | 'restaurant' | 'portfolio';

export interface ThemeManifest {
  theme_key: string;
  label: string;
  description: string;
  status: 'active' | 'draft';
  supports_commerce: boolean;
  supports_booking: boolean;
  supports_restaurant: boolean;
  supports_page_builder: boolean;
  supports_ai_assembler: boolean;
  default_header_mode: 'regular' | 'minimal' | 'sticky';
  default_footer_mode: 'regular' | 'minimal';
  business_modes: readonly string[];
  /** All sections this theme can render (own variants + fallbacks via resolveSection). */
  supported_sections: readonly string[];
  /** Sections where this theme provides its own .astro variant file. */
  declared_sections: readonly string[];
  /** Feature modules this theme implements. resolveFeature() uses this to route feature components. */
  features: readonly ThemeFeature[];
}

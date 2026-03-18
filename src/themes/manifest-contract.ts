// src/themes/manifest-contract.ts
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
  supported_sections: readonly string[];
  declared_sections: readonly string[];  // sections where this theme provides its own .astro
  features: readonly string[];           // 'shop' | 'booking' | 'restaurant' | 'portfolio'
}

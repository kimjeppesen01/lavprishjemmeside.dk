# Component Library Index

> **Last updated:** 2025-02-15  
> **Total components:** 18  
> **Framework:** Astro + Tailwind CSS v4

This is the master index of all available components in the lavprishjemmeside.dk component library. All components use CSS custom properties from `theme.css` and are designed for Danish content.

---

## Component Categories

### 🎯 Hero & CTAs (3 components)
- **hero-section** - Large header with headline, description, CTA buttons, and optional image
- **cta-section** - Call-to-action banner with centered or split layout
- **stats-banner** - Eye-catching statistics display (e.g., "500+ kunder", "99% tilfredshed")

### 📋 Content Sections (5 components)
- **features-grid** - Grid of features with icons, headlines, and descriptions
- **icon-cards** - Card-based layout with icons and short text
- **content-image-split** - Text content beside an image (left/right variants)
- **video-embed** - Responsive video player with title and description
- **timeline** - Vertical timeline for processes or company history

### 👥 Social Proof (3 components)
- **testimonials-carousel** - Customer testimonials with photos and ratings
- **team-grid** - Team member cards with photos, names, roles
- **logo-cloud** - Grid of client/partner logos

### 💰 Commerce & Forms (3 components)
- **pricing-table** - Pricing tiers with features and CTA buttons
- **comparison-table** - Side-by-side product/service comparison
- **contact-form** - Contact form with validation and submission

### 🔧 Utilities (4 components)
- **faq-accordion** - Collapsible FAQ items
- **newsletter-signup** - Email signup form with privacy notice
- **gallery-grid** - Image gallery with lightbox support
- **breadcrumbs** - Navigation breadcrumb trail

---

## Usage Guidelines

### CSS Variables
All components MUST use CSS custom properties from `theme.css`:
- Colors: `bg-[var(--color-primary)]`, `text-[var(--color-text-primary)]`
- Typography: `font-[var(--font-heading)]`
- Shapes: `rounded-[var(--radius-card)]`, `shadow-[var(--shadow-card)]`

**CRITICAL:** Never use hardcoded Tailwind classes like `bg-blue-600` or `text-gray-800`.

### Danish Language
- All user-facing text must be in Danish
- Use formal "De/Deres" for B2B, informal "du/dit" for B2C (default: informal)
- Placeholder text should be realistic and professional

### Responsive Design
- Mobile-first approach (base styles for mobile, use `md:` and `lg:` for larger screens)
- All grids must collapse to single column on mobile
- Touch-friendly tap targets (minimum 44×44px)

---

## Component File Format

Each component doc follows this structure:

1. **Component Info** - Name, category, description
2. **Props Schema** - All configurable props with types and defaults
3. **Usage Examples** - Common use cases
4. **CSS Variables Used** - Which design tokens it references
5. **Copy Guidelines** - Danish writing tips for this component
6. **Accessibility Notes** - ARIA labels, keyboard navigation

See individual component files for details.

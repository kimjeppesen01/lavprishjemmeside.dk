/**
 * Default props and version options for component preview.
 * Used by /admin/components/preview/[slug] to show each component in all its variations.
 */

export const COMPONENT_SLUGS = [
  'hero-section',
  'breadcrumbs',
  'features-grid',
  'icon-cards',
  'stats-banner',
  'testimonials-carousel',
  'cta-section',
  'pricing-table',
  'faq-accordion',
  'comparison-table',
  'team-grid',
  'video-embed',
  'contact-form',
  'newsletter-signup',
  'content-image-split',
  'timeline',
  'logo-cloud',
  'gallery-grid',
  'product-carousel',
  'sticky-column-section',
] as const;

export type ComponentSlug = (typeof COMPONENT_SLUGS)[number];

/** Version options per component — only for components with multiple variants */
export const VERSION_OPTIONS: Partial<Record<ComponentSlug, string[]>> = {
  'hero-section': ['default', 'minimal', 'split'],
  'stats-banner': ['cards', 'inline'],
  'cta-section': ['default', 'minimal'],
};

/** Default preview props per component (base content, version overridden per render) */
export const PREVIEW_PROPS: Record<ComponentSlug, Record<string, unknown>> = {
  'breadcrumbs': {
    items: [
      { label: 'Forside', href: '/' },
      { label: 'Ydelser', href: '/ydelser' },
      { label: 'Hjemmesider', href: '' },
    ],
    separator: '>',
  },
  'hero-section': {
    headline: 'Test Overskrift',
    description: 'Test beskrivelse — en professionel løsning til din virksomhed.',
    primaryCta: { text: 'Kom i gang', href: '/kontakt' },
    secondaryCta: { text: 'Læs mere', href: '/om-os' },
    alignment: 'left',
    backgroundImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
  },
  'features-grid': {
    headline: 'Hvorfor vælge os',
    description: 'Vi skiller os ud med kvalitet og service.',
    features: [
      { icon: '✓', title: 'Skræddersyet', description: 'Tilpasset dine behov.' },
      { icon: '⚡', title: 'Hurtig levering', description: 'Typisk 2-3 uger.' },
      { icon: '💬', title: 'Support', description: 'Vi er altid tilgængelige.' },
    ],
    columns: 3,
  },
  'icon-cards': {
    headline: 'Vores ydelser',
    cards: [
      { icon: '🌐', title: 'Hjemmesider', description: 'Moderne, responsive hjemmesider.', link: { text: 'Læs mere', href: '/ydelser' } },
      { icon: '📈', title: 'SEO', description: 'Bliv fundet på Google.', link: { text: 'Læs mere', href: '/seo' } },
    ],
    columns: 2,
  },
  'stats-banner': {
    headline: 'Ongoing Innovation: Stay Ahead',
    description: 'By choosing our product, you\'re investing in a solution that grows with you.',
    stats: [
      { value: '28+', label: 'Pre-Made Demos', highlight: true },
      { value: '50+', label: 'Custom Widgets' },
      { value: '250+', label: 'Inner Pages' },
      { value: '900+', label: 'Template Blocks' },
    ],
    infoItems: ['2 New Demos Monthly', 'Weekly Updates', '6 Months Support'],
    backgroundColor: 'alt',
  },
  'testimonials-carousel': {
    headline: 'Hvad vores kunder siger',
    testimonials: [
      { quote: 'Professionel service og hurtig levering. Meget tilfredse!', author: 'Anna Nielsen', role: 'Marketingchef', company: 'Nielsen & Co', rating: 5 },
      { quote: 'De forstod vores behov fra starten.', author: 'Lars Petersen', role: 'Grundlægger', company: 'Petersen A/S', rating: 5 },
    ],
  },
  'cta-section': {
    headline: 'Klar til at komme i gang?',
    description: 'Få et uforpligtende tilbud inden for 24 timer.',
    ctaButton: { text: 'Kontakt os i dag', href: '/kontakt' },
    backgroundColor: 'primary',
    layout: 'centered',
  },
  'pricing-table': {
    headline: 'Vælg den plan der passer dig',
    tiers: [
      { name: 'Basis', price: '499', period: 'kr/måned', features: ['5 sider', 'Responsiv design'], cta: { text: 'Vælg Basis', href: '/kontakt?plan=basis' }, featured: false },
      { name: 'Professionel', price: '999', period: 'kr/måned', features: ['10 sider', 'SEO', 'Prioriteret support'], cta: { text: 'Vælg Professionel', href: '/kontakt?plan=pro' }, featured: true },
    ],
  },
  'faq-accordion': {
    headline: 'Ofte stillede spørgsmål',
    faqs: [
      { question: 'Hvor lang tid tager det?', answer: 'Typisk 2-4 uger afhængigt af størrelse.' },
      { question: 'Hvad koster det?', answer: 'Vores priser starter ved 5.000 kr.' },
    ],
    defaultOpen: 0,
  },
  'comparison-table': {
    headline: 'Sammenlign planerne',
    products: ['Basis', 'Professionel'],
    features: ['Antal sider', 'SEO', 'Support'],
    data: [
      ['5 sider', '10 sider'],
      [false, true],
      ['E-mail', 'Prioriteret'],
    ],
  },
  'team-grid': {
    headline: 'Mød teamet',
    members: [
      { name: 'Lars Jensen', role: 'Grundlægger', photo: 'https://placehold.co/128x128/f3f4f6/6b7280?text=LJ', bio: '15 års erfaring.' },
    ],
  },
  'video-embed': {
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Se hvordan det virker',
    description: 'Kort video der viser løsningen.',
    provider: 'youtube',
  },
  'contact-form': {
    headline: 'Kontakt os',
    description: 'Udfyld formularen, så vender vi tilbage.',
    fields: [
      { type: 'text', name: 'name', label: 'Navn', required: true },
      { type: 'email', name: 'email', label: 'E-mail', required: true },
      { type: 'textarea', name: 'message', label: 'Besked', required: true },
    ],
    submitText: 'Send besked',
    successMessage: 'Tak! Vi vender tilbage hurtigst muligt.',
  },
  'newsletter-signup': {
    headline: 'Få nyheder og tips',
    description: 'Tilmeld dig vores nyhedsbrev.',
    placeholder: 'Din e-mail',
    buttonText: 'Tilmeld mig',
  },
  'content-image-split': {
    headline: 'Vi bygger hjemmesider der virker',
    content: '<p>Med over 10 års erfaring hjælper vi virksomheder med at komme online.</p>',
    imageUrl: 'https://placehold.co/600x400/f3f4f6/6b7280?text=Billede',
    imagePosition: 'right',
  },
  'timeline': {
    headline: 'Vores historie',
    events: [
      { year: '2010', title: 'Grundlagt', description: 'Vi startede med små projekter.' },
      { year: '2020', title: '100 kunder', description: 'Vi nåede 100 tilfredse kunder.' },
      { year: '2025', title: 'I dag', description: 'Vi servicerer hele Danmark.' },
    ],
  },
  'logo-cloud': {
    headline: 'Kunder der stoler på os',
    logos: [
      { imageUrl: 'https://placehold.co/120x48/f3f4f6/6b7280?text=Logo1', alt: 'Kunde 1', link: '' },
      { imageUrl: 'https://placehold.co/120x48/f3f4f6/6b7280?text=Logo2', alt: 'Kunde 2', link: '' },
    ],
    grayscale: true,
  },
  'gallery-grid': {
    images: [
      { url: 'https://placehold.co/400x300/f3f4f6/6b7280?text=1', alt: 'Billede 1', caption: 'Forside' },
      { url: 'https://placehold.co/400x300/f3f4f6/6b7280?text=2', alt: 'Billede 2', caption: 'Ydelser' },
    ],
    columns: 2,
    lightbox: true,
  },
  'product-carousel': {
    heading: 'Udvalgte produkter',
    slides: [
      { img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800', alt: 'Hjemmeside design' },
      { img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', alt: 'SEO & marketing' },
      { img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', alt: 'E-handel' },
    ],
  },
  'sticky-column-section': {
    tagline: 'Kompatibilitet',
    heading: 'Vi integrerer med dine værktøjer',
    description: 'Vores løsninger fungerer sammen med de mest populære platforme og plugins.',
    items: [
      { img: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64', title: 'Responsiv design', desc: 'Hjemmesider der fungerer perfekt på alle enheder.' },
      { img: 'https://images.unsplash.com/photo-1553877522-56169ac2460a?w=64', title: 'Hurtig hosting', desc: 'Optimerede hjemmesider med hurtig indlæsningstid.' },
    ],
  },
};

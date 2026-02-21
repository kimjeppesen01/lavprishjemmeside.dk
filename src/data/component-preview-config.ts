/**
 * Default props and version options for component preview.
 * Used by /admin/components/preview/[slug] to show each component in all its variations.
 */

export const COMPONENT_SLUGS = [
  'hero-section',
  'breadcrumbs',
  'problem-section',
  'how-it-works-section',
  'trust-badges-section',
  'case-studies-section',
  'integrations-section',
  'founders-note-section',
  'tabs-section',
  'modal-section',
  'bento-grid-section',
  'overlap-cards-section',
  'alternating-feature-list',
  'immersive-content-visual',
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
  'problem-section': {
    headline: 'Kender du disse udfordringer?',
    description: 'Mange virksomheder står over for de samme udfordringer. Vi kan hjælpe.',
    problems: [
      { icon: '⏱️', title: 'For lange leveringstider', description: 'Ubegrænset ventetid og utydelige frister.' },
      { icon: '💰', title: 'Uforudsigelige priser', description: 'Skjulte gebyrer du ikke regnede med.' },
      { icon: '📞', title: 'Svært at få svar', description: 'Support der ikke svarer eller forstår.' },
    ],
  },
  'how-it-works-section': {
    headline: 'Sådan fungerer det',
    description: 'Tre enkle trin til din nye hjemmeside.',
    steps: [
      { title: 'Book en snak', description: 'Kontakt os for en uforpligtende samtale om dine behov.' },
      { title: 'Design og godkendelse', description: 'Vi sender et forslag til din godkendelse inden vi bygger.' },
      { title: 'Levering og opdateringer', description: 'Din side går live, og vi hjælper med opdateringer og support.' },
    ],
  },
  'trust-badges-section': {
    badges: [
      { type: 'ssl', label: 'Sikker betaling', icon: '🔒' },
      { type: 'guarantee', label: '30 dages fuld refusion', icon: '✓' },
      { type: 'payment', label: 'Visa, Mastercard, MobilePay', icon: '💳' },
    ],
    layout: 'horizontal',
  },
  'case-studies-section': {
    headline: 'Vores referencer',
    description: 'Se hvordan vi har hjulpet andre virksomheder.',
    cases: [
      {
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        title: 'Ny hjemmeside for detailhandler',
        client: 'Jensen ApS',
        outcome: '40% stigning i online konvertering.',
        link: '/referencer/jensen',
      },
      {
        image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        title: 'E-handel løsning',
        client: 'Hansen Import',
        outcome: 'Udvidet markedsføring og stærkere brand.',
        link: '',
      },
    ],
    columns: 3,
  },
  'integrations-section': {
    headline: 'Integrerer med dine værktøjer',
    description: 'Vores løsning fungerer sammen med de mest populære platforme.',
    integrations: [
      { name: 'Mailchimp', logoUrl: 'https://placehold.co/96x32/f3f4f6/6b7280?text=Mailchimp', link: 'https://mailchimp.com' },
      { name: 'Stripe', logoUrl: 'https://placehold.co/96x32/f3f4f6/6b7280?text=Stripe', description: 'Betalingshåndtering' },
      { name: 'Zapier', logoUrl: 'https://placehold.co/96x32/f3f4f6/6b7280?text=Zapier' },
    ],
    columns: 4,
  },
  'founders-note-section': {
    quote: 'Jeg startede denne virksomhed for at gøre professionelle hjemmesider tilgængelige for alle.',
    author: 'Kim Jeppesen',
    role: 'Grundlægger & CEO',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=320',
    cta: { text: 'Kontakt mig', href: '/kontakt' },
  },
  'tabs-section': {
    headline: 'Vælg din plan',
    tabs: [
      { label: 'Basis', content: '<p>5 sider, SSL certifikat og e-mail support. Perfekt til små virksomheder.</p>' },
      { label: 'Pro', content: '<p>10 sider, SEO-optimering og prioriteret support. For virksomheder der vil vokse.</p>' },
      { label: 'Enterprise', content: '<p>Ubegrænsede sider, dedikeret support og avanceret integration.</p>' },
    ],
    defaultTab: 0,
  },
  'modal-section': {
    triggerText: 'Læs mere',
    headline: 'Vigtig information',
    content: '<p>Dette indhold vises i en modal overlay når du klikker på knappen.</p><p>Modalen bruger native HTML dialog for bedre tilgængelighed.</p>',
  },
  'bento-grid-section': {
    headline: 'Vores løsninger',
    items: [
      { title: 'Hjemmesider', description: 'Moderne, responsive hjemmesider til alle platforme.', size: 'large' },
      { title: 'SEO', description: 'Bliv fundet på Google.', size: 'small' },
      { title: 'Hosting', description: 'Hurtig og sikker hosting.', size: 'medium' },
      { title: 'Support', size: 'small' },
    ],
  },
  'overlap-cards-section': {
    headline: 'Vælg din løsning',
    cards: [
      { title: 'Produktvisning', content: '<p>Se hvordan det fungerer.</p>', imageUrl: 'https://placehold.co/400x240/f3f4f6/6b7280?text=1', cta: { text: 'Læs mere', href: '/produkt' } },
      { title: 'Funktioner', content: '<p>Punkt 1, punkt 2.</p>', imageUrl: 'https://placehold.co/400x240/f3f4f6/6b7280?text=2' },
      { title: 'Support', content: '<p>Vi hjælper dig hele vejen.</p>', cta: { text: 'Kontakt os', href: '/kontakt' } },
    ],
    overlapOffset: 40,
  },
  'alternating-feature-list': {
    features: [
      {
        headline: 'Produktionshistorik',
        introText: '',
        content: '<p>Systemet registrerer og sporer aktiviteter fra såning til høst. Alt indberettes digitalt og er tilgængeligt i realtid.</p>',
        imageUrl: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800',
        imageAlt: 'Desktop med produktionsoversigt',
        bulletPoints: ['Registrering af information', 'Online sporbarhed', 'Specifikke rapporter'],
        cta: { text: 'Se tekniske specifikationer', href: '/specs', icon: 'chevron-down' },
      },
      {
        headline: 'Kvalitetskontrol',
        introText: '',
        content: '<p>Importer kontrolformer og eliminer manuelle optegnelser. Tilgængelig på desktop, tablets og smartphones.</p>',
        imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
        imageAlt: 'Smartphones med kvalitetskontrol-app',
        bulletPoints: ['Importerede kontrolformer', 'Digital dokumentation', 'Tilgængelig overalt'],
        cta: { text: 'Tekniske specifikationer', href: '/specs', icon: 'chevron-down' },
      },
    ],
    firstTheme: 'teal',
    overlapAmount: 80,
  },
  'immersive-content-visual': {
    headline: 'Dokumentation med visuel tyngde',
    leadText: 'Når teksten er længere, skal layoutet skabe rytme og overblik i stedet for at blive tungt.',
    content: '<p>Denne komponent kombinerer overlap, dybde og klare fokuszoner for at gøre længere forklarende sektioner mere læsbare. Brug den til strategi, metode, implementering eller tekniske forklaringer.</p><p>Vælg mellem tre visuelle variationer afhængigt af fortællingens formål: editorial split, cinematic overlap eller stacked cards.</p>',
    imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?w=1400',
    secondaryImageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900',
    imagePlacement: 'right',
    variant: 'cinematic-overlap',
    overlapDepth: 64,
    highlights: [
      'Understøtter lange tekstafsnit med tydelig visuel pacing',
      'Kan bruges med eller uden sekundært billede',
      'Overlappende kort skaber stærk informationshierarki',
    ],
    visualCards: [
      { kicker: 'Flow', title: 'Narrativ opdeling', content: 'Bryder lange sektioner i tydelige visuelle blokke.' },
      { kicker: 'Signal', title: 'Fokusområder', content: 'Fremhæver nøglepunkter uden at bryde læseflowet.' },
      { kicker: 'Depth', title: 'Lag og overlap', content: 'Skaber moderne dybde i præsentationen.' },
    ],
    cta: { text: 'Se løsning', href: '/kontakt' },
    theme: 'accent',
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

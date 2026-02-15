-- Populate components table with component library metadata
-- This SQL should be run after schema_phase6.sql

-- Clear existing components (if any)
DELETE FROM components;
ALTER TABLE components AUTO_INCREMENT = 1;

-- Hero & CTAs (3 components)
INSERT INTO components (slug, name_da, category, description_da, props_schema, docs_content) VALUES
('hero-section', 'Hero Sektion', 'Hero & CTAs', 'Stor overskrift med beskrivelse, CTA-knapper og valgfrit billede',
'{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"primaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"secondaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"backgroundImage":{"type":"string","required":false},"alignment":{"type":"string","enum":["left","center"],"default":"left"}}',
'Large header section with headline, description, CTA buttons, and optional background image'),

('cta-section', 'CTA Sektion', 'Hero & CTAs', 'Call-to-action banner med centreret eller split layout',
'{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"ctaButton":{"type":"object","required":true,"properties":{"text":"string","href":"string"}},"backgroundColor":{"type":"string","required":false},"layout":{"type":"string","enum":["centered","split"],"default":"centered"}}',
'Call-to-action banner with centered or split layout'),

('stats-banner', 'Statistik Banner', 'Hero & CTAs', 'Iøjnefaldende statistikker (f.eks. "500+ kunder", "99% tilfredshed")',
'{"stats":{"type":"array","required":true,"items":{"type":"object","properties":{"value":"string","label":"string","icon":"string"}}},"backgroundColor":{"type":"string","required":false}}',
'Eye-catching statistics display banner');

-- Content Sections (5 components)
INSERT INTO components (slug, name_da, category, description_da, props_schema, docs_content) VALUES
('features-grid', 'Funktions Grid', 'Content Sections', 'Grid af funktioner med ikoner, overskrifter og beskrivelser',
'{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"features":{"type":"array","required":true,"items":{"type":"object","properties":{"icon":"string","title":"string","description":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3}}',
'Grid of features with icons, headlines, and descriptions'),

('icon-cards', 'Ikon Kort', 'Content Sections', 'Kort-baseret layout med ikoner og kort tekst',
'{"headline":{"type":"string","required":true},"cards":{"type":"array","required":true,"items":{"type":"object","properties":{"icon":"string","title":"string","description":"string","link":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3}}',
'Card-based layout with icons and short text'),

('content-image-split', 'Indhold-Billede Split', 'Content Sections', 'Tekstindhold ved siden af et billede (venstre/højre varianter)',
'{"headline":{"type":"string","required":true},"content":{"type":"string","required":true},"imageUrl":{"type":"string","required":true},"imagePosition":{"type":"string","enum":["left","right"],"default":"right"},"backgroundColor":{"type":"string","required":false}}',
'Text content beside an image with left/right variants'),

('video-embed', 'Video Indlejring', 'Content Sections', 'Responsiv videospiller med titel og beskrivelse',
'{"videoUrl":{"type":"string","required":true},"title":{"type":"string","required":true},"description":{"type":"string","required":false},"thumbnail":{"type":"string","required":false},"provider":{"type":"string","enum":["youtube","vimeo"],"default":"youtube"}}',
'Responsive video player with title and description'),

('timeline', 'Tidslinje', 'Content Sections', 'Vertikal tidslinje for processer eller virksomhedshistorie',
'{"headline":{"type":"string","required":true},"events":{"type":"array","required":true,"items":{"type":"object","properties":{"year":"string","title":"string","description":"string"}}}}',
'Vertical timeline for processes or company history');

-- Social Proof (3 components)
INSERT INTO components (slug, name_da, category, description_da, props_schema, docs_content) VALUES
('testimonials-carousel', 'Anmeldelser Karussel', 'Social Proof', 'Kundeanmeldelser med fotos og vurderinger',
'{"headline":{"type":"string","required":true},"testimonials":{"type":"array","required":true,"items":{"type":"object","properties":{"quote":"string","author":"string","role":"string","company":"string","photo":"string","rating":"number"}}}}',
'Customer testimonials carousel with photos and ratings'),

('team-grid', 'Team Grid', 'Social Proof', 'Teammedlemmers kort med fotos, navne, roller',
'{"headline":{"type":"string","required":true},"members":{"type":"array","required":true,"items":{"type":"object","properties":{"name":"string","role":"string","photo":"string","bio":"string","social":"object"}}}}',
'Team member cards with photos, names, and roles'),

('logo-cloud', 'Logo Sky', 'Social Proof', 'Grid af kunde-/partnerlogoer',
'{"headline":{"type":"string","required":false},"logos":{"type":"array","required":true,"items":{"type":"object","properties":{"imageUrl":"string","alt":"string","link":"string"}}},"grayscale":{"type":"boolean","default":true}}',
'Grid of client or partner logos');

-- Commerce & Forms (3 components)
INSERT INTO components (slug, name_da, category, description_da, props_schema, docs_content) VALUES
('pricing-table', 'Priser Tabel', 'Commerce & Forms', 'Prisniveauer med funktioner og CTA-knapper',
'{"headline":{"type":"string","required":true},"tiers":{"type":"array","required":true,"items":{"type":"object","properties":{"name":"string","price":"string","period":"string","features":"array","cta":"object","featured":"boolean"}}}}',
'Pricing tiers with features and CTA buttons'),

('comparison-table', 'Sammenlignings Tabel', 'Commerce & Forms', 'Side-om-side produkt-/tjeneste sammenligning',
'{"headline":{"type":"string","required":true},"products":{"type":"array","required":true},"features":{"type":"array","required":true},"data":{"type":"array","required":true}}',
'Side-by-side product or service comparison'),

('contact-form', 'Kontaktformular', 'Commerce & Forms', 'Kontaktformular med validering og indsendelse',
'{"headline":{"type":"string","required":true},"fields":{"type":"array","required":true,"items":{"type":"object","properties":{"type":"string","name":"string","label":"string","required":"boolean"}}},"submitText":{"type":"string","required":true},"successMessage":{"type":"string","required":true}}',
'Contact form with validation and submission');

-- Utilities (4 components)
INSERT INTO components (slug, name_da, category, description_da, props_schema, docs_content) VALUES
('faq-accordion', 'FAQ Akkordeon', 'Utilities', 'Sammenfoldelige FAQ-elementer',
'{"headline":{"type":"string","required":true},"faqs":{"type":"array","required":true,"items":{"type":"object","properties":{"question":"string","answer":"string"}}},"defaultOpen":{"type":"number","default":0}}',
'Collapsible FAQ items'),

('newsletter-signup', 'Nyhedsbrev Tilmelding', 'Utilities', 'E-mail tilmeldingsformular med privatlivserklæring',
'{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"placeholder":{"type":"string","required":false},"buttonText":{"type":"string","required":true},"privacyText":{"type":"string","required":false}}',
'Email signup form with privacy notice'),

('gallery-grid', 'Galleri Grid', 'Utilities', 'Billedgalleri med lightbox-understøttelse',
'{"images":{"type":"array","required":true,"items":{"type":"object","properties":{"url":"string","alt":"string","caption":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3},"lightbox":{"type":"boolean","default":true}}',
'Image gallery with lightbox support'),

('breadcrumbs', 'Brødkrummer', 'Utilities', 'Navigations brødkrumme spor',
'{"items":{"type":"array","required":true,"items":{"type":"object","properties":{"label":"string","href":"string"}}},"separator":{"type":"string","default":"/"}}',
'Navigation breadcrumb trail');

-- Verify insertion
SELECT COUNT(*) as total_components FROM components;
SELECT category, COUNT(*) as count FROM components GROUP BY category ORDER BY category;

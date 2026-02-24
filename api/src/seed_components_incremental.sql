-- ============================================================
-- seed_components_incremental.sql — HERE AND NOW
--
-- Run this when seed_components_v2.sql has ALREADY been run,
-- and you need to apply the latest component changes only.
--
-- Current scope: overlap-image-section, alternating-feature-list
-- (zigzag removed, overlap module updates)
--
-- Uses JSON_OBJECT() to satisfy schema_fields CHECK constraint.
-- Safe to run multiple times (upsert).
-- ============================================================

INSERT INTO components (
  slug, name_da, category, description_da, tier,
  schema_fields, default_content, doc_path, is_active, sort_order
) VALUES

('overlap-image-section',
 'Overlap Billede Sektion',
 'content',
 'Visuel sektion med overlap. Understøtter introText (centreret) eller kolonne-layout.',
 1,
 JSON_OBJECT(
   'headline', JSON_OBJECT('type', 'string', 'required', true),
   'introText', JSON_OBJECT('type', 'string', 'required', false),
   'content', JSON_OBJECT('type', 'string', 'required', false),
   'bulletPoints', JSON_OBJECT('type', 'array', 'required', false, 'items', JSON_OBJECT('type', 'string')),
   'imageUrl', JSON_OBJECT('type', 'string', 'format', 'image', 'required', true),
   'imageAlt', JSON_OBJECT('type', 'string', 'required', false),
   'imagePlacement', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('left', 'right', 'center'), 'default', 'right'),
   'overlapAmount', JSON_OBJECT('type', 'number', 'default', 80),
   'theme', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('teal', 'white'), 'default', 'white'),
   'bottomDivider', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('none', 'straight'), 'default', 'none'),
   'cta', JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string', 'icon', 'string'))
 ),
 JSON_OBJECT(
   'headline', 'Produktionshistorik',
   'introText', 'Se hvordan systemet giver dig overblik.',
   'content', '<p>Med vores platform har du altid fingeren på pulsen.</p>',
   'imageUrl', '',
   'imagePlacement', 'right',
   'overlapAmount', 80,
   'theme', 'teal',
   'bottomDivider', 'none',
   'bulletPoints', JSON_ARRAY('Sikker adgang', 'Sporbarhed online'),
   'cta', JSON_OBJECT('text', 'Se specifikationer', 'href', '/specs', 'icon', 'arrow-right')
 ),
 'overlap-image-section.md',
 1, 51),

('alternating-feature-list',
 'Alternating Feature Liste',
 'content',
 '2-4 overlap-sektioner der flyder sammen som én blok. Teal/hvid skift, billeder overlapper.',
 1,
 JSON_OBJECT(
   'features', JSON_OBJECT(
     'type', 'array',
     'required', true,
     'items', JSON_OBJECT(
       'type', 'object',
       'properties', JSON_OBJECT(
         'headline', 'string',
         'introText', 'string',
         'content', 'string',
         'bulletPoints', JSON_OBJECT('type', 'array', 'items', JSON_OBJECT('type', 'string')),
         'imageUrl', JSON_OBJECT('type', 'string', 'format', 'image'),
         'imageAlt', 'string',
         'cta', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('text', 'string', 'href', 'string', 'icon', 'string'))
       )
     )
   ),
   'firstTheme', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('teal', 'white'), 'default', 'teal'),
   'overlapAmount', JSON_OBJECT('type', 'number', 'default', 80)
 ),
 JSON_OBJECT(
   'features', JSON_ARRAY(
     JSON_OBJECT(
       'headline', 'Produktionsoversigt',
       'introText', 'Se hvordan systemet giver dig overblik.',
       'content', '<p>Med vores platform har du altid fingeren på pulsen.</p>',
       'imageUrl', '',
       'bulletPoints', JSON_ARRAY('Sikker adgang', 'Sporbarhed online'),
       'cta', JSON_OBJECT('text', 'Se specifikationer', 'href', '/specs', 'icon', 'arrow-right')
     ),
     JSON_OBJECT(
       'headline', 'Avanceret rapportering',
       'introText', 'Detaljerede rapporter tilgængelige når det passer dig.',
       'content', '<p>Træk data ud i Excel eller PDF.</p>',
       'imageUrl', '',
       'bulletPoints', JSON_ARRAY('Fleksible filformater', 'Planlagte rapporter'),
       'cta', JSON_OBJECT('text', 'Læs mere', 'href', '/rapporter', 'icon', 'arrow-right')
     )
   ),
   'firstTheme', 'teal',
   'overlapAmount', 80
 ),
 'alternating-feature-list.md',
 1, 53)

ON DUPLICATE KEY UPDATE
  name_da         = VALUES(name_da),
  category        = VALUES(category),
  description_da  = VALUES(description_da),
  tier            = VALUES(tier),
  schema_fields   = VALUES(schema_fields),
  default_content = VALUES(default_content),
  doc_path        = VALUES(doc_path),
  is_active       = VALUES(is_active),
  sort_order      = VALUES(sort_order);

-- ─────────────────────────────────────────────
-- 2026 Uplift: schema_fields additions
-- Safe to run on existing seeded databases.
-- ─────────────────────────────────────────────

-- hero-section: add tagline prop + cinematic version
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',        JSON_OBJECT('type', 'string', 'required', true),
  'description',     JSON_OBJECT('type', 'string', 'required', true),
  'tagline',         JSON_OBJECT('type', 'string', 'required', false, 'description', 'Small pill label above headline (e.g. Ny hjemmeside?)'),
  'primaryCta',      JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string')),
  'secondaryCta',    JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string')),
  'backgroundImage', JSON_OBJECT('type', 'string', 'format', 'image', 'required', false),
  'alignment',       JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('left', 'center'), 'default', 'left'),
  'version',         JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'minimal', 'split', 'cinematic'), 'default', 'default', 'description', 'Layout variant: default=full-bleed, minimal=compact, split=text+image, cinematic=immersive large headline')
)
WHERE slug = 'hero-section' AND source = 'library';

-- cta-section: add gradient backgroundColor option
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',         JSON_OBJECT('type', 'string', 'required', true),
  'description',      JSON_OBJECT('type', 'string', 'required', false),
  'ctaButton',        JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string')),
  'backgroundColor',  JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'primary', 'alt', 'gradient'), 'default', 'primary', 'description', 'gradient uses animated brand gradient background'),
  'layout',           JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('centered', 'split'), 'default', 'centered'),
  'version',          JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'minimal'), 'default', 'default')
)
WHERE slug = 'cta-section' AND source = 'library';

-- pricing-table: add annualDiscount prop
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',        JSON_OBJECT('type', 'string', 'required', true),
  'tiers',           JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('name', 'string', 'price', 'string', 'period', 'string', 'features', 'array', 'cta', 'object', 'featured', 'boolean'))),
  'annualDiscount',  JSON_OBJECT('type', 'number', 'required', false, 'description', '% discount when annual toggle is on (e.g. 20 for 20% off)')
)
WHERE slug = 'pricing-table' AND source = 'library';

-- features-grid: add layout prop
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'features',    JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('icon', 'string', 'title', 'string', 'description', 'string'))),
  'columns',     JSON_OBJECT('type', 'number', 'enum', JSON_ARRAY(2, 3, 4), 'default', 3),
  'layout',      JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('icon-top', 'icon-left'), 'default', 'icon-top', 'description', 'icon-top=classic cards, icon-left=horizontal rows')
)
WHERE slug = 'features-grid' AND source = 'library';

-- testimonials-carousel: add layout prop
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',      JSON_OBJECT('type', 'string', 'required', true),
  'testimonials',  JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('quote', 'string', 'author', 'string', 'role', 'string', 'company', 'string', 'photo', 'string', 'rating', 'number'))),
  'layout',        JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('carousel', 'masonry', 'grid'), 'default', 'carousel', 'description', 'carousel=horizontal scroll with nav, masonry=CSS columns, grid=responsive grid')
)
WHERE slug = 'testimonials-carousel' AND source = 'library';

-- how-it-works: add layout prop (horizontal/vertical)
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'steps',       JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('title', 'string', 'description', 'string', 'icon', 'string'))),
  'layout',      JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('horizontal', 'vertical'), 'default', 'horizontal', 'description', 'horizontal=row of cards with dashed connectors, vertical=single column timeline-style')
)
WHERE slug = 'how-it-works' AND source = 'library';

-- bento-grid: add description, icon and accentColor props per item
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'items',       JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'title', 'string',
      'description', 'string',
      'icon', 'string',
      'size', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('small', 'medium', 'large'), 'default', 'small'),
      'accentColor', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'primary', 'accent'), 'default', 'default', 'description', 'Tints the card background with the chosen color')
    )
  ))
)
WHERE slug = 'bento-grid' AND source = 'library';

-- icon-cards: add description + variant prop
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'cards',       JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('icon', 'string', 'title', 'string', 'description', 'string', 'link', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('text', 'string', 'href', 'string'))))),
  'variant',     JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'bordered', 'minimal'), 'default', 'default', 'description', 'default=modern card, bordered=card with primary left-border accent on hover, minimal=no card background')
)
WHERE slug = 'icon-cards' AND source = 'library';

-- problem-section: add solution prop per problem + showSolutions flag
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',      JSON_OBJECT('type', 'string', 'required', true),
  'description',   JSON_OBJECT('type', 'string', 'required', false),
  'problems',      JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('icon', 'string', 'title', 'string', 'description', 'string', 'solution', 'string'))),
  'showSolutions', JSON_OBJECT('type', 'boolean', 'default', false, 'description', 'Show green solution hint below each problem')
)
WHERE slug = 'problem-section' AND source = 'library';

-- tabs-section: add description + orientation prop
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'tabs',        JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('label', 'string', 'content', 'string'))),
  'defaultTab',  JSON_OBJECT('type', 'number', 'default', 0),
  'orientation', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('horizontal', 'vertical'), 'default', 'horizontal', 'description', 'horizontal=top tab bar, vertical=tabs on left sidebar (desktop)')
)
WHERE slug = 'tabs-section' AND source = 'library';

-- case-studies: add tag prop per case
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'cases',       JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('image', 'string', 'title', 'string', 'client', 'string', 'outcome', 'string', 'link', 'string', 'tag', 'string'))),
  'columns',     JSON_OBJECT('type', 'number', 'enum', JSON_ARRAY(2, 3), 'default', 3)
)
WHERE slug = 'case-studies' AND source = 'library';

-- team-grid: add layout prop (grid/compact) + description
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'members',     JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('name', 'string', 'role', 'string', 'photo', 'string', 'bio', 'string', 'social', JSON_OBJECT('type', 'array', 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('platform', 'string', 'url', 'string')))))),
  'columns',     JSON_OBJECT('type', 'number', 'enum', JSON_ARRAY(2, 3, 4), 'default', 3),
  'layout',      JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('grid', 'compact'), 'default', 'grid', 'description', 'grid=centered photo cards, compact=horizontal photo+text rows')
)
WHERE slug = 'team-grid' AND source = 'library';

-- faq-accordion: add category per faq + showCategories flag
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',       JSON_OBJECT('type', 'string', 'required', true),
  'description',    JSON_OBJECT('type', 'string', 'required', false),
  'faqs',           JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('question', 'string', 'answer', 'string', 'category', 'string'))),
  'defaultOpen',    JSON_OBJECT('type', 'number', 'default', 0),
  'showCategories', JSON_OBJECT('type', 'boolean', 'default', false, 'description', 'Show category filter tabs above the FAQ list')
)
WHERE slug = 'faq-accordion' AND source = 'library';

-- timeline: add layout prop + description
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', true),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'events',      JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('year', 'string', 'title', 'string', 'description', 'string'))),
  'layout',      JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('vertical', 'horizontal'), 'default', 'vertical', 'description', 'vertical=classic stacked timeline, horizontal=scrollable date carousel')
)
WHERE slug = 'timeline' AND source = 'library';

-- logo-cloud: add animated prop + description
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',    JSON_OBJECT('type', 'string', 'required', false),
  'description', JSON_OBJECT('type', 'string', 'required', false),
  'logos',       JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('imageUrl', 'string', 'alt', 'string', 'link', 'string'))),
  'grayscale',   JSON_OBJECT('type', 'boolean', 'default', true),
  'animated',    JSON_OBJECT('type', 'boolean', 'default', false, 'description', 'Infinite CSS marquee scroll instead of static grid')
)
WHERE slug = 'logo-cloud' AND source = 'library';

-- trust-badges: add variant prop (strip/cards)
UPDATE components
SET schema_fields = JSON_OBJECT(
  'badges',  JSON_OBJECT('type', 'array', 'required', false, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('type', 'string', 'label', 'string', 'icon', 'string'))),
  'layout',  JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('horizontal', 'compact'), 'default', 'horizontal'),
  'variant', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('strip', 'cards'), 'default', 'strip', 'description', 'strip=horizontal pill row, cards=grid of styled cards')
)
WHERE slug = 'trust-badges' AND source = 'library';

-- comparison-table: add highlightColumn + description
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',        JSON_OBJECT('type', 'string', 'required', true),
  'description',     JSON_OBJECT('type', 'string', 'required', false),
  'products',        JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'string')),
  'features',        JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'string')),
  'data',            JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'array')),
  'highlightColumn', JSON_OBJECT('type', 'number', 'required', false, 'description', '0-based index of column to highlight as recommended (e.g. 1 = second column)')
)
WHERE slug = 'comparison-table' AND source = 'library';

-- integrations-section: add layout prop (grid/marquee)
UPDATE components
SET schema_fields = JSON_OBJECT(
  'headline',     JSON_OBJECT('type', 'string', 'required', true),
  'description',  JSON_OBJECT('type', 'string', 'required', false),
  'integrations', JSON_OBJECT('type', 'array', 'required', true, 'items', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('name', 'string', 'logoUrl', 'string', 'link', 'string', 'description', 'string'))),
  'columns',      JSON_OBJECT('type', 'number', 'enum', JSON_ARRAY(2, 3, 4), 'default', 4),
  'layout',       JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('grid', 'marquee'), 'default', 'grid', 'description', 'grid=static grid layout, marquee=infinite CSS scroll strip')
)
WHERE slug = 'integrations-section' AND source = 'library';
